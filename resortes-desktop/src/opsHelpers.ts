import type { Cliente, Cotizacion, Db, LineItem, Orden, Venta } from './appTypes'

export const UNIDADES_OPS = ['Unidad', 'Litro', 'Kg', 'Par', 'Metro', 'Caja', 'Horas', 'Galón']

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

export function totalLineItems(items: LineItem[]) {
  return items.reduce((s, i) => s + i.sub, 0)
}

export function makeLineItem(nombre: string, unidad: string, qty: number, pu: number, cat = 'Servicios'): LineItem {
  const q = Math.max(0, qty)
  const p = Math.max(0, pu)
  return { nombre: nombre.trim(), unidad, cat, qty: q, pu: p, sub: Math.round(q * p), libre: true }
}

export function matchClienteByName(db: Db, name: string): Cliente | null {
  const t = name.trim().toLowerCase()
  if (!t) return null
  return db.clientes.find((c) => c.nombre.toLowerCase() === t) ?? null
}

export function normalizeLineItem(li: Partial<LineItem>): LineItem {
  const qty = Number(li.qty) || 0
  const pu = Number(li.pu) || 0
  const sub = Number(li.sub) || Math.round(qty * pu)
  return {
    pid: li.pid ?? null,
    nombre: li.nombre || '',
    unidad: li.unidad || 'Unidad',
    cat: li.cat || 'Servicios',
    qty,
    pu,
    sub,
    libre: li.libre,
    iva: li.iva,
  }
}

export function normalizeCotizacion(c: Partial<Cotizacion> & { folio: string; creado: string }): Cotizacion {
  const items = (c.items || []).map((x) => normalizeLineItem(x as LineItem))
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
    total: Number(c.total) || totalLineItems(items),
    obs: c.obs || '',
    estado: c.estado || 'Pendiente',
    otFolio: c.otFolio,
    creado: c.creado,
  }
}

export function normalizeOrden(o: Partial<Orden> & { folio: string; creado: string }): Orden {
  const items = (o.items || []).map((x) => normalizeLineItem(x as LineItem))
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
    mecanicoId: o.mecanicoId ?? '',
    mecanico: o.mecanico || '',
    km: Number(o.km) || 0,
    diag: o.diag || '',
    obs: o.obs || '',
    items,
    total: Number(o.total) || totalLineItems(items),
    estado: o.estado || 'Recibido',
    cotizacionOrigen: o.cotizacionOrigen,
    creado: o.creado,
  }
}

export function normalizeVenta(v: Partial<Venta> & { folio: string; creado: string }): Venta {
  const items = (v.items || []).map((x) => normalizeLineItem(x as LineItem))
  const desc = Number(v.descuento) || 0
  const raw = totalLineItems(items)
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
