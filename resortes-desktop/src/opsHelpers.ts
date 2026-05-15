import type { Cliente, Cotizacion, Db, LineItem, MecanicoRef, Orden, Producto, Vehiculo, Venta } from './appTypes'

export const UNIDADES_OPS = ['Unidad', 'Litro', 'Kg', 'Par', 'Metro', 'Caja', 'Horas', 'Galón']

/** Paridad HTML: IVA sobre neto tras dto */
export const IVA_RATE = 0.19

/** Sin `activo` explícito o `estado` legacy = en nómina (igual que INSERT en Supabase `activo !== false`). */
export function mecanicoEnNomina(m: { activo?: boolean }): boolean {
  return m.activo !== false
}

export function nextFolio(prefix: 'COT' | 'OT' | 'VT', db: Db): string {
  let folios: string[] = []
  if (prefix === 'COT') folios = db.cotizaciones.map((c) => c.folio)
  else if (prefix === 'OT') folios = db.ordenes.map((o) => o.folio)
  else folios = db.ventas.map((v) => v.folio)
  const re = new RegExp(`^${prefix}-(\\d+)$`, 'i')
  let max = 0
  for (const f of folios) {
    const m = f.match(re)
    if (m) max = Math.max(max, parseInt(m[1], 10))
  }
  return `${prefix}-${String(max + 1).padStart(4, '0')}`
}

export function nextPedidoFabricacionFolio(pedidos: { folio: string }[]): string {
  const re = /^PF-(\d+)$/i
  let max = 0
  for (const p of pedidos) {
    const m = String(p.folio || '').match(re)
    if (m) max = Math.max(max, parseInt(m[1], 10))
  }
  return `PF-${String(max + 1).padStart(4, '0')}`
}

export function lineSubNeto(li: Pick<LineItem, 'qty' | 'pu' | 'dto'>): number {
  const dto = Math.min(100, Math.max(0, Number(li.dto) || 0))
  const qty = Number(li.qty) || 0
  const pu = Number(li.pu) || 0
  return Math.round(qty * pu * (1 - dto / 100))
}

export function lineIvaAmt(li: Pick<LineItem, 'qty' | 'pu' | 'dto' | 'iva'>): number {
  if (!li.iva) return 0
  return Math.round(lineSubNeto(li) * IVA_RATE)
}

/** Total línea: neto tras dto + IVA opcional */
export function lineTotalConIva(li: LineItem): number {
  return lineSubNeto(li) + lineIvaAmt(li)
}

export function sumItemsConIva(items: LineItem[]): number {
  return items.reduce((s, i) => s + lineTotalConIva(i), 0)
}

/** Bruto ítems (antes de descuento global del documento). */
export function brutoDocumentoDesdeItems(items: LineItem[]): number {
  return sumItemsConIva(items.map((x) => normalizeLineItem(x)))
}

/** Total a cobrar: bruto ítems menos descuento global (como ventas). */
export function totalDocumentoConDescuento(items: LineItem[], descuentoGlobal: number): number {
  const bruto = brutoDocumentoDesdeItems(items)
  const d = Math.max(0, Number(descuentoGlobal) || 0)
  return Math.max(0, bruto - d)
}

/** Desglose tipo HTML `calcTotales` (sin descuento global de venta) */
export function calcTotalesLines(items: LineItem[]) {
  const subBruto = items.reduce((s, l) => s + Math.round(l.qty * l.pu), 0)
  const subNeto = items.reduce((s, l) => s + lineSubNeto(l), 0)
  const dtoTotal = Math.max(0, subBruto - subNeto)
  const ivaAmt = items.reduce((s, l) => s + lineIvaAmt(l), 0)
  const total = subNeto + ivaAmt
  return { subBruto, subNeto, dtoTotal, ivaAmt, total }
}

/** @deprecated usar sumItemsConIva */
export function totalLineItems(items: LineItem[]) {
  return sumItemsConIva(items)
}

export function makeLineItem(nombre: string, unidad: string, qty: number, pu: number, cat = 'Servicios'): LineItem {
  const q = Math.max(0, qty)
  const p = Math.max(0, pu)
  const dto = 0
  const sub = Math.round(q * p * (1 - dto / 100))
  return {
    nombre: nombre.trim(),
    unidad,
    cat,
    qty: q,
    pu: p,
    dto,
    sub,
    libre: true,
    iva: false,
  }
}

/** Coincidencia exacta nombre o código (p. ej. al elegir opción desde datalist de inventario). */
export function inventarioCoincidenciaExacta(db: Db, texto: string): Producto | null {
  const v = texto.trim()
  if (!v) return null
  const vl = v.toLowerCase()
  return (
    db.inventario.find((p) => {
      const nom = String(p.nombre ?? '').trim().toLowerCase()
      const cod = String(p.codigo ?? '').trim().toLowerCase()
      return nom === vl || (cod.length > 0 && cod === vl)
    }) ?? null
  )
}

/** P. unit. de venta desde inventario; si no coincide con inventario usa `precioLibre`. */
export function precioUnitDesdeInvOlibre(inv: Producto | null | undefined, precioLibre: number): number {
  if (!inv) return Math.max(0, Number(precioLibre) || 0)
  return Math.max(0, Number(inv.precio) || 0)
}

export function matchClienteByName(db: Db, name: string): Cliente | null {
  const t = name.trim().toLowerCase()
  if (!t) return null
  return db.clientes.find((c) => c.nombre.toLowerCase() === t) ?? null
}

export function normalizeLineItem(li: Partial<LineItem>): LineItem {
  const qty = Number(li.qty) || 0
  const pu = Number(li.pu) || 0
  const dto = Math.min(100, Math.max(0, Number(li.dto) || 0))
  const base = { ...li, qty, pu, dto }
  const sub = lineSubNeto(base)
  return {
    pid: li.pid ?? null,
    nombre: li.nombre || '',
    unidad: li.unidad || 'Unidad',
    cat: li.cat || 'Servicios',
    qty,
    pu,
    dto,
    sub,
    libre: li.libre,
    iva: Boolean(li.iva),
  }
}

/** Migración desde datos antiguos que usaban «Aprobada» */
export function mapEstadoCotizacion(estado: string): string {
  if (estado === 'Aprobada') return 'Aceptada'
  return estado
}

export function ordenMecanicosFromRow(o: Record<string, unknown>): MecanicoRef[] {
  const raw = o.mecanicos
  if (Array.isArray(raw) && raw.length) {
    return raw.map((x: unknown) => {
      const r = x as { id?: unknown; nombre?: unknown }
      return { id: String(r.id ?? ''), nombre: String(r.nombre ?? '') }
    })
  }
  const mid = String(o.mecanico_id ?? '').trim()
  const nom = String(o.mecanico ?? '').trim()
  if (!mid && !nom) return []
  if (mid.includes(',')) {
    const ids = mid.split(',').map((s) => s.trim()).filter(Boolean)
    const sep = nom.includes(' · ') ? ' · ' : ','
    const names = nom.split(sep).map((s) => s.trim())
    return ids.map((id, i) => ({ id, nombre: names[i] || id }))
  }
  return [{ id: mid, nombre: nom || mid }]
}

export function ordenMecanicosToRowFields(mecs: MecanicoRef[]): {
  mecanico_id: string
  mecanico: string
  mecanicos: MecanicoRef[] | null
} {
  const clean = mecs.filter((m) => m.id)
  if (!clean.length) return { mecanico_id: '', mecanico: '', mecanicos: null }
  return {
    mecanico_id: clean.map((m) => m.id).join(','),
    mecanico: clean.map((m) => m.nombre || m.id).join(' · '),
    mecanicos: clean,
  }
}

/** Para persistir: usa `mecanicos` si viene poblado; si no, reconstruye desde ids legacy */
export function ordenRefsForPersist(o: Pick<Orden, 'mecanicos' | 'mecanicoId' | 'mecanico'>): MecanicoRef[] {
  if (o.mecanicos?.length) return o.mecanicos.map((m) => ({ id: String(m.id), nombre: String(m.nombre || '') }))
  const mid = String(o.mecanicoId ?? '').trim()
  const nom = String(o.mecanico ?? '').trim()
  if (mid.includes(',')) {
    const ids = mid.split(',').map((s) => s.trim()).filter(Boolean)
    const parts = nom.includes(' · ')
      ? nom.split(/\s*·\s*/).map((s) => s.trim())
      : nom.split(',').map((s) => s.trim())
    return ids.map((id, i) => ({ id, nombre: parts[i] || id }))
  }
  if (mid) return [{ id: mid, nombre: nom || mid }]
  return []
}

export function normalizeCotizacion(c: Partial<Cotizacion> & { folio: string; creado: string }): Cotizacion {
  const items = (c.items || []).map((x) => normalizeLineItem(x as LineItem))
  const desc = Math.max(0, Number(c.descuento) || 0)
  const totalCalc = totalDocumentoConDescuento(items, desc)
  return {
    folio: c.folio,
    fecha: c.fecha || new Date().toISOString().slice(0, 10),
    clienteId: c.clienteId ?? null,
    clienteNombre: c.clienteNombre || '',
    clienteRut: c.clienteRut || '',
    tel: c.tel || '',
    vehiculoId: c.vehiculoId ?? null,
    patente: c.patente || '',
    marca: c.marca || '',
    modelo: c.modelo || '',
    items,
    descuento: desc,
    total: Number(c.total) || totalCalc,
    obs: c.obs || '',
    estado: mapEstadoCotizacion(String(c.estado || 'Pendiente')),
    otFolio: c.otFolio,
    creado: c.creado,
  }
}

/** Parsea `histKm` del HTML / JSON backup */
export function normalizeVehiculoHistKm(raw: unknown): Vehiculo['histKm'] {
  if (!Array.isArray(raw) || raw.length === 0) return undefined
  const out: NonNullable<Vehiculo['histKm']> = []
  for (const x of raw) {
    if (!x || typeof x !== 'object') continue
    const r = x as Record<string, unknown>
    out.push({
      fecha: r.fecha != null && String(r.fecha).trim() ? String(r.fecha).trim() : undefined,
      km: r.km != null && !Number.isNaN(Number(r.km)) ? Number(r.km) : undefined,
      obs: r.obs != null && String(r.obs).trim() ? String(r.obs).trim() : undefined,
    })
  }
  return out.length ? out : undefined
}

export function normalizeOrden(o: Partial<Orden> & { folio: string; creado: string }): Orden {
  const items = (o.items || []).map((x) => normalizeLineItem(x as LineItem))

  let mecanicos: MecanicoRef[] = []
  if (Array.isArray(o.mecanicos) && o.mecanicos.length) {
    mecanicos = o.mecanicos.map((m) => ({ id: String(m.id), nombre: String(m.nombre || '') }))
  } else {
    const mid = String(o.mecanicoId ?? '').trim()
    const nom = String(o.mecanico ?? '').trim()
    if (mid.includes(',')) {
      const ids = mid.split(',').map((s) => s.trim()).filter(Boolean)
      const parts = nom.includes(' · ')
        ? nom.split(/\s*·\s*/).map((s) => s.trim())
        : nom.split(',').map((s) => s.trim())
      mecanicos = ids.map((id, i) => ({ id, nombre: parts[i] || id }))
    } else if (mid) {
      mecanicos = [{ id: mid, nombre: nom || mid }]
    }
  }

  const mf = ordenMecanicosToRowFields(mecanicos)

  const dt = String(o.docTipo ?? '').trim()
  const df = String(o.docFolio ?? '').trim()
  const hasDocBlock = Boolean(dt || df || String(o.docFecha ?? '').trim() || (o.docMonto != null && !Number.isNaN(Number(o.docMonto))))
  const docTipo = dt || undefined
  const docFolio = hasDocBlock ? df || undefined : undefined
  const docFecha = hasDocBlock ? String(o.docFecha || '').trim().slice(0, 10) || undefined : undefined
  let docMonto: number | undefined
  if (hasDocBlock && o.docMonto != null && !Number.isNaN(Number(o.docMonto))) {
    docMonto = Number(o.docMonto)
  }
  const docAdjNombre = hasDocBlock ? String(o.docAdjNombre || '').trim() || undefined : undefined
  const docAdjMime = hasDocBlock ? String(o.docAdjMime || '').trim() || undefined : undefined
  const docAdjDataUrl = hasDocBlock ? String(o.docAdjDataUrl || '').trim() || undefined : undefined
  const docAdjSize = hasDocBlock && o.docAdjSize != null && Number(o.docAdjSize) > 0 ? Number(o.docAdjSize) : undefined

  let imgs: string[] | undefined
  if (Array.isArray(o.imgs) && o.imgs.length) {
    const mapped = o.imgs.map((x) => String(x)).filter(Boolean)
    if (mapped.length) imgs = mapped
  }

  const descOt = Math.max(0, Number(o.descuento) || 0)
  const totalCalc = totalDocumentoConDescuento(items, descOt)

  return {
    folio: o.folio,
    fechaIn: o.fechaIn || new Date().toISOString().slice(0, 10),
    fechaEst: o.fechaEst || '',
    clienteId: o.clienteId ?? null,
    clienteNombre: o.clienteNombre || '',
    clienteRut: o.clienteRut || '',
    tel: o.tel || '',
    vehiculoId: o.vehiculoId ?? null,
    patente: o.patente || '',
    marca: o.marca || '',
    modelo: o.modelo || '',
    mecanicoId: mf.mecanico_id || String(o.mecanicoId ?? ''),
    mecanico: mf.mecanico || String(o.mecanico ?? ''),
    mecanicos: mecanicos.length ? mecanicos : undefined,
    km: Number(o.km) || 0,
    diag: o.diag || '',
    obs: o.obs || '',
    items,
    descuento: descOt,
    total: Number(o.total) || totalCalc,
    estado: o.estado || 'Recibido',
    cotizacionOrigen: o.cotizacionOrigen,
    creado: o.creado,
    docTipo,
    docFolio,
    docFecha,
    docMonto,
    docAdjNombre,
    docAdjMime,
    docAdjDataUrl,
    docAdjSize,
    imgs,
  }
}

export function normalizeVenta(v: Partial<Venta> & { folio: string; creado: string }): Venta {
  const items = (v.items || []).map((x) => normalizeLineItem(x as LineItem))
  const desc = Number(v.descuento) || 0
  const raw = sumItemsConIva(items)
  const dt = (v.docTipo || '').trim()
  const docTipo = dt || undefined
  const docFolio = docTipo ? String(v.docFolio || '').trim() || undefined : undefined
  const docFecha = docTipo ? String(v.docFecha || '').trim().slice(0, 10) || undefined : undefined
  let docMonto: number | undefined
  if (docTipo && v.docMonto != null && !Number.isNaN(Number(v.docMonto))) {
    const dm = Number(v.docMonto)
    if (dm >= 0) docMonto = dm
  }
  const docAdjNombre = docTipo ? String(v.docAdjNombre || '').trim() || undefined : undefined
  const docAdjMime = docTipo ? String(v.docAdjMime || '').trim() || undefined : undefined
  const docAdjDataUrl = docTipo ? String(v.docAdjDataUrl || '').trim() || undefined : undefined
  const docAdjSize = docTipo && v.docAdjSize != null && Number(v.docAdjSize) > 0 ? Number(v.docAdjSize) : undefined
  const chequeNumero = v.fpago === 'Cheque' ? String(v.chequeNumero || '').trim() || undefined : undefined
  const chequeBanco = v.fpago === 'Cheque' ? String(v.chequeBanco || '').trim() || undefined : undefined
  const chequeFechaCobro = v.fpago === 'Cheque' ? String(v.chequeFechaCobro || '').trim().slice(0, 10) || undefined : undefined
  return {
    folio: v.folio,
    fecha: v.fecha || new Date().toISOString().slice(0, 10),
    clienteId: v.clienteId ?? null,
    clienteNombre: v.clienteNombre || '',
    clienteRut: v.clienteRut || '',
    tel: v.tel || '',
    vehiculoId: v.vehiculoId ?? null,
    patente: v.patente || '',
    marca: v.marca || '',
    modelo: v.modelo || '',
    mecanico: v.mecanico,
    items,
    descuento: desc,
    total: Number(v.total) || Math.max(0, raw - desc),
    fpago: v.fpago || 'Contado',
    obs: v.obs || '',
    otOrigen: v.otOrigen,
    cotOrigen: v.cotOrigen,
    docTipo,
    docFolio,
    docFecha,
    docMonto,
    docAdjNombre,
    docAdjMime,
    docAdjDataUrl,
    docAdjSize,
    chequeNumero,
    chequeBanco,
    chequeFechaCobro,
    creado: v.creado,
  }
}

/** COT/OT/Ventas: el mismo `folio` repetido en memoria rompe PK en batch INSERT/UPSERT. */
export function dedupePorFolioConCreado<T extends { folio: string; creado?: string }>(rows: T[]): T[] {
  const sorted = [...rows].sort((a, b) => {
    const ca = String(a.creado || '')
    const cb = String(b.creado || '')
    if (ca !== cb) return cb.localeCompare(ca)
    return String(b.folio).localeCompare(String(a.folio))
  })
  const seen = new Set<string>()
  const out: T[] = []
  for (const r of sorted) {
    const f = String(r.folio || '').trim()
    if (!f) continue
    if (seen.has(f)) continue
    seen.add(f)
    out.push(r)
  }
  return out
}

/** El backup HTML puede repetir el mismo `folio` en ventas. */
export function dedupeVentasPorFolio(ventas: Venta[]): Venta[] {
  return dedupePorFolioConCreado(ventas)
}

/**
 * Backup/import puede repetir el mismo `id`; Postgres admite una sola fila por PK (`23505`).
 * Se conserva la copia con `modificado` o `creado` más reciente (orden lexicográfico ISO).
 */
export function dedupePorIdConCreado<T extends { id: string; creado?: string; modificado?: string }>(rows: T[]): T[] {
  const stamp = (r: T) => {
    const m = String((r as { modificado?: string }).modificado ?? '')
    const c = String(r.creado ?? '')
    return m || c
  }
  const sorted = [...rows].sort((a, b) => {
    const sa = stamp(a)
    const sb = stamp(b)
    if (sa !== sb) return sb.localeCompare(sa)
    return String(b.id).localeCompare(String(a.id))
  })
  const seen = new Set<string>()
  const out: T[] = []
  for (const r of sorted) {
    const id = String(r.id ?? '').trim()
    if (!id) continue
    if (seen.has(id)) continue
    seen.add(id)
    out.push(r)
  }
  return out
}

export function vehiculosFiltradosCliente(db: Db, clienteId: string | null) {
  if (!clienteId) return db.vehiculos
  return db.vehiculos.filter((v) => v.clienteId === clienteId)
}
