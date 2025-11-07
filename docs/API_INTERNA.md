# 📚 DOCUMENTACIÓN DE API INTERNA

**Sistema:** Resortes Puerto Montt v1.1.2  
**Fecha:** 2025-11-03  
**Versión:** 1.1.2

---

## 📋 TABLA DE CONTENIDOS

1. [Introducción](#introducción)
2. [Arquitectura IPC](#arquitectura-ipc)
3. [Handlers IPC](#handlers-ipc)
4. [Schemas de Validación](#schemas-de-validación)
5. [Base de Datos](#base-de-datos)
6. [Servicios](#servicios)
7. [Errores y Manejo](#errores-y-manejo)

---

## 🎯 INTRODUCCIÓN

Esta documentación describe la API interna del sistema Resortes Puerto Montt, incluyendo los handlers IPC (Inter-Process Communication), schemas de validación, y servicios principales.

### Arquitectura General

```
Renderer Process (React)
    ↓ (IPC via contextBridge)
Preload Script
    ↓ (IPC via ipcRenderer)
Main Process (Electron)
    ↓ (DatabaseService)
SQLite Database
```

---

## 🔌 ARQUITECTURA IPC

### Context Bridge (Preload)

El preload script (`src/main/preload.ts`) expone una API segura al renderer mediante `contextBridge`.

**Principios de Seguridad:**
- ✅ `contextIsolation: true` - Aislamiento de contexto
- ✅ `nodeIntegration: false` - Sin acceso directo a Node.js
- ✅ Solo handlers específicos expuestos

### Comunicación

```typescript
// En el renderer (React)
const resultado = await window.electronAPI.saveCliente(cliente);

// En el preload (preload.ts)
saveCliente: (cliente: any) => ipcRenderer.invoke('save-cliente', cliente)

// En el main (main.ts)
ipcMain.handle('save-cliente', async (event, cliente) => {
  // Validación y procesamiento
});
```

---

## 📡 HANDLERS IPC

### Clientes

#### `get-all-clientes`
Obtiene todos los clientes del sistema.

**Parámetros:** Ninguno

**Retorna:** `Cliente[]`

**Ejemplo:**
```typescript
const clientes = await window.electronAPI.getAllClientes();
```

---

#### `get-clientes-paginated`
Obtiene clientes paginados.

**Parámetros:**
```typescript
{
  limit?: number;  // Default: 50, Max: 1000
  offset?: number; // Default: 0
}
```

**Retorna:**
```typescript
{
  data: Cliente[];
  total: number;
  limit: number;
  offset: number;
}
```

**Validación:** `PaginationSchema`

---

#### `search-clientes`
Busca clientes usando FTS5 (Full-Text Search).

**Parámetros:**
- `searchTerm: string` - Término de búsqueda

**Retorna:** `Cliente[]`

**Ejemplo:**
```typescript
const resultados = await window.electronAPI.searchClientes('Juan');
```

---

#### `save-cliente`
Guarda o actualiza un cliente.

**Parámetros:**
```typescript
Cliente {
  id?: number;
  nombre: string;        // Requerido, min 1, max 200
  rut: string;           // Requerido, min 1, max 20
  telefono: string;      // Requerido, min 1, max 20
  email?: string;        // Opcional, formato email válido
  direccion?: string;    // Opcional, max 500
  fechaRegistro?: string;
  activo?: boolean;      // Default: true
}
```

**Validación:** `ClienteSchema`

**Retorna:** `Cliente` (con ID asignado)

**Errores:**
- `Validación fallida: nombre: El nombre es requerido`
- `Validación fallida: rut: El RUT es requerido`

---

#### `delete-cliente`
Elimina un cliente y todos sus datos relacionados.

**Parámetros:**
- `id: number` - ID del cliente (debe ser positivo)

**Validación:** ID numérico positivo

**Retorna:** `{ success: boolean }`

**Nota:** Realiza cascading delete de:
- Vehículos del cliente
- Cotizaciones del cliente
- Órdenes del cliente
- Detalles relacionados

---

#### `save-cliente-con-vehiculos`
Guarda cliente con vehículos en una transacción atómica.

**Parámetros:**
```typescript
{
  cliente: Cliente;
  vehiculos: Vehiculo[]; // Max 50 vehículos
}
```

**Validación:** `SaveClienteConVehiculosSchema`

**Retorna:**
```typescript
{
  success: boolean;
  cliente?: Cliente;
  error?: string;
}
```

---

### Vehículos

#### `get-all-vehiculos`
Obtiene todos los vehículos.

**Parámetros:** Ninguno

**Retorna:** `Vehiculo[]`

---

#### `get-vehiculos-paginated`
Obtiene vehículos paginados.

**Parámetros:**
```typescript
{
  limit?: number;  // Default: 50
  offset?: number; // Default: 0
}
```

**Retorna:**
```typescript
{
  data: Vehiculo[];
  total: number;
  limit: number;
  offset: number;
}
```

---

#### `save-vehiculo`
Guarda o actualiza un vehículo.

**Parámetros:**
```typescript
Vehiculo {
  id?: number;
  clienteId: number;     // Requerido, positivo
  marca: string;         // Requerido, min 1, max 100
  modelo: string;        // Requerido, min 1, max 100
  año: number;           // Requerido, 1900 - (año actual + 1)
  patente: string;       // Requerido, min 1, max 10
  color?: string;        // Opcional, max 50
  kilometraje?: number; // Opcional, entero no negativo
  observaciones?: string; // Opcional, max 1000
  activo?: boolean;      // Default: true
}
```

**Validación:** `VehiculoSchema`

**Retorna:** `Vehiculo` (con ID asignado)

---

### Cotizaciones

#### `get-all-cotizaciones`
Obtiene todas las cotizaciones.

**Parámetros:** Ninguno

**Retorna:** `Cotizacion[]`

---

#### `get-cotizaciones-paginated`
Obtiene cotizaciones paginadas.

**Parámetros:**
```typescript
{
  limit?: number;  // Default: 50
  offset?: number; // Default: 0
}
```

**Retorna:**
```typescript
{
  data: Cotizacion[];
  total: number;
  limit: number;
  offset: number;
}
```

---

#### `save-cotizacion`
Guarda o actualiza una cotización.

**Parámetros:**
```typescript
Cotizacion {
  id?: number;
  numero: string;        // Requerido, min 1
  clienteId: number;     // Requerido, positivo
  vehiculoId: number;    // Requerido, positivo
  fecha: string;         // ISO string
  validaHasta?: string;  // ISO string, opcional
  estado: 'pendiente' | 'aprobada' | 'rechazada' | 'vencida' | 'convertida';
  descripcion: string;   // Max 5000
  observaciones?: string; // Opcional, max 5000
  total: number;         // Requerido, no negativo
}
```

**Validación:** `CotizacionSchema`

**Retorna:** `Cotizacion` (con ID asignado)

---

#### `save-cotizacion-con-detalles`
Guarda cotización con detalles en transacción atómica.

**Parámetros:**
```typescript
{
  cotizacion: Cotizacion;
  detalles: DetalleCotizacion[]; // Max 100 detalles
}
```

**Validación:** `SaveCotizacionConDetallesSchema`

**Retorna:**
```typescript
{
  success: boolean;
  data?: Cotizacion;
  error?: string;
}
```

**Características:**
- ✅ Transacción atómica (todo o nada)
- ✅ Validación de integridad referencial
- ✅ Rollback automático en caso de error
- ✅ Elimina detalles antiguos antes de insertar nuevos

---

#### `get-detalles-cotizacion`
Obtiene los detalles de una cotización.

**Parámetros:**
- `cotizacionId: number` - ID de la cotización

**Retorna:** `DetalleCotizacion[]`

---

#### `delete-cotizacion`
Elimina una cotización y sus detalles.

**Parámetros:**
- `id: number` - ID de la cotización

**Retorna:** `{ success: boolean }`

---

### Órdenes de Trabajo

#### `get-all-ordenes-trabajo`
Obtiene todas las órdenes de trabajo.

**Parámetros:** Ninguno

**Retorna:** `OrdenTrabajo[]`

---

#### `get-ordenes-trabajo-paginated`
Obtiene órdenes paginadas.

**Parámetros:**
```typescript
{
  limit?: number;  // Default: 50
  offset?: number; // Default: 0
}
```

**Retorna:**
```typescript
{
  data: OrdenTrabajo[];
  total: number;
  limit: number;
  offset: number;
}
```

---

#### `save-orden-trabajo`
Guarda o actualiza una orden de trabajo.

**Parámetros:**
```typescript
OrdenTrabajo {
  id?: number;
  numero: string;         // Requerido, min 1
  clienteId: number;     // Requerido, positivo
  vehiculoId: number;    // Requerido, positivo
  fechaIngreso: string;  // ISO string
  fechaEntrega?: string; // ISO string, opcional
  estado: 'pendiente' | 'en_proceso' | 'completada' | 'cancelada';
  descripcion: string;   // Max 5000
  observaciones?: string; // Opcional, max 5000
  total: number;         // Requerido, no negativo
  kilometrajeEntrada?: number; // Opcional, entero no negativo
  kilometrajeSalida?: number;  // Opcional, entero no negativo
  prioridad?: 'baja' | 'media' | 'alta' | 'urgente';
  tecnicoAsignado?: string;    // Opcional, max 200
}
```

**Validación:** `OrdenTrabajoSchema`

**Retorna:**
```typescript
{
  success: boolean;
  data?: OrdenTrabajo;
  error?: string;
}
```

---

#### `save-orden-trabajo-con-detalles`
Guarda orden con detalles en transacción atómica.

**Parámetros:**
```typescript
{
  orden: OrdenTrabajo;
  detalles: DetalleOrden[]; // Max 100 detalles
}
```

**Validación:** `SaveOrdenTrabajoConDetallesSchema`

**Retorna:**
```typescript
{
  success: boolean;
  data?: OrdenTrabajo;
  error?: string;
}
```

**Características:**
- ✅ Transacción atómica
- ✅ Validación de integridad referencial
- ✅ Rollback automático en error
- ✅ Elimina detalles antiguos antes de insertar nuevos

---

#### `get-detalles-orden`
Obtiene los detalles de una orden.

**Parámetros:**
- `ordenId: number` - ID de la orden

**Retorna:** `DetalleOrden[]`

---

#### `delete-orden-trabajo`
Elimina una orden y sus detalles.

**Parámetros:**
- `id: number` - ID de la orden

**Retorna:** `{ success: boolean }`

---

### Repuestos

#### `get-all-repuestos`
Obtiene todos los repuestos.

**Parámetros:** Ninguno

**Retorna:** `Repuesto[]`

---

#### `get-repuestos-paginated`
Obtiene repuestos paginados.

**Parámetros:**
```typescript
{
  limit?: number;  // Default: 50
  offset?: number; // Default: 0
}
```

**Retorna:**
```typescript
{
  data: Repuesto[];
  total: number;
  limit: number;
  offset: number;
}
```

---

#### `search-repuestos`
Busca repuestos usando FTS5.

**Parámetros:**
- `searchTerm: string` - Término de búsqueda (puede ser múltiples términos)

**Retorna:** `Repuesto[]`

**Búsqueda:**
- Busca en: nombre, código, descripción, categoría
- Soporta múltiples términos (ej: "filtro aceite")
- Usa FTS5 con fallback a LIKE

---

#### `save-repuesto`
Guarda o actualiza un repuesto.

**Parámetros:**
```typescript
Repuesto {
  id?: number;
  codigo: string;        // Requerido, min 1, max 50
  nombre: string;        // Requerido, min 1, max 200
  descripcion?: string;  // Opcional, max 1000
  precio: number;        // Requerido, no negativo
  stock: number;         // Requerido, entero no negativo
  stockMinimo: number;   // Requerido, entero no negativo
  categoria: string;     // Requerido, min 1, max 100
  marca?: string;        // Opcional, max 100
  ubicacion?: string;    // Opcional, max 100
  activo?: boolean;      // Default: true
}
```

**Validación:** `RepuestoSchema`

**Retorna:** `Repuesto` (con ID asignado)

---

#### `delete-repuesto`
Elimina un repuesto.

**Parámetros:**
- `id: number` - ID del repuesto

**Retorna:** `{ success: boolean }`

---

### Servicios

#### `get-all-servicios`
Obtiene todos los servicios.

**Parámetros:** Ninguno

**Retorna:** `Servicio[]`

---

#### `save-servicio`
Guarda o actualiza un servicio.

**Parámetros:**
```typescript
Servicio {
  id?: number;
  nombre: string;        // Requerido, min 1, max 200
  descripcion?: string;  // Opcional, max 1000
  precio: number;        // Requerido, no negativo
  duracionEstimada: number; // Requerido, entero positivo
  activo?: boolean;      // Default: true
}
```

**Validación:** `ServicioSchema`

**Retorna:** `Servicio` (con ID asignado)

---

### Backups

#### `create-backup`
Crea un backup manual de la base de datos.

**Parámetros:** Ninguno

**Retorna:**
```typescript
{
  success: boolean;
  backupPath?: string;
  error?: string;
}
```

---

#### `get-backups`
Obtiene lista de backups disponibles.

**Parámetros:** Ninguno

**Retorna:**
```typescript
{
  backups: Array<{
    id: string;
    path: string;
    size: number;
    fecha: string;
  }>;
}
```

---

#### `restore-backup`
Restaura un backup.

**Parámetros:**
- `backupId: string` - ID del backup

**Retorna:**
```typescript
{
  success: boolean;
  error?: string;
}
```

---

#### `delete-backup`
Elimina un backup.

**Parámetros:**
- `backupId: string` - ID del backup

**Retorna:**
```typescript
{
  success: boolean;
  error?: string;
}
```

---

## 🔍 SCHEMAS DE VALIDACIÓN

Todos los handlers IPC que aceptan datos de entrada están protegidos con schemas de validación Zod.

### Ubicación
`src/main/validation-schemas.ts`

### Schemas Disponibles

#### ClienteSchema
Valida datos de cliente con:
- Nombre requerido (1-200 caracteres)
- RUT requerido (1-20 caracteres)
- Teléfono requerido (1-20 caracteres)
- Email opcional (formato válido)
- Dirección opcional (max 500 caracteres)

#### VehiculoSchema
Valida datos de vehículo con:
- ClienteId requerido (positivo)
- Marca requerida (1-100 caracteres)
- Modelo requerido (1-100 caracteres)
- Año requerido (1900 - año actual + 1)
- Patente requerida (1-10 caracteres)

#### CotizacionSchema
Valida cotización con:
- Número requerido
- ClienteId y VehiculoId requeridos (positivos)
- Estado enum válido
- Total no negativo

#### OrdenTrabajoSchema
Valida orden con:
- Número requerido
- ClienteId y VehiculoId requeridos (positivos)
- Estado enum válido
- Total no negativo

#### RepuestoSchema
Valida repuesto con:
- Código requerido (1-50 caracteres)
- Nombre requerido (1-200 caracteres)
- Precio no negativo
- Stock no negativo
- Categoría requerida

#### ServicioSchema
Valida servicio con:
- Nombre requerido (1-200 caracteres)
- Precio no negativo
- Duración estimada positiva

### Uso

```typescript
import { validateData, ClienteSchema } from './validation-schemas';

// Validar datos
try {
  const clienteValidado = validateData(ClienteSchema, datosCliente);
  // Usar clienteValidado
} catch (error) {
  // Error de validación
  console.error(error.message);
}
```

### Helpers

#### `validateData<T>(schema, data): T`
Valida datos y lanza error si falla.

#### `safeValidate<T>(schema, data): { success: boolean, data?: T, error?: string }`
Valida datos sin lanzar error, retorna resultado.

---

## 💾 BASE DE DATOS

### DatabaseService

**Ubicación:** `src/database/database.ts`

**Características:**
- ✅ SQLite con WAL mode
- ✅ Transacciones atómicas
- ✅ Validación de integridad referencial
- ✅ Caché LRU de queries
- ✅ FTS5 para búsqueda full-text
- ✅ Backups automáticos

### Métodos Principales

#### Transacciones Atómicas

```typescript
// Guardar cotización con detalles
await dbService.saveCotizacionConDetalles(cotizacion, detalles);

// Guardar orden con detalles
await dbService.saveOrdenTrabajoConDetalles(orden, detalles);

// Guardar cliente con vehículos
await dbService.saveClienteConVehiculos(cliente, vehiculos);
```

**Características:**
- Transacción BEGIN → COMMIT
- Validación de integridad antes de guardar
- Rollback automático en error
- Eliminación de datos antiguos antes de insertar nuevos

### Estructura de Base de Datos

#### Tablas Principales
- `clientes` - Información de clientes
- `vehiculos` - Vehículos de clientes
- `cotizaciones` - Cotizaciones
- `detalles_cotizacion` - Detalles de cotizaciones
- `ordenes_trabajo` - Órdenes de trabajo
- `detalles_orden` - Detalles de órdenes
- `repuestos` - Inventario de repuestos
- `servicios` - Catálogo de servicios
- `configuracion` - Configuración del sistema

#### Índices
- `idx_clientes_rut` - Búsqueda rápida por RUT
- `idx_vehiculos_cliente` - Vehículos por cliente
- `idx_cotizaciones_estado` - Cotizaciones por estado
- `idx_ordenes_estado` - Órdenes por estado
- `idx_repuestos_nombre` - Búsqueda de repuestos
- `idx_detalles_cotizacion_cotizacion` - Detalles por cotización
- `idx_detalles_orden_orden` - Detalles por orden

#### FTS5 (Full-Text Search)
- `clientes_fts` - Búsqueda full-text en clientes
- `repuestos_fts` - Búsqueda full-text en repuestos

---

## 🔧 SERVICIOS

### NumberingService

**Ubicación:** `src/renderer/services/NumberingService.ts`

Genera números únicos para cotizaciones y órdenes.

**Métodos:**
- `generateCotizacionNumber(): string` - Genera número de cotización
- `generateOrdenNumber(): string` - Genera número de orden

**Formato:**
- Cotizaciones: `COT-{timestamp}-{random}`
- Órdenes: `OT-{timestamp}-{random}`

---

### EnvioDocumentosService

**Ubicación:** `src/renderer/services/EnvioDocumentosService.ts`

Maneja el envío de documentos por WhatsApp.

**Métodos:**
- `enviarCotizacionPorWhatsApp(cotizacion, cliente, telefono): Promise<boolean>`
- `enviarOrdenPorWhatsApp(orden, cliente, telefono): Promise<boolean>`

---

## ⚠️ ERRORES Y MANEJO

### Tipos de Errores

#### Errores de Validación
```typescript
Error: Validación fallida: nombre: El nombre es requerido
```

#### Errores de Integridad Referencial
```typescript
Error: Cliente con ID 999 no existe
```

#### Errores de Base de Datos
```typescript
Error: SQLITE_CONSTRAINT UNIQUE
```

### Manejo de Errores

Todos los handlers IPC:
1. Validan entrada con Zod
2. Capturan errores con try-catch
3. Retornan mensajes de error descriptivos
4. Logean errores en consola

**Ejemplo:**
```typescript
try {
  const resultado = await window.electronAPI.saveCliente(cliente);
  // Éxito
} catch (error) {
  // Error de validación o BD
  console.error(error.message);
  notify.error('Error', error.message);
}
```

---

## 📝 NOTAS IMPORTANTES

### Validación
- Todos los handlers de guardado validan entrada
- Los errores de validación son descriptivos
- Los datos se sanitizan automáticamente

### Transacciones
- Las operaciones complejas usan transacciones
- Rollback automático en caso de error
- Integridad referencial validada antes de guardar

### Performance
- Caché LRU para queries frecuentes
- Paginación disponible para listados grandes
- FTS5 para búsquedas rápidas

### Seguridad
- Context isolation activado
- Node integration desactivado
- Validación de entrada en todos los handlers críticos

---

**Última actualización:** 2025-11-03  
**Versión:** 1.1.2

