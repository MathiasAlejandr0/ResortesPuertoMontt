// Tipos que coinciden exactamente con el software original
export interface Usuario {
  id?: number;
  nombre: string;
  email: string;
  password: string;
  rol: string;
  activo?: boolean;
  fechaCreacion?: string;
}

export interface Cliente {
  id?: number;
  nombre: string;
  rut: string;
  telefono: string;
  email?: string;
  direccion?: string;
  fechaRegistro?: string;
  activo?: boolean;
}

export interface Vehiculo {
  id?: number;
  clienteId: number;
  marca: string;
  modelo: string;
  año: number;
  patente: string;
  numeroChasis?: string;
  color?: string;
  kilometraje?: number;
  observaciones?: string;
  activo?: boolean;
}

export interface Servicio {
  id?: number;
  nombre: string;
  descripcion?: string;
  precio: number;
  duracionEstimada: number;
  activo?: boolean;
}

export interface Repuesto {
  id?: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  precio: number; // Precio de venta
  precioCosto?: number; // Precio de costo
  stock?: number;
  stockMinimo?: number;
  categoria: string;
  marca?: string;
  ubicacion?: string;
  activo?: boolean;
}

export interface OrdenTrabajo {
  id?: number;
  numero: string;
  clienteId: number;
  vehiculoId: number;
  fechaIngreso?: string;
  fechaEntrega?: string;
  estado: string;
  descripcion: string;
  observaciones?: string;
  total?: number;
  kilometrajeEntrada?: number;
  kilometrajeSalida?: number;
  prioridad?: string;
  tecnicoAsignado?: string;
  metodoPago?: 'Efectivo' | 'Débito' | 'Crédito';
  numeroCuotas?: number;
  fechaPago?: string;
}

export interface Recordatorio {
  id?: number;
  clienteId?: number | null;
  vehiculoId?: number | null;
  tipo: 'Mantenimiento' | 'Revisión' | 'Otro' | string;
  kilometraje?: number | null;
  fechaAviso: string;
  observaciones?: string;
  estado: 'Pendiente' | 'Enviado';
  fechaCreacion?: string;
  fechaEnvio?: string | null;
}

export interface DetalleOrden {
  id?: number;
  ordenId: number;
  tipo: string;
  servicioId?: number;
  repuestoId?: number;
  cantidad: number;
  precio: number;
  subtotal: number;
  descripcion: string;
}

export interface Cotizacion {
  id?: number;
  numero: string;
  clienteId: number;
  vehiculoId: number;
  fecha?: string;
  validaHasta: string;
  estado: string;
  descripcion: string;
  observaciones?: string;
  total?: number;
}

export interface DetalleCotizacion {
  id?: number;
  cotizacionId: number;
  tipo: string;
  servicioId?: number;
  repuestoId?: number;
  cantidad: number;
  precio: number;
  subtotal: number;
  descripcion: string;
}

export interface Configuracion {
  id?: number;
  clave: string;
  valor: string;
  descripcion?: string;
}

export interface CuotaPago {
  id?: number;
  ordenId: number;
  numeroCuota: number;
  fechaVencimiento: string;
  monto: number;
  montoPagado?: number;
  fechaPago?: string;
  estado: 'Pendiente' | 'Pagada' | 'Vencida';
  observaciones?: string;
}

export interface Venta {
  id?: number;
  numero: string;
  clienteId?: number;
  clienteNombre?: string;
  clienteRut?: string;
  clienteTelefono?: string;
  clienteEmail?: string;
  fecha: string;
  total: number;
  metodoPago?: 'Efectivo' | 'Débito' | 'Crédito';
  observaciones?: string;
}

export interface DetalleVenta {
  id?: number;
  ventaId: number;
  repuestoId: number;
  cantidad: number;
  precio: number;
  subtotal: number;
  descripcion: string;
}

export interface Proveedor {
  id?: number;
  nombre: string;
  tipoContribuyente?: string;
  direccionFiscal?: string;
  nombreFantasia?: string;
  identificacionTributaria?: string;
  ciudadFiscal?: string;
  telefono?: string;
  email?: string;
  personaContacto?: string;
  telefonoAlternativo?: string;
  emailAlternativo?: string;
  comentario?: string;
  activo?: boolean;
}

export interface Categoria {
  id?: number;
  nombre: string;
  activo?: boolean;
}

// Tipos para estadísticas del dashboard
export interface DashboardStats {
  totalClientes: number;
  totalVehiculos: number;
  totalCotizaciones: number;
  totalOrdenes: number;
  totalRepuestos: number;
  totalServicios: number;
  ingresosMes: number;
  alertasStock: number;
}

// Tipos para formularios
export interface CotizacionFormData {
  cliente: Cliente | null;
  vehiculo: Vehiculo | null;
  descripcion: string;
  observaciones?: string;
  validaHasta: string;
  items: CotizacionItem[];
}

export interface CotizacionItem {
  tipo: 'servicio' | 'repuesto';
  servicioId?: number;
  repuestoId?: number;
  descripcion: string;
  cantidad: number;
  precio: number;
  subtotal: number;
}

export interface OrdenFormData {
  cliente: Cliente | null;
  vehiculo: Vehiculo | null;
  descripcion: string;
  observaciones?: string;
  kilometrajeEntrada?: number;
  kilometrajeSalida?: number;
  items: OrdenItem[];
}

export interface OrdenItem {
  tipo: 'servicio' | 'repuesto';
  servicioId?: number;
  repuestoId?: number;
  descripcion: string;
  cantidad: number;
  precio: number;
  subtotal: number;
}

// Tipos para búsquedas
export interface SearchResult {
  clientes: Cliente[];
  vehiculos: Vehiculo[];
  servicios: Servicio[];
  repuestos: Repuesto[];
}

// Tipos para el estado de la aplicación
export interface AppState {
  currentPage: string;
  isLoading: boolean;
  error: string | null;
  clientes: Cliente[];
  vehiculos: Vehiculo[];
  servicios: Servicio[];
  repuestos: Repuesto[];
  cotizaciones: Cotizacion[];
  ordenes: OrdenTrabajo[];
  configuracion: Configuracion[];
}