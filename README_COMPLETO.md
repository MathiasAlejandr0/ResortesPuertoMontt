# 📚 DOCUMENTACIÓN COMPLETA DEL SISTEMA
## Resortes Puerto Montt - Sistema de Gestión para Talleres Mecánicos

**Versión:** 1.1.2  
**Fecha de Documentación:** 2025-12-07  
**Autor:** Mathias Jara  
**Email:** mathias.jara@hotmail.com

---

## 📋 TABLA DE CONTENIDOS

1. [Descripción General](#descripción-general)
2. [Tecnologías Utilizadas](#tecnologías-utilizadas)
3. [Arquitectura del Sistema](#arquitectura-del-sistema)
4. [Estructura del Proyecto](#estructura-del-proyecto)
5. [Flujos de Trabajo Completos](#flujos-de-trabajo-completos)
6. [Base de Datos](#base-de-datos)
7. [API Interna (IPC)](#api-interna-ipc)
8. [Sistema de Errores](#sistema-de-errores)
9. [Seguridad](#seguridad)
10. [Instalación y Desarrollo](#instalación-y-desarrollo)
11. [Testing](#testing)
12. [Vulnerabilidades y Mitigaciones](#vulnerabilidades-y-mitigaciones)
13. [Rendimiento y Optimizaciones](#rendimiento-y-optimizaciones)
14. [Mantenimiento](#mantenimiento)

---

## 🎯 DESCRIPCIÓN GENERAL

### ¿Qué es Resortes Puerto Montt?

**Resortes Puerto Montt** es una aplicación de escritorio desarrollada con **Electron** que proporciona un sistema de gestión integral para talleres mecánicos. Permite gestionar clientes, vehículos, cotizaciones, órdenes de trabajo, inventario de repuestos, servicios y sistema de pagos a crédito.

### Características Principales

- ✅ **Gestión completa de clientes y vehículos**
- ✅ **Sistema de cotizaciones profesionales** con múltiples estados
- ✅ **Órdenes de trabajo** con seguimiento de estados y prioridades
- ✅ **Control de inventario** con alertas de stock mínimo
- ✅ **Dashboard con KPIs** en tiempo real
- ✅ **Sistema de pagos a crédito** con cuotas y alertas de vencimiento
- ✅ **Ventas rápidas** de repuestos sin orden completa
- ✅ **Búsqueda avanzada** con FTS5 (Full-Text Search)
- ✅ **Importación de inventario** desde archivos Excel
- ✅ **Exportación de documentos** (versión cliente e interna)
- ✅ **Envío de documentos** por WhatsApp
- ✅ **Sistema de backups** automático y manual
- ✅ **Mantenimiento automático** de base de datos

### Casos de Uso

1. **Taller Mecánico:** Gestión diaria de clientes, vehículos y trabajos
2. **Control de Inventario:** Seguimiento de repuestos con alertas de stock
3. **Facturación:** Generación de cotizaciones y órdenes de trabajo
4. **Seguimiento de Pagos:** Gestión de cuotas y alertas de vencimiento
5. **Reportes:** Dashboard con métricas y KPIs del negocio

---

## 🛠️ TECNOLOGÍAS UTILIZADAS

### Stack Tecnológico Completo

#### Frontend (Renderer Process)

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **React** | 18.3.1 | Biblioteca UI para interfaz de usuario |
| **TypeScript** | 5.7.2 | Tipado estático y mejor DX |
| **Vite** | 5.4.20 | Build tool y dev server |
| **Tailwind CSS** | 3.4.17 | Framework de estilos utility-first |
| **Radix UI** | Latest | Componentes accesibles y sin estilos |
| **Lucide React** | 0.462.0 | Iconos modernos |
| **Sonner** | 1.7.4 | Sistema de notificaciones toast |
| **Recharts** | 2.15.4 | Gráficos y visualizaciones |
| **React Router DOM** | 6.30.1 | Navegación (aunque se usa routing manual) |
| **React Hook Form** | 7.61.1 | Manejo de formularios |
| **Zod** | 3.25.76 | Validación de esquemas |
| **TanStack Query** | 5.83.0 | Gestión de estado del servidor (no usado activamente) |
| **date-fns** | 3.6.0 | Manipulación de fechas |

#### Backend (Main Process)

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **Electron** | 33.2.1 | Framework de aplicación de escritorio |
| **Node.js** | (bundled) | Runtime de JavaScript |
| **SQLite3** | 5.1.6 | Base de datos embebida |
| **TypeScript** | 5.7.2 | Tipado estático |
| **XLSX (SheetJS)** | 0.18.5 | Procesamiento de archivos Excel |

#### Herramientas de Desarrollo

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **Jest** | 29.7.0 | Framework de testing |
| **ts-jest** | 29.4.5 | Transpilador TypeScript para Jest |
| **ESLint** | 9.17.0 | Linter de código |
| **Electron Builder** | 25.1.8 | Empaquetado y distribución |
| **Concurrently** | 9.1.0 | Ejecutar múltiples comandos en paralelo |

#### Librerías de Utilidad

- **clsx** - Utilidad para clases CSS condicionales
- **tailwind-merge** - Merge de clases Tailwind
- **class-variance-authority** - Variantes de componentes
- **express** - Servidor HTTP (no usado activamente)
- **cors** - CORS middleware (no usado activamente)

### Arquitectura de Procesos

El sistema utiliza la arquitectura multi-proceso de Electron:

```
┌─────────────────────────────────────┐
│  Main Process (Node.js)             │
│  - Electron APIs                    │
│  - DatabaseService (Singleton)      │
│  - IPC Handlers                     │
│  - File System Access               │
│  - Backups                          │
└──────────────┬──────────────────────┘
               │ IPC (contextBridge)
               ↓
┌─────────────────────────────────────┐
│  Preload Script                     │
│  - API Segura (contextBridge)       │
│  - Exposición limitada             │
└──────────────┬──────────────────────┘
               │
               ↓
┌─────────────────────────────────────┐
│  Renderer Process (React)           │
│  - UI Components                    │
│  - React State (Context API)         │
│  - Formularios                      │
│  - Sin acceso a Node.js             │
└─────────────────────────────────────┘
```

---

## 🏗️ ARQUITECTURA DEL SISTEMA

### Separación de Responsabilidades

#### Main Process (`src/main/main.ts`)

**Responsabilidades:**
- ✅ Gestión de ventanas de Electron
- ✅ Comunicación IPC (Inter-Process Communication)
- ✅ Acceso a base de datos SQLite
- ✅ Sistema de archivos (backups, importación Excel)
- ✅ Validación de datos con Zod
- ✅ Logging persistente
- ✅ Menú de aplicación

**Características de Seguridad:**
- `contextIsolation: true` - Aislamiento de contexto
- `nodeIntegration: false` - Sin acceso directo a Node.js desde renderer
- Validación de entrada en todos los handlers IPC
- Sanitización de datos

#### Renderer Process (`src/renderer/`)

**Responsabilidades:**
- ✅ Interfaz de usuario (React)
- ✅ Lógica de presentación
- ✅ Estado de componentes (Context API)
- ✅ Validación de formularios (React Hook Form + Zod)
- ✅ Manejo de errores (ErrorBoundary)
- ✅ Notificaciones al usuario

**Características:**
- Sin acceso directo a Node.js
- Comunicación solo vía IPC
- Estado global con Context API
- Componentes funcionales con Hooks

#### Preload Script (`src/main/preload.ts`)

**Responsabilidades:**
- ✅ Bridge seguro entre procesos
- ✅ Exposición limitada de API
- ✅ Context Bridge para seguridad

**API Expuesta:**
```typescript
window.electronAPI = {
  // Clientes
  getAllClientes,
  getClientesPaginated,
  searchClientes,
  saveCliente,
  deleteCliente,
  saveClienteConVehiculos,
  
  // Vehículos
  getAllVehiculos,
  getVehiculosPaginated,
  saveVehiculo,
  deleteVehiculo,
  
  // Cotizaciones
  getAllCotizaciones,
  getCotizacionesPaginated,
  saveCotizacion,
  saveCotizacionConDetalles,
  deleteCotizacion,
  getDetallesCotizacion,
  
  // Órdenes
  getAllOrdenesTrabajo,
  getOrdenesTrabajoPaginated,
  saveOrdenTrabajo,
  saveOrdenTrabajoConDetalles,
  deleteOrdenTrabajo,
  getDetallesOrden,
  
  // Repuestos
  getAllRepuestos,
  getRepuestosPaginated,
  searchRepuestos,
  saveRepuesto,
  deleteRepuesto,
  
  // Servicios
  getAllServicios,
  saveServicio,
  
  // Backups
  createBackup,
  getBackups,
  restoreBackup,
  deleteBackup,
  
  // Otros
  procesarExcelRepuestos,
  importarRepuestos,
  // ... más métodos
}
```

### Patrones de Diseño Implementados

#### 1. Singleton Pattern
**DatabaseService** - Una sola instancia de base de datos en toda la aplicación.

```typescript
class DatabaseService {
  private static instance: DatabaseService;
  
  static async create(): Promise<DatabaseService> {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
      await DatabaseService.instance.initializeDatabaseAsync();
    }
    return DatabaseService.instance;
  }
}
```

#### 2. Repository Pattern (Implícito)
**DatabaseService** actúa como repositorio, abstrae el acceso a datos.

#### 3. Factory Pattern
**DatabaseService.create()** - Factory method asíncrono para inicialización.

#### 4. Context Pattern (React)
**AppContext** - Estado global compartido entre componentes.

```typescript
const AppContext = createContext<AppContextType | undefined>(undefined);

export function useApp() {
  return useContext(AppContext);
}
```

#### 5. Observer Pattern
**IPC Handlers** - Observan eventos y procesan solicitudes.

#### 6. Strategy Pattern
**Validación con Zod** - Diferentes schemas para diferentes entidades.

---

## 📁 ESTRUCTURA DEL PROYECTO

```
ResortesPuertoMontt/
├── src/
│   ├── main/                          # Main Process (Electron)
│   │   ├── main.ts                    # Punto de entrada Electron
│   │   ├── preload.ts                 # Preload script (contextBridge)
│   │   ├── validation-schemas.ts      # Schemas Zod para validación
│   │   └── logger-persistente.ts       # Sistema de logs persistentes
│   │
│   ├── renderer/                       # Renderer Process (React)
│   │   ├── main.tsx                    # Punto de entrada React
│   │   ├── AppNew.tsx                  # Componente raíz
│   │   ├── index.css                   # Estilos globales
│   │   │
│   │   ├── components/                 # Componentes React
│   │   │   ├── ClienteForm.tsx         # Formulario de cliente
│   │   │   ├── CotizacionFormMejorado.tsx
│   │   │   ├── OrdenFormMejorado.tsx
│   │   │   ├── ErrorBoundary.tsx       # Manejo de errores React
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── StatCard.tsx            # Tarjetas de estadísticas
│   │   │   ├── StockModal.tsx           # Modal de stock
│   │   │   ├── VerCotizacionModal.tsx
│   │   │   ├── VerOrdenModal.tsx
│   │   │   ├── EditarCotizacionModal.tsx
│   │   │   ├── EditarOrdenModal.tsx
│   │   │   └── ui/                     # Componentes UI base (Radix)
│   │   │       ├── button.tsx
│   │   │       ├── dialog.tsx
│   │   │       ├── input.tsx
│   │   │       └── ...
│   │   │
│   │   ├── pages/                      # Páginas principales
│   │   │   ├── Dashboard.tsx           # Dashboard con KPIs
│   │   │   ├── Clientes.tsx             # Gestión de clientes
│   │   │   ├── Cotizaciones.tsx         # Gestión de cotizaciones
│   │   │   ├── Ordenes.tsx              # Gestión de órdenes
│   │   │   ├── Inventario.tsx           # Gestión de inventario
│   │   │   ├── Pagos.tsx                # Gestión de pagos
│   │   │   └── Configuracion.tsx        # Configuración del sistema
│   │   │
│   │   ├── contexts/                   # Context API
│   │   │   └── AppContext.tsx          # Estado global de la aplicación
│   │   │
│   │   ├── services/                   # Servicios del frontend
│   │   │   ├── NumberingService.ts     # Generación de números únicos
│   │   │   └── EnvioDocumentosService.ts # Envío por WhatsApp
│   │   │
│   │   ├── utils/                      # Utilidades
│   │   │   ├── cn.ts                   # Logger y notificaciones
│   │   │   ├── dashboardCalculations.ts # Cálculos de KPIs
│   │   │   └── Validation.ts           # Utilidades de validación
│   │   │
│   │   └── types/                      # Tipos TypeScript
│   │       └── index.ts                 # Interfaces y tipos
│   │
│   ├── database/                       # Base de datos
│   │   ├── database.ts                 # DatabaseService (Singleton)
│   │   ├── database-monitor.ts         # Monitoreo de BD
│   │   ├── database-original.ts        # Versión original (backup)
│   │   ├── migrations.ts               # Migraciones de BD
│   │   └── retry-utils.ts              # Utilidades de reintento
│   │
│   └── __tests__/                      # Tests
│       ├── integration/                 # Tests de integración
│       ├── e2e/                        # Tests end-to-end
│       ├── database/                   # Tests de BD
│       ├── services/                   # Tests de servicios
│       ├── utils/                      # Tests de utilidades
│       ├── components/                 # Tests de componentes
│       ├── pages/                      # Tests de páginas
│       └── setup.ts                    # Configuración de tests
│
├── docs/                               # Documentación
│   ├── API_INTERNA.md                  # Documentación de API IPC
│   ├── ARQUITECTURA_TECNICA.md         # Arquitectura técnica
│   ├── GUIA_INSTALACION.md             # Guía de instalación
│   └── MANUAL_USUARIO.md               # Manual de usuario
│
├── assets/                              # Recursos
│   ├── icon.png                        # Icono de la aplicación
│   ├── icon.ico                        # Icono Windows
│   ├── logo-resortes.png              # Logo
│   └── logo.svg                        # Logo SVG
│
├── dist/                               # Build output
├── release/                            # Ejecutables generados
├── package.json                        # Dependencias y scripts
├── tsconfig.json                       # Configuración TypeScript
├── vite.config.ts                      # Configuración Vite
├── tailwind.config.js                  # Configuración Tailwind
├── jest.config.js                      # Configuración Jest
├── README.md                           # README básico
├── README_COMPLETO.md                  # Este documento
└── VULNERABILIDADES_SEGURIDAD.md       # Análisis de vulnerabilidades
```

---

## 🔄 FLUJOS DE TRABAJO COMPLETOS

### 1. Flujo: Crear Cliente con Vehículos

```
1. Usuario hace clic en "Nuevo Cliente"
   ↓
2. Se abre ClienteForm.tsx
   ↓
3. Usuario completa datos del cliente:
   - Nombre, RUT, Teléfono, Email, Dirección
   ↓
4. Usuario hace clic en "Siguiente"
   ↓
5. Usuario agrega vehículos (opcional):
   - Marca, Modelo, Año, Patente, Color
   ↓
6. Usuario hace clic en "Crear"
   ↓
7. React Hook Form valida datos localmente
   ↓
8. window.electronAPI.saveClienteConVehiculos(payload)
   ↓
9. Preload: ipcRenderer.invoke('save-cliente-con-vehiculos', payload)
   ↓
10. Main Process: ipcMain.handle('save-cliente-con-vehiculos')
    ↓
11. Validación Zod: SaveClienteConVehiculosSchema
    ↓
12. DatabaseService.saveClienteConVehiculos()
    ↓
13. BEGIN TRANSACTION
    ↓
14. INSERT INTO clientes (...)
    ↓
15. Para cada vehículo: INSERT INTO vehiculos (...)
    ↓
16. COMMIT TRANSACTION
    ↓
17. Retornar cliente creado con ID
    ↓
18. AppContext.addCliente(cliente)
    ↓
19. Actualizar UI: mostrar cliente en lista
    ↓
20. Mostrar notificación de éxito
```

### 2. Flujo: Crear Cotización

```
1. Usuario hace clic en "Nueva Cotización"
   ↓
2. Se abre CotizacionFormMejorado.tsx
   ↓
3. Paso 1: Seleccionar Cliente y Vehículo
   - Puede seleccionar existente o crear nuevo
   ↓
4. Paso 2: Descripción del Trabajo
   - Descripción y observaciones
   ↓
5. Paso 3: Agregar Servicios y Repuestos
   - Buscar en lista de servicios
   - Buscar repuestos con búsqueda FTS5
   - Agregar cantidad y precio
   ↓
6. Cálculo automático de totales
   ↓
7. Usuario hace clic en "Guardar"
   ↓
8. Validación local con React Hook Form
   ↓
9. NumberingService.generateCotizacionNumber()
   - Genera: "COT-{timestamp}-{random}"
   ↓
10. window.electronAPI.saveCotizacionConDetalles(payload)
    ↓
11. Main Process: Validación Zod
    ↓
12. DatabaseService.saveCotizacionConDetalles()
    ↓
13. BEGIN TRANSACTION
    ↓
14. Validar integridad referencial:
    - Cliente existe
    - Vehículo existe y pertenece al cliente
    ↓
15. INSERT INTO cotizaciones (...)
    ↓
16. DELETE FROM detalles_cotizacion WHERE cotizacionId = ?
    ↓
17. Para cada detalle: INSERT INTO detalles_cotizacion (...)
    ↓
18. COMMIT TRANSACTION
    ↓
19. Retornar cotización creada
    ↓
20. AppContext.addCotizacion(cotizacion)
    ↓
21. Actualizar UI
    ↓
22. Mostrar notificación de éxito
```

### 3. Flujo: Convertir Cotización a Orden de Trabajo

```
1. Usuario selecciona cotización en lista
   ↓
2. Hace clic en "Convertir a Orden"
   ↓
3. Se abre OrdenFormMejorado.tsx con datos prellenados
   ↓
4. Usuario ajusta datos si es necesario:
   - Fecha de ingreso
   - Prioridad
   - Técnico asignado
   ↓
5. Usuario hace clic en "Guardar"
   ↓
6. window.electronAPI.saveOrdenTrabajoConDetalles(payload)
   ↓
7. Main Process: Validación y guardado
   ↓
8. DatabaseService.saveOrdenTrabajoConDetalles()
   ↓
9. BEGIN TRANSACTION
   ↓
10. INSERT INTO ordenes_trabajo (...)
    ↓
11. INSERT INTO detalles_orden (copiados de cotización)
    ↓
12. UPDATE cotizaciones SET estado = 'convertida'
    ↓
13. COMMIT TRANSACTION
    ↓
14. Actualizar estado de cotización en UI
    ↓
15. Mostrar nueva orden en lista
```

### 4. Flujo: Finalizar Orden con Pago a Crédito

```
1. Usuario selecciona orden "En Proceso"
   ↓
2. Hace clic en "Finalizar Orden"
   ↓
3. Se abre FinalizarOrdenModal.tsx
   ↓
4. Usuario selecciona método de pago: "Crédito"
   ↓
5. Usuario ingresa número de cuotas (ej: 3)
   ↓
6. Sistema calcula monto por cuota automáticamente
   ↓
7. Usuario ajusta fechas de vencimiento si es necesario
   ↓
8. Usuario hace clic en "Finalizar"
   ↓
9. window.electronAPI.saveOrdenTrabajo(orden)
   ↓
10. window.electronAPI.saveCuotasPago(cuotas)
    ↓
11. Main Process: Guardado de orden y cuotas
    ↓
12. BEGIN TRANSACTION
    ↓
13. UPDATE ordenes_trabajo SET 
    - estado = 'completada'
    - metodoPago = 'Crédito'
    - numeroCuotas = 3
    ↓
14. Para cada cuota: INSERT INTO cuotas_pago (...)
    ↓
15. COMMIT TRANSACTION
    ↓
16. Actualizar estado de orden en UI
    ↓
17. Mostrar alerta de cuotas creadas
    ↓
18. Sistema programará alertas de vencimiento
```

### 5. Flujo: Búsqueda de Repuestos

```
1. Usuario escribe en campo de búsqueda (Inventario)
   ↓
2. useDeferredValue debounce (200ms)
   ↓
3. window.electronAPI.searchRepuestos(searchTerm)
   ↓
4. Main Process: DatabaseService.searchRepuestos()
   ↓
5. Intentar búsqueda FTS5:
   SELECT * FROM repuestos_fts 
   WHERE repuestos_fts MATCH ?
   ↓
6. Si FTS5 falla, usar LIKE:
   SELECT * FROM repuestos 
   WHERE nombre LIKE ? OR codigo LIKE ?
   ↓
7. Retornar resultados
   ↓
8. React resalta términos encontrados
   ↓
9. Mostrar resultados paginados
```

### 6. Flujo: Importar Inventario desde Excel

```
1. Usuario va a Inventario → Configuración
   ↓
2. Hace clic en "Importar desde Excel"
   ↓
3. window.electronAPI.procesarExcelRepuestos()
   ↓
4. Main Process: Abre diálogo de selección de archivo
   ↓
5. Usuario selecciona archivo .xlsx
   ↓
6. Validaciones de seguridad:
   - Tamaño máximo: 50 MB
   - Máximo 10 hojas
   - Máximo 10,000 filas
   - Máximo 100 columnas
   ↓
7. XLSX.readFile(filePath, { opciones de seguridad })
   ↓
8. Detectar formato (plantilla o inventario principal)
   ↓
9. Detectar headers automáticamente
   ↓
10. Procesar cada fila:
    - Sanitizar strings (prevenir Prototype Pollution)
    - Extraer: código, nombre, precio, stock, etc.
    ↓
11. DatabaseService.importarRepuestosDesdeJSON(repuestos)
    ↓
12. BEGIN TRANSACTION
    ↓
13. Para cada repuesto:
    - INSERT OR REPLACE INTO repuestos (...)
    - Actualizar FTS5
    ↓
14. COMMIT TRANSACTION
    ↓
15. Retornar cantidad importada
    ↓
16. Mostrar notificación de éxito
    ↓
17. Actualizar lista de repuestos
```

### 7. Flujo: Backup Automático

```
1. DatabaseService detecta que pasaron 24 horas desde último backup
   ↓
2. Verificar espacio en disco disponible
   ↓
3. Crear nombre único: backup-{timestamp}.db
   ↓
4. fs.copyFileSync(dbPath, backupPath)
   ↓
5. Eliminar backups antiguos (mantener solo últimos 5)
   ↓
6. Registrar en logs
   ↓
7. (Opcional) Notificar al usuario
```

---

## 💾 BASE DE DATOS

### SQLite Configuration

**Ubicación:** 
- Desarrollo: `data/resortes.db`
- Producción: `AppData/Roaming/ResortesPuertoMontt/data/resortes.db`

**Configuración PRAGMA:**
```sql
PRAGMA journal_mode = WAL;           -- Write-Ahead Logging
PRAGMA synchronous = NORMAL;          -- Balance seguridad/velocidad
PRAGMA cache_size = -64000;           -- 64 MB cache
PRAGMA temp_store = MEMORY;           -- Tablas temporales en memoria
PRAGMA mmap_size = 268435456;         -- 256 MB memory-mapped I/O
PRAGMA busy_timeout = 30000;          -- 30 segundos timeout
PRAGMA foreign_keys = ON;              -- Foreign keys habilitadas
```

### Esquema de Base de Datos

#### Tablas Principales

**clientes**
```sql
CREATE TABLE clientes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  rut TEXT UNIQUE NOT NULL,
  telefono TEXT NOT NULL,
  email TEXT,
  direccion TEXT,
  fechaRegistro TEXT,
  activo INTEGER DEFAULT 1
);
```

**vehiculos**
```sql
CREATE TABLE vehiculos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clienteId INTEGER NOT NULL,
  marca TEXT NOT NULL,
  modelo TEXT NOT NULL,
  año INTEGER NOT NULL,
  patente TEXT NOT NULL,
  color TEXT,
  kilometraje INTEGER,
  observaciones TEXT,
  activo INTEGER DEFAULT 1,
  FOREIGN KEY (clienteId) REFERENCES clientes(id) ON DELETE CASCADE
);
```

**cotizaciones**
```sql
CREATE TABLE cotizaciones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  numero TEXT UNIQUE NOT NULL,
  clienteId INTEGER NOT NULL,
  vehiculoId INTEGER NOT NULL,
  fecha TEXT NOT NULL,
  validaHasta TEXT,
  estado TEXT NOT NULL CHECK(estado IN ('pendiente', 'aprobada', 'rechazada', 'vencida', 'convertida')),
  descripcion TEXT NOT NULL,
  observaciones TEXT,
  total REAL NOT NULL,
  FOREIGN KEY (clienteId) REFERENCES clientes(id),
  FOREIGN KEY (vehiculoId) REFERENCES vehiculos(id)
);
```

**detalles_cotizacion**
```sql
CREATE TABLE detalles_cotizacion (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cotizacionId INTEGER NOT NULL,
  tipo TEXT NOT NULL CHECK(tipo IN ('servicio', 'repuesto')),
  servicioId INTEGER,
  repuestoId INTEGER,
  cantidad INTEGER NOT NULL,
  precio REAL NOT NULL,
  subtotal REAL NOT NULL,
  descripcion TEXT NOT NULL,
  FOREIGN KEY (cotizacionId) REFERENCES cotizaciones(id) ON DELETE CASCADE
);
```

**ordenes_trabajo**
```sql
CREATE TABLE ordenes_trabajo (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  numero TEXT UNIQUE NOT NULL,
  clienteId INTEGER NOT NULL,
  vehiculoId INTEGER NOT NULL,
  fechaIngreso TEXT NOT NULL,
  fechaEntrega TEXT,
  estado TEXT NOT NULL CHECK(estado IN ('pendiente', 'en_proceso', 'completada', 'cancelada')),
  descripcion TEXT NOT NULL,
  observaciones TEXT,
  total REAL NOT NULL,
  kilometrajeEntrada INTEGER,
  kilometrajeSalida INTEGER,
  prioridad TEXT CHECK(prioridad IN ('baja', 'media', 'alta', 'urgente')),
  tecnicoAsignado TEXT,
  metodoPago TEXT CHECK(metodoPago IN ('Efectivo', 'Débito', 'Crédito')),
  numeroCuotas INTEGER,
  fechaPago TEXT,
  FOREIGN KEY (clienteId) REFERENCES clientes(id),
  FOREIGN KEY (vehiculoId) REFERENCES vehiculos(id)
);
```

**detalles_orden**
```sql
CREATE TABLE detalles_orden (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ordenId INTEGER NOT NULL,
  tipo TEXT NOT NULL CHECK(tipo IN ('servicio', 'repuesto')),
  servicioId INTEGER,
  repuestoId INTEGER,
  cantidad INTEGER NOT NULL,
  precio REAL NOT NULL,
  subtotal REAL NOT NULL,
  descripcion TEXT NOT NULL,
  FOREIGN KEY (ordenId) REFERENCES ordenes_trabajo(id) ON DELETE CASCADE
);
```

**repuestos**
```sql
CREATE TABLE repuestos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  precio REAL NOT NULL,
  precioCosto REAL,
  stock INTEGER NOT NULL DEFAULT 0,
  stockMinimo INTEGER NOT NULL DEFAULT 0,
  categoria TEXT NOT NULL,
  marca TEXT,
  ubicacion TEXT,
  activo INTEGER DEFAULT 1
);
```

**servicios**
```sql
CREATE TABLE servicios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  precio REAL NOT NULL,
  duracionEstimada INTEGER NOT NULL,
  activo INTEGER DEFAULT 1
);
```

**cuotas_pago**
```sql
CREATE TABLE cuotas_pago (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ordenId INTEGER NOT NULL,
  numeroCuota INTEGER NOT NULL,
  fechaVencimiento TEXT NOT NULL,
  monto REAL NOT NULL,
  montoPagado REAL DEFAULT 0,
  fechaPago TEXT,
  estado TEXT NOT NULL CHECK(estado IN ('Pendiente', 'Pagada', 'Vencida')),
  observaciones TEXT,
  FOREIGN KEY (ordenId) REFERENCES ordenes_trabajo(id) ON DELETE CASCADE
);
```

**configuracion**
```sql
CREATE TABLE configuracion (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clave TEXT UNIQUE NOT NULL,
  valor TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK(tipo IN ('string', 'number', 'boolean', 'json'))
);
```

### Índices

```sql
-- Índices para búsqueda rápida
CREATE INDEX idx_clientes_rut ON clientes(rut);
CREATE INDEX idx_vehiculos_cliente ON vehiculos(clienteId);
CREATE INDEX idx_cotizaciones_estado ON cotizaciones(estado);
CREATE INDEX idx_ordenes_estado ON ordenes_trabajo(estado);
CREATE INDEX idx_repuestos_nombre ON repuestos(nombre);
CREATE INDEX idx_detalles_cotizacion_cotizacion ON detalles_cotizacion(cotizacionId);
CREATE INDEX idx_detalles_orden_orden ON detalles_orden(ordenId);
CREATE INDEX idx_cuotas_pago_orden ON cuotas_pago(ordenId);
CREATE INDEX idx_cuotas_pago_estado ON cuotas_pago(estado);
```

### FTS5 (Full-Text Search)

```sql
-- Tablas virtuales FTS5 para búsqueda full-text
CREATE VIRTUAL TABLE clientes_fts USING fts5(
  nombre, rut, telefono, email,
  content='clientes',
  content_rowid='id'
);

CREATE VIRTUAL TABLE repuestos_fts USING fts5(
  nombre, codigo, descripcion, categoria,
  content='repuestos',
  content_rowid='id'
);

-- Triggers para sincronizar FTS5
CREATE TRIGGER clientes_fts_insert AFTER INSERT ON clientes BEGIN
  INSERT INTO clientes_fts(rowid, nombre, rut, telefono, email)
  VALUES (new.id, new.nombre, new.rut, new.telefono, new.email);
END;

CREATE TRIGGER repuestos_fts_insert AFTER INSERT ON repuestos BEGIN
  INSERT INTO repuestos_fts(rowid, nombre, codigo, descripcion, categoria)
  VALUES (new.id, new.nombre, new.codigo, new.descripcion, new.categoria);
END;
```

### Transacciones

Todas las operaciones críticas usan transacciones:

```typescript
// Ejemplo: Guardar cotización con detalles
BEGIN TRANSACTION;
  INSERT INTO cotizaciones (...);
  DELETE FROM detalles_cotizacion WHERE cotizacionId = ?;
  INSERT INTO detalles_cotizacion (...);
COMMIT;
```

Si hay error, se hace `ROLLBACK` automáticamente.

---

## 🔌 API INTERNA (IPC)

### Handlers IPC Principales

Ver documentación completa en `docs/API_INTERNA.md`

#### Clientes

- `get-all-clientes` - Obtener todos los clientes
- `get-clientes-paginated` - Clientes paginados
- `search-clientes` - Búsqueda FTS5
- `save-cliente` - Guardar/actualizar cliente
- `save-cliente-con-vehiculos` - Guardar cliente con vehículos (transacción)
- `delete-cliente` - Eliminar cliente (cascading delete)

#### Cotizaciones

- `get-all-cotizaciones` - Obtener todas
- `get-cotizaciones-paginated` - Paginadas
- `save-cotizacion` - Guardar/actualizar
- `save-cotizacion-con-detalles` - Guardar con detalles (transacción)
- `get-detalles-cotizacion` - Obtener detalles
- `delete-cotizacion` - Eliminar

#### Órdenes de Trabajo

- `get-all-ordenes-trabajo` - Obtener todas
- `get-ordenes-trabajo-paginated` - Paginadas
- `save-orden-trabajo` - Guardar/actualizar
- `save-orden-trabajo-con-detalles` - Guardar con detalles (transacción)
- `get-detalles-orden` - Obtener detalles
- `delete-orden-trabajo` - Eliminar

#### Repuestos

- `get-all-repuestos` - Obtener todos
- `get-repuestos-paginated` - Paginados
- `search-repuestos` - Búsqueda FTS5
- `save-repuesto` - Guardar/actualizar
- `delete-repuesto` - Eliminar

#### Backups

- `create-backup` - Crear backup manual
- `get-backups` - Listar backups
- `restore-backup` - Restaurar backup
- `delete-backup` - Eliminar backup

### Validación de Entrada

Todos los handlers validan entrada con Zod:

```typescript
ipcMain.handle('save-cliente', async (event, cliente) => {
  try {
    // Validar entrada
    const clienteValidado = validateData(ClienteSchema, cliente);
    
    // Procesar
    const result = await dbService.saveCliente(clienteValidado);
    
    // Retornar
    return result;
  } catch (error) {
    persistentLogger.error('Error guardando cliente', error);
    throw error;
  }
});
```

---

## ⚠️ SISTEMA DE ERRORES

### Niveles de Manejo de Errores

#### 1. ErrorBoundary (React)

**Ubicación:** `src/renderer/components/ErrorBoundary.tsx`

Captura errores en componentes React:

```typescript
class ErrorBoundary extends Component {
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error capturado:', error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorUI />;
    }
    return this.props.children;
  }
}
```

**Uso:**
```tsx
<ErrorBoundary>
  <AppNew />
</ErrorBoundary>
```

#### 2. Manejo Global de Errores (Window)

**Ubicación:** `src/renderer/AppNew.tsx`

```typescript
// Errores de JavaScript
window.addEventListener('error', (event) => {
  Logger.error('Error global:', event.error);
  notify.error('Error inesperado', event.error.message);
  event.preventDefault(); // Prevenir crash
});

// Promise rejections no manejadas
window.addEventListener('unhandledrejection', (event) => {
  Logger.error('Promise rejection:', event.reason);
  notify.error('Error en operación asíncrona', event.reason.message);
  event.preventDefault();
});
```

#### 3. Manejo de Errores en IPC Handlers

**Patrón estándar:**

```typescript
ipcMain.handle('handler-name', async (event, data) => {
  try {
    // Validar
    const validated = validateData(Schema, data);
    
    // Procesar
    const result = await dbService.method(validated);
    
    // Log éxito
    persistentLogger.info('Operación exitosa');
    
    return result;
  } catch (error) {
    // Log error
    persistentLogger.error('Error en operación', error);
    
    // Retornar error descriptivo
    throw error;
  }
});
```

#### 4. Manejo de Errores en DatabaseService

**Retry con Backoff:**

```typescript
async saveCliente(cliente: Cliente): Promise<Cliente> {
  return retryWithBackoff(async () => {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          if (err.code === 'SQLITE_BUSY') {
            // Reintentar
            reject(err);
          } else {
            reject(err);
          }
        } else {
          resolve(result);
        }
      });
    });
  }, { maxRetries: 3 });
}
```

### Tipos de Errores

#### Errores de Validación

```typescript
Error: Validación fallida: nombre: El nombre es requerido
Error: Validación fallida: rut: El RUT debe tener formato válido
```

**Origen:** Schemas Zod en `validation-schemas.ts`

#### Errores de Integridad Referencial

```typescript
Error: Cliente con ID 999 no existe
Error: Vehículo con ID 123 no pertenece al cliente
```

**Origen:** Validaciones en DatabaseService antes de INSERT

#### Errores de Base de Datos

```typescript
Error: SQLITE_CONSTRAINT UNIQUE: duplicate key value
Error: SQLITE_BUSY: database is locked
```

**Origen:** SQLite constraints o locks

#### Errores de Sistema

```typescript
Error: Base de datos no inicializada
Error: electronAPI no está disponible
```

**Origen:** Estado de la aplicación

### Logging

**Sistema de Logs Persistentes:**

**Ubicación:** `src/main/logger-persistente.ts`

**Características:**
- Logs en archivos (producción)
- Logs en consola (desarrollo)
- Rotación automática (10 MB por archivo)
- Mantiene últimos 5 archivos
- Separación: `app-*.log` y `error-*.log`

**Ubicación de logs:**
- `AppData/Roaming/ResortesPuertoMontt/logs/`

**Niveles:**
- `info` - Información general
- `warn` - Advertencias
- `error` - Errores
- `debug` - Debug (solo desarrollo)

---

## 🔒 SEGURIDAD

### Medidas de Seguridad Implementadas

#### 1. Context Isolation

```typescript
webPreferences: {
  contextIsolation: true,  // ✅ Activado
  nodeIntegration: false,  // ✅ Desactivado
}
```

**Beneficio:** Previene acceso directo a Node.js desde el renderer.

#### 2. Preload Script

**Ubicación:** `src/main/preload.ts`

Expone solo API necesaria:

```typescript
contextBridge.exposeInMainWorld('electronAPI', {
  saveCliente: (cliente) => ipcRenderer.invoke('save-cliente', cliente),
  // Solo métodos específicos
});
```

#### 3. Validación de Entrada

Todos los handlers validan con Zod:

```typescript
const validated = validateData(ClienteSchema, cliente);
```

**Schemas disponibles:**
- `ClienteSchema`
- `VehiculoSchema`
- `CotizacionSchema`
- `OrdenTrabajoSchema`
- `RepuestoSchema`
- `ServicioSchema`

#### 4. Sanitización de Datos

**En importación Excel:**
```typescript
const sanitizeString = (value: any, maxLength: number = 500): string => {
  const str = String(value).trim();
  return str.replace(/[<>\"'`]/g, '').substring(0, maxLength);
};
```

**Previene:** Prototype Pollution, XSS

#### 5. Foreign Keys

```sql
PRAGMA foreign_keys = ON;
```

**Beneficio:** Integridad referencial garantizada.

#### 6. Transacciones Atómicas

Todas las operaciones críticas usan transacciones:

```typescript
BEGIN TRANSACTION;
  // Operaciones
COMMIT;
```

**Beneficio:** Rollback automático en caso de error.

### Vulnerabilidades Conocidas

Ver `VULNERABILIDADES_SEGURIDAD.md` para análisis completo.

**Resumen:**
- ✅ **xlsx (ALTA)** - Mitigaciones implementadas
- ⚠️ **electron (MODERADA)** - Planificar actualización
- ⚠️ **esbuild/vite (MODERADA)** - Solo afecta desarrollo

---

## 🚀 INSTALACIÓN Y DESARROLLO

### Requisitos

- **Node.js:** 18+ 
- **npm:** 9+
- **Sistema Operativo:** Windows 10+ (desarrollo), macOS también soportado

### Instalación

```bash
# Clonar repositorio
git clone <repo-url>
cd ResortesPuertoMontt

# Instalar dependencias
npm install

# Esto ejecutará automáticamente:
# - npm install (dependencias)
# - electron-builder install-app-deps (dependencias nativas)
```

### Scripts Disponibles

```bash
# Desarrollo
npm run dev              # Ejecutar en modo desarrollo
npm run dev:main         # Solo main process
npm run dev:renderer     # Solo renderer process (Vite en puerto 3000)

# Build
npm run build            # Compilar para producción
npm run build:main       # Compilar solo main process
npm run build:renderer   # Compilar solo renderer process

# Distribución
npm run dist             # Generar instalador .exe
npm run pack             # Empaquetar sin instalador

# Testing
npm test                 # Ejecutar todos los tests
npm run test:watch       # Tests en modo watch
npm run test:coverage    # Tests con cobertura
npm run test:load        # Tests de carga
npm run test:integrity   # Tests de integridad
```

### Estructura de Build

```
dist/
├── main/
│   ├── main.js          # Main process compilado
│   ├── preload.js       # Preload script compilado
│   └── ...
└── renderer/
    ├── index.html
    ├── assets/
    └── ...
```

### Configuración de Desarrollo

**Vite** (`vite.config.ts`):
- Puerto: 3000 (strictPort)
- Host: 0.0.0.0
- Base: './'

**TypeScript:**
- `tsconfig.json` - Configuración general
- `tsconfig.main.json` - Main process
- `tsconfig.node.json` - Node scripts

**Electron Builder:**
- Configuración en `package.json` → `build`
- Target: Windows NSIS installer
- Icon: `assets/icon.png`

---

## 🧪 TESTING

### Configuración

**Framework:** Jest 29.7.0  
**Configuración:** `jest.config.js`

**Características:**
- Environment: jsdom (para React)
- Transpilador: ts-jest
- Coverage: text, lcov, html

### Estructura de Tests

```
src/__tests__/
├── integration/          # Tests de integración
│   └── transacciones.test.ts
├── e2e/                  # Tests end-to-end
│   └── flujos-principales.test.ts
├── database/             # Tests de BD
│   ├── DatabaseService.test.ts
│   ├── database-integrity.test.ts
│   ├── load-test.test.ts
│   └── performance-benchmark.test.ts
├── services/             # Tests de servicios
│   ├── NumberingService.test.ts
│   └── EnvioDocumentosService.test.ts
├── utils/                # Tests de utilidades
│   ├── Validation.test.ts
│   └── Logger.test.ts
├── components/           # Tests de componentes
│   ├── ClienteForm.test.tsx
│   └── ...
├── pages/                # Tests de páginas
│   └── ...
└── setup.ts              # Configuración de tests
```

### Ejecutar Tests

```bash
# Todos los tests
npm test

# Tests específicos
npm test -- ClienteForm

# Con cobertura
npm run test:coverage

# Tests de carga
npm run test:load

# Tests de integridad
npm run test:integrity
```

### Cobertura de Tests

- ✅ Tests unitarios de validación
- ✅ Tests de integración (transacciones)
- ✅ Tests E2E (flujos principales)
- ✅ Tests de carga y rendimiento
- ✅ Tests de integridad de base de datos
- ✅ Tests de servicios
- ✅ Tests de utilidades

---

## 🔍 VULNERABILIDADES Y MITIGACIONES

Ver documento completo: `VULNERABILIDADES_SEGURIDAD.md`

### Resumen

**4 vulnerabilidades detectadas:**
- 1 ALTA (xlsx) - ✅ Mitigaciones implementadas
- 3 MODERADAS (electron, esbuild/vite)

**Riesgo Total:** 🟢 **BAJO**

**Justificación:**
- Aplicación de escritorio (no expuesta a internet)
- Archivos procesados localmente
- Mitigaciones implementadas para vulnerabilidad crítica
- Vulnerabilidades moderadas tienen bajo impacto

---

## ⚡ RENDIMIENTO Y OPTIMIZACIONES

### Optimizaciones Implementadas

#### 1. Memoización

```typescript
const clientesById = useMemo(() => {
  const map = new Map();
  clientes.forEach(c => map.set(c.id, c));
  return map;
}, [clientes]);
```

**Beneficio:** O(1) lookup en lugar de O(n) find

#### 2. Paginación

```typescript
const result = await dbService.getClientesPaginated({
  limit: 50,
  offset: 0
});
```

**Beneficio:** Carga inicial rápida (solo 50 registros)

#### 3. Caché LRU

```typescript
class QueryCache {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private maxAge = 30000; // 30 segundos
}
```

**Beneficio:** Queries frecuentes no tocan la BD

#### 4. FTS5 (Full-Text Search)

```sql
SELECT * FROM repuestos_fts WHERE repuestos_fts MATCH 'filtro aceite';
```

**Beneficio:** Búsqueda rápida incluso con miles de registros

#### 5. StartTransition

```typescript
onChange={(e) => {
  startTransition(() => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  });
}}
```

**Beneficio:** UI no bloqueante durante actualizaciones

#### 6. useDeferredValue

```typescript
const searchTerm = useState('');
const deferredSearch = useDeferredValue(searchTerm);
```

**Beneficio:** Búsqueda debounced automáticamente

#### 7. Índices de Base de Datos

```sql
CREATE INDEX idx_clientes_rut ON clientes(rut);
CREATE INDEX idx_repuestos_nombre ON repuestos(nombre);
```

**Beneficio:** Queries rápidas en tablas grandes

#### 8. WAL Mode

```sql
PRAGMA journal_mode = WAL;
```

**Beneficio:** Lecturas concurrentes sin bloqueos

### Métricas Objetivo

- **Tiempo de carga inicial:** < 2 segundos
- **Respuesta de formularios:** < 100ms
- **Búsqueda:** < 500ms (con FTS5)
- **Guardado de datos:** < 200ms (transacciones)

---

## 🔧 MANTENIMIENTO

### Mantenimiento Automático

**DatabaseService** ejecuta mantenimiento automático:

```typescript
// Cada 7 días
if (needsMaintenance()) {
  await performMaintenance();
  // VACUUM
  // ANALYZE
  // Actualizar estadísticas
}
```

### Backups Automáticos

**Frecuencia:** Cada 24 horas

**Ubicación:** `AppData/Roaming/ResortesPuertoMontt/data/backups/`

**Retención:** Últimos 5 backups

### Limpieza de Duplicados

**Función:** `limpiarDuplicadosClientes()`

**Uso:** Ejecutar manualmente desde Configuración

### Monitoreo de Base de Datos

**DatabaseMonitor:**
- Monitorea tamaño de BD
- Detecta fragmentación
- Sugiere mantenimiento

---

## 📝 NOTAS IMPORTANTES PARA ANALISTAS

### Puntos Clave del Sistema

1. **Arquitectura Multi-Proceso:** Main y Renderer separados, comunicación vía IPC
2. **Base de Datos SQLite:** Embebida, no requiere servidor
3. **Validación en Capas:** React Hook Form (frontend) + Zod (backend)
4. **Transacciones Atómicas:** Operaciones críticas usan transacciones
5. **Estado Global:** Context API para estado compartido
6. **Búsqueda Avanzada:** FTS5 para búsqueda full-text
7. **Seguridad:** Context isolation, validación de entrada, sanitización
8. **Rendimiento:** Paginación, caché, índices, memoización

### Áreas de Mejora Futura

1. ⏳ Actualizar Electron a versión 39.x (breaking change)
2. ⏳ Evaluar alternativas a xlsx (exceljs)
3. ⏳ Implementar autenticación de usuarios (si es necesario)
4. ⏳ Agregar más tests E2E
5. ⏳ Optimizar bundle size

### Contacto y Soporte

**Desarrollador:** Mathias Jara  
**Email:** mathias.jara@hotmail.com  
**Versión:** 1.1.2  
**Última actualización:** 2025-12-07

---

## 📚 DOCUMENTACIÓN ADICIONAL

- **API Interna:** `docs/API_INTERNA.md`
- **Arquitectura Técnica:** `docs/ARQUITECTURA_TECNICA.md`
- **Guía de Instalación:** `docs/GUIA_INSTALACION.md`
- **Manual de Usuario:** `docs/MANUAL_USUARIO.md`
- **Vulnerabilidades:** `VULNERABILIDADES_SEGURIDAD.md`

---

**Fin del Documento**

