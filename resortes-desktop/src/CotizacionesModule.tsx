import { type Dispatch, type SetStateAction, useMemo, useState } from 'react'
import type { Cotizacion, Db, LineItem } from './appTypes'
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

const ESTADOS_COT = ['Pendiente', 'Aprobada', 'Rechazada', 'Convertida']

export function CotizacionesModule({ db, setDb, showToast }: Props) {
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
          (c.patente || '').toLowerCase().includes(q),
      )
    }
    if (estFiltro) rows = rows.filter((c) => c.estado === estFiltro)
    return rows
  }, [db.cotizaciones, buscar, estFiltro])

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

  const quitarItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx))
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
    const total = totalLineItems(items)
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
      items: [...items],
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
  }

  const eliminar = (folio: string) => {
    if (!window.confirm('¿Eliminar esta cotización?')) return
    setDb((d) => ({ ...d, cotizaciones: d.cotizaciones.filter((x) => x.folio !== folio) }))
    showToast('Cotización eliminada')
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Math.round(n))

  return (
    <>
      <div className="card card-cot">
        <div className="card-title">
          <div className="card-title-left">Nueva cotización</div>
        </div>
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

        <div className="g4-items">
          <div className="field">
            <label>Producto / servicio — escribe para buscar o ingresar libre</label>
            <input
              list="lista-inv-cot"
              placeholder="Ej: Aceite motor, Revisión frenos..."
              value={rowNom}
              onChange={(e) => setRowNom(e.target.value)}
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
            <input
              type="number"
              min={0}
              step={1}
              value={rowQty}
              onChange={(e) => setRowQty(Number(e.target.value))}
            />
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

        <div className="field field-full">
          <label>Notas / alcance del trabajo</label>
          <textarea rows={4} placeholder="Describe el trabajo, condiciones, garantías..." value={obs} onChange={(e) => setObs(e.target.value)} />
        </div>

        <div className="form-row-actions">
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
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>Folio</th>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Patente</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th className="th-actions">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((c) => (
                  <tr key={c.folio}>
                    <td className="td-mono">{c.folio}</td>
                    <td>{c.fecha}</td>
                    <td>{c.clienteNombre}</td>
                    <td>{c.patente || '—'}</td>
                    <td>{fmt(c.total)}</td>
                    <td>{c.estado}</td>
                    <td>
                      <button type="button" className="btn btn-xs btn-red" onClick={() => eliminar(c.folio)}>
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
