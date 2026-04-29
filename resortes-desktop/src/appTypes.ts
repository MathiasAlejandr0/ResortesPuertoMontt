export type LineItem = {
  pid?: string | null
  nombre: string
  unidad: string
  cat: string
  qty: number
  pu: number
  sub: number
  libre?: boolean
  iva?: boolean
}

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
}

export type Vehiculo = {
  id: string
  clienteId: string
  clienteNombre: string
  patente: string
  marca: string
  modelo: string
  anio: string
  color: string
  combustible: string
  vin: string
  km: number
  creado: string
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
}

export type Mecanico = {
  id: string
  nombre: string
  especialidad: string
  tel: string
  email: string
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
  mecanicoId: string
  mecanico: string
  km: number
  diag: string
  obs: string
  items: LineItem[]
  total: number
  estado: string
  cotizacionOrigen?: string
  creado: string
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
  estado: 'Activo' | 'Pagado' | 'Anulado'
  creado: string
}

export type AgendaNota = {
  id: string
  titulo: string
  detalle: string
  fecha: string
  estado: 'pendiente' | 'completado'
  creado: string
}

export type AgendaRecordatorio = {
  id: string
  titulo: string
  fecha: string
  obs: string
  estado: 'pendiente' | 'completado'
  creado: string
}

export type AgendaReserva = {
  id: string
  cliente: string
  tel: string
  fecha: string
  hora: string
  motivo: string
  estado: 'pendiente' | 'confirmada' | 'cancelada'
  creado: string
}

export type Vacacion = {
  id: string
  mecanicoId: string
  mecanicoNombre: string
  desde: string
  hasta: string
  diasHabiles: number
  obs: string
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
}

export type CompraProveedor = {
  id: string
  proveedorId: string
  proveedorNombre: string
  fecha: string
  descripcion: string
  categoria: string
  monto: number
  fpago: string
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
