import { useEffect, useMemo, useState } from 'react'
import type { AppSettings, Db } from './appTypes'
import { mecanicoEnNomina } from './opsHelpers'
import {
  buildComprobanteAnticipoIndividual,
  buildComprobanteAnticiposConsolidado,
  fmtMoney,
} from './anticiposComprobantePrint'

type Props = {
  db: Db
  settings: AppSettings
  showToast: (msg: string, type?: 'ok' | 'err' | 'warn') => void
}

function weekBoundsIso() {
  const hoy = new Date()
  const diaSemana = hoy.getDay()
  const lunes = new Date(hoy)
  lunes.setDate(hoy.getDate() - ((diaSemana + 6) % 7))
  const domingo = new Date(lunes)
  domingo.setDate(lunes.getDate() + 6)
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  return { desde: iso(lunes), hasta: iso(domingo) }
}

export function AnticiposComprobanteTab({ db, settings, showToast }: Props) {
  const [pdfSub, setPdfSub] = useState<'individual' | 'todos'>('individual')
  const [mecInd, setMecInd] = useState('')
  const [desdeInd, setDesdeInd] = useState('')
  const [hastaInd, setHastaInd] = useState('')
  const [desdeAll, setDesdeAll] = useState('')
  const [hastaAll, setHastaAll] = useState('')
  const [filtroMec, setFiltroMec] = useState('')
  const [htmlInd, setHtmlInd] = useState<string | null>(null)
  const [htmlAll, setHtmlAll] = useState<string | null>(null)
  const [infoInd, setInfoInd] = useState('')
  const [infoAll, setInfoAll] = useState('')

  useEffect(() => {
    const { desde, hasta } = weekBoundsIso()
    setDesdeInd(desde)
    setHastaInd(hasta)
    setDesdeAll(desde)
    setHastaAll(hasta)
  }, [])

  const listaIndividual = useMemo(() => {
    if (!mecInd) return []
    return db.anticipos
      .filter((a) => {
        if (a.trabajadorId !== mecInd) return false
        if (desdeInd && a.fecha < desdeInd) return false
        if (hastaInd && a.fecha > hastaInd) return false
        return true
      })
      .sort((a, b) => (a.fecha < b.fecha ? -1 : 1))
  }, [db.anticipos, mecInd, desdeInd, hastaInd])

  const listaTodos = useMemo(() => {
    return db.anticipos
      .filter((a) => {
        if (filtroMec && a.trabajadorId !== filtroMec) return false
        if (desdeAll && a.fecha < desdeAll) return false
        if (hastaAll && a.fecha > hastaAll) return false
        return true
      })
      .sort((a, b) => (a.fecha < b.fecha ? -1 : 1))
  }, [db.anticipos, filtroMec, desdeAll, hastaAll])

  const previsualizarIndividual = () => {
    if (!mecInd) {
      showToast('Selecciona un trabajador', 'err')
      return
    }
    if (!listaIndividual.length) {
      showToast('Sin anticipos en el período seleccionado', 'warn')
      setHtmlInd(null)
      return
    }
    const total = listaIndividual.reduce((s, a) => s + a.monto, 0)
    setInfoInd(`${listaIndividual.length} anticipo(s) · Total: ${fmtMoney(total)}`)
    setHtmlInd(buildComprobanteAnticipoIndividual(settings, db, listaIndividual, desdeInd, hastaInd, false))
  }

  const imprimirIndividual = () => {
    if (!mecInd) {
      showToast('Selecciona un trabajador', 'err')
      return
    }
    if (!listaIndividual.length) {
      showToast('Sin anticipos en el período seleccionado', 'warn')
      return
    }
    const w = window.open('', '_blank', 'width=820,height=1100')
    if (!w) {
      showToast('Permite ventanas emergentes para imprimir', 'err')
      return
    }
    const html = buildComprobanteAnticipoIndividual(settings, db, listaIndividual, desdeInd, hastaInd, true)
    const mec = db.mecanicos.find((x) => x.id === mecInd)
    w.document.write(
      `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Comprobante — ${mec?.nombre ?? ''}</title></head><body>${html}</body></html>`,
    )
    w.document.close()
    w.focus()
    setTimeout(() => w.print(), 400)
  }

  const previsualizarTodos = () => {
    if (!listaTodos.length) {
      showToast('No hay registros en el período seleccionado', 'warn')
      setHtmlAll(null)
      return
    }
    const total = listaTodos.reduce((s, a) => s + a.monto, 0)
    setInfoAll(`${listaTodos.length} registro(s) · Total: ${fmtMoney(total)}`)
    setHtmlAll(buildComprobanteAnticiposConsolidado(settings, listaTodos, db, desdeAll, hastaAll, false))
  }

  const imprimirTodos = () => {
    if (!listaTodos.length) {
      showToast('No hay registros en el período seleccionado', 'warn')
      return
    }
    const w = window.open('', '_blank', 'width=820,height=1100')
    if (!w) {
      showToast('Permite ventanas emergentes para imprimir', 'err')
      return
    }
    const html = buildComprobanteAnticiposConsolidado(settings, listaTodos, db, desdeAll, hastaAll, true)
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Comprobante consolidado</title></head><body>${html}</body></html>`)
    w.document.close()
    w.focus()
    setTimeout(() => w.print(), 400)
  }

  const mecsOpts = db.mecanicos.filter(mecanicoEnNomina)

  return (
    <div className="card card-ant">
      <div className="card-title">
        <div className="card-title-left">Comprobantes de anticipos</div>
      </div>

      <div className="anticipos-pdf-subtabs">
        <button
          type="button"
          className={pdfSub === 'individual' ? 'anticipos-pdf-sub active' : 'anticipos-pdf-sub'}
          onClick={() => setPdfSub('individual')}
        >
          Comprobante individual
        </button>
        <button
          type="button"
          className={pdfSub === 'todos' ? 'anticipos-pdf-sub active' : 'anticipos-pdf-sub'}
          onClick={() => setPdfSub('todos')}
        >
          Todos los trabajadores
        </button>
      </div>

      {pdfSub === 'individual' && (
        <>
          <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12 }}>
            Selecciona trabajador y período para generar el comprobante personal de anticipos.
          </p>
          <div className="g2-desc" style={{ flexWrap: 'wrap', marginBottom: 12 }}>
            <div className="field">
              <label>Trabajador *</label>
              <select value={mecInd} onChange={(e) => setMecInd(e.target.value)}>
                <option value="">— Seleccionar —</option>
                {mecsOpts.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Desde</label>
              <input type="date" value={desdeInd} onChange={(e) => setDesdeInd(e.target.value)} />
            </div>
            <div className="field">
              <label>Hasta</label>
              <input type="date" value={hastaInd} onChange={(e) => setHastaInd(e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            <button type="button" className="btn btn-primary btn-sm" onClick={previsualizarIndividual}>
              Previsualizar
            </button>
            <button type="button" className="btn btn-sm btn-outline" onClick={imprimirIndividual}>
              Imprimir
            </button>
          </div>
          {htmlInd ? (
            <div className="anticipos-pdf-preview-wrap">
              <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 8 }}>{infoInd}</div>
              <div className="anticipos-pdf-preview-html" dangerouslySetInnerHTML={{ __html: htmlInd }} />
            </div>
          ) : null}
        </>
      )}

      {pdfSub === 'todos' && (
        <>
          <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12 }}>
            Comprobante consolidado del período; opcionalmente filtra por un trabajador.
          </p>
          <div className="g2-desc" style={{ flexWrap: 'wrap', marginBottom: 12 }}>
            <div className="field">
              <label>Desde</label>
              <input type="date" value={desdeAll} onChange={(e) => setDesdeAll(e.target.value)} />
            </div>
            <div className="field">
              <label>Hasta</label>
              <input type="date" value={hastaAll} onChange={(e) => setHastaAll(e.target.value)} />
            </div>
            <div className="field">
              <label>Filtrar trabajador</label>
              <select value={filtroMec} onChange={(e) => setFiltroMec(e.target.value)}>
                <option value="">Todos</option>
                {mecsOpts.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            <button type="button" className="btn btn-primary btn-sm" onClick={previsualizarTodos}>
              Previsualizar
            </button>
            <button type="button" className="btn btn-sm btn-outline" onClick={imprimirTodos}>
              Imprimir todos
            </button>
          </div>
          {htmlAll ? (
            <div className="anticipos-pdf-preview-wrap">
              <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 8 }}>{infoAll}</div>
              <div className="anticipos-pdf-preview-html" dangerouslySetInnerHTML={{ __html: htmlAll }} />
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
