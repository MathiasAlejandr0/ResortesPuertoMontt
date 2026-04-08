import { useMemo } from 'react'
import type { Db } from './appTypes'

type Props = {
  db: Db
}

const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function fmt(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Math.round(n))
}

function ultimos6MesesVentas(ventas: { fecha: string; total: number }[]) {
  const map: Record<string, number> = {}
  ventas.forEach((v) => {
    if (v.fecha) map[v.fecha.slice(0, 7)] = (map[v.fecha.slice(0, 7)] || 0) + v.total
  })
  const res: { label: string; value: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const k = d.toISOString().slice(0, 7)
    res.push({ label: meses[d.getMonth()], value: map[k] || 0 })
  }
  return res
}

function ultimos6MesesGastos(gastos: { fecha: string; monto: number }[]) {
  const map: Record<string, number> = {}
  for (const g of gastos) {
    if (g.fecha) map[g.fecha.slice(0, 7)] = (map[g.fecha.slice(0, 7)] || 0) + g.monto
  }
  const res: { label: string; value: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const k = d.toISOString().slice(0, 7)
    res.push({ label: meses[d.getMonth()], value: map[k] || 0 })
  }
  return res
}

export function ReportesModule({ db }: Props) {
  const ingTotal = useMemo(() => db.ventas.reduce((s, v) => s + v.total, 0), [db.ventas])
  const gasTotal = useMemo(() => db.gastos.reduce((s, g) => s + g.monto, 0), [db.gastos])
  const utilidad = ingTotal - gasTotal
  const margen = ingTotal > 0 ? (utilidad / ingTotal) * 100 : 0

  const ing6 = useMemo(() => ultimos6MesesVentas(db.ventas), [db.ventas])
  const gas6 = useMemo(() => ultimos6MesesGastos(db.gastos), [db.gastos])
  const maxBar = Math.max(...ing6.map((x) => x.value), ...gas6.map((x) => x.value), 1)

  const util6 = useMemo(() => ing6.map((x, i) => ({ label: x.label, value: x.value - (gas6[i]?.value || 0) })), [ing6, gas6])
  const maxUtil = Math.max(...util6.map((x) => Math.abs(x.value)), 1)

  const topProductos = useMemo(() => {
    const map: Record<string, number> = {}
    for (const v of db.ventas) {
      for (const it of v.items) {
        const k = it.nombre.trim() || 'Sin nombre'
        map[k] = (map[k] || 0) + it.sub
      }
    }
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
  }, [db.ventas])

  const topClientes = useMemo(() => {
    const map: Record<string, number> = {}
    for (const v of db.ventas) {
      const k = v.clienteNombre.trim() || 'Sin nombre'
      map[k] = (map[k] || 0) + 1
    }
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
  }, [db.ventas])

  return (
    <>
      <div className="stats stats-reportes">
        <div className="stat">
          <div className="stat-lbl">Ingresos totales</div>
          <div className="stat-val">{fmt(ingTotal)}</div>
        </div>
        <div className="stat">
          <div className="stat-lbl">Gastos totales</div>
          <div className="stat-val" style={{ color: 'var(--red)' }}>
            {fmt(gasTotal)}
          </div>
        </div>
        <div className="stat">
          <div className="stat-lbl">Utilidad neta</div>
          <div className="stat-val" style={{ color: utilidad >= 0 ? 'var(--green)' : 'var(--red)' }}>
            {fmt(utilidad)}
          </div>
        </div>
        <div className="stat">
          <div className="stat-lbl">Margen neto</div>
          <div className="stat-val" style={{ color: margen >= 0 ? 'var(--green)' : 'var(--red)' }}>
            {margen.toFixed(1)}%
          </div>
        </div>
      </div>

      <div className="grid-2 reportes-grid">
        <div className="card card-rep">
          <div className="card-title">
            <div className="card-title-left">Ingresos mensuales</div>
          </div>
          <div className="chart-bars chart-bars-tall">
            {ing6.map((d) => (
              <div key={d.label} className="chart-bar-wrap">
                <div className="chart-val">{d.value ? fmt(d.value) : ''}</div>
                <div className="chart-bar chart-bar-green" style={{ height: `${Math.round((d.value / maxBar) * 160) || 2}px` }} />
                <div className="chart-lbl">{d.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="card card-rep">
          <div className="card-title">
            <div className="card-title-left">Top productos más vendidos</div>
          </div>
          {topProductos.length ? (
            <ul className="rep-lista">
              {topProductos.map(([nombre, sub]) => (
                <li key={nombre}>
                  <span>{nombre}</span>
                  <strong>{fmt(sub)}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty empty-sm">Sin datos</div>
          )}
        </div>
        <div className="card card-rep">
          <div className="card-title">
            <div className="card-title-left">Utilidad por mes (ingresos − gastos)</div>
          </div>
          <div className="chart-bars chart-bars-tall">
            {util6.map((d) => (
              <div key={d.label} className="chart-bar-wrap">
                <div className="chart-val">{d.value ? fmt(d.value) : ''}</div>
                <div
                  className="chart-bar"
                  style={{
                    height: `${Math.round((Math.abs(d.value) / maxUtil) * 160) || 2}px`,
                    background: d.value >= 0 ? 'var(--green)' : 'var(--red)',
                  }}
                />
                <div className="chart-lbl">{d.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="card card-rep">
          <div className="card-title">
            <div className="card-title-left">Clientes más frecuentes</div>
          </div>
          {topClientes.length ? (
            <ul className="rep-lista">
              {topClientes.map(([nombre, n]) => (
                <li key={nombre}>
                  <span>{nombre}</span>
                  <strong>{n} venta{n !== 1 ? 's' : ''}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty empty-sm">Sin datos</div>
          )}
        </div>
      </div>
    </>
  )
}
