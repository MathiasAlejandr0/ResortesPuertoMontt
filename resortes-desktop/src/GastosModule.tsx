import { type Dispatch, type SetStateAction, useMemo, useState } from 'react'
import type { Db, Gasto } from './appTypes'

type Props = {
  db: Db
  setDb: Dispatch<SetStateAction<Db>>
  showToast: (msg: string, type?: 'ok' | 'err' | 'warn') => void
}

const CATEGORIAS_GASTO = ['Arriendo', 'Servicios básicos', 'Herramientas', 'Repuestos', 'Marketing', 'Otros']

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

export function GastosModule({ db, setDb, showToast }: Props) {
  const [desc, setDesc] = useState('')
  const [cat, setCat] = useState('Arriendo')
  const [monto, setMonto] = useState(0)
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10))
  const [prov, setProv] = useState('')
  const [buscar, setBuscar] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')

  const lista = useMemo(() => {
    let rows = [...db.gastos].sort((a, b) => (a.creado < b.creado ? 1 : -1))
    const q = buscar.toLowerCase().trim()
    if (q) {
      rows = rows.filter(
        (g) =>
          g.desc.toLowerCase().includes(q) ||
          g.categoria.toLowerCase().includes(q) ||
          (g.proveedor || '').toLowerCase().includes(q),
      )
    }
    if (desde) rows = rows.filter((g) => !g.fecha || g.fecha >= desde)
    if (hasta) rows = rows.filter((g) => !g.fecha || g.fecha <= hasta)
    return rows
  }, [db.gastos, buscar, desde, hasta])

  const registrar = () => {
    const d = desc.trim()
    if (!d) {
      showToast('La descripción es obligatoria', 'err')
      return
    }
    const m = Number(monto)
    if (!m || m <= 0) {
      showToast('Indica un monto válido', 'err')
      return
    }
    const nuevo: Gasto = {
      id: uid(),
      desc: d,
      categoria: cat,
      monto: m,
      fecha,
      proveedor: prov.trim(),
      creado: new Date().toISOString(),
    }
    setDb((x) => ({ ...x, gastos: [nuevo, ...x.gastos] }))
    showToast('Gasto registrado')
    setDesc('')
    setCat('Arriendo')
    setMonto(0)
    setFecha(new Date().toISOString().slice(0, 10))
    setProv('')
  }

  const limpiar = () => {
    setDesc('')
    setCat('Arriendo')
    setMonto(0)
    setFecha(new Date().toISOString().slice(0, 10))
    setProv('')
  }

  const eliminar = (id: string) => {
    if (!window.confirm('¿Eliminar este gasto?')) return
    setDb((x) => ({ ...x, gastos: x.gastos.filter((g) => g.id !== id) }))
    showToast('Gasto eliminado')
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Math.round(n))

  return (
    <>
      <div className="card card-gasto">
        <div className="card-title">
          <div className="card-title-left">Registrar gasto</div>
        </div>
        <div className="g3 form-gastos">
          <div className="field">
            <label>Descripción *</label>
            <input placeholder="Alquiler, herramientas, luz..." value={desc} onChange={(e) => setDesc(e.target.value)} />
          </div>
          <div className="field">
            <label>Categoría</label>
            <select value={cat} onChange={(e) => setCat(e.target.value)}>
              {CATEGORIAS_GASTO.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Monto ($) *</label>
            <input type="number" min={0} step={1} value={monto || ''} onChange={(e) => setMonto(Number(e.target.value))} />
          </div>
          <div className="field">
            <label>Fecha</label>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
          <div className="field field-span-full">
            <label>Proveedor / descripción extra</label>
            <input placeholder="Opcional" value={prov} onChange={(e) => setProv(e.target.value)} />
          </div>
        </div>
        <div className="form-row-actions">
          <button type="button" className="btn btn-primary btn-guardar" onClick={registrar}>
            ✓ Registrar gasto
          </button>
          <button type="button" className="btn btn-outline" onClick={limpiar}>
            ↺ Limpiar
          </button>
        </div>
      </div>

      <div className="card card-gasto">
        <div className="card-title">
          <div className="card-title-left">Registro de gastos</div>
          <span className="card-count">{lista.length} gasto{lista.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="inv-filters">
          <input
            className="input-buscar-clientes inv-filter-grow"
            placeholder="Buscar descripción, categoría..."
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
          />
          <input type="date" className="inv-filter-select inv-date" value={desde} onChange={(e) => setDesde(e.target.value)} />
          <input type="date" className="inv-filter-select inv-date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </div>
        {!lista.length ? (
          <div className="empty">
            <div className="empty-icon">💵</div>
            <div>No hay gastos registrados</div>
          </div>
        ) : (
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Descripción</th>
                  <th>Categoría</th>
                  <th>Monto</th>
                  <th>Proveedor</th>
                  <th className="th-actions">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((g) => (
                  <tr key={g.id}>
                    <td>{g.fecha}</td>
                    <td className="td-nombre">{g.desc}</td>
                    <td>{g.categoria}</td>
                    <td>{fmt(g.monto)}</td>
                    <td>{g.proveedor || '—'}</td>
                    <td>
                      <button type="button" className="btn btn-xs btn-red" onClick={() => eliminar(g.id)}>
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
