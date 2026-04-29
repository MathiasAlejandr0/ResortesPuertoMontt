import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { AppSettings, Db, LineItem } from './appTypes'
import { normalizeCotizacion, normalizeOrden, normalizeVenta } from './opsHelpers'

const defaultCats = ['Lubricantes', 'Repuestos', 'Fluidos', 'Herramientas', 'Mano de obra', 'Otros']

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10)
}

function estadoCreditoFromRow(monto: number, saldo: number, vcto: string): string {
  const hoy = todayIsoDate()
  if (saldo <= 0) return 'Pagado'
  if (saldo < monto) return 'Pagado parcial'
  if (vcto && vcto < hoy) return 'Vencido'
  return 'Pendiente'
}

export function isSupabaseConfigured(): boolean {
  const url = (import.meta.env.VITE_SUPABASE_URL ?? '').trim()
  const key = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim()
  return Boolean(url && key)
}

function getClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null
  return createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
}

async function deleteAll(sb: SupabaseClient, table: string, pk: string) {
  const { error } = await sb.from(table).delete().not(pk, 'is', null)
  if (error) throw error
}

export async function loadOnlineDb(): Promise<Db | null> {
  const sb = getClient()
  if (!sb) return null

  const [
    clientes,
    vehiculos,
    inventario,
    mecanicos,
    cotizaciones,
    ordenes,
    ventas,
    gastos,
    creditos,
    anticipos,
    categorias,
  ] = await Promise.all([
    sb.from('clientes').select('*'),
    sb.from('vehiculos').select('*'),
    sb.from('inventario').select('*'),
    sb.from('mecanicos').select('*'),
    sb.from('cotizaciones').select('*'),
    sb.from('ordenes').select('*'),
    sb.from('ventas').select('*'),
    sb.from('gastos').select('*'),
    sb.from('creditos').select('*'),
    sb.from('anticipos').select('*'),
    sb.from('categorias').select('nombre'),
  ])

  const results = [
    clientes,
    vehiculos,
    inventario,
    mecanicos,
    cotizaciones,
    ordenes,
    ventas,
    gastos,
    creditos,
    anticipos,
    categorias,
  ]
  if (results.some((r) => r.error)) {
    console.error(results.find((r) => r.error)?.error)
    return null
  }

  const now = new Date().toISOString()
  const cats = (categorias.data ?? []).map((r: { nombre: string }) => r.nombre).filter(Boolean)
  const textDesc = (row: Record<string, unknown>) =>
    String(row.descripcion ?? (row as { desc?: unknown }).desc ?? '')

  return {
    clientes: (clientes.data ?? []).map((c: Record<string, unknown>) => ({
      id: String(c.id),
      nombre: String(c.nombre ?? ''),
      rut: String(c.rut ?? ''),
      tel: String(c.tel ?? ''),
      email: String(c.email ?? ''),
      dir: String(c.dir ?? ''),
      origen: String(c.origen ?? 'Recomendación'),
      obs: String(c.obs ?? ''),
      creado: String(c.creado ?? now),
    })),
    vehiculos: (vehiculos.data ?? []).map((v: Record<string, unknown>) => ({
      id: String(v.id),
      clienteId: String(v.cliente_id ?? ''),
      clienteNombre: String(v.cliente_nombre ?? ''),
      patente: String(v.patente ?? ''),
      marca: String(v.marca ?? ''),
      modelo: String(v.modelo ?? ''),
      anio: String(v.anio ?? ''),
      color: String(v.color ?? ''),
      combustible: String(v.combustible ?? ''),
      vin: String(v.vin ?? ''),
      km: Number(v.km) || 0,
      creado: String(v.creado ?? now),
    })),
    inventario: (inventario.data ?? []).map((p: Record<string, unknown>) => ({
      id: String(p.id),
      nombre: String(p.nombre ?? ''),
      codigo: String(p.codigo ?? ''),
      categoria: String(p.categoria ?? 'Repuestos'),
      unidad: String(p.unidad ?? 'Unidad'),
      precio: Number(p.precio) || 0,
      costo: Number(p.costo) || 0,
      stock: Number(p.stock) || 0,
      smin: Number(p.smin) || 0,
    })),
    mecanicos: (mecanicos.data ?? []).map((m: Record<string, unknown>) => ({
      id: String(m.id),
      nombre: String(m.nombre ?? ''),
      especialidad: String(m.especialidad ?? ''),
      tel: String(m.tel ?? ''),
      email: String(m.email ?? ''),
      activo: m.activo !== false,
      creado: String(m.creado ?? now),
    })),
    cotizaciones: (cotizaciones.data ?? []).map((c: Record<string, unknown>) =>
      normalizeCotizacion({
        folio: String(c.folio),
        fecha: String(c.fecha ?? todayIsoDate()),
        clienteId: (c.cliente_id as string | null) ?? null,
        clienteNombre: String(c.cliente_nombre ?? ''),
        clienteRut: String(c.cliente_rut ?? ''),
        tel: String(c.tel ?? ''),
        vehiculoId: (c.vehiculo_id as string | null) ?? null,
        patente: String(c.patente ?? ''),
        marca: String(c.marca ?? ''),
        modelo: String(c.modelo ?? ''),
        items: (c.items as LineItem[]) ?? [],
        total: Number(c.total) || 0,
        obs: String(c.obs ?? ''),
        estado: String(c.estado ?? 'Pendiente'),
        otFolio: (c.ot_folio as string | undefined) ?? undefined,
        creado: String(c.creado ?? now),
      }),
    ),
    ordenes: (ordenes.data ?? []).map((o: Record<string, unknown>) =>
      normalizeOrden({
        folio: String(o.folio),
        fechaIn: String(o.fecha_in ?? todayIsoDate()),
        fechaEst: String(o.fecha_est ?? ''),
        clienteId: (o.cliente_id as string | null) ?? null,
        clienteNombre: String(o.cliente_nombre ?? ''),
        clienteRut: String(o.cliente_rut ?? ''),
        tel: String(o.tel ?? ''),
        vehiculoId: (o.vehiculo_id as string | null) ?? null,
        patente: String(o.patente ?? ''),
        marca: String(o.marca ?? ''),
        modelo: String(o.modelo ?? ''),
        mecanicoId: String(o.mecanico_id ?? ''),
        mecanico: String(o.mecanico ?? ''),
        km: Number(o.km) || 0,
        diag: String(o.diag ?? ''),
        obs: String(o.obs ?? ''),
        items: (o.items as LineItem[]) ?? [],
        total: Number(o.total) || 0,
        estado: String(o.estado ?? 'Recibido'),
        cotizacionOrigen: (o.cotizacion_origen as string | undefined) ?? undefined,
        creado: String(o.creado ?? now),
      }),
    ),
    ventas: (ventas.data ?? []).map((v: Record<string, unknown>) =>
      normalizeVenta({
        folio: String(v.folio),
        fecha: String(v.fecha ?? todayIsoDate()),
        clienteId: (v.cliente_id as string | null) ?? null,
        clienteNombre: String(v.cliente_nombre ?? ''),
        clienteRut: String(v.cliente_rut ?? ''),
        tel: String(v.tel ?? ''),
        vehiculoId: (v.vehiculo_id as string | null) ?? null,
        patente: String(v.patente ?? ''),
        marca: String(v.marca ?? ''),
        modelo: String(v.modelo ?? ''),
        mecanico: (v.mecanico as string | undefined) ?? undefined,
        items: (v.items as LineItem[]) ?? [],
        descuento: Number(v.descuento) || 0,
        total: Number(v.total) || 0,
        fpago: String(v.fpago ?? 'Contado'),
        obs: String(v.obs ?? ''),
        otOrigen: (v.ot_origen as string | undefined) ?? undefined,
        cotOrigen: (v.cot_origen as string | undefined) ?? undefined,
        creado: String(v.creado ?? now),
      }),
    ),
    gastos: (gastos.data ?? []).map((g: Record<string, unknown>) => ({
      id: String(g.id),
      desc: textDesc(g),
      categoria: String(g.categoria ?? 'Otros'),
      monto: Number(g.monto) || 0,
      fecha: String(g.fecha ?? todayIsoDate()),
      proveedor: String(g.proveedor ?? ''),
      creado: String(g.creado ?? now),
    })),
    categorias: cats.length ? cats : [...defaultCats],
    creditos: (creditos.data ?? []).map((c: Record<string, unknown>) => {
      const monto = Number(c.monto) || 0
      const saldo = Number(c.saldo) || 0
      const vctoStr = c.vcto == null || c.vcto === '' ? '' : String(c.vcto).slice(0, 10)
      const abonos = (c.abonos as { monto?: number; fecha?: string; obs?: string; creado?: string }[]) ?? []
      const estado = estadoCreditoFromRow(monto, saldo, vctoStr)
      return {
        id: String(c.id),
        clienteId: (c.cliente_id as string | null) ?? null,
        clienteNombre: String(c.cliente_nombre ?? ''),
        clienteRut: String(c.cliente_rut ?? ''),
        monto,
        saldo,
        abonos: abonos.map((a) => ({
          monto: Number(a.monto) || 0,
          fecha: String(a.fecha ?? todayIsoDate()),
          obs: String(a.obs ?? ''),
          creado: String(a.creado ?? now),
        })),
        fecha: String(c.fecha ?? todayIsoDate()),
        vcto: vctoStr,
        desc: textDesc(c),
        ventaFolio: (c.venta_folio as string | undefined) ?? undefined,
        estado,
        creado: String(c.creado ?? now),
      }
    }),
    anticipos: (anticipos.data ?? []).map((a: Record<string, unknown>) => {
      const mes = Number(a.mes_descuento)
      return {
        id: String(a.id),
        trabajadorId: String(a.trabajador_id ?? ''),
        trabajadorNombre: String(a.trabajador_nombre ?? ''),
        tipo: String(a.tipo ?? 'Anticipo de sueldo'),
        monto: Number(a.monto) || 0,
        fecha: String(a.fecha ?? todayIsoDate()),
        mesDescuento: mes >= 0 && mes <= 11 ? mes : new Date().getMonth(),
        anioDescuento: Number(a.anio_descuento) || new Date().getFullYear(),
        desc: textDesc(a),
        estado: (a.estado === 'Pagado' || a.estado === 'Anulado' ? a.estado : 'Activo') as 'Activo' | 'Pagado' | 'Anulado',
        creado: String(a.creado ?? now),
      }
    }),
  }
}

export async function loadOnlineSettings(): Promise<AppSettings | null> {
  const sb = getClient()
  if (!sb) return null
  const { data, error } = await sb.from('app_settings').select('data').eq('id', 1).maybeSingle()
  if (error) {
    console.error(error)
    return null
  }
  if (!data?.data || typeof data.data !== 'object') return null
  return data.data as AppSettings
}

export async function saveOnlineAll(db: Db, settings: AppSettings): Promise<boolean> {
  const sb = getClient()
  if (!sb) return false
  try {
    await Promise.all([
      deleteAll(sb, 'clientes', 'id'),
      deleteAll(sb, 'vehiculos', 'id'),
      deleteAll(sb, 'inventario', 'id'),
      deleteAll(sb, 'mecanicos', 'id'),
      deleteAll(sb, 'cotizaciones', 'folio'),
      deleteAll(sb, 'ordenes', 'folio'),
      deleteAll(sb, 'ventas', 'folio'),
      deleteAll(sb, 'gastos', 'id'),
      deleteAll(sb, 'creditos', 'id'),
      deleteAll(sb, 'anticipos', 'id'),
      deleteAll(sb, 'categorias', 'nombre'),
    ])

    const now = new Date().toISOString()
    const ops: Promise<unknown>[] = []

    if (db.clientes.length) ops.push(Promise.resolve(sb.from('clientes').insert(db.clientes)))
    if (db.vehiculos.length) {
      ops.push(
        Promise.resolve(
          sb.from('vehiculos').insert(
            db.vehiculos.map((v) => ({
              id: v.id,
              cliente_id: v.clienteId,
              cliente_nombre: v.clienteNombre,
              patente: v.patente,
              marca: v.marca,
              modelo: v.modelo,
              anio: v.anio,
              color: v.color,
              combustible: v.combustible,
              vin: v.vin,
              km: v.km,
              creado: v.creado,
            })),
          ),
        ),
      )
    }
    if (db.inventario.length) ops.push(Promise.resolve(sb.from('inventario').insert(db.inventario)))
    if (db.mecanicos.length) ops.push(Promise.resolve(sb.from('mecanicos').insert(db.mecanicos)))
    if (db.cotizaciones.length) {
      ops.push(
        Promise.resolve(
          sb.from('cotizaciones').insert(
            db.cotizaciones.map((c) => ({
              folio: c.folio,
              fecha: c.fecha,
              cliente_id: c.clienteId,
              cliente_nombre: c.clienteNombre,
              cliente_rut: c.clienteRut,
              tel: c.tel,
              vehiculo_id: c.vehiculoId,
              patente: c.patente,
              marca: c.marca,
              modelo: c.modelo,
              items: c.items,
              total: c.total,
              obs: c.obs,
              estado: c.estado,
              ot_folio: c.otFolio ?? null,
              creado: c.creado,
            })),
          ),
        ),
      )
    }
    if (db.ordenes.length) {
      ops.push(
        Promise.resolve(
          sb.from('ordenes').insert(
            db.ordenes.map((o) => ({
              folio: o.folio,
              fecha_in: o.fechaIn,
              fecha_est: o.fechaEst,
              cliente_id: o.clienteId,
              cliente_nombre: o.clienteNombre,
              cliente_rut: o.clienteRut,
              tel: o.tel,
              vehiculo_id: o.vehiculoId,
              patente: o.patente,
              marca: o.marca,
              modelo: o.modelo,
              mecanico_id: o.mecanicoId,
              mecanico: o.mecanico,
              km: o.km,
              diag: o.diag,
              obs: o.obs,
              items: o.items,
              total: o.total,
              estado: o.estado,
              cotizacion_origen: o.cotizacionOrigen ?? null,
              creado: o.creado,
            })),
          ),
        ),
      )
    }
    if (db.ventas.length) {
      ops.push(
        Promise.resolve(
          sb.from('ventas').insert(
            db.ventas.map((v) => ({
              folio: v.folio,
              fecha: v.fecha,
              cliente_id: v.clienteId,
              cliente_nombre: v.clienteNombre,
              cliente_rut: v.clienteRut,
              tel: v.tel,
              vehiculo_id: v.vehiculoId,
              patente: v.patente,
              marca: v.marca,
              modelo: v.modelo,
              mecanico: v.mecanico ?? '',
              items: v.items,
              descuento: v.descuento,
              total: v.total,
              fpago: v.fpago,
              obs: v.obs,
              ot_origen: v.otOrigen ?? null,
              cot_origen: v.cotOrigen ?? null,
              creado: v.creado,
            })),
          ),
        ),
      )
    }
    if (db.gastos.length) {
      ops.push(
        Promise.resolve(
          sb.from('gastos').insert(
            db.gastos.map((g) => ({
              id: g.id,
              descripcion: g.desc,
              categoria: g.categoria,
              monto: g.monto,
              fecha: g.fecha,
              proveedor: g.proveedor,
              creado: g.creado,
            })),
          ),
        ),
      )
    }
    if (db.creditos.length) {
      ops.push(
        Promise.resolve(
          sb.from('creditos').insert(
            db.creditos.map((c) => ({
              id: c.id,
              cliente_id: c.clienteId,
              cliente_nombre: c.clienteNombre,
              cliente_rut: c.clienteRut,
              monto: c.monto,
              saldo: c.saldo,
              abonos: c.abonos,
              fecha: c.fecha,
              vcto: c.vcto || null,
              descripcion: c.desc,
              venta_folio: c.ventaFolio ?? null,
              estado: c.estado,
              creado: c.creado,
            })),
          ),
        ),
      )
    }
    if (db.anticipos.length) {
      ops.push(
        Promise.resolve(
          sb.from('anticipos').insert(
            db.anticipos.map((a) => ({
              id: a.id,
              trabajador_id: a.trabajadorId,
              trabajador_nombre: a.trabajadorNombre,
              tipo: a.tipo,
              monto: a.monto,
              fecha: a.fecha,
              mes_descuento: a.mesDescuento,
              anio_descuento: a.anioDescuento,
              descripcion: a.desc,
              estado: a.estado,
              creado: a.creado,
            })),
          ),
        ),
      )
    }
    if (db.categorias.length) {
      ops.push(Promise.resolve(sb.from('categorias').insert(db.categorias.map((nombre) => ({ nombre })))))
    }

    ops.push(
      Promise.resolve(
        sb.from('app_settings').upsert({ id: 1, data: settings, updated_at: now }, { onConflict: 'id' }),
      ),
    )

    const insResults = await Promise.all(ops)
    const bad = insResults.find(
      (r) => r && typeof r === 'object' && 'error' in r && (r as { error: unknown }).error,
    ) as { error: { message?: string } } | undefined
    if (bad?.error) {
      console.error(bad.error)
      return false
    }
    return true
  } catch (e) {
    console.error(e)
    return false
  }
}
