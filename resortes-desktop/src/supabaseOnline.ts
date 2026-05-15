import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { AnticipoRegistro, AppSettings, Cliente, Db, LineItem, Producto } from './appTypes'
import {
  normalizeCotizacion,
  normalizeOrden,
  normalizeVehiculoHistKm,
  dedupePorFolioConCreado,
  dedupePorIdConCreado,
  dedupeVentasPorFolio,
  normalizeVenta,
  ordenMecanicosFromRow,
  ordenMecanicosToRowFields,
  ordenRefsForPersist,
} from './opsHelpers'
import { normalizeGastoCategoria } from './gastosCategoria'

/** Paridad con HTML `CATS_DEFAULT` */
const defaultCats = [
  'Lubricantes',
  'Filtros',
  'Frenos',
  'Suspensión',
  'Electricidad',
  'Neumáticos',
  'Mano de obra',
  'Refrigeración',
  'Transmisión',
  'Otros',
]

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10)
}

function mapClienteRow(c: Record<string, unknown>): Cliente {
  const tipoRaw = String(c.tipo ?? 'persona')
  const tipo = tipoRaw === 'empresa' ? 'empresa' : 'persona'
  const cn = (c.contacto_nom ?? c.contactoNom) as string | undefined
  const cc = (c.contacto_cargo ?? c.contactoCargo) as string | undefined
  const ct = (c.contacto_tel ?? c.contactoTel) as string | undefined
  const ce = (c.contacto_email ?? c.contactoEmail) as string | undefined
  const mod = c.modificado
  return {
    id: String(c.id),
    nombre: String(c.nombre ?? ''),
    rut: String(c.rut ?? ''),
    tel: String(c.tel ?? ''),
    email: String(c.email ?? ''),
    dir: String(c.dir ?? ''),
    origen: String(c.origen ?? 'Recomendación'),
    obs: String(c.obs ?? ''),
    creado: String(c.creado ?? ''),
    tipo,
    contactoNom: cn != null ? String(cn) : undefined,
    contactoCargo: cc != null ? String(cc) : undefined,
    contactoTel: ct != null ? String(ct) : undefined,
    contactoEmail: ce != null ? String(ce) : undefined,
    modificado: mod != null && mod !== '' ? String(mod) : undefined,
  }
}

function inventarioToInsertRow(p: Producto): Record<string, unknown> {
  const mod = p.modificado != null ? String(p.modificado).trim() : ''
  return {
    id: p.id,
    nombre: p.nombre,
    codigo: p.codigo,
    categoria: p.categoria,
    unidad: p.unidad,
    precio: p.precio,
    costo: p.costo,
    stock: p.stock,
    smin: p.smin,
    creado: p.creado ?? '',
    modificado: mod || null,
  }
}

function clienteToInsertRow(c: Cliente): Record<string, unknown> {
  return {
    id: c.id,
    nombre: c.nombre,
    rut: c.rut,
    tel: c.tel,
    email: c.email,
    dir: c.dir,
    origen: c.origen,
    obs: c.obs,
    creado: c.creado,
    tipo: c.tipo ?? 'persona',
    contacto_nom: c.contactoNom ?? '',
    contacto_cargo: c.contactoCargo ?? '',
    contacto_tel: c.contactoTel ?? '',
    contacto_email: c.contactoEmail ?? '',
    modificado: c.modificado ?? null,
  }
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

/** Resultado de guardado completo — el mensaje viene de PostgREST cuando falla DELETE/INSERT/UPSERT */
export type SaveOnlineResult = { ok: true } | { ok: false; message: string }

type PgErrorLike = {
  message?: string
  code?: string
  details?: string | null
  hint?: string | null
}

/** Backup HTML puede dejar objetos en memoria con `mecanicoId` en vez de `trabajadorId`. */
function anticipoLegacyRow(a: AnticipoRegistro): Record<string, unknown> {
  return a as unknown as Record<string, unknown>
}

function anticipoTrabajadorIdParaDb(a: AnticipoRegistro): string {
  const x = anticipoLegacyRow(a)
  const id = String(x.trabajadorId ?? x.mecanicoId ?? x.trabajador_id ?? '').trim()
  return id
}

function anticipoTrabajadorNombreParaDb(a: AnticipoRegistro): string {
  const x = anticipoLegacyRow(a)
  return String(x.trabajadorNombre ?? x.mecanicoNombre ?? '').trim()
}

function formatPgErr(ctx: string, err: PgErrorLike | null | undefined): string {
  if (!err) return `${ctx}: error desconocido`
  const bits = [
    err.message,
    err.code && `código ${err.code}`,
    err.hint && `pista: ${err.hint}`,
    err.details && `detalle: ${err.details}`,
  ].filter(Boolean)
  return `${ctx}: ${bits.join(' — ')}`
}

async function deleteAll(sb: SupabaseClient, table: string, pk: string): Promise<SaveOnlineResult> {
  const { error } = await sb.from(table).delete().not(pk, 'is', null)
  if (error) return { ok: false, message: formatPgErr(`DELETE en "${table}" (¿RLS?)`, error) }
  return { ok: true }
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
    clientes: (clientes.data ?? []).map((c: Record<string, unknown>) =>
      mapClienteRow({ ...c, creado: (c.creado as string | undefined) ?? now }),
    ),
    vehiculos: (vehiculos.data ?? []).map((v: Record<string, unknown>) => {
      const rawImgs = v.imgs
      let imgs: string[] | undefined
      if (Array.isArray(rawImgs)) imgs = rawImgs.map((x) => String(x))
      else if (typeof rawImgs === 'string' && rawImgs) {
        try {
          const p = JSON.parse(rawImgs) as unknown
          if (Array.isArray(p)) imgs = p.map((x) => String(x))
        } catch {
          /* ignore */
        }
      }
      const obs = v.obs != null ? String(v.obs) : ''
      const clienteRut = v.cliente_rut != null ? String(v.cliente_rut) : ''
      const histKm = normalizeVehiculoHistKm(v.hist_km ?? v.histKm)
      return {
        id: String(v.id),
        clienteId: String(v.cliente_id ?? ''),
        clienteNombre: String(v.cliente_nombre ?? ''),
        clienteRut: clienteRut || undefined,
        patente: String(v.patente ?? ''),
        marca: String(v.marca ?? ''),
        modelo: String(v.modelo ?? ''),
        anio: String(v.anio ?? ''),
        color: String(v.color ?? ''),
        combustible: String(v.combustible ?? ''),
        vin: String(v.vin ?? ''),
        km: Number(v.km) || 0,
        creado: String(v.creado ?? now),
        obs: obs || undefined,
        imgs: imgs?.length ? imgs : undefined,
        histKm,
      }
    }),
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
      ...(p.creado != null && String(p.creado).trim() ? { creado: String(p.creado) } : {}),
      ...(p.modificado != null && String(p.modificado).trim() ? { modificado: String(p.modificado) } : {}),
    })),
    mecanicos: (mecanicos.data ?? []).map((m: Record<string, unknown>) => {
      const fc = m.fecha_contrato ?? m.fechaContrato
      return {
        id: String(m.id),
        nombre: String(m.nombre ?? ''),
        especialidad: String(m.especialidad ?? ''),
        tel: String(m.tel ?? ''),
        email: String(m.email ?? ''),
        rut: String(m.rut ?? ''),
        sueldoBase: Number(m.sueldo_base ?? m.sueldoBase) || 0,
        activo: m.activo !== false,
        creado: String(m.creado ?? now),
        fechaContrato:
          fc != null && String(fc).trim() ? String(fc).trim() : undefined,
      }
    }),
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
        descuento: Number(c.descuento) || 0,
        total: Number(c.total) || 0,
        obs: String(c.obs ?? ''),
        estado: String(c.estado ?? 'Pendiente'),
        otFolio: (c.ot_folio as string | undefined) ?? undefined,
        creado: String(c.creado ?? now),
      }),
    ),
    ordenes: (ordenes.data ?? []).map((o: Record<string, unknown>) => {
      const mecanicosRow = ordenMecanicosFromRow(o)
      const rawImgsOt = o.imgs
      let imgsOt: string[] | undefined
      if (Array.isArray(rawImgsOt)) imgsOt = rawImgsOt.map((x) => String(x)).filter(Boolean)
      else if (typeof rawImgsOt === 'string' && rawImgsOt) {
        try {
          const p = JSON.parse(rawImgsOt) as unknown
          if (Array.isArray(p)) imgsOt = p.map((x) => String(x)).filter(Boolean)
        } catch {
          /* ignore */
        }
      }
      return normalizeOrden({
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
        mecanicos: mecanicosRow.length ? mecanicosRow : undefined,
        mecanicoId: String(o.mecanico_id ?? ''),
        mecanico: String(o.mecanico ?? ''),
        km: Number(o.km) || 0,
        diag: String(o.diag ?? ''),
        obs: String(o.obs ?? ''),
        items: (o.items as LineItem[]) ?? [],
        descuento: Number(o.descuento) || 0,
        total: Number(o.total) || 0,
        estado: String(o.estado ?? 'Recibido'),
        cotizacionOrigen: (o.cotizacion_origen as string | undefined) ?? undefined,
        creado: String(o.creado ?? now),
        docTipo: (o.doc_tipo as string | undefined) ?? (o.docTipo as string | undefined),
        docFolio: (o.doc_folio as string | undefined) ?? (o.docFolio as string | undefined),
        docFecha: (o.doc_fecha as string | undefined) ?? (o.docFecha as string | undefined),
        docMonto:
          o.doc_monto != null && !Number.isNaN(Number(o.doc_monto))
            ? Number(o.doc_monto)
            : o.docMonto != null && !Number.isNaN(Number(o.docMonto))
              ? Number(o.docMonto)
              : undefined,
        docAdjNombre: (o.doc_adjunto_nombre as string | undefined) ?? undefined,
        docAdjMime: (o.doc_adjunto_mime as string | undefined) ?? undefined,
        docAdjDataUrl: (o.doc_adjunto_data_url as string | undefined) ?? undefined,
        docAdjSize: o.doc_adjunto_size != null && Number(o.doc_adjunto_size) > 0 ? Number(o.doc_adjunto_size) : undefined,
        imgs: imgsOt?.length ? imgsOt : undefined,
      })
    }),
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
        docTipo: (v.doc_tipo as string | undefined)?.trim() || undefined,
        docFolio: (v.doc_folio as string | undefined)?.trim() || undefined,
        docFecha:
          v.doc_fecha != null && String(v.doc_fecha).trim()
            ? String(v.doc_fecha).slice(0, 10)
            : undefined,
        docMonto: v.doc_monto != null && Number(v.doc_monto) >= 0 ? Number(v.doc_monto) : undefined,
        docAdjNombre: (v.doc_adjunto_nombre as string | undefined) ?? undefined,
        docAdjMime: (v.doc_adjunto_mime as string | undefined) ?? undefined,
        docAdjDataUrl: (v.doc_adjunto_data_url as string | undefined) ?? undefined,
        docAdjSize: v.doc_adjunto_size != null && Number(v.doc_adjunto_size) > 0 ? Number(v.doc_adjunto_size) : undefined,
        chequeNumero: (v.cheque_numero as string | undefined) ?? undefined,
        chequeBanco: (v.cheque_banco as string | undefined) ?? undefined,
        chequeFechaCobro: (v.cheque_fecha_cobro as string | undefined) ?? undefined,
        creado: String(v.creado ?? now),
      }),
    ),
    gastos: (gastos.data ?? []).map((g: Record<string, unknown>) => ({
      id: String(g.id),
      desc: textDesc(g),
      categoria: normalizeGastoCategoria(String(g.categoria ?? 'Otros')),
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
        tipo: (c.tipo as 'credito' | 'cheque' | undefined) ?? 'credito',
        chequeNumero: (c.cheque_numero as string | undefined) ?? undefined,
        chequeBanco: (c.cheque_banco as string | undefined) ?? undefined,
        chequeFechaCobro: (c.cheque_fecha_cobro as string | undefined) ?? undefined,
        chequeEstado: (c.cheque_estado as 'Pendiente' | 'Al cobro' | 'Cobrado' | 'Rechazado' | undefined) ?? undefined,
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
        estado: (['Pagado', 'Anulado', 'Pendiente'].includes(String(a.estado))
          ? String(a.estado)
          : 'Activo') as AnticipoRegistro['estado'],
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

/**
 * Si la app tiene en memoria solo listas vacías (p. ej. falló la lectura, RLS devolvió 0 filas sin error,
 * o arranque defectuoso), **no** debemos ejecutar el DELETE masivo + INSERT: borraría datos reales en Supabase.
 */
function tieneDatosOperativos(db: Db): boolean {
  return (
    db.clientes.length > 0 ||
    db.vehiculos.length > 0 ||
    db.inventario.length > 0 ||
    db.mecanicos.length > 0 ||
    db.cotizaciones.length > 0 ||
    db.ordenes.length > 0 ||
    db.ventas.length > 0 ||
    db.gastos.length > 0 ||
    db.creditos.length > 0 ||
    db.anticipos.length > 0
  )
}

export async function saveOnlineAll(db: Db, settings: AppSettings): Promise<SaveOnlineResult> {
  const sb = getClient()
  if (!sb) return { ok: false, message: 'Cliente Supabase no inicializado (faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).' }
  try {
    if (!tieneDatosOperativos(db)) {
      const now = new Date().toISOString()
      const { error } = await sb.from('app_settings').upsert({ id: 1, data: settings, updated_at: now }, { onConflict: 'id' })
      if (error) return { ok: false, message: formatPgErr('UPSERT en "app_settings"', error) }
      return { ok: true }
    }

    const deletes: [string, string][] = [
      ['clientes', 'id'],
      ['vehiculos', 'id'],
      ['inventario', 'id'],
      ['mecanicos', 'id'],
      ['cotizaciones', 'folio'],
      ['ordenes', 'folio'],
      ['ventas', 'folio'],
      ['gastos', 'id'],
      ['creditos', 'id'],
      ['anticipos', 'id'],
      ['categorias', 'nombre'],
    ]
    for (const [table, pk] of deletes) {
      const dr = await deleteAll(sb, table, pk)
      if (!dr.ok) return dr
    }

    const clientesSync = dedupePorIdConCreado(db.clientes)
    const vehiculosSync = dedupePorIdConCreado(db.vehiculos)
    const inventarioSync = dedupePorIdConCreado(db.inventario)
    const mecanicosSync = dedupePorIdConCreado(db.mecanicos)
    const gastosSync = dedupePorIdConCreado(db.gastos)
    const creditosSync = dedupePorIdConCreado(db.creditos)
    const anticiposSync = dedupePorIdConCreado(db.anticipos)
    const categoriasSync = [...new Set(db.categorias.map((n) => String(n ?? '').trim()).filter(Boolean))]
    const cotizacionesSync = dedupePorFolioConCreado(db.cotizaciones)
    const ordenesSync = dedupePorFolioConCreado(db.ordenes)

    const now = new Date().toISOString()
    /** Inserciones en orden estable + etiqueta para el mensaje de error */
    const insertOps: { label: string; run: () => Promise<{ error: PgErrorLike | null }> }[] = []

    if (clientesSync.length) {
      insertOps.push({
        label: 'clientes',
        run: async () =>
          sb.from('clientes').upsert(clientesSync.map((c) => clienteToInsertRow(c)), { onConflict: 'id' }),
      })
    }
    if (vehiculosSync.length) {
      insertOps.push({
        label: 'vehiculos',
        run: async () =>
          sb.from('vehiculos').upsert(
            vehiculosSync.map((v) => ({
              id: v.id,
              cliente_id: v.clienteId,
              cliente_nombre: v.clienteNombre,
              cliente_rut: v.clienteRut ?? '',
              patente: v.patente,
              marca: v.marca,
              modelo: v.modelo,
              anio: v.anio,
              color: v.color,
              combustible: v.combustible,
              vin: v.vin,
              km: v.km,
              creado: v.creado,
              obs: v.obs ?? '',
              imgs: v.imgs?.length ? v.imgs : null,
              hist_km: v.histKm?.length ? v.histKm : null,
            })),
            { onConflict: 'id' },
          ),
      })
    }
    if (inventarioSync.length) {
      insertOps.push({
        label: 'inventario',
        run: async () =>
          sb.from('inventario').upsert(inventarioSync.map((p) => inventarioToInsertRow(p)), { onConflict: 'id' }),
      })
    }
    if (mecanicosSync.length) {
      insertOps.push({
        label: 'mecanicos',
        run: async () =>
          sb.from('mecanicos').upsert(
            mecanicosSync.map((m) => ({
              id: m.id,
              nombre: m.nombre,
              especialidad: m.especialidad,
              tel: m.tel,
              email: m.email,
              rut: m.rut ?? '',
              sueldo_base: m.sueldoBase ?? 0,
              /** Backup HTML puede traer null/undefined → NOT NULL en BD */
              activo: m.activo !== false,
              creado: m.creado,
              fecha_contrato: m.fechaContrato ?? '',
            })),
            { onConflict: 'id' },
          ),
      })
    }
    if (cotizacionesSync.length) {
      insertOps.push({
        label: 'cotizaciones',
        run: async () =>
          sb.from('cotizaciones').upsert(
            cotizacionesSync.map((c) => ({
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
              descuento: Number(c.descuento) || 0,
              total: c.total,
              obs: c.obs,
              estado: c.estado,
              ot_folio: c.otFolio ?? null,
              creado: c.creado,
            })),
            { onConflict: 'folio' },
          ),
      })
    }
    if (ordenesSync.length) {
      insertOps.push({
        label: 'ordenes',
        run: async () =>
          sb.from('ordenes').upsert(
            ordenesSync.map((o) => {
              const mf = ordenMecanicosToRowFields(ordenRefsForPersist(o))
              const fechaEstTrim = String(o.fechaEst ?? '').trim()
              return {
                folio: o.folio,
                fecha_in: o.fechaIn,
                fecha_est: fechaEstTrim ? fechaEstTrim : null,
                cliente_id: o.clienteId,
                cliente_nombre: o.clienteNombre,
                cliente_rut: o.clienteRut,
                tel: o.tel,
                vehiculo_id: o.vehiculoId,
                patente: o.patente,
                marca: o.marca,
                modelo: o.modelo,
                mecanico_id: mf.mecanico_id || o.mecanicoId,
                mecanico: mf.mecanico || o.mecanico,
                mecanicos: mf.mecanicos && mf.mecanicos.length ? mf.mecanicos : null,
                km: o.km,
                diag: o.diag,
                obs: o.obs,
                items: o.items,
                descuento: Number(o.descuento) || 0,
                total: o.total,
                estado: o.estado,
                cotizacion_origen: o.cotizacionOrigen ?? null,
                creado: o.creado,
                doc_tipo: o.docTipo ?? null,
                doc_folio: o.docFolio ?? null,
                doc_fecha: o.docFecha ?? null,
                doc_monto: o.docMonto ?? null,
                doc_adjunto_nombre: o.docAdjNombre ?? null,
                doc_adjunto_mime: o.docAdjMime ?? null,
                doc_adjunto_data_url: o.docAdjDataUrl ?? null,
                doc_adjunto_size: o.docAdjSize ?? null,
                imgs: o.imgs?.length ? o.imgs : null,
              }
            }),
            { onConflict: 'folio' },
          ),
      })
    }
    const ventasSync = dedupeVentasPorFolio(db.ventas)
    if (ventasSync.length) {
      insertOps.push({
        label: 'ventas',
        run: async () =>
          sb.from('ventas').upsert(
            ventasSync.map((v) => ({
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
              descuento: Number(v.descuento) || 0,
              total: v.total,
              fpago: v.fpago,
              obs: v.obs,
              ot_origen: v.otOrigen ?? null,
              cot_origen: v.cotOrigen ?? null,
              doc_tipo: v.docTipo ?? null,
              doc_folio: v.docFolio ?? null,
              doc_fecha: v.docFecha ?? null,
              doc_monto: v.docMonto ?? null,
              doc_adjunto_nombre: v.docAdjNombre ?? null,
              doc_adjunto_mime: v.docAdjMime ?? null,
              doc_adjunto_data_url: v.docAdjDataUrl ?? null,
              doc_adjunto_size: v.docAdjSize ?? null,
              cheque_numero: v.chequeNumero ?? null,
              cheque_banco: v.chequeBanco ?? null,
              cheque_fecha_cobro: v.chequeFechaCobro ?? null,
              creado: v.creado,
            })),
            { onConflict: 'folio' },
          ),
      })
    }
    if (gastosSync.length) {
      insertOps.push({
        label: 'gastos',
        run: async () =>
          sb.from('gastos').upsert(
            gastosSync.map((g) => ({
              id: g.id,
              descripcion: g.desc,
              categoria: g.categoria,
              monto: g.monto,
              fecha: g.fecha,
              proveedor: g.proveedor,
              creado: g.creado,
            })),
            { onConflict: 'id' },
          ),
      })
    }
    if (creditosSync.length) {
      insertOps.push({
        label: 'creditos',
        run: async () =>
          sb.from('creditos').upsert(
            creditosSync.map((c) => ({
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
              tipo: c.tipo ?? 'credito',
              cheque_numero: c.chequeNumero ?? null,
              cheque_banco: c.chequeBanco ?? null,
              cheque_fecha_cobro: c.chequeFechaCobro ?? null,
              cheque_estado: c.chequeEstado ?? null,
              venta_folio: c.ventaFolio ?? null,
              estado: c.estado,
              creado: c.creado,
            })),
            { onConflict: 'id' },
          ),
      })
    }
    if (anticiposSync.length) {
      insertOps.push({
        label: 'anticipos',
        run: async () =>
          sb.from('anticipos').upsert(
            anticiposSync.map((a) => ({
              id: a.id,
              trabajador_id: anticipoTrabajadorIdParaDb(a) || '',
              trabajador_nombre: anticipoTrabajadorNombreParaDb(a) || '(sin trabajador)',
              tipo: a.tipo,
              monto: a.monto,
              fecha: a.fecha,
              mes_descuento: a.mesDescuento,
              anio_descuento: a.anioDescuento,
              descripcion: a.desc,
              estado: a.estado,
              creado: a.creado,
            })),
            { onConflict: 'id' },
          ),
      })
    }
    if (categoriasSync.length) {
      insertOps.push({
        label: 'categorias',
        run: async () =>
          sb.from('categorias').upsert(categoriasSync.map((nombre) => ({ nombre })), { onConflict: 'nombre' }),
      })
    }

    insertOps.push({
      label: 'app_settings',
      run: async () => sb.from('app_settings').upsert({ id: 1, data: settings, updated_at: now }, { onConflict: 'id' }),
    })

    for (const { label, run } of insertOps) {
      const { error } = await run()
      if (error) return { ok: false, message: formatPgErr(`INSERT/UPSERT en "${label}"`, error) }
    }

    return { ok: true }
  } catch (e) {
    console.error(e)
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, message: `Excepción al guardar: ${msg}` }
  }
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  const obj = value as Record<string, unknown>
  const keys = Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort()
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`
}

function fingerprintDb(db: Db): string {
  const ids = (rows: { id: string }[]) => [...rows].map((r) => r.id).sort().join('\u001f')
  const folios = (rows: { folio: string }[]) => [...rows].map((r) => r.folio).sort().join('\u001f')
  return stableStringify({
    nCli: db.clientes.length,
    cli: ids(db.clientes),
    nVeh: db.vehiculos.length,
    veh: ids(db.vehiculos),
    nInv: db.inventario.length,
    inv: ids(db.inventario),
    nMec: db.mecanicos.length,
    mec: ids(db.mecanicos),
    nCot: db.cotizaciones.length,
    cot: folios(db.cotizaciones),
    nOt: db.ordenes.length,
    ot: folios(db.ordenes),
    nVen: db.ventas.length,
    ven: folios(db.ventas),
    nGas: db.gastos.length,
    gas: ids(db.gastos),
    nCred: db.creditos.length,
    cred: ids(db.creditos),
    nAnt: db.anticipos.length,
    ant: ids(db.anticipos),
    cats: [...db.categorias].sort().join('\u001f'),
  })
}

/**
 * Guarda todo en Supabase y comprueba que, al releer, la huella por tablas (conteos e IDs) coincide con lo local.
 */
export async function verifyRemoteMatchesLocal(
  localDb: Db,
  localSettings: AppSettings,
): Promise<{ ok: boolean; detail: string }> {
  if (!getClient()) return { ok: false, detail: 'Supabase no está configurado (faltan URL o anon key).' }
  const saved = await saveOnlineAll(localDb, localSettings)
  if (!saved.ok)
    return {
      ok: false,
      detail: `${saved.message} Si ves “permission denied” o código 42501, casi siempre es RLS: esta app usa la clave anon sin login.`,
    }
  const remoteDb = await loadOnlineDb()
  if (!remoteDb) return { ok: false, detail: 'No se pudieron leer los datos desde Supabase después de guardar.' }
  const rs = await loadOnlineSettings()
  if (!rs)
    return {
      ok: false,
      detail: 'No se pudo leer app_settings desde Supabase (los datos sí se guardaron).',
    }
  if (fingerprintDb(localDb) !== fingerprintDb(remoteDb)) {
    return {
      ok: false,
      detail:
        'Los datos en la nube no coinciden con los locales tras guardar (huella por tablas). Revisa RLS o intenta de nuevo.',
    }
  }
  return { ok: true, detail: 'Sincronizado: tablas coinciden con Supabase y la configuración está en la nube.' }
}
