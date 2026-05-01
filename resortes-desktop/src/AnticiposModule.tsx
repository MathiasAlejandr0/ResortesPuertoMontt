import { type Dispatch, type SetStateAction, useLayoutEffect, useMemo, useState } from 'react'
import type { AnticipoRegistro, AppSettings, CreditoMec, CreditoMecCuota, Db } from './appTypes'
import { AnticiposComprobanteTab } from './AnticiposComprobanteTab'
import { LiquidacionTrabajadores } from './LiquidacionTrabajadores'
import { takeAnticiposNav, type AnticiposTab } from './anticiposNav'
import { anticipoDescuentaLiquidacion } from './remuneracionesHelpers'

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
  const [nowBase] = useState(() => Date.now())

  const [credMecId, setCredMecId] = useState('')
  const [credMonto, setCredMonto] = useState(0)
  const [credCuotas, setCredCuotas] = useState(3)
  const [credDesc, setCredDesc] = useState('')
  const [credOpen, setCredOpen] = useState<string | null>(null)

  useLayoutEffect(() => {
    const j = takeAnticiposNav()
    if (!j) return
    setTab(j.tab)
    if (j.credMecId) setCredMecId(j.credMecId)
    if (j.nuevoTrabajadorId) setTrabId(j.nuevoTrabajadorId)
  }, [])

  const stats = useMemo(() => {
    const activos = db.anticipos.filter((a) => anticipoDescuentaLiquidacion(a.estado))
    const saldoPend = activos.reduce((s, a) => s + a.monto, 0)
    const now = new Date()
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const esteMes = db.anticipos.filter((a) => a.fecha && a.fecha.slice(0, 7) === ym)
    const totalMes = esteMes.reduce((s, a) => s + a.monto, 0)
    const totalHist = db.anticipos.reduce((s, a) => s + a.monto, 0)
    const nPagados = db.anticipos.filter((a) => a.estado === 'Pagado').length
    return { saldoPend, nActivos: activos.length, totalMes, nMes: esteMes.length, totalHist, nPagados }
  }, [db.anticipos, nowBase])

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
    } else if (histEst === 'Pagado') {
      lista = lista.filter((a) => a.estado === 'Pagado')
    }
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
        <button type="button" className={tab === 'resumen' ? 'inv-tab active' : 'inv-tab'} onClick={() => setTab('resumen')}>
          Trabajadores / liquidación
        </button>
        <button type="button" className={tab === 'nuevo' ? 'inv-tab active' : 'inv-tab'} onClick={() => setTab('nuevo')}>
          Nuevo anticipo
        </button>
        <button type="button" className={tab === 'credMec' ? 'inv-tab active' : 'inv-tab'} onClick={() => setTab('credMec')}>
          Créditos
        </button>
        <button type="button" className={tab === 'historial' ? 'inv-tab active' : 'inv-tab'} onClick={() => setTab('historial')}>
          Historial
        </button>
        <button type="button" className={tab === 'pdf' ? 'inv-tab active' : 'inv-tab'} onClick={() => setTab('pdf')}>
          Comprobante
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
              <option value="">Todos los estados</option>
              <option value="Pendiente">Pendientes</option>
              <option value="Pagado">Descontados / pagados</option>
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
                    <th>Tipo</th>
                    <th>Monto</th>
                    <th>Mes desc.</th>
                    <th>Estado</th>
                    <th className="th-actions">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {historialFiltrado.map((a) => (
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
                  ))}
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
              <div className="card-title-left">Nuevo crédito a mecánico (cuotas)</div>
            </div>
            <div className="g4-ot-row1">
              <div className="field">
                <label>Trabajador *</label>
                <select value={credMecId} onChange={(e) => setCredMecId(e.target.value)}>
                  <option value="">— Seleccionar —</option>
                  {db.mecanicos.filter((m) => m.activo).map((m) => (
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
              <label>Descripción</label>
              <input placeholder="Ej: Préstamo herramientas" value={credDesc} onChange={(e) => setCredDesc(e.target.value)} />
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
              <div className="card-title-left">Créditos registrados</div>
              <span className="card-count">{settings.extras.creditosMec.length}</span>
            </div>
            {!settings.extras.creditosMec.length ? (
              <div className="empty empty-sm">Sin créditos</div>
            ) : (
              <div className="cred-mec-list">
                {[...settings.extras.creditosMec]
                  .sort((a, b) => (a.estado === 'Pagado' ? 1 : 0) - (b.estado === 'Pagado' ? 1 : 0))
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
                                    <td>{cu.pagado ? `Pagado ${cu.fechaPago || ''}` : 'Pendiente'}</td>
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

