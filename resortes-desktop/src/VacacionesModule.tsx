import { type Dispatch, type SetStateAction, useEffect, useMemo, useState } from 'react'
import type { AppSettings, Db, Mecanico, Vacacion } from './appTypes'
import { isoDateToDdMmYyyy } from './dateFormat'
import { imprimirVacacionesComprobante } from './vacacionesPrint'
import { mecanicoEnNomina } from './opsHelpers'
import {
  DIAS_VAC_ANUALES,
  antiguedadAnios,
  countEnVacacionesHoy,
  countProximasVacaciones,
  diasHabiles,
  diasVacSaldo,
  diasVacUsados,
  effectiveVacDias,
  getVacAnio,
  getVacEstado,
  todayIso,
} from './vacacionesHelpers'

type Props = {
  db: Db
  settings: AppSettings
  setSettings: Dispatch<SetStateAction<AppSettings>>
  showToast: (msg: string, type?: 'ok' | 'err' | 'warn') => void
}

type VacTab = 'resumen' | 'solicitar' | 'historial'

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

export function VacacionesModule({ db, settings, setSettings, showToast }: Props) {
  const vacaciones = settings.extras.vacaciones
  const [tab, setTab] = useState<VacTab>('resumen')
  const [vacMec, setVacMec] = useState('')
  const [vacDesde, setVacDesde] = useState('')
  const [vacHasta, setVacHasta] = useState('')
  const [vacObs, setVacObs] = useState('')
  const [histQ, setHistQ] = useState('')
  const [histAnio, setHistAnio] = useState(() => new Date().getFullYear())

  const anioActual = new Date().getFullYear()
  const mecsActivos = useMemo(() => db.mecanicos.filter(mecanicoEnNomina), [db.mecanicos])

  const aniosHist = useMemo(() => {
    const s = new Set<number>()
    s.add(anioActual)
    vacaciones.forEach((v) => s.add(getVacAnio(v)))
    return [...s].sort((a, b) => b - a)
  }, [vacaciones, anioActual])

  useEffect(() => {
    if (!aniosHist.includes(histAnio)) setHistAnio(aniosHist[0] ?? anioActual)
  }, [aniosHist, histAnio, anioActual])

  useEffect(() => {
    if (tab !== 'solicitar') return
    const t = todayIso()
    if (!vacDesde) setVacDesde(t)
    if (!vacHasta) setVacHasta(t)
  }, [tab, vacDesde, vacHasta])

  const stats = useMemo(() => {
    const totalUsados = mecsActivos.reduce((s, m) => s + diasVacUsados(m.id, anioActual, vacaciones), 0)
    return {
      nActivos: mecsActivos.length,
      enVac: countEnVacacionesHoy(vacaciones),
      totalUsados,
      proximos: countProximasVacaciones(vacaciones),
    }
  }, [mecsActivos, vacaciones, anioActual])

  const diasPreview =
    vacDesde && vacHasta && vacHasta >= vacDesde ? diasHabiles(vacDesde, vacHasta) : null
  const anioDesde = vacDesde ? parseInt(vacDesde.slice(0, 10).split('-')[0]!, 10) : anioActual
  const saldoDisponibleForm = vacMec ? diasVacSaldo(vacMec, anioDesde, vacaciones) : DIAS_VAC_ANUALES

  let diasInfoErr = false
  let diasInfoMsg: string | null = null
  if (vacDesde && vacHasta) {
    if (vacHasta < vacDesde) {
      diasInfoErr = true
      diasInfoMsg = '⚠ La fecha fin debe ser posterior a la fecha inicio'
    } else if (diasPreview != null && diasPreview > 0 && vacMec) {
      const excede = diasPreview > saldoDisponibleForm
      diasInfoMsg = `📅 ${diasPreview} días hábiles (lun–vie) · Saldo disponible: ${saldoDisponibleForm} días${excede ? ' · ⚠ Excede el saldo disponible' : ''}`
      diasInfoErr = excede
    } else if (diasPreview === 0) {
      diasInfoMsg = 'El período no incluye días hábiles'
      diasInfoErr = true
    }
  }

  const preselVacMec = (id: string) => {
    setTab('solicitar')
    setVacMec(id)
    const t = todayIso()
    setVacDesde(t)
    setVacHasta(t)
  }

  const limpiarVac = () => {
    setVacMec('')
    setVacObs('')
    const t = todayIso()
    setVacDesde(t)
    setVacHasta(t)
  }

  const guardarVacaciones = () => {
    if (!vacMec) {
      showToast('Selecciona un trabajador', 'err')
      return
    }
    const desde = vacDesde
    const hasta = vacHasta
    if (!desde || !hasta) {
      showToast('Ingresa las fechas', 'err')
      return
    }
    if (hasta < desde) {
      showToast('La fecha fin debe ser posterior al inicio', 'err')
      return
    }
    const dias = diasHabiles(desde, hasta)
    if (dias <= 0) {
      showToast('El período no contiene días hábiles', 'err')
      return
    }
    const m = db.mecanicos.find((x) => x.id === vacMec)
    if (!m) return
    const anio = new Date(`${desde}T12:00:00`).getFullYear()
    const saldo = diasVacSaldo(vacMec, anio, vacaciones)
    if (dias > saldo) {
      if (!window.confirm(`${m.nombre} tiene ${saldo} días disponibles pero estás registrando ${dias}. ¿Continuar de todas formas?`))
        return
    }
    const obsTrim = vacObs.trim()
    const nuevo: Vacacion = {
      id: uid(),
      mecanicoId: vacMec,
      mecanicoNombre: m.nombre,
      desde,
      hasta,
      dias,
      anio,
      obs: obsTrim,
      estado: 'Activo',
      creado: new Date().toISOString(),
    }
    setSettings((s) => ({
      ...s,
      extras: {
        ...s.extras,
        vacaciones: [nuevo, ...s.extras.vacaciones],
      },
    }))
    showToast(`${dias} días de vacaciones registrados para ${m.nombre}`)
    limpiarVac()
    const todas = [nuevo, ...vacaciones]
    setTimeout(() => imprimirVacacionesComprobante(settings, db, todas, nuevo, showToast), 320)
  }

  const anularVac = (id: string) => {
    if (!window.confirm('¿Anular este período de vacaciones? Los días serán devueltos al saldo.')) return
    const ahora = new Date().toISOString()
    setSettings((s) => ({
      ...s,
      extras: {
        ...s.extras,
        vacaciones: s.extras.vacaciones.map((x) =>
          x.id === id ? { ...x, estado: 'Anulado' as const, anuladoEn: ahora } : x,
        ),
      },
    }))
    showToast('Vacaciones anuladas — días devueltos al saldo')
  }

  const listaHist = useMemo(() => {
    const q = histQ.toLowerCase().trim()
    let lista = [...vacaciones].filter((v) => getVacAnio(v) === histAnio)
    if (q) lista = lista.filter((v) => v.mecanicoNombre.toLowerCase().includes(q))
    lista.sort((a, b) => (b.desde > a.desde ? 1 : -1))
    return lista
  }, [vacaciones, histAnio, histQ])

  const imprimirVacMecAnio = (mecId: string, anio: number) => {
    const m = db.mecanicos.find((x) => x.id === mecId)
    if (!m) return
    const vacs = vacaciones
      .filter((v) => v.mecanicoId === mecId && getVacAnio(v) === anio && getVacEstado(v) !== 'Anulado')
      .sort((a, b) => (b.desde > a.desde ? 1 : -1))
    if (!vacs.length) {
      showToast('Sin vacaciones para generar comprobante', 'warn')
      return
    }
    imprimirVacacionesComprobante(settings, db, vacaciones, vacs[0]!, showToast)
  }

  const mecSel = vacMec ? db.mecanicos.find((x) => x.id === vacMec) : undefined
  const saldoSel = vacMec ? diasVacSaldo(vacMec, anioActual, vacaciones) : 0

  return (
    <>
      <div className="stats stats-creditos cred-stats-html" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 14 }}>
        <div className="stat">
          <div className="stat-lbl">Trabajadores activos</div>
          <div className="stat-val">{stats.nActivos}</div>
          <div className="stat-sub">en nómina</div>
        </div>
        <div className="stat">
          <div className="stat-lbl">En vacaciones hoy</div>
          <div className="stat-val" style={{ color: '#1565c0' }}>
            {stats.enVac}
          </div>
          <div className="stat-sub">ausentes</div>
        </div>
        <div className="stat">
          <div className="stat-lbl">Días usados {anioActual}</div>
          <div className="stat-val" style={{ color: '#c27803' }}>
            {stats.totalUsados}
          </div>
          <div className="stat-sub">total equipo</div>
        </div>
        <div className="stat">
          <div className="stat-lbl">Próximas vacaciones</div>
          <div className="stat-val" style={{ color: '#1a6b6b' }}>
            {stats.proximos}
          </div>
          <div className="stat-sub">en los próximos 7 días</div>
        </div>
      </div>

      <div className="agenda-html-tabs tabs vac-main-tabs">
        <button type="button" className={tab === 'resumen' ? 'tab active' : 'tab'} onClick={() => setTab('resumen')}>
          👷 Resumen trabajadores
        </button>
        <button type="button" className={tab === 'solicitar' ? 'tab active' : 'tab'} onClick={() => setTab('solicitar')}>
          ➕ Registrar vacaciones
        </button>
        <button type="button" className={tab === 'historial' ? 'tab active' : 'tab'} onClick={() => setTab('historial')}>
          📋 Historial
        </button>
      </div>

      {tab === 'resumen' && (
        <div id="vac-resumen-lista">
          {!mecsActivos.length ? (
            <div className="empty">
              <div className="empty-icon">👷</div>
              Sin mecánicos activos
            </div>
          ) : (
            mecsActivos.map((m) => (
              <ResumenCard
                key={m.id}
                m={m}
                anio={anioActual}
                vacaciones={vacaciones}
                onRegistrar={() => preselVacMec(m.id)}
                onComprobante={() => imprimirVacMecAnio(m.id, anioActual)}
              />
            ))
          )}
        </div>
      )}

      {tab === 'solicitar' && (
        <div className="card">
          <div className="card-title">
            <div className="card-title-left">Registrar período de vacaciones</div>
          </div>
          <div className="g3" style={{ marginBottom: 12 }}>
            <div className="field">
              <label>Trabajador *</label>
              <select
                value={vacMec}
                onChange={(e) => setVacMec(e.target.value)}
                style={{
                  padding: '8px 11px',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  fontSize: 13,
                  background: 'var(--bg)',
                  color: 'var(--text)',
                  outline: 'none',
                }}
              >
                <option value="">— Seleccionar —</option>
                {mecsActivos.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Fecha inicio *</label>
              <input type="date" value={vacDesde} onChange={(e) => setVacDesde(e.target.value)} />
            </div>
            <div className="field">
              <label>Fecha fin *</label>
              <input type="date" value={vacHasta} onChange={(e) => setVacHasta(e.target.value)} />
            </div>
          </div>

          {mecSel ? (
            <div
              style={{
                background: 'var(--surface2)',
                borderRadius: 'var(--radius)',
                padding: '8px 14px',
                fontSize: 12,
                display: 'flex',
                gap: 16,
                flexWrap: 'wrap',
                marginBottom: 12,
              }}
            >
              <span>
                👷 <strong>{mecSel.nombre}</strong>
              </span>
              <span>
                Días disponibles {anioActual}:{' '}
                <strong style={{ color: saldoSel > 0 ? 'var(--green)' : 'var(--red)' }}>{saldoSel}</strong>
              </span>
              {mecSel.fechaContrato ? (
                <span style={{ color: 'var(--text2)' }}>Contrato: {mecSel.fechaContrato}</span>
              ) : null}
            </div>
          ) : null}

          {diasInfoMsg ? (
            <div
              style={{
                display: 'block',
                background: diasInfoErr ? '#fdecea' : 'var(--purple-light)',
                border: `1px solid ${diasInfoErr ? 'var(--red)' : 'var(--purple)'}`,
                borderRadius: 'var(--radius)',
                padding: '10px 14px',
                marginBottom: 12,
                fontSize: 13,
              }}
            >
              {diasInfoMsg}
            </div>
          ) : null}

          <div className="field" style={{ marginBottom: 12 }}>
            <label>Observaciones</label>
            <input
              value={vacObs}
              onChange={(e) => setVacObs(e.target.value)}
              placeholder="Ej: Vacaciones de verano, feriado legal..."
            />
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-primary" onClick={guardarVacaciones}>
              ✓ Registrar vacaciones
            </button>
            <button type="button" className="btn" onClick={limpiarVac}>
              ↺ Limpiar
            </button>
          </div>
        </div>
      )}

      {tab === 'historial' && (
        <div className="card">
          <div className="card-title">
            <div className="card-title-left">Historial de vacaciones</div>
          </div>
          <div className="sbar" style={{ marginBottom: 12 }}>
            <input placeholder="Buscar trabajador..." value={histQ} onChange={(e) => setHistQ(e.target.value)} />
            <select
              value={histAnio}
              onChange={(e) => setHistAnio(Number(e.target.value))}
              style={{
                padding: '8px 12px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                fontSize: 12,
                background: 'var(--surface)',
                color: 'var(--text)',
                outline: 'none',
              }}
            >
              {aniosHist.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
          {!listaHist.length ? (
            <div className="empty">
              <div className="empty-icon">🏖️</div>
              Sin registros en {histAnio}
            </div>
          ) : (
            <div className="tw">
              <table>
                <thead>
                  <tr>
                    <th>Trabajador</th>
                    <th>Desde</th>
                    <th>Hasta</th>
                    <th>Días hábiles</th>
                    <th>Estado</th>
                    <th>Obs.</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {listaHist.map((v) => (
                    <tr key={v.id} style={{ opacity: getVacEstado(v) === 'Anulado' ? 0.55 : 1 }}>
                      <td style={{ fontWeight: 500 }}>{v.mecanicoNombre}</td>
                      <td>{isoDateToDdMmYyyy(v.desde)}</td>
                      <td>{isoDateToDdMmYyyy(v.hasta)}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{effectiveVacDias(v)}</td>
                      <td>
                        <span className={`badge ${getVacEstado(v) === 'Activo' ? 'b-teal' : 'b-gray'}`}>{getVacEstado(v)}</span>
                      </td>
                      <td style={{ fontSize: 11, color: 'var(--text2)' }}>{v.obs || '—'}</td>
                      <td>
                        <div className="row-acts">
                          <button
                            type="button"
                            className="btn btn-xs"
                            onClick={() => imprimirVacacionesComprobante(settings, db, vacaciones, v, showToast)}
                          >
                            🖨 PDF
                          </button>
                          {getVacEstado(v) === 'Activo' ? (
                            <button type="button" className="btn btn-xs btn-red" onClick={() => anularVac(v.id)}>
                              Anular
                            </button>
                          ) : null}
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
    </>
  )
}

function ResumenCard({
  m,
  anio,
  vacaciones,
  onRegistrar,
  onComprobante,
}: {
  m: Mecanico
  anio: number
  vacaciones: Vacacion[]
  onRegistrar: () => void
  onComprobante: () => void
}) {
  const usados = diasVacUsados(m.id, anio, vacaciones)
  const saldo = DIAS_VAC_ANUALES - usados
  const pct = Math.round((usados / DIAS_VAC_ANUALES) * 100)
  const vacs = vacaciones.filter((v) => v.mecanicoId === m.id && getVacAnio(v) === anio && getVacEstado(v) !== 'Anulado')
  const t = todayIso()
  const enVacHoy = vacs.some((v) => v.desde <= t && v.hasta >= t)
  const añosAnt = antiguedadAnios(m.fechaContrato)

  const borderLeft = enVacHoy ? '#1565c0' : saldo > 0 ? '#1a6b6b' : 'var(--red)'
  const barColor = pct >= 100 ? 'var(--red)' : pct >= 70 ? '#c27803' : '#1a6b6b'
  const saldoColor = saldo > 7 ? 'var(--green)' : saldo > 0 ? '#c27803' : 'var(--red)'

  return (
    <div className="card" style={{ marginBottom: 12, borderLeft: `3px solid ${borderLeft}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>
            👷 {m.nombre}{' '}
            {enVacHoy ? (
              <span
                style={{
                  fontSize: 11,
                  background: '#1565c0',
                  color: '#fff',
                  padding: '2px 8px',
                  borderRadius: 10,
                  marginLeft: 4,
                }}
              >
                En vacaciones
              </span>
            ) : null}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 3 }}>
            {m.fechaContrato
              ? `📅 Contrato: ${isoDateToDdMmYyyy(m.fechaContrato)} · ${añosAnt} año${añosAnt !== 1 ? 's' : ''} de antigüedad`
              : 'Sin fecha de contrato registrada'}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: 'var(--text2)' }}>Saldo disponible {anio}</div>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-mono)', color: saldoColor }}>
            {saldo} <span style={{ fontSize: 13 }}>días</span>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{ flex: 1, height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${Math.min(100, pct)}%`, background: barColor, borderRadius: 4, transition: 'width .4s' }} />
        </div>
        <span style={{ fontSize: 11, color: 'var(--text2)', whiteSpace: 'nowrap' }}>
          {usados}/{DIAS_VAC_ANUALES} días usados
        </span>
      </div>
      {vacs.length ? (
        <>
          <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 6, fontWeight: 600 }}>
            Períodos {anio}:
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            {vacs.map((v) => (
              <div
                key={v.id}
                style={{
                  background: getVacEstado(v) === 'Anulado' ? '#fdecea' : '#e6f5f5',
                  border: `1px solid ${getVacEstado(v) === 'Anulado' ? 'var(--red)' : '#1a6b6b'}`,
                  borderRadius: 'var(--radius)',
                  padding: '4px 10px',
                  fontSize: 11,
                }}
              >
                <span style={{ fontWeight: 600 }}>
                  {isoDateToDdMmYyyy(v.desde)} → {isoDateToDdMmYyyy(v.hasta)}
                </span>
                <span style={{ color: 'var(--text2)', marginLeft: 4 }}>({effectiveVacDias(v)}d)</span>
                {getVacEstado(v) === 'Anulado' ? <span style={{ color: 'var(--red)' }}> · Anulado</span> : null}
              </div>
            ))}
          </div>
        </>
      ) : (
        <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 10 }}>Sin vacaciones registradas este año</div>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
        <button type="button" className="btn btn-xs btn-teal" onClick={onRegistrar}>
          ➕ Registrar vacaciones
        </button>
        {vacs.length ? (
          <button type="button" className="btn btn-xs" onClick={onComprobante}>
            🖨 Comprobante
          </button>
        ) : null}
      </div>
    </div>
  )
}
