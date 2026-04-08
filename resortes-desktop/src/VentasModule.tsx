import { type Dispatch, type SetStateAction, useMemo, useState } from 'react'
import type { Credito, Db, LineItem, Venta } from './appTypes'
import {
  makeLineItem,
  matchClienteByName,
  nextFolio,
  totalLineItems,
  UNIDADES_OPS,
  vehiculosFiltradosCliente,
} from './opsHelpers'

type Props = {
  db: Db
  setDb: Dispatch<SetStateAction<Db>>
  showToast: (msg: string, type?: 'ok' | 'err' | 'warn') => void
}

const FPAGO = ['Contado', 'Transferencia', 'Tarjeta', 'Crédito']

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

export function VentasModule({ db, setDb, showToast }: Props) {
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
  const [obs, setObs] = useState('')
  const [buscar, setBuscar] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')

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

  const quitarItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx))

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
    const bruto = totalLineItems(items)
    const desc = Math.max(0, descuento)
    const total = Math.max(0, bruto - desc)
    const folio = nextFolio('VT', db)
    const v: Venta = {
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
      items: [...items],
      descuento: desc,
      total,
      fpago,
      obs: obs.trim(),
      creado: new Date().toISOString(),
    }
    setDb((d) => {
      const ventas = [v, ...d.ventas]
      let creditos = d.creditos
      if (fpago === 'Crédito' && total > 0) {
        const cr: Credito = {
          id: uid(),
          clienteId,
          clienteNombre,
          clienteRut,
          monto: total,
          saldo: total,
          abonos: [],
          fecha,
          vcto: '',
          desc: obs.trim() || `Venta ${folio}`,
          ventaFolio: folio,
          estado: 'Pendiente',
          creado: new Date().toISOString(),
        }
        creditos = [cr, ...creditos]
      }
      return { ...d, ventas, creditos }
    })
    showToast(fpago === 'Crédito' && total > 0 ? 'Venta y crédito registrados' : 'Venta registrada')
    setClienteNom('')
    setVehId('')
    setFecha(new Date().toISOString().slice(0, 10))
    setItems([])
    setDescuento(0)
    setFpago('Contado')
    setObs('')
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
    setObs('')
  }

  const eliminar = (folio: string) => {
    if (!window.confirm('¿Eliminar esta venta del historial?')) return
    setDb((d) => ({ ...d, ventas: d.ventas.filter((x) => x.folio !== folio) }))
    showToast('Venta eliminada')
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
            <label>N° orden</label>
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
              onChange={(e) => setRowNom(e.target.value)}
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

        {items.length > 0 && (
          <div className="tw tw-items-preview">
            <table>
              <thead>
                <tr>
                  <th>Ítem</th>
                  <th>Unidad</th>
                  <th>Cant.</th>
                  <th>P. unit.</th>
                  <th>Subtotal</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={`${it.nombre}-${idx}`}>
                    <td>{it.nombre}</td>
                    <td>{it.unidad}</td>
                    <td>{it.qty}</td>
                    <td>{fmt(it.pu)}</td>
                    <td>{fmt(it.sub)}</td>
                    <td>
                      <button type="button" className="btn btn-xs btn-red" onClick={() => quitarItem(idx)}>
                        Quitar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="g2-desc">
          <div className="field">
            <label>Descuento ($)</label>
            <input type="number" min={0} step={1} value={descuento} onChange={(e) => setDescuento(Number(e.target.value))} />
          </div>
          <div className="field">
            <label>Forma de pago</label>
            <select value={fpago} onChange={(e) => setFpago(e.target.value)}>
              {FPAGO.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field field-full">
          <label>Observaciones</label>
          <textarea rows={3} placeholder="Descripción del servicio..." value={obs} onChange={(e) => setObs(e.target.value)} />
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
        {!lista.length ? (
          <div className="empty">
            <div className="empty-icon">🧾</div>
            <div>No hay ventas</div>
          </div>
        ) : (
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>Folio</th>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Patente</th>
                  <th>Total</th>
                  <th>Pago</th>
                  <th className="th-actions">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((v) => (
                  <tr key={v.folio}>
                    <td className="td-mono">{v.folio}</td>
                    <td>{v.fecha}</td>
                    <td>{v.clienteNombre}</td>
                    <td>{v.patente || '—'}</td>
                    <td>{fmt(v.total)}</td>
                    <td>{v.fpago}</td>
                    <td>
                      <button type="button" className="btn btn-xs btn-red" onClick={() => eliminar(v.folio)}>
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
