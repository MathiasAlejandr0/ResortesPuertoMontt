import { type Dispatch, type FormEvent, type SetStateAction, useMemo, useState } from 'react'
import type { Cliente, Db, Vehiculo } from './appTypes'

type Props = {
  db: Db
  setDb: Dispatch<SetStateAction<Db>>
  showToast: (msg: string, type?: 'ok' | 'err' | 'warn') => void
  onIrVehiculo: (clienteId: string) => void
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

export function ClientesModule({ db, setDb, showToast, onIrVehiculo }: Props) {
  const [buscar, setBuscar] = useState('')
  const [formKey, setFormKey] = useState(0)

  const lista = useMemo(() => {
    const q = buscar.toLowerCase().trim()
    if (!q) return db.clientes
    return db.clientes.filter(
      (c) =>
        c.nombre.toLowerCase().includes(q) ||
        c.rut.toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q),
    )
  }, [db.clientes, buscar])

  const vehiculosDeCliente = (id: string): Vehiculo[] => db.vehiculos.filter((v) => v.clienteId === id)

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const nombre = String(fd.get('c_nom') || '').trim()
    const rut = String(fd.get('c_rut') || '').trim()
    if (!nombre || !rut) {
      showToast('Nombre y RUT son obligatorios', 'err')
      return
    }
    if (db.clientes.some((c) => c.rut.toLowerCase() === rut.toLowerCase())) {
      showToast('Ya existe un cliente con ese RUT', 'err')
      return
    }
    const nuevo: Cliente = {
      id: uid(),
      nombre,
      rut,
      tel: String(fd.get('c_tel') || '').trim(),
      email: String(fd.get('c_email') || '').trim(),
      dir: String(fd.get('c_dir') || '').trim(),
      origen: String(fd.get('c_origen') || 'Recomendación'),
      obs: String(fd.get('c_obs') || '').trim(),
      creado: new Date().toISOString(),
    }
    setDb((d) => ({ ...d, clientes: [nuevo, ...d.clientes] }))
    showToast('Cliente guardado')
    setFormKey((k) => k + 1)
  }

  const limpiar = () => setFormKey((k) => k + 1)

  const eliminar = (id: string) => {
    if (!window.confirm('¿Eliminar cliente y sus vehículos?')) return
    setDb((d) => ({
      ...d,
      clientes: d.clientes.filter((c) => c.id !== id),
      vehiculos: d.vehiculos.filter((v) => v.clienteId !== id),
    }))
    showToast('Cliente eliminado')
  }

  return (
    <>
      <div className="card card-clientes-form">
        <div className="card-title">
          <div className="card-title-left">Registrar cliente</div>
        </div>
        <form key={formKey} className="g3 form-clientes" onSubmit={onSubmit}>
          <div className="field">
            <label>Nombre completo *</label>
            <input name="c_nom" required placeholder="Juan Pérez García" autoComplete="name" />
          </div>
          <div className="field">
            <label>RUT *</label>
            <input name="c_rut" required placeholder="12.345.678-9" autoComplete="off" />
          </div>
          <div className="field">
            <label>Teléfono</label>
            <input name="c_tel" type="tel" placeholder="+56 9 1234 5678" autoComplete="tel" />
          </div>
          <div className="field">
            <label>Email</label>
            <input name="c_email" type="email" placeholder="correo@mail.com" autoComplete="email" />
          </div>
          <div className="field">
            <label>Dirección</label>
            <input name="c_dir" placeholder="Calle 123, Ciudad" autoComplete="street-address" />
          </div>
          <div className="field">
            <label>Cómo nos conoció</label>
            <select name="c_origen" defaultValue="Recomendación">
              <option>Recomendación</option>
              <option>Google</option>
              <option>Redes Sociales</option>
              <option>Publicidad</option>
              <option>Otro</option>
            </select>
          </div>
          <div className="field field-span-full">
            <label>Observaciones</label>
            <textarea name="c_obs" rows={3} placeholder="Notas del cliente..." />
          </div>
          <div className="form-row-actions">
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
          <div className="card-title-left">Clientes registrados</div>
          <span className="card-count">
            {lista.length} cliente{lista.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="sbar sbar-full">
          <input
            className="input-buscar-clientes"
            placeholder="Buscar nombre, RUT, email..."
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
          />
        </div>
        {!lista.length ? (
          <div className="empty empty-clientes">
            <div className="empty-icon empty-icon-cliente" aria-hidden>
              👤
            </div>
            <div>No hay clientes</div>
          </div>
        ) : (
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>RUT</th>
                  <th>Teléfono</th>
                  <th>Email</th>
                  <th>Vehículos</th>
                  <th className="th-actions">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((c) => {
                  const vehs = vehiculosDeCliente(c.id)
                  return (
                    <tr key={c.id}>
                      <td className="td-nombre">{c.nombre}</td>
                      <td className="td-mono">{c.rut}</td>
                      <td>{c.tel || '—'}</td>
                      <td>{c.email || '—'}</td>
                      <td>
                        {vehs.length ? (
                          vehs.map((v) => (
                            <span key={v.id} className="badge b-patente">
                              {v.patente}
                            </span>
                          ))
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td>
                        <div className="row-acts">
                          <button type="button" className="btn btn-xs" onClick={() => onIrVehiculo(c.id)}>
                            + Veh.
                          </button>
                          <button type="button" className="btn btn-xs btn-red" onClick={() => eliminar(c.id)}>
                            Eliminar
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
    </>
  )
}
