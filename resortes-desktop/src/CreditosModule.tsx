import { type Dispatch, type SetStateAction, useCallback, useMemo, useState } from 'react'
import type { Abono, Credito, Db } from './appTypes'
import { isoDateToDdMmYyyy } from './dateFormat'

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
  if (cr.tipo === 'cheque') {
    const hoy = today()
    if (cr.chequeEstado === 'Rechazado') return 'Rechazado'
    if (cr.chequeEstado === 'Cobrado' || cr.saldo <= 0) return 'Cobrado'
    const fc = (cr.chequeFechaCobro || cr.vcto || '').slice(0, 10)
    if (fc && fc > hoy) return 'Pendiente'
    return 'Al cobro'
  }
  const hoy = today()
  if (cr.saldo <= 0) return 'Pagado'
  if (cr.saldo < cr.monto) return 'Pagado parcial'
  if (cr.vcto && cr.vcto < hoy) return 'Vencido'
  return 'Pendiente'
}

function fmt(n: number) {
  return '$' + Number(n || 0).toLocaleString('es-CL')
}

type CredNorm = Credito & { _estado: string }

function normalizeCredito(c: Credito): CredNorm {
  return { ...c, _estado: estadoCredito(c) }
}

type CredTab = 'pendiente' | 'pagado'

export function CreditosModule({ db, setDb, showToast }: Props) {
  const [cliId, setCliId] = useState('')
  const [monto, setMonto] = useState(0)
  const [fecha, setFecha] = useState(() => today())
  const [vcto, setVcto] = useState('')
  const [desc, setDesc] = useState('')
  const [buscar, setBuscar] = useState('')
  const [credTab, setCredTab] = useState<CredTab>('pendiente')
  const [abonarId, setAbonarId] = useState<string | null>(null)
  const [abonoMonto, setAbonoMonto] = useState(0)
  const [expandedCli, setExpandedCli] = useState<Set<string>>(() => new Set())
  const [expandedCr, setExpandedCr] = useState<Set<string>>(() => new Set())

  const listaNorm = useMemo(() => db.creditos.map(normalizeCredito), [db.creditos])

  const hoy = today()
  const en5 = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + 5)
    return d.toISOString().slice(0, 10)
  }, [])

  const stats = useMemo(() => {
    const pendiente = listaNorm.filter((c) => c.tipo !== 'cheque' && c._estado !== 'Pagado')
    const totalDeuda = pendiente.reduce((s, c) => s + c.saldo, 0)
    const clavesCli = new Set(pendiente.map((c) => String(c.clienteId || c.clienteNombre)))
    const vencidos = listaNorm.filter((c) => c.tipo !== 'cheque' && c._estado === 'Vencido')
    const sumVenc = vencidos.reduce((s, c) => s + c.saldo, 0)
    const proxVencer = listaNorm.filter(
      (c) => c.tipo !== 'cheque' && c._estado !== 'Pagado' && c.vcto && c.vcto > hoy && c.vcto <= en5,
    )
    const totalCobrado = listaNorm.reduce((s, c) => s + (c.monto - c.saldo), 0)
    return {
      totalDeuda,
      nCliDeuda: clavesCli.size,
      nVenc: vencidos.length,
      sumVenc,
      proxVencer,
      totalCobrado,
      nPend: pendiente.length,
    }
  }, [listaNorm, hoy, en5])

  const toggleCli = useCallback((key: string) => {
    setExpandedCli((prev) => {
      const n = new Set(prev)
      if (n.has(key)) n.delete(key)
      else n.add(key)
      return n
    })
  }, [])

  const toggleCr = useCallback((id: string) => {
    setExpandedCr((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }, [])

  const pendientesFiltrados = useMemo(() => {
    const activos = listaNorm.filter((c) => c.tipo !== 'cheque' && c._estado !== 'Pagado')
    const q = buscar.toLowerCase().trim()
    if (!q) return activos
    return activos.filter((c) => c.clienteNombre.toLowerCase().includes(q) || (c.desc || '').toLowerCase().includes(q))
  }, [listaNorm, buscar])

  type GrupoCli = {
    key: string
    nombre: string
    rut: string
    cuentas: CredNorm[]
    totalSaldo: number
    tieneVencido: boolean
    tieneProx: boolean
    masAntigua: string
  }

  const gruposCliente = useMemo(() => {
    const porCliente: Record<string, GrupoCli> = {}
    for (const cr of pendientesFiltrados) {
      const key = String(cr.clienteId || cr.clienteNombre)
      if (!porCliente[key]) {
        porCliente[key] = {
          key,
          nombre: cr.clienteNombre,
          rut: cr.clienteRut || '',
          cuentas: [],
          totalSaldo: 0,
          tieneVencido: false,
          tieneProx: false,
          masAntigua: '',
        }
      }
      porCliente[key].cuentas.push(cr)
    }
    const vals = Object.values(porCliente)
    for (const cli of vals) {
      cli.cuentas.sort((a, b) => ((a.vcto || '9999') > (b.vcto || '9999') ? 1 : -1))
      cli.totalSaldo = cli.cuentas.reduce((s, c) => s + c.saldo, 0)
      cli.tieneVencido = cli.cuentas.some((c) => c._estado === 'Vencido')
      cli.tieneProx = cli.cuentas.some((c) => c.vcto && c.vcto > hoy && c.vcto <= en5)
      cli.masAntigua = cli.cuentas[0]?.vcto || ''
    }
    vals.sort((a, b) => {
      if (a.tieneVencido && !b.tieneVencido) return -1
      if (!a.tieneVencido && b.tieneVencido) return 1
      return (a.masAntigua || '9999') > (b.masAntigua || '9999') ? 1 : -1
    })
    return vals
  }, [pendientesFiltrados, hoy, en5])

  const pagadosLista = useMemo(() => {
    const pagados = listaNorm.filter((c) => (c.tipo === 'cheque' ? c._estado === 'Cobrado' : c._estado === 'Pagado'))
    const q = buscar.toLowerCase().trim()
    let rows = q ? pagados.filter((c) => c.clienteNombre.toLowerCase().includes(q)) : pagados
    rows = [...rows].sort((a, b) => (b.fecha > a.fecha ? 1 : -1))
    return rows
  }, [listaNorm, buscar])

  const chequesPendientes = useMemo(() => {
    const q = buscar.toLowerCase().trim()
    let rows = listaNorm.filter((c) => c.tipo === 'cheque' && c._estado !== 'Cobrado')
    if (q) rows = rows.filter((c) => c.clienteNombre.toLowerCase().includes(q) || (c.desc || '').toLowerCase().includes(q))
    rows = [...rows].sort((a, b) => ((a.chequeFechaCobro || a.vcto || '9999-12-31') > (b.chequeFechaCobro || b.vcto || '9999-12-31') ? 1 : -1))
    return rows
  }, [listaNorm, buscar])

  const actualizarEstadoCheque = (id: string, estado: 'Pendiente' | 'Al cobro' | 'Cobrado' | 'Rechazado') => {
    setDb((d) => ({
      ...d,
      creditos: d.creditos.map((c) => {
        if (c.id !== id || c.tipo !== 'cheque') return c
        if (estado === 'Cobrado') {
          const restante = Math.max(0, c.saldo)
          const abonos = restante
            ? [...c.abonos, { monto: restante, fecha: today(), obs: 'Cheque cobrado', creado: new Date().toISOString() }]
            : c.abonos
          return { ...c, chequeEstado: 'Cobrado', saldo: 0, abonos, estado: 'Pagado' }
        }
        return { ...c, chequeEstado: estado, estado: estado === 'Rechazado' ? 'Rechazado' : 'Pendiente' }
      }),
    }))
    showToast(`Cheque marcado como ${estado}`)
  }

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
      tipo: 'credito',
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

  const marcarPagado = (id: string) => {
    const cr = db.creditos.find((x) => x.id === id)
    if (!cr) return
    const saldo = cr.saldo
    if (
      !window.confirm(`¿Marcar como PAGADA la cuenta de ${cr.clienteNombre} por ${fmt(saldo)} de saldo restante?`)
    )
      return
    setDb((d) => ({
      ...d,
      creditos: d.creditos.map((c) => {
        if (c.id !== id) return c
        const abonos = [...c.abonos]
        if (c.saldo > 0) {
          abonos.push({
            monto: c.saldo,
            fecha: today(),
            obs: 'Marcado como pagado manualmente',
            creado: new Date().toISOString(),
          })
        }
        const next = { ...c, abonos, saldo: 0, estado: 'Pagado' as const }
        return next
      }),
    }))
    showToast(`Cuenta de ${cr.clienteNombre} marcada como pagada`)
  }

  const eliminar = (id: string) => {
    if (!window.confirm('¿Eliminar este registro de crédito?')) return
    setDb((d) => ({ ...d, creditos: d.creditos.filter((c) => c.id !== id) }))
    showToast('Crédito eliminado')
  }

  return (
    <>
      <div className="stats stats-creditos cred-stats-html">
        <div className="stat">
          <div className="stat-lbl">Deuda total pendiente</div>
          <div className="stat-val cred-deuda-total">{fmt(stats.totalDeuda)}</div>
          <div className="stat-sub">{stats.nPend} cuenta{stats.nPend !== 1 ? 's' : ''} activas</div>
        </div>
        <div className="stat">
          <div className="stat-lbl">Clientes con deuda</div>
          <div className="stat-val cred-cli-ambar">{stats.nCliDeuda}</div>
          <div className="stat-sub">clientes únicos</div>
        </div>
        <div className="stat">
          <div className="stat-lbl">Vencidos</div>
          <div className="stat-val cred-deuda-total">{stats.nVenc}</div>
          <div className="stat-sub">{fmt(stats.sumVenc)}</div>
        </div>
        {stats.proxVencer.length ? (
          <div className="stat cred-stat-prox">
            <div className="stat-lbl cred-lbl-prox">Vencen pronto</div>
            <div className="stat-val cred-val-prox">{stats.proxVencer.length}</div>
            <div className="stat-sub">próximos 5 días</div>
          </div>
        ) : null}
        <div className="stat">
          <div className="stat-lbl">Total cobrado</div>
          <div className="stat-val" style={{ color: 'var(--green)' }}>
            {fmt(stats.totalCobrado)}
          </div>
          <div className="stat-sub">en abonos</div>
        </div>
      </div>

      <div className="card card-cred">
        <div className="card-title card-title-row">
          <div className="card-title-left">Registrar crédito manual</div>
          <span className="cred-hint">Los créditos también se generan al vender con forma de pago &quot;Crédito&quot;.</span>
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
              rows={2}
              placeholder="Ej: Servicio N° OT-0012, arreglo motor..."
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
          </div>
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

      <div className="cred-tabs-bar agenda-html-tabs tabs">
        <button
          type="button"
          className={credTab === 'pendiente' ? 'tab active' : 'tab'}
          onClick={() => setCredTab('pendiente')}
        >
          ⏳ Cuentas por cobrar
        </button>
        <button type="button" className={credTab === 'pagado' ? 'tab active' : 'tab'} onClick={() => setCredTab('pagado')}>
          ✅ Pagados / Cancelados
        </button>
      </div>

      <div className="card card-cred cred-panel-card">
        <div className="inv-filters" style={{ marginBottom: 12 }}>
          <input
            className="input-buscar-clientes inv-filter-grow"
            placeholder="Buscar cliente, descripción..."
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
          />
        </div>

        {credTab === 'pendiente' ? (
          !gruposCliente.length && !chequesPendientes.length ? (
            <div className="empty">
              <div className="empty-icon">✅</div>
              <div>Sin cuentas por cobrar pendientes</div>
            </div>
          ) : (
            <div className="cred-grupos">
              {chequesPendientes.length ? (
                <div className="cred-cli-card cred-cheques-card" style={{ borderLeftColor: '#1a5a5a' }}>
                  <div className="cred-cli-hdr cred-cheques-hdr">
                    <div className="cred-cli-title-row">
                      <span className="cred-cli-name">🏦 Cheques por cobrar</span>
                      <span className="cred-chip cred-chip-prox">{chequesPendientes.length}</span>
                    </div>
                    <div className="cred-cli-sub">Ordenados por fecha de cobro</div>
                  </div>
                  <div className="cred-cli-body">
                    {chequesPendientes.map((cr, cri) => (
                      <div key={cr.id} className={`cred-row ${cri % 2 === 0 ? 'cred-row-a' : 'cred-row-b'} cred-cheque-row`}>
                        <div className="cred-row-sum cred-row-sum-static">
                          <div className="cred-row-left">
                            <span
                              className={`cred-estado ${
                                cr._estado === 'Rechazado' ? 'cred-est-venc' : cr._estado === 'Al cobro' ? 'cred-est-parc' : 'cred-est-pend'
                              }`}
                            >
                              {cr._estado}
                            </span>
                            {cr.ventaFolio ? <span className="folio-tag">🏦 {cr.ventaFolio}</span> : null}
                            <span className="cred-desc">
                              {cr.clienteNombre} · N° {cr.chequeNumero || '—'} · {cr.chequeBanco || '—'}
                            </span>
                            <span className="cred-vcto-pill">{isoDateToDdMmYyyy(cr.chequeFechaCobro || cr.vcto)}</span>
                          </div>
                          <div className="cred-row-actions">
                            <div className="cred-saldo-box">
                              <div className="cred-saldo-line">
                                Saldo: <strong className="cred-saldo-strong">{fmt(cr.saldo)}</strong>
                              </div>
                            </div>
                            <button type="button" className="btn btn-xs btn-teal" onClick={() => actualizarEstadoCheque(cr.id, 'Al cobro')}>
                              Al cobro
                            </button>
                            <button type="button" className="btn btn-xs btn-green" onClick={() => actualizarEstadoCheque(cr.id, 'Cobrado')}>
                              Cobrado
                            </button>
                            <button type="button" className="btn btn-xs btn-red" onClick={() => actualizarEstadoCheque(cr.id, 'Rechazado')}>
                              Rechazado
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {gruposCliente.map((cli) => {
                const bc = cli.tieneVencido ? 'var(--red)' : cli.tieneProx ? 'var(--amber)' : 'var(--accent)'
                const open = expandedCli.has(cli.key)
                return (
                  <div key={cli.key} className="cred-cli-card" style={{ borderLeftColor: bc }}>
                    <div className="cred-cli-hdr" role="presentation" onClick={() => toggleCli(cli.key)}>
                      <div>
                        <div className="cred-cli-title-row">
                          <span className="cred-cli-name">👤 {cli.nombre}</span>
                          {cli.rut ? <span className="cred-cli-rut">{cli.rut}</span> : null}
                          {cli.tieneVencido ? <span className="cred-chip cred-chip-venc">VENCIDO</span> : null}
                          {!cli.tieneVencido && cli.tieneProx ? (
                            <span className="cred-chip cred-chip-prox">Vence pronto</span>
                          ) : null}
                        </div>
                        <div className="cred-cli-sub">
                          {cli.cuentas.length} cuenta{cli.cuentas.length !== 1 ? 's' : ''} pendiente
                          {cli.cuentas.length !== 1 ? 's' : ''} · clic para ver
                        </div>
                      </div>
                      <div className="cred-cli-hdr-right">
                        <div>
                          <div className="cred-total-lbl">Total adeudado</div>
                          <div className="cred-total-val">{fmt(cli.totalSaldo)}</div>
                        </div>
                        <span className="cred-chevron">{open ? '▴' : '▾'}</span>
                      </div>
                    </div>
                    {open ? (
                      <div className="cred-cli-body">
                        {cli.cuentas.map((cr, cri) => {
                          const venc = Boolean(cr.vcto && cr.vcto < hoy && cr._estado !== 'Pagado')
                          const proxA = Boolean(cr.vcto && cr.vcto > hoy && cr.vcto <= en5)
                          const dias =
                            cr.vcto && cr.vcto >= hoy ? Math.ceil((new Date(cr.vcto).getTime() - new Date(hoy).getTime()) / 86400000) : null
                          const pct = cr.monto > 0 ? Math.round(((cr.monto - cr.saldo) / cr.monto) * 100) : 0
                          const detOpen = expandedCr.has(cr.id)
                          const estadoLbl = venc ? 'Vencido' : cr._estado
                          return (
                            <div key={cr.id} className={`cred-row ${cri % 2 === 0 ? 'cred-row-a' : 'cred-row-b'}`}>
                              <div className="cred-row-sum" role="presentation" onClick={() => toggleCr(cr.id)}>
                                <div className="cred-row-left">
                                  <span className={`cred-estado ${venc ? 'cred-est-venc' : cr._estado === 'Pagado parcial' ? 'cred-est-parc' : 'cred-est-pend'}`}>
                                    {estadoLbl}
                                  </span>
                                  {cr.ventaFolio ? <span className="folio-tag">{cr.ventaFolio}</span> : null}
                                  <span className="cred-desc">{cr.desc || 'Sin descripción'}</span>
                                  {cr.vcto ? (
                                    <span
                                      className={`cred-vcto-pill ${venc ? 'cred-vpill-venc' : proxA ? 'cred-vpill-prox' : ''}`}
                                    >
                                      {isoDateToDdMmYyyy(cr.vcto)}
                                      {venc ? ' · Vencido' : dias !== null && dias <= 5 ? ` · ${dias}d` : ''}
                                    </span>
                                  ) : null}
                                </div>
                                <div className="cred-row-actions">
                                  <div className="cred-saldo-box">
                                    <div className="cred-saldo-line">
                                      Saldo:{' '}
                                      <strong className="cred-saldo-strong">{fmt(cr.saldo)}</strong> /{' '}
                                      <span style={{ fontSize: 10 }}>{fmt(cr.monto)}</span>
                                    </div>
                                    <div className="cred-pct-track">
                                      <div
                                        className="cred-pct-fill"
                                        style={{
                                          width: `${pct}%`,
                                          background: pct >= 100 ? 'var(--green)' : 'var(--accent2, var(--accent))',
                                        }}
                                      />
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    className="btn btn-xs btn-teal"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setAbonarId(cr.id)
                                    }}
                                  >
                                    Abono
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-xs btn-green"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      marcarPagado(cr.id)
                                    }}
                                  >
                                    Pagada
                                  </button>
                                </div>
                              </div>
                              {detOpen ? (
                                <div className="cred-detalle">
                                  <div className="cred-det-meta">
                                    {cr.desc || '—'} · Otorgado: {isoDateToDdMmYyyy(cr.fecha)} · Vence:{' '}
                                    {isoDateToDdMmYyyy(cr.vcto)}
                                  </div>
                                  {cr.abonos.length ? (
                                    <div className="tw" style={{ marginBottom: 10 }}>
                                      <table>
                                        <thead>
                                          <tr>
                                            <th>Fecha</th>
                                            <th>Observación</th>
                                            <th className="tr">Monto</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {cr.abonos.map((a, i) => (
                                            <tr key={i}>
                                              <td>{isoDateToDdMmYyyy(a.fecha)}</td>
                                              <td>{a.obs || '—'}</td>
                                              <td className="tr td-mono" style={{ fontWeight: 600, color: 'var(--green)' }}>
                                                {fmt(a.monto)}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  ) : (
                                    <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 10 }}>Sin abonos</div>
                                  )}
                                  <div className="row-acts cred-det-acts">
                                    <button type="button" className="btn btn-xs btn-green" onClick={() => setAbonarId(cr.id)}>
                                      Registrar abono
                                    </button>
                                    <button type="button" className="btn btn-xs btn-green" onClick={() => marcarPagado(cr.id)}>
                                      Marcar pagada
                                    </button>
                                    <button type="button" className="btn btn-xs btn-red" onClick={() => eliminar(cr.id)}>
                                      Eliminar
                                    </button>
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          )
                        })}
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          )
        ) : !pagadosLista.length ? (
          <div className="empty">
            <div className="empty-icon">✅</div>
            <div>Sin cuentas pagadas/canceladas</div>
          </div>
        ) : (
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Descripción</th>
                  <th>Otorgado</th>
                  <th>Vencimiento</th>
                  <th className="tr">Monto</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {pagadosLista.map((cr) => (
                  <tr key={cr.id} style={{ opacity: 0.88 }}>
                    <td style={{ fontWeight: 500 }}>
                      {cr.clienteNombre}
                      <br />
                      <span style={{ fontSize: 10, color: 'var(--text2)' }}>{cr.clienteRut || ''}</span>
                    </td>
                    <td style={{ fontSize: 11 }}>
                      {cr.tipo === 'cheque' ? '🏦 ' : ''}{cr.desc || '—'}{' '}
                      {cr.ventaFolio ? (
                        <span className="folio-tag" style={{ fontSize: 9 }}>
                          {cr.ventaFolio}
                        </span>
                      ) : null}
                    </td>
                    <td style={{ fontSize: 11 }}>{isoDateToDdMmYyyy(cr.fecha)}</td>
                    <td style={{ fontSize: 11 }}>{isoDateToDdMmYyyy(cr.vcto)}</td>
                    <td className="tr td-mono" style={{ fontWeight: 600, color: 'var(--green)' }}>
                      {fmt(cr.monto)}
                    </td>
                    <td>
                      <button type="button" className="btn btn-xs btn-red" onClick={() => eliminar(cr.id)}>
                        🗑
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {abonarId ? (
        <div className="modal-backdrop" role="dialog" aria-modal>
          <div className="modal-box">
            <h3 className="modal-h3">Registrar abono</h3>
            <div className="field">
              <label>Monto ($)</label>
              <input
                type="number"
                min={0}
                step={1}
                value={abonoMonto || ''}
                onChange={(e) => setAbonoMonto(Number(e.target.value))}
                autoFocus
              />
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
      ) : null}
    </>
  )
}
