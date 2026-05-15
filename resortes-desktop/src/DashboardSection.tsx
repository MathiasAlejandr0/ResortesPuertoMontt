import { useMemo, useState } from 'react'
import type { AppSettings, Db } from './appTypes'
import { isoDateToDdMmYyyy } from './dateFormat'
import { ordenRefsForPersist } from './opsHelpers'
import type { Section } from './sections'

type Props = {
  db: Db
  settings: AppSettings
  setSection: (s: Section) => void
}

const mesesCortos = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function fmt(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Math.round(n))
}

function todayIso() {
  const d = new Date()
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const da = String(d.getDate()).padStart(2, '0')
  return `${y}-${mo}-${da}`
}

/** YYYY-MM según calendario local (evita el bug de `new Date('YYYY-MM-DD')` en UTC). */
function ymTodayLocal() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Desplaza YYYY-MM un número de meses (sin usar Date ISO ni medianoche UTC). */
function ymShift(ym: string, deltaMonths: number): string {
  const [ys, ms] = ym.split('-').map(Number)
  let y = ys
  let m = ms + deltaMonths
  while (m < 1) {
    m += 12
    y -= 1
  }
  while (m > 12) {
    m -= 12
    y += 1
  }
  return `${y}-${String(m).padStart(2, '0')}`
}

function ymFromDateLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function mesTitulo(ym: string) {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, (m || 1) - 1, 1)
  const s = d.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function ultimos6Ventas(ventas: { fecha: string; total: number }[]) {
  const map: Record<string, number> = {}
  ventas.forEach((v) => {
    if (v.fecha) map[v.fecha.slice(0, 7)] = (map[v.fecha.slice(0, 7)] || 0) + v.total
  })
  const res: { label: string; value: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const k = ymFromDateLocal(d)
    res.push({ label: mesesCortos[d.getMonth()], value: map[k] || 0 })
  }
  return res
}

function statusOtClass(estado: string) {
  const m: Record<string, string> = {
    Recibido: 'dash-st-rec',
    'En proceso': 'dash-st-proc',
    Listo: 'dash-st-listo',
    Entregado: 'dash-st-ok',
    Vencido: 'dash-st-venc',
  }
  return m[estado] || 'dash-st-def'
}

function addDaysIso(iso: string, deltaDays: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, (m || 1) - 1, d || 1)
  dt.setDate(dt.getDate() + deltaDays)
  const mo = String(dt.getMonth() + 1).padStart(2, '0')
  const da = String(dt.getDate()).padStart(2, '0')
  return `${dt.getFullYear()}-${mo}-${da}`
}

export function DashboardSection({ db, settings, setSection }: Props) {
  const [dashYm, setDashYm] = useState(() => ymTodayLocal())

  const mesActual = ymTodayLocal()
  const esMesActual = dashYm === mesActual

  const dashVentasMes = useMemo(
    () => db.ventas.filter((v) => (v.fecha || '').slice(0, 7) === dashYm),
    [db.ventas, dashYm],
  )
  const dashOtsMes = useMemo(
    () => db.ordenes.filter((o) => (o.fechaIn || '').slice(0, 7) === dashYm),
    [db.ordenes, dashYm],
  )
  const dashCotsMes = useMemo(
    () => db.cotizaciones.filter((c) => (c.fecha || '').slice(0, 7) === dashYm),
    [db.cotizaciones, dashYm],
  )
  const gasMes = useMemo(
    () => db.gastos.filter((g) => (g.fecha || '').slice(0, 7) === dashYm).reduce((s, g) => s + g.monto, 0),
    [db.gastos, dashYm],
  )

  const ingMes = dashVentasMes.reduce((s, v) => s + v.total, 0)
  const utilMes = ingMes - gasMes
  const ingTotal = db.ventas.reduce((s, v) => s + v.total, 0)
  const gasTotal = db.gastos.reduce((s, g) => s + g.monto, 0)

  const porCobrar = db.creditos.filter((c) => c.estado !== 'Pagado').reduce((s, c) => s + c.saldo, 0)
  const credActivos = db.creditos.filter((c) => c.estado !== 'Pagado').length
  const hoy = todayIso()

  const ing6 = useMemo(() => ultimos6Ventas(db.ventas), [db.ventas])
  const maxBar = Math.max(...ing6.map((x) => x.value), 1)

  const activas = useMemo(
    () =>
      [...db.ordenes.filter((o) => o.estado !== 'Entregado')].sort((a, b) =>
        (a.fechaEst || '').localeCompare(b.fechaEst || ''),
      ),
    [db.ordenes],
  )

  /** Ranking por OT cerradas al cliente: solo estado Entregado, mismo mes que filtro (fecha de ingreso). */
  const topMecMes = useMemo(() => {
    const mecMap: Record<string, { nombre: string; ots: number; total: number; enGrupo: number }> = {}
    const otsCompletadasMes = dashOtsMes.filter((o) => o.estado === 'Entregado')
    for (const o of otsCompletadasMes) {
      const refs = ordenRefsForPersist(o)
      const mecIds = refs.length ? refs : []
      if (!mecIds.length) continue
      const nMec = mecIds.length
      for (const m of mecIds) {
        const key = m.id || m.nombre
        if (!mecMap[key]) mecMap[key] = { nombre: m.nombre, ots: 0, total: 0, enGrupo: 0 }
        mecMap[key].ots++
        mecMap[key].total += (o.total || 0) / nMec
        if (nMec > 1) mecMap[key].enGrupo++
      }
    }
    return Object.entries(mecMap)
      .sort((a, b) => b[1].ots - a[1].ots || b[1].total - a[1].total)
      .slice(0, 8)
  }, [dashOtsMes])

  const stockBajo = useMemo(
    () =>
      db.inventario.filter(
        (p) =>
          p.categoria !== 'Mano de obra' && (p.stock === 0 || (p.smin > 0 && p.stock <= p.smin)),
      ),
    [db.inventario],
  )

  const cajaHoy = useMemo(() => {
    const ventasHoy = db.ventas.filter((v) => v.fecha === hoy)
    const totalHoy = ventasHoy.reduce((s, v) => s + v.total, 0)
    const gasHoy = db.gastos.filter((g) => g.fecha === hoy).reduce((s, g) => s + g.monto, 0)
    const porFp: Record<string, number> = {}
    ventasHoy.forEach((v) => {
      const fp = v.fpago || 'Contado'
      porFp[fp] = (porFp[fp] || 0) + v.total
    })
    return { ventasHoy, totalHoy, gasHoy, porFp, nGas: db.gastos.filter((g) => g.fecha === hoy).length }
  }, [db.ventas, db.gastos, hoy])

  /** Igual que “Balance del día” en la tarjeta Caja del día (ventas registradas hoy − gastos hoy). */
  const gananciasDelDia = cajaHoy.totalHoy - cajaHoy.gasHoy

  const alertasMes = useMemo(() => {
    if (!esMesActual) return [] as { key: string; label: string; onClick: () => void }[]
    const finSemana = addDaysIso(hoy, 7)
    const limiteOt = addDaysIso(hoy, -3)
    const out: { key: string; label: string; onClick: () => void }[] = []
    const otsQuiet = db.ordenes.filter((o) => o.estado !== 'Entregado' && o.fechaIn && o.fechaIn <= limiteOt)
    if (otsQuiet.length) {
      out.push({
        key: 'ot-quiet',
        label: `OTs activas con 3+ días desde el ingreso (${otsQuiet.length})`,
        onClick: () => {
          try {
            sessionStorage.setItem('rpm-global-filter', otsQuiet[0]?.folio || '')
          } catch {
            /* ignore */
          }
          setSection('ordenes')
        },
      })
    }
    const cheques = db.creditos.filter(
      (c) =>
        c.tipo === 'cheque' &&
        c.chequeFechaCobro &&
        c.chequeFechaCobro >= hoy &&
        c.chequeFechaCobro <= finSemana &&
        c.estado !== 'Pagado' &&
        c.saldo > 0,
    )
    if (cheques.length) {
      out.push({
        key: 'cheq',
        label: `Cheques a cobrar esta semana (${cheques.length})`,
        onClick: () => setSection('creditos'),
      })
    }
    const pedidos = settings.extras.pedidosFabricacion ?? []
    const pedListos = pedidos.filter((p) => p.estado === 'Listo para retiro')
    if (pedListos.length) {
      out.push({
        key: 'pf',
        label: `Pedidos listos para retiro sin marcar retirado (${pedListos.length})`,
        onClick: () => {
          try {
            sessionStorage.setItem('rpm-global-filter', pedListos[0]?.folio || '')
          } catch {
            /* ignore */
          }
          setSection('pedidosFabricacion')
        },
      })
    }
    const credVen = db.creditos.filter((c) => c.saldo > 0 && c.vcto && c.vcto < hoy && c.estado !== 'Pagado')
    if (credVen.length) {
      out.push({
        key: 'cred',
        label: `Créditos vencidos con saldo (${credVen.length})`,
        onClick: () => setSection('creditos'),
      })
    }
    return out
  }, [esMesActual, hoy, db.ordenes, db.creditos, settings.extras.pedidosFabricacion, setSection])

  const dashMesAnterior = () => setDashYm(ymShift(dashYm, -1))
  const dashMesSiguiente = () => {
    const next = ymShift(dashYm, 1)
    if (next > mesActual) return
    setDashYm(next)
  }

  const med = new Date()
  const cajaFechaLbl = med.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <>
      <div className="dash-month-bar no-print">
        <button type="button" className="btn btn-sm" onClick={dashMesAnterior}>
          ← Anterior
        </button>
        <div className="dash-month-title">{mesTitulo(dashYm)}</div>
        <button type="button" className="btn btn-sm" onClick={dashMesSiguiente} disabled={esMesActual}>
          Siguiente →
        </button>
        {!esMesActual && (
          <button type="button" className="btn btn-sm btn-primary" onClick={() => setDashYm(mesActual)}>
            Mes actual
          </button>
        )}
      </div>

      {alertasMes.length > 0 ? (
        <div className="dash-alerts no-print">
          <div className="dash-alerts-title">Alertas</div>
          <div className="dash-alert-list">
            {alertasMes.map((a) => (
              <button key={a.key} type="button" className="dash-alert-link" onClick={a.onClick}>
                {a.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="stats" style={{ marginBottom: 14 }}>
        <div className="stat">
          <div className="stat-lbl">Ingresos</div>
          <div className="stat-val">{fmt(ingMes)}</div>
          <div className="stat-sub">
            {dashVentasMes.length} venta{dashVentasMes.length !== 1 ? 's' : ''}
          </div>
        </div>
        <div className="stat">
          <div className="stat-lbl">Gastos</div>
          <div className="stat-val" style={{ color: 'var(--red)' }}>
            {fmt(gasMes)}
          </div>
          <div className="stat-sub">egresos del mes</div>
        </div>
        <div className="stat">
          <div className="stat-lbl">Utilidad</div>
          <div className="stat-val" style={{ color: utilMes >= 0 ? 'var(--green)' : 'var(--red)' }}>
            {fmt(utilMes)}
          </div>
          <div className="stat-sub">ingresos − gastos</div>
        </div>
        <div className="stat">
          <div className="stat-lbl">Órdenes</div>
          <div className="stat-val">{dashOtsMes.length}</div>
          <div className="stat-sub">{dashOtsMes.filter((o) => o.estado === 'Entregado').length} entregadas</div>
        </div>
        <div className="stat">
          <div className="stat-lbl">Cotizaciones</div>
          <div className="stat-val">{dashCotsMes.length}</div>
          <div className="stat-sub">
            {dashCotsMes.filter((c) => c.estado === 'Aceptada' || c.estado === 'Convertida').length} aceptadas
          </div>
        </div>
        {esMesActual && (
          <>
            <button type="button" className="stat stat-click" onClick={() => setSection('creditos')}>
              <div className="stat-lbl">Por cobrar</div>
              <div className="stat-val" style={{ color: 'var(--red)' }}>
                {fmt(porCobrar)}
              </div>
              <div className="stat-sub">{credActivos} activos</div>
            </button>
            <div className="stat">
              <div className="stat-lbl">Acum. histórico</div>
              <div className="stat-val">{fmt(ingTotal - gasTotal)}</div>
              <div className="stat-sub">utilidad total</div>
            </div>
            <div className="stat">
              <div className="stat-lbl">Ganancias del día</div>
              <div className="stat-val" style={{ color: gananciasDelDia >= 0 ? 'var(--green)' : 'var(--red)' }}>
                {fmt(gananciasDelDia)}
              </div>
              <div className="stat-sub">ingresos − gastos · hoy</div>
            </div>
          </>
        )}
      </div>

      <div className="dash-grid-2">
        <div className="card">
          <div className="card-title">
            <div className="card-title-left">Ingresos últimos 6 meses</div>
          </div>
          <div className="chart-bars">
            {ing6.map((d) => (
              <div key={d.label} className="chart-bar-wrap">
                <div className="chart-val">{d.value ? fmt(d.value) : ''}</div>
                <div className="chart-bar" style={{ height: `${Math.round((d.value / maxBar) * 160) || 2}px` }} />
                <div className="chart-lbl">{d.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-title">
            <div className="card-title-left">Caja del día</div>
            <span style={{ fontSize: 11, color: 'var(--text2)' }}>{cajaFechaLbl}</span>
          </div>
          {!cajaHoy.totalHoy && !cajaHoy.gasHoy ? (
            <div className="empty" style={{ padding: '20px 0' }}>
              Sin movimientos hoy
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                <div style={{ background: 'rgba(26,107,58,0.12)', borderRadius: 8, padding: 10, textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--green)', fontWeight: 600 }}>Ingresos</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--green)' }}>{fmt(cajaHoy.totalHoy)}</div>
                  <div style={{ fontSize: 10, color: 'var(--text2)' }}>
                    {cajaHoy.ventasHoy.length} venta{cajaHoy.ventasHoy.length !== 1 ? 's' : ''}
                  </div>
                </div>
                <div style={{ background: 'rgba(196,30,30,0.08)', borderRadius: 8, padding: 10, textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--red)', fontWeight: 600 }}>Gastos</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--red)' }}>{fmt(cajaHoy.gasHoy)}</div>
                  <div style={{ fontSize: 10, color: 'var(--text2)' }}>
                    {cajaHoy.nGas} gasto{cajaHoy.nGas !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
              {Object.entries(cajaHoy.porFp).map(([fp, monto]) => (
                <div
                  key={fp}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '5px 0',
                    borderBottom: '1px solid var(--border)',
                    fontSize: 12,
                  }}
                >
                  <span>{fp}</span>
                  <strong>{fmt(monto)}</strong>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, fontWeight: 700, fontSize: 12 }}>
                <span>Balance del día</span>
                <span style={{ color: cajaHoy.totalHoy - cajaHoy.gasHoy >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {fmt(cajaHoy.totalHoy - cajaHoy.gasHoy)}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="dash-grid-3">
        <div className="card">
          <div className="card-title">
            <div className="card-title-left">Ventas del mes</div>
            <span style={{ fontSize: 11, color: 'var(--text2)' }}>
              {dashVentasMes.length} venta{dashVentasMes.length !== 1 ? 's' : ''}
            </span>
          </div>
          {!dashVentasMes.length ? (
            <div className="empty" style={{ padding: 12 }}>
              Sin ventas este mes
            </div>
          ) : (
            <>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)', marginBottom: 8 }}>{fmt(ingMes)}</div>
              {Object.entries(
                dashVentasMes.reduce<Record<string, number>>((acc, v) => {
                  const fp = v.fpago || 'Contado'
                  acc[fp] = (acc[fp] || 0) + v.total
                  return acc
                }, {}),
              ).map(([fp, monto]) => (
                <div
                  key={fp}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 11,
                    padding: '4px 0',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <span style={{ color: 'var(--text2)' }}>{fp}</span>
                  <strong>{fmt(monto)}</strong>
                </div>
              ))}
              <div style={{ marginTop: 8 }}>
                {dashVentasMes.slice(0, 4).map((v) => (
                  <div
                    key={v.folio}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 11,
                      padding: '3px 0',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    <span className="td-mono">{v.folio}</span>
                    <span style={{ flex: 1, margin: '0 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {v.clienteNombre}
                    </span>
                    <strong>{fmt(v.total)}</strong>
                  </div>
                ))}
              </div>
              {dashVentasMes.length > 4 && (
                <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 6 }} onClick={() => setSection('ventas')}>
                  Ver las {dashVentasMes.length - 4} restantes →
                </button>
              )}
            </>
          )}
        </div>

        <div className="card">
          <div className="card-title">
            <div className="card-title-left">Órdenes del mes</div>
            <span style={{ fontSize: 11, color: 'var(--text2)' }}>
              {dashOtsMes.length} orden{dashOtsMes.length !== 1 ? 'es' : ''}
            </span>
          </div>
          {!dashOtsMes.length ? (
            <div className="empty" style={{ padding: 12 }}>
              Sin órdenes este mes
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                {Object.entries(
                  dashOtsMes.reduce<Record<string, number>>((acc, o) => {
                    acc[o.estado] = (acc[o.estado] || 0) + 1
                    return acc
                  }, {}),
                ).map(([est, n]) => (
                  <span key={est} style={{ background: 'var(--surface2)', borderRadius: 6, padding: '4px 10px', fontSize: 11 }}>
                    {est}: <strong>{n}</strong>
                  </span>
                ))}
              </div>
              {dashOtsMes.slice(0, 4).map((o) => (
                <div
                  key={o.folio}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 11,
                    padding: '3px 0',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <span className="td-mono">{o.folio}</span>
                  <span style={{ flex: 1, margin: '0 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {o.clienteNombre}
                  </span>
                  <span className={`dash-est ${statusOtClass(o.estado)}`}>{o.estado}</span>
                </div>
              ))}
              {dashOtsMes.length > 4 && (
                <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 6 }} onClick={() => setSection('ordenes')}>
                  Ver todas →
                </button>
              )}
            </>
          )}
        </div>

        <div className="card">
          <div className="card-title">
            <div className="card-title-left">Cotizaciones del mes</div>
            <span style={{ fontSize: 11, color: 'var(--text2)' }}>
              {dashCotsMes.length} cotización{dashCotsMes.length !== 1 ? 'es' : ''}
            </span>
          </div>
          {!dashCotsMes.length ? (
            <div className="empty" style={{ padding: 12 }}>
              Sin cotizaciones este mes
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
                <div style={{ background: 'rgba(106,90,160,0.12)', borderRadius: 8, padding: '6px 10px', textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: '#5a4a8a', fontWeight: 600 }}>Monto total</div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{fmt(dashCotsMes.reduce((s, c) => s + c.total, 0))}</div>
                </div>
                <div style={{ background: 'rgba(26,107,58,0.12)', borderRadius: 8, padding: '6px 10px', textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--green)', fontWeight: 600 }}>Tasa aceptación</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>
                    {dashCotsMes.length > 0
                      ? Math.round(
                          (dashCotsMes.filter((c) => c.estado === 'Aceptada' || c.estado === 'Convertida').length /
                            dashCotsMes.length) *
                            100,
                        )
                      : 0}
                    %
                  </div>
                </div>
              </div>
              {dashCotsMes.slice(0, 4).map((c) => (
                <div
                  key={c.folio}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 11,
                    padding: '3px 0',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <span className="td-mono">{c.folio}</span>
                  <span style={{ flex: 1, margin: '0 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.clienteNombre}
                  </span>
                  <span>{c.estado}</span>
                </div>
              ))}
              {dashCotsMes.length > 4 && (
                <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 6 }} onClick={() => setSection('cotizaciones')}>
                  Ver todas →
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="dash-grid-3">
        <div className="card">
          <div className="card-title">
            <div className="card-title-left">Órdenes activas</div>
            <button type="button" className="btn btn-xs btn-orange no-print" onClick={() => setSection('ordenes')}>
              Ver todas
            </button>
          </div>
          {!activas.length ? (
            <div className="empty">
              <div className="empty-icon">✅</div>No hay órdenes activas
            </div>
          ) : (
            <div className="tw">
              <table>
                <thead>
                  <tr>
                    <th>Orden</th>
                    <th>Cliente</th>
                    <th>Estado</th>
                    <th>Entrega</th>
                  </tr>
                </thead>
                <tbody>
                  {activas.slice(0, 8).map((o) => {
                    const venc = Boolean(o.fechaEst && o.fechaEst < hoy && o.estado !== 'Listo')
                    const lbl = venc ? 'Vencido' : o.estado
                    return (
                      <tr key={o.folio}>
                        <td className="td-mono">{o.folio}</td>
                        <td>
                          <strong>{o.clienteNombre}</strong>
                          {o.patente ? (
                            <span style={{ marginLeft: 6, fontSize: 10, padding: '2px 6px', borderRadius: 6, background: 'var(--surface2)' }}>
                              {o.patente}
                            </span>
                          ) : null}
                        </td>
                        <td>
                          <span className={venc ? 'dash-est dash-st-venc' : `dash-est ${statusOtClass(o.estado)}`}>{lbl}</span>
                        </td>
                        <td style={venc ? { color: 'var(--red)', fontWeight: 600 } : { fontSize: 12 }}>
                          {o.fechaEst ? isoDateToDdMmYyyy(o.fechaEst) : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-title">
            <div className="card-title-left">Top mecánicos del mes</div>
          </div>
          <div style={{ fontSize: 10, color: 'var(--text3)', margin: '-6px 0 10px', lineHeight: 1.35 }}>
            Por órdenes <strong>Entregadas</strong> con fecha de ingreso en {mesTitulo(dashYm)}.
            Sin mecánico asignado no suman al ranking.
          </div>
          {!topMecMes.length ? (
            <div className="empty" style={{ padding: 12 }}>
              Sin OT entregadas con mecánico este mes
            </div>
          ) : (
            topMecMes.map(([key, d], i) => (
              <div
                key={key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 0',
                  borderBottom: '1px solid var(--border)',
                  fontSize: 12,
                }}
              >
                <span style={{ width: 22, textAlign: 'center' }}>{['🥇', '🥈', '🥉'][i] || '·'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>{d.nombre}</div>
                  {d.enGrupo > 0 ? (
                    <div style={{ fontSize: 10, color: 'var(--text3)' }}>
                      {d.enGrupo} en equipo · {d.ots - d.enGrupo} solo
                    </div>
                  ) : null}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: 'var(--text2)' }}>
                    {d.ots} OT{d.ots !== 1 ? 's' : ''}
                  </div>
                  <div style={{ fontWeight: 700 }}>{fmt(Math.round(d.total))}</div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="card">
          <div className="card-title">
            <div className="card-title-left">Stock bajo</div>
          </div>
          {!stockBajo.length ? (
            <div className="empty" style={{ padding: 16 }}>
              <div className="empty-icon">✅</div>Todo el stock está OK
            </div>
          ) : (
            stockBajo.slice(0, 10).map((p) => (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '7px 0',
                  borderBottom: '1px solid var(--border)',
                  fontSize: 12,
                }}
              >
                <span>{p.nombre}</span>
                <span style={{ fontWeight: 600, color: p.stock === 0 ? 'var(--red)' : '#b8860b' }}>
                  {p.stock} {p.unidad}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}
