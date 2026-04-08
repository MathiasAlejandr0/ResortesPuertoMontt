import { type Dispatch, type SetStateAction, useMemo, useState } from 'react'
import type { Db, LineItem, Orden } from './appTypes'
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

const ESTADOS_OT = ['Recibido', 'En proceso', 'Esperando repuestos', 'Listo para entrega', 'Entregado']

export function OrdenesModule({ db, setDb, showToast }: Props) {
  const [clienteNom, setClienteNom] = useState('')
  const [vehId, setVehId] = useState('')
  const [mecId, setMecId] = useState('')
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

  const previewFolio = useMemo(() => nextFolio('OT', db), [db])

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
          (o.mecanico || '').toLowerCase().includes(q),
      )
    }
    if (estFiltro) rows = rows.filter((o) => o.estado === estFiltro)
    return rows
  }, [db.ordenes, buscar, estFiltro])

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
    const mec = mecId ? db.mecanicos.find((m) => m.id === mecId) : null
    const total = totalLineItems(items)
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
      mecanicoId: mec?.id ?? '',
      mecanico: mec?.nombre ?? '',
      km,
      diag: diag.trim(),
      obs: obs.trim(),
      items,
      total,
      estado: estadoOt,
      creado: new Date().toISOString(),
    }
    setDb((d) => ({ ...d, ordenes: [o, ...d.ordenes] }))
    showToast('Orden guardada')
    setClienteNom('')
    setVehId('')
    setMecId('')
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
    setMecId('')
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
    showToast('Orden eliminada')
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Math.round(n))

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
          <div className="field">
            <label>Mecánico asignado</label>
            <select value={mecId} onChange={(e) => setMecId(e.target.value)}>
              <option value="">— Seleccionar —</option>
              {mecanicosActivos.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </select>
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
            placeholder="Buscar N° orden, cliente, patente, mecánico..."
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
          </select>
        </div>
        {!lista.length ? (
          <div className="empty">
            <div className="empty-icon">🔧</div>
            <div>No hay órdenes</div>
          </div>
        ) : (
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>OT</th>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Patente</th>
                  <th>Mecánico</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th className="th-actions">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((o) => (
                  <tr key={o.folio}>
                    <td className="td-mono">{o.folio}</td>
                    <td>{o.fechaIn}</td>
                    <td>{o.clienteNombre}</td>
                    <td>{o.patente}</td>
                    <td>{o.mecanico || '—'}</td>
                    <td>{fmt(o.total)}</td>
                    <td>{o.estado}</td>
                    <td>
                      <button type="button" className="btn btn-xs btn-red" onClick={() => eliminar(o.folio)}>
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
