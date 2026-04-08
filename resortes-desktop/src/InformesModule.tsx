import { useMemo, useState } from 'react'
import type { Cliente, Db } from './appTypes'

type Props = {
  db: Db
  showToast: (msg: string, type?: 'ok' | 'err' | 'warn') => void
}

type Tab = 'cliente' | 'vehiculo'

function filtraPorCliente<T extends { clienteId: string | null; clienteNombre: string }>(rows: T[], cliente: Cliente) {
  return rows.filter(
    (r) =>
      r.clienteId === cliente.id ||
      (!r.clienteId && r.clienteNombre.trim().toLowerCase() === cliente.nombre.trim().toLowerCase()),
  )
}

export function InformesModule({ db, showToast }: Props) {
  const [tab, setTab] = useState<Tab>('cliente')
  const [qCli, setQCli] = useState('')
  const [qPat, setQPat] = useState('')
  const [selCliente, setSelCliente] = useState<Cliente | null>(null)
  const [vehListo, setVehListo] = useState(false)

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
      <div className="inv-tabs informes-tabs" role="tablist">
        <button
          type="button"
          className={tab === 'cliente' ? 'inv-tab active' : 'inv-tab'}
          onClick={() => setTab('cliente')}
        >
          Historial por cliente
        </button>
        <button
          type="button"
          className={tab === 'vehiculo' ? 'inv-tab active' : 'inv-tab'}
          onClick={() => setTab('vehiculo')}
        >
          Historial por vehículo
        </button>
      </div>

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
                          <strong>{c.folio}</strong> · {c.fecha} · {fmt(c.total)} · {c.estado}
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
                          <strong>{o.folio}</strong> · {o.fechaIn} · {fmt(o.total)} · {o.estado}
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
                          <strong>{v.folio}</strong> · {v.fecha} · {fmt(v.total)} · {v.fpago}
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
                          <strong>{c.folio}</strong> · {c.fecha} · {c.clienteNombre} · {fmt(c.total)}
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
                          <strong>{o.folio}</strong> · {o.fechaIn} · {o.clienteNombre} · {fmt(o.total)}
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
                          <strong>{v.folio}</strong> · {v.fecha} · {v.clienteNombre} · {fmt(v.total)}
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
