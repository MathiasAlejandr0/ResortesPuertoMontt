import { type Dispatch, type SetStateAction, useEffect, useMemo, useState } from 'react'
import type { AppSettings, Credito, Db, LineItem, Orden, Venta } from './appTypes'
import { LineItemsEditor } from './LineItemsEditor'
import { printOrden } from './ordenPrint'
import {
  makeLineItem,
  matchClienteByName,
  nextFolio,
  normalizeLineItem,
  ordenMecanicosToRowFields,
  sumItemsConIva,
  UNIDADES_OPS,
  vehiculosFiltradosCliente,
} from './opsHelpers'
import { openWhatsAppUrl } from './whatsappOpen'

type Props = {
  db: Db
  setDb: Dispatch<SetStateAction<Db>>
  settings: AppSettings
  showToast: (msg: string, type?: 'ok' | 'err' | 'warn') => void
  onIrCotizaciones?: () => void
}

const ESTADOS_OT = ['Recibido', 'En proceso', 'Listo', 'Entregado']
const FPAGO_OT = ['Contado', 'Transferencia', 'Tarjeta', 'Crédito']

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

function otVencida(o: Pick<Orden, 'fechaEst' | 'estado'>, hoy: string): boolean {
  return Boolean(o.fechaEst && o.fechaEst < hoy && o.estado !== 'Listo' && o.estado !== 'Entregado')
}

/** Estado mostrado en cabecera (paridad HTML: «Vencido» si aplica) */
function estadoOtEtiqueta(o: Orden, hoy: string): string {
  return otVencida(o, hoy) ? 'Vencido' : o.estado
}

function estadoOtPillClass(o: Orden, hoy: string): string {
  if (otVencida(o, hoy)) return 'rpm-ot-venc'
  switch (o.estado) {
    case 'Recibido':
      return 'rpm-ot-rec'
    case 'En proceso':
      return 'rpm-ot-proc'
    case 'Listo':
      return 'rpm-ot-listo'
    case 'Entregado':
      return 'rpm-ot-entregado'
    default:
      return 'rpm-ot-rec'
  }
}

export function OrdenesModule({ db, setDb, settings, showToast, onIrCotizaciones }: Props) {
  const [clienteNom, setClienteNom] = useState('')
  const [vehId, setVehId] = useState('')
  const [selectedMecIds, setSelectedMecIds] = useState<string[]>([])
  const [fechaIn, setFechaIn] = useState(() => new Date().toISOString().slice(0, 10))
  const [fechaEst, setFechaEst] = useState('')
  const [km, setKm] = useState(0)
  const [estadoOt, setEstadoOt] = useState('Recibido')
  const [diag, setDiag] = useState('')
  const [items, setItems] = useState<LineItem[]>([])
  const [rowNom, setRowNom] = useState('')
  const [rowUni, setRowUni] = useState('Unidad')
  const [rowQty, setRowQty] = useState(1)
  const [rowPu, setRowPu] = useState(0)
  const [obs, setObs] = useState('')
  const [buscar, setBuscar] = useState('')
  const [estFiltro, setEstFiltro] = useState('')
  const [expandedFolio, setExpandedFolio] = useState<string | null>(null)
  const [addNom, setAddNom] = useState('')
  const [addQty, setAddQty] = useState(1)
  const [addPu, setAddPu] = useState(0)
  const [ventaOtFolio, setVentaOtFolio] = useState<string | null>(null)
  const [ventaFpago, setVentaFpago] = useState('Contado')
  const [ventaFecha, setVentaFecha] = useState(() => new Date().toISOString().slice(0, 10))

  const previewFolio = useMemo(() => nextFolio('OT', db), [db])
  const hoy = new Date().toISOString().slice(0, 10)

  const clienteMatch = useMemo(() => matchClienteByName(db, clienteNom), [db, clienteNom])
  const vehOpts = useMemo(
    () => vehiculosFiltradosCliente(db, clienteMatch?.id ?? null),
    [db, clienteMatch],
  )

  const mecanicosActivos = useMemo(() => db.mecanicos.filter((m) => m.activo), [db.mecanicos])

  const lista = useMemo(() => {
    let rows = [...db.ordenes].sort((a, b) => (a.creado < b.creado ? 1 : -1))
    const q = buscar.toLowerCase().trim()
    if (q) {
      rows = rows.filter(
        (o) =>
          o.folio.toLowerCase().includes(q) ||
          o.clienteNombre.toLowerCase().includes(q) ||
          (o.patente || '').toLowerCase().includes(q) ||
          (o.mecanico || '').toLowerCase().includes(q) ||
          (o.diag || '').toLowerCase().includes(q),
      )
    }
    if (estFiltro === 'Vencido') {
      rows = rows.filter((o) => otVencida(o, hoy))
    } else if (estFiltro) rows = rows.filter((o) => o.estado === estFiltro)
    return rows
  }, [db.ordenes, buscar, estFiltro, hoy])

  useEffect(() => {
    setAddNom('')
    setAddQty(1)
    setAddPu(0)
  }, [expandedFolio])

  useEffect(() => {
    if (ventaOtFolio) {
      setVentaFpago('Contado')
      setVentaFecha(new Date().toISOString().slice(0, 10))
    }
  }, [ventaOtFolio])

  const agregarItem = () => {
    const nombre = rowNom.trim()
    if (!nombre) {
      showToast('Indica producto o servicio', 'warn')
      return
    }
    const inv = db.inventario.find(
      (p) => p.nombre.toLowerCase() === nombre.toLowerCase() || p.codigo.toLowerCase() === nombre.toLowerCase(),
    )
    const cat = inv?.categoria || 'Servicios'
    setItems((prev) => [...prev, makeLineItem(nombre, rowUni, rowQty, rowPu, cat)])
    setRowNom('')
    setRowQty(1)
    setRowPu(0)
    setRowUni('Unidad')
  }

  const onPickVeh = (id: string) => {
    setVehId(id)
    const v = db.vehiculos.find((x) => x.id === id)
    if (v) setClienteNom(v.clienteNombre)
  }

  const guardar = () => {
    if (!vehId) {
      showToast('Selecciona un vehículo', 'err')
      return
    }
    const vh = db.vehiculos.find((x) => x.id === vehId)
    if (!vh) return
    const cli = db.clientes.find((c) => c.id === vh.clienteId)
    const mecs = selectedMecIds
      .map((id) => db.mecanicos.find((m) => m.id === id))
      .filter(Boolean)
      .map((m) => ({ id: m!.id, nombre: m!.nombre }))
    const mf = ordenMecanicosToRowFields(mecs)
    const itemsNorm = items.map((x) => normalizeLineItem(x))
    const total = sumItemsConIva(itemsNorm)
    const o: Orden = {
      folio: nextFolio('OT', db),
      fechaIn,
      fechaEst,
      clienteId: vh.clienteId,
      clienteNombre: cli?.nombre ?? vh.clienteNombre,
      clienteRut: cli?.rut ?? '',
      tel: cli?.tel ?? '',
      vehiculoId: vh.id,
      patente: vh.patente,
      marca: vh.marca,
      modelo: vh.modelo,
      mecanicoId: mf.mecanico_id,
      mecanico: mf.mecanico,
      mecanicos: mecs.length ? mecs : undefined,
      km,
      diag: diag.trim(),
      obs: obs.trim(),
      items: itemsNorm,
      total,
      estado: estadoOt,
      creado: new Date().toISOString(),
    }
    setDb((d) => ({ ...d, ordenes: [o, ...d.ordenes] }))
    showToast('Orden guardada')
    setClienteNom('')
    setVehId('')
    setSelectedMecIds([])
    setFechaIn(new Date().toISOString().slice(0, 10))
    setFechaEst('')
    setKm(0)
    setEstadoOt('Recibido')
    setDiag('')
    setItems([])
    setObs('')
  }

  const limpiar = () => {
    setClienteNom('')
    setVehId('')
    setSelectedMecIds([])
    setFechaIn(new Date().toISOString().slice(0, 10))
    setFechaEst('')
    setKm(0)
    setEstadoOt('Recibido')
    setDiag('')
    setItems([])
    setRowNom('')
    setRowUni('Unidad')
    setRowQty(1)
    setRowPu(0)
    setObs('')
  }

  const eliminar = (folio: string) => {
    if (!window.confirm('¿Eliminar esta orden?')) return
    setDb((d) => ({ ...d, ordenes: d.ordenes.filter((x) => x.folio !== folio) }))
    if (expandedFolio === folio) setExpandedFolio(null)
    showToast('Orden eliminada')
  }

  const patchOtItems = (folio: string, nextItems: LineItem[]) => {
    const normalized = nextItems.map((x) => normalizeLineItem(x))
    const total = sumItemsConIva(normalized)
    setDb((d) => ({
      ...d,
      ordenes: d.ordenes.map((x) => (x.folio === folio ? { ...x, items: normalized, total } : x)),
    }))
  }

  const patchOt = (folio: string, patch: Partial<Pick<Orden, 'diag' | 'obs' | 'estado' | 'fechaEst' | 'fechaIn' | 'km'>>) => {
    setDb((d) => ({
      ...d,
      ordenes: d.ordenes.map((x) => (x.folio === folio ? { ...x, ...patch } : x)),
    }))
  }

  const agregarItemGuardado = (folio: string) => {
    const nombre = addNom.trim()
    if (!nombre) {
      showToast('Ingresa una descripción del ítem', 'warn')
      return
    }
    const o = db.ordenes.find((x) => x.folio === folio)
    if (!o) return
    const inv = db.inventario.find(
      (p) => p.nombre.toLowerCase() === nombre.toLowerCase() || p.codigo.toLowerCase() === nombre.toLowerCase(),
    )
    const cat = inv?.categoria || 'Servicios'
    patchOtItems(folio, [...o.items, makeLineItem(nombre, 'Unidad', addQty, addPu, cat)])
    setAddNom('')
    setAddQty(1)
    setAddPu(0)
    showToast('Ítem agregado')
  }

  const imprimirPdf = (folio: string) => {
    const o = db.ordenes.find((x) => x.folio === folio)
    if (!o) return
    const v = o.vehiculoId ? db.vehiculos.find((x) => x.id === o.vehiculoId) ?? null : null
    const ok = printOrden(settings, o, v)
    if (!ok) showToast('El navegador bloqueó la ventana de impresión', 'warn')
  }

  const enviarWhatsapp = (folio: string) => {
    const o = db.ordenes.find((x) => x.folio === folio)
    if (!o) return
    const taller = settings.empresa.nombre || 'El taller'
    const pat = o.patente ? `(${o.patente}) ` : ''
    let msg = ''
    if (o.estado === 'Listo' || o.estado === 'Entregado') {
      msg =
        `Hola ${o.clienteNombre}, te informamos que tu vehículo ${pat}ya está listo para retirar.\n\n` +
        `📋 Orden: ${o.folio}\n` +
        `💰 Total: ${fmt(o.total)}\n\n` +
        `¡Gracias por confiar en ${taller}! 🔧`
    } else if (o.estado === 'En proceso') {
      msg =
        `Hola ${o.clienteNombre}, tu vehículo ${pat}se encuentra en proceso de reparación.\n\n` +
        `📋 Orden: ${o.folio}\n` +
        (o.fechaEst ? `📅 Fecha estimada de entrega: ${o.fechaEst}\n` : '') +
        `\nCualquier consulta estamos a tu disposición. — ${taller}`
    } else {
      msg =
        `Hola ${o.clienteNombre}, confirmamos el ingreso de tu vehículo ${pat}a nuestro taller.\n\n` +
        `📋 Orden: ${o.folio}\n` +
        `🔧 Trabajo: ${o.diag || 'En diagnóstico'}\n\n` +
        `Te avisaremos cuando esté listo. — ${taller}`
    }
    const ok = openWhatsAppUrl(o.tel || '', msg)
    if (!ok) showToast('No hay teléfono válido para WhatsApp (revisa el cliente)', 'warn')
  }

  const abrirModalVentaOt = (folio: string) => {
    const dup = db.ventas.some((v) => v.otOrigen === folio)
    if (dup) {
      showToast('Ya existe una venta registrada para esta orden', 'warn')
      return
    }
    setVentaOtFolio(folio)
  }

  const confirmarVentaOt = () => {
    if (!ventaOtFolio) return
    const dup = db.ventas.some((v) => v.otOrigen === ventaOtFolio)
    if (dup) {
      showToast('Ya existe una venta registrada para esta orden', 'warn')
      setVentaOtFolio(null)
      return
    }
    setDb((d) => {
      const orden = d.ordenes.find((x) => x.folio === ventaOtFolio)
      if (!orden) return d
      const itemsNorm = orden.items.map((x) => normalizeLineItem(x))
      const total = sumItemsConIva(itemsNorm)
      const vFolio = nextFolio('VT', d)
      const venta: Venta = {
        folio: vFolio,
        fecha: ventaFecha || hoy,
        clienteId: orden.clienteId,
        clienteNombre: orden.clienteNombre,
        clienteRut: orden.clienteRut,
        tel: orden.tel,
        vehiculoId: orden.vehiculoId,
        patente: orden.patente,
        marca: orden.marca,
        modelo: orden.modelo,
        mecanico: orden.mecanico,
        items: itemsNorm,
        descuento: 0,
        total,
        fpago: ventaFpago,
        obs: (orden.obs || orden.diag || '').trim(),
        otOrigen: orden.folio,
        cotOrigen: orden.cotizacionOrigen,
        creado: new Date().toISOString(),
      }
      let inventario = d.inventario
      for (const l of itemsNorm) {
        if (l.libre) continue
        const pid = l.pid
        if (!pid) continue
        inventario = inventario.map((p) =>
          p.id !== pid ? p : p.categoria === 'Mano de obra' ? p : { ...p, stock: Math.max(0, p.stock - l.qty) },
        )
      }
      let creditos = d.creditos
      if (ventaFpago === 'Crédito' && total > 0) {
        const cr: Credito = {
          id: uid(),
          clienteId: orden.clienteId,
          clienteNombre: orden.clienteNombre,
          clienteRut: orden.clienteRut,
          monto: total,
          saldo: total,
          abonos: [],
          fecha: venta.fecha,
          vcto: '',
          desc: `Venta ${vFolio} (OT: ${orden.folio})`,
          ventaFolio: vFolio,
          estado: 'Pendiente',
          creado: new Date().toISOString(),
        }
        creditos = [cr, ...creditos]
      }
      const ordenes = d.ordenes.map((x) =>
        x.folio === orden.folio ? { ...x, estado: 'Entregado', items: itemsNorm, total } : x,
      )
      return {
        ...d,
        inventario,
        ventas: [venta, ...d.ventas],
        creditos,
        ordenes,
      }
    })
    showToast(
      ventaFpago === 'Crédito' ? 'Venta registrada en crédito — revisa Cuentas por cobrar' : `Venta registrada (${ventaFpago})`,
    )
    setVentaOtFolio(null)
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Math.round(n))

  const otEnModal = ventaOtFolio ? db.ordenes.find((x) => x.folio === ventaOtFolio) : null

  return (
    <>
      <div className="card card-ot">
        <div className="card-title">
          <div className="card-title-left">Nueva orden de trabajo</div>
        </div>

        <div className="g4-ot-row1">
          <div className="field">
            <label>Cliente — busca o ingresa libre</label>
            <input
              list="lista-clientes-ot"
              placeholder="Nombre del cliente..."
              value={clienteNom}
              onChange={(e) => {
                setClienteNom(e.target.value)
                setVehId('')
              }}
            />
            <datalist id="lista-clientes-ot">
              {db.clientes.map((c) => (
                <option key={c.id} value={c.nombre} />
              ))}
            </datalist>
          </div>
          <div className="field">
            <label>Vehículo *</label>
            <select value={vehId} onChange={(e) => onPickVeh(e.target.value)} required>
              <option value="">— Seleccionar —</option>
              {vehOpts.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.patente} — {v.marca} {v.modelo}
                </option>
              ))}
            </select>
          </div>
          <div className="field field-span-mec">
            <label>Mecánicos asignados (varios)</label>
            <div className="mec-picker">
              {mecanicosActivos.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={selectedMecIds.includes(m.id) ? 'mec-chip on' : 'mec-chip'}
                  onClick={() =>
                    setSelectedMecIds((prev) =>
                      prev.includes(m.id) ? prev.filter((x) => x !== m.id) : [...prev, m.id],
                    )
                  }
                >
                  {m.nombre}
                </button>
              ))}
              {!mecanicosActivos.length ? <span style={{ fontSize: 12, color: 'var(--text2)' }}>Sin mecánicos activos</span> : null}
            </div>
          </div>
          <div className="field">
            <label>Fecha ingreso</label>
            <input type="date" value={fechaIn} onChange={(e) => setFechaIn(e.target.value)} />
          </div>
        </div>

        <div className="g4-ot-row2">
          <div className="field">
            <label>Fecha entrega estimada</label>
            <input type="date" value={fechaEst} onChange={(e) => setFechaEst(e.target.value)} />
          </div>
          <div className="field">
            <label>Kilometraje ingreso</label>
            <input type="number" min={0} step={1} placeholder="km actuales" value={km || ''} onChange={(e) => setKm(Number(e.target.value))} />
          </div>
          <div className="field">
            <label>Estado</label>
            <select value={estadoOt} onChange={(e) => setEstadoOt(e.target.value)}>
              {ESTADOS_OT.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>N° orden</label>
            <input readOnly className="input-readonly" value={previewFolio} />
          </div>
        </div>

        <div className="field field-full">
          <label>Diagnóstico / trabajo solicitado</label>
          <textarea rows={3} placeholder="Descripción del problema o trabajo a realizar.." value={diag} onChange={(e) => setDiag(e.target.value)} />
        </div>

        <div className="sub-seccion-ot">Repuestos y mano de obra</div>

        <div className="g4-items">
          <div className="field">
            <label>Producto / servicio</label>
            <input
              list="lista-inv-ot"
              placeholder="Ej: Aceite motor, Cambio frenos..."
              value={rowNom}
              onChange={(e) => setRowNom(e.target.value)}
            />
            <datalist id="lista-inv-ot">
              {db.inventario.map((p) => (
                <option key={p.id} value={p.nombre} />
              ))}
            </datalist>
          </div>
          <div className="field">
            <label>Unidad</label>
            <select value={rowUni} onChange={(e) => setRowUni(e.target.value)}>
              {UNIDADES_OPS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Cantidad</label>
            <input type="number" min={0} step={1} value={rowQty} onChange={(e) => setRowQty(Number(e.target.value))} />
          </div>
          <div className="field">
            <label>P. unit. ($) editable</label>
            <input type="number" min={0} step={1} value={rowPu} onChange={(e) => setRowPu(Number(e.target.value))} />
          </div>
        </div>
        <div className="form-ops-add-row">
          <button type="button" className="btn btn-agregar-item" onClick={agregarItem}>
            + Agregar ítem
          </button>
        </div>

        <LineItemsEditor items={items} onChange={setItems} fmt={fmt} />

        <div className="field field-full">
          <label>Trabajo realizado / observaciones</label>
          <textarea rows={3} placeholder="Descripción del trabajo realizado.." value={obs} onChange={(e) => setObs(e.target.value)} />
        </div>

        <div className="form-row-actions">
          <button type="button" className="btn btn-primary btn-guardar" onClick={guardar}>
            ✓ Guardar orden
          </button>
          <button type="button" className="btn btn-outline" onClick={limpiar}>
            ↺ Limpiar
          </button>
        </div>
      </div>

      <div className="card card-ot">
        <div className="card-title">
          <div className="card-title-left">Órdenes de trabajo</div>
          <span className="card-count">{lista.length} orden{lista.length !== 1 ? 'es' : ''}</span>
        </div>
        <div className="inv-filters">
          <input
            className="input-buscar-clientes inv-filter-grow"
            placeholder="Buscar N° orden, cliente, patente, mecánico, diagnóstico..."
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
          />
          <select className="inv-filter-select" value={estFiltro} onChange={(e) => setEstFiltro(e.target.value)}>
            <option value="">Todos los estados</option>
            {ESTADOS_OT.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
            <option value="Vencido">Vencido</option>
          </select>
        </div>
        {!lista.length ? (
          <div className="empty">
            <div className="empty-icon">🔧</div>
            <div>No hay órdenes</div>
          </div>
        ) : (
          <div className="lista-ots-exp">
            {lista.map((o) => {
              const open = expandedFolio === o.folio
              const entregado = o.estado === 'Entregado'
              const listo = o.estado === 'Listo'
              const venc = otVencida(o, hoy)
              const rowCls = ['exp-row', venc ? 'ot-exp-venc' : '', entregado ? 'ot-exp-entregado' : '', listo && !entregado ? 'ot-exp-listo' : '']
                .filter(Boolean)
                .join(' ')
              return (
                <div key={o.folio} className={rowCls}>
                  <button type="button" className={`exp-hdr ${entregado ? 'ot-exp-hdr-entregado' : ''}`} onClick={() => setExpandedFolio(open ? null : o.folio)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span className="folio-ot">{o.folio}</span>
                      <span style={{ fontWeight: 600 }}>{o.clienteNombre}</span>
                      {o.patente ? <span className="badge b-orange">{o.patente}</span> : null}
                      {(o.marca || o.modelo) ? (
                        <span style={{ fontSize: 11, color: 'var(--text2)' }}>
                          {o.marca} {o.modelo}
                        </span>
                      ) : null}
                      <span className={`status-pill ${estadoOtPillClass(o, hoy)}`}>{estadoOtEtiqueta(o, hoy)}</span>
                      {o.mecanico ? <span className="badge b-blue">{o.mecanico}</span> : null}
                      {o.cotizacionOrigen ? (
                        <button
                          type="button"
                          className="folio-cot folio-cot-link"
                          title="Ir a cotizaciones"
                          onClick={(e) => {
                            e.stopPropagation()
                            onIrCotizaciones?.()
                          }}
                        >
                          desde {o.cotizacionOrigen}
                        </button>
                      ) : null}
                    </div>
                    <div className="exp-hdr-meta">
                      <div className="exp-hdr-meta-total">{fmt(o.total)}</div>
                      <div className="exp-hdr-meta-sub">
                        {o.fechaIn || ''}
                        {o.fechaEst ? ` → ${o.fechaEst}` : ''}
                        {o.km ? ` · ${new Intl.NumberFormat('es-CL').format(o.km)} km` : ''}
                      </div>
                    </div>
                  </button>
                  {open ? (
                    <div className="exp-body">
                      <div className="g4-ot-row2" style={{ marginTop: 10 }}>
                        <div className="field">
                          <label>Fecha ingreso</label>
                          <input type="date" value={o.fechaIn} onChange={(e) => patchOt(o.folio, { fechaIn: e.target.value })} />
                        </div>
                        <div className="field">
                          <label>Fecha entrega est.</label>
                          <input type="date" value={o.fechaEst || ''} onChange={(e) => patchOt(o.folio, { fechaEst: e.target.value })} />
                        </div>
                        <div className="field">
                          <label>Km ingreso</label>
                          <input
                            type="number"
                            min={0}
                            step={1}
                            value={o.km || ''}
                            onChange={(e) => patchOt(o.folio, { km: Number(e.target.value) })}
                          />
                        </div>
                        <div className="field">
                          <label>Estado</label>
                          <select value={o.estado} onChange={(e) => patchOt(o.folio, { estado: e.target.value })}>
                            {ESTADOS_OT.map((e) => (
                              <option key={e} value={e}>
                                {e}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="field field-full">
                        <label>Diagnóstico / trabajo solicitado</label>
                        <textarea rows={3} value={o.diag} onChange={(e) => patchOt(o.folio, { diag: e.target.value })} />
                      </div>
                      {o.items.length === 0 ? (
                        <div style={{ fontSize: 12, color: 'var(--text2)', margin: '10px 0' }}>
                          Sin ítems — agrega líneas abajo.
                        </div>
                      ) : (
                        <LineItemsEditor
                          items={o.items}
                          onChange={(next) => patchOtItems(o.folio, next)}
                          fmt={fmt}
                          columnLabels={{ item: 'PRODUCTO', totalLine: 'SUBTOTAL' }}
                          ivaToggle="badge"
                          compactRemove
                        />
                      )}
                      <div className="cot-add-inline">
                        <input
                          className="cot-add-inline-grow"
                          placeholder="Descripción del ítem"
                          value={addNom}
                          onChange={(e) => setAddNom(e.target.value)}
                        />
                        <input
                          type="number"
                          min={0}
                          step={1}
                          style={{ width: 72 }}
                          value={addQty}
                          onChange={(e) => setAddQty(Number(e.target.value))}
                          title="Cantidad"
                        />
                        <input
                          type="number"
                          min={0}
                          step={1}
                          style={{ width: 96 }}
                          placeholder="Precio"
                          value={addPu || ''}
                          onChange={(e) => setAddPu(Number(e.target.value))}
                        />
                        <button type="button" className="btn btn-xs btn-primary" onClick={() => agregarItemGuardado(o.folio)}>
                          + Agregar
                        </button>
                      </div>
                      <div className="field field-full">
                        <label>Observaciones / trabajo realizado</label>
                        <textarea rows={3} value={o.obs} onChange={(e) => patchOt(o.folio, { obs: e.target.value })} />
                      </div>
                      <div className="cot-exp-actions">
                        <button type="button" className="btn btn-xs btn-outline" onClick={() => imprimirPdf(o.folio)}>
                          🖨 PDF
                        </button>
                        <button type="button" className="btn btn-xs btn-green" onClick={() => enviarWhatsapp(o.folio)}>
                          💬 WhatsApp
                        </button>
                        <button type="button" className="btn btn-xs btn-green" onClick={() => abrirModalVentaOt(o.folio)}>
                          → Registrar venta
                        </button>
                        <button type="button" className="btn btn-xs btn-red" onClick={() => eliminar(o.folio)}>
                          🗑 Eliminar
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {ventaOtFolio && otEnModal ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setVentaOtFolio(null)}>
          <div className="modal-box" role="dialog" aria-labelledby="fpago-ot-title" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-h3" id="fpago-ot-title">
              Registrar venta desde orden
            </h3>
            <div style={{ fontSize: 13, marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <strong>{otEnModal.clienteNombre}</strong>
                <span className="td-mono" style={{ fontWeight: 700 }}>
                  {fmt(otEnModal.total)}
                </span>
              </div>
              <div style={{ color: 'var(--text2)', marginTop: 6, fontSize: 12 }}>
                {otEnModal.folio} · {otEnModal.items.length} ítem{otEnModal.items.length !== 1 ? 's' : ''}
              </div>
            </div>
            <div className="field">
              <label>Fecha venta</label>
              <input type="date" value={ventaFecha} onChange={(e) => setVentaFecha(e.target.value)} />
            </div>
            <div className="field">
              <label>Forma de pago</label>
              <select value={ventaFpago} onChange={(e) => setVentaFpago(e.target.value)}>
                {FPAGO_OT.map((fp) => (
                  <option key={fp} value={fp}>
                    {fp}
                  </option>
                ))}
              </select>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-primary" onClick={confirmarVentaOt}>
                Confirmar
              </button>
              <button type="button" className="btn btn-outline" onClick={() => setVentaOtFolio(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
