import { type Dispatch, type FormEvent, type SetStateAction, useEffect, useMemo, useState } from 'react'
import type { Db, Mecanico } from './appTypes'
import { mecanicoEnNomina } from './opsHelpers'

type Props = {
  db: Db
  setDb: Dispatch<SetStateAction<Db>>
  showToast: (msg: string, type?: 'ok' | 'err' | 'warn') => void
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

function fmtChile(n: number) {
  return '$' + Number(n || 0).toLocaleString('es-CL')
}

export function MecanicosModule({ db, setDb, showToast }: Props) {
  const [buscar, setBuscar] = useState('')
  const [formKey, setFormKey] = useState(0)
  const [editId, setEditId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Partial<Mecanico>>({})

  const lista = useMemo(() => {
    const q = buscar.toLowerCase().trim()
    if (!q) return db.mecanicos
    return db.mecanicos.filter(
      (m) =>
        m.nombre.toLowerCase().includes(q) ||
        (m.rut || '').toLowerCase().includes(q) ||
        (m.especialidad || '').toLowerCase().includes(q) ||
        (m.tel || '').toLowerCase().includes(q) ||
        (m.email || '').toLowerCase().includes(q),
    )
  }, [db.mecanicos, buscar])

  useEffect(() => {
    if (!editId) {
      setDraft({})
      return
    }
    const m = db.mecanicos.find((x) => x.id === editId)
    if (!m) return
    setDraft({
      nombre: m.nombre,
      rut: m.rut,
      especialidad: m.especialidad,
      tel: m.tel,
      email: m.email,
      sueldoBase: m.sueldoBase ?? 0,
      fechaContrato: m.fechaContrato,
      activo: mecanicoEnNomina(m),
    })
  }, [editId, db.mecanicos])

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const nombre = String(fd.get('m_nom') || '').trim()
    if (!nombre) {
      showToast('El nombre es obligatorio', 'err')
      return
    }
    const activo = String(fd.get('m_est') || 'activo') === 'activo'
    const fc = String(fd.get('m_fc') || '').trim()
    const nuevo: Mecanico = {
      id: uid(),
      nombre,
      rut: String(fd.get('m_rut') || '').trim(),
      especialidad: String(fd.get('m_esp') || '').trim(),
      tel: String(fd.get('m_tel') || '').trim(),
      email: String(fd.get('m_email') || '').trim(),
      sueldoBase: Number(fd.get('m_sueldo')) || 0,
      ...(fc ? { fechaContrato: fc } : {}),
      activo,
      creado: new Date().toISOString(),
    }
    setDb((d) => ({ ...d, mecanicos: [nuevo, ...d.mecanicos] }))
    showToast('Mecánico guardado')
    setFormKey((k) => k + 1)
  }

  const limpiar = () => setFormKey((k) => k + 1)

  const guardarEdicion = () => {
    const nom = String(draft.nombre || '').trim()
    if (!nom) {
      showToast('El nombre es obligatorio', 'err')
      return
    }
    const activo = draft.activo !== false
    setDb((d) => ({
      ...d,
      mecanicos: d.mecanicos.map((m) =>
        m.id === editId
          ? {
              ...m,
              nombre: nom,
              rut: String(draft.rut || '').trim(),
              especialidad: String(draft.especialidad || '').trim(),
              tel: String(draft.tel || '').trim(),
              email: String(draft.email || '').trim(),
              sueldoBase: Number(draft.sueldoBase) || 0,
              fechaContrato: String(draft.fechaContrato || '').trim() || undefined,
              activo,
            }
          : m,
      ),
    }))
    showToast('Datos actualizados')
    setEditId(null)
  }

  const eliminar = (id: string) => {
    if (!window.confirm('¿Eliminar este mecánico del equipo?')) return
    setDb((d) => ({ ...d, mecanicos: d.mecanicos.filter((m) => m.id !== id) }))
    showToast('Mecánico eliminado')
    if (editId === id) setEditId(null)
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
            <label>RUT</label>
            <input name="m_rut" placeholder="12.345.678-9" autoComplete="off" />
          </div>
          <div className="field">
            <label>Sueldo base ($)</label>
            <input name="m_sueldo" type="number" min={0} step={1} placeholder="0" />
          </div>
          <div className="field">
            <label>Fecha contrato</label>
            <input name="m_fc" type="date" title="Opcional — vacaciones / antigüedad" />
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
          <div className="card-title-left rpm-equipo-accent">Equipo</div>
          <span className="card-count">
            {lista.length} mecánico{lista.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="sbar sbar-full">
          <input
            className="input-buscar-clientes"
            placeholder="Buscar nombre, RUT, especialidad..."
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
          <div className="tw tw-equipo zebra-equipo">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>RUT</th>
                  <th>Especialidad</th>
                  <th>Sueldo base</th>
                  <th>Estado</th>
                  <th className="th-actions">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((m) => (
                  <tr key={m.id}>
                    <td style={{ fontWeight: 500 }}>{m.nombre}</td>
                    <td className="td-mono td-cli-rut">{m.rut || '—'}</td>
                    <td>{m.especialidad || '—'}</td>
                    <td className="td-mono">{m.sueldoBase ? fmtChile(m.sueldoBase) : '—'}</td>
                    <td>
                      <span className={`badge ${mecanicoEnNomina(m) ? 'b-green' : 'b-gray'}`}>
                        {mecanicoEnNomina(m) ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>
                      <div className="row-acts">
                        <button type="button" className="btn btn-xs" onClick={() => setEditId(m.id)}>
                          ✏ Editar
                        </button>
                        <button type="button" className="btn btn-xs btn-red" onClick={() => eliminar(m.id)}>
                          Eliminar
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

      {editId ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setEditId(null)}>
          <div className="modal-box" role="dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <h3 className="modal-h3">Editar mecánico</h3>
            <div className="g3 form-mecanicos" style={{ marginTop: 12 }}>
              <div className="field field-span-full">
                <label>Nombre *</label>
                <input value={draft.nombre ?? ''} onChange={(e) => setDraft((d) => ({ ...d, nombre: e.target.value }))} />
              </div>
              <div className="field">
                <label>RUT</label>
                <input value={draft.rut ?? ''} onChange={(e) => setDraft((d) => ({ ...d, rut: e.target.value }))} />
              </div>
              <div className="field">
                <label>Especialidad</label>
                <input
                  value={draft.especialidad ?? ''}
                  onChange={(e) => setDraft((d) => ({ ...d, especialidad: e.target.value }))}
                />
              </div>
              <div className="field">
                <label>Sueldo base ($)</label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={draft.sueldoBase ?? 0}
                  onChange={(e) => setDraft((d) => ({ ...d, sueldoBase: Number(e.target.value) || 0 }))}
                />
              </div>
              <div className="field">
                <label>Fecha contrato</label>
                <input
                  type="date"
                  value={draft.fechaContrato ?? ''}
                  onChange={(e) => setDraft((d) => ({ ...d, fechaContrato: e.target.value || undefined }))}
                />
              </div>
              <div className="field">
                <label>Teléfono</label>
                <input value={draft.tel ?? ''} onChange={(e) => setDraft((d) => ({ ...d, tel: e.target.value }))} />
              </div>
              <div className="field">
                <label>Email</label>
                <input
                  type="email"
                  value={draft.email ?? ''}
                  onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
                />
              </div>
              <div className="field field-span-full">
                <label>Estado</label>
                <select
                  value={draft.activo !== false ? 'activo' : 'inactivo'}
                  onChange={(e) => setDraft((d) => ({ ...d, activo: e.target.value === 'activo' }))}
                >
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                </select>
              </div>
              <div className="modal-actions field-span-full">
                <button type="button" className="btn btn-primary" onClick={guardarEdicion}>
                  ✓ Guardar cambios
                </button>
                <button type="button" className="btn btn-outline" onClick={() => setEditId(null)}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
