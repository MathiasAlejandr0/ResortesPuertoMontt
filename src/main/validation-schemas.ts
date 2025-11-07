/**
 * Schemas de validación para IPC handlers
 * Utiliza Zod para validar la entrada de datos desde el renderer
 */

import { z } from 'zod';
import { app } from 'electron';

// Schema para Cliente
export const ClienteSchema = z.object({
  id: z.number().optional(),
  nombre: z.string().min(1, 'El nombre es requerido').max(200),
  rut: z.string().min(1, 'El RUT es requerido').max(20),
  telefono: z.string().min(1, 'El teléfono es requerido').max(20),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  direccion: z.string().max(500).optional().or(z.literal('')),
  fechaRegistro: z.string().optional(),
  activo: z.boolean().optional().default(true),
});

// Schema para Vehículo
export const VehiculoSchema = z.object({
  id: z.number().optional(),
  clienteId: z.number().positive('ClienteId debe ser positivo'),
  marca: z.string().min(1, 'La marca es requerida').max(100),
  modelo: z.string().min(1, 'El modelo es requerido').max(100),
  año: z.number().int().min(1900).max(new Date().getFullYear() + 1),
  patente: z.string().min(1, 'La patente es requerida').max(10),
  color: z.string().max(50).optional().or(z.literal('')),
  kilometraje: z.number().int().nonnegative().optional(),
  observaciones: z.string().max(1000).optional().or(z.literal('')),
  activo: z.boolean().optional().default(true),
});

// Schema para Cotización
export const CotizacionSchema = z.object({
  id: z.number().optional(),
  numero: z.string().min(1, 'El número de cotización es requerido'),
  clienteId: z.number().positive('ClienteId debe ser positivo'),
  vehiculoId: z.number().positive('VehiculoId debe ser positivo'),
  fecha: z.string(),
  validaHasta: z.string().optional().default(''),
  estado: z.enum(['pendiente', 'aprobada', 'rechazada', 'vencida', 'convertida']),
  descripcion: z.string().max(5000),
  observaciones: z.string().max(5000).optional().default(''),
  total: z.number().nonnegative('El total no puede ser negativo'),
}).transform((data) => ({
  ...data,
  validaHasta: data.validaHasta || '',
  observaciones: data.observaciones || '',
}));

// Schema para DetalleCotizacion (para uso general)
export const DetalleCotizacionSchema = z.object({
  id: z.number().optional(),
  cotizacionId: z.number().positive(),
  tipo: z.enum(['servicio', 'repuesto']),
  servicioId: z.number().positive().optional(),
  repuestoId: z.number().positive().optional(),
  cantidad: z.number().positive('La cantidad debe ser positiva'),
  precio: z.number().nonnegative('El precio no puede ser negativo'),
  subtotal: z.number().nonnegative('El subtotal no puede ser negativo'),
  descripcion: z.string().min(1, 'La descripción es requerida').max(500),
});

// Schema para DetalleCotizacion cuando se envía con una cotización nueva (cotizacionId opcional)
export const DetalleCotizacionSinCotizacionIdSchema = z.object({
  id: z.number().optional(),
  cotizacionId: z.number().positive().optional(), // Opcional cuando se envía con cotización nueva
  tipo: z.enum(['servicio', 'repuesto']),
  servicioId: z.number().positive().optional(),
  repuestoId: z.number().positive().optional(),
  cantidad: z.number().positive('La cantidad debe ser positiva'),
  precio: z.number().nonnegative('El precio no puede ser negativo'),
  subtotal: z.number().nonnegative('El subtotal no puede ser negativo'),
  descripcion: z.string().min(1, 'La descripción es requerida').max(500),
});

// Schema para OrdenTrabajo
export const OrdenTrabajoSchema = z.object({
  id: z.number().optional(),
  numero: z.string().min(1, 'El número de orden es requerido'),
  clienteId: z.number().positive('ClienteId debe ser positivo'),
  vehiculoId: z.number().positive('VehiculoId debe ser positivo'),
  fechaIngreso: z.string(),
  fechaEntrega: z.string().optional(),
  estado: z.string().transform((val) => {
    // Normalizar valores a formato de base de datos (hacer esto primero)
    const estadoMap: Record<string, 'Pendiente' | 'En Progreso' | 'Completada' | 'Cancelada'> = {
      'pendiente': 'Pendiente',
      'en_proceso': 'En Progreso',
      'en progreso': 'En Progreso',
      'completada': 'Completada',
      'cancelada': 'Cancelada'
    };
    const normalized = estadoMap[val.toLowerCase()] || val;
    // Validar después de normalizar
    const estadosValidos: ('Pendiente' | 'En Progreso' | 'Completada' | 'Cancelada')[] = ['Pendiente', 'En Progreso', 'Completada', 'Cancelada'];
    if (!estadosValidos.includes(normalized as any)) {
      throw new Error(`Estado inválido: ${val}. Valores permitidos: ${estadosValidos.join(', ')}`);
    }
    return normalized as 'Pendiente' | 'En Progreso' | 'Completada' | 'Cancelada';
  }),
  descripcion: z.string().max(5000),
  observaciones: z.string().max(5000).optional().or(z.literal('')),
  total: z.number().nonnegative('El total no puede ser negativo'),
  kilometrajeEntrada: z.number().int().nonnegative().nullable().optional().transform((val) => val ?? undefined),
  kilometrajeSalida: z.number().int().nonnegative().nullable().optional().transform((val) => val ?? undefined),
  prioridad: z.enum(['Baja', 'Normal', 'Alta', 'Urgente', 'baja', 'normal', 'alta', 'urgente', 'media']).optional().transform((val) => {
    if (!val) return undefined;
    // Normalizar valores de prioridad
    const prioridadMap: Record<string, string> = {
      'baja': 'Baja',
      'normal': 'Normal',
      'media': 'Normal',
      'alta': 'Alta',
      'urgente': 'Urgente'
    };
    return prioridadMap[val.toLowerCase()] || val;
  }),
  tecnicoAsignado: z.string().max(200).optional().or(z.literal('')),
  metodoPago: z.enum(['Efectivo', 'Débito', 'Crédito']).optional(),
  numeroCuotas: z.number().int().positive().optional(),
  fechaPago: z.string().optional(),
});

// Schema para DetalleOrden (para uso general)
export const DetalleOrdenSchema = z.object({
  id: z.number().optional(),
  ordenId: z.number().positive(),
  tipo: z.enum(['servicio', 'repuesto']),
  servicioId: z.number().positive().optional(),
  repuestoId: z.number().positive().optional(),
  cantidad: z.number().positive('La cantidad debe ser positiva'),
  precio: z.number().nonnegative('El precio no puede ser negativo'),
  subtotal: z.number().nonnegative('El subtotal no puede ser negativo'),
  descripcion: z.string().min(1, 'La descripción es requerida').max(500),
});

// Schema para DetalleOrden cuando se envía con una orden nueva (ordenId opcional)
export const DetalleOrdenSinOrdenIdSchema = z.object({
  id: z.number().optional(),
  ordenId: z.number().positive().optional(), // Opcional cuando se envía con orden nueva
  tipo: z.enum(['servicio', 'repuesto']),
  servicioId: z.number().positive().optional(),
  repuestoId: z.number().positive().optional(),
  cantidad: z.number().positive('La cantidad debe ser positiva'),
  precio: z.number().nonnegative('El precio no puede ser negativo'),
  subtotal: z.number().nonnegative('El subtotal no puede ser negativo'),
  descripcion: z.string().min(1, 'La descripción es requerida').max(500),
});

// Schema para Repuesto
export const RepuestoSchema = z.object({
  id: z.number().optional(),
  codigo: z.string().min(1, 'El código es requerido').max(50),
  nombre: z.string().min(1, 'El nombre es requerido').max(200),
  descripcion: z.string().max(1000).optional().default(''),
  precio: z.number().nonnegative('El precio no puede ser negativo'),
  stock: z.number().int().nonnegative('El stock no puede ser negativo'),
  stockMinimo: z.number().int().nonnegative('El stock mínimo no puede ser negativo'),
  categoria: z.string().min(1, 'La categoría es requerida').max(100),
  marca: z.string().max(100).optional().default(''),
  ubicacion: z.string().max(100).optional().default(''),
  activo: z.boolean().optional().default(true),
}).transform((data) => ({
  ...data,
  descripcion: data.descripcion || '',
  marca: data.marca || '',
  ubicacion: data.ubicacion || '',
}));

// Schema para Servicio
export const ServicioSchema = z.object({
  id: z.number().optional(),
  nombre: z.string().min(1, 'El nombre es requerido').max(200),
  descripcion: z.string().max(1000).optional().default(''),
  precio: z.number().nonnegative('El precio no puede ser negativo'),
  duracionEstimada: z.number().int().positive('La duración debe ser positiva'),
  activo: z.boolean().optional().default(true),
}).transform((data) => ({
  ...data,
  descripcion: data.descripcion || '',
}));

// Schema para paginación
export const PaginationSchema = z.object({
  limit: z.number().int().positive().max(1000).optional().default(50),
  offset: z.number().int().nonnegative().optional().default(0),
});

// Schema para Vehículo cuando se crea con un cliente nuevo
// clienteId NO se valida - es completamente opcional y puede no existir
export const VehiculoNuevoSchema = z.object({
  id: z.number().optional(),
  // NO incluir clienteId aquí - se manejará dinámicamente según si el cliente es nuevo o no
  marca: z.string().max(100).optional().or(z.literal('')).default(''),
  modelo: z.string().max(100).optional().or(z.literal('')).default(''),
  año: z.number().int().min(1900).max(new Date().getFullYear() + 1).optional(),
  patente: z.string().max(10).optional().or(z.literal('')).default(''),
  color: z.string().max(50).optional().or(z.literal('')).default(''),
  kilometraje: z.number().int().nonnegative().optional(),
  observaciones: z.string().max(1000).optional().or(z.literal('')).default(''),
  activo: z.boolean().optional().default(true),
}).passthrough(); // Permitir campos adicionales (incluyendo clienteId) sin validarlos

// Schema para save-cliente-con-vehiculos
// Si el cliente es nuevo (sin ID), los vehículos no requieren clienteId
export const SaveClienteConVehiculosSchema = z.object({
  cliente: ClienteSchema,
  vehiculos: z.array(z.any()).max(50, 'Máximo 50 vehículos'), // Usar z.any() para evitar validación estricta
}).passthrough().transform((data: any) => {
  const esClienteNuevo = !data.cliente?.id || data.cliente.id === 0;
  
  // Filtrar vehículos vacíos (sin marca, modelo o patente) antes de guardar
  const vehiculosValidos = (data.vehiculos || []).filter((v: any) => {
    const marca = v.marca || '';
    const modelo = v.modelo || '';
    const patente = v.patente || '';
    return marca.trim() && modelo.trim() && patente.trim();
  });
  
  // Preparar vehículos: eliminar cualquier campo relacionado con clienteId si el cliente es nuevo
  const vehiculosPreparados = vehiculosValidos.map((v: any) => {
    // Crear un objeto limpio solo con los campos necesarios
    const vehiculo: any = {
      marca: (v.marca || '').trim(),
      modelo: (v.modelo || '').trim(),
      año: typeof v.año === 'number' ? v.año : (typeof v.año === 'string' ? parseInt(v.año) || new Date().getFullYear() : new Date().getFullYear()),
      patente: (v.patente || '').trim(),
      color: (v.color || '').trim() || '',
      kilometraje: typeof v.kilometraje === 'number' ? v.kilometraje : undefined,
      observaciones: (v.observaciones || '').trim() || '',
      activo: v.activo !== false
    };
    
    // Solo agregar id si existe y es un número válido
    if (typeof v.id === 'number' && v.id > 0) {
      vehiculo.id = v.id;
    }
    
    // Si el cliente es nuevo, NO incluir clienteId en absoluto (ni ninguna variante)
    // Si el cliente existe, incluir su ID
    if (!esClienteNuevo && data.cliente?.id && data.cliente.id > 0) {
      vehiculo.clienteId = data.cliente.id;
    }
    // Si es cliente nuevo, NO agregar clienteId (el backend lo asignará)
    
    console.log(`🔍 Vehículo preparado (cliente nuevo: ${esClienteNuevo}):`, vehiculo);
    
    return vehiculo;
  });
  
  return {
    cliente: data.cliente,
    vehiculos: vehiculosPreparados
  };
});

// Schema para save-cotizacion-con-detalles
export const SaveCotizacionConDetallesSchema = z.object({
  cotizacion: CotizacionSchema,
  detalles: z.array(DetalleCotizacionSinCotizacionIdSchema).max(100, 'Máximo 100 detalles'),
});

// Schema para save-orden-trabajo-con-detalles
export const SaveOrdenTrabajoConDetallesSchema = z.object({
  orden: OrdenTrabajoSchema,
  detalles: z.array(DetalleOrdenSinOrdenIdSchema).max(100, 'Máximo 100 detalles'),
});

// Helper para validar datos
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    // Para SaveClienteConVehiculosSchema, confiar en el .transform() del esquema
    // Solo limpiar campos problemáticos como "clienteld" (typo) antes de validar
    if (data && typeof data === 'object' && 'vehiculos' in data) {
      const cleaned = JSON.parse(JSON.stringify(data)) as any; // Deep clone para evitar mutaciones
      
      // Limpiar cualquier variante incorrecta de clienteId (clienteld, cliente_id, etc.)
      if (Array.isArray(cleaned.vehiculos)) {
        cleaned.vehiculos = cleaned.vehiculos.map((v: any) => {
          const vehiculoLimpio: any = {};
          
          // Solo copiar campos válidos, ignorando cualquier variante de clienteId
          const camposValidos = ['id', 'marca', 'modelo', 'año', 'patente', 'color', 'kilometraje', 'observaciones', 'activo'];
          camposValidos.forEach(campo => {
            if (v.hasOwnProperty(campo)) {
              vehiculoLimpio[campo] = v[campo];
            }
          });
          
          // Si el cliente existe, agregar clienteId correcto
          // Si el cliente es nuevo, NO agregar clienteId
          const esClienteNuevo = !cleaned.cliente?.id || cleaned.cliente?.id === 0;
          if (!esClienteNuevo && cleaned.cliente?.id) {
            vehiculoLimpio.clienteId = cleaned.cliente.id;
          }
          
          return vehiculoLimpio;
        });
      }
      
      // Log solo en desarrollo
      if (!app.isPackaged) {
        console.log('🔍 Datos limpiados antes de validar:', JSON.stringify(cleaned, null, 2));
      }
      return schema.parse(cleaned);
    }
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Errores de validación:', error.errors);
      const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new Error(`Validación fallida: ${messages}`);
    }
    throw error;
  }
}

// Helper para validación segura (no lanza error, retorna resultado)
export function safeValidate<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return { success: false, error: `Validación fallida: ${messages}` };
    }
    return { success: false, error: 'Error de validación desconocido' };
  }
}

