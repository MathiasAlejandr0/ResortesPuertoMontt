import { type Dispatch, type FormEvent, type SetStateAction, useMemo, useState } from 'react'
import type { Db, Mecanico } from './appTypes'

type Props = {
  db: Db
  setDb: Dispatch<SetStateAction<Db>>
  showToast: (msg: string, type?: 'ok' | 'err' | 'warn') => void
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

export function MecanicosModule({ db, setDb, showToast }: Props) {
  const [buscar, setBuscar] = useState('')
  const [formKey, setFormKey] = useState(0)

  const lista = useMemo(() => {
    const q = buscar.toLowerCase().trim()
    if (!q) return db.mecanicos
    return db.mecanicos.filter(
      (m) =>
        m.nombre.toLowerCase().includes(q) ||
        (m.especialidad || '').toLowerCase().includes(q) ||
        (m.tel || '').toLowerCase().includes(q) ||
        (m.email || '').toLowerCase().includes(q),
    )
  }, [db.mecanicos, buscar])

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const nombre = String(fd.get('m_nom') || '').trim()
    if (!nombre) {
      showToast('El nombre es obligatorio', 'err')
      return
    }
    const activo = String(fd.get('m_est') || 'activo') === 'activo'
    const nuevo: Mecanico = {
      id: uid(),
      nombre,
      especialidad: String(fd.get('m_esp') || '').trim(),
      tel: String(fd.get('m_tel') || '').trim(),
      email: String(fd.get('m_email') || '').trim(),
      activo,
      creado: new Date().toISOString(),
    }
    setDb((d) => ({ ...d, mecanicos: [nuevo, ...d.mecanicos] }))
    showToast('Mecánico guardado')
    setFormKey((k) => k + 1)
  }

  const limpiar = () => setFormKey((k) => k + 1)

  const eliminar = (id: string) => {
    if (!window.confirm('¿Eliminar este mecánico del equipo?')) return
    setDb((d) => ({ ...d, mecanicos: d.mecanicos.filter((m) => m.id !== id) }))
    showToast('Mecánico eliminado')
  }

  return (
    <>
      <div className="card card-clientes-form">
        <div className="card-title">
          <div className="card-title-left">Registrar mecánico</div>
        </div>
        <form key={formKey} className="form-mecanicos" onSubmit={onSubmit}>
          <div className="field">
            <label>Nombre completo *</label>
            <input name="m_nom" required placeholder="Juan Pérez" autoComplete="name" />
          </div>
          <div className="field">
            <label>Especialidad</label>
            <input name="m_esp" placeholder="Mecánica general, electricidad..." autoComplete="off" />
          </div>
          <div className="field">
            <label>Teléfono</label>
            <input name="m_tel" type="tel" placeholder="+56 9..." autoComplete="tel" />
          </div>
          <div className="field">
            <label>Email</label>
            <input name="m_email" type="email" placeholder="mecánico@taller.cl" autoComplete="email" />
          </div>
          <div className="field">
            <label>Estado</label>
            <select name="m_est" defaultValue="activo">
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </div>
          <div className="form-row-actions form-mec-actions">
            <button type="submit" className="btn btn-primary btn-guardar">
              ✓ Guardar
            </button>
            <button type="button" className="btn btn-outline" onClick={limpiar}>
              ↺ Limpiar
            </button>
          </div>
        </form>
      </div>

      <div className="card card-clientes-lista">
        <div className="card-title">
          <div className="card-title-left">Equipo</div>
          <span className="card-count">
            {lista.length} mecánico{lista.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="sbar sbar-full">
          <input
            className="input-buscar-clientes"
            placeholder="Buscar nombre, especialidad, teléfono..."
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
          />
        </div>
        {!lista.length ? (
          <div className="empty empty-clientes">
            <div className="empty-icon" aria-hidden>
              👷
            </div>
            <div>No hay mecánicos</div>
          </div>
        ) : (
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Especialidad</th>
                  <th>Teléfono</th>
                  <th>Email</th>
                  <th>Estado</th>
                  <th className="th-actions">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((m) => (
                  <tr key={m.id}>
                    <td className="td-nombre">{m.nombre}</td>
                    <td>{m.especialidad || '—'}</td>
                    <td>{m.tel || '—'}</td>
                    <td>{m.email || '—'}</td>
                    <td>
                      <span className={`badge ${m.activo ? 'b-mec-activo' : 'b-mec-inactivo'}`}>
                        {m.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>
                      <button type="button" className="btn btn-xs btn-red" onClick={() => eliminar(m.id)}>
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
