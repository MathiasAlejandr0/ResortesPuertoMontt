import { type Dispatch, type SetStateAction, useMemo, useState } from 'react'
import type { Abono, Credito, Db } from './appTypes'

type Props = {
  db: Db
  setDb: Dispatch<SetStateAction<Db>>
  showToast: (msg: string, type?: 'ok' | 'err' | 'warn') => void
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function estadoCredito(cr: Credito): string {
  const hoy = today()
  if (cr.saldo <= 0) return 'Pagado'
  if (cr.saldo < cr.monto) return 'Pagado parcial'
  if (cr.vcto && cr.vcto < hoy) return 'Vencido'
  return 'Pendiente'
}

const ESTADOS_FILTRO = ['Pendiente', 'Pagado parcial', 'Vencido', 'Pagado']

export function CreditosModule({ db, setDb, showToast }: Props) {
  const [cliId, setCliId] = useState('')
  const [monto, setMonto] = useState(0)
  const [fecha, setFecha] = useState(() => today())
  const [vcto, setVcto] = useState('')
  const [desc, setDesc] = useState('')
  const [buscar, setBuscar] = useState('')
  const [estFiltro, setEstFiltro] = useState('')
  const [abonarId, setAbonarId] = useState<string | null>(null)
  const [abonoMonto, setAbonoMonto] = useState(0)

  const stats = useMemo(() => {
    const pendiente = db.creditos.filter((c) => c.estado !== 'Pagado')
    const deudaTotal = pendiente.reduce((s, c) => s + c.saldo, 0)
    const vencidos = db.creditos.filter((c) => c.estado === 'Vencido')
    const sumVenc = vencidos.reduce((s, c) => s + c.saldo, 0)
    const nPagados = db.creditos.filter((c) => c.estado === 'Pagado').length
    let totalCobrado = 0
    for (const c of db.creditos) {
      for (const a of c.abonos) totalCobrado += a.monto
    }
    return {
      deudaTotal,
      nActivos: pendiente.length,
      sumVenc,
      nVenc: vencidos.length,
      nPagados,
      totalCobrado,
    }
  }, [db.creditos])

  const lista = useMemo(() => {
    let rows = [...db.creditos].sort((a, b) => (a.creado < b.creado ? 1 : -1))
    const q = buscar.toLowerCase().trim()
    if (q) {
      rows = rows.filter(
        (c) => c.clienteNombre.toLowerCase().includes(q) || (c.desc || '').toLowerCase().includes(q),
      )
    }
    if (estFiltro) rows = rows.filter((c) => c.estado === estFiltro)
    return rows
  }, [db.creditos, buscar, estFiltro])

  const registrar = () => {
    if (!cliId) {
      showToast('Selecciona un cliente', 'err')
      return
    }
    const m = Number(monto)
    if (!m || m <= 0) {
      showToast('Indica un monto válido', 'err')
      return
    }
    const cli = db.clientes.find((c) => c.id === cliId)
    if (!cli) return
    const nuevo: Credito = {
      id: uid(),
      clienteId: cli.id,
      clienteNombre: cli.nombre,
      clienteRut: cli.rut,
      monto: m,
      saldo: m,
      abonos: [],
      fecha,
      vcto,
      desc: desc.trim(),
      estado: 'Pendiente',
      creado: new Date().toISOString(),
    }
    nuevo.estado = estadoCredito(nuevo)
    setDb((d) => ({ ...d, creditos: [nuevo, ...d.creditos] }))
    showToast('Crédito registrado')
    setCliId('')
    setMonto(0)
    setFecha(today())
    setVcto('')
    setDesc('')
  }

  const limpiar = () => {
    setCliId('')
    setMonto(0)
    setFecha(today())
    setVcto('')
    setDesc('')
  }

  const aplicarAbono = () => {
    if (!abonarId) return
    const amt = Math.max(0, abonoMonto)
    if (!amt) {
      showToast('Indica el monto del abono', 'warn')
      return
    }
    const ab: Abono = { monto: amt, fecha: today(), obs: 'Abono manual', creado: new Date().toISOString() }
    setDb((d) => ({
      ...d,
      creditos: d.creditos.map((c) => {
        if (c.id !== abonarId) return c
        const abonos = [...c.abonos, ab]
        const abonado = abonos.reduce((s, x) => s + x.monto, 0)
        const saldo = Math.max(0, c.monto - abonado)
        const next = { ...c, abonos, saldo }
        return { ...next, estado: estadoCredito(next) }
      }),
    }))
    showToast('Abono registrado')
    setAbonarId(null)
    setAbonoMonto(0)
  }

  const eliminar = (id: string) => {
    if (!window.confirm('¿Eliminar este crédito?')) return
    setDb((d) => ({ ...d, creditos: d.creditos.filter((c) => c.id !== id) }))
    showToast('Crédito eliminado')
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Math.round(n))

  return (
    <>
      <div className="stats stats-creditos">
        <div className="stat">
          <div className="stat-lbl">Deuda total pendiente</div>
          <div className="stat-val">{fmt(stats.deudaTotal)}</div>
          <div className="stat-sub">{stats.nActivos} créditos activos</div>
        </div>
        <div className="stat">
          <div className="stat-lbl">Créditos vencidos</div>
          <div className="stat-val" style={{ color: 'var(--red)' }}>
            {fmt(stats.sumVenc)}
          </div>
          <div className="stat-sub">{stats.nVenc} sin pagar al vencimiento</div>
        </div>
        <div className="stat">
          <div className="stat-lbl">Créditos pagados</div>
          <div className="stat-val" style={{ color: 'var(--green)' }}>
            {stats.nPagados}
          </div>
          <div className="stat-sub">cobros completados</div>
        </div>
        <div className="stat">
          <div className="stat-lbl">Total cobrado</div>
          <div className="stat-val" style={{ color: 'var(--green)' }}>
            {fmt(stats.totalCobrado)}
          </div>
          <div className="stat-sub">en abonos recibidos</div>
        </div>
      </div>

      <div className="card card-cred">
        <div className="card-title card-title-row">
          <div className="card-title-left">Registrar crédito manual</div>
          <span className="cred-hint">
            Los créditos también se generan automáticamente al registrar una venta con forma de pago &quot;Crédito&quot;.
          </span>
        </div>
        <div className="g3">
          <div className="field">
            <label>Cliente *</label>
            <select value={cliId} onChange={(e) => setCliId(e.target.value)}>
              <option value="">— Seleccionar —</option>
              {db.clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Monto ($) *</label>
            <input type="number" min={0} step={1} value={monto || ''} onChange={(e) => setMonto(Number(e.target.value))} />
          </div>
          <div className="field">
            <label>Fecha otorgamiento</label>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
          <div className="field">
            <label>Fecha vencimiento</label>
            <input type="date" value={vcto} onChange={(e) => setVcto(e.target.value)} />
          </div>
          <div className="field field-span-full">
            <label>Descripción / motivo</label>
            <textarea
              rows={3}
              placeholder="Ej: Servicio N° OT-0012, arreglo motor..."
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
          </div>
        </div>
        <div className="form-row-actions">
          <button type="button" className="btn btn-primary btn-guardar" onClick={registrar}>
            ✓ Registrar crédito
          </button>
          <button type="button" className="btn btn-outline" onClick={limpiar}>
            ↺ Limpiar
          </button>
        </div>
      </div>

      <div className="card card-cred">
        <div className="card-title">
          <div className="card-title-left">Cuentas por cobrar</div>
          <span className="card-count">{lista.length} registro{lista.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="inv-filters">
          <input
            className="input-buscar-clientes inv-filter-grow"
            placeholder="Buscar cliente, descripción..."
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
          />
          <select className="inv-filter-select" value={estFiltro} onChange={(e) => setEstFiltro(e.target.value)}>
            <option value="">Todos los estados</option>
            {ESTADOS_FILTRO.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </div>
        {!lista.length ? (
          <div className="empty">
            <div className="empty-icon">💳</div>
            <div>No hay créditos registrados</div>
          </div>
        ) : (
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Monto</th>
                  <th>Saldo</th>
                  <th>Otorg.</th>
                  <th>Vcto.</th>
                  <th>Estado</th>
                  <th>Descripción</th>
                  <th className="th-actions">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((c) => (
                  <tr key={c.id}>
                    <td className="td-nombre">{c.clienteNombre}</td>
                    <td>{fmt(c.monto)}</td>
                    <td>{fmt(c.saldo)}</td>
                    <td>{c.fecha}</td>
                    <td>{c.vcto || '—'}</td>
                    <td>{c.estado}</td>
                    <td className="td-desc">{c.desc || '—'}</td>
                    <td>
                      <div className="row-acts">
                        {c.estado !== 'Pagado' && (
                          <button type="button" className="btn btn-xs" onClick={() => setAbonarId(c.id)}>
                            Abonar
                          </button>
                        )}
                        <button type="button" className="btn btn-xs btn-red" onClick={() => eliminar(c.id)}>
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {abonarId && (
        <div className="modal-backdrop" role="dialog" aria-modal>
          <div className="modal-box">
            <h3 className="modal-h3">Registrar abono</h3>
            <div className="field">
              <label>Monto ($)</label>
              <input type="number" min={0} step={1} value={abonoMonto || ''} onChange={(e) => setAbonoMonto(Number(e.target.value))} autoFocus />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-primary" onClick={aplicarAbono}>
                Aplicar abono
              </button>
              <button type="button" className="btn btn-outline" onClick={() => setAbonarId(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
