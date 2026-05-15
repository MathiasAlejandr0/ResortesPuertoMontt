import { type Dispatch, type SetStateAction, useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import type { AppSettings, CreditoMec, Db, Mecanico } from './appTypes'
import { withCuotaCreditoDesmarcada, withCuotaCreditoMarcadaPagada } from './creditosMecOps'
import {
  MESES_REM,
  calcAnticiposMesDb,
  calcComisionEstimadaMec,
  calcCuotaCreditoMec,
  claveComision,
  creditosMesPorMec,
  creditosTodosPorMec,
  getComisionFinal,
} from './remuneracionesHelpers'
import { isoDateToDdMmYyyy as fmtFecha } from './dateFormat'
import { mecanicoEnNomina } from './opsHelpers'

export type LiquidacionTrabajadoresProps = {
  db: Db
  settings: AppSettings
  setSettings: Dispatch<SetStateAction<AppSettings>>
  showToast: (msg: string, type?: 'ok' | 'err' | 'warn') => void
  onIrAnticiposCredito: (mecanicoId: string) => void
  onIrAnticiposNuevo: (mecanicoId: string) => void
  /** Botón «Exportar mes» como en HTML (solo anticipos con mes de descuento seleccionado). */
  showExportMes?: boolean
  cardClassName?: string
  /**
   * Controlar mes/año desde el padre (p. ej. KPIs de AnticiposModule alineados al mismo período).
   * Si se omiten, se usa estado interno.
   */
  mesIdx?: number
  setMesIdx?: Dispatch<SetStateAction<number>>
  anioSel?: number
  setAnioSel?: Dispatch<SetStateAction<number>>
}

function fmt(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Math.round(n))
}

function proximaCuotaNoPagada(c: CreditoMec) {
  return (c.cuotasPlan ?? []).find((cu) => !cu.pagado)
}

function exportAnticiposMesExcel(db: Db, mesIdx: number, anio: number, mesEtiqueta: string, showToast: LiquidacionTrabajadoresProps['showToast']) {
  const lista = db.anticipos.filter((a) => a.mesDescuento === mesIdx && a.anioDescuento === anio)
  if (!lista.length) {
    showToast('No hay datos para exportar', 'warn')
    return
  }
  const wb = XLSX.utils.book_new()
  const rows: (string | number)[][] = [
    ['Trabajador', 'Tipo', 'Mes desc.', 'Año', 'Descripción', 'Monto', 'Estado', 'Fecha registro'],
    ...lista.map((a) => [
      a.trabajadorNombre,
      a.tipo,
      MESES_REM[a.mesDescuento] ?? '',
      a.anioDescuento,
      a.desc,
      a.monto,
      a.estado,
      a.fecha,
    ]),
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), `${mesEtiqueta}_${anio}`.slice(0, 31))
  XLSX.writeFile(wb, `Anticipos_${mesEtiqueta}_${anio}.xlsx`)
  showToast(`Exportado: Anticipos ${mesEtiqueta} ${anio}`)
}

function MecRemuneracionCard({
  m,
  mesNombre,
  anio,
  db,
  settings,
  setSettings,
  showToast,
  onIrAnticiposCredito,
  onIrAnticiposNuevo,
}: {
  m: Mecanico
  mesNombre: string
  anio: number
  db: Db
  settings: AppSettings
  setSettings: Dispatch<SetStateAction<AppSettings>>
  showToast: (msg: string, type?: 'ok' | 'err' | 'warn') => void
  onIrAnticiposCredito: (mecanicoId: string) => void
  onIrAnticiposNuevo: (mecanicoId: string) => void
}) {
  const sueldo = m.sueldoBase ?? 0
  const { estimado, detalle, otsMes } = calcComisionEstimadaMec(db, m.id, mesNombre, anio)
  const key = claveComision(m.id, mesNombre, anio)
  const ajustada = settings.extras.comisionesAjustadas[key] !== undefined
  const comisionFinal = getComisionFinal(settings.extras.comisionesAjustadas, db, m.id, mesNombre, anio)
  const anticipos = calcAnticiposMesDb(db, m.id, mesNombre, anio)
  const cuotaCred = calcCuotaCreditoMec(settings, m.id, mesNombre, anio)
  const filasCred = creditosMesPorMec(settings, m.id, mesNombre, anio)
  const todosCreditos = creditosTodosPorMec(settings, m.id)
  const bruto = sueldo + comisionFinal
  const descuentos = anticipos + cuotaCred
  const aPagar = Math.max(0, bruto - descuentos)

  const [inp, setInp] = useState(String(comisionFinal))
  useEffect(() => {
    setInp(String(comisionFinal))
  }, [comisionFinal, key])

  const marcarPagada = (creditoId: string, cuotaIdx: number) => {
    let msg = ''
    setSettings((prev) => {
      const next = withCuotaCreditoMarcadaPagada(prev, creditoId, cuotaIdx)
      if (next === prev) return prev
      const cr = next.extras.creditosMec.find((x) => x.id === creditoId)
      const saldo = cr?.saldo ?? 0
      msg = saldo <= 0 ? `✅ Crédito completamente saldado` : `Cuota ${cuotaIdx + 1} marcada como pagada — Saldo restante: ${fmt(saldo)}`
      return next
    })
    if (msg) showToast(msg)
  }

  const desmarcarPagada = (creditoId: string, cuotaIdx: number) => {
    if (!confirm('¿Deshacer el pago de esta cuota?')) return
    setSettings((s) => withCuotaCreditoDesmarcada(s, creditoId, cuotaIdx))
    showToast(`Pago de cuota ${cuotaIdx + 1} deshecho`)
  }

  return (
    <div
      className="card card-rep rep-mec-liq"
      style={{ marginBottom: 14, borderLeft: `3px solid ${aPagar > 0 ? 'var(--accent)' : 'var(--red)'}` }}
    >
      <div className="rep-mec-liq-head">
        <div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>👷 {m.nombre}</div>
          <div style={{ fontSize: 11, color: 'var(--text2)' }}>
            {m.rut ? `RUT: ${m.rut} · ` : ''}
            {m.especialidad || '—'} · {otsMes.length} OT{otsMes.length !== 1 ? 's' : ''} en {mesNombre} {anio}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: 'var(--text2)' }}>
            LÍQUIDO A PAGAR — {mesNombre} {anio}
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: aPagar > 0 ? 'var(--green)' : 'var(--red)' }}>{fmt(aPagar)}</div>
        </div>
      </div>

      <div className="rep-mec-liq-panel">
        <div className="rep-mec-liq-kicker">Desglose del mes</div>

        <div className="rep-mec-liq-row">
          <span style={{ color: 'var(--text2)' }}>Sueldo base</span>
          <strong>{fmt(sueldo)}</strong>
        </div>

        <div className="rep-mec-liq-row rep-mec-liq-row-top">
          <div style={{ flex: 1 }}>
            <div style={{ color: 'var(--green)', marginBottom: 4 }}>+ Comisión OTs (5% por OT, dividida entre mecánicos)</div>
            {detalle.length ? (
              <div style={{ fontSize: 10, color: 'var(--text3)', paddingLeft: 10, lineHeight: 1.7 }}>
                {detalle.map((d) => (
                  <div key={d.folio}>
                    {d.folio} · {d.clienteNombre} · Total OT: {fmt(d.total)}
                    {d.nMec > 1 ? ` ÷ ${d.nMec} mecánicos` : ''} = <strong style={{ color: 'var(--green)' }}>{fmt(d.comision)}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 10, color: 'var(--text3)', paddingLeft: 10 }}>Sin OTs este mes</div>
            )}
            <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 4, paddingLeft: 10 }}>
              Estimado automático: <strong style={{ color: 'var(--green)' }}>{fmt(estimado)}</strong>
              {ajustada ? <span style={{ color: '#b8860b', marginLeft: 6 }}>· Ajustado manualmente</span> : null}
            </div>
            <div className="rep-mec-liq-adjust">
              <span style={{ fontSize: 11, color: 'var(--text2)' }}>Comisión a liquidar:</span>
              <input
                type="number"
                min={0}
                step={1}
                value={inp}
                className={`input-inline-num${ajustada ? ' input-inline-warn' : ''}`}
                style={{ width: 110 }}
                onChange={(e) => setInp(e.target.value)}
              />
              <button
                type="button"
                className="btn btn-xs btn-green"
                onClick={() => {
                  const val = Math.max(0, Math.round(Number(inp) || 0))
                  setSettings((s) => ({
                    ...s,
                    extras: {
                      ...s.extras,
                      comisionesAjustadas: { ...s.extras.comisionesAjustadas, [key]: val },
                    },
                  }))
                  showToast(`Comisión ajustada a ${fmt(val)} para el mes`)
                }}
              >
                ✓ Guardar
              </button>
              {ajustada ? (
                <button
                  type="button"
                  className="btn btn-xs"
                  onClick={() => {
                    setSettings((s) => {
                      const next = { ...s.extras.comisionesAjustadas }
                      delete next[key]
                      return { ...s, extras: { ...s.extras, comisionesAjustadas: next } }
                    })
                    showToast('Comisión restablecida al valor calculado')
                  }}
                >
                  ↩ Restablecer
                </button>
              ) : null}
            </div>
          </div>
          <strong style={{ color: ajustada ? '#b8860b' : 'var(--green)', whiteSpace: 'nowrap' }}>+{fmt(comisionFinal)}</strong>
        </div>

        <div className="rep-mec-liq-row rep-mec-liq-bruto">
          <span>= Sueldo bruto</span>
          <strong>{fmt(bruto)}</strong>
        </div>

        {anticipos > 0 ? (
          <>
            <div className="rep-mec-liq-row">
              <span style={{ color: '#b8860b' }}>− Anticipos del mes</span>
              <strong style={{ color: '#b8860b' }}>−{fmt(anticipos)}</strong>
            </div>
            <div className="rep-mec-liq-row rep-mec-liq-subtle">
              <span>= Saldo disponible</span>
              <strong>{fmt(bruto - anticipos)}</strong>
            </div>
          </>
        ) : null}

        {filasCred.length ? (
          <>
            <div className="rep-mec-liq-kicker rep-mec-liq-kicker-mt">Descuentos por crédito / préstamo</div>
            {filasCred.map((cr) => (
              <div
                key={`${cr.creditoId}-${cr.cuotaIdx}`}
                className="rep-mec-liq-cuota rep-mec-liq-cuota-rich"
                style={{
                  background: cr.cuota.pagado ? 'rgba(26,107,58,0.12)' : 'rgba(196,30,30,0.08)',
                }}
              >
                <div className="rep-mec-liq-cuota-main">
                  <div>
                    <span style={{ color: cr.cuota.pagado ? 'var(--green)' : 'var(--red)', fontWeight: 600, fontSize: 12 }}>
                      − {cr.desc}
                    </span>
                    {cr.cuota.fecha ? (
                      <span style={{ fontSize: 10, color: 'var(--text3)', marginLeft: 6 }}>📅 {fmtFecha(cr.cuota.fecha)}</span>
                    ) : null}
                    <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>
                      Cuota {cr.cuotaIdx + 1}/{cr.ncuotas} · Saldo restante crédito: {fmt(cr.saldoCredito)}
                    </div>
                  </div>
                  <div className="rep-mec-liq-cuota-actions">
                    <strong
                      style={{
                        color: cr.cuota.pagado ? 'var(--green)' : 'var(--red)',
                        textDecoration: cr.cuota.pagado ? 'line-through' : undefined,
                      }}
                    >
                      −{fmt(cr.cuota.monto)}
                    </strong>
                    {cr.cuota.pagado ? (
                      <>
                        <span className="badge b-green" style={{ fontSize: 9 }}>
                          ✓ Pagada
                        </span>
                        <button type="button" className="btn btn-xs" title="Deshacer pago" onClick={() => desmarcarPagada(cr.creditoId, cr.cuotaIdx)}>
                          ↩
                        </button>
                      </>
                    ) : cr.creditEstado !== 'Pagado' ? (
                      <button
                        type="button"
                        className="btn btn-xs btn-green"
                        style={{ padding: '2px 8px', fontSize: 10 }}
                        onClick={() => marcarPagada(cr.creditoId, cr.cuotaIdx)}
                      >
                        ✓ Marcar pagada
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </>
        ) : null}

        {cuotaCred > 0 ? (
          <div className="rep-mec-liq-row">
            <span style={{ color: 'var(--red)' }}>− Total cuotas crédito (mes)</span>
            <strong style={{ color: 'var(--red)' }}>−{fmt(cuotaCred)}</strong>
          </div>
        ) : null}

        <div className="rep-mec-liq-row rep-mec-liq-total-final">
          <span style={{ color: aPagar > 0 ? 'var(--green)' : 'var(--red)' }}>= LÍQUIDO A PAGAR</span>
          <strong style={{ color: aPagar > 0 ? 'var(--green)' : 'var(--red)' }}>{fmt(aPagar)}</strong>
        </div>
      </div>

      {todosCreditos.length ? (
        <div style={{ marginBottom: 10 }}>
          <div className="rep-mec-liq-kicker" style={{ marginBottom: 6 }}>
            💳 Créditos / préstamos
          </div>
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>Descripción</th>
                  <th>Total</th>
                  <th>Saldo</th>
                  <th>Cuotas</th>
                  <th>Próximo desc.</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {todosCreditos.map((c) => {
                  const prox = proximaCuotaNoPagada(c)
                  const pagadas = (c.cuotasPlan ?? []).filter((cu) => cu.pagado).length
                  return (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 500 }}>{c.desc}</td>
                      <td>{fmt(c.monto)}</td>
                      <td style={{ fontWeight: 700, color: c.saldo > 0 ? 'var(--red)' : 'var(--green)' }}>{fmt(c.saldo)}</td>
                      <td style={{ fontSize: 11 }}>
                        {pagadas}/{c.ncuotas}
                        {prox ? ` · ${fmt(prox.monto)}/mes` : ''}
                      </td>
                      <td style={{ fontSize: 11 }}>
                        {prox ? `${prox.mes} ${prox.anio}${prox.fecha ? ` · ${fmtFecha(prox.fecha)}` : ''}` : '—'}
                      </td>
                      <td>
                        <span className={`badge ${c.estado === 'Pagado' ? 'b-green' : 'b-red'}`}>
                          {c.estado === 'Pagado' ? '✓ Saldado' : 'Activo'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <div className="rep-mec-liq-footer">
        <span style={{ fontSize: 11, color: 'var(--text2)' }}>
          Bruto: <strong>{fmt(bruto)}</strong> − Descuentos: <strong>{fmt(descuentos)}</strong> ={' '}
          <strong style={{ color: aPagar > 0 ? 'var(--green)' : 'var(--red)' }}>{fmt(aPagar)}</strong>
        </span>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-xs btn-purple" onClick={() => onIrAnticiposCredito(m.id)}>
            + Crédito
          </button>
          <button type="button" className="btn btn-xs btn-outline" onClick={() => onIrAnticiposNuevo(m.id)}>
            + Anticipo
          </button>
        </div>
      </div>
    </div>
  )
}

export function LiquidacionTrabajadores({
  db,
  settings,
  setSettings,
  showToast,
  onIrAnticiposCredito,
  onIrAnticiposNuevo,
  showExportMes = false,
  cardClassName = 'card card-rep',
  mesIdx: mesIdxProp,
  setMesIdx: setMesIdxProp,
  anioSel: anioSelProp,
  setAnioSel: setAnioSelProp,
}: LiquidacionTrabajadoresProps) {
  const [mesIdxInner, setMesIdxInner] = useState(() => new Date().getMonth())
  const [anioInner, setAnioInner] = useState(() => new Date().getFullYear())
  const mesIdx = mesIdxProp !== undefined ? mesIdxProp : mesIdxInner
  const setMesIdx = setMesIdxProp ?? setMesIdxInner
  const anioSel = anioSelProp !== undefined ? anioSelProp : anioInner
  const setAnioSel = setAnioSelProp ?? setAnioInner

  const mesNombre = MESES_REM[mesIdx] ?? 'Ene'
  const mecsActivos = useMemo(() => db.mecanicos.filter(mecanicoEnNomina), [db.mecanicos])

  return (
    <>
      <div className={cardClassName}>
        <div className="card-title">
          <div className="card-title-left">Liquidación por trabajador</div>
          <span style={{ fontSize: 12, color: 'var(--text2)' }}>Comisión 5% sobre total OT / mecánicos asignados</span>
        </div>
        <div className="g2-desc" style={{ alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
          <div className="field">
            <label>Mes</label>
            <select value={mesIdx} onChange={(e) => setMesIdx(Number(e.target.value))}>
              {MESES_REM.map((mx, i) => (
                <option key={mx} value={i}>
                  {mx}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Año</label>
            <input
              type="number"
              min={2020}
              max={2050}
              step={1}
              value={Number.isFinite(anioSel) ? anioSel : new Date().getFullYear()}
              onChange={(e) => setAnioSel(Math.min(2050, Math.max(2020, Number(e.target.value) || new Date().getFullYear())))}
            />
          </div>
          {showExportMes ? (
            <button
              type="button"
              className="btn btn-sm btn-excel"
              onClick={() => exportAnticiposMesExcel(db, mesIdx, anioSel, mesNombre, showToast)}
            >
              ⬇ Exportar mes
            </button>
          ) : null}
        </div>
      </div>

      {!mecsActivos.length ? (
        <div className="empty">
          <div className="empty-icon">👷</div>
          Sin mecánicos activos
        </div>
      ) : (
        mecsActivos.map((m) => (
          <MecRemuneracionCard
            key={m.id}
            m={m}
            mesNombre={mesNombre}
            anio={anioSel}
            db={db}
            settings={settings}
            setSettings={setSettings}
            showToast={showToast}
            onIrAnticiposCredito={onIrAnticiposCredito}
            onIrAnticiposNuevo={onIrAnticiposNuevo}
          />
        ))
      )}
    </>
  )
}
