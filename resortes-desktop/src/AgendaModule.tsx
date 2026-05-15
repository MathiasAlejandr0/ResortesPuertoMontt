import {
  type Dispatch,
  type FormEvent,
  type SetStateAction,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { AgendaRecordatorio, AgendaReserva, AppSettings, Db } from './appTypes'
import { isoDateToDdMmYyyy } from './dateFormat'
import { mecanicoEnNomina, vehiculosFiltradosCliente } from './opsHelpers'

type Props = {
  db: Db
  settings: AppSettings
  setSettings: Dispatch<SetStateAction<AppSettings>>
  showToast: (msg: string, type?: 'ok' | 'err' | 'warn') => void
  /** Para acercarse al HTML: botón «Crear OT» abre órdenes. */
  onIrOrdenes?: () => void
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

function isoTodayLocal(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Pastel HEX como el HTML (`selColorNota`). */
const NOTA_HEX_OPTS = ['#FFF9C4', '#C8E6C9', '#BBDEFB', '#F8BBD0', '#E1BEE7', '#FFE0B2'] as const

const LEGACY_COLOR_MAP: Record<string, string> = {
  yellow: '#FFF9C4',
  sky: '#BBDEFB',
  rose: '#F8BBD0',
  violet: '#E1BEE7',
  amber: '#FFE0B2',
}

/** Color de fondo de nota (hex guardado o claves viejas). */
function notaBg(colorTag?: string): string {
  const t = (colorTag || '').trim()
  if (!t) return NOTA_HEX_OPTS[0]
  if (t.startsWith('#')) return t
  return LEGACY_COLOR_MAP[t] || NOTA_HEX_OPTS[0]
}

function hitClientes(db: Db, q: string, lim = 6) {
  const t = q.trim().toLowerCase()
  if (!t) return []
  return db.clientes
    .filter((c) => c.nombre.toLowerCase().includes(t) || (c.rut || '').toLowerCase().includes(t))
    .slice(0, lim)
}

type Tab = 'notas' | 'recordatorios' | 'reservas'

export function AgendaModule({ db, settings, setSettings, showToast, onIrOrdenes }: Props) {
  const hoy = isoTodayLocal()
  const [tab, setTab] = useState<Tab>('notas')

  const [nTitulo, setNTitulo] = useState('')
  const [nDetalle, setNDetalle] = useState('')
  const [nColorHex, setNColorHex] = useState<string>(NOTA_HEX_OPTS[0])
  const [nClienteTxt, setNClienteTxt] = useState('')
  const [nClienteId, setNClienteId] = useState('')
  const [nCliOpen, setNCliOpen] = useState(false)

  const [buscaNotas, setBuscaNotas] = useState('')

  const [rTitulo, setRTitulo] = useState('')
  const [rFecha, setRFecha] = useState(hoy)
  const [rHora, setRHora] = useState('')
  const [rPrioridad, setRPrioridad] = useState<'normal' | 'alta' | 'urgente'>('normal')
  const [rDesc, setRDesc] = useState('')
  const [rClienteTxt, setRClienteTxt] = useState('')
  const [rClienteId, setRClienteId] = useState('')
  const [rCliOpen, setRCliOpen] = useState(false)
  const [rOtFolio, setROtFolio] = useState('')

  const [buscaRec, setBuscaRec] = useState('')
  const [filtroRecEstado, setFiltroRecEstado] = useState('')

  const [openRecBody, setOpenRecBody] = useState<string | null>(null)
  const [openResBody, setOpenResBody] = useState<string | null>(null)

  const [resClienteTxt, setResClienteTxt] = useState('')
  const [resClienteId, setResClienteId] = useState('')
  const [resCliOpen, setResCliOpen] = useState(false)
  const [resVehId, setResVehId] = useState('')
  const [resServicio, setResServicio] = useState('')
  const [resFecha, setResFecha] = useState(hoy)
  const [resHora, setResHora] = useState('')
  const [resMecId, setResMecId] = useState('')
  const [resDuracion, setResDuracion] = useState(60)
  const [resObs, setResObs] = useState('')

  const [buscaRes, setBuscaRes] = useState('')
  const [filtroResFecha, setFiltroResFecha] = useState('')
  const [filtroResEstado, setFiltroResEstado] = useState('')

  const blurRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    return () => {
      if (blurRef.current) clearTimeout(blurRef.current)
    }
  }, [])

  const scheduleCloseCli = () => {
    if (blurRef.current) clearTimeout(blurRef.current)
    blurRef.current = setTimeout(() => {
      setNCliOpen(false)
      setRCliOpen(false)
      setResCliOpen(false)
    }, 160)
  }

  const notas = settings.extras.agendaNotas
  const recordatorios = settings.extras.agendaRecordatorios
  const reservas = settings.extras.agendaReservas

  const stats = useMemo(() => {
    const notasTot = notas.length
    const recPend = recordatorios.filter((r) => r.estado !== 'completado')
    const recProx = recPend.filter((r) => r.fecha > hoy).length
    const recHoy = recPend.filter((r) => r.fecha === hoy).length
    const recVenc = recPend.filter((r) => r.fecha < hoy).length
    const resHoy = reservas.filter((r) => r.fecha === hoy && r.estado !== 'cancelada').length
    return { notasTot, recProx, recHoy, recVenc, resHoy }
  }, [notas.length, recordatorios, reservas, hoy])

  const otOptsAbiertas = useMemo(
    () => db.ordenes.filter((o) => o.estado !== 'Entregado'),
    [db.ordenes],
  )

  const vehOptsRes = useMemo(() => {
    if (!resClienteId) return []
    return vehiculosFiltradosCliente(db, resClienteId)
  }, [db, resClienteId])

  const mecOpts = useMemo(() => db.mecanicos.filter(mecanicoEnNomina), [db.mecanicos])

  const notasFiltradas = useMemo(() => {
    const q = buscaNotas.trim().toLowerCase()
    if (!q) return notas
    return notas.filter(
      (n) =>
        n.titulo.toLowerCase().includes(q) ||
        (n.detalle || '').toLowerCase().includes(q) ||
        (n.clienteNombre || '').toLowerCase().includes(q),
    )
  }, [notas, buscaNotas])

  const recFilteredSorted = useMemo(() => {
    const q = buscaRec.trim().toLowerCase()
    let lista = [...recordatorios].sort((a, b) => `${a.fecha}${a.hora || ''}`.localeCompare(`${b.fecha}${b.hora || ''}`))
    if (q)
      lista = lista.filter(
        (r) =>
          r.titulo.toLowerCase().includes(q) ||
          (r.clienteNombre || '').toLowerCase().includes(q) ||
          (r.obs || '').toLowerCase().includes(q),
      )
    const ef = filtroRecEstado
    if (ef === 'pendiente') lista = lista.filter((r) => r.estado === 'pendiente' && r.fecha > hoy)
    else if (ef === 'hoy') lista = lista.filter((r) => r.estado !== 'completado' && r.fecha === hoy)
    else if (ef === 'vencido') lista = lista.filter((r) => r.estado !== 'completado' && r.fecha < hoy)
    else if (ef === 'completado') lista = lista.filter((r) => r.estado === 'completado')
    return lista
  }, [recordatorios, buscaRec, filtroRecEstado, hoy])

  const resFilteredSorted = useMemo(() => {
    const q = buscaRes.trim().toLowerCase()
    let lista = [...reservas].sort((a, b) => `${a.fecha}${a.hora || ''}`.localeCompare(`${b.fecha}${b.hora || ''}`))
    if (q)
      lista = lista.filter(
        (r) =>
          r.cliente.toLowerCase().includes(q) ||
          r.motivo.toLowerCase().includes(q) ||
          (r.patente || '').toLowerCase().includes(q),
      )
    if (filtroResFecha) lista = lista.filter((r) => r.fecha === filtroResFecha)
    if (filtroResEstado) lista = lista.filter((r) => r.estado === filtroResEstado)
    return lista
  }, [reservas, buscaRes, filtroResFecha, filtroResEstado])

  const limpiarNotaForm = () => {
    setNTitulo('')
    setNDetalle('')
    setNColorHex(NOTA_HEX_OPTS[0])
    setNClienteTxt('')
    setNClienteId('')
  }

  const agregarNota = (e: FormEvent) => {
    e.preventDefault()
    const titulo = nTitulo.trim()
    if (!titulo) return showToast('El título es obligatorio', 'err')
    const detalle = nDetalle.trim()
    const clienteNombre = nClienteId ? (db.clientes.find((c) => c.id === nClienteId)?.nombre ?? nClienteTxt.trim()) : nClienteTxt.trim()
    setSettings((s) => ({
      ...s,
      extras: {
        ...s.extras,
        agendaNotas: [
          {
            id: uid(),
            titulo,
            detalle,
            fecha: hoy,
            estado: 'pendiente',
            creado: new Date().toISOString(),
            colorTag: nColorHex,
            ...(nClienteId ? { clienteId: nClienteId, clienteNombre } : clienteNombre ? { clienteNombre } : {}),
          },
          ...s.extras.agendaNotas,
        ],
      },
    }))
    limpiarNotaForm()
    showToast('Nota guardada ✓')
  }

  const eliminarNota = (id: string) => {
    if (!window.confirm('¿Eliminar esta nota?')) return
    setSettings((s) => ({
      ...s,
      extras: { ...s.extras, agendaNotas: s.extras.agendaNotas.filter((x) => x.id !== id) },
    }))
    showToast('Nota eliminada')
  }

  const limpiarRec = () => {
    setRTitulo('')
    setRFecha(hoy)
    setRHora('')
    setRPrioridad('normal')
    setRDesc('')
    setRClienteTxt('')
    setRClienteId('')
    setROtFolio('')
  }

  const agregarRecordatorio = (e: FormEvent) => {
    e.preventDefault()
    const titulo = rTitulo.trim()
    if (!titulo) return showToast('El título es obligatorio', 'err')
    if (!rFecha.trim()) return showToast('La fecha es obligatoria', 'err')
    const row: AgendaRecordatorio = {
      id: uid(),
      titulo,
      fecha: rFecha.trim(),
      obs: rDesc.trim(),
      estado: 'pendiente',
      creado: new Date().toISOString(),
      hora: rHora.trim() || undefined,
      prioridad: rPrioridad,
      otFolio: rOtFolio.trim() || undefined,
      ...(rClienteId
        ? { clienteId: rClienteId, clienteNombre: db.clientes.find((c) => c.id === rClienteId)?.nombre ?? rClienteTxt.trim() }
        : rClienteTxt.trim()
          ? { clienteNombre: rClienteTxt.trim() }
          : {}),
    }
    setSettings((s) => ({
      ...s,
      extras: { ...s.extras, agendaRecordatorios: [row, ...s.extras.agendaRecordatorios] },
    }))
    limpiarRec()
    showToast('Recordatorio guardado ✓')
  }

  const completarRec = (id: string) => {
    setSettings((s) => ({
      ...s,
      extras: {
        ...s.extras,
        agendaRecordatorios: s.extras.agendaRecordatorios.map((x) =>
          x.id === id ? { ...x, estado: 'completado' as const, completadoEn: new Date().toISOString() } : x,
        ),
      },
    }))
    showToast('Recordatorio completado ✓')
  }

  const eliminarRec = (id: string) => {
    if (!window.confirm('¿Eliminar este recordatorio?')) return
    setSettings((s) => ({
      ...s,
      extras: { ...s.extras, agendaRecordatorios: s.extras.agendaRecordatorios.filter((x) => x.id !== id) },
    }))
    showToast('Eliminado')
  }

  const limpiarRes = () => {
    setResClienteTxt('')
    setResClienteId('')
    setResVehId('')
    setResServicio('')
    setResHora('')
    setResObs('')
    setResMecId('')
    setResDuracion(60)
    setResFecha(hoy)
  }

  const agregarReserva = (e: FormEvent) => {
    e.preventDefault()
    const cliNombre = resClienteTxt.trim()
    const servicio = resServicio.trim()
    if (!cliNombre) return showToast('Ingresa el nombre del cliente', 'err')
    if (!servicio) return showToast('El servicio es obligatorio', 'err')
    if (!resFecha.trim()) return showToast('La fecha es obligatoria', 'err')
    const c = resClienteId ? db.clientes.find((x) => x.id === resClienteId) : undefined
    const v = resVehId ? db.vehiculos.find((x) => x.id === resVehId) : undefined
    const m = resMecId ? db.mecanicos.find((x) => x.id === resMecId) : undefined
    const row: AgendaReserva = {
      id: uid(),
      cliente: c?.nombre ?? cliNombre,
      tel: c?.tel ?? '',
      fecha: resFecha.trim(),
      hora: resHora.trim(),
      motivo: servicio,
      estado: 'confirmada',
      creado: new Date().toISOString(),
      clienteId: c?.id,
      vehiculoId: v?.id,
      patente: v?.patente,
      marca: v?.marca,
      modelo: v?.modelo,
      duracion: resDuracion,
      mecanicoId: m?.id,
      mecanico: m?.nombre,
      obs: resObs.trim() || undefined,
    }
    setSettings((s) => ({
      ...s,
      extras: { ...s.extras, agendaReservas: [row, ...s.extras.agendaReservas] },
    }))
    limpiarRes()
    showToast(`Reserva para ${cliNombre} el ${isoDateToDdMmYyyy(row.fecha)} guardada ✓`)
  }

  const patchReservaEstado = (id: string, estado: AgendaReserva['estado']) => {
    setSettings((s) => ({
      ...s,
      extras: {
        ...s.extras,
        agendaReservas: s.extras.agendaReservas.map((x) => (x.id === id ? { ...x, estado } : x)),
      },
    }))
    showToast('Estado actualizado')
  }

  const eliminarReserva = (id: string) => {
    if (!window.confirm('¿Eliminar esta reserva?')) return
    setSettings((s) => ({
      ...s,
      extras: { ...s.extras, agendaReservas: s.extras.agendaReservas.filter((x) => x.id !== id) },
    }))
    showToast('Reserva eliminada')
  }

  const prioColor: Record<string, string> = {
    normal: 'var(--doc-blue, #1a3a5c)',
    alta: '#b45309',
    urgente: 'var(--red)',
  }

  return (
    <div className="agenda-mod">
      <div className="stats stats-agenda" style={{ marginBottom: 14 }}>
        <div className="stat stat-sm">
          <div className="stat-lbl">Notas</div>
          <div className="stat-val stat-val-sm">{stats.notasTot}</div>
          <div className="stat-sub">guardadas</div>
        </div>
        <div className="stat stat-sm">
          <div className="stat-lbl">Recordatorios hoy</div>
          <div className="stat-val stat-val-sm" style={{ color: stats.recHoy > 0 ? '#b45309' : undefined }}>
            {stats.recHoy}
          </div>
          <div className="stat-sub">
            {stats.recProx} próximos
          </div>
        </div>
        <div className="stat stat-sm">
          <div className="stat-lbl">Vencidos</div>
          <div
            className="stat-val stat-val-sm"
            style={{ color: stats.recVenc > 0 ? 'var(--red)' : 'var(--green)' }}
          >
            {stats.recVenc}
          </div>
          <div className="stat-sub">sin completar</div>
        </div>
        <div className="stat stat-sm">
          <div className="stat-lbl">Reservas hoy</div>
          <div className="stat-val stat-val-sm" style={{ color: stats.resHoy > 0 ? 'var(--accent)' : undefined }}>
            {stats.resHoy}
          </div>
          <div className="stat-sub">citas agendadas</div>
        </div>
      </div>

      <div className="tabs agenda-html-tabs">
        <button type="button" className={`tab${tab === 'notas' ? ' active' : ''}`} onClick={() => setTab('notas')}>
          📝 Notas rápidas
        </button>
        <button
          type="button"
          className={`tab${tab === 'recordatorios' ? ' active' : ''}`}
          onClick={() => setTab('recordatorios')}
        >
          🔔 Recordatorios
        </button>
        <button type="button" className={`tab${tab === 'reservas' ? ' active' : ''}`} onClick={() => setTab('reservas')}>
          📅 Reservas
        </button>
      </div>

      {tab === 'notas' && (
        <>
          <div className="card">
            <div className="card-title">
              <div className="card-title-left">Nueva nota</div>
            </div>
            <form className="g2 agenda-g2-notas" onSubmit={agregarNota}>
              <div className="field field-span-full">
                <label>Título *</label>
                <input
                  value={nTitulo}
                  onChange={(e) => setNTitulo(e.target.value)}
                  placeholder="Ej: Llamar a proveedor, revisar presupuesto..."
                  autoComplete="off"
                />
              </div>
              <div className="field field-span-full">
                <label>Contenido</label>
                <textarea
                  value={nDetalle}
                  onChange={(e) => setNDetalle(e.target.value)}
                  placeholder="Detalles de la nota..."
                  style={{ minHeight: 70 }}
                  rows={4}
                />
              </div>
              <div className="field">
                <label>Color / categoría</label>
                <div className="agenda-nota-color-opts">
                  {NOTA_HEX_OPTS.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      className={`agenda-nota-color-btn${nColorHex === hex ? ' sel' : ''}`}
                      style={{ background: hex }}
                      title={hex}
                      onClick={() => setNColorHex(hex)}
                    />
                  ))}
                </div>
              </div>
              <div className="field">
                <label>
                  Asociar a cliente{' '}
                  <span style={{ fontWeight: 400, color: 'var(--text3)', fontSize: 10 }}>opcional</span>
                </label>
                <div className="ac-wrap">
                  <input
                    value={nClienteTxt}
                    onChange={(e) => {
                      setNClienteTxt(e.target.value)
                      setNClienteId('')
                      setNCliOpen(true)
                    }}
                    onFocus={() => setNCliOpen(true)}
                    onBlur={scheduleCloseCli}
                    placeholder="Buscar cliente..."
                    autoComplete="off"
                  />
                  {nCliOpen && hitClientes(db, nClienteTxt).length > 0 ? (
                    <div className="ac-dropdown">
                      {hitClientes(db, nClienteTxt).map((c) => (
                        <div
                          key={c.id}
                          className="ac-item"
                          onMouseDown={(e) => {
                            e.preventDefault()
                            setNClienteTxt(c.nombre)
                            setNClienteId(c.id)
                            setNCliOpen(false)
                          }}
                        >
                          <span className="ac-item-name">{c.nombre}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="field-span-full" style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                <button type="submit" className="btn btn-primary">
                  ✓ Agregar nota
                </button>
                <button type="button" className="btn" onClick={limpiarNotaForm}>
                  ↺ Limpiar
                </button>
              </div>
            </form>
          </div>

          <div className="card">
            <div className="card-title">
              <div className="card-title-left">Notas guardadas</div>
            </div>
            <div className="sbar" style={{ marginBottom: 12 }}>
              <input value={buscaNotas} onChange={(e) => setBuscaNotas(e.target.value)} placeholder="Buscar notas..." />
            </div>
            {notasFiltradas.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">📝</div>
                Sin notas guardadas
              </div>
            ) : (
              <div className="agenda-notas-grid">
                {notasFiltradas.map((n) => (
                  <div
                    key={n.id}
                    className="agenda-nota-tile"
                    style={{
                      background: notaBg(n.colorTag),
                    }}
                  >
                    <button
                      type="button"
                      className="agenda-nota-del"
                      title="Eliminar"
                      onClick={() => eliminarNota(n.id)}
                    >
                      ✕
                    </button>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, paddingRight: 22 }}>{n.titulo}</div>
                    {n.detalle ? (
                      <div style={{ fontSize: 12, color: '#555', whiteSpace: 'pre-line', marginBottom: 8 }}>{n.detalle}</div>
                    ) : null}
                    {n.clienteNombre ? (
                      <div style={{ fontSize: 10, color: '#888', marginBottom: 4 }}>👤 {n.clienteNombre}</div>
                    ) : null}
                    <div style={{ fontSize: 10, color: '#aaa' }}>
                      {new Date(n.creado).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'recordatorios' && (
        <>
          <div className="card">
            <div className="card-title">
              <div className="card-title-left">Nuevo recordatorio</div>
            </div>
            <form className="g3 agenda-g3-rec" onSubmit={agregarRecordatorio}>
              <div className="field field-span-full">
                <label>Título *</label>
                <input value={rTitulo} onChange={(e) => setRTitulo(e.target.value)} placeholder="Ej: Llamar a cliente, pagar factura..." />
              </div>
              <div className="field">
                <label>Fecha *</label>
                <input type="date" value={rFecha} onChange={(e) => setRFecha(e.target.value)} />
              </div>
              <div className="field">
                <label>Hora</label>
                <input type="time" value={rHora} onChange={(e) => setRHora(e.target.value)} />
              </div>
              <div className="field">
                <label>Prioridad</label>
                <select value={rPrioridad} onChange={(e) => setRPrioridad(e.target.value as typeof rPrioridad)}>
                  <option value="normal">Normal</option>
                  <option value="alta">⚠ Alta</option>
                  <option value="urgente">🔴 Urgente</option>
                </select>
              </div>
              <div className="field field-span-full">
                <label>Descripción</label>
                <input value={rDesc} onChange={(e) => setRDesc(e.target.value)} placeholder="Detalles adicionales..." />
              </div>
              <div className="field">
                <label>
                  Asociar a cliente{' '}
                  <span style={{ fontWeight: 400, color: 'var(--text3)', fontSize: 10 }}>opcional</span>
                </label>
                <div className="ac-wrap">
                  <input
                    value={rClienteTxt}
                    onChange={(e) => {
                      setRClienteTxt(e.target.value)
                      setRClienteId('')
                      setRCliOpen(true)
                    }}
                    onFocus={() => setRCliOpen(true)}
                    onBlur={scheduleCloseCli}
                    placeholder="Buscar cliente..."
                  />
                  {rCliOpen && hitClientes(db, rClienteTxt).length > 0 ? (
                    <div className="ac-dropdown">
                      {hitClientes(db, rClienteTxt).map((c) => (
                        <div
                          key={c.id}
                          className="ac-item"
                          onMouseDown={(e) => {
                            e.preventDefault()
                            setRClienteTxt(c.nombre)
                            setRClienteId(c.id)
                            setRCliOpen(false)
                          }}
                        >
                          <span className="ac-item-name">{c.nombre}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="field">
                <label>
                  Asociar a OT{' '}
                  <span style={{ fontWeight: 400, color: 'var(--text3)', fontSize: 10 }}>opcional</span>
                </label>
                <select value={rOtFolio} onChange={(e) => setROtFolio(e.target.value)}>
                  <option value="">— Sin asociar —</option>
                  {otOptsAbiertas.map((o) => (
                    <option key={o.folio} value={o.folio}>
                      {o.folio} — {o.clienteNombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field-span-full" style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                <button type="submit" className="btn btn-primary">
                  ✓ Agregar recordatorio
                </button>
                <button type="button" className="btn" onClick={limpiarRec}>
                  ↺ Limpiar
                </button>
              </div>
            </form>
          </div>

          <div className="card">
            <div className="card-title">
              <div className="card-title-left">Recordatorios</div>
            </div>
            <div className="sbar" style={{ marginBottom: 12 }}>
              <input value={buscaRec} onChange={(e) => setBuscaRec(e.target.value)} placeholder="Buscar recordatorios..." />
              <select value={filtroRecEstado} onChange={(e) => setFiltroRecEstado(e.target.value)}>
                <option value="">Todos</option>
                <option value="pendiente">Pendientes</option>
                <option value="hoy">Hoy</option>
                <option value="vencido">Vencidos</option>
                <option value="completado">Completados</option>
              </select>
            </div>
            {recFilteredSorted.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">🔔</div>
                Sin recordatorios
              </div>
            ) : (
              recFilteredSorted.map((r) => {
                const vencido = r.estado !== 'completado' && r.fecha < hoy
                const esHoy = r.fecha === hoy && r.estado !== 'completado'
                const borde = r.estado === 'completado' ? 'var(--border)' : vencido ? 'var(--red)' : esHoy ? '#b45309' : 'var(--border)'
                const p = r.prioridad || 'normal'
                const open = openRecBody === r.id
                return (
                  <div key={r.id} className="exp-row agenda-rec-exp" style={{ borderLeft: `3px solid ${borde}` }}>
                    <div
                      role="button"
                      tabIndex={0}
                      className="agenda-rec-hdr"
                      style={{
                        opacity: r.estado === 'completado' ? 0.6 : 1,
                        background:
                          r.estado === 'completado'
                            ? 'var(--surface2)'
                            : vencido
                              ? 'rgba(196, 30, 30, 0.08)'
                              : esHoy
                                ? 'rgba(180, 83, 9, 0.1)'
                                : 'var(--surface2)',
                      }}
                      onClick={() => setOpenRecBody(open ? null : r.id)}
                      onKeyDown={(e) => e.key === 'Enter' && setOpenRecBody(open ? null : r.id)}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span
                            style={{
                              fontWeight: 600,
                              fontSize: 13,
                              textDecoration: r.estado === 'completado' ? 'line-through' : undefined,
                              color: r.estado === 'completado' ? 'var(--text3)' : undefined,
                            }}
                          >
                            {r.titulo}
                          </span>
                          <span style={{ fontSize: 10, fontWeight: 600, color: prioColor[p] }}>
                            {p === 'normal' ? 'Normal' : p === 'alta' ? '⚠ Alta' : '🔴 Urgente'}
                          </span>
                          {r.estado === 'completado' ? (
                            <span className="badge b-green" style={{ fontSize: 9 }}>
                              ✓ Completado
                            </span>
                          ) : null}
                          {vencido ? (
                            <span className="badge b-red" style={{ fontSize: 9 }}>
                              Vencido
                            </span>
                          ) : null}
                          {esHoy ? (
                            <span className="badge b-orange" style={{ fontSize: 9 }}>
                              Hoy
                            </span>
                          ) : null}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 3 }}>
                          📅 {isoDateToDdMmYyyy(r.fecha)}
                          {r.hora ? ` 🕐 ${r.hora}` : ''}
                          {r.clienteNombre ? ` · 👤 ${r.clienteNombre}` : ''}
                          {r.otFolio ? (
                            <>
                              {' '}
                              · <span className="folio-tag">{r.otFolio}</span>
                            </>
                          ) : null}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        {r.estado !== 'completado' ? (
                          <button
                            type="button"
                            className="btn btn-xs btn-green"
                            onClick={(e) => {
                              e.stopPropagation()
                              completarRec(r.id)
                            }}
                          >
                            ✓
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="btn btn-xs btn-red"
                          onClick={(e) => {
                            e.stopPropagation()
                            eliminarRec(r.id)
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    {open ? (
                      <div className="exp-body" id={`rec-${r.id}`}>
                        <div style={{ fontSize: 12, padding: '10px 16px', color: r.obs ? 'var(--text2)' : 'var(--text3)' }}>
                          {r.obs || 'Sin descripción adicional'}
                        </div>
                      </div>
                    ) : null}
                  </div>
                )
              })
            )}
          </div>
        </>
      )}

      {tab === 'reservas' && (
        <>
          <div className="card">
            <div className="card-title">
              <div className="card-title-left">Nueva reserva</div>
            </div>
            <form className="g3 agenda-g3-res" onSubmit={agregarReserva}>
              <div className="field ac-wrap field-span-full">
                <label>Cliente *</label>
                <input
                  value={resClienteTxt}
                  onChange={(e) => {
                    setResClienteTxt(e.target.value)
                    setResClienteId('')
                    setResVehId('')
                    setResCliOpen(true)
                  }}
                  onFocus={() => setResCliOpen(true)}
                  onBlur={scheduleCloseCli}
                  placeholder="Buscar o ingresar cliente..."
                />
                {resCliOpen && (hitClientes(db, resClienteTxt).length > 0 || resClienteTxt.trim()) ? (
                  <div className="ac-dropdown">
                    {hitClientes(db, resClienteTxt).map((c) => (
                      <div
                        key={c.id}
                        className="ac-item"
                        onMouseDown={(e) => {
                          e.preventDefault()
                          setResClienteTxt(c.nombre)
                          setResClienteId(c.id)
                          setResVehId('')
                          setResCliOpen(false)
                        }}
                      >
                        <span className="ac-item-name">{c.nombre}</span>
                        <span style={{ fontSize: 10, color: 'var(--text3)' }}>{c.rut}</span>
                      </div>
                    ))}
                    {!db.clientes.some((c) => c.nombre.toLowerCase() === resClienteTxt.trim().toLowerCase()) &&
                    resClienteTxt.trim() ? (
                      <div
                        className="ac-item ac-item-new"
                        onMouseDown={(e) => {
                          e.preventDefault()
                          setResClienteId('')
                          setResCliOpen(false)
                        }}
                      >
                        <span className="ac-item-name" style={{ color: 'var(--accent)' }}>
                          ➕ «{resClienteTxt.trim()}» como cliente libre
                        </span>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <div className="field">
                <label>Vehículo</label>
                <select
                  value={resVehId}
                  onChange={(e) => setResVehId(e.target.value)}
                  disabled={!resClienteId}
                >
                  <option value="">— Sin vehículo —</option>
                  {vehOptsRes.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.patente}
                      {v.marca ? ` — ${v.marca} ${v.modelo}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field field-span-full">
                <label>Servicio / motivo *</label>
                <input value={resServicio} onChange={(e) => setResServicio(e.target.value)} placeholder="Ej: Cambio aceite, revisión frenos..." />
              </div>
              <div className="field">
                <label>Fecha *</label>
                <input type="date" value={resFecha} onChange={(e) => setResFecha(e.target.value)} />
              </div>
              <div className="field">
                <label>Hora</label>
                <input type="time" value={resHora} onChange={(e) => setResHora(e.target.value)} />
              </div>
              <div className="field">
                <label>Mecánico asignado</label>
                <select value={resMecId} onChange={(e) => setResMecId(e.target.value)}>
                  <option value="">— Sin asignar —</option>
                  {mecOpts.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Duración estimada</label>
                <select value={resDuracion} onChange={(e) => setResDuracion(Number(e.target.value))}>
                  <option value={30}>30 min</option>
                  <option value={60}>1 hora</option>
                  <option value={90}>1.5 horas</option>
                  <option value={120}>2 horas</option>
                  <option value={180}>3 horas</option>
                  <option value={240}>4 horas</option>
                  <option value={480}>Día completo</option>
                </select>
              </div>
              <div className="field field-span-full">
                <label>Observaciones</label>
                <input value={resObs} onChange={(e) => setResObs(e.target.value)} placeholder="Notas para la reserva..." />
              </div>
              <div className="field-span-full" style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                <button type="submit" className="btn btn-primary">
                  ✓ Agregar reserva
                </button>
                <button type="button" className="btn" onClick={limpiarRes}>
                  ↺ Limpiar
                </button>
              </div>
            </form>
          </div>

          <div className="card">
            <div className="card-title">
              <div className="card-title-left">Agenda de reservas</div>
            </div>
            <div className="sbar" style={{ marginBottom: 12 }}>
              <input value={buscaRes} onChange={(e) => setBuscaRes(e.target.value)} placeholder="Buscar cliente, servicio..." />
              <input type="date" value={filtroResFecha} onChange={(e) => setFiltroResFecha(e.target.value)} title="Filtrar por fecha" />
              <select value={filtroResEstado} onChange={(e) => setFiltroResEstado(e.target.value)}>
                <option value="">Todos los estados</option>
                <option value="confirmada">Confirmada</option>
                <option value="pendiente">Pendiente</option>
                <option value="completada">Completada</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </div>
            {resFilteredSorted.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">📅</div>
                Sin reservas
              </div>
            ) : (
              resFilteredSorted.map((r) => {
                const esHoy = r.fecha === hoy
                const pasada = r.fecha < hoy && r.estado !== 'completada' && r.estado !== 'cancelada'
                const durH = Math.floor((r.duracion || 60) / 60)
                const durM = (r.duracion || 60) % 60
                const durStr = durH > 0 ? `${durH}h${durM > 0 ? ` ${durM}min` : ''}` : `${durM}min`
                const estMap: Record<string, string> = {
                  confirmada: 's-proceso',
                  pendiente: 's-pendiente',
                  completada: 's-entregado',
                  cancelada: 's-vencido',
                }
                const open = openResBody === r.id
                return (
                  <div
                    key={r.id}
                    className="exp-row agenda-res-exp"
                    style={{
                      borderLeft: pasada ? '3px solid #b45309' : esHoy ? `3px solid var(--accent)` : undefined,
                    }}
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      className="exp-hdr"
                      onClick={() => setOpenResBody(open ? null : r.id)}
                      onKeyDown={(e) => e.key === 'Enter' && setOpenResBody(open ? null : r.id)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
                          {isoDateToDdMmYyyy(r.fecha)}
                          {r.hora ? ` ${r.hora}` : ''}
                        </span>
                        <span style={{ fontWeight: 600 }}>{r.cliente}</span>
                        {r.patente ? (
                          <span className="badge b-orange">{r.patente}</span>
                        ) : null}
                        <span className={`status ${estMap[r.estado] || 's-pendiente'}`}>{r.estado}</span>
                        {esHoy ? (
                          <span className="badge b-orange" style={{ fontSize: 9 }}>
                            HOY
                          </span>
                        ) : null}
                        {r.mecanico ? <span className="badge b-blue">{r.mecanico}</span> : null}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{r.motivo}</div>
                        <div style={{ fontSize: 10, color: 'var(--text2)' }}>
                          ⏱ {durStr}
                          {r.tel ? ` · 📞 ${r.tel}` : ''}
                        </div>
                      </div>
                    </div>
                    {open ? (
                      <div className="exp-body" id={`res-${r.id}`}>
                        {r.obs ? (
                          <div style={{ fontSize: 12, color: 'var(--text2)', padding: '10px 0' }}>📋 {r.obs}</div>
                        ) : null}
                        <div className="row-acts" style={{ justifyContent: 'flex-end' }}>
                          <select
                            className="agenda-res-estado-sel"
                            value={r.estado}
                            onChange={(e) => patchReservaEstado(r.id, e.target.value as AgendaReserva['estado'])}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {(['confirmada', 'pendiente', 'completada', 'cancelada'] as const).map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className="btn btn-xs btn-primary"
                            onClick={(e) => {
                              e.stopPropagation()
                              onIrOrdenes?.()
                              showToast('En Órdenes: crea la OT y copia datos de esta reserva', 'ok')
                            }}
                          >
                            → Crear OT
                          </button>
                          <button
                            type="button"
                            className="btn btn-xs btn-red"
                            onClick={(e) => {
                              e.stopPropagation()
                              eliminarReserva(r.id)
                            }}
                          >
                            🗑 Eliminar
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )
              })
            )}
          </div>
        </>
      )}
    </div>
  )
}
