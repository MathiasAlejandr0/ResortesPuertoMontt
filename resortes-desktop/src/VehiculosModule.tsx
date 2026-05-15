import {
  type ChangeEvent,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { AppSettings, Cliente, Db, Orden, Vehiculo, Venta } from './appTypes'
import { openWhatsAppUrl } from './whatsappOpen'

const COMBUSTIBLES = ['Diésel', 'Bencina', 'Híbrido', 'Eléctrico', 'GNC']

type Props = {
  db: Db
  setDb: Dispatch<SetStateAction<Db>>
  settings: AppSettings
  showToast: (msg: string, type?: 'ok' | 'err' | 'warn') => void
  vehClientePref: string
  setVehClientePref: (s: string) => void
  onIrOrden?: () => void
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

function fmtPeso(n: number) {
  return '$' + Number(n || 0).toLocaleString('es-CL')
}

function fmtN(n: number) {
  return Number(n || 0).toLocaleString('es-CL')
}

function otVencida(o: Pick<Orden, 'fechaEst' | 'estado'>): boolean {
  const hoy = new Date().toISOString().slice(0, 10)
  return Boolean(o.fechaEst && o.fechaEst < hoy && o.estado !== 'Listo' && o.estado !== 'Entregado')
}

function estadoOtEtiqueta(o: Orden): string {
  return otVencida(o) ? 'Vencido' : o.estado
}

function trabajoOtResumen(o: Orden): string {
  const parts = [o.diag?.trim(), o.obs?.trim()].filter(Boolean)
  const s = parts.join(' · ')
  return s || '—'
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

export function VehiculosModule({
  db,
  setDb,
  settings,
  showToast,
  vehClientePref,
  setVehClientePref,
  onIrOrden,
}: Props) {
  const [q, setQ] = useState('')
  const [formKey, setFormKey] = useState(0)
  const [cliSearch, setCliSearch] = useState('')
  const [cliId, setCliId] = useState('')
  const [cliOpen, setCliOpen] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())
  const fileRef = useRef<HTMLInputElement>(null)

  const tallerNom = settings.empresa.nombre?.trim() || 'el taller'

  const clientesMatch = useMemo(() => {
    const t = cliSearch.toLowerCase().trim()
    if (!t) return []
    return db.clientes
      .filter((c) => c.nombre.toLowerCase().includes(t) || (c.rut || '').toLowerCase().includes(t))
      .slice(0, 12)
  }, [db.clientes, cliSearch])

  useEffect(() => {
    if (!vehClientePref) return
    const c = db.clientes.find((x) => x.id === vehClientePref)
    if (c) {
      setCliId(c.id)
      setCliSearch(c.nombre)
    }
  }, [vehClientePref, db.clientes])

  const lista = useMemo(() => {
    const qq = q.toLowerCase().trim()
    if (!qq) return db.vehiculos
    return db.vehiculos.filter(
      (v) =>
        v.patente.toLowerCase().includes(qq) ||
        v.clienteNombre.toLowerCase().includes(qq) ||
        (v.marca || '').toLowerCase().includes(qq) ||
        (v.modelo || '').toLowerCase().includes(qq),
    )
  }, [db.vehiculos, q])

  const toggleExp = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const irOt = useCallback(
    (folio: string) => {
      try {
        sessionStorage.setItem('rpm-expand-ot', folio)
      } catch {
        /* ignore */
      }
      onIrOrden?.()
    },
    [onIrOrden],
  )

  const onPickCliente = (c: Cliente) => {
    setCliId(c.id)
    setCliSearch(c.nombre)
    setVehClientePref(c.id)
    setCliOpen(false)
  }

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const cid = cliId || String(fd.get('vh_cli_h') || '')
    const pat = String(fd.get('vh_pat') || '').trim().toUpperCase()
    if (!cid || !pat) {
      showToast('Selecciona propietario y patente', 'err')
      return
    }
    if (db.vehiculos.some((v) => v.patente === pat)) {
      showToast('Ya existe un vehículo con esa patente', 'err')
      return
    }
    const c = db.clientes.find((x) => x.id === cid)
    if (!c) return
    const imgsRaw = String(fd.get('vh_imgs_data') || '').trim()
    let imgs: string[] | undefined
    if (imgsRaw) {
      try {
        const p = JSON.parse(imgsRaw) as unknown
        if (Array.isArray(p)) imgs = p.map((x) => String(x)).filter(Boolean)
      } catch {
        /* ignore */
      }
    }
    const v: Vehiculo = {
      id: uid(),
      clienteId: cid,
      clienteNombre: c.nombre,
      clienteRut: c.rut || undefined,
      patente: pat,
      marca: String(fd.get('vh_marca') || '').trim(),
      modelo: String(fd.get('vh_mod') || '').trim(),
      anio: String(fd.get('vh_anio') || '').trim(),
      color: String(fd.get('vh_col') || '').trim(),
      combustible: String(fd.get('vh_comb') || '').trim(),
      vin: String(fd.get('vh_vin') || '').trim(),
      km: Number(fd.get('vh_km')) || 0,
      creado: new Date().toISOString(),
      obs: String(fd.get('vh_obs') || '').trim() || undefined,
      imgs,
    }
    setDb((d) => ({ ...d, vehiculos: [v, ...d.vehiculos] }))
    showToast(`Vehículo ${pat} registrado`)
    setFormKey((k) => k + 1)
    setCliSearch('')
    setCliId('')
    setVehClientePref('')
  }

  const limpiar = () => {
    setFormKey((k) => k + 1)
    setCliSearch('')
    setCliId('')
    setVehClientePref('')
  }

  const agregarFotos = (ev: ChangeEvent<HTMLInputElement>) => {
    const files = ev.target.files
    if (!files?.length) return
    const input = fileRef.current
    const hid = document.getElementById('vh-imgs-data-react') as HTMLInputElement | null
    let existing: string[] = []
    if (hid?.value) {
      try {
        const p = JSON.parse(hid.value) as unknown
        if (Array.isArray(p)) existing = p.map((x) => String(x))
      } catch {
        /* ignore */
      }
    }
    const readers: Promise<string>[] = []
    for (let i = 0; i < files.length; i++) {
      const f = files[i]
      if (!f.type.startsWith('image/')) continue
      readers.push(
        new Promise((resolve, reject) => {
          const r = new FileReader()
          r.onload = () => resolve(String(r.result || ''))
          r.onerror = () => reject(new Error('read'))
          r.readAsDataURL(f)
        }),
      )
    }
    Promise.all(readers)
      .then((urls) => {
        const merged = [...existing, ...urls].slice(0, 12)
        if (hid) hid.value = JSON.stringify(merged)
        showToast(`${merged.length} foto(s) en cola — se guardan al registrar`, 'ok')
      })
      .catch(() => showToast('No se pudieron leer algunas imágenes', 'err'))
    if (input) input.value = ''
  }

  const eliminarVeh = (id: string) => {
    if (!window.confirm('¿Eliminar vehículo?')) return
    setDb((d) => ({ ...d, vehiculos: d.vehiculos.filter((x) => x.id !== id) }))
    showToast('Vehículo eliminado')
  }

  const waMsg = (nombre: string) =>
    `Hola ${nombre}, te contactamos desde ${tallerNom}.`

  return (
    <div className="vh-mod">
      <div className="card card-vh">
        <div className="card-title">
          <div className="card-title-left">Registrar vehículo</div>
        </div>
        <form key={formKey} className="g4 vh-form-grid" onSubmit={onSubmit}>
          <input type="hidden" name="vh_cli_h" value={cliId} />
          <div className="field ac-wrap vh-ac-wrap">
            <label>Propietario *</label>
            <input
              autoComplete="off"
              placeholder="Buscar cliente por nombre o RUT..."
              value={cliSearch}
              onChange={(e) => {
                setCliSearch(e.target.value)
                setCliOpen(true)
                if (!e.target.value.trim()) setCliId('')
              }}
              onFocus={() => setCliOpen(true)}
              onBlur={() => setTimeout(() => setCliOpen(false), 180)}
            />
            {cliOpen && clientesMatch.length ? (
              <div className="ac-dropdown vh-ac-drop" role="listbox">
                {clientesMatch.map((c) => (
                  <div
                    key={c.id}
                    className="ac-item"
                    role="option"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      onPickCliente(c)
                    }}
                  >
                    <span className="ac-item-name">
                      {c.nombre}
                      {c.rut ? <span style={{ fontWeight: 400, color: 'var(--text2)' }}> · {c.rut}</span> : null}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <div className="field">
            <label>Patente *</label>
            <input name="vh_pat" required placeholder="ABCD12" style={{ textTransform: 'uppercase' }} />
          </div>
          <div className="field">
            <label>Marca</label>
            <input name="vh_marca" placeholder="Toyota" />
          </div>
          <div className="field">
            <label>Modelo</label>
            <input name="vh_mod" placeholder="Corolla" />
          </div>
          <div className="field">
            <label>Año</label>
            <input name="vh_anio" type="number" placeholder="2020" />
          </div>
          <div className="field">
            <label>Color</label>
            <input name="vh_col" placeholder="Blanco" />
          </div>
          <div className="field">
            <label>Kilometraje actual</label>
            <input name="vh_km" type="number" min={0} step={1} placeholder="0" />
          </div>
          <div className="field">
            <label>Combustible</label>
            <select name="vh_comb" defaultValue="Bencina">
              {COMBUSTIBLES.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>VIN / Motor</label>
            <input name="vh_vin" placeholder="Opcional" />
          </div>
          <div className="field field-span-full">
            <label>Observaciones</label>
            <textarea name="vh_obs" placeholder="Estado, notas..." rows={2} />
          </div>
          <div className="field field-span-full vh-fotos-block">
            <div className="vh-fotos-sec-head">
              Fotos del vehículo <span className="vh-fotos-sec-sub">ingreso / estado general</span>
            </div>
            <label className="vh-fotos-upload">
              📷 Agregar fotos
              <input ref={fileRef} type="file" accept="image/*" multiple className="vh-fotos-input" onChange={agregarFotos} />
            </label>
            <input type="hidden" name="vh_imgs_data" id="vh-imgs-data-react" defaultValue="" />
          </div>
          <div className="form-row-actions field-span-full">
            <button type="submit" className="btn btn-primary btn-guardar vh-btn-save">
              ✓ Guardar
            </button>
            <button type="button" className="btn btn-outline" onClick={limpiar}>
              ↺ Limpiar
            </button>
          </div>
        </form>
      </div>

      <div className="card card-vh">
        <div className="card-title">
          <div className="card-title-left">Vehículos registrados</div>
          <span className="card-count">
            {lista.length} vehículo{lista.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="sbar sbar-full">
          <input
            className="input-buscar-clientes"
            placeholder="Buscar patente, marca, modelo, propietario..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        {!lista.length ? (
          <div className="empty">
            <div className="empty-icon">🚗</div>
            <div>No hay vehículos</div>
          </div>
        ) : (
          <div className="vh-lista">
            {lista.map((v) => {
              const cli = db.clientes.find((x) => x.id === v.clienteId)
              const rutDisp = v.clienteRut || cli?.rut || '—'
              const histVentas = db.ventas.filter((x: Venta) => x.vehiculoId === v.id).length
              const histOT = db.ordenes.filter((o) => o.vehiculoId === v.id)
              const kmsOt = histOT.filter((o) => o.km).map((o) => o.km)
              const ultimoKm = kmsOt.length > 0 ? Math.max(...kmsOt, v.km || 0) : v.km || 0
              const open = expanded.has(v.id)
              const histRows = [...histOT].sort((a, b) => (b.fechaIn > a.fechaIn ? 1 : -1))

              return (
                <div key={v.id} className="exp-row">
                  <div
                    className="exp-hdr vh-exp-hdr"
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleExp(v.id)}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggleExp(v.id)}
                  >
                    <div className="vh-exp-hdr-left">
                      <span className="badge b-orange vh-plate-badge">{v.patente}</span>
                      <span className="vh-exp-model">
                        {[v.marca, v.modelo].filter(Boolean).join(' ') || 'Sin especificar'}
                      </span>
                      {v.anio ? <span className="vh-exp-anio">{v.anio}</span> : null}
                      {v.combustible ? (
                        <span className="badge b-gray vh-comb-badge">{v.combustible}</span>
                      ) : null}
                    </div>
                    <div className="vh-exp-hdr-right">
                      <div className="vh-exp-owner">{v.clienteNombre}</div>
                      <div className="vh-exp-meta">
                        {[ultimoKm ? `${fmtN(ultimoKm)} km` : null, `${histVentas} visita${histVentas !== 1 ? 's' : ''}`]
                          .filter(Boolean)
                          .join(' · ')}
                      </div>
                    </div>
                  </div>
                  {open ? (
                    <div className="exp-body vh-exp-body">
                      <div className="vh-detail-cols">
                        <div className="vh-detail-stack">
                          <div className="vh-detail-line">
                            <span className="vh-detail-k">Propietario:</span>{' '}
                            <strong>{v.clienteNombre}</strong>
                          </div>
                          {cli?.tel ? (
                            <div className="vh-detail-line">
                              <span className="vh-detail-k">Teléfono:</span> {cli.tel}
                            </div>
                          ) : (
                            <div className="vh-detail-line">
                              <span className="vh-detail-k">Teléfono:</span> —
                            </div>
                          )}
                          {cli?.email ? (
                            <div className="vh-detail-line">
                              <span className="vh-detail-k">Email:</span> {cli.email}
                            </div>
                          ) : null}
                          {v.obs ? (
                            <div className="vh-obs-line">
                              <span className="vh-obs-ico" aria-hidden>
                                📄
                              </span>{' '}
                              {v.obs}
                            </div>
                          ) : null}
                          {v.histKm?.length ? (
                            <div style={{ marginTop: 12 }}>
                              <div className="vh-hist-title">Historial kilometraje</div>
                              <div className="tw tw-vh-hist" style={{ marginTop: 6 }}>
                                <table className="vh-hist-table">
                                  <thead>
                                    <tr>
                                      <th>Fecha</th>
                                      <th className="tr">Km</th>
                                      <th>Nota</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {v.histKm.map((h, ix) => (
                                      <tr key={ix}>
                                        <td className="td-mono">{h.fecha?.trim() || '—'}</td>
                                        <td className="tr td-mono">
                                          {h.km != null && Number.isFinite(h.km) ? `${fmtN(h.km)} km` : '—'}
                                        </td>
                                        <td>{h.obs?.trim() || '—'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          ) : null}
                        </div>
                        <div className="vh-detail-line">
                          <span className="vh-detail-k">RUT:</span> {rutDisp}
                        </div>
                        <div className="vh-detail-line">
                          <span className="vh-detail-k">Color:</span> {v.color || '—'}
                        </div>
                        <div className="vh-detail-line">
                          <span className="vh-detail-k">VIN/Motor:</span> {v.vin || '—'}
                        </div>
                      </div>
                      {v.imgs?.length ? (
                        <>
                          <div className="vh-imgs-title">📷 Fotos del vehículo ({v.imgs.length})</div>
                          <div className="vh-imgs-row">
                            {v.imgs.map((src, ix) => (
                              <button
                                key={ix}
                                type="button"
                                className="vh-img-thumb"
                                onClick={() => window.open(src, '_blank')}
                              >
                                <img src={src} alt="" />
                              </button>
                            ))}
                          </div>
                        </>
                      ) : null}
                      <div className="vh-hist-title">Historial de servicios</div>
                      {!histRows.length ? (
                        <div style={{ fontSize: 12, color: 'var(--text3)', padding: '8px 0' }}>
                          Sin historial de servicios aún
                        </div>
                      ) : (
                        <div className="tw tw-vh-hist">
                          <table className="vh-hist-table">
                            <thead>
                              <tr>
                                <th>N° orden</th>
                                <th>Fecha</th>
                                <th>Km</th>
                                <th>Trabajo</th>
                                <th>Estado</th>
                                <th className="tr">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {histRows.map((o) => (
                                <tr key={o.folio}>
                                  <td className="vh-td-folio">
                                    <span className="folio-tag">{o.folio}</span>
                                    <button type="button" className="btn btn-xs btn-primary vh-ver-ot" onClick={() => irOt(o.folio)}>
                                      Ver OT
                                    </button>
                                  </td>
                                  <td className="td-mono vh-td-fecha">{o.fechaIn || '—'}</td>
                                  <td className="td-mono">{o.km ? `${fmtN(o.km)} km` : '—'}</td>
                                  <td className="vh-td-trabajo">{trabajoOtResumen(o)}</td>
                                  <td>
                                    <span className={`status-pill vh-estado-pill ${estadoOtClass(o)}`}>{estadoOtEtiqueta(o)}</span>
                                  </td>
                                  <td className="tr td-mono vh-td-total">{fmtPeso(o.total)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      <div className="vh-card-actions">
                        {cli?.tel ? (
                          <button
                            type="button"
                            className="btn btn-xs btn-green vh-btn-wa"
                            onClick={(e) => {
                              e.stopPropagation()
                              openWhatsAppUrl(cli.tel!, waMsg(v.clienteNombre))
                            }}
                          >
                            <span className="vh-wa-ico" aria-hidden>
                              💬
                            </span>{' '}
                            WhatsApp
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="btn btn-xs vh-btn-delete"
                          onClick={(e) => {
                            e.stopPropagation()
                            eliminarVeh(v.id)
                          }}
                        >
                          Eliminar vehículo
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
