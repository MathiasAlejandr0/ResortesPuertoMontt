import { type Dispatch, type SetStateAction, useEffect, useMemo, useState } from 'react'
import type { AppSettings, Cotizacion, Db, LineItem, Orden } from './appTypes'
import { printCotizacion } from './cotizacionPrint'
import { LineItemsEditor } from './LineItemsEditor'
import {
  inventarioCoincidenciaExacta,
  makeLineItem,
  matchClienteByName,
  nextFolio,
  normalizeLineItem,
  ordenMecanicosToRowFields,
  precioUnitDesdeInvOlibre,
  totalDocumentoConDescuento,
  UNIDADES_OPS,
  vehiculosFiltradosCliente,
} from './opsHelpers'
import { isoDateToDdMmYyyy } from './dateFormat'
import { openWhatsAppUrl } from './whatsappOpen'

type Props = {
  db: Db
  setDb: Dispatch<SetStateAction<Db>>
  settings: AppSettings
  showToast: (msg: string, type?: 'ok' | 'err' | 'warn') => void
  /** Al pulsar el vínculo a la OT generada */
  onIrOrdenes?: () => void
}

const ESTADOS_COT = ['Pendiente', 'Aceptada', 'Rechazada', 'Convertida']

function statusPillClass(estado: string): string {
  if (estado === 'Pendiente') return 'rpm-s-pendiente'
  if (estado === 'Aceptada') return 'rpm-s-aceptada'
  if (estado === 'Rechazada') return 'rpm-s-rechazada'
  if (estado === 'Convertida') return 'rpm-s-convertida'
  return 'rpm-s-pendiente'
}

export function CotizacionesModule({ db, setDb, settings, showToast, onIrOrdenes }: Props) {
  const [clienteNom, setClienteNom] = useState('')
  const [vehId, setVehId] = useState('')
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10))
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
  const [descuento, setDescuento] = useState(0)
  const [stepTrabajoOpen, setStepTrabajoOpen] = useState(false)
  const [stepCierreOpen, setStepCierreOpen] = useState(false)

  const clienteMatch = useMemo(() => matchClienteByName(db, clienteNom), [db, clienteNom])
  const vehOpts = useMemo(
    () => vehiculosFiltradosCliente(db, clienteMatch?.id ?? null),
    [db, clienteMatch],
  )

  const lista = useMemo(() => {
    let rows = [...db.cotizaciones].sort((a, b) => (a.creado < b.creado ? 1 : -1))
    const q = buscar.toLowerCase().trim()
    if (q) {
      rows = rows.filter(
        (c) =>
          c.folio.toLowerCase().includes(q) ||
          c.clienteNombre.toLowerCase().includes(q) ||
          (c.clienteRut || '').toLowerCase().includes(q) ||
          (c.patente || '').toLowerCase().includes(q),
      )
    }
    if (estFiltro) rows = rows.filter((c) => c.estado === estFiltro)
    return rows
  }, [db.cotizaciones, buscar, estFiltro])

  const fmt = (n: number) =>
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Math.round(n))

  useEffect(() => {
    setAddNom('')
    setAddQty(1)
    setAddPu(0)
  }, [expandedFolio])

  useEffect(() => {
    try {
      const g = sessionStorage.getItem('rpm-global-filter')
      if (g) {
        setBuscar(g)
        sessionStorage.removeItem('rpm-global-filter')
      }
    } catch {
      /* ignore */
    }
  }, [])

  const agregarItem = () => {
    const nombre = rowNom.trim()
    if (!nombre) {
      showToast('Indica producto o servicio', 'warn')
      return
    }
    const inv = inventarioCoincidenciaExacta(db, nombre)
    const cat = inv?.categoria || 'Servicios'
    const pu = precioUnitDesdeInvOlibre(inv, rowPu)
    const base = makeLineItem(nombre, rowUni, rowQty, pu, cat)
    const line = inv
      ? normalizeLineItem({ ...base, pid: inv.id, libre: false, unidad: inv.unidad || base.unidad })
      : normalizeLineItem(base)
    setItems((prev) => [...prev, line])
    setRowNom('')
    setRowQty(1)
    setRowPu(0)
    setRowUni('Unidad')
  }

  const guardar = () => {
    const nom = clienteNom.trim()
    if (!nom) {
      showToast('Indica el cliente', 'err')
      return
    }
    if (!items.length) {
      showToast('Agrega al menos un ítem', 'err')
      return
    }
    const m = matchClienteByName(db, nom)
    const clienteId = m?.id ?? null
    const clienteNombre = m?.nombre ?? nom
    const clienteRut = m?.rut ?? ''
    const tel = m?.tel ?? ''
    const vh = vehId ? db.vehiculos.find((x) => x.id === vehId) : null
    const normalizedItems = items.map((x) => normalizeLineItem(x))
    const desc = Math.max(0, descuento)
    const total = totalDocumentoConDescuento(normalizedItems, desc)
    const c: Cotizacion = {
      folio: nextFolio('COT', db),
      fecha,
      clienteId,
      clienteNombre,
      clienteRut,
      tel,
      vehiculoId: vh?.id ?? null,
      patente: vh?.patente ?? '',
      marca: vh?.marca ?? '',
      modelo: vh?.modelo ?? '',
      items: normalizedItems,
      descuento: desc,
      total,
      obs: obs.trim(),
      estado: 'Pendiente',
      creado: new Date().toISOString(),
    }
    setDb((d) => ({ ...d, cotizaciones: [c, ...d.cotizaciones] }))
    showToast('Cotización guardada')
    setClienteNom('')
    setVehId('')
    setFecha(new Date().toISOString().slice(0, 10))
    setItems([])
    setObs('')
    setDescuento(0)
    setStepTrabajoOpen(false)
    setStepCierreOpen(false)
  }

  const limpiar = () => {
    setClienteNom('')
    setVehId('')
    setFecha(new Date().toISOString().slice(0, 10))
    setItems([])
    setRowNom('')
    setRowUni('Unidad')
    setRowQty(1)
    setRowPu(0)
    setObs('')
    setDescuento(0)
    setStepTrabajoOpen(false)
    setStepCierreOpen(false)
  }

  const eliminar = (folio: string) => {
    if (!window.confirm('¿Eliminar esta cotización?')) return
    setDb((d) => ({ ...d, cotizaciones: d.cotizaciones.filter((x) => x.folio !== folio) }))
    if (expandedFolio === folio) setExpandedFolio(null)
    showToast('Cotización eliminada')
  }

  const patchEstado = (folio: string, estado: string) => {
    setDb((d) => ({
      ...d,
      cotizaciones: d.cotizaciones.map((x) => (x.folio === folio ? { ...x, estado } : x)),
    }))
    showToast('Estado actualizado')
  }

  const patchCotItems = (folio: string, nextItems: LineItem[]) => {
    setDb((d) => ({
      ...d,
      cotizaciones: d.cotizaciones.map((x) => {
        if (x.folio !== folio) return x
        const normalized = nextItems.map((y) => normalizeLineItem(y))
        const desc = Math.max(0, Number(x.descuento) || 0)
        const total = totalDocumentoConDescuento(normalized, desc)
        return { ...x, items: normalized, total }
      }),
    }))
  }

  const patchCotDescuento = (folio: string, raw: number) => {
    const desc = Math.max(0, raw)
    setDb((d) => ({
      ...d,
      cotizaciones: d.cotizaciones.map((x) => {
        if (x.folio !== folio) return x
        const total = totalDocumentoConDescuento(x.items, desc)
        return { ...x, descuento: desc, total }
      }),
    }))
  }

  const patchCotObs = (folio: string, nextObs: string) => {
    setDb((d) => ({
      ...d,
      cotizaciones: d.cotizaciones.map((x) => (x.folio === folio ? { ...x, obs: nextObs } : x)),
    }))
  }

  const agregarItemGuardado = (folio: string) => {
    const nombre = addNom.trim()
    if (!nombre) {
      showToast('Ingresa una descripción del ítem', 'warn')
      return
    }
    const c = db.cotizaciones.find((x) => x.folio === folio)
    if (!c) return
    const inv = inventarioCoincidenciaExacta(db, nombre)
    const cat = inv?.categoria || 'Servicios'
    const pu = precioUnitDesdeInvOlibre(inv, addPu)
    const base = makeLineItem(nombre, 'Unidad', addQty, pu, cat)
    const line = inv
      ? normalizeLineItem({ ...base, pid: inv.id, libre: false, unidad: inv.unidad || base.unidad })
      : normalizeLineItem(base)
    patchCotItems(folio, [...c.items, line])
    setAddNom('')
    setAddQty(1)
    setAddPu(0)
    showToast('Ítem agregado')
  }

  const convertirEnOt = (folio: string) => {
    const cot = db.cotizaciones.find((x) => x.folio === folio)
    if (!cot) return
    if (cot.estado === 'Convertida') {
      showToast('Ya fue convertida en orden de trabajo', 'warn')
      return
    }
    if (!window.confirm(`¿Convertir cotización ${folio} en orden de trabajo?`)) return
    const otFolio = nextFolio('OT', db)
    const itemsNorm = cot.items.map((x) => normalizeLineItem(x))
    const desc = Math.max(0, Number(cot.descuento) || 0)
    const total = totalDocumentoConDescuento(itemsNorm, desc)
    const mf = ordenMecanicosToRowFields([])
    const o: Orden = {
      folio: otFolio,
      fechaIn: new Date().toISOString().slice(0, 10),
      fechaEst: '',
      clienteId: cot.clienteId,
      clienteNombre: cot.clienteNombre,
      clienteRut: cot.clienteRut,
      tel: cot.tel,
      vehiculoId: cot.vehiculoId,
      patente: cot.patente,
      marca: cot.marca,
      modelo: cot.modelo,
      mecanicoId: mf.mecanico_id,
      mecanico: mf.mecanico,
      km: 0,
      diag: cot.obs || '',
      obs: '',
      items: itemsNorm,
      descuento: desc,
      total,
      estado: 'Recibido',
      cotizacionOrigen: folio,
      creado: new Date().toISOString(),
    }
    setDb((d) => ({
      ...d,
      ordenes: [o, ...d.ordenes],
      cotizaciones: d.cotizaciones.map((x) =>
        x.folio === folio ? { ...x, estado: 'Convertida', otFolio, items: itemsNorm, descuento: desc, total } : x,
      ),
    }))
    showToast(
      desc > 0
        ? `Orden ${otFolio} creada desde ${folio}. Descuento ${fmt(desc)} transferido`
        : `Orden ${otFolio} creada desde ${folio}`,
    )
  }

  const imprimirPdf = (folio: string) => {
    const c = db.cotizaciones.find((x) => x.folio === folio)
    if (!c) return
    const v = c.vehiculoId ? db.vehiculos.find((x) => x.id === c.vehiculoId) ?? null : null
    const ok = printCotizacion(settings, c, v)
    if (!ok) showToast('El navegador bloqueó la ventana de impresión', 'warn')
  }

  const enviarWhatsapp = (folio: string) => {
    const c = db.cotizaciones.find((x) => x.folio === folio)
    if (!c) return
    const taller = settings.empresa.nombre || 'El taller'
    const validez = settings.pdf.validezCotDias || 30
    const lines = c.items.slice(0, 5).map((i) => `• ${i.nombre} x${i.qty}`)
    const more = c.items.length > 5 ? `\n• ...y ${c.items.length - 5} más` : ''
    const msg =
      `Hola ${c.clienteNombre}, te enviamos la cotización solicitada:\n\n` +
      `📝 ${c.folio} — ${c.patente ? `${c.patente} ` : ''}\n` +
      lines.join('\n') +
      more +
      `\n\n💰 Total: ${fmt(c.total)}\n` +
      `⏳ Validez: ${validez} días\n\n` +
      `¿Aceptas la cotización? ¡Cualquier consulta escríbenos! — ${taller}`
    const ok = openWhatsAppUrl(c.tel || '', msg)
    if (!ok) showToast('No hay teléfono válido para WhatsApp (revisa el cliente)', 'warn')
  }

  const toggleExpand = (folio: string) => {
    setExpandedFolio((prev) => (prev === folio ? null : folio))
  }

  return (
    <>
      <div className="card card-cot">
        <div className="card-title">
          <div className="card-title-left">Nueva cotización</div>
        </div>

        <div className="rpm-step rpm-step--cot1 rpm-step-open">
          <div className="rpm-step-head">
            <span className="rpm-step-num">1</span>
            <div>
              <div className="rpm-step-title">Cliente y vehículo</div>
              <div className="rpm-step-sub muted">Quién cotiza y para qué unidad</div>
            </div>
          </div>
          <div className="rpm-step-body">
            <div className="g3 form-ops-row1">
              <div className="field">
                <label>Cliente — busca o ingresa libre</label>
                <input
                  list="lista-clientes-cot"
                  placeholder="Nombre del cliente..."
                  value={clienteNom}
                  onChange={(e) => {
                    setClienteNom(e.target.value)
                    setVehId('')
                  }}
                />
                <datalist id="lista-clientes-cot">
                  {db.clientes.map((c) => (
                    <option key={c.id} value={c.nombre} />
                  ))}
                </datalist>
              </div>
              <div className="field">
                <label>Vehículo</label>
                <select value={vehId} onChange={(e) => setVehId(e.target.value)}>
                  <option value="">— Seleccionar —</option>
                  {vehOpts.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.patente} — {v.marca} {v.modelo}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Fecha</label>
                <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          className={`rpm-step-toggle rpm-step--cot2${stepTrabajoOpen ? ' is-open' : ''}`}
          onClick={() => setStepTrabajoOpen((o) => !o)}
        >
          <span className="rpm-step-num">2</span>
          <div className="rpm-step-toggle-text">
            <span className="rpm-step-title">Ítems cotizados</span>
            <span className="rpm-step-sub muted">repuestos · mano de obra · IVA</span>
          </div>
          <span className="rpm-step-chevron" aria-hidden>
            {stepTrabajoOpen ? '▼' : '▶'}
          </span>
        </button>
        {stepTrabajoOpen ? (
          <div className="rpm-step-body rpm-step-body-nested">
            <div className="g4-items">
              <div className="field">
                <label>Producto / servicio — escribe para buscar o ingresar libre</label>
                <input
                  list="lista-inv-cot"
                  placeholder="Ej: Aceite motor, Revisión frenos..."
                  value={rowNom}
                  onChange={(e) => {
                    const v = e.target.value
                    setRowNom(v)
                    const inv = inventarioCoincidenciaExacta(db, v)
                    if (!inv) return
                    setRowPu(Math.max(0, Number(inv.precio) || 0))
                    const u = String(inv.unidad ?? '').trim()
                    if (u && UNIDADES_OPS.includes(u)) setRowUni(u)
                  }}
                />
                <datalist id="lista-inv-cot">
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
            <div className="field" style={{ maxWidth: 280 }}>
              <label>Descuento global ($)</label>
              <input type="number" min={0} step={1} value={descuento} onChange={(e) => setDescuento(Number(e.target.value))} />
            </div>
            <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
              A pagar:{' '}
              <strong>{fmt(totalDocumentoConDescuento(items.map((x) => normalizeLineItem(x)), descuento))}</strong>
            </p>
          </div>
        ) : null}

        <button
          type="button"
          className={`rpm-step-toggle rpm-step--cot3${stepCierreOpen ? ' is-open' : ''}`}
          onClick={() => setStepCierreOpen((o) => !o)}
        >
          <span className="rpm-step-num">3</span>
          <div className="rpm-step-toggle-text">
            <span className="rpm-step-title">Notas y guardar</span>
            <span className="rpm-step-sub muted">alcance · condiciones</span>
          </div>
          <span className="rpm-step-chevron" aria-hidden>
            {stepCierreOpen ? '▼' : '▶'}
          </span>
        </button>
        {stepCierreOpen ? (
          <div className="rpm-step-body rpm-step-body-nested">
            <div className="field field-full">
              <label>Notas / alcance del trabajo</label>
              <textarea rows={4} placeholder="Describe el trabajo, condiciones, garantías..." value={obs} onChange={(e) => setObs(e.target.value)} />
            </div>
          </div>
        ) : null}

        <div className="form-row-actions" style={{ marginTop: 14 }}>
          <button type="button" className="btn btn-purple" onClick={guardar}>
            ✓ Guardar cotización
          </button>
          <button type="button" className="btn btn-outline btn-outline-purple" onClick={limpiar}>
            ↺ Limpiar
          </button>
        </div>
      </div>

      <div className="card card-cot">
        <div className="card-title">
          <div className="card-title-left">Cotizaciones guardadas</div>
          <span className="card-count">{lista.length} registro{lista.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="inv-filters">
          <input
            className="input-buscar-clientes inv-filter-grow"
            placeholder="Buscar folio, cliente, patente..."
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
          />
          <select className="inv-filter-select" value={estFiltro} onChange={(e) => setEstFiltro(e.target.value)}>
            <option value="">Todos los estados</option>
            {ESTADOS_COT.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </div>
        {!lista.length ? (
          <div className="empty">
            <div className="empty-icon">📄</div>
            <div>No hay cotizaciones</div>
          </div>
        ) : (
          <div className="lista-cots-exp">
            {lista.map((c) => {
              const open = expandedFolio === c.folio
              return (
                <div key={c.folio} className="exp-row">
                  <button type="button" className="exp-hdr" onClick={() => toggleExpand(c.folio)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span className="folio-cot">{c.folio}</span>
                      <span style={{ fontWeight: 600 }}>{c.clienteNombre}</span>
                      {c.clienteRut ? (
                        <span style={{ fontSize: 11, color: 'var(--text2)' }}>{c.clienteRut}</span>
                      ) : null}
                      {c.patente ? (
                        <span className="badge b-orange">{c.patente}</span>
                      ) : null}
                      <span className={`status-pill ${statusPillClass(c.estado)}`}>{c.estado}</span>
                      {c.otFolio ? (
                        <button
                          type="button"
                          className="folio-tag-link"
                          onClick={(e) => {
                            e.stopPropagation()
                            onIrOrdenes?.()
                          }}
                          title="Ir a órdenes de trabajo"
                        >
                          → {c.otFolio}
                        </button>
                      ) : null}
                    </div>
                    <div className="exp-hdr-meta">
                      <div className="exp-hdr-meta-total">{fmt(c.total)}</div>
                      <div className="exp-hdr-meta-sub">
                        {isoDateToDdMmYyyy(c.fecha)} · {c.items.length} ítem{c.items.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </button>
                  {open ? (
                    <div className="exp-body">
                      {c.items.length === 0 ? (
                        <div style={{ fontSize: 12, color: 'var(--text2)', margin: '10px 0' }}>
                          Sin ítems en esta cotización. Usa «+ Agregar» más abajo.
                        </div>
                      ) : (
                        <LineItemsEditor
                          items={c.items}
                          onChange={(next) => patchCotItems(c.folio, next)}
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
                          onChange={(e) => {
                            const v = e.target.value
                            setAddNom(v)
                            const inv = inventarioCoincidenciaExacta(db, v)
                            if (inv) setAddPu(Math.max(0, Number(inv.precio) || 0))
                          }}
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
                        <button type="button" className="btn btn-xs btn-primary" onClick={() => agregarItemGuardado(c.folio)}>
                          + Agregar
                        </button>
                      </div>
                      <div className="field field-full cot-notes-block">
                        <label>Notas / alcance</label>
                        <textarea
                          rows={3}
                          value={c.obs}
                          onChange={(e) => patchCotObs(c.folio, e.target.value)}
                          placeholder="Notas visibles en PDF y al convertir en OT..."
                        />
                      </div>
                      <div className="field" style={{ maxWidth: 280 }}>
                        <label>Descuento global ($)</label>
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={c.descuento ?? 0}
                          onChange={(e) => patchCotDescuento(c.folio, Number(e.target.value))}
                        />
                      </div>
                      <div className="cot-exp-actions">
                        <button type="button" className="btn btn-xs btn-outline" onClick={() => imprimirPdf(c.folio)}>
                          🖨 PDF
                        </button>
                        <button type="button" className="btn btn-xs btn-green" onClick={() => enviarWhatsapp(c.folio)}>
                          💬 WhatsApp
                        </button>
                        {c.estado === 'Pendiente' ? (
                          <>
                            <button type="button" className="btn btn-xs btn-green" onClick={() => patchEstado(c.folio, 'Aceptada')}>
                              ✓ Aceptada
                            </button>
                            <button type="button" className="btn btn-xs btn-red" onClick={() => patchEstado(c.folio, 'Rechazada')}>
                              ✕ Rechazada
                            </button>
                          </>
                        ) : null}
                        {c.estado !== 'Convertida' && c.estado !== 'Rechazada' ? (
                          <button type="button" className="btn btn-xs btn-primary" onClick={() => convertirEnOt(c.folio)}>
                            → Convertir en OT
                          </button>
                        ) : null}
                        <button type="button" className="btn btn-xs btn-red" onClick={() => eliminar(c.folio)}>
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
    </>
  )
}
