import { contextBridge, ipcRenderer } from 'electron';

// Definir la API que se expondrá al renderer
const electronAPI = {
  // Clientes
  getAllClientes: () => ipcRenderer.invoke('get-all-clientes'),
  getClientesPaginated: (params: { limit?: number; offset?: number }) => ipcRenderer.invoke('get-clientes-paginated', params),
  searchClientes: (searchTerm: string) => ipcRenderer.invoke('search-clientes', searchTerm),
  saveCliente: (cliente: any) => ipcRenderer.invoke('save-cliente', cliente),
  deleteCliente: (id: number) => ipcRenderer.invoke('delete-cliente', id),
  
  // Vehículos
  getAllVehiculos: () => ipcRenderer.invoke('get-all-vehiculos'),
  getVehiculosPaginated: (params: { limit?: number; offset?: number }) => ipcRenderer.invoke('get-vehiculos-paginated', params),
  saveVehiculo: (vehiculo: any) => ipcRenderer.invoke('save-vehiculo', vehiculo),
  deleteVehiculo: (id: number) => ipcRenderer.invoke('delete-vehiculo', id),
  
  // Cotizaciones
  getAllCotizaciones: () => ipcRenderer.invoke('get-all-cotizaciones'),
  getCotizacionesPaginated: (params: { limit?: number; offset?: number }) => ipcRenderer.invoke('get-cotizaciones-paginated', params),
  saveCotizacion: (cotizacion: any) => ipcRenderer.invoke('save-cotizacion', cotizacion),
  saveCotizacionConDetalles: (data: { cotizacion: any, detalles: any[] }) => ipcRenderer.invoke('save-cotizacion-con-detalles', data),
  deleteCotizacion: (id: number) => ipcRenderer.invoke('delete-cotizacion', id),
  getDetallesCotizacion: (cotizacionId: number) => ipcRenderer.invoke('get-detalles-cotizacion', cotizacionId),
  saveDetalleCotizacion: (detalle: any) => ipcRenderer.invoke('save-detalle-cotizacion', detalle),
  
  // Órdenes de Trabajo
  getAllOrdenesTrabajo: () => ipcRenderer.invoke('get-all-ordenes-trabajo'),
  getOrdenesTrabajoPaginated: (params: { limit?: number; offset?: number }) => ipcRenderer.invoke('get-ordenes-trabajo-paginated', params),
  saveOrdenTrabajo: (orden: any) => ipcRenderer.invoke('save-orden-trabajo', orden),
  saveOrdenTrabajoConDetalles: (data: { orden: any, detalles: any[] }) => ipcRenderer.invoke('save-orden-trabajo-con-detalles', data),
  deleteOrdenTrabajo: (id: number) => ipcRenderer.invoke('delete-orden-trabajo', id),
  getDetallesOrden: (ordenId: number) => ipcRenderer.invoke('get-detalles-orden', ordenId),
  saveDetalleOrden: (detalle: any) => ipcRenderer.invoke('save-detalle-orden', detalle),
  deleteDetallesOrden: (ordenId: number) => ipcRenderer.invoke('delete-detalles-orden', ordenId),
  
  // Ventas
  saveVenta: (ventaData: {
    clienteId?: number;
    clienteNombre?: string;
    clienteRut?: string;
    clienteTelefono?: string;
    clienteEmail?: string;
    repuestos: Array<{ id: number; nombre: string; precio: number; cantidad: number; subtotal: number }>;
    total: number;
  }) => ipcRenderer.invoke('save-venta', ventaData),
  
  // Repuestos
  getAllRepuestos: () => ipcRenderer.invoke('get-all-repuestos'),
  getRepuestosPaginated: (params: { limit?: number; offset?: number }) => ipcRenderer.invoke('get-repuestos-paginated', params),
  searchRepuestos: (searchTerm: string) => ipcRenderer.invoke('search-repuestos', searchTerm),
  saveRepuesto: (repuesto: any) => ipcRenderer.invoke('save-repuesto', repuesto),
  deleteRepuesto: (id: number) => ipcRenderer.invoke('delete-repuesto', id),
  
  // Servicios
  getAllServicios: () => ipcRenderer.invoke('get-all-servicios'),
  saveServicio: (servicio: any) => ipcRenderer.invoke('save-servicio', servicio),
  
  // Configuración
  getAllConfiguracion: () => ipcRenderer.invoke('get-all-configuracion'),
  saveConfiguracion: (config: any) => ipcRenderer.invoke('save-configuracion', config),
  
  // Backups
  createBackup: () => ipcRenderer.invoke('create-backup'),
  restoreBackup: (backupId: string) => ipcRenderer.invoke('restore-backup', backupId),
  deleteBackup: (backupId: string) => ipcRenderer.invoke('delete-backup', backupId),
  getBackups: () => ipcRenderer.invoke('get-backups'),
  
  // Importación de datos
  importarRepuestos: (datos: any[]) => ipcRenderer.invoke('importar-repuestos', datos),
  limpiarRepuestos: () => ipcRenderer.invoke('limpiar-repuestos'),
  obtenerEstadisticasRepuestos: () => ipcRenderer.invoke('obtener-estadisticas-repuestos'),
  limpiarDuplicadosClientes: () => ipcRenderer.invoke('limpiar-duplicados-clientes'),
  procesarExcelRepuestos: () => ipcRenderer.invoke('procesar-excel-repuestos'),

  // Eventos desde el proceso principal (menú)
  on: (channel: string, listener: (...args: any[]) => void) => {
    ipcRenderer.on(channel, (_event, ...args) => listener(...args));
  },

  // Guardado atómico de cliente con vehículos
  saveClienteConVehiculos: (data: any) => ipcRenderer.invoke('save-cliente-con-vehiculos', data),

  // Reparar integridad de datos
  repairIntegrity: () => ipcRenderer.invoke('repair-integrity'),
  diagnosticarOrdenesProblemas: () => ipcRenderer.invoke('diagnosticar-ordenes-problemas'),
  performMaintenance: (force?: boolean) => ipcRenderer.invoke('perform-maintenance', force),
  
  // Monitoreo de base de datos
  getDatabaseStats: () => ipcRenderer.invoke('get-database-stats'),
  databaseNeedsMaintenance: () => ipcRenderer.invoke('database-needs-maintenance'),
  
  // Cuotas de Pago
  getAllCuotasPago: () => ipcRenderer.invoke('get-all-cuotas-pago'),
  getCuotasPagoByOrden: (ordenId: number) => ipcRenderer.invoke('get-cuotas-pago-by-orden', ordenId),
  getCuotasPendientes: () => ipcRenderer.invoke('get-cuotas-pendientes'),
  saveCuotasPago: (cuotas: any[]) => ipcRenderer.invoke('save-cuotas-pago', cuotas),
  confirmarPagoCuota: (data: { cuotaId: number; montoPagado: number; fechaPago: string; observaciones?: string }) => 
    ipcRenderer.invoke('confirmar-pago-cuota', data),
  actualizarEstadosCuotasVencidas: () => ipcRenderer.invoke('actualizar-estados-cuotas-vencidas'),
};

// Exponer la API al contexto del renderer
console.log('🔧 preload.ts: Exponiendo API al contexto del renderer');
contextBridge.exposeInMainWorld('electronAPI', electronAPI);
console.log('✅ preload.ts: API expuesta exitosamente');

// Declarar el tipo para TypeScript
declare global {
  interface Window {
    electronAPI: typeof electronAPI;
  }
}
