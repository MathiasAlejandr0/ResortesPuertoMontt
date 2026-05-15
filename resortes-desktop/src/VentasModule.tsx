import { type Dispatch, type SetStateAction, useEffect, useMemo, useState } from 'react'
import type { AppSettings, Credito, Db, LineItem, Venta } from './appTypes'
import { LineItemsEditor } from './LineItemsEditor'
import {
  calcTotalesLines,
  inventarioCoincidenciaExacta,
  makeLineItem,
  matchClienteByName,
  nextFolio,
  normalizeLineItem,
  normalizeVenta,
  precioUnitDesdeInvOlibre,
  sumItemsConIva,
  UNIDADES_OPS,
  vehiculosFiltradosCliente,
} from './opsHelpers'
import { isoDateToDdMmYyyy } from './dateFormat'
import { humanBytes, openDocumentoAdjunto, pickDocumentoAdjunto } from './documentoAdjunto'
import { printVenta } from './ventaPrint'

type Props = {
  db: Db
  setDb: Dispatch<SetStateAction<Db>>
  settings: AppSettings
  showToast: (msg: string, type?: 'ok' | 'err' | 'warn') => void
  onIrOrdenes?: () => void
  onIrCotizaciones?: () => void
}

const FPAGO = ['Contado', 'Transferencia', 'Débito', 'Crédito', 'Cheque', 'Otro']

const DOC_TIPO_OPTS = [
  '',
  'Boleta',
  'Boleta electrónica',
  'Factura',
  'Factura electrónica',
  'Nota de crédito',
]

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

function fpagoBadgeClass(fp: string): string {
  if (fp === 'Crédito') return 'badge b-red'
  if (fp === 'Cheque') return 'badge b-blue'
  if (fp === 'Transferencia') return 'badge b-teal'
  return 'badge b-gray'
}

export function VentasModule({ db, setDb, settings, showToast, onIrOrdenes, onIrCotizaciones }: Props) {
  const [clienteNom, setClienteNom] = useState('')
  const [vehId, setVehId] = useState('')
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10))
  const [items, setItems] = useState<LineItem[]>([])
  const [rowNom, setRowNom] = useState('')
  const [rowUni, setRowUni] = useState('Unidad')
  const [rowQty, setRowQty] = useState(1)
  const [rowPu, setRowPu] = useState(0)
  const [descuento, setDescuento] = useState(0)
  const [fpago, setFpago] = useState('Contado')
  const [fechaVctoCredito, setFechaVctoCredito] = useState('')
  const [chequeNumero, setChequeNumero] = useState('')
  const [chequeBanco, setChequeBanco] = useState('')
  const [chequeFechaCobro, setChequeFechaCobro] = useState('')
  const [obs, setObs] = useState('')
  const [docTipo, setDocTipo] = useState('')
  const [docFolio, setDocFolio] = useState('')
  const [docFecha, setDocFecha] = useState('')
  const [docMontoStr, setDocMontoStr] = useState('')
  const [docAdjNombre, setDocAdjNombre] = useState('')
  const [docAdjMime, setDocAdjMime] = useState('')
  const [docAdjDataUrl, setDocAdjDataUrl] = useState('')
  const [docAdjSize, setDocAdjSize] = useState(0)
  const [buscar, setBuscar] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [expandedFolio, setExpandedFolio] = useState<string | null>(null)
  const [addNom, setAddNom] = useState('')
  const [addQty, setAddQty] = useState(1)
  const [addPu, setAddPu] = useState(0)

  const previewFolio = useMemo(() => nextFolio('VT', db), [db])

  const clienteMatch = useMemo(() => matchClienteByName(db, clienteNom), [db, clienteNom])
  const vehOpts = useMemo(
    () => vehiculosFiltradosCliente(db, clienteMatch?.id ?? null),
    [db, clienteMatch],
  )

  const lista = useMemo(() => {
    let rows = [...db.ventas].sort((a, b) => (a.creado < b.creado ? 1 : -1))
    const q = buscar.toLowerCase().trim()
    if (q) {
      rows = rows.filter(
        (v) =>
          v.folio.toLowerCase().includes(q) ||
          v.clienteNombre.toLowerCase().includes(q) ||
          (v.patente || '').toLowerCase().includes(q),
      )
    }
    if (desde) rows = rows.filter((v) => !v.fecha || v.fecha >= desde)
    if (hasta) rows = rows.filter((v) => !v.fecha || v.fecha <= hasta)
    return rows
  }, [db.ventas, buscar, desde, hasta])

  const listaTotal = useMemo(() => lista.reduce((s, v) => s + v.total, 0), [lista])

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
      ? normalizeLineItem({
          ...base,
          pid: inv.id,
          libre: false,
          unidad: inv.unidad || base.unidad,
        })
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
    const desc = Math.max(0, descuento)
    const itemsNorm = items.map((x) => normalizeLineItem(x))
    const rawDoc = sumItemsConIva(itemsNorm)
    const total = Math.max(0, rawDoc - desc)
    const folio = nextFolio('VT', db)
    const dt = docTipo.trim()
    if (fpago === 'Cheque') {
      if (!chequeNumero.trim()) return showToast('Falta N° de cheque', 'err')
      if (!chequeBanco.trim()) return showToast('Falta banco emisor', 'err')
      if (!chequeFechaCobro.trim()) return showToast('Falta fecha de cobro', 'err')
    }
    const docMontoParsed = docMontoStr.trim() === '' ? total : Number(docMontoStr)
    const ventaRaw: Venta = {
      folio,
      fecha,
      clienteId,
      clienteNombre,
      clienteRut,
      tel,
      vehiculoId: vh?.id ?? null,
      patente: vh?.patente ?? '',
      marca: vh?.marca ?? '',
      modelo: vh?.modelo ?? '',
      items: itemsNorm,
      descuento: desc,
      total,
      fpago,
      chequeNumero: fpago === 'Cheque' ? chequeNumero.trim() : undefined,
      chequeBanco: fpago === 'Cheque' ? chequeBanco.trim() : undefined,
      chequeFechaCobro: fpago === 'Cheque' ? chequeFechaCobro.trim().slice(0, 10) : undefined,
      obs: obs.trim(),
      docTipo: dt || undefined,
      docFolio: dt ? docFolio.trim() || undefined : undefined,
      docFecha: dt ? docFecha.trim().slice(0, 10) || undefined : undefined,
      docMonto: dt ? (Number.isFinite(docMontoParsed) ? Math.max(0, docMontoParsed) : total) : undefined,
      docAdjNombre: dt ? docAdjNombre || undefined : undefined,
      docAdjMime: dt ? docAdjMime || undefined : undefined,
      docAdjDataUrl: dt ? docAdjDataUrl || undefined : undefined,
      docAdjSize: dt && docAdjSize > 0 ? docAdjSize : undefined,
      creado: new Date().toISOString(),
    }
    const v = normalizeVenta({ ...ventaRaw, folio: ventaRaw.folio, creado: ventaRaw.creado })

    setDb((d) => {
      let inventario = d.inventario
      for (const l of itemsNorm) {
        if (l.libre) continue
        const pid = l.pid
        if (!pid) continue
        inventario = inventario.map((p) =>
          p.id !== pid ? p : p.categoria === 'Mano de obra' ? p : { ...p, stock: Math.max(0, p.stock - l.qty) },
        )
      }
      const ventas = [v, ...d.ventas]
      let creditos = d.creditos
      if ((fpago === 'Crédito' || fpago === 'Cheque') && total > 0) {
        const cr: Credito = {
          id: uid(),
          clienteId,
          clienteNombre,
          clienteRut,
          monto: total,
          saldo: total,
          abonos: [],
          fecha,
          vcto: fpago === 'Cheque' ? chequeFechaCobro.trim().slice(0, 10) : fechaVctoCredito.trim().slice(0, 10),
          desc: obs.trim() || `${fpago === 'Cheque' ? 'Cheque' : 'Crédito'} venta ${folio}`,
          tipo: fpago === 'Cheque' ? 'cheque' : 'credito',
          chequeNumero: fpago === 'Cheque' ? chequeNumero.trim() : undefined,
          chequeBanco: fpago === 'Cheque' ? chequeBanco.trim() : undefined,
          chequeFechaCobro: fpago === 'Cheque' ? chequeFechaCobro.trim().slice(0, 10) : undefined,
          chequeEstado: fpago === 'Cheque' ? 'Pendiente' : undefined,
          ventaFolio: folio,
          estado: 'Pendiente',
          creado: new Date().toISOString(),
        }
        creditos = [cr, ...creditos]
      }
      return { ...d, inventario, ventas, creditos }
    })
    showToast(fpago === 'Crédito' || fpago === 'Cheque' ? 'Venta y cuenta por cobrar registrada' : 'Venta registrada')
    setClienteNom('')
    setVehId('')
    setFecha(new Date().toISOString().slice(0, 10))
    setItems([])
    setDescuento(0)
    setFpago('Contado')
    setFechaVctoCredito('')
    setChequeNumero('')
    setChequeBanco('')
    setChequeFechaCobro('')
    setObs('')
    setDocTipo('')
    setDocFolio('')
    setDocFecha('')
    setDocMontoStr('')
    setDocAdjNombre('')
    setDocAdjMime('')
    setDocAdjDataUrl('')
    setDocAdjSize(0)
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
    setDescuento(0)
    setFpago('Contado')
    setFechaVctoCredito('')
    setChequeNumero('')
    setChequeBanco('')
    setChequeFechaCobro('')
    setObs('')
    setDocTipo('')
    setDocFolio('')
    setDocFecha('')
    setDocMontoStr('')
    setDocAdjNombre('')
    setDocAdjMime('')
    setDocAdjDataUrl('')
    setDocAdjSize(0)
  }

  const eliminar = (folio: string) => {
    if (!window.confirm('¿Eliminar esta venta del historial?')) return
    setDb((d) => ({ ...d, ventas: d.ventas.filter((x) => x.folio !== folio) }))
    if (expandedFolio === folio) setExpandedFolio(null)
    showToast('Venta eliminada')
  }

  const patchVentaItems = (folio: string, nextItems: LineItem[]) => {
    const cur = db.ventas.find((x) => x.folio === folio)
    if (!cur) return
    const normalized = nextItems.map((x) => normalizeLineItem(x))
    const raw = sumItemsConIva(normalized)
    const desc = Number(cur.descuento) || 0
    const total = Math.max(0, raw - desc)
    setDb((d) => ({
      ...d,
      ventas: d.ventas.map((x) =>
        x.folio === folio ? normalizeVenta({ ...x, items: normalized, total, folio: x.folio, creado: x.creado }) : x,
      ),
    }))
  }

  const patchVenta = (
    folio: string,
    patch: Partial<Pick<Venta, 'obs' | 'docTipo' | 'docFolio' | 'docFecha' | 'docMonto' | 'docAdjNombre' | 'docAdjMime' | 'docAdjDataUrl' | 'docAdjSize'>>,
  ) => {
    setDb((d) => ({
      ...d,
      ventas: d.ventas.map((x) =>
        x.folio === folio ? normalizeVenta({ ...x, ...patch, folio: x.folio, creado: x.creado }) : x,
      ),
    }))
  }

  const onPickAdjunto = async (file: File | undefined | null) => {
    if (!file) return
    try {
      const parsed = await pickDocumentoAdjunto(file)
      setDocAdjNombre(parsed.nombre)
      setDocAdjMime(parsed.mime)
      setDocAdjDataUrl(parsed.dataUrl)
      setDocAdjSize(parsed.size)
      showToast('Adjunto cargado')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'No se pudo adjuntar', 'err')
    }
  }

  const onPickAdjuntoVenta = async (folio: string, file: File | undefined | null) => {
    if (!file) return
    try {
      const parsed = await pickDocumentoAdjunto(file)
      patchVenta(folio, {
        docAdjNombre: parsed.nombre,
        docAdjMime: parsed.mime,
        docAdjDataUrl: parsed.dataUrl,
        docAdjSize: parsed.size,
      })
      showToast('Adjunto cargado')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'No se pudo adjuntar', 'err')
    }
  }

  const agregarItemGuardado = (folio: string) => {
    const nombre = addNom.trim()
    if (!nombre) {
      showToast('Ingresa una descripción del ítem', 'warn')
      return
    }
    const cur = db.ventas.find((x) => x.folio === folio)
    if (!cur) return
    const inv = inventarioCoincidenciaExacta(db, nombre)
    const cat = inv?.categoria || 'Servicios'
    const pu = precioUnitDesdeInvOlibre(inv, addPu)
    const base = makeLineItem(nombre, 'Unidad', addQty, pu, cat)
    const line = inv
      ? normalizeLineItem({ ...base, pid: inv.id, libre: false, unidad: inv.unidad || base.unidad })
      : normalizeLineItem(base)
    patchVentaItems(folio, [...cur.items, line])
    setAddNom('')
    setAddQty(1)
    setAddPu(0)
    showToast('Ítem agregado')
  }

  const imprimirPdf = (folio: string) => {
    const v = db.ventas.find((x) => x.folio === folio)
    if (!v) return
    const veh = v.vehiculoId ? db.vehiculos.find((x) => x.id === v.vehiculoId) ?? null : null
    const ok = printVenta(settings, v, veh)
    if (!ok) showToast('El navegador bloqueó la ventana de impresión', 'warn')
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Math.round(n))

  return (
    <>
      <div className="card card-venta">
        <div className="card-title">
          <div className="card-title-left">Nueva venta directa</div>
        </div>

        <div className="g4-venta-row1">
          <div className="field">
            <label>Cliente</label>
            <input
              list="lista-clientes-vt"
              placeholder="Nombre del cliente..."
              value={clienteNom}
              onChange={(e) => {
                setClienteNom(e.target.value)
                setVehId('')
              }}
            />
            <datalist id="lista-clientes-vt">
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
          <div className="field">
            <label>N° venta</label>
            <input readOnly className="input-readonly" value={previewFolio} />
          </div>
        </div>

        <div className="g5-venta-items">
          <div className="field field-span-2">
            <label>Producto / servicio</label>
            <input
              list="lista-inv-vt"
              placeholder="Ej: Aceite motor, Revisión..."
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
            <datalist id="lista-inv-vt">
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
          <div className="field field-agregar-vt">
            <label className="label-invisible">‎</label>
            <button type="button" className="btn btn-agregar-item btn-block" onClick={agregarItem}>
              + Agregar ítem
            </button>
          </div>
        </div>

        <LineItemsEditor items={items} onChange={setItems} fmt={fmt} />

        {items.length > 0 && (
          <div className="venta-desc-global-hint">
            <span>
              Subtotal ítems: <strong>{fmt(calcTotalesLines(items).total)}</strong>
            </span>
            <span style={{ marginLeft: 12 }}>
              A pagar (tras descuento global):{' '}
              <strong>{fmt(Math.max(0, calcTotalesLines(items).total - Math.max(0, descuento)))}</strong>
            </span>
          </div>
        )}

        <div className="g2-desc">
          <div className="field">
            <label>Descuento ($)</label>
            <input type="number" min={0} step={1} value={descuento} onChange={(e) => setDescuento(Number(e.target.value))} />
          </div>
          <div className="field">
            <label>Forma de pago</label>
            <select
              value={fpago}
              onChange={(e) => {
                setFpago(e.target.value)
                if (e.target.value !== 'Crédito') setFechaVctoCredito('')
                if (e.target.value !== 'Cheque') {
                  setChequeNumero('')
                  setChequeBanco('')
                  setChequeFechaCobro('')
                }
              }}
            >
              {FPAGO.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
          {fpago === 'Crédito' ? (
            <div className="field field-full">
              <label>Fecha vencimiento crédito</label>
              <input type="date" value={fechaVctoCredito} onChange={(e) => setFechaVctoCredito(e.target.value)} />
            </div>
          ) : null}
          {fpago === 'Cheque' ? (
            <>
              <div className="field">
                <label>N° de cheque</label>
                <input value={chequeNumero} onChange={(e) => setChequeNumero(e.target.value)} />
              </div>
              <div className="field">
                <label>Banco emisor</label>
                <input value={chequeBanco} onChange={(e) => setChequeBanco(e.target.value)} />
              </div>
              <div className="field field-full">
                <label>Fecha de cobro</label>
                <input type="date" value={chequeFechaCobro} onChange={(e) => setChequeFechaCobro(e.target.value)} />
              </div>
            </>
          ) : null}
        </div>

        <div className="field field-full">
          <label>Observaciones</label>
          <textarea rows={3} placeholder="Descripción del servicio..." value={obs} onChange={(e) => setObs(e.target.value)} />
        </div>

        <div className="vt-doc-box">
          <div className="vt-doc-box-title">
            Documento tributario <small>(opcional)</small>
          </div>
          <div className="g4-items">
            <div className="field">
              <label>Tipo documento</label>
              <select value={docTipo} onChange={(e) => setDocTipo(e.target.value)}>
                {DOC_TIPO_OPTS.map((t) => (
                  <option key={t || 'sin'} value={t}>
                    {t || '— Sin documento —'}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>N° folio / documento</label>
              <input placeholder="Ej: 000123" value={docFolio} onChange={(e) => setDocFolio(e.target.value)} disabled={!docTipo.trim()} />
            </div>
            <div className="field">
              <label>Fecha emisión</label>
              <input type="date" value={docFecha} onChange={(e) => setDocFecha(e.target.value)} disabled={!docTipo.trim()} />
            </div>
            <div className="field">
              <label>Monto facturado ($)</label>
              <input
                type="number"
                min={0}
                step={1}
                placeholder="Vacío = total venta"
                value={docMontoStr}
                onChange={(e) => setDocMontoStr(e.target.value)}
                disabled={!docTipo.trim()}
              />
            </div>
          </div>
          {docTipo.trim() ? (
            <div className="field field-full">
              <label>Adjuntar documento (PDF o imagen, máx 2MB)</label>
              <input
                type="file"
                accept=".pdf,image/*,application/pdf"
                onChange={(e) => void onPickAdjunto(e.target.files?.[0])}
              />
              {docAdjNombre ? (
                <div className="vt-doc-banner">
                  <span>
                    Documento: <strong>{docTipo}</strong> · <strong>{docAdjNombre}</strong> ({humanBytes(docAdjSize)})
                  </span>
                  <button
                    type="button"
                    className="btn btn-xs btn-teal"
                    onClick={() => {
                      if (!openDocumentoAdjunto(docAdjDataUrl)) showToast('No se pudo abrir el adjunto', 'warn')
                    }}
                  >
                    📎 Ver adjunto
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="form-row-actions">
          <button type="button" className="btn btn-primary btn-guardar" onClick={guardar}>
            ✓ Confirmar venta
          </button>
          <button type="button" className="btn btn-outline" onClick={limpiar}>
            ↺ Limpiar
          </button>
        </div>
      </div>

      <div className="card card-venta">
        <div className="card-title">
          <div className="card-title-left">Historial de ventas</div>
          <span className="card-count">{lista.length} venta{lista.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="inv-filters">
          <input
            className="input-buscar-clientes inv-filter-grow"
            placeholder="Buscar folio, cliente, patente..."
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
          />
          <input type="date" className="inv-filter-select inv-date" value={desde} onChange={(e) => setDesde(e.target.value)} />
          <input type="date" className="inv-filter-select inv-date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </div>
        {lista.length > 0 ? (
          <div className="vt-resumen-line">
            {lista.length} venta{lista.length !== 1 ? 's' : ''} — Total: {fmt(listaTotal)}
          </div>
        ) : null}
        {!lista.length ? (
          <div className="empty">
            <div className="empty-icon">🧾</div>
            <div>No hay ventas</div>
          </div>
        ) : (
          <div className="lista-ventas-exp">
            {lista.map((v) => {
              const open = expandedFolio === v.folio
              return (
                <div key={v.folio} className="exp-row">
                  <button type="button" className="exp-hdr" onClick={() => setExpandedFolio(open ? null : v.folio)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span className="folio-ot">{v.folio}</span>
                      <span style={{ fontWeight: 600 }}>{v.clienteNombre}</span>
                      {v.clienteRut ? (
                        <span style={{ fontSize: 11, color: 'var(--text2)' }}>{v.clienteRut}</span>
                      ) : null}
                      {v.patente ? <span className="badge b-orange">{v.patente}</span> : null}
                      {v.otOrigen ? (
                        <button
                          type="button"
                          className="folio-tag-link"
                          style={{ fontSize: 10 }}
                          onClick={(e) => {
                            e.stopPropagation()
                            onIrOrdenes?.()
                          }}
                          title="Ir a órdenes"
                        >
                          OT: {v.otOrigen}
                        </button>
                      ) : null}
                      {v.cotOrigen ? (
                        <button
                          type="button"
                          className="folio-cot folio-cot-link"
                          style={{ fontSize: 10 }}
                          onClick={(e) => {
                            e.stopPropagation()
                            onIrCotizaciones?.()
                          }}
                          title="Ir a cotizaciones"
                        >
                          COT: {v.cotOrigen}
                        </button>
                      ) : null}
                      <span className={fpagoBadgeClass(v.fpago)}>{v.fpago}</span>
                      {v.docTipo ? (
                        <span className="vt-doc-chip">
                          🧾 {v.docTipo}
                          {v.docFolio ? ` N°${v.docFolio}` : ''}
                        </span>
                      ) : null}
                    </div>
                    <div className="exp-hdr-meta">
                      <div className="exp-hdr-meta-total">{fmt(v.total)}</div>
                      <div className="exp-hdr-meta-sub">
                        {isoDateToDdMmYyyy(v.fecha)} · {v.items.length} ítem{v.items.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </button>
                  {open ? (
                    <div className="exp-body">
                      {v.mecanico ? (
                        <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8 }}>👷 {v.mecanico}</div>
                      ) : null}
                      {v.items.length === 0 ? (
                        <div style={{ fontSize: 12, color: 'var(--text2)', margin: '10px 0' }}>Sin líneas.</div>
                      ) : (
                        <LineItemsEditor
                          items={v.items}
                          onChange={(next) => patchVentaItems(v.folio, next)}
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
                        <button type="button" className="btn btn-xs btn-primary" onClick={() => agregarItemGuardado(v.folio)}>
                          + Agregar
                        </button>
                      </div>
                      {v.descuento > 0 ? (
                        <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8 }}>
                          Descuento aplicado: {fmt(v.descuento)}
                        </div>
                      ) : null}
                      <div className="field field-full">
                        <label>Observaciones</label>
                        <textarea rows={3} value={v.obs} onChange={(e) => patchVenta(v.folio, { obs: e.target.value })} />
                      </div>
                      <div className="vt-doc-box vt-doc-box-inner">
                        <div className="vt-doc-box-title">Documento tributario</div>
                        <div className="g4-items">
                          <div className="field">
                            <label>Tipo</label>
                            <select
                              value={v.docTipo || ''}
                              onChange={(e) => {
                                const t = e.target.value.trim()
                                if (!t) {
                                  patchVenta(v.folio, {
                                    docTipo: undefined,
                                    docFolio: undefined,
                                    docFecha: undefined,
                                    docMonto: undefined,
                                    docAdjNombre: undefined,
                                    docAdjMime: undefined,
                                    docAdjDataUrl: undefined,
                                    docAdjSize: undefined,
                                  })
                                } else {
                                  patchVenta(v.folio, { docTipo: t })
                                }
                              }}
                            >
                              {DOC_TIPO_OPTS.map((t, i) => (
                                <option key={`${i}-${t || 'none'}`} value={t}>
                                  {t || '— Sin documento —'}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="field">
                            <label>N° folio</label>
                            <input
                              value={v.docFolio || ''}
                              onChange={(e) => patchVenta(v.folio, { docFolio: e.target.value })}
                              disabled={!v.docTipo}
                            />
                          </div>
                          <div className="field">
                            <label>Fecha emisión</label>
                            <input
                              type="date"
                              value={v.docFecha || ''}
                              onChange={(e) => patchVenta(v.folio, { docFecha: e.target.value || undefined })}
                              disabled={!v.docTipo}
                            />
                          </div>
                          <div className="field">
                            <label>Monto doc. ($)</label>
                            <input
                              type="number"
                              min={0}
                              step={1}
                              value={v.docMonto ?? ''}
                              onChange={(e) =>
                                patchVenta(v.folio, {
                                  docMonto: e.target.value === '' ? undefined : Number(e.target.value),
                                })
                              }
                              disabled={!v.docTipo}
                            />
                          </div>
                        </div>
                        {v.docTipo ? (
                          <div className="field field-full">
                            <label>Adjuntar documento (PDF o imagen, máx 2MB)</label>
                            <input
                              type="file"
                              accept=".pdf,image/*,application/pdf"
                              onChange={(e) => void onPickAdjuntoVenta(v.folio, e.target.files?.[0])}
                            />
                          </div>
                        ) : null}
                      </div>
                      {v.docTipo ? (
                        <div className="vt-doc-banner">
                          <span>
                            🧾 <strong>{v.docTipo}</strong>
                          </span>
                          {v.docFolio ? (
                            <span>
                              N° <strong>{v.docFolio}</strong>
                            </span>
                          ) : null}
                          {v.docFecha ? (
                            <span>
                              Emitido: <strong>{v.docFecha}</strong>
                            </span>
                          ) : null}
                          <span>
                            Monto:{' '}
                            <strong className="td-mono">{fmt(v.docMonto != null ? v.docMonto : v.total)}</strong>
                          </span>
                          {v.docAdjNombre ? (
                            <>
                              <span>
                                Archivo: <strong>{v.docAdjNombre}</strong> ({humanBytes(v.docAdjSize || 0)})
                              </span>
                              <button
                                type="button"
                                className="btn btn-xs btn-teal"
                                onClick={() => {
                                  if (!openDocumentoAdjunto(v.docAdjDataUrl)) showToast('No se pudo abrir el adjunto', 'warn')
                                }}
                              >
                                📎 Ver adjunto
                              </button>
                            </>
                          ) : null}
                        </div>
                      ) : null}
                      <div className="cot-exp-actions">
                        <button type="button" className="btn btn-xs btn-outline" onClick={() => imprimirPdf(v.folio)}>
                          🖨 PDF
                        </button>
                        <button type="button" className="btn btn-xs btn-red" onClick={() => eliminar(v.folio)}>
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
