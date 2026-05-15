import { type Dispatch, type SetStateAction, useCallback, useMemo, useState } from 'react'
import type { AppSettings, CompraProveedor, Proveedor } from './appTypes'
import { isoDateToDdMmYyyy } from './dateFormat'
import { openWhatsAppUrl } from './whatsappOpen'

type Props = {
  settings: AppSettings
  setSettings: Dispatch<SetStateAction<AppSettings>>
  showToast: (msg: string, type?: 'ok' | 'err' | 'warn') => void
}

type ProvTab = 'lista' | 'nuevo' | 'compras' | 'nueva-compra'

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function fmt(n: number) {
  return '$' + Number(n || 0).toLocaleString('es-CL')
}

const COND_PROV = ['Contado', '30 días', '60 días', '90 días', 'Otro'] as const
const FPAGO_COMPRA = ['Contado', 'Transferencia', 'Crédito 30 días', 'Crédito 60 días', 'Otro'] as const
const CAT_COMPRA = ['Repuestos', 'Lubricantes', 'Herramientas', 'Insumos', 'Equipamiento', 'Otro'] as const

function emptyProvDraft() {
  return {
    editId: null as string | null,
    nombre: '',
    rut: '',
    rubro: '',
    tel: '',
    email: '',
    web: '',
    ciudad: '',
    dir: '',
    condicionPago: 'Contado',
    contacto: '',
    obs: '',
  }
}

function provFromProveedor(p: Proveedor) {
  return {
    editId: p.id,
    nombre: p.nombre || '',
    rut: p.rut || '',
    rubro: p.rubro || '',
    tel: p.tel || '',
    email: p.email || '',
    web: p.web || '',
    ciudad: p.ciudad || '',
    dir: p.dir || '',
    condicionPago: p.condicionPago || 'Contado',
    contacto: p.contacto || '',
    obs: p.obs || '',
  }
}

export function ProveedoresModule({ settings, setSettings, showToast }: Props) {
  const proveedores = settings.extras.proveedores ?? []
  const compras = settings.extras.compras ?? []

  const [tab, setTab] = useState<ProvTab>('lista')
  const [listaQ, setListaQ] = useState('')
  const [listaRubro, setListaRubro] = useState('')
  const [expandedProv, setExpandedProv] = useState<Set<string>>(() => new Set())

  const [provDraft, setProvDraft] = useState(emptyProvDraft)

  const [comprasQ, setComprasQ] = useState('')
  const [comprasDesde, setComprasDesde] = useState('')
  const [comprasHasta, setComprasHasta] = useState('')
  const [comprasProvF, setComprasProvF] = useState('')

  const [compraProvId, setCompraProvId] = useState('')
  const [compraFolio, setCompraFolio] = useState('')
  const [compraFecha, setCompraFecha] = useState(todayIso)
  const [compraMonto, setCompraMonto] = useState('')
  const [compraIvaSi, setCompraIvaSi] = useState(true)
  const [compraFpago, setCompraFpago] = useState('Contado')
  const [compraCat, setCompraCat] = useState('Repuestos')
  const [compraDesc, setCompraDesc] = useState('')

  const tallerNom = settings.empresa.nombre?.trim() || 'el taller'

  const mesActual = todayIso().slice(0, 7)

  const stats = useMemo(() => {
    const comprasMes = compras.filter((c) => c.fecha && c.fecha.slice(0, 7) === mesActual)
    const totalComprasMes = comprasMes.reduce((s, c) => s + c.monto, 0)
    const totalCompras = compras.reduce((s, c) => s + c.monto, 0)
    const masComprado = proveedores.reduce(
      (top, p) => {
        const t = compras.filter((c) => c.proveedorId === p.id).reduce((s, c) => s + c.monto, 0)
        return t > top.monto ? { nombre: p.nombre, monto: t } : top
      },
      { nombre: '—', monto: 0 },
    )
    return {
      nProv: proveedores.length,
      totalComprasMes,
      nFacMes: comprasMes.length,
      totalCompras,
      masComprado,
    }
  }, [proveedores, compras, mesActual])

  const rubrosOpts = useMemo(() => {
    const s = new Set<string>()
    proveedores.forEach((p) => {
      if (p.rubro?.trim()) s.add(p.rubro.trim())
    })
    return [...s].sort((a, b) => a.localeCompare(b))
  }, [proveedores])

  const listaFiltrada = useMemo(() => {
    const q = listaQ.toLowerCase().trim()
    let rows = [...proveedores]
    if (q) {
      rows = rows.filter(
        (p) =>
          p.nombre.toLowerCase().includes(q) ||
          (p.rut || '').toLowerCase().includes(q) ||
          (p.rubro || '').toLowerCase().includes(q) ||
          (p.contacto || '').toLowerCase().includes(q),
      )
    }
    if (listaRubro) rows = rows.filter((p) => p.rubro === listaRubro)
    rows.sort((a, b) => a.nombre.localeCompare(b.nombre))
    return rows
  }, [proveedores, listaQ, listaRubro])

  const toggleProv = useCallback((id: string) => {
    setExpandedProv((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }, [])

  const comprasLista = useMemo(() => {
    const q = comprasQ.toLowerCase().trim()
    let rows = [...compras].sort((a, b) => (b.fecha > a.fecha ? 1 : -1))
    if (q) {
      rows = rows.filter(
        (c) =>
          c.proveedorNombre.toLowerCase().includes(q) ||
          (c.folio || '').toLowerCase().includes(q) ||
          (c.descripcion || '').toLowerCase().includes(q),
      )
    }
    if (comprasDesde) rows = rows.filter((c) => c.fecha >= comprasDesde)
    if (comprasHasta) rows = rows.filter((c) => c.fecha <= comprasHasta)
    if (comprasProvF) rows = rows.filter((c) => c.proveedorId === comprasProvF)
    return rows
  }, [compras, comprasQ, comprasDesde, comprasHasta, comprasProvF])

  const comprasTotalFilt = useMemo(() => comprasLista.reduce((s, c) => s + c.monto, 0), [comprasLista])

  const limpiarProvForm = () => {
    setProvDraft(emptyProvDraft())
  }

  const irTabNuevo = () => {
    limpiarProvForm()
    setTab('nuevo')
  }

  const guardarProveedor = () => {
    const nom = provDraft.nombre.trim()
    if (!nom) {
      showToast('El nombre es obligatorio', 'err')
      return
    }
    const base = {
      nombre: nom,
      rut: provDraft.rut.trim(),
      rubro: provDraft.rubro.trim(),
      tel: provDraft.tel.trim(),
      email: provDraft.email.trim(),
      web: provDraft.web.trim(),
      ciudad: provDraft.ciudad.trim(),
      dir: provDraft.dir.trim(),
      condicionPago: provDraft.condicionPago || 'Contado',
      contacto: provDraft.contacto.trim(),
      obs: provDraft.obs.trim(),
    }
    const mod = new Date().toISOString()
    if (provDraft.editId) {
      setSettings((s) => ({
        ...s,
        extras: {
          ...s.extras,
          proveedores: s.extras.proveedores.map((p) =>
            p.id === provDraft.editId ? { ...p, ...base, modificado: mod } : p,
          ),
        },
      }))
      showToast(`"${nom}" actualizado correctamente`)
    } else {
      const nuevo: Proveedor = {
        id: uid(),
        ...base,
        creado: mod,
      }
      setSettings((s) => ({
        ...s,
        extras: { ...s.extras, proveedores: [nuevo, ...s.extras.proveedores] },
      }))
      showToast(`Proveedor "${nom}" registrado`)
    }
    limpiarProvForm()
    setTab('lista')
  }

  const editarProveedor = (id: string) => {
    const p = proveedores.find((x) => x.id === id)
    if (!p) return
    setProvDraft(provFromProveedor(p))
    setTab('nuevo')
  }

  const eliminarProveedor = (id: string) => {
    if (!window.confirm('¿Eliminar este proveedor? Las compras asociadas se mantendrán.')) return
    setSettings((s) => ({
      ...s,
      extras: { ...s.extras, proveedores: s.extras.proveedores.filter((p) => p.id !== id) },
    }))
    showToast('Proveedor eliminado')
    setExpandedProv((prev) => {
      const n = new Set(prev)
      n.delete(id)
      return n
    })
    if (provDraft.editId === id) limpiarProvForm()
  }

  const preselProvCompra = (provId: string) => {
    setCompraProvId(provId)
    setTab('nueva-compra')
  }

  const compraIvaDetalle = useMemo(() => {
    const monto = Number(String(compraMonto).replace(',', '.')) || 0
    if (!monto) return null
    if (compraIvaSi) {
      const neto = Math.round(monto / 1.19)
      const iva = monto - neto
      return {
        html: (
          <>
            Neto: <strong className="td-mono">{fmt(neto)}</strong> · IVA 19%:{' '}
            <strong className="td-mono">{fmt(iva)}</strong> · Total: <strong className="td-mono">{fmt(monto)}</strong>
          </>
        ),
        neto,
        iva,
        tieneIva: true,
      }
    }
    const neto = monto
    const iva = Math.round(monto * 0.19)
    return {
      html: (
        <>
          Neto: <strong className="td-mono">{fmt(neto)}</strong> · IVA 19%:{' '}
          <strong className="td-mono">+{fmt(iva)}</strong> · Total c/IVA:{' '}
          <strong className="td-mono">{fmt(monto + iva)}</strong>
        </>
      ),
      neto,
      iva,
      tieneIva: false,
    }
  }, [compraMonto, compraIvaSi])

  const limpiarCompraForm = () => {
    setCompraProvId('')
    setCompraFolio('')
    setCompraFecha(todayIso())
    setCompraMonto('')
    setCompraIvaSi(true)
    setCompraFpago('Contado')
    setCompraCat('Repuestos')
    setCompraDesc('')
  }

  const guardarCompra = () => {
    if (!compraProvId) {
      showToast('Selecciona un proveedor', 'err')
      return
    }
    const monto = Number(String(compraMonto).replace(',', '.')) || 0
    if (!monto) {
      showToast('Ingresa el monto', 'err')
      return
    }
    if (!compraFecha) {
      showToast('Ingresa la fecha', 'err')
      return
    }
    const p = proveedores.find((x) => x.id === compraProvId)
    const tieneIva = compraIvaSi
    const neto = tieneIva ? Math.round(monto / 1.19) : monto
    const iva = tieneIva ? monto - neto : Math.round(monto * 0.19)
    const nueva: CompraProveedor = {
      id: uid(),
      proveedorId: compraProvId,
      proveedorNombre: p?.nombre || '—',
      folio: compraFolio.trim(),
      fecha: compraFecha,
      monto,
      neto,
      iva,
      tieneIva,
      fpago: compraFpago,
      categoria: compraCat,
      descripcion: compraDesc.trim(),
      obs: '',
      creado: new Date().toISOString(),
    }
    setSettings((s) => ({
      ...s,
      extras: { ...s.extras, compras: [nueva, ...s.extras.compras] },
    }))
    showToast(`Compra de ${fmt(monto)} registrada a ${p?.nombre || 'proveedor'}`)
    limpiarCompraForm()
    setTab('compras')
  }

  const eliminarCompra = (id: string) => {
    if (!window.confirm('¿Eliminar esta compra?')) return
    setSettings((s) => ({
      ...s,
      extras: { ...s.extras, compras: s.extras.compras.filter((c) => c.id !== id) },
    }))
    showToast('Compra eliminada')
  }

  const waProveedor = (tel: string, nombre: string) => {
    openWhatsAppUrl(tel, `Hola ${nombre}, les contactamos desde ${tallerNom}.`)
  }

  const netoDisplay = (c: CompraProveedor) => {
    if (c.neto != null) return c.neto
    if (c.tieneIva !== false) return Math.round(c.monto / 1.19)
    return c.monto
  }

  const ivaDisplay = (c: CompraProveedor) => {
    if (c.iva != null) return c.iva
    if (c.tieneIva !== false) return c.monto - Math.round(c.monto / 1.19)
    return Math.round(c.monto * 0.19)
  }

  return (
    <>
      <div className="stats stats-creditos cred-stats-html prov-stats-grid">
        <div className="stat">
          <div className="stat-lbl">Proveedores</div>
          <div className="stat-val">{stats.nProv}</div>
          <div className="stat-sub">registrados</div>
        </div>
        <div className="stat">
          <div className="stat-lbl">Compras este mes</div>
          <div className="stat-val prov-accent-val">{fmt(stats.totalComprasMes)}</div>
          <div className="stat-sub">
            {stats.nFacMes} factura{stats.nFacMes !== 1 ? 's' : ''}
          </div>
        </div>
        <div className="stat">
          <div className="stat-lbl">Total comprado hist.</div>
          <div className="stat-val">{fmt(stats.totalCompras)}</div>
          <div className="stat-sub">acumulado</div>
        </div>
        <div className="stat">
          <div className="stat-lbl">Mayor proveedor</div>
          <div className="stat-val prov-mayor-nom">{stats.masComprado.nombre}</div>
          <div className="stat-sub">{fmt(stats.masComprado.monto)}</div>
        </div>
      </div>

      <div className="agenda-html-tabs tabs prov-main-tabs">
        <button type="button" className={tab === 'lista' ? 'tab active' : 'tab'} onClick={() => setTab('lista')}>
          Proveedores
        </button>
        <button type="button" className={tab === 'nuevo' ? 'tab active' : 'tab'} onClick={() => irTabNuevo()}>
          + Agregar proveedor
        </button>
        <button type="button" className={tab === 'compras' ? 'tab active' : 'tab'} onClick={() => setTab('compras')}>
          Compras
        </button>
        <button type="button" className={tab === 'nueva-compra' ? 'tab active' : 'tab'} onClick={() => setTab('nueva-compra')}>
          + Registrar compra
        </button>
      </div>

      {tab === 'lista' && (
        <>
          <div className="card prov-filter-card">
            <div className="inv-filters prov-sbar">
              <input
                className="input-buscar-clientes inv-filter-grow"
                placeholder="Buscar proveedor, RUT, rubro..."
                value={listaQ}
                onChange={(e) => setListaQ(e.target.value)}
              />
              <select className="inv-filter-select" value={listaRubro} onChange={(e) => setListaRubro(e.target.value)}>
                <option value="">Todos los rubros</option>
                {rubrosOpts.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {!listaFiltrada.length ? (
            <div className="empty">
              <div className="empty-icon">🏭</div>
              <div>No hay proveedores registrados</div>
            </div>
          ) : (
            <div className="prov-lista-wrap">
              {listaFiltrada.map((p) => {
                const totalComprado = compras.filter((c) => c.proveedorId === p.id).reduce((s, c) => s + c.monto, 0)
                const nCompras = compras.filter((c) => c.proveedorId === p.id).length
                const ultima = [...compras].filter((c) => c.proveedorId === p.id).sort((a, b) => (b.fecha > a.fecha ? 1 : -1))[0]
                const open = expandedProv.has(p.id)
                const miniCompras = [...compras]
                  .filter((c) => c.proveedorId === p.id)
                  .sort((a, b) => (b.fecha > a.fecha ? 1 : -1))
                  .slice(0, 3)

                return (
                  <div key={p.id} className="exp-row">
                    <div
                      className="exp-hdr"
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleProv(p.id)}
                      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggleProv(p.id)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 18 }} aria-hidden>
                          🏭
                        </span>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{p.nombre}</span>
                        {p.rubro ? <span className="badge b-blue">{p.rubro}</span> : null}
                        {p.condicionPago && p.condicionPago !== 'Contado' ? (
                          <span className="badge b-amber">{p.condicionPago}</span>
                        ) : null}
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div className="prov-hdr-total">{fmt(totalComprado)}</div>
                        <div style={{ fontSize: 10, color: 'var(--text2)' }}>
                          {nCompras} compra{nCompras !== 1 ? 's' : ''} ·{' '}
                          {ultima ? `última: ${isoDateToDdMmYyyy(ultima.fecha)}` : 'sin compras'}
                        </div>
                      </div>
                    </div>
                    {open ? (
                      <div className="exp-body">
                        <div className="g4 prov-detail-grid">
                          {p.rut ? (
                            <div>
                              <span style={{ color: 'var(--text2)' }}>RUT:</span> {p.rut}
                            </div>
                          ) : null}
                          {p.tel ? (
                            <div>
                              <span style={{ color: 'var(--text2)' }}>Teléfono:</span> {p.tel}
                            </div>
                          ) : null}
                          {p.email ? (
                            <div>
                              <span style={{ color: 'var(--text2)' }}>Email:</span> {p.email}
                            </div>
                          ) : null}
                          {p.web ? (
                            <div>
                              <span style={{ color: 'var(--text2)' }}>Web:</span>{' '}
                              <a
                                href={`https://${p.web.replace(/^https?:\/\//, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{ color: 'var(--accent)' }}
                              >
                                {p.web}
                              </a>
                            </div>
                          ) : null}
                          {p.ciudad ? (
                            <div>
                              <span style={{ color: 'var(--text2)' }}>Ciudad:</span> {p.ciudad}
                            </div>
                          ) : null}
                          {p.contacto ? (
                            <div>
                              <span style={{ color: 'var(--text2)' }}>Contacto:</span> {p.contacto}
                            </div>
                          ) : null}
                        </div>
                        {p.obs ? (
                          <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 10 }}>📋 {p.obs}</div>
                        ) : null}

                        {miniCompras.length ? (
                          <>
                            <div className="vh-hist-title">Últimas compras</div>
                            <div className="tw" style={{ marginBottom: 10 }}>
                              <table>
                                <thead>
                                  <tr>
                                    <th>Fecha</th>
                                    <th>Folio</th>
                                    <th>Descripción</th>
                                    <th>Cat.</th>
                                    <th className="tr">Monto</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {miniCompras.map((c) => (
                                    <tr key={c.id}>
                                      <td>{isoDateToDdMmYyyy(c.fecha)}</td>
                                      <td className="td-mono" style={{ fontSize: 11 }}>
                                        {c.folio || '—'}
                                      </td>
                                      <td style={{ fontSize: 11 }}>{(c.descripcion || '').slice(0, 35) || '—'}</td>
                                      <td>
                                        <span className="badge b-gray" style={{ fontSize: 9 }}>
                                          {c.categoria || '—'}
                                        </span>
                                      </td>
                                      <td className="tr td-mono" style={{ fontWeight: 600 }}>
                                        {fmt(c.monto)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </>
                        ) : null}

                        <div className="row-acts prov-card-actions">
                          <button type="button" className="btn btn-xs btn-teal" onClick={() => preselProvCompra(p.id)}>
                            + Registrar compra
                          </button>
                          {p.tel ? (
                            <button type="button" className="btn btn-xs btn-green" onClick={() => waProveedor(p.tel!, p.nombre)}>
                              WhatsApp
                            </button>
                          ) : null}
                          {p.email ? (
                            <button
                              type="button"
                              className="btn btn-xs"
                              onClick={() => window.open(`mailto:${p.email}`, '_blank')}
                            >
                              Email
                            </button>
                          ) : null}
                          <button type="button" className="btn btn-xs" onClick={() => editarProveedor(p.id)}>
                            ✏ Editar
                          </button>
                          <button type="button" className="btn btn-xs btn-red" onClick={() => eliminarProveedor(p.id)}>
                            Eliminar
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {tab === 'nuevo' && (
        <div className="card prov-form-card">
          <div className="card-title">
            <div className="card-title-left">{provDraft.editId ? 'Editar proveedor' : 'Agregar proveedor'}</div>
          </div>
          <div className="g3" style={{ marginBottom: 12 }}>
            <div className="field field-span-full">
              <label>Nombre / Razón social *</label>
              <input
                value={provDraft.nombre}
                onChange={(e) => setProvDraft((d) => ({ ...d, nombre: e.target.value }))}
                placeholder="Ej: Repuestos del Sur Ltda."
              />
            </div>
            <div className="field">
              <label>RUT</label>
              <input value={provDraft.rut} onChange={(e) => setProvDraft((d) => ({ ...d, rut: e.target.value }))} placeholder="76.123.456-7" />
            </div>
            <div className="field">
              <label>Rubro / Categoría</label>
              <input
                value={provDraft.rubro}
                onChange={(e) => setProvDraft((d) => ({ ...d, rubro: e.target.value }))}
                placeholder="Repuestos, Lubricantes..."
                list="prov-rubros-datalist"
              />
              <datalist id="prov-rubros-datalist">
                {rubrosOpts.map((r) => (
                  <option key={r} value={r} />
                ))}
              </datalist>
            </div>
            <div className="field">
              <label>Teléfono</label>
              <input value={provDraft.tel} onChange={(e) => setProvDraft((d) => ({ ...d, tel: e.target.value }))} placeholder="+56 9 ..." />
            </div>
            <div className="field">
              <label>Email</label>
              <input
                type="email"
                value={provDraft.email}
                onChange={(e) => setProvDraft((d) => ({ ...d, email: e.target.value }))}
                placeholder="ventas@proveedor.cl"
              />
            </div>
            <div className="field">
              <label>Sitio web</label>
              <input value={provDraft.web} onChange={(e) => setProvDraft((d) => ({ ...d, web: e.target.value }))} placeholder="www.proveedor.cl" />
            </div>
            <div className="field">
              <label>Ciudad</label>
              <input value={provDraft.ciudad} onChange={(e) => setProvDraft((d) => ({ ...d, ciudad: e.target.value }))} placeholder="Puerto Montt" />
            </div>
            <div className="field">
              <label>Dirección</label>
              <input value={provDraft.dir} onChange={(e) => setProvDraft((d) => ({ ...d, dir: e.target.value }))} placeholder="Calle, N°" />
            </div>
            <div className="field">
              <label>Condición de pago</label>
              <select
                className="select-cli-tipo"
                value={provDraft.condicionPago}
                onChange={(e) => setProvDraft((d) => ({ ...d, condicionPago: e.target.value }))}
              >
                {COND_PROV.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="field" style={{ marginBottom: 12 }}>
            <label>Nombre contacto</label>
            <input
              value={provDraft.contacto}
              onChange={(e) => setProvDraft((d) => ({ ...d, contacto: e.target.value }))}
              placeholder="Juan Pérez — Representante"
            />
          </div>
          <div className="field" style={{ marginBottom: 12 }}>
            <label>Observaciones / Notas</label>
            <textarea
              rows={3}
              value={provDraft.obs}
              onChange={(e) => setProvDraft((d) => ({ ...d, obs: e.target.value }))}
              placeholder="Ej: Proveedor principal de aceites..."
            />
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-primary" onClick={guardarProveedor}>
              ✓ Guardar proveedor
            </button>
            <button type="button" className="btn btn-outline" onClick={limpiarProvForm}>
              ↺ Limpiar
            </button>
          </div>
        </div>
      )}

      {tab === 'compras' && (
        <>
          <div className="card prov-filter-card">
            <div className="inv-filters prov-sbar prov-compras-filters">
              <input
                className="input-buscar-clientes inv-filter-grow"
                placeholder="Buscar proveedor, producto, N° factura..."
                value={comprasQ}
                onChange={(e) => setComprasQ(e.target.value)}
              />
              <input type="date" className="inv-filter-select prov-date-input" value={comprasDesde} onChange={(e) => setComprasDesde(e.target.value)} title="Desde" />
              <input type="date" className="inv-filter-select prov-date-input" value={comprasHasta} onChange={(e) => setComprasHasta(e.target.value)} title="Hasta" />
              <select className="inv-filter-select" value={comprasProvF} onChange={(e) => setComprasProvF(e.target.value)}>
                <option value="">Todos los proveedores</option>
                {proveedores.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="prov-compras-resumen">
            {comprasLista.length
              ? `${comprasLista.length} compra${comprasLista.length !== 1 ? 's' : ''} · Total: ${fmt(comprasTotalFilt)}`
              : ''}
          </div>
          {!comprasLista.length ? (
            <div className="empty">
              <div className="empty-icon">📦</div>
              <div>Sin compras registradas</div>
            </div>
          ) : (
            <div className="tw">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Proveedor</th>
                    <th>N° Folio</th>
                    <th>Descripción</th>
                    <th>Categoría</th>
                    <th>Forma pago</th>
                    <th className="tr">Neto</th>
                    <th className="tr">IVA</th>
                    <th className="tr">Total</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {comprasLista.map((c) => (
                    <tr key={c.id}>
                      <td style={{ fontSize: 11 }}>{isoDateToDdMmYyyy(c.fecha)}</td>
                      <td style={{ fontWeight: 500 }}>{c.proveedorNombre}</td>
                      <td className="td-mono" style={{ fontSize: 11 }}>
                        {c.folio || '—'}
                      </td>
                      <td style={{ fontSize: 11, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.descripcion || '—'}
                      </td>
                      <td>
                        <span className="badge b-gray" style={{ fontSize: 9 }}>
                          {c.categoria || '—'}
                        </span>
                      </td>
                      <td style={{ fontSize: 11, color: 'var(--text2)' }}>{c.fpago || '—'}</td>
                      <td className="tr td-mono" style={{ fontSize: 11 }}>
                        {fmt(netoDisplay(c))}
                      </td>
                      <td className="tr td-mono" style={{ fontSize: 11, color: 'var(--text2)' }}>
                        {fmt(ivaDisplay(c))}
                      </td>
                      <td className="tr td-mono" style={{ fontWeight: 600 }}>
                        {fmt(c.monto)}
                      </td>
                      <td>
                        <button type="button" className="btn btn-xs btn-red" onClick={() => eliminarCompra(c.id)}>
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === 'nueva-compra' && (
        <div className="card prov-form-card">
          <div className="card-title">
            <div className="card-title-left">Registrar compra / factura</div>
          </div>
          <div className="g3" style={{ marginBottom: 12 }}>
            <div className="field">
              <label>Proveedor *</label>
              <select className="select-cli-tipo" value={compraProvId} onChange={(e) => setCompraProvId(e.target.value)}>
                <option value="">— Seleccionar —</option>
                {proveedores.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>N° Factura / Documento</label>
              <input value={compraFolio} onChange={(e) => setCompraFolio(e.target.value)} placeholder="Ej: F-001234" />
            </div>
            <div className="field">
              <label>Fecha *</label>
              <input type="date" value={compraFecha} onChange={(e) => setCompraFecha(e.target.value)} />
            </div>
            <div className="field">
              <label>Monto total ($) *</label>
              <input
                type="number"
                min={0}
                step={1}
                value={compraMonto}
                onChange={(e) => setCompraMonto(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="field">
              <label>¿Incluye IVA?</label>
              <select className="select-cli-tipo" value={compraIvaSi ? 'si' : 'no'} onChange={(e) => setCompraIvaSi(e.target.value === 'si')}>
                <option value="si">Sí — monto con IVA incluido</option>
                <option value="no">No — monto neto sin IVA</option>
              </select>
            </div>
            <div className="field">
              <label>Forma de pago</label>
              <select className="select-cli-tipo" value={compraFpago} onChange={(e) => setCompraFpago(e.target.value)}>
                {FPAGO_COMPRA.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Categoría</label>
              <select className="select-cli-tipo" value={compraCat} onChange={(e) => setCompraCat(e.target.value)}>
                {CAT_COMPRA.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {compraIvaDetalle ? (
            <div className="compra-iva-detalle">{compraIvaDetalle.html}</div>
          ) : null}
          <div className="field" style={{ marginBottom: 12 }}>
            <label>Descripción / productos comprados</label>
            <textarea rows={3} value={compraDesc} onChange={(e) => setCompraDesc(e.target.value)} placeholder="Detalle de la compra..." />
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-primary" onClick={guardarCompra}>
              ✓ Registrar compra
            </button>
            <button type="button" className="btn btn-outline" onClick={limpiarCompraForm}>
              ↺ Limpiar
            </button>
          </div>
        </div>
      )}
    </>
  )
}
