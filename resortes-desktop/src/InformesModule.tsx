import { useMemo, useState } from 'react'
import type { Cliente, Db } from './appTypes'
import { isoDateToDdMmYyyy } from './dateFormat'

type Props = {
  db: Db
  showToast: (msg: string, type?: 'ok' | 'err' | 'warn') => void
}

type Tab = 'ventas' | 'mecanico' | 'cliente' | 'vehiculo'

function filtraPorCliente<T extends { clienteId: string | null; clienteNombre: string }>(rows: T[], cliente: Cliente) {
  return rows.filter(
    (r) =>
      r.clienteId === cliente.id ||
      (!r.clienteId && r.clienteNombre.trim().toLowerCase() === cliente.nombre.trim().toLowerCase()),
  )
}

function firstDayOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function lastDayOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0)
}

function toIso(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const da = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${da}`
}

function quarterBounds(d: Date) {
  const q = Math.floor(d.getMonth() / 3)
  const start = new Date(d.getFullYear(), q * 3, 1)
  const end = new Date(d.getFullYear(), q * 3 + 3, 0)
  return { start: toIso(start), end: toIso(end) }
}

export function InformesModule({ db, showToast }: Props) {
  const [tab, setTab] = useState<Tab>('ventas')
  const [ventaPeriodo, setVentaPeriodo] = useState<'mes' | 'mesAnt' | 'trim' | 'anio' | 'rango'>('mes')
  const [ventaDesde, setVentaDesde] = useState('')
  const [ventaHasta, setVentaHasta] = useState('')
  const [mecMes, setMecMes] = useState(() => new Date().getMonth() + 1)
  const [mecAnio, setMecAnio] = useState(() => new Date().getFullYear())

  const [qCli, setQCli] = useState('')
  const [qPat, setQPat] = useState('')
  const [selCliente, setSelCliente] = useState<Cliente | null>(null)
  const [vehListo, setVehListo] = useState(false)

  const rangoVentas = useMemo(() => {
    const hoyD = new Date()
    if (ventaPeriodo === 'rango' && ventaDesde && ventaHasta) {
      return { desde: ventaDesde, hasta: ventaHasta }
    }
    if (ventaPeriodo === 'mesAnt') {
      const d = new Date(hoyD.getFullYear(), hoyD.getMonth() - 1, 1)
      return { desde: toIso(firstDayOfMonth(d)), hasta: toIso(lastDayOfMonth(d)) }
    }
    if (ventaPeriodo === 'trim') {
      const { start, end } = quarterBounds(hoyD)
      return { desde: start, hasta: end }
    }
    if (ventaPeriodo === 'anio') {
      const y = hoyD.getFullYear()
      return { desde: `${y}-01-01`, hasta: `${y}-12-31` }
    }
    if (ventaPeriodo === 'mes') {
      return { desde: toIso(firstDayOfMonth(hoyD)), hasta: toIso(hoyD) }
    }
    return { desde: toIso(firstDayOfMonth(hoyD)), hasta: toIso(hoyD) }
  }, [ventaPeriodo, ventaDesde, ventaHasta])

  const ventasPeriodo = useMemo(
    () =>
      db.ventas.filter((v) => {
        const f = v.fecha || ''
        return f >= rangoVentas.desde && f <= rangoVentas.hasta
      }),
    [db.ventas, rangoVentas],
  )

  const statsVentas = useMemo(() => {
    const n = ventasPeriodo.length
    const desc = ventasPeriodo.reduce((s, v) => s + (Number(v.descuento) || 0), 0)
    const ing = ventasPeriodo.reduce((s, v) => s + v.total, 0)
    const otsSet = new Set<string>()
    ventasPeriodo.forEach((v) => {
      if (v.otOrigen) otsSet.add(v.otOrigen)
    })
    return {
      n,
      ing,
      desc,
      ticket: n ? ing / n : 0,
      ots: otsSet.size,
    }
  }, [ventasPeriodo])

  const porFpago = useMemo(() => {
    const m: Record<string, number> = {}
    ventasPeriodo.forEach((v) => {
      const k = v.fpago || 'Otro'
      m[k] = (m[k] || 0) + v.total
    })
    return Object.entries(m).sort((a, b) => b[1] - a[1])
  }, [ventasPeriodo])

  const topClientes = useMemo(() => {
    const m: Record<string, number> = {}
    ventasPeriodo.forEach((v) => {
      const k = v.clienteNombre || '—'
      m[k] = (m[k] || 0) + v.total
    })
    return Object.entries(m)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
  }, [ventasPeriodo])

  const maxFp = Math.max(...porFpago.map(([, v]) => v), 1)

  const ymMec = `${mecAnio}-${String(mecMes).padStart(2, '0')}`
  const ventasMecMes = useMemo(
    () => db.ventas.filter((v) => (v.fecha || '').slice(0, 7) === ymMec),
    [db.ventas, ymMec],
  )

  const porMecanicoRows = useMemo(() => {
    const map: Record<string, { nombre: string; ventas: number; total: number; ots: Set<string> }> = {}
    const add = (nombre: string, folioOt: string | undefined, totalLine: number) => {
      const k = nombre.trim() || '—'
      if (!map[k]) map[k] = { nombre: k, ventas: 0, total: 0, ots: new Set() }
      map[k].ventas++
      map[k].total += totalLine
      if (folioOt) map[k].ots.add(folioOt)
    }
    for (const v of ventasMecMes) {
      let nom = (v.mecanico || '').trim()
      if (!nom && v.otOrigen) {
        const o = db.ordenes.find((x) => x.folio === v.otOrigen)
        if (o) nom = o.mecanico || ''
      }
      add(nom || 'Sin asignar', v.otOrigen, v.total)
    }
    return Object.values(map).sort((a, b) => b.total - a.total)
  }, [ventasMecMes, db.ordenes])

  const clientesMatch = useMemo(() => {
    const s = qCli.trim().toLowerCase()
    if (!s) return []
    return db.clientes.filter(
      (c) =>
        c.nombre.toLowerCase().includes(s) ||
        c.rut.toLowerCase().includes(s) ||
        (c.email || '').toLowerCase().includes(s),
    )
  }, [db.clientes, qCli])

  const verHistorialCliente = () => {
    if (!clientesMatch.length) {
      showToast('No hay clientes que coincidan', 'warn')
      setSelCliente(null)
      return
    }
    const c = selCliente && clientesMatch.some((x) => x.id === selCliente.id) ? selCliente : clientesMatch[0]
    setSelCliente(c)
    showToast(`Historial de ${c.nombre}`)
  }

  const limpiarCliente = () => {
    setQCli('')
    setSelCliente(null)
  }

  const cotCli = useMemo(
    () => (selCliente ? filtraPorCliente(db.cotizaciones, selCliente) : []),
    [db.cotizaciones, selCliente],
  )
  const ordCli = useMemo(
    () => (selCliente ? filtraPorCliente(db.ordenes, selCliente) : []),
    [db.ordenes, selCliente],
  )
  const venCli = useMemo(
    () => (selCliente ? filtraPorCliente(db.ventas, selCliente) : []),
    [db.ventas, selCliente],
  )

  const verHistorialVehiculo = () => {
    const p = qPat.trim().toUpperCase()
    if (!p) {
      showToast('Indica una patente', 'warn')
      setVehListo(false)
      return
    }
    const v = db.vehiculos.find((x) => x.patente.toUpperCase() === p)
    if (!v) {
      showToast('No se encontró ese vehículo', 'warn')
      setVehListo(false)
      return
    }
    setVehListo(true)
    showToast(`Historial patente ${v.patente}`)
  }

  const limpiarVeh = () => {
    setQPat('')
    setVehListo(false)
  }

  const patenteNorm = qPat.trim().toUpperCase()
  const cotVeh = useMemo(() => {
    if (!patenteNorm || !vehListo) return []
    return db.cotizaciones.filter((c) => (c.patente || '').toUpperCase() === patenteNorm)
  }, [db.cotizaciones, patenteNorm, vehListo])
  const ordVeh = useMemo(() => {
    if (!patenteNorm || !vehListo) return []
    return db.ordenes.filter((o) => (o.patente || '').toUpperCase() === patenteNorm)
  }, [db.ordenes, patenteNorm, vehListo])
  const venVeh = useMemo(() => {
    if (!patenteNorm || !vehListo) return []
    return db.ventas.filter((v) => (v.patente || '').toUpperCase() === patenteNorm)
  }, [db.ventas, patenteNorm, vehListo])

  const fmt = (n: number) =>
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Math.round(n))

  return (
    <div className="informes-mod">
      <div className="agenda-html-tabs tabs informes-html-tabs" role="tablist">
        <button type="button" className={tab === 'ventas' ? 'tab active' : 'tab'} onClick={() => setTab('ventas')}>
          📊 Ventas
        </button>
        <button type="button" className={tab === 'mecanico' ? 'tab active' : 'tab'} onClick={() => setTab('mecanico')}>
          👷 Por mecánico
        </button>
        <button type="button" className={tab === 'cliente' ? 'tab active' : 'tab'} onClick={() => setTab('cliente')}>
          📋 Por cliente
        </button>
        <button type="button" className={tab === 'vehiculo' ? 'tab active' : 'tab'} onClick={() => setTab('vehiculo')}>
          🚗 Por vehículo
        </button>
      </div>

      {tab === 'ventas' && (
        <div className="card card-inf">
          <div className="card-title">
            <div className="card-title-left">Ventas por período</div>
          </div>
          <div className="informes-busca-row" style={{ flexWrap: 'wrap', gap: 8 }}>
            <select className="inv-filter-select" value={ventaPeriodo} onChange={(e) => setVentaPeriodo(e.target.value as typeof ventaPeriodo)}>
              <option value="mes">Este mes</option>
              <option value="mesAnt">Mes anterior</option>
              <option value="trim">Trimestre actual</option>
              <option value="anio">Año en curso</option>
              <option value="rango">Rango personalizado</option>
            </select>
            {ventaPeriodo === 'rango' ? (
              <>
                <input type="date" value={ventaDesde} onChange={(e) => setVentaDesde(e.target.value)} />
                <input type="date" value={ventaHasta} onChange={(e) => setVentaHasta(e.target.value)} />
              </>
            ) : (
              <span className="muted" style={{ fontSize: 12, alignSelf: 'center' }}>
                {isoDateToDdMmYyyy(rangoVentas.desde)} — {isoDateToDdMmYyyy(rangoVentas.hasta)}
              </span>
            )}
          </div>
          <div className="informes-grid-3" style={{ marginTop: 14 }}>
            <div className="informes-mini-card">
              <div className="informes-mini-tit">Total ingresos</div>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{fmt(statsVentas.ing)}</div>
            </div>
            <div className="informes-mini-card">
              <div className="informes-mini-tit">Ticket promedio</div>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{fmt(statsVentas.ticket)}</div>
            </div>
            <div className="informes-mini-card">
              <div className="informes-mini-tit">Descuentos</div>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{fmt(statsVentas.desc)}</div>
            </div>
          </div>
          <div className="informes-grid-3" style={{ marginTop: 10 }}>
            <div className="informes-mini-card">
              <div className="informes-mini-tit">Ventas (registros)</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{statsVentas.n}</div>
            </div>
            <div className="informes-mini-card">
              <div className="informes-mini-tit">OTs facturadas (únicas)</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{statsVentas.ots}</div>
            </div>
            <div className="informes-mini-card">
              <div className="informes-mini-tit">Bruto ítems + dto</div>
              <div style={{ fontSize: 14, fontWeight: 600 }} className="muted">
                {fmt(statsVentas.ing + statsVentas.desc)}
              </div>
            </div>
          </div>
          <div className="card-title" style={{ marginTop: 18 }}>
            <div className="card-title-left">Forma de pago</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {porFpago.length ? (
              porFpago.map(([fp, val]) => (
                <div key={fp}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span>{fp}</span>
                    <strong>{fmt(val)}</strong>
                  </div>
                  <div
                    style={{
                      height: 8,
                      borderRadius: 4,
                      background: 'var(--border)',
                      overflow: 'hidden',
                      marginTop: 4,
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.min(100, (val / maxFp) * 100)}%`,
                        height: '100%',
                        background: 'var(--accent)',
                        opacity: 0.85,
                      }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="muted">Sin ventas en el período</p>
            )}
          </div>
          <div className="card-title" style={{ marginTop: 18 }}>
            <div className="card-title-left">Top 10 clientes del período</div>
          </div>
          {topClientes.length ? (
            <ul className="informes-ul">
              {topClientes.map(([nom, tot], i) => (
                <li key={nom}>
                  <strong>{i + 1}.</strong> {nom} — {fmt(tot)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Sin datos</p>
          )}
        </div>
      )}

      {tab === 'mecanico' && (
        <div className="card card-inf">
          <div className="card-title">
            <div className="card-title-left">Ventas por mecánico</div>
          </div>
          <div className="informes-busca-row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <label className="muted" style={{ fontSize: 12, alignSelf: 'center' }}>
              Mes / año
            </label>
            <select className="inv-filter-select" value={mecMes} onChange={(e) => setMecMes(Number(e.target.value))}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <input
              className="input-buscar-clientes"
              style={{ width: 100 }}
              type="number"
              min={2000}
              max={2100}
              value={mecAnio}
              onChange={(e) => setMecAnio(Number(e.target.value))}
            />
          </div>
          <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
            Comisión estimada al 5% sobre el monto facturado del mes (referencial).
          </p>
          {!porMecanicoRows.length ? (
            <p className="muted" style={{ marginTop: 12 }}>
              Sin ventas en {mecMes}/{mecAnio}
            </p>
          ) : (
            <div style={{ overflowX: 'auto', marginTop: 12 }}>
              <table className="rpm-table-lite">
                <thead>
                  <tr>
                    <th>Mecánico</th>
                    <th className="tr">Ventas</th>
                    <th className="tr">OTs únicas</th>
                    <th className="tr">Facturado</th>
                    <th className="tr">Comisión 5%</th>
                  </tr>
                </thead>
                <tbody>
                  {porMecanicoRows.map((r) => (
                    <tr key={r.nombre}>
                      <td>{r.nombre}</td>
                      <td className="tr">{r.ventas}</td>
                      <td className="tr">{r.ots.size}</td>
                      <td className="tr">{fmt(r.total)}</td>
                      <td className="tr">{fmt(r.total * 0.05)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'cliente' && (
        <div className="card card-inf">
          <div className="card-title">
            <div className="card-title-left">Buscar cliente</div>
          </div>
          <div className="field">
            <label>Nombre, RUT o email del cliente</label>
            <div className="informes-busca-row">
              <input
                className="input-buscar-clientes"
                placeholder="Escribe para buscar..."
                value={qCli}
                onChange={(e) => setQCli(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && verHistorialCliente()}
              />
              <button type="button" className="btn btn-primary" onClick={verHistorialCliente}>
                🔍 Ver historial
              </button>
              <button type="button" className="btn btn-outline" onClick={limpiarCliente}>
                ↺ Limpiar
              </button>
            </div>
          </div>
          {clientesMatch.length > 0 && (
            <div className="informes-pick">
              <span className="muted">Coincidencias:</span>
              <div className="informes-chips">
                {clientesMatch.slice(0, 12).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={selCliente?.id === c.id ? 'chip chip-on' : 'chip'}
                    onClick={() => setSelCliente(c)}
                  >
                    {c.nombre}
                  </button>
                ))}
              </div>
            </div>
          )}

          {selCliente && (
            <div className="informes-resultados">
              <h4 className="informes-h4">Cliente: {selCliente.nombre}</h4>
              <div className="informes-grid-3">
                <div className="informes-mini-card">
                  <div className="informes-mini-tit">Cotizaciones ({cotCli.length})</div>
                  {cotCli.length ? (
                    <ul className="informes-ul">
                      {cotCli.map((c) => (
                        <li key={c.folio}>
                          <strong>{c.folio}</strong> · {isoDateToDdMmYyyy(c.fecha)} · {fmt(c.total)} · {c.estado}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="muted">Sin registros</p>
                  )}
                </div>
                <div className="informes-mini-card">
                  <div className="informes-mini-tit">Órdenes ({ordCli.length})</div>
                  {ordCli.length ? (
                    <ul className="informes-ul">
                      {ordCli.map((o) => (
                        <li key={o.folio}>
                          <strong>{o.folio}</strong> · {isoDateToDdMmYyyy(o.fechaIn)} · {fmt(o.total)} · {o.estado}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="muted">Sin registros</p>
                  )}
                </div>
                <div className="informes-mini-card">
                  <div className="informes-mini-tit">Ventas ({venCli.length})</div>
                  {venCli.length ? (
                    <ul className="informes-ul">
                      {venCli.map((v) => (
                        <li key={v.folio}>
                          <strong>{v.folio}</strong> · {isoDateToDdMmYyyy(v.fecha)} · {fmt(v.total)} · {v.fpago}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="muted">Sin registros</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'vehiculo' && (
        <div className="card card-inf">
          <div className="card-title">
            <div className="card-title-left">Buscar vehículo</div>
          </div>
          <div className="field">
            <label>Patente</label>
            <div className="informes-busca-row">
              <input
                className="input-buscar-clientes"
                placeholder="Ej: ABCD12"
                value={qPat}
                onChange={(e) => setQPat(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && verHistorialVehiculo()}
              />
              <button type="button" className="btn btn-primary" onClick={verHistorialVehiculo}>
                🔍 Ver historial
              </button>
              <button type="button" className="btn btn-outline" onClick={limpiarVeh}>
                ↺ Limpiar
              </button>
            </div>
          </div>

          {vehListo && patenteNorm && (
            <div className="informes-resultados">
              <h4 className="informes-h4">Patente: {patenteNorm}</h4>
              <div className="informes-grid-3">
                <div className="informes-mini-card">
                  <div className="informes-mini-tit">Cotizaciones ({cotVeh.length})</div>
                  {cotVeh.length ? (
                    <ul className="informes-ul">
                      {cotVeh.map((c) => (
                        <li key={c.folio}>
                          <strong>{c.folio}</strong> · {isoDateToDdMmYyyy(c.fecha)} · {c.clienteNombre} · {fmt(c.total)}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="muted">Sin registros</p>
                  )}
                </div>
                <div className="informes-mini-card">
                  <div className="informes-mini-tit">Órdenes ({ordVeh.length})</div>
                  {ordVeh.length ? (
                    <ul className="informes-ul">
                      {ordVeh.map((o) => (
                        <li key={o.folio}>
                          <strong>{o.folio}</strong> · {isoDateToDdMmYyyy(o.fechaIn)} · {o.clienteNombre} · {fmt(o.total)}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="muted">Sin registros</p>
                  )}
                </div>
                <div className="informes-mini-card">
                  <div className="informes-mini-tit">Ventas ({venVeh.length})</div>
                  {venVeh.length ? (
                    <ul className="informes-ul">
                      {venVeh.map((v) => (
                        <li key={v.folio}>
                          <strong>{v.folio}</strong> · {isoDateToDdMmYyyy(v.fecha)} · {v.clienteNombre} · {fmt(v.total)}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="muted">Sin registros</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
