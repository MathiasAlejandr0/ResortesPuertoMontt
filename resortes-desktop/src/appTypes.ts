export type LineItem = {
  pid?: string | null
  nombre: string
  unidad: string
  cat: string
  qty: number
  pu: number
  /** Descuento por línea % (0–100), como en el HTML */
  dto?: number
  /** Neto tras dto, antes de IVA */
  sub: number
  libre?: boolean
  /** IVA 19% sobre neto tras dto */
  iva?: boolean
}

/** Referencia compacta de mecánico en órdenes (multi-asignación, paridad HTML) */
export type MecanicoRef = {
  id: string
  nombre: string
}

export type ClienteTipo = 'persona' | 'empresa'

export type Cliente = {
  id: string
  nombre: string
  rut: string
  tel: string
  email: string
  dir: string
  origen: string
  obs: string
  creado: string
  /** Paridad HTML — por defecto persona en datos antiguos */
  tipo?: ClienteTipo
  contactoNom?: string
  contactoCargo?: string
  contactoTel?: string
  contactoEmail?: string
  modificado?: string
}

/** Entradas de historial km (HTML legacy `histKm`) */
export type VehiculoHistKm = {
  fecha?: string
  km?: number
  obs?: string
}

export type Vehiculo = {
  id: string
  clienteId: string
  clienteNombre: string
  /** Denormalizado (HTML / listados rápidos) */
  clienteRut?: string
  patente: string
  marca: string
  modelo: string
  anio: string
  color: string
  combustible: string
  vin: string
  km: number
  creado: string
  obs?: string
  /** Data URLs — paridad HTML fotos ingreso */
  imgs?: string[]
  /** Historial km registrado en el HTML */
  histKm?: VehiculoHistKm[]
}

export type Producto = {
  id: string
  nombre: string
  codigo: string
  categoria: string
  unidad: string
  precio: number
  costo: number
  stock: number
  smin: number
  /** Paridad backup HTML — sync Supabase */
  creado?: string
  modificado?: string
}

export type Mecanico = {
  id: string
  nombre: string
  especialidad: string
  tel: string
  email: string
  /** Opcional — remuneraciones / liquidaciones */
  rut?: string
  sueldoBase?: number
  /** Paridad HTML vacaciones — contrato para saldo/antigüedad */
  fechaContrato?: string
  activo: boolean
  creado: string
}

export type Cotizacion = {
  folio: string
  fecha: string
  clienteId: string | null
  clienteNombre: string
  clienteRut: string
  tel: string
  vehiculoId: string | null
  patente: string
  marca: string
  modelo: string
  items: LineItem[]
  /** Descuento global $ sobre el bruto de ítems (como ventas). */
  descuento: number
  total: number
  obs: string
  estado: string
  otFolio?: string
  creado: string
}

export type Orden = {
  folio: string
  fechaIn: string
  fechaEst: string
  clienteId: string | null
  clienteNombre: string
  clienteRut: string
  tel: string
  vehiculoId: string | null
  patente: string
  marca: string
  modelo: string
  /** IDs separados por coma o primer id si hay varios */
  mecanicoId: string
  /** Nombres para lista / PDF */
  mecanico: string
  /** Lista explícita (persistida en Supabase como JSON) */
  mecanicos?: MecanicoRef[]
  km: number
  diag: string
  obs: string
  items: LineItem[]
  /** Descuento global $ sobre el bruto de ítems. */
  descuento: number
  total: number
  estado: string
  cotizacionOrigen?: string
  creado: string
  /** Paridad HTML — documento tributario asociado a la OT */
  docTipo?: string
  docFolio?: string
  docFecha?: string
  docMonto?: number
  docAdjNombre?: string
  docAdjMime?: string
  docAdjDataUrl?: string
  docAdjSize?: number
  /** Fotos ingreso OT (HTML legacy) */
  imgs?: string[]
}

export type Venta = {
  folio: string
  fecha: string
  clienteId: string | null
  clienteNombre: string
  clienteRut: string
  tel: string
  vehiculoId: string | null
  patente: string
  marca: string
  modelo: string
  mecanico?: string
  items: LineItem[]
  descuento: number
  total: number
  fpago: string
  obs: string
  otOrigen?: string
  cotOrigen?: string
  /** Opcional — Boleta / Factura / … */
  docTipo?: string
  docFolio?: string
  docFecha?: string
  docMonto?: number
  docAdjNombre?: string
  docAdjMime?: string
  docAdjDataUrl?: string
  docAdjSize?: number
  chequeNumero?: string
  chequeBanco?: string
  chequeFechaCobro?: string
  creado: string
}

export type Abono = { monto: number; fecha: string; obs: string; creado: string }

export type Credito = {
  id: string
  clienteId: string | null
  clienteNombre: string
  clienteRut: string
  monto: number
  saldo: number
  abonos: Abono[]
  fecha: string
  vcto: string
  desc: string
  tipo?: 'credito' | 'cheque'
  chequeNumero?: string
  chequeBanco?: string
  chequeFechaCobro?: string
  chequeEstado?: 'Pendiente' | 'Al cobro' | 'Cobrado' | 'Rechazado'
  ventaFolio?: string
  estado: string
  creado: string
}

export type Gasto = {
  id: string
  desc: string
  categoria: string
  monto: number
  fecha: string
  proveedor: string
  creado: string
}

export type AnticipoRegistro = {
  id: string
  trabajadorId: string
  trabajadorNombre: string
  tipo: string
  monto: number
  fecha: string
  mesDescuento: number
  anioDescuento: number
  desc: string
  estado: 'Activo' | 'Pagado' | 'Anulado' | 'Pendiente'
  creado: string
}

export type AgendaNota = {
  id: string
  titulo: string
  detalle: string
  fecha: string
  estado: 'pendiente' | 'completado'
  creado: string
  /** Categoría visual (p. ej. yellow, sky, rose, violet, amber) */
  colorTag?: string
  clienteId?: string
  clienteNombre?: string
}

export type AgendaRecordatorio = {
  id: string
  titulo: string
  fecha: string
  obs: string
  estado: 'pendiente' | 'completado'
  creado: string
  hora?: string
  prioridad?: 'normal' | 'alta' | 'urgente'
  clienteId?: string
  clienteNombre?: string
  otFolio?: string
  completadoEn?: string
}

export type AgendaReserva = {
  id: string
  cliente: string
  tel: string
  fecha: string
  hora: string
  motivo: string
  estado: 'pendiente' | 'confirmada' | 'cancelada' | 'completada'
  creado: string
  clienteId?: string
  vehiculoId?: string
  patente?: string
  marca?: string
  modelo?: string
  duracion?: number
  mecanicoId?: string
  mecanico?: string
  obs?: string
}

export type Vacacion = {
  id: string
  mecanicoId: string
  mecanicoNombre: string
  desde: string
  hasta: string
  obs: string
  creado: string
  /** Días hábiles del período (preferido; HTML: dias) */
  dias?: number
  /** @deprecated usar dias */
  diasHabiles?: number
  anio?: number
  estado?: 'Activo' | 'Anulado'
  anuladoEn?: string
}

/** Pedido de fabricación (resorte a medida, etc.) — persiste en `settings.extras`. */
export type PedidoFabricacion = {
  folio: string
  clienteId: string | null
  clienteNombre: string
  tel: string
  fechaPedido: string
  fechaEntregaEst: string
  estado: string
  mecanicoId: string
  mecanico: string
  /** Medidas, material, cantidad de hojas, etc. */
  especificaciones: string
  items: LineItem[]
  senaRecibida: number
  fpago: string
  descuento: number
  total: number
  obs: string
  docTipo?: string
  docFolio?: string
  docFecha?: string
  docMonto?: number
  docAdjNombre?: string
  docAdjMime?: string
  docAdjDataUrl?: string
  docAdjSize?: number
  creado: string
}

export type Proveedor = {
  id: string
  nombre: string
  rut: string
  tel: string
  email: string
  rubro: string
  condicionPago: string
  obs: string
  creado: string
  web?: string
  ciudad?: string
  dir?: string
  contacto?: string
  modificado?: string
}

export type CompraProveedor = {
  id: string
  proveedorId: string
  proveedorNombre: string
  fecha: string
  /** N° factura / documento */
  folio?: string
  descripcion: string
  categoria: string
  monto: number
  fpago: string
  obs: string
  creado: string
  neto?: number
  iva?: number
  tieneIva?: boolean
}

/** Cuota de crédito interno a mecánico (HTML cash_ts3 creditosMec) */
export type CreditoMecCuota = {
  mes: string
  anio: number
  fecha: string
  monto: number
  pagado: boolean
  fechaPago: string | null
}

export type CreditoMec = {
  id: string
  mecanicoId: string
  mecanicoNombre: string
  monto: number
  ncuotas: number
  cuotaMonto: number
  desc: string
  saldo: number
  cuotasPlan: CreditoMecCuota[]
  estado: 'Activo' | 'Pagado'
  creado: string
}

/** Registro de liquidación pagada guardado en el HTML (histórico por mecánico / mes). */
export type LiquidacionHistorial = {
  key: string
  mecanicoId: string
  mes: string
  anio: number
  monto: number
  fecha: string
  obs: string
  creado: string
}

export type Db = {
  clientes: Cliente[]
  vehiculos: Vehiculo[]
  inventario: Producto[]
  mecanicos: Mecanico[]
  cotizaciones: Cotizacion[]
  ordenes: Orden[]
  ventas: Venta[]
  gastos: Gasto[]
  categorias: string[]
  creditos: Credito[]
  anticipos: AnticipoRegistro[]
}

export type AppExtras = {
  agendaNotas: AgendaNota[]
  agendaRecordatorios: AgendaRecordatorio[]
  agendaReservas: AgendaReserva[]
  vacaciones: Vacacion[]
  proveedores: Proveedor[]
  compras: CompraProveedor[]
  creditosMec: CreditoMec[]
  /** Clave `${mecanicoId}_${mes}_${anio}` → comisión ajustada manualmente */
  comisionesAjustadas: Record<string, number>
  /** Liquidaciones registradas en el taller (backup HTML `liquidaciones`) */
  liquidaciones: LiquidacionHistorial[]
  /** Pedidos de fabricación (JSON en app_settings junto al resto de extras). */
  pedidosFabricacion: PedidoFabricacion[]
}

export type EmpresaConfig = {
  nombre: string
  rut: string
  tel: string
  email: string
  dir: string
  ciudad: string
  region: string
  web: string
  slogan: string
}

export type BancoConfig = {
  banco: string
  tipoCuenta: string
  nCuenta: string
  rutTitular: string
  nombreTitular: string
  emailConfirmacion: string
}

export type PdfConfig = {
  validezCotDias: number
  pieOT: string
  pieCot: string
  notaLegal: string
}

export type AppSettings = {
  empresa: EmpresaConfig
  banco: BancoConfig
  pdf: PdfConfig
  logoDataUrl: string | null
  extras: AppExtras
}
