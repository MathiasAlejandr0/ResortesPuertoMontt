import type {
  AgendaReserva,
  AnticipoRegistro,
  AppSettings,
  Db,
  LiquidacionHistorial,
  Mecanico,
  Venta,
} from './appTypes'
import { defaultAppSettings } from './appSettings'
import { MESES_REM } from './remuneracionesHelpers'
import { dedupeVentasPorFolio, normalizeVenta } from './opsHelpers'

function newImpId(prefix: string) {
  try {
    return `${prefix}${crypto.randomUUID().replace(/-/g, '').slice(0, 14)}`
  } catch {
    return `${prefix}${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
  }
}

/**
 * Agenda del HTML puede usar `clienteNombre` + `servicio`; el escritorio usa `cliente` + `motivo`.
 */
export function normalizeImportedAgendaReservas(rows: unknown): AgendaReserva[] {
  if (!Array.isArray(rows)) return []
  const estados: AgendaReserva['estado'][] = ['pendiente', 'confirmada', 'cancelada', 'completada']
  return rows.map((raw): AgendaReserva => {
    const x = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
    const id = typeof x.id === 'string' && x.id.trim() ? x.id.trim() : newImpId('res_')
    const cliente =
      (typeof x.cliente === 'string' && x.cliente.trim()) ||
      (typeof x.clienteNombre === 'string' && x.clienteNombre.trim()) ||
      ''
    const motivo =
      (typeof x.motivo === 'string' && x.motivo.trim()) ||
      (typeof x.servicio === 'string' && x.servicio.trim()) ||
      ''
    const ev = x.estado
    const estado: AgendaReserva['estado'] = estados.includes(ev as AgendaReserva['estado'])
      ? (ev as AgendaReserva['estado'])
      : 'pendiente'
    const dur =
      typeof x.duracion === 'number' && Number.isFinite(x.duracion) ? Math.round(x.duracion) : undefined
    return {
      id,
      cliente,
      tel: typeof x.tel === 'string' ? x.tel : '',
      fecha: typeof x.fecha === 'string' ? x.fecha : '',
      hora: typeof x.hora === 'string' ? x.hora : '',
      motivo,
      estado,
      creado: typeof x.creado === 'string' && x.creado.trim() ? x.creado : new Date().toISOString(),
      clienteId: typeof x.clienteId === 'string' && x.clienteId.trim() ? x.clienteId : undefined,
      vehiculoId: typeof x.vehiculoId === 'string' && x.vehiculoId.trim() ? x.vehiculoId : undefined,
      patente: typeof x.patente === 'string' && x.patente.trim() ? x.patente : undefined,
      marca: typeof x.marca === 'string' && x.marca.trim() ? x.marca : undefined,
      modelo: typeof x.modelo === 'string' && x.modelo.trim() ? x.modelo : undefined,
      duracion: dur,
      mecanicoId: typeof x.mecanicoId === 'string' && x.mecanicoId.trim() ? x.mecanicoId : undefined,
      mecanico: typeof x.mecanico === 'string' && x.mecanico.trim() ? x.mecanico : undefined,
      obs: typeof x.obs === 'string' && x.obs.trim() ? x.obs : undefined,
    }
  })
}

/** Backup HTML lista `liquidaciones` con mismas claves que `LiquidacionHistorial`. */
export function normalizeImportedLiquidaciones(rows: unknown): LiquidacionHistorial[] {
  if (!Array.isArray(rows)) return []
  return rows.map((raw): LiquidacionHistorial => {
    const x = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
    const anio = Number(x.anio)
    const monto = Number(x.monto)
    return {
      key: typeof x.key === 'string' ? x.key : '',
      mecanicoId: typeof x.mecanicoId === 'string' ? x.mecanicoId : '',
      mes: typeof x.mes === 'string' ? x.mes : '',
      anio: Number.isFinite(anio) ? anio : 0,
      monto: Number.isFinite(monto) ? monto : 0,
      fecha: typeof x.fecha === 'string' ? x.fecha : '',
      obs: typeof x.obs === 'string' ? x.obs : '',
      creado: typeof x.creado === 'string' && x.creado.trim() ? x.creado : new Date().toISOString(),
    }
  })
}

/** HTML «anticipos» usa `mecanicoId`, `mecanicoNombre`, `mes` ("Abril"), `anio`. */
const MESES_ANT_NOMBRE: Record<string, number> = {
  enero: 0,
  febrero: 1,
  marzo: 2,
  abril: 3,
  mayo: 4,
  junio: 5,
  julio: 6,
  agosto: 7,
  septiembre: 8,
  octubre: 9,
  noviembre: 10,
  diciembre: 11,
}

function mesDescuentoAnticipoFromFlat(x: Record<string, unknown>): number {
  const n = Number(x.mes_descuento ?? x.mesDescuento)
  if (Number.isFinite(n) && n >= 0 && n <= 11) return Math.floor(n)
  let s = String(x.mes ?? '').trim().toLowerCase()
  try {
    s = s.normalize('NFD').replace(/\p{Mark}/gu, '')
  } catch {
    /* ignore */
  }
  const hit = MESES_ANT_NOMBRE[s]
  if (hit !== undefined) return hit
  const abIdx = MESES_REM.findIndex((abbr) => s.startsWith(abbr.slice(0, 3).toLowerCase()))
  return abIdx >= 0 ? abIdx : new Date().getMonth()
}

/**
 * HTML guarda `estado: "Activo"`; el escritorio usa `activo: boolean`.
 * Sin esto, `filter(m => m.activo)` deja la nómina vacía.
 */
function mecanicoActivoFromFlat(x: Record<string, unknown>): boolean {
  if (typeof x.activo === 'boolean') return x.activo
  const est = String(x.estado ?? '').trim().toLowerCase()
  if (est === 'inactivo' || est === 'baja' || est === 'no') return false
  return true
}

export function normalizeImportedMecanicos(rows: unknown): Mecanico[] {
  if (!Array.isArray(rows)) return []
  const nowIso = new Date().toISOString()
  return rows.map((raw, idx): Mecanico => {
    const x = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
    const id =
      typeof x.id === 'string' && x.id.trim() ? x.id.trim() : newImpId(`mec_${idx}_`)
    const sueldoN = Number(x.sueldoBase ?? x.sueldo_base)
    return {
      id,
      nombre: String(x.nombre ?? '').trim(),
      especialidad: String(x.especialidad ?? '').trim(),
      tel: String(x.tel ?? '').trim(),
      email: String(x.email ?? '').trim(),
      rut: typeof x.rut === 'string' && x.rut.trim() ? x.rut.trim() : undefined,
      sueldoBase: Number.isFinite(sueldoN) && sueldoN >= 0 ? sueldoN : undefined,
      fechaContrato:
        typeof x.fechaContrato === 'string' && x.fechaContrato.trim()
          ? x.fechaContrato.trim()
          : typeof x.fecha_contrato === 'string' && String(x.fecha_contrato).trim()
            ? String(x.fecha_contrato).trim()
            : undefined,
      activo: mecanicoActivoFromFlat(x),
      creado: typeof x.creado === 'string' && x.creado.trim() ? x.creado : nowIso,
    }
  })
}

export function normalizeImportedAnticipos(rows: unknown, mecanicos: Mecanico[]): AnticipoRegistro[] {
  if (!Array.isArray(rows)) return []
  const nowIso = new Date().toISOString()
  const nombreAMecId = new Map<string, string>()
  for (const m of mecanicos) nombreAMecId.set(m.nombre.trim().toLowerCase(), m.id)
  return rows.map((raw, idx): AnticipoRegistro => {
    const x = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
    let tid = String(x.trabajadorId ?? x.mecanicoId ?? x.trabajador_id ?? '').trim()
    let tnombre = String(x.trabajadorNombre ?? x.mecanicoNombre ?? '').trim()
    if (!tid && tnombre) {
      const res = nombreAMecId.get(tnombre.toLowerCase())
      if (res) tid = res
    }
    if (!tnombre && tid) tnombre = mecanicos.find((m) => m.id === tid)?.nombre ?? ''
    const estadoRaw = String(x.estado ?? 'Activo')
    const estado = (['Pagado', 'Anulado', 'Pendiente', 'Activo'].includes(estadoRaw)
      ? estadoRaw
      : 'Activo') as AnticipoRegistro['estado']
    const id =
      typeof x.id === 'string' && x.id.trim() ? x.id.trim() : newImpId(`ant_${idx}_`)
    return {
      id,
      trabajadorId: tid,
      trabajadorNombre: tnombre,
      tipo: String(x.tipo ?? 'Anticipo de sueldo'),
      monto: Number(x.monto) || 0,
      fecha: String(x.fecha ?? '').trim().slice(0, 10) || nowIso.slice(0, 10),
      mesDescuento: mesDescuentoAnticipoFromFlat(x),
      anioDescuento: Number(x.anio_descuento ?? x.anioDescuento ?? x.anio) || new Date().getFullYear(),
      desc: String(x.desc ?? x.descripcion ?? '').trim(),
      estado,
      creado: typeof x.creado === 'string' && x.creado.trim() ? x.creado : nowIso,
    }
  })
}

/** Ventas del HTML pueden omitir `descuento` (p. ej. solo boleta/factura). */
export function normalizeImportedVentas(rows: unknown): Venta[] {
  if (!Array.isArray(rows)) return []
  const now = new Date().toISOString()
  const lista = rows.map((raw, idx) => {
    const x = raw && typeof raw === 'object' ? (raw as Partial<Venta> & Record<string, unknown>) : {}
    const folio =
      typeof x.folio === 'string' && x.folio.trim() ? x.folio.trim() : newImpId(`vt_${idx}_`)
    const creado = typeof x.creado === 'string' && x.creado.trim() ? x.creado : now
    return normalizeVenta({ ...x, folio, creado })
  })
  return dedupeVentasPorFolio(lista)
}

/** Paridad HTML / escritorio vacío */
export const DEFAULT_CATEGORIAS = [
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
] as const

export function takeArr<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : []
}

export function takeRecordNum(v: unknown): Record<string, number> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {}
  const out: Record<string, number> = {}
  for (const [k, val] of Object.entries(v)) {
    const n = Number(val)
    if (Number.isFinite(n)) out[k] = n
  }
  return out
}

/**
 * Convierte el “documento plano” del taller (arrays en raíz + cfg) al modelo del escritorio.
 *
 * - **HTML backup**: `cfg` = `taller`; mismas claves en raíz que `getBkData()`.
 * - **Firestore** `taller/datos`: `cfg` = `_cfg`; mismas colecciones que `DB` en el HTML + `_updated` ignorado.
 */
export function flatWorkspacePayloadToDesktop(
  flat: Record<string, unknown>,
  cfg: Record<string, unknown>,
): { db: Db; settings: AppSettings } {
  const d = defaultAppSettings()

  let categorias = takeArr<string>(flat.categorias)
  if (categorias.length === 0) categorias = [...DEFAULT_CATEGORIAS]

  const mecanicos = normalizeImportedMecanicos(flat.mecanicos)
  const db: Db = {
    clientes: takeArr(flat.clientes),
    vehiculos: takeArr(flat.vehiculos),
    inventario: takeArr(flat.inventario),
    mecanicos,
    cotizaciones: takeArr(flat.cotizaciones),
    ordenes: takeArr(flat.ordenes),
    ventas: normalizeImportedVentas(flat.ventas),
    gastos: takeArr(flat.gastos),
    categorias,
    creditos: takeArr(flat.creditos),
    anticipos: normalizeImportedAnticipos(flat.anticipos, mecanicos),
  }

  const settings: AppSettings = {
    ...d,
    empresa: {
      ...d.empresa,
      nombre: String(cfg.nombre ?? d.empresa.nombre).trim() || d.empresa.nombre,
      rut: String(cfg.rut ?? ''),
      tel: String(cfg.fono ?? cfg.tel ?? ''),
      email: String(cfg.email ?? ''),
      dir: String(cfg.dir ?? ''),
      ciudad: String(cfg.ciudad ?? d.empresa.ciudad),
      region: String(cfg.region ?? d.empresa.region),
      web: String(cfg.web ?? ''),
      slogan: String(cfg.slogan ?? ''),
    },
    banco: {
      ...d.banco,
      banco: String(cfg.banco ?? ''),
      tipoCuenta: String(cfg.tipoCuenta ?? ''),
      nCuenta: String(cfg.numCuenta ?? ''),
      rutTitular: String(cfg.rutTitular ?? ''),
      nombreTitular: String(cfg.nomTitular ?? ''),
      emailConfirmacion: String(cfg.emailBanco ?? ''),
    },
    pdf: {
      ...d.pdf,
      validezCotDias: Math.max(1, Number(cfg.validez) || d.pdf.validezCotDias),
      pieOT: String(cfg.pieOT ?? ''),
      pieCot: String(cfg.pieCot ?? ''),
      notaLegal: String(cfg.notaLegal ?? ''),
    },
    logoDataUrl: typeof cfg.logo === 'string' && cfg.logo.trim() ? cfg.logo : null,
    extras: {
      ...d.extras,
      agendaNotas: takeArr(flat.notas),
      agendaRecordatorios: takeArr(flat.recordatorios),
      agendaReservas: normalizeImportedAgendaReservas(flat.reservas),
      vacaciones: takeArr(flat.vacaciones),
      proveedores: takeArr(flat.proveedores),
      compras: takeArr(flat.compras),
      creditosMec: takeArr(flat.creditosMec),
      comisionesAjustadas:
        flat.comisionesAjustadas !== undefined && flat.comisionesAjustadas !== null
          ? takeRecordNum(flat.comisionesAjustadas)
          : d.extras.comisionesAjustadas,
      liquidaciones:
        flat.liquidaciones !== undefined && flat.liquidaciones !== null
          ? normalizeImportedLiquidaciones(flat.liquidaciones)
          : d.extras.liquidaciones,
    },
  }

  return { db, settings }
}
