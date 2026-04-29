import { type Dispatch, type FormEvent, type SetStateAction } from 'react'
import type { AppSettings, Db } from './appTypes'

type Props = {
  db: Db
  settings: AppSettings
  setSettings: Dispatch<SetStateAction<AppSettings>>
  showToast: (msg: string, type?: 'ok' | 'err' | 'warn') => void
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

export function VacacionesModule({ db, settings, setSettings, showToast }: Props) {
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const mecanicoId = String(fd.get('mec') || '')
    const desde = String(fd.get('desde') || '')
    const hasta = String(fd.get('hasta') || '')
    const m = db.mecanicos.find((x) => x.id === mecanicoId)
    if (!m || !desde || !hasta) return showToast('Completa los campos requeridos', 'err')
    setSettings((s) => ({
      ...s,
      extras: {
        ...s.extras,
        vacaciones: [{ id: uid(), mecanicoId, mecanicoNombre: m.nombre, desde, hasta, diasHabiles: 0, obs: '', creado: new Date().toISOString() }, ...s.extras.vacaciones],
      },
    }))
    e.currentTarget.reset()
    showToast('Vacaciones registradas')
  }

  return (
    <>
      <div className="card">
        <div className="card-title"><div className="card-title-left">Vacaciones</div></div>
        <form className="g3" onSubmit={onSubmit}>
          <div className="field"><label>Mecánico</label><select name="mec" required><option value="">— Seleccionar —</option>{db.mecanicos.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}</select></div>
          <div className="field"><label>Desde</label><input type="date" name="desde" required /></div>
          <div className="field"><label>Hasta</label><input type="date" name="hasta" required /></div>
          <div className="form-row-actions"><button className="btn btn-primary">Guardar</button></div>
        </form>
      </div>
      <div className="card">
        <div className="card-title"><div className="card-title-left">Historial</div></div>
        <div className="tw"><table><tbody>{settings.extras.vacaciones.map((v) => <tr key={v.id}><td>{v.mecanicoNombre}</td><td>{v.desde}</td><td>{v.hasta}</td></tr>)}</tbody></table></div>
      </div>
    </>
  )
}
