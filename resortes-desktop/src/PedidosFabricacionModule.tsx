import { type Dispatch, type SetStateAction, useEffect, useMemo, useState } from 'react'
import type { AppSettings, Db, LineItem, PedidoFabricacion } from './appTypes'
import { LineItemsEditor } from './LineItemsEditor'
import {
  inventarioCoincidenciaExacta,
  makeLineItem,
  matchClienteByName,
  normalizeLineItem,
  precioUnitDesdeInvOlibre,
  totalDocumentoConDescuento,
  UNIDADES_OPS,
  nextPedidoFabricacionFolio,
} from './opsHelpers'
import { fmtIsoDate } from './dateFormat'
import { openWhatsAppUrl } from './whatsappOpen'
import { fmtMoney, PRINT_FONT_IMPORT_CSS, PRINT_FONT_SANS_STACK, RPM_BRAND_PRINT } from './anticiposComprobantePrint'

type Props = {
  db: Db
  settings: AppSettings
  setSettings: Dispatch<SetStateAction<AppSettings>>
  showToast: (msg: string, type?: 'ok' | 'err' | 'warn') => void
}

const ESTADOS_PF = ['Recibido', 'En fabricación', 'Listo para retiro', 'Retirado']
const FPAGO_PF = ['Contado', 'Transferencia', 'Débito', 'Crédito', 'Cheque', 'Otro']

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function printPedido(settings: AppSettings, p: PedidoFabricacion): boolean {
  const e = settings.empresa
  const B = RPM_BRAND_PRINT
  const logo = settings.logoDataUrl || ''
  const rows = p.items
    .map(
      (it, i) =>
        `<tr><td style="color:#aaa">${i + 1}</td><td>${escapeHtml(it.nombre)}</td><td>${it.qty}</td><td>${escapeHtml(it.unidad)}</td></tr>`,
    )
    .join('')
  const inner = `<style>${PRINT_FONT_IMPORT_CSS}
    body{font-family:${PRINT_FONT_SANS_STACK};font-size:12px;color:${B.text}}
    .doc{max-width:700px;margin:0 auto}
    .hdr{display:flex;justify-content:space-between;border-bottom:2px solid ${B.accentDark};padding-bottom:12px;margin-bottom:16px}
    .num{font-size:22px;font-weight:700;color:#1a5a4a}
    table{width:100%;border-collapse:collapse;font-size:11px}
    th,td{border-bottom:1px solid #e8e8e8;padding:6px 8px;text-align:left}
    .tot{margin-top:14px;padding:12px;border-radius:8px;background:#1a5a4a;color:#fff;display:flex;justify-content:space-between}
  </style>
  <div class="doc"><div class="hdr"><div>${logo ? `<img src="${logo}" style="height:48px" alt="">` : ''}<div style="font-size:17px;font-weight:700">${escapeHtml(e.nombre || 'Taller')}</div></div>
  <div style="text-align:right"><div style="font-size:10px;color:#888">Pedido fabricación</div><div class="num">${escapeHtml(p.folio)}</div></div></div>
  <p><strong>Cliente:</strong> ${escapeHtml(p.clienteNombre)} · <strong>Tel:</strong> ${escapeHtml(p.tel)}</p>
  <p><strong>Mecánico:</strong> ${escapeHtml(p.mecanico)} · <strong>Estado:</strong> ${escapeHtml(p.estado)}</p>
  <p><strong>Pedido:</strong> ${fmtIsoDate(p.fechaPedido)} · <strong>Entrega est.:</strong> ${p.fechaEntregaEst ? fmtIsoDate(p.fechaEntregaEst) : '—'}</p>
  <h3 style="font-size:12px;margin:12px 0 6px">Especificaciones</h3><div style="background:#f5f5f5;padding:10px;border-radius:6px;white-space:pre-wrap">${escapeHtml(p.especificaciones || '—')}</div>
  <h3 style="font-size:12px;margin:12px 0 6px">Ítems</h3><table><thead><tr><th>#</th><th>Descripción</th><th>Cant.</th><th>Un.</th></tr></thead><tbody>${rows}</tbody></table>
  <div class="tot"><span>Total</span><strong>${fmtMoney(p.total)}</strong></div>
  <p>Seña recibida: <strong>${fmtMoney(p.senaRecibida)}</strong> · Forma pago: ${escapeHtml(p.fpago)} · Descuento: ${fmtMoney(p.descuento)}</p>
  ${p.obs ? `<p><strong>Obs:</strong> ${escapeHtml(p.obs)}</p>` : ''}
  </div>`
  const win = window.open('', '_blank', 'width=860,height=1100')
  if (!win) return false
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${escapeHtml(p.folio)}</title></head><body>${inner}</body></html>`)
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 400)
  return true
}

export function PedidosFabricacionModule({ db, settings, setSettings, showToast }: Props) {
  const pedidos = settings.extras.pedidosFabricacion ?? []
  const [clienteNom, setClienteNom] = useState('')
  const [tel, setTel] = useState('')
  const [fechaPedido, setFechaPedido] = useState(() => new Date().toISOString().slice(0, 10))
  const [fechaEntregaEst, setFechaEntregaEst] = useState('')
  const [estadoPF, setEstadoPF] = useState('Recibido')
  const [mecanicoId, setMecanicoId] = useState('')
  const [espec, setEspec] = useState('')
  const [items, setItems] = useState<LineItem[]>([])
  const [rowNom, setRowNom] = useState('')
  const [rowUni, setRowUni] = useState('Unidad')
  const [rowQty, setRowQty] = useState(1)
  const [rowPu, setRowPu] = useState(0)
  const [sena, setSena] = useState(0)
  const [fpago, setFpago] = useState('Contado')
  const [descuento, setDescuento] = useState(0)
  const [obs, setObs] = useState('')
  const [buscar, setBuscar] = useState('')
  const [expandedFolio, setExpandedFolio] = useState<string | null>(null)
  const [step2, setStep2] = useState(false)
  const [step3, setStep3] = useState(false)

  const previewFolio = useMemo(() => nextPedidoFabricacionFolio(pedidos), [pedidos])
  const mecanicosActivos = useMemo(() => db.mecanicos.filter((m) => m.activo !== false), [db.mecanicos])

  useEffect(() => {
    try {
      const g = sessionStorage.getItem('rpm-global-filter')
      if (g) {
        setBuscar(g)
        sessionStorage.removeItem('rpm-global-filter')
      }
    } catch {
      /* ignore */
    }
  }, [])

  const lista = useMemo(() => {
    let rows = [...pedidos].sort((a, b) => (a.creado < b.creado ? 1 : -1))
    const q = buscar.toLowerCase().trim()
    if (q) {
      rows = rows.filter(
        (p) =>
          p.folio.toLowerCase().includes(q) ||
          p.clienteNombre.toLowerCase().includes(q) ||
          (p.tel || '').includes(q),
      )
    }
    return rows
  }, [pedidos, buscar])

  const activos = useMemo(() => lista.filter((p) => p.estado !== 'Retirado'), [lista])
  const retirados = useMemo(() => lista.filter((p) => p.estado === 'Retirado'), [lista])

  const fmt = (n: number) =>
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Math.round(n))

  const agregarItem = () => {
    const nombre = rowNom.trim()
    if (!nombre) {
      showToast('Indica producto o material', 'warn')
      return
    }
    const inv = inventarioCoincidenciaExacta(db, nombre)
    const cat = inv?.categoria || 'Otros'
    const pu = precioUnitDesdeInvOlibre(inv, rowPu)
    const base = makeLineItem(nombre, rowUni, rowQty, pu, cat)
    const line = inv
      ? normalizeLineItem({ ...base, pid: inv.id, libre: false, unidad: inv.unidad || base.unidad })
      : normalizeLineItem(base)
    setItems((prev) => [...prev, line])
    setRowNom('')
    setRowQty(1)
    setRowPu(0)
    setRowUni('Unidad')
  }

  const guardar = () => {
    const nom = clienteNom.trim()
    if (!nom) {
      showToast('Indica el cliente', 'err')
      return
    }
    if (!items.length) {
      showToast('Agrega al menos un ítem del inventario o servicio', 'err')
      return
    }
    const m = matchClienteByName(db, nom)
    const itemsNorm = items.map((x) => normalizeLineItem(x))
    const desc = Math.max(0, descuento)
    const total = totalDocumentoConDescuento(itemsNorm, desc)
    const mec = mecanicosActivos.find((x) => x.id === mecanicoId)
    const row: PedidoFabricacion = {
      folio: nextPedidoFabricacionFolio(pedidos),
      clienteId: m?.id ?? null,
      clienteNombre: m?.nombre ?? nom,
      tel: tel.trim() || m?.tel || '',
      fechaPedido,
      fechaEntregaEst: fechaEntregaEst.trim(),
      estado: estadoPF,
      mecanicoId: mec?.id ?? '',
      mecanico: mec?.nombre ?? '',
      especificaciones: espec.trim(),
      items: itemsNorm,
      senaRecibida: Math.max(0, sena),
      fpago,
      descuento: desc,
      total,
      obs: obs.trim(),
      creado: new Date().toISOString(),
    }
    setSettings((s) => ({
      ...s,
      extras: { ...s.extras, pedidosFabricacion: [row, ...(s.extras.pedidosFabricacion ?? [])] },
    }))
    showToast(`Pedido ${row.folio} guardado`)
    setClienteNom('')
    setTel('')
    setFechaPedido(new Date().toISOString().slice(0, 10))
    setFechaEntregaEst('')
    setEstadoPF('Recibido')
    setMecanicoId('')
    setEspec('')
    setItems([])
    setSena(0)
    setFpago('Contado')
    setDescuento(0)
    setObs('')
    setStep2(false)
    setStep3(false)
  }

  const limpiar = () => {
    setClienteNom('')
    setTel('')
    setFechaPedido(new Date().toISOString().slice(0, 10))
    setFechaEntregaEst('')
    setEstadoPF('Recibido')
    setMecanicoId('')
    setEspec('')
    setItems([])
    setSena(0)
    setFpago('Contado')
    setDescuento(0)
    setObs('')
    setStep2(false)
    setStep3(false)
  }

  const patchPedido = (folio: string, patch: Partial<PedidoFabricacion>) => {
    setSettings((s) => ({
      ...s,
      extras: {
        ...s.extras,
        pedidosFabricacion: (s.extras.pedidosFabricacion ?? []).map((x) => (x.folio === folio ? { ...x, ...patch } : x)),
      },
    }))
  }

  const patchItems = (folio: string, next: LineItem[]) => {
    const p = pedidos.find((x) => x.folio === folio)
    if (!p) return
    const norm = next.map((x) => normalizeLineItem(x))
    const total = totalDocumentoConDescuento(norm, p.descuento)
    patchPedido(folio, { items: norm, total })
  }

  const eliminar = (folio: string) => {
    if (!window.confirm('¿Eliminar este pedido?')) return
    setSettings((s) => ({
      ...s,
      extras: {
        ...s.extras,
        pedidosFabricacion: (s.extras.pedidosFabricacion ?? []).filter((x) => x.folio !== folio),
      },
    }))
    if (expandedFolio === folio) setExpandedFolio(null)
    showToast('Pedido eliminado')
  }

  const wa = (p: PedidoFabricacion) => {
    const msg = `Hola ${p.clienteNombre}, le informamos sobre su pedido ${p.folio} (${p.estado}). ¿Alguna consulta? — ${settings.empresa.nombre || 'Taller'}`
    if (!openWhatsAppUrl(p.tel, msg)) showToast('Sin teléfono válido para WhatsApp', 'warn')
  }

  return (
    <>
      <div className="card card-ot">
        <div className="card-title">
          <div className="card-title-left">Nuevo pedido de fabricación</div>
        </div>
        <div className="rpm-step rpm-step--ot1 rpm-step-open">
          <div className="rpm-step-head">
            <span className="rpm-step-num">1</span>
            <div>
              <div className="rpm-step-title">Cliente y fechas</div>
              <div className="rpm-step-sub muted">Contacto · pedido · entrega estimada</div>
            </div>
          </div>
          <div className="rpm-step-body">
            <div className="g3 form-ops-row1">
              <div className="field">
                <label>Cliente</label>
                <input
                  list="pf-clientes"
                  value={clienteNom}
                  onChange={(e) => {
                    setClienteNom(e.target.value)
                    const mm = matchClienteByName(db, e.target.value)
                    if (mm?.tel) setTel(mm.tel)
                  }}
                  placeholder="Nombre..."
                />
                <datalist id="pf-clientes">
                  {db.clientes.map((c) => (
                    <option key={c.id} value={c.nombre} />
                  ))}
                </datalist>
              </div>
              <div className="field">
                <label>Teléfono</label>
                <input value={tel} onChange={(e) => setTel(e.target.value)} placeholder="+56..." />
              </div>
              <div className="field">
                <label>N° pedido</label>
                <input readOnly className="input-readonly" value={previewFolio} />
              </div>
            </div>
            <div className="g3 form-ops-row1">
              <div className="field">
                <label>Fecha pedido</label>
                <input type="date" value={fechaPedido} onChange={(e) => setFechaPedido(e.target.value)} />
              </div>
              <div className="field">
                <label>Fecha entrega estimada</label>
                <input type="date" value={fechaEntregaEst} onChange={(e) => setFechaEntregaEst(e.target.value)} />
              </div>
              <div className="field">
                <label>Estado</label>
                <select value={estadoPF} onChange={(e) => setEstadoPF(e.target.value)}>
                  {ESTADOS_PF.map((e) => (
                    <option key={e} value={e}>
                      {e}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <button type="button" className={`rpm-step-toggle rpm-step--ot2${step2 ? ' is-open' : ''}`} onClick={() => setStep2((v) => !v)}>
          <span className="rpm-step-num">2</span>
          <div className="rpm-step-toggle-text">
            <span className="rpm-step-title">Trabajo e ítems</span>
            <span className="rpm-step-sub muted">mecánico · especificaciones · inventario</span>
          </div>
          <span className="rpm-step-chevron">{step2 ? '▼' : '▶'}</span>
        </button>
        {step2 ? (
          <div className="rpm-step-body rpm-step-body-nested">
            <div className="field">
              <label>Mecánico asignado</label>
              <select value={mecanicoId} onChange={(e) => setMecanicoId(e.target.value)}>
                <option value="">— Seleccionar —</option>
                {mecanicosActivos.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="field field-full">
              <label>Especificaciones técnicas</label>
              <textarea rows={5} value={espec} onChange={(e) => setEspec(e.target.value)} placeholder="Medidas, material, cantidad de hojas..." />
            </div>
            <div className="g4-items">
              <div className="field">
                <label>Ítem (inventario)</label>
                <input
                  list="pf-inv"
                  value={rowNom}
                  onChange={(e) => {
                    const v = e.target.value
                    setRowNom(v)
                    const inv = inventarioCoincidenciaExacta(db, v)
                    if (!inv) return
                    setRowPu(Math.max(0, Number(inv.precio) || 0))
                    const u = String(inv.unidad ?? '').trim()
                    if (u && UNIDADES_OPS.includes(u)) setRowUni(u)
                  }}
                />
                <datalist id="pf-inv">
                  {db.inventario.map((p) => (
                    <option key={p.id} value={p.nombre} />
                  ))}
                </datalist>
              </div>
              <div className="field">
                <label>Unidad</label>
                <select value={rowUni} onChange={(e) => setRowUni(e.target.value)}>
                  {UNIDADES_OPS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Cantidad</label>
                <input type="number" min={0} step={1} value={rowQty} onChange={(e) => setRowQty(Number(e.target.value))} />
              </div>
              <div className="field">
                <label>P. unit.</label>
                <input type="number" min={0} step={1} value={rowPu} onChange={(e) => setRowPu(Number(e.target.value))} />
              </div>
            </div>
            <div className="form-ops-add-row">
              <button type="button" className="btn btn-agregar-item" onClick={agregarItem}>
                + Agregar ítem
              </button>
            </div>
            <LineItemsEditor items={items} onChange={setItems} fmt={fmt} />
          </div>
        ) : null}

        <button type="button" className={`rpm-step-toggle rpm-step--ot3${step3 ? ' is-open' : ''}`} onClick={() => setStep3((v) => !v)}>
          <span className="rpm-step-num">3</span>
          <div className="rpm-step-toggle-text">
            <span className="rpm-step-title">Pago y cierre</span>
            <span className="rpm-step-sub muted">seña · forma de pago · descuento</span>
          </div>
          <span className="rpm-step-chevron">{step3 ? '▼' : '▶'}</span>
        </button>
        {step3 ? (
          <div className="rpm-step-body rpm-step-body-nested">
            <div className="g3 form-ops-row1">
              <div className="field">
                <label>Seña recibida ($)</label>
                <input type="number" min={0} step={1} value={sena} onChange={(e) => setSena(Number(e.target.value))} />
              </div>
              <div className="field">
                <label>Forma de pago</label>
                <select value={fpago} onChange={(e) => setFpago(e.target.value)}>
                  {FPAGO_PF.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Descuento ($)</label>
                <input type="number" min={0} step={1} value={descuento} onChange={(e) => setDescuento(Number(e.target.value))} />
              </div>
            </div>
            <div className="field field-full">
              <label>Observaciones</label>
              <textarea rows={3} value={obs} onChange={(e) => setObs(e.target.value)} />
            </div>
            <p className="muted" style={{ fontSize: 12 }}>
              Total: <strong>{fmt(totalDocumentoConDescuento(items.map((x) => normalizeLineItem(x)), descuento))}</strong> · Saldo aprox.:{' '}
              <strong>{fmt(Math.max(0, totalDocumentoConDescuento(items.map((x) => normalizeLineItem(x)), descuento) - Math.max(0, sena)))}</strong>
            </p>
          </div>
        ) : null}

        <div className="form-row-actions" style={{ marginTop: 14 }}>
          <button type="button" className="btn btn-primary" onClick={guardar}>
            ✓ Guardar pedido
          </button>
          <button type="button" className="btn btn-outline" onClick={limpiar}>
            ↺ Limpiar
          </button>
        </div>
      </div>

      <div className="card card-ot">
        <div className="card-title">
          <div className="card-title-left">Pedidos de fabricación</div>
          <span className="card-count">{lista.length}</span>
        </div>
        <div className="inv-filters">
          <input
            className="input-buscar-clientes inv-filter-grow"
            placeholder="Buscar folio, cliente, teléfono..."
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
          />
        </div>
        {!lista.length ? (
          <div className="empty">
            <div className="empty-icon">🏭</div>
            <div>No hay pedidos</div>
          </div>
        ) : (
          <div className="lista-ots-exp">
            {activos.length ? <div className="rpm-ot-group-label rpm-ot-group-activas">Activos</div> : null}
            {activos.map((p) => {
              const open = expandedFolio === p.folio
              const saldo = Math.max(0, p.total - (p.senaRecibida || 0))
              return (
                <div key={p.folio} className="exp-row rpm-ot-fila-activa">
                  <button type="button" className="exp-hdr" onClick={() => setExpandedFolio(open ? null : p.folio)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span className="folio-ot">{p.folio}</span>
                      <span style={{ fontWeight: 600 }}>{p.clienteNombre}</span>
                      {p.mecanico ? <span className="rpm-mec-row-badge">👷 {p.mecanico}</span> : null}
                      <span className="badge b-gray">{p.estado}</span>
                    </div>
                    <div className="exp-hdr-meta">
                      <div className="exp-hdr-meta-total">{fmt(p.total)}</div>
                      <div className="exp-hdr-meta-sub">
                        Seña {fmt(p.senaRecibida)} · Saldo {fmt(saldo)}
                      </div>
                    </div>
                  </button>
                  {open ? (
                    <div className="exp-body">
                      <div className="field">
                        <label>Estado</label>
                        <select value={p.estado} onChange={(e) => patchPedido(p.folio, { estado: e.target.value })}>
                          {ESTADOS_PF.map((e) => (
                            <option key={e} value={e}>
                              {e}
                            </option>
                          ))}
                        </select>
                      </div>
                      <LineItemsEditor items={p.items} onChange={(n) => patchItems(p.folio, n)} fmt={fmt} />
                      <div className="cot-exp-actions">
                        <button
                          type="button"
                          className="btn btn-xs btn-outline"
                          onClick={() => {
                            const ok = printPedido(settings, p)
                            if (!ok) showToast('El navegador bloqueó la ventana de impresión', 'warn')
                          }}
                        >
                          🖨 PDF
                        </button>
                        <button type="button" className="btn btn-xs btn-green" onClick={() => wa(p)}>
                          💬 WhatsApp
                        </button>
                        <button type="button" className="btn btn-xs btn-red" onClick={() => eliminar(p.folio)}>
                          🗑 Eliminar
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              )
            })}
            {retirados.length ? (
              <>
                <div className="rpm-ot-group-sep">
                  <span>Retirados</span>
                </div>
                {retirados.map((p) => {
                  const open = expandedFolio === p.folio
                  return (
                    <div key={p.folio} className="exp-row ot-exp-entregado">
                      <button type="button" className="exp-hdr ot-exp-hdr-entregado" onClick={() => setExpandedFolio(open ? null : p.folio)}>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                          <span className="folio-ot">{p.folio}</span>
                          <span>{p.clienteNombre}</span>
                          {p.mecanico ? <span className="rpm-mec-row-badge">👷 {p.mecanico}</span> : null}
                        </div>
                        <div className="exp-hdr-meta">
                          <div className="exp-hdr-meta-total">{fmt(p.total)}</div>
                        </div>
                      </button>
                      {open ? (
                        <div className="exp-body">
                          <LineItemsEditor items={p.items} onChange={(n) => patchItems(p.folio, n)} fmt={fmt} />
                          <button type="button" className="btn btn-xs btn-outline" onClick={() => printPedido(settings, p)}>
                            🖨 PDF
                          </button>
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </>
            ) : null}
          </div>
        )}
      </div>
    </>
  )
}
