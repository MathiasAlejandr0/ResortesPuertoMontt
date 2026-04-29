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

export function ProveedoresModule({ settings, setSettings, showToast }: Props) {
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const nombre = String(fd.get('nombre') || '').trim()
    if (!nombre) return showToast('Nombre obligatorio', 'err')
    setSettings((s) => ({
      ...s,
      extras: {
        ...s.extras,
        proveedores: [{ id: uid(), nombre, rut: '', tel: '', email: '', rubro: String(fd.get('rubro') || ''), condicionPago: '', obs: '', creado: new Date().toISOString() }, ...s.extras.proveedores],
      },
    }))
    e.currentTarget.reset()
    showToast('Proveedor guardado')
  }

  return (
    <>
      <div className="card">
        <div className="card-title"><div className="card-title-left">Proveedores</div></div>
        <form className="g3" onSubmit={onSubmit}>
          <div className="field"><label>Nombre</label><input name="nombre" required /></div>
          <div className="field"><label>Rubro</label><input name="rubro" /></div>
          <div className="form-row-actions"><button className="btn btn-primary">Guardar</button></div>
        </form>
      </div>
      <div className="card">
        <div className="card-title"><div className="card-title-left">Listado</div></div>
        <div className="tw"><table><tbody>{settings.extras.proveedores.map((p) => <tr key={p.id}><td>{p.nombre}</td><td>{p.rubro || '—'}</td></tr>)}</tbody></table></div>
      </div>
    </>
  )
}
