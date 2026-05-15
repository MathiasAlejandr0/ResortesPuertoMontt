import { type Dispatch, type SetStateAction, useLayoutEffect, useMemo, useState } from 'react'
import type { AnticipoRegistro, AppSettings, CreditoMec, CreditoMecCuota, Db } from './appTypes'
import { AnticiposComprobanteTab } from './AnticiposComprobanteTab'
import { LiquidacionTrabajadores } from './LiquidacionTrabajadores'
import { takeAnticiposNav, type AnticiposTab } from './anticiposNav'
import { isoDateToDdMmYyyy } from './dateFormat'
import { mecanicoEnNomina } from './opsHelpers'
import { anticipoDescuentaLiquidacion, getComisionFinal } from './remuneracionesHelpers'

type Tab = AnticiposTab

export type { AnticiposJumpTarget } from './anticiposNav'

type Props = {
  db: Db
  setDb: Dispatch<SetStateAction<Db>>
  settings: AppSettings
  setSettings: Dispatch<SetStateAction<AppSettings>>
  showToast: (msg: string, type?: 'ok' | 'err' | 'warn') => void
}

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const MESES_LARGOS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]
const TIPOS = ['Anticipo de sueldo', 'Préstamo', 'Descuento']

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function buildCuotasPlan(ncuotas: number, montoTotal: number): CreditoMecCuota[] {
  const n = Math.max(1, Math.floor(ncuotas))
  const base = Math.floor(montoTotal / n)
  const plan: CreditoMecCuota[] = []
  const start = new Date()
  for (let i = 0; i < n; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1)
    const monto = i === n - 1 ? montoTotal - base * (n - 1) : base
    plan.push({
      mes: MESES[d.getMonth()],
      anio: d.getFullYear(),
      fecha: '',
      monto,
      pagado: false,
      fechaPago: null,
    })
  }
  return plan
}

export function AnticiposModule({ db, setDb, settings, setSettings, showToast }: Props) {
  const [tab, setTab] = useState<Tab>('resumen')
  const [trabId, setTrabId] = useState('')
  const [tipo, setTipo] = useState(TIPOS[0])
  const [monto, setMonto] = useState(0)
  const [fecha, setFecha] = useState(() => today())
  const [mesIdx, setMesIdx] = useState(() => new Date().getMonth())
  const [anio, setAnio] = useState(() => new Date().getFullYear())
  const [desc, setDesc] = useState('')
  const [credMecId, setCredMecId] = useState('')
  const [credMonto, setCredMonto] = useState(0)
  const [credCuotas, setCredCuotas] = useState(3)
  const [credDesc, setCredDesc] = useState('')
  const [credOpen, setCredOpen] = useState<string | null>(null)
  /** Mismo período que la tabla de liquidación (KPI alineados al HTML del taller). */
  const [liqMesIdx, setLiqMesIdx] = useState(() => new Date().getMonth())
  const [liqAnio, setLiqAnio] = useState(() => new Date().getFullYear())

  useLayoutEffect(() => {
    const j = takeAnticiposNav()
    if (!j) return
    setTab(j.tab)
    if (j.credMecId) setCredMecId(j.credMecId)
    if (j.nuevoTrabajadorId) setTrabId(j.nuevoTrabajadorId)
  }, [])

  /** KPIs alineados al HTML (`renderStatsAnt`): mismo mes/año que la liquidación bajo las tarjetas */
  const stats = useMemo(() => {
    const mesNombre = MESES[liqMesIdx]!
    const mesEtiquetaLargo = MESES_LARGOS[liqMesIdx] ?? mesNombre
    const totalAnticipadoMes = db.anticipos
      .filter(
        (a) =>
          a.mesDescuento === liqMesIdx &&
          a.anioDescuento === liqAnio &&
          anticipoDescuentaLiquidacion(a.estado),
      )
      .reduce((s, a) => s + a.monto, 0)
    const creditosActivos = settings.extras.creditosMec.filter((c) => c.estado === 'Activo')
    const nCred = creditosActivos.length
    const saldoCred = creditosActivos.reduce((s, c) => s + c.saldo, 0)
    const aj = settings.extras.comisionesAjustadas ?? {}
    const comisionesMes = db.mecanicos
      .filter(mecanicoEnNomina)
      .reduce((s, m) => s + getComisionFinal(aj, db, m.id, mesNombre, liqAnio), 0)
    const nMecActivos = db.mecanicos.filter(mecanicoEnNomina).length
    return {
      nMecActivos,
      totalAnticipadoMes,
      nCred,
      saldoCred,
      comisionesMes,
      mesNombre,
      mesEtiquetaLargo,
      anioCur: liqAnio,
    }
  }, [
    db.anticipos,
    db.mecanicos,
    liqMesIdx,
    liqAnio,
    settings.extras.creditosMec,
    settings.extras.comisionesAjustadas,
  ])

  const [histQ, setHistQ] = useState('')
  const [histEst, setHistEst] = useState('')

  const historialFiltrado = useMemo(() => {
    let lista = [...db.anticipos].sort((a, b) => (a.creado < b.creado ? 1 : -1))
    const q = histQ.trim().toLowerCase()
    if (q) {
      lista = lista.filter(
        (a) => a.trabajadorNombre.toLowerCase().includes(q) || (a.desc || '').toLowerCase().includes(q),
      )
    }
    if (histEst === 'Pendiente') {
      lista = lista.filter((a) => a.estado === 'Pendiente' || a.estado === 'Activo')
    } else if (histEst === 'Descontado') {
      lista = lista.filter((a) => a.estado === 'Pagado')
    }
    lista.sort((a, b) => (b.fecha > a.fecha ? 1 : -1))
    return lista
  }, [db.anticipos, histQ, histEst])

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
      estado: 'Pendiente',
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

  const eliminarAnticipo = (id: string) => {
    if (!window.confirm('¿Eliminar este anticipo?')) return
    setDb((d) => ({ ...d, anticipos: d.anticipos.filter((a) => a.id !== id) }))
    showToast('Anticipo eliminado')
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Math.round(n))

  return (
    <>
      <div className="stats stats-anticipos cred-stats-html" style={{ marginBottom: 14 }}>
        <div className="stat">
          <div className="stat-lbl">Mecánicos activos</div>
          <div className="stat-val">{stats.nMecActivos}</div>
          <div className="stat-sub">en nómina</div>
        </div>
        <div className="stat">
          <div className="stat-lbl">
            Anticipos {stats.mesEtiquetaLargo} {stats.anioCur}
          </div>
          <div className="stat-val" style={{ color: '#c27803' }}>
            {fmt(stats.totalAnticipadoMes)}
          </div>
          <div className="stat-sub">mes/año de descuento</div>
        </div>
        <div className="stat">
          <div className="stat-lbl">Créditos activos</div>
          <div className="stat-val" style={{ color: 'var(--red)' }}>
            {stats.nCred}
          </div>
          <div className="stat-sub">{fmt(stats.saldoCred)} pendiente</div>
        </div>
        <div className="stat">
          <div className="stat-lbl">Comisiones generadas</div>
          <div className="stat-val" style={{ color: 'var(--green)' }}>
            {fmt(stats.comisionesMes)}
          </div>
          <div className="stat-sub">
            {stats.mesEtiquetaLargo} {stats.anioCur}
          </div>
        </div>
      </div>

      <div className="agenda-html-tabs tabs ant-html-tabs">
        <button type="button" className={tab === 'resumen' ? 'tab active' : 'tab'} onClick={() => setTab('resumen')}>
          👷 Trabajadores
        </button>
        <button type="button" className={tab === 'nuevo' ? 'tab active' : 'tab'} onClick={() => setTab('nuevo')}>
          ➕ Nuevo anticipo
        </button>
        <button type="button" className={tab === 'credMec' ? 'tab active' : 'tab'} onClick={() => setTab('credMec')}>
          💳 Créditos
        </button>
        <button type="button" className={tab === 'historial' ? 'tab active' : 'tab'} onClick={() => setTab('historial')}>
          📋 Historial
        </button>
        <button type="button" className={tab === 'pdf' ? 'tab active' : 'tab'} onClick={() => setTab('pdf')}>
          🖨 Comprobante
        </button>
      </div>

      {tab === 'resumen' && (
        <LiquidacionTrabajadores
          db={db}
          settings={settings}
          setSettings={setSettings}
          showToast={showToast}
          showExportMes
          cardClassName="card card-ant"
          mesIdx={liqMesIdx}
          setMesIdx={setLiqMesIdx}
          anioSel={liqAnio}
          setAnioSel={setLiqAnio}
          onIrAnticiposCredito={(id) => {
            setCredMecId(id)
            setTab('credMec')
          }}
          onIrAnticiposNuevo={(id) => {
            setTrabId(id)
            setTab('nuevo')
          }}
        />
      )}

      {tab === 'nuevo' && (
        <div className="card card-ant">
          <div className="card-title">
            <div className="card-title-left">Registrar anticipo</div>
          </div>
          <div className="g4-ot-row1">
            <div className="field">
              <label>Trabajador *</label>
              <select value={trabId} onChange={(e) => setTrabId(e.target.value)}>
                <option value="">— Seleccionar —</option>
                {db.mecanicos.filter(mecanicoEnNomina).map((m) => (
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
              <input
                type="number"
                min={2020}
                max={2100}
                step={1}
                value={anio}
                onChange={(e) => setAnio(Number(e.target.value) || new Date().getFullYear())}
                style={{ padding: '8px 11px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', color: 'var(--text)' }}
              />
            </div>
          </div>
          <div className="field field-full">
            <label>Descripción / motivo</label>
            <input
              placeholder="Ej: Anticipo quincena, emergencia médica..."
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
          </div>
          <div className="form-row-actions">
            <button type="button" className="btn btn-primary btn-guardar" onClick={registrar}>
              ✓ Registrar anticipo
            </button>
            <button type="button" className="btn btn-outline" onClick={limpiar}>
              ↺ Limpiar
            </button>
          </div>
        </div>
      )}

      {tab === 'historial' && (
        <div className="card card-ant">
          <div className="card-title">
            <div className="card-title-left">Historial de anticipos</div>
          </div>
          <div className="sbar" style={{ marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
            <input
              className="input-buscar-clientes"
              style={{ flex: '1 1 200px', minWidth: 180 }}
              placeholder="Buscar trabajador, descripción..."
              value={histQ}
              onChange={(e) => setHistQ(e.target.value)}
            />
            <select
              value={histEst}
              onChange={(e) => setHistEst(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                fontSize: 12,
                background: 'var(--surface)',
                color: 'var(--text)',
              }}
            >
              <option value="">Todos</option>
              <option value="Pendiente">Pendientes</option>
              <option value="Descontado">Descontados</option>
            </select>
          </div>
          {!historialFiltrado.length ? (
            <div className="empty empty-sm">Sin registros</div>
          ) : (
            <div className="tw">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Trabajador</th>
                    <th>Mes descuento</th>
                    <th>Descripción</th>
                    <th>Estado</th>
                    <th className="tr">Monto</th>
                    <th className="th-actions"> </th>
                  </tr>
                </thead>
                <tbody>
                  {historialFiltrado.map((a) => {
                    const estadoLbl = a.estado === 'Pagado' ? 'Descontado' : a.estado
                    const pendienteVisual = a.estado === 'Pendiente' || a.estado === 'Activo'
                    return (
                    <tr key={a.id}>
                      <td style={{ fontSize: 11 }}>{isoDateToDdMmYyyy(a.fecha)}</td>
                      <td style={{ fontWeight: 500 }}>{a.trabajadorNombre}</td>
                      <td>
                        {MESES[a.mesDescuento]} {a.anioDescuento}
                      </td>
                      <td style={{ fontSize: 11, color: 'var(--text2)' }}>{a.desc?.trim() || '—'}</td>
                      <td>
                        <span className={`badge ${pendienteVisual ? 'b-amber' : 'b-gray'}`}>{estadoLbl}</span>
                      </td>
                      <td className="tr" style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                        {fmt(a.monto)}
                      </td>
                      <td>
                        <div className="row-acts">
                          {(a.estado === 'Activo' || a.estado === 'Pendiente') && (
                            <button type="button" className="btn btn-xs btn-green" onClick={() => marcarPagado(a.id)}>
                              Pagado
                            </button>
                          )}
                          <button type="button" className="btn btn-xs btn-red" onClick={() => eliminarAnticipo(a.id)}>
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'pdf' && <AnticiposComprobanteTab db={db} settings={settings} showToast={showToast} />}

      {tab === 'credMec' && (
        <>
          <div className="card card-ant">
            <div className="card-title">
              <div className="card-title-left">💳 Créditos de trabajadores</div>
            </div>
            <div className="g4-ot-row1">
              <div className="field">
                <label>Trabajador *</label>
                <select value={credMecId} onChange={(e) => setCredMecId(e.target.value)}>
                  <option value="">— Seleccionar —</option>
                  {db.mecanicos.filter(mecanicoEnNomina).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Monto total ($) *</label>
                <input type="number" min={0} step={1} value={credMonto || ''} onChange={(e) => setCredMonto(Number(e.target.value))} />
              </div>
              <div className="field">
                <label>N° cuotas</label>
                <input type="number" min={1} max={48} step={1} value={credCuotas} onChange={(e) => setCredCuotas(Number(e.target.value) || 1)} />
              </div>
            </div>
            <div className="field field-full">
              <label>Motivo del crédito</label>
              <input placeholder="Ej: Préstamo para reparación auto, emergencia..." value={credDesc} onChange={(e) => setCredDesc(e.target.value)} />
            </div>
            <div className="form-row-actions">
              <button
                type="button"
                className="btn btn-primary btn-guardar"
                onClick={() => {
                  if (!credMecId) {
                    showToast('Selecciona un trabajador', 'err')
                    return
                  }
                  const monto = Number(credMonto)
                  if (!monto || monto <= 0) {
                    showToast('Indica el monto', 'err')
                    return
                  }
                  const mec = db.mecanicos.find((x) => x.id === credMecId)
                  if (!mec) return
                  const cuotasPlan = buildCuotasPlan(credCuotas, monto)
                  const nuevo: CreditoMec = {
                    id: uid(),
                    mecanicoId: mec.id,
                    mecanicoNombre: mec.nombre,
                    monto,
                    ncuotas: cuotasPlan.length,
                    cuotaMonto: cuotasPlan[0]?.monto ?? monto,
                    desc: credDesc.trim() || 'Crédito',
                    saldo: monto,
                    cuotasPlan,
                    estado: 'Activo',
                    creado: new Date().toISOString(),
                  }
                  setSettings((s) => ({
                    ...s,
                    extras: { ...s.extras, creditosMec: [nuevo, ...s.extras.creditosMec] },
                  }))
                  showToast(`Crédito ${fmt(monto)} registrado (${cuotasPlan.length} cuotas)`)
                  setCredMecId('')
                  setCredMonto(0)
                  setCredCuotas(3)
                  setCredDesc('')
                }}
              >
                ✓ Registrar crédito
              </button>
            </div>
          </div>

          <div className="card card-ant">
            <div className="card-title">
              <div className="card-title-left">Créditos activos</div>
              <span className="card-count">{settings.extras.creditosMec.filter((c) => c.estado === 'Activo').length}</span>
            </div>
            {!settings.extras.creditosMec.filter((c) => c.estado === 'Activo').length ? (
              <div className="empty empty-sm">Sin créditos activos</div>
            ) : (
              <div className="cred-mec-list">
                {settings.extras.creditosMec
                  .filter((c) => c.estado === 'Activo')
                  .map((c) => (
                    <div key={c.id} className="exp-row cred-mec-exp">
                      <button type="button" className="exp-hdr cred-mec-hdr" onClick={() => setCredOpen((x) => (x === c.id ? null : c.id))}>
                        <div>
                          <strong>{c.mecanicoNombre}</strong>
                          <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text2)' }}>{c.desc}</span>
                          {c.estado === 'Pagado' ? (
                            <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--green)' }}>✓ Saldado</span>
                          ) : null}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 700 }}>{fmt(c.saldo)} restante</div>
                          <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                            {c.cuotasPlan.filter((u) => u.pagado).length}/{c.ncuotas} cuotas
                          </div>
                        </div>
                      </button>
                      {credOpen === c.id && (
                        <div className="exp-body open cred-mec-body">
                          <div className="tw">
                            <table>
                              <thead>
                                <tr>
                                  <th>#</th>
                                  <th>Mes / año</th>
                                  <th>Monto</th>
                                  <th>Estado</th>
                                  <th />
                                </tr>
                              </thead>
                              <tbody>
                                {c.cuotasPlan.map((cu, ix) => (
                                  <tr key={`${c.id}-${ix}`}>
                                    <td>{ix + 1}</td>
                                    <td>
                                      {cu.mes} {cu.anio}
                                    </td>
                                    <td>{fmt(cu.monto)}</td>
                                    <td>{cu.pagado ? `Pagado ${cu.fechaPago ? isoDateToDdMmYyyy(cu.fechaPago) : ''}` : 'Pendiente'}</td>
                                    <td>
                                      {!cu.pagado && c.estado !== 'Pagado' ? (
                                        <button
                                          type="button"
                                          className="btn btn-xs"
                                          onClick={() => {
                                            setSettings((s) => ({
                                              ...s,
                                              extras: {
                                                ...s.extras,
                                                creditosMec: s.extras.creditosMec.map((cr) => {
                                                  if (cr.id !== c.id) return cr
                                                  const plan = [...cr.cuotasPlan]
                                                  const cell = plan[ix]
                                                  if (!cell || cell.pagado) return cr
                                                  plan[ix] = { ...cell, pagado: true, fechaPago: today() }
                                                  const saldo = plan.filter((p) => !p.pagado).reduce((sum, p) => sum + p.monto, 0)
                                                  const estado = saldo <= 0 ? ('Pagado' as const) : cr.estado
                                                  return { ...cr, cuotasPlan: plan, saldo: Math.max(0, saldo), estado }
                                                }),
                                              },
                                            }))
                                            showToast('Cuota marcada como pagada')
                                          }}
                                        >
                                          ✓ Pagar cuota
                                        </button>
                                      ) : cu.pagado ? (
                                        <button
                                          type="button"
                                          className="btn btn-xs btn-ghost"
                                          onClick={() => {
                                            if (!window.confirm('¿Deshacer pago de esta cuota?')) return
                                            setSettings((s) => ({
                                              ...s,
                                              extras: {
                                                ...s.extras,
                                                creditosMec: s.extras.creditosMec.map((cr) => {
                                                  if (cr.id !== c.id) return cr
                                                  const plan = [...cr.cuotasPlan]
                                                  plan[ix] = { ...plan[ix], pagado: false, fechaPago: null }
                                                  const saldo = plan.filter((p) => !p.pagado).reduce((sum, p) => sum + p.monto, 0)
                                                  return { ...cr, cuotasPlan: plan, saldo, estado: 'Activo' }
                                                }),
                                              },
                                            }))
                                          }}
                                        >
                                          ↩
                                        </button>
                                      ) : null}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <div style={{ marginTop: 10, textAlign: 'right' }}>
                            <button
                              type="button"
                              className="btn btn-xs btn-red"
                              onClick={() => {
                                if (!window.confirm('¿Eliminar este crédito?')) return
                                setSettings((s) => ({
                                  ...s,
                                  extras: { ...s.extras, creditosMec: s.extras.creditosMec.filter((x) => x.id !== c.id) },
                                }))
                                showToast('Crédito eliminado')
                              }}
                            >
                              Eliminar crédito
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        </>
      )}
    </>
  )
}

