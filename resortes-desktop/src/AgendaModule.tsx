import { type Dispatch, type FormEvent, type SetStateAction } from 'react'
import type { AppSettings } from './appTypes'

type Props = {
  settings: AppSettings
  setSettings: Dispatch<SetStateAction<AppSettings>>
  showToast: (msg: string, type?: 'ok' | 'err' | 'warn') => void
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

export function AgendaModule({ settings, setSettings, showToast }: Props) {
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const titulo = String(fd.get('titulo') || '').trim()
    if (!titulo) return showToast('Título obligatorio', 'err')
    const detalle = String(fd.get('detalle') || '').trim()
    setSettings((s) => ({
      ...s,
      extras: {
        ...s.extras,
        agendaNotas: [{ id: uid(), titulo, detalle, fecha: today(), estado: 'pendiente', creado: new Date().toISOString() }, ...s.extras.agendaNotas],
      },
    }))
    e.currentTarget.reset()
    showToast('Nota guardada')
  }

  return (
    <>
      <div className="card">
        <div className="card-title"><div className="card-title-left">Agenda</div></div>
        <form className="g3" onSubmit={onSubmit}>
          <div className="field"><label>Título</label><input name="titulo" required /></div>
          <div className="field field-span-full"><label>Detalle</label><textarea name="detalle" rows={2} /></div>
          <div className="form-row-actions"><button className="btn btn-primary">Guardar</button></div>
        </form>
      </div>
      <div className="card">
        <div className="card-title"><div className="card-title-left">Notas registradas</div></div>
        <div className="tw"><table><tbody>{settings.extras.agendaNotas.map((n) => <tr key={n.id}><td>{n.titulo}</td><td>{n.fecha}</td></tr>)}</tbody></table></div>
      </div>
    </>
  )
}
