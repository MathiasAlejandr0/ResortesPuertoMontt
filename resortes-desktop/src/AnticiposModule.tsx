import { type Dispatch, type SetStateAction, useMemo, useState } from 'react'
import type { AnticipoRegistro, Db } from './appTypes'

type Props = {
  db: Db
  setDb: Dispatch<SetStateAction<Db>>
  showToast: (msg: string, type?: 'ok' | 'err' | 'warn') => void
}

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const TIPOS = ['Anticipo de sueldo', 'Préstamo', 'Descuento']

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

type Tab = 'nuevo' | 'resumen' | 'historial' | 'semana'

export function AnticiposModule({ db, setDb, showToast }: Props) {
  const [tab, setTab] = useState<Tab>('nuevo')
  const [trabId, setTrabId] = useState('')
  const [tipo, setTipo] = useState(TIPOS[0])
  const [monto, setMonto] = useState(0)
  const [fecha, setFecha] = useState(() => today())
  const [mesIdx, setMesIdx] = useState(() => new Date().getMonth())
  const [anio, setAnio] = useState(() => new Date().getFullYear())
  const [desc, setDesc] = useState('')

  const stats = useMemo(() => {
    const activos = db.anticipos.filter((a) => a.estado === 'Activo')
    const saldoPend = activos.reduce((s, a) => s + a.monto, 0)
    const now = new Date()
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const esteMes = db.anticipos.filter((a) => a.fecha && a.fecha.slice(0, 7) === ym)
    const totalMes = esteMes.reduce((s, a) => s + a.monto, 0)
    const totalHist = db.anticipos.reduce((s, a) => s + a.monto, 0)
    const nPagados = db.anticipos.filter((a) => a.estado === 'Pagado').length
    return { saldoPend, nActivos: activos.length, totalMes, nMes: esteMes.length, totalHist, nPagados }
  }, [db.anticipos])

  const resumenMensual = useMemo(() => {
    const map: Record<string, number> = {}
    for (const a of db.anticipos) {
      const k = `${a.anioDescuento}-${String(a.mesDescuento + 1).padStart(2, '0')}`
      map[k] = (map[k] || 0) + a.monto
    }
    return Object.entries(map)
      .sort((x, y) => y[0].localeCompare(x[0]))
      .slice(0, 24)
  }, [db.anticipos])

  const historial = useMemo(
    () => [...db.anticipos].sort((a, b) => (a.creado < b.creado ? 1 : -1)),
    [db.anticipos],
  )

  const hace7 = useMemo(() => {
    const t = Date.now() - 7 * 24 * 60 * 60 * 1000
    return db.anticipos.filter((a) => new Date(a.fecha).getTime() >= t)
  }, [db.anticipos])

  const registrar = () => {
    if (!trabId) {
      showToast('Selecciona un trabajador', 'err')
      return
    }
    const m = Number(monto)
    if (!m || m <= 0) {
      showToast('Indica un monto válido', 'err')
      return
    }
    const mec = db.mecanicos.find((x) => x.id === trabId)
    if (!mec) return
    const nuevo: AnticipoRegistro = {
      id: uid(),
      trabajadorId: mec.id,
      trabajadorNombre: mec.nombre,
      tipo,
      monto: m,
      fecha,
      mesDescuento: mesIdx,
      anioDescuento: anio,
      desc: desc.trim(),
      estado: 'Activo',
      creado: new Date().toISOString(),
    }
    setDb((d) => ({ ...d, anticipos: [nuevo, ...d.anticipos] }))
    showToast('Registro guardado')
    setTrabId('')
    setTipo(TIPOS[0])
    setMonto(0)
    setFecha(today())
    setMesIdx(new Date().getMonth())
    setAnio(new Date().getFullYear())
    setDesc('')
  }

  const limpiar = () => {
    setTrabId('')
    setTipo(TIPOS[0])
    setMonto(0)
    setFecha(today())
    setMesIdx(new Date().getMonth())
    setAnio(new Date().getFullYear())
    setDesc('')
  }

  const marcarPagado = (id: string) => {
    setDb((d) => ({
      ...d,
      anticipos: d.anticipos.map((a) => (a.id === id ? { ...a, estado: 'Pagado' as const } : a)),
    }))
    showToast('Marcado como pagado')
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Math.round(n))

  const aniosOpts = [anio - 1, anio, anio + 1]

  return (
    <>
      <div className="stats stats-anticipos">
        <div className="stat">
          <div className="stat-lbl">Saldo pendiente total</div>
          <div className="stat-val">{fmt(stats.saldoPend)}</div>
          <div className="stat-sub">{stats.nActivos} registros activos</div>
        </div>
        <div className="stat">
          <div className="stat-lbl">Total ABR (este mes)</div>
          <div className="stat-val">{fmt(stats.totalMes)}</div>
          <div className="stat-sub">{stats.nMes} movimientos</div>
        </div>
        <div className="stat">
          <div className="stat-lbl">Total otorgado hist.</div>
          <div className="stat-val">{fmt(stats.totalHist)}</div>
          <div className="stat-sub">acumulado</div>
        </div>
        <div className="stat">
          <div className="stat-lbl">Registros pagados</div>
          <div className="stat-val" style={{ color: 'var(--green)' }}>
            {stats.nPagados}
          </div>
          <div className="stat-sub">completados</div>
        </div>
      </div>

      <div className="inv-tabs anticipos-tabs">
        <button type="button" className={tab === 'nuevo' ? 'inv-tab active' : 'inv-tab'} onClick={() => setTab('nuevo')}>
          + Nuevo registro
        </button>
        <button type="button" className={tab === 'resumen' ? 'inv-tab active' : 'inv-tab'} onClick={() => setTab('resumen')}>
          Resumen mensual
        </button>
        <button type="button" className={tab === 'historial' ? 'inv-tab active' : 'inv-tab'} onClick={() => setTab('historial')}>
          Historial
        </button>
        <button type="button" className={tab === 'semana' ? 'inv-tab active' : 'inv-tab'} onClick={() => setTab('semana')}>
          Comprobante semanal
        </button>
      </div>

      {tab === 'nuevo' && (
        <div className="card card-ant">
          <div className="card-title">
            <div className="card-title-left">Registrar anticipo, préstamo o descuento</div>
          </div>
          <div className="g4-ot-row1">
            <div className="field">
              <label>Trabajador *</label>
              <select value={trabId} onChange={(e) => setTrabId(e.target.value)}>
                <option value="">— Seleccionar —</option>
                {db.mecanicos.filter((m) => m.activo).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Tipo</label>
              <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
                {TIPOS.map((t) => (
                  <option key={t} value={t}>
                    {t}
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
          </div>
          <div className="g2-desc g-ant-mes">
            <div className="field">
              <label>Mes que descuenta</label>
              <select value={mesIdx} onChange={(e) => setMesIdx(Number(e.target.value))}>
                {MESES.map((m, i) => (
                  <option key={m} value={i}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Año</label>
              <select value={anio} onChange={(e) => setAnio(Number(e.target.value))}>
                {aniosOpts.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="field field-full">
            <label>Descripción / motivo</label>
            <textarea
              rows={3}
              placeholder="Ej: Anticipo quincena, préstamo para emergencia..."
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
          </div>
          <div className="form-row-actions">
            <button type="button" className="btn btn-primary btn-guardar" onClick={registrar}>
              ✓ Registrar
            </button>
            <button type="button" className="btn btn-outline" onClick={limpiar}>
              ↺ Limpiar
            </button>
          </div>
        </div>
      )}

      {tab === 'resumen' && (
        <div className="card card-ant">
          <div className="card-title">
            <div className="card-title-left">Resumen por mes (descuento)</div>
          </div>
          {!resumenMensual.length ? (
            <div className="empty empty-sm">Sin datos</div>
          ) : (
            <div className="tw">
              <table>
                <thead>
                  <tr>
                    <th>Período</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {resumenMensual.map(([per, tot]) => (
                    <tr key={per}>
                      <td>{per}</td>
                      <td>{fmt(tot)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'historial' && (
        <div className="card card-ant">
          <div className="card-title">
            <div className="card-title-left">Historial completo</div>
          </div>
          {!historial.length ? (
            <div className="empty empty-sm">Sin registros</div>
          ) : (
            <div className="tw">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Trabajador</th>
                    <th>Tipo</th>
                    <th>Monto</th>
                    <th>Mes desc.</th>
                    <th>Estado</th>
                    <th className="th-actions">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {historial.map((a) => (
                    <tr key={a.id}>
                      <td>{a.fecha}</td>
                      <td>{a.trabajadorNombre}</td>
                      <td>{a.tipo}</td>
                      <td>{fmt(a.monto)}</td>
                      <td>
                        {MESES[a.mesDescuento]} {a.anioDescuento}
                      </td>
                      <td>{a.estado}</td>
                      <td>
                        {a.estado === 'Activo' && (
                          <button type="button" className="btn btn-xs" onClick={() => marcarPagado(a.id)}>
                            Pagado
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'semana' && (
        <div className="card card-ant">
          <div className="card-title">
            <div className="card-title-left">Movimientos últimos 7 días</div>
          </div>
          {!hace7.length ? (
            <div className="empty empty-sm">Sin movimientos esta semana</div>
          ) : (
            <div className="tw">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Trabajador</th>
                    <th>Tipo</th>
                    <th>Monto</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {hace7.map((a) => (
                    <tr key={a.id}>
                      <td>{a.fecha}</td>
                      <td>{a.trabajadorNombre}</td>
                      <td>{a.tipo}</td>
                      <td>{fmt(a.monto)}</td>
                      <td>{a.estado}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </>
  )
}
