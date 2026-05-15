import { type Dispatch, type FormEvent, type SetStateAction, useEffect, useMemo, useState } from 'react'
import type { Cliente, ClienteTipo, Db, Orden, Vehiculo, Venta } from './appTypes'
import { isoDateToDdMmYyyy } from './dateFormat'

type Props = {
  db: Db
  setDb: Dispatch<SetStateAction<Db>>
  showToast: (msg: string, type?: 'ok' | 'err' | 'warn') => void
  onIrVehiculo: (clienteId: string) => void
  /** Cierra vista cliente, navega a Órdenes y expande la OT si existe */
  onIrOrden?: (folio: string) => void
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

function fmtPeso(n: number) {
  return (
    '$' +
    Math.round(n)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  )
}

function otVencida(o: Pick<Orden, 'fechaEst' | 'estado'>): boolean {
  const hoy = new Date().toISOString().slice(0, 10)
  return Boolean(o.fechaEst && o.fechaEst < hoy && o.estado !== 'Listo' && o.estado !== 'Entregado')
}

function estadoOtEtiqueta(o: Orden): string {
  return otVencida(o) ? 'Vencido' : o.estado
}

function estadoOtClass(o: Orden): string {
  if (otVencida(o)) return 'rpm-ot-venc'
  switch (o.estado) {
    case 'Recibido':
      return 'rpm-ot-rec'
    case 'En proceso':
      return 'rpm-ot-proc'
    case 'Listo':
      return 'rpm-ot-listo'
    case 'Entregado':
      return 'rpm-ot-entregado'
    default:
      return 'rpm-ot-rec'
  }
}

export function ClientesModule({ db, setDb, showToast, onIrVehiculo, onIrOrden }: Props) {
  const [buscar, setBuscar] = useState('')
  const [formKey, setFormKey] = useState(0)
  const [tipoRegistro, setTipoRegistro] = useState<ClienteTipo>('persona')
  const [viewId, setViewId] = useState<string | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Partial<Cliente>>({})

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

  const clienteEnView = viewId ? db.clientes.find((c) => c.id === viewId) : undefined

  useEffect(() => {
    if (!editId) {
      setEditDraft({})
      return
    }
    const c = db.clientes.find((x) => x.id === editId)
    if (!c) return
    setEditDraft({
      nombre: c.nombre,
      rut: c.rut,
      tel: c.tel,
      email: c.email,
      dir: c.dir,
      origen: c.origen,
      obs: c.obs,
      tipo: c.tipo ?? 'persona',
      contactoNom: c.contactoNom ?? '',
      contactoCargo: c.contactoCargo ?? '',
      contactoTel: c.contactoTel ?? '',
      contactoEmail: c.contactoEmail ?? '',
    })
  }, [editId, db.clientes])

  const datosVista = useMemo(() => {
    const c = clienteEnView
    if (!c) return null
    const vehs = vehiculosDeCliente(c.id)
    const ots = db.ordenes
      .filter((o) => o.clienteId === c.id)
      .sort((a, b) => (b.fechaIn > a.fechaIn ? 1 : -1))
    const ventas = db.ventas.filter((v) => v.clienteId === c.id)
    const totalGastado = ventas.reduce((s: number, v: Venta) => s + v.total, 0)
    return { c, vehs, ots, ventas, totalGastado }
  }, [clienteEnView, db])

  const rutDuplicado = (rut: string, exceptId?: string) => {
    const r = rut.trim().toLowerCase()
    if (!r) return false
    return db.clientes.some((c) => c.id !== exceptId && c.rut.trim().toLowerCase() === r)
  }

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const nombre = String(fd.get('c_nom') || '').trim()
    const rut = String(fd.get('c_rut') || '').trim()
    const tipo = (String(fd.get('c_tipo') || 'persona') === 'empresa' ? 'empresa' : 'persona') as ClienteTipo
    if (!nombre) {
      showToast('El nombre es obligatorio', 'err')
      return
    }
    if (rutDuplicado(rut)) {
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
      tipo,
      ...(tipo === 'empresa'
        ? {
            contactoNom: String(fd.get('c_contacto_nom') || '').trim(),
            contactoCargo: String(fd.get('c_contacto_cargo') || '').trim(),
            contactoTel: String(fd.get('c_contacto_tel') || '').trim(),
            contactoEmail: String(fd.get('c_contacto_email') || '').trim(),
          }
        : {}),
    }
    setDb((d) => ({ ...d, clientes: [nuevo, ...d.clientes] }))
    showToast('Cliente guardado')
    setFormKey((k) => k + 1)
    setTipoRegistro('persona')
  }

  const limpiar = () => {
    setFormKey((k) => k + 1)
    setTipoRegistro('persona')
  }

  const eliminar = (id: string) => {
    if (!window.confirm('¿Eliminar cliente y sus vehículos?')) return
    setDb((d) => ({
      ...d,
      clientes: d.clientes.filter((c) => c.id !== id),
      vehiculos: d.vehiculos.filter((v) => v.clienteId !== id),
    }))
    showToast('Cliente eliminado')
    if (viewId === id) setViewId(null)
    if (editId === id) setEditId(null)
  }

  const guardarEdicion = () => {
    const nom = String(editDraft.nombre || '').trim()
    if (!nom) {
      showToast('El nombre es obligatorio', 'err')
      return
    }
    const rut = String(editDraft.rut || '').trim()
    if (rutDuplicado(rut, editId ?? undefined)) {
      showToast('Ya existe otro cliente con ese RUT', 'err')
      return
    }
    const tipo = (editDraft.tipo === 'empresa' ? 'empresa' : 'persona') as ClienteTipo
    const mod = new Date().toISOString()
    setDb((d) => ({
      ...d,
      clientes: d.clientes.map((c) => {
        if (c.id !== editId) return c
        return {
          ...c,
          nombre: nom,
          rut,
          tel: String(editDraft.tel || '').trim(),
          email: String(editDraft.email || '').trim(),
          dir: String(editDraft.dir || '').trim(),
          origen: String(editDraft.origen || 'Recomendación'),
          obs: String(editDraft.obs || '').trim(),
          tipo,
          contactoNom: tipo === 'empresa' ? String(editDraft.contactoNom || '').trim() : undefined,
          contactoCargo: tipo === 'empresa' ? String(editDraft.contactoCargo || '').trim() : undefined,
          contactoTel: tipo === 'empresa' ? String(editDraft.contactoTel || '').trim() : undefined,
          contactoEmail: tipo === 'empresa' ? String(editDraft.contactoEmail || '').trim() : undefined,
          modificado: mod,
        }
      }),
    }))
    showToast(`"${nom}" actualizado correctamente`)
    setEditId(null)
  }

  const abrirVerDesdeTabla = (id: string) => setViewId(id)

  const irOtDesdeVista = (folio: string) => {
    setViewId(null)
    try {
      sessionStorage.setItem('rpm-expand-ot', folio)
    } catch {
      /* ignore */
    }
    onIrOrden?.(folio)
  }

  return (
    <>
      <div className="card card-clientes-form">
        <div className="card-title">
          <div className="card-title-left">Registrar cliente</div>
        </div>
        <form key={formKey} className="g3 form-clientes" onSubmit={onSubmit}>
          <div className="field">
            <label>Nombre / Razón social *</label>
            <input name="c_nom" required placeholder="Juan Pérez o Empresa Ltda." autoComplete="organization" />
          </div>
          <div className="field">
            <label>
              RUT <small style={{ color: 'var(--text3)', fontWeight: 400 }}>opcional</small>
            </label>
            <input name="c_rut" placeholder="12.345.678-9" autoComplete="off" />
          </div>
          <div className="field">
            <label>Tipo</label>
            <select
              name="c_tipo"
              value={tipoRegistro}
              onChange={(e) => setTipoRegistro(e.target.value === 'empresa' ? 'empresa' : 'persona')}
              className="select-cli-tipo"
            >
              <option value="persona">Persona natural</option>
              <option value="empresa">Empresa</option>
            </select>
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

          {tipoRegistro === 'empresa' ? (
            <div className="cli-empresa-wrap">
              <div className="cli-empresa-wrap-title">👔 Datos de contacto en empresa</div>
              <div className="g3">
                <div className="field">
                  <label>Nombre contacto</label>
                  <input name="c_contacto_nom" placeholder="María González" />
                </div>
                <div className="field">
                  <label>Cargo</label>
                  <input name="c_contacto_cargo" placeholder="Gerente de operaciones" />
                </div>
                <div className="field">
                  <label>Teléfono directo</label>
                  <input name="c_contacto_tel" placeholder="+56 9 ..." />
                </div>
                <div className="field">
                  <label>Email directo</label>
                  <input name="c_contacto_email" type="email" placeholder="contacto@empresa.cl" />
                </div>
              </div>
            </div>
          ) : null}

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
                  const tipo = c.tipo ?? 'persona'
                  return (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 500 }}>
                        {c.nombre}
                        {tipo === 'empresa' ? (
                          <span className="badge b-blue badge-empresa-cli">
                            Empresa
                          </span>
                        ) : null}
                      </td>
                      <td className="td-mono td-cli-rut">{c.rut || '—'}</td>
                      <td>{c.tel || '—'}</td>
                      <td>{c.email || '—'}</td>
                      <td>
                        {vehs.length ? (
                          vehs.map((v) => (
                            <span key={v.id} className="badge b-orange badge-cli-pat" style={{ marginRight: 2 }}>
                              {v.patente}
                            </span>
                          ))
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td>
                        <div className="row-acts">
                          <button type="button" className="btn btn-xs btn-primary" onClick={() => abrirVerDesdeTabla(c.id)}>
                            👁 Ver
                          </button>
                          <button type="button" className="btn btn-xs" onClick={() => setEditId(c.id)}>
                            ✏ Editar
                          </button>
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

      {datosVista ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setViewId(null)}>
          <div
            className="modal-box cli-view-modal"
            role="dialog"
            aria-labelledby="cli-view-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
              <h3 className="modal-h3" id="cli-view-title">
                {(datosVista.c.tipo ?? 'persona') === 'empresa' ? '🏢 ' : '👤 '}
                {datosVista.c.nombre}
              </h3>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-sm btn-outline" onClick={() => setViewId(null)}>
                  Cerrar
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={() => {
                    setViewId(null)
                    setEditId(datosVista.c.id)
                  }}
                >
                  ✏ Editar
                </button>
              </div>
            </div>
            <div className="modal-body cli-view-body-scroll">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                <div className="cli-view-panel">
                  <div className="cli-view-panel-hdr">Datos de contacto</div>
                  {datosVista.c.rut ? (
                    <div className="cli-view-line">
                      <span className="cli-view-muted">RUT:</span>{' '}
                      <strong className="td-mono">{datosVista.c.rut}</strong>
                    </div>
                  ) : null}
                  {datosVista.c.tel ? (
                    <div className="cli-view-line">
                      <span className="cli-view-muted">Tel:</span>{' '}
                      <a href={`tel:${datosVista.c.tel}`} style={{ color: 'var(--accent)' }}>
                        {datosVista.c.tel}
                      </a>
                    </div>
                  ) : null}
                  {datosVista.c.email ? (
                    <div className="cli-view-line">
                      <span className="cli-view-muted">Email:</span>{' '}
                      <a href={`mailto:${datosVista.c.email}`} style={{ color: 'var(--accent)' }}>
                        {datosVista.c.email}
                      </a>
                    </div>
                  ) : null}
                  {datosVista.c.dir ? (
                    <div className="cli-view-line">
                      <span className="cli-view-muted">Dir:</span> {datosVista.c.dir}
                    </div>
                  ) : null}
                  {datosVista.c.origen ? (
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>Cómo llegó: {datosVista.c.origen}</div>
                  ) : null}
                </div>
                <div className="cli-view-panel">
                  <div className="cli-view-panel-hdr">Resumen</div>
                  <div className="cli-view-line">
                    <span className="cli-view-muted">OTs:</span> <strong>{datosVista.ots.length}</strong>
                  </div>
                  <div className="cli-view-line">
                    <span className="cli-view-muted">Ventas:</span> <strong>{datosVista.ventas.length}</strong>
                  </div>
                  <div className="cli-view-line">
                    <span className="cli-view-muted">Total gastado:</span>{' '}
                    <strong className="td-mono" style={{ color: 'var(--green)' }}>
                      {fmtPeso(datosVista.totalGastado)}
                    </strong>
                  </div>
                  <div className="cli-view-line">
                    <span className="cli-view-muted">Cliente desde:</span>{' '}
                    {isoDateToDdMmYyyy(datosVista.c.creado?.slice(0, 10))}
                  </div>
                </div>
              </div>

              {(datosVista.c.tipo ?? 'persona') === 'empresa' && datosVista.c.contactoNom ? (
                <div className="cli-view-panel" style={{ marginBottom: 12 }}>
                  <div className="cli-view-panel-hdr">👔 Contacto en empresa</div>
                  <div style={{ fontSize: 12, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <span>
                      <strong>{datosVista.c.contactoNom}</strong>
                      {datosVista.c.contactoCargo ? ` · ${datosVista.c.contactoCargo}` : ''}
                    </span>
                    {datosVista.c.contactoTel ? (
                      <a href={`tel:${datosVista.c.contactoTel}`} style={{ color: 'var(--accent)' }}>
                        {datosVista.c.contactoTel}
                      </a>
                    ) : null}
                    {datosVista.c.contactoEmail ? (
                      <a href={`mailto:${datosVista.c.contactoEmail}`} style={{ color: 'var(--accent)' }}>
                        {datosVista.c.contactoEmail}
                      </a>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {datosVista.vehs.length ? (
                <div style={{ marginBottom: 12 }}>
                  <div className="cli-view-section-title">🚗 Vehículos ({datosVista.vehs.length})</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {datosVista.vehs.map((v) => (
                      <div key={v.id} className="cli-view-veh-chip">
                        <span className="badge b-orange">{v.patente}</span>
                        <span style={{ marginLeft: 6 }}>
                          {[v.marca, v.modelo, v.anio].filter(Boolean).join(' ')}
                        </span>
                        {v.combustible ? (
                          <span style={{ fontSize: 10, color: 'var(--text3)', marginLeft: 4 }}>{v.combustible}</span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {datosVista.ots.length ? (
                <div>
                  <div className="cli-view-section-title">🔧 Últimas órdenes de trabajo</div>
                  <div className="tw">
                    <table>
                      <thead>
                        <tr>
                          <th>N° OT</th>
                          <th>Fecha</th>
                          <th>Diagnóstico</th>
                          <th>Estado</th>
                          <th className="tr">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {datosVista.ots.slice(0, 5).map((o) => (
                          <tr key={o.folio}>
                            <td>
                              <button
                                type="button"
                                className="folio-tag folio-tag-link"
                                onClick={() => irOtDesdeVista(o.folio)}
                              >
                                {o.folio}
                              </button>
                            </td>
                            <td style={{ fontSize: 11 }}>{isoDateToDdMmYyyy(o.fechaIn)}</td>
                            <td
                              style={{
                                fontSize: 11,
                                maxWidth: 150,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {o.diag || o.obs || '—'}
                            </td>
                            <td>
                              <span className={`status-pill ${estadoOtClass(o)}`} style={{ fontSize: 10 }}>
                                {estadoOtEtiqueta(o)}
                              </span>
                            </td>
                            <td className="tr td-mono" style={{ fontWeight: 600 }}>
                              {fmtPeso(o.total)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {datosVista.ots.length > 5 ? (
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
                      ... y {datosVista.ots.length - 5} más
                    </div>
                  ) : null}
                </div>
              ) : null}

              {datosVista.c.obs ? (
                <div className="cli-view-obs">📋 {datosVista.c.obs}</div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {editId ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setEditId(null)}>
          <div
            className="modal-box cli-edit-modal"
            role="dialog"
            aria-labelledby="cli-edit-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="modal-h3" id="cli-edit-title">
              Editar cliente
            </h3>
            <div className="modal-body cli-view-body-scroll">
              <div className="g3 form-clientes">
                <div className="field" style={{ gridColumn: '1 / -1' }}>
                  <label>Nombre / Razón social *</label>
                  <input
                    value={editDraft.nombre ?? ''}
                    onChange={(e) => setEditDraft((d) => ({ ...d, nombre: e.target.value }))}
                    placeholder="Juan Pérez o Empresa Ltda."
                  />
                </div>
                <div className="field">
                  <label>
                    RUT <small style={{ color: 'var(--text3)', fontWeight: 400 }}>opcional</small>
                  </label>
                  <input
                    value={editDraft.rut ?? ''}
                    onChange={(e) => setEditDraft((d) => ({ ...d, rut: e.target.value }))}
                    placeholder="12.345.678-9"
                  />
                </div>
                <div className="field">
                  <label>Tipo</label>
                  <select
                    value={editDraft.tipo ?? 'persona'}
                    className="select-cli-tipo"
                    onChange={(e) =>
                      setEditDraft((d) => ({
                        ...d,
                        tipo: e.target.value === 'empresa' ? 'empresa' : 'persona',
                      }))
                    }
                  >
                    <option value="persona">Persona natural</option>
                    <option value="empresa">Empresa</option>
                  </select>
                </div>
                <div className="field">
                  <label>Teléfono</label>
                  <input
                    value={editDraft.tel ?? ''}
                    onChange={(e) => setEditDraft((d) => ({ ...d, tel: e.target.value }))}
                    placeholder="+56 9 1234 5678"
                  />
                </div>
                <div className="field">
                  <label>Email</label>
                  <input
                    type="email"
                    value={editDraft.email ?? ''}
                    onChange={(e) => setEditDraft((d) => ({ ...d, email: e.target.value }))}
                    placeholder="correo@mail.com"
                  />
                </div>
                <div className="field">
                  <label>Dirección</label>
                  <input
                    value={editDraft.dir ?? ''}
                    onChange={(e) => setEditDraft((d) => ({ ...d, dir: e.target.value }))}
                    placeholder="Calle 123, Ciudad"
                  />
                </div>
                <div className="field">
                  <label>Cómo nos conoció</label>
                  <select
                    value={editDraft.origen ?? 'Recomendación'}
                    onChange={(e) => setEditDraft((d) => ({ ...d, origen: e.target.value }))}
                  >
                    <option>Recomendación</option>
                    <option>Google</option>
                    <option>Redes Sociales</option>
                    <option>Publicidad</option>
                    <option>Otro</option>
                  </select>
                </div>
                <div className="field field-span-full">
                  <label>Observaciones</label>
                  <textarea
                    rows={3}
                    value={editDraft.obs ?? ''}
                    onChange={(e) => setEditDraft((d) => ({ ...d, obs: e.target.value }))}
                    placeholder="Notas del cliente..."
                  />
                </div>
              </div>

              {(editDraft.tipo ?? 'persona') === 'empresa' ? (
                <div className="cli-empresa-wrap" style={{ marginTop: 10 }}>
                  <div className="cli-empresa-wrap-title">👔 Datos de contacto en empresa</div>
                  <div className="g3">
                    <div className="field">
                      <label>Nombre contacto</label>
                      <input
                        value={editDraft.contactoNom ?? ''}
                        onChange={(e) => setEditDraft((d) => ({ ...d, contactoNom: e.target.value }))}
                        placeholder="María González"
                      />
                    </div>
                    <div className="field">
                      <label>Cargo</label>
                      <input
                        value={editDraft.contactoCargo ?? ''}
                        onChange={(e) => setEditDraft((d) => ({ ...d, contactoCargo: e.target.value }))}
                        placeholder="Gerente"
                      />
                    </div>
                    <div className="field">
                      <label>Teléfono directo</label>
                      <input
                        value={editDraft.contactoTel ?? ''}
                        onChange={(e) => setEditDraft((d) => ({ ...d, contactoTel: e.target.value }))}
                        placeholder="+56 9 ..."
                      />
                    </div>
                    <div className="field">
                      <label>Email directo</label>
                      <input
                        type="email"
                        value={editDraft.contactoEmail ?? ''}
                        onChange={(e) => setEditDraft((d) => ({ ...d, contactoEmail: e.target.value }))}
                        placeholder="contacto@empresa.cl"
                      />
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="modal-actions" style={{ marginTop: 14 }}>
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
