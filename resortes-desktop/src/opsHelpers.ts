import type { Cliente, Cotizacion, Db, LineItem, MecanicoRef, Orden, Venta } from './appTypes'

export const UNIDADES_OPS = ['Unidad', 'Litro', 'Kg', 'Par', 'Metro', 'Caja', 'Horas', 'Galón']

/** Paridad HTML: IVA sobre neto tras dto */
export const IVA_RATE = 0.19

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
  const totalCalc = sumItemsConIva(items)
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
    total: Number(c.total) || totalCalc,
    obs: c.obs || '',
    estado: mapEstadoCotizacion(String(c.estado || 'Pendiente')),
    otFolio: c.otFolio,
    creado: c.creado,
  }
}

export function normalizeOrden(o: Partial<Orden> & { folio: string; creado: string }): Orden {
  const items = (o.items || []).map((x) => normalizeLineItem(x as LineItem))
  const totalCalc = sumItemsConIva(items)

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
    total: Number(o.total) || totalCalc,
    estado: o.estado || 'Recibido',
    cotizacionOrigen: o.cotizacionOrigen,
    creado: o.creado,
  }
}

export function normalizeVenta(v: Partial<Venta> & { folio: string; creado: string }): Venta {
  const items = (v.items || []).map((x) => normalizeLineItem(x as LineItem))
  const desc = Number(v.descuento) || 0
  const raw = sumItemsConIva(items)
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
    creado: v.creado,
  }
}

export function vehiculosFiltradosCliente(db: Db, clienteId: string | null) {
  if (!clienteId) return db.vehiculos
  return db.vehiculos.filter((v) => v.clienteId === clienteId)
}
