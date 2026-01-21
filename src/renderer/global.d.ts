// Tipos globales para la aplicación Electron

export interface Cliente {
  id?: number;
  nombre: string;
  rut: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  fechaRegistro?: string;
  activo?: number;
}

export interface Vehiculo {
  id?: number;
  clienteId: number;
  marca: string;
  modelo: string;
  año?: number;
  patente?: string;
  color?: string;
  kilometraje?: number;
  activo?: number;
}

export interface Cotizacion {
  id?: number;
  numero: string;
  clienteId: number;
  vehiculoId: number;
  fecha: string;
  validaHasta: string;
  estado: string;
  descripcion?: string;
  observaciones?: string;
  total?: number;
}

export interface OrdenTrabajo {
  id?: number;
  numero: string;
  clienteId: number;
  vehiculoId: number;
  fechaIngreso: string;
  fechaEntrega?: string;
  estado: string;
  descripcion?: string;
  observaciones?: string;
  total?: number;
  kilometrajeEntrada?: number;
  kilometrajeSalida?: number;
  prioridad?: string;
  tecnicoAsignado?: string;
  metodoPago?: 'Efectivo' | 'Débito' | 'Crédito';
  numeroCuotas?: number;
  fechaPago?: string;
  fechaProgramada?: string;
}

export interface Repuesto {
  id?: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  precio: number; // Precio de venta
  precioCosto?: number; // Precio de costo
  stock: number;
  stockMinimo: number;
  categoria: string;
  marca?: string;
  ubicacion?: string;
  activo?: number;
}

export interface Servicio {
  id?: number;
  nombre: string;
  descripcion?: string;
  precio: number;
  duracionEstimada?: number;
  activo?: number;
}

export interface Configuracion {
  id?: number;
  clave: string;
  valor: string;
  descripcion?: string;
}

// Declarar módulos para importar imágenes
declare module '*.png' {
  const value: string;
  export default value;
}

declare module '*.jpg' {
  const value: string;
  export default value;
}

declare module '*.jpeg' {
  const value: string;
  export default value;
}

declare module '*.svg' {
  const value: string;
  export default value;
}

declare global {
  interface Window {
    electronAPI: {
      // Clientes
      getAllClientes: () => Promise<Cliente[]>;
      saveCliente: (cliente: Cliente) => Promise<Cliente>;
      deleteCliente: (id: number) => Promise<boolean>;
      
      // Vehículos
      getAllVehiculos: () => Promise<Vehiculo[]>;
      saveVehiculo: (vehiculo: Vehiculo) => Promise<Vehiculo>;
      deleteVehiculo: (id: number) => Promise<boolean>;
      
      // Cotizaciones
      getAllCotizaciones: () => Promise<Cotizacion[]>;
      saveCotizacion: (cotizacion: Cotizacion) => Promise<Cotizacion>;
      deleteCotizacion: (id: number) => Promise<boolean>;
      
      // Órdenes de Trabajo
      getAllOrdenesTrabajo: () => Promise<OrdenTrabajo[]>;
      saveOrdenTrabajo: (orden: OrdenTrabajo) => Promise<OrdenTrabajo>;
      saveOrdenTrabajoConDetalles: (data: { orden: OrdenTrabajo; detalles: any[] }) => Promise<{ success: boolean; data?: OrdenTrabajo; error?: string }>;
      deleteOrdenTrabajo: (id: number) => Promise<boolean>;
      
      // Ventas
      saveVenta: (ventaData: {
        clienteId?: number;
        clienteNombre?: string;
        clienteRut?: string;
        clienteTelefono?: string;
        clienteEmail?: string;
        repuestos: Array<{ id: number; nombre: string; precio: number; cantidad: number; subtotal: number }>;
        total: number;
      }) => Promise<{ success: boolean; data?: any; error?: string }>;
      
      // Cuotas de Pago
      getAllCuotasPago: () => Promise<any[]>;
      getCuotasPagoByOrden: (ordenId: number) => Promise<any[]>;
      getCuotasPendientes: () => Promise<any[]>;
      saveCuotasPago: (cuotas: any[]) => Promise<{ success: boolean; data?: any[]; error?: string }>;
      confirmarPagoCuota: (data: { cuotaId: number; montoPagado: number; fechaPago: string; observaciones?: string }) => Promise<{ success: boolean; data?: any; error?: string }>;
      actualizarEstadosCuotasVencidas: () => Promise<{ success: boolean; error?: string }>;
      
      // Caja Diaria
      getEstadoCaja: () => Promise<any>;
      abrirCaja: (montoInicial: number, observaciones?: string) => Promise<any>;
      cerrarCaja: (montoFinal: number, observaciones?: string) => Promise<any>;
      registrarMovimientoCaja: (movimiento: any) => Promise<any>;
      getMovimientosCajaPorFecha: (fecha: string) => Promise<any[]>;
      getArqueoCaja: (fecha: string) => Promise<any>;
      
      // Comisiones de Técnicos
      calcularYGuardarComision: (ordenId: number, tecnicoId: number | null, tecnicoNombre: string, porcentajeComision: number) => Promise<any>;
      getReporteComisiones: (mes: string) => Promise<any[]>;
      getResumenComisionesPorTecnico: (mes: string) => Promise<any[]>;
      
      // Agenda
      updateFechaProgramada: (ordenId: number, fechaProgramada: string) => Promise<{ success: boolean; data?: any; error?: string }>;
      getOrdenesParaAgenda: (fechaInicio: string, fechaFin: string) => Promise<OrdenTrabajo[]>;
      
      // Repuestos
      getAllRepuestos: () => Promise<Repuesto[]>;
      saveRepuesto: (repuesto: Repuesto) => Promise<Repuesto>;
      
      // Servicios
      getAllServicios: () => Promise<Servicio[]>;
      saveServicio: (servicio: Servicio) => Promise<Servicio>;
      
      // Configuración
      getAllConfiguracion: () => Promise<Configuracion[]>;
      saveConfiguracion: (config: Configuracion) => Promise<Configuracion>;
      
      // Backups
      createBackup: () => Promise<string>;
      restoreBackup: (backupId: string) => Promise<boolean>;
      deleteBackup: (backupId: string) => Promise<boolean>;
      getBackups: () => Promise<any[]>;
      
      // Importación
      importarRepuestos: (datos: Repuesto[]) => Promise<void>;
      limpiarRepuestos: () => Promise<void>;
      limpiarServicios: () => Promise<void>;
      limpiarClientes: () => Promise<void>;
      obtenerEstadisticasRepuestos: () => Promise<any>;
      limpiarDuplicadosClientes: () => Promise<void>;
      procesarExcelRepuestos: () => Promise<{ success: boolean; cantidad?: number; error?: string; erroresDetallados?: any[] }>;
      procesarExcelServicios: () => Promise<{ success: boolean; cantidad?: number; errores?: number; error?: string; erroresDetallados?: any[] }>;
      procesarExcelClientes: () => Promise<{ success: boolean; cantidad?: number; errores?: number; error?: string; erroresDetallados?: any[] }>;
      repairIntegrity: () => Promise<{ success: boolean; result?: any; error?: string }>;
      diagnosticarOrdenesProblemas: () => Promise<{ success: boolean; problemas?: Array<{ ordenId: number; numeroOrden: string; problemas: string[]; cuotasEsperadas?: number; cuotasEncontradas?: number; detallesEncontrados?: number }>; error?: string }>;
      performMaintenance: (force?: boolean) => Promise<{ success: boolean; error?: string }>;
    };
  }
}

