# 🏗️ DOCUMENTACIÓN TÉCNICA DE ARQUITECTURA

**Sistema:** Resortes Puerto Montt v1.1.2  
**Fecha:** 2025-11-03  
**Versión:** 1.1.2

---

## 📋 TABLA DE CONTENIDOS

1. [Arquitectura General](#arquitectura-general)
2. [Stack Tecnológico](#stack-tecnológico)
3. [Estructura del Proyecto](#estructura-del-proyecto)
4. [Comunicación entre Procesos](#comunicación-entre-procesos)
5. [Base de Datos](#base-de-datos)
6. [Flujo de Datos](#flujo-de-datos)
7. [Patrones de Diseño](#patrones-de-diseño)
8. [Optimizaciones](#optimizaciones)
9. [Seguridad](#seguridad)

---

## 🎯 ARQUITECTURA GENERAL

### Arquitectura Electron

El sistema utiliza la arquitectura multi-proceso de Electron:

```
┌─────────────────────────────────────┐
│     Main Process (Node.js)          │
│  - Electron APIs                    │
│  - DatabaseService                  │
│  - IPC Handlers                     │
│  - File System Access               │
└──────────────┬──────────────────────┘
               │ IPC (contextBridge)
               ↓
┌─────────────────────────────────────┐
│     Preload Script                  │
│  - API Segura                       │
│  - contextBridge                    │
└──────────────┬──────────────────────┘
               │
               ↓
┌─────────────────────────────────────┐
│     Renderer Process (React)        │
│  - UI Components                    │
│  - React State                      │
│  - Context API                      │
│  - No Node.js Access                │
└─────────────────────────────────────┘
```

### Separación de Responsabilidades

#### Main Process
- ✅ Gestión de ventanas
- ✅ Comunicación IPC
- ✅ Acceso a base de datos
- ✅ Sistema de archivos
- ✅ Backups

#### Renderer Process
- ✅ Interfaz de usuario (React)
- ✅ Lógica de presentación
- ✅ Estado de componentes
- ✅ Validación de formularios

#### Preload Script
- ✅ Bridge seguro entre procesos
- ✅ Exposición de API limitada
- ✅ Sin acceso directo a Node.js

---

## 🛠️ STACK TECNOLÓGICO

### Frontend
- **React 18.3.1** - Biblioteca UI
- **TypeScript 5.7.2** - Tipado estático
- **Vite 5.4.20** - Build tool y dev server
- **Tailwind CSS 3.4.17** - Estilos
- **Radix UI** - Componentes accesibles
- **Lucide React** - Iconos
- **Sonner** - Notificaciones toast
- **Recharts** - Gráficos

### Backend (Electron Main)
- **Electron 33.2.1** - Framework de aplicación
- **Node.js** - Runtime
- **SQLite3 5.1.6** - Base de datos
- **TypeScript** - Tipado

### Herramientas
- **Jest 29.7.0** - Testing
- **ESLint** - Linting
- **Electron Builder 25.1.8** - Empaquetado

---

## 📁 ESTRUCTURA DEL PROYECTO

```
resortes-puerto-montt-2.0/
├── src/
│   ├── main/                    # Main Process
│   │   ├── main.ts              # Punto de entrada Electron
│   │   ├── preload.ts           # Script de preload
│   │   ├── validation-schemas.ts # Validación Zod
│   │   └── logger-persistente.ts # Sistema de logs
│   │
│   ├── renderer/                # Renderer Process (React)
│   │   ├── components/          # Componentes React
│   │   │   ├── CotizacionFormMejorado.tsx
│   │   │   ├── OrdenFormMejorado.tsx
│   │   │   ├── ClienteForm.tsx
│   │   │   └── ...
│   │   ├── pages/               # Páginas principales
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Clientes.tsx
│   │   │   ├── Cotizaciones.tsx
│   │   │   ├── Ordenes.tsx
│   │   │   ├── Inventario.tsx
│   │   │   └── Configuracion.tsx
│   │   ├── contexts/           # Context API
│   │   │   └── AppContext.tsx   # Estado global
│   │   ├── services/            # Servicios
│   │   │   ├── NumberingService.ts
│   │   │   └── EnvioDocumentosService.ts
│   │   ├── utils/               # Utilidades
│   │   │   └── cn.ts            # Logger, notificaciones
│   │   └── types/               # Tipos TypeScript
│   │       └── index.ts
│   │
│   ├── database/                # Base de datos
│   │   └── database.ts           # DatabaseService
│   │
│   └── __tests__/                # Tests
│       ├── integration/         # Tests de integración
│       ├── e2e/                 # Tests E2E
│       ├── database/            # Tests de BD
│       ├── services/            # Tests de servicios
│       └── utils/               # Tests de utilidades
│
├── docs/                         # Documentación
│   ├── API_INTERNA.md
│   ├── MANUAL_USUARIO.md
│   ├── ARQUITECTURA_TECNICA.md
│   └── GUIA_INSTALACION.md
│
├── dist/                         # Build output
├── release/                      # Ejecutables
└── package.json
```

---

## 🔌 COMUNICACIÓN ENTRE PROCESOS

### IPC (Inter-Process Communication)

#### Flujo de Datos

```
Renderer Process
    ↓ window.electronAPI.saveCliente(data)
Preload Script
    ↓ ipcRenderer.invoke('save-cliente', data)
Main Process
    ↓ validateData(ClienteSchema, data)
    ↓ dbService.saveCliente(validatedData)
SQLite Database
    ↓ resultado
Main Process
    ↓ return resultado
Preload Script
    ↓ Promise resolve
Renderer Process
    ↓ resultado disponible
```

### Handlers IPC

Todos los handlers siguen el patrón:

```typescript
ipcMain.handle('handler-name', async (event, data) => {
  try {
    // 1. Validar entrada
    const validated = validateData(Schema, data);
    
    // 2. Procesar
    const result = await dbService.method(validated);
    
    // 3. Log
    persistentLogger.info('Operación exitosa');
    
    // 4. Retornar
    return result;
  } catch (error) {
    persistentLogger.error('Error en operación', error);
    throw error;
  }
});
```

### Validación

Todos los handlers de guardado validan entrada con Zod:
- ✅ Tipos correctos
- ✅ Campos requeridos
- ✅ Rangos válidos
- ✅ Formatos correctos

---

## 💾 BASE DE DATOS

### SQLite

**Ubicación:** `AppData/Roaming/ResortesPuertoMontt/data/resortes.db`

### Configuración

```typescript
PRAGMA journal_mode = WAL;           // Write-Ahead Logging
PRAGMA synchronous = NORMAL;         // Balance entre seguridad y velocidad
PRAGMA cache_size = -64000;          // 64 MB cache
PRAGMA temp_store = MEMORY;          // Tablas temporales en memoria
PRAGMA mmap_size = 268435456;        // 256 MB memory-mapped I/O
PRAGMA busy_timeout = 30000;         // 30 segundos timeout
PRAGMA foreign_keys = ON;            // Foreign keys habilitadas
```

### Estructura

#### Tablas Principales

```sql
-- Clientes
CREATE TABLE clientes (
  id INTEGER PRIMARY KEY,
  nombre TEXT NOT NULL,
  rut TEXT UNIQUE NOT NULL,
  telefono TEXT NOT NULL,
  email TEXT,
  direccion TEXT,
  fechaRegistro TEXT,
  activo INTEGER DEFAULT 1
);

-- Vehículos
CREATE TABLE vehiculos (
  id INTEGER PRIMARY KEY,
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

-- Cotizaciones
CREATE TABLE cotizaciones (
  id INTEGER PRIMARY KEY,
  numero TEXT UNIQUE NOT NULL,
  clienteId INTEGER NOT NULL,
  vehiculoId INTEGER NOT NULL,
  fecha TEXT NOT NULL,
  validaHasta TEXT,
  estado TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  observaciones TEXT,
  total REAL NOT NULL,
  FOREIGN KEY (clienteId) REFERENCES clientes(id),
  FOREIGN KEY (vehiculoId) REFERENCES vehiculos(id)
);

-- Detalles de Cotización
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

-- Órdenes de Trabajo
CREATE TABLE ordenes_trabajo (
  id INTEGER PRIMARY KEY,
  numero TEXT UNIQUE NOT NULL,
  clienteId INTEGER NOT NULL,
  vehiculoId INTEGER NOT NULL,
  fechaIngreso TEXT NOT NULL,
  fechaEntrega TEXT,
  estado TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  observaciones TEXT,
  total REAL NOT NULL,
  kilometrajeEntrada INTEGER,
  kilometrajeSalida INTEGER,
  prioridad TEXT,
  tecnicoAsignado TEXT,
  FOREIGN KEY (clienteId) REFERENCES clientes(id),
  FOREIGN KEY (vehiculoId) REFERENCES vehiculos(id)
);

-- Detalles de Orden
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

-- Repuestos
CREATE TABLE repuestos (
  id INTEGER PRIMARY KEY,
  codigo TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  precio REAL NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  stockMinimo INTEGER NOT NULL DEFAULT 0,
  categoria TEXT NOT NULL,
  marca TEXT,
  ubicacion TEXT,
  activo INTEGER DEFAULT 1
);

-- Servicios
CREATE TABLE servicios (
  id INTEGER PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  precio REAL NOT NULL,
  duracionEstimada INTEGER NOT NULL,
  activo INTEGER DEFAULT 1
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

---

## 🔄 FLUJO DE DATOS

### Crear Cotización

```
1. Usuario completa formulario (React)
   ↓
2. handleSave() valida datos
   ↓
3. window.electronAPI.saveCotizacionConDetalles()
   ↓
4. IPC: save-cotizacion-con-detalles
   ↓
5. Validación Zod (validation-schemas.ts)
   ↓
6. DatabaseService.saveCotizacionConDetalles()
   ↓
7. BEGIN TRANSACTION
   ↓
8. Validar integridad referencial
   ↓
9. INSERT cotización
   ↓
10. DELETE detalles antiguos
   ↓
11. INSERT detalles nuevos
   ↓
12. COMMIT TRANSACTION
   ↓
13. Retornar resultado
   ↓
14. React actualiza UI
   ↓
15. Mostrar notificación de éxito
```

### Búsqueda en Inventario

```
1. Usuario escribe en búsqueda (React)
   ↓
2. useDeferredValue debounce (200ms)
   ↓
3. window.electronAPI.searchRepuestos(term)
   ↓
4. IPC: search-repuestos
   ↓
5. DatabaseService.searchRepuestos()
   ↓
6. FTS5 query o LIKE fallback
   ↓
7. Retornar resultados
   ↓
8. React resalta términos encontrados
   ↓
9. Mostrar resultados paginados
```

---

## 🎨 PATRONES DE DISEÑO

### 1. Singleton (DatabaseService)

```typescript
class DatabaseService {
  private static instance: DatabaseService;
  
  static async create(): Promise<DatabaseService> {
    // Factory method asíncrono
  }
}
```

**Uso:** Una sola instancia de base de datos en toda la aplicación.

---

### 2. Repository Pattern (Implícito)

```typescript
// DatabaseService actúa como repository
class DatabaseService {
  async saveCliente(cliente: Cliente): Promise<Cliente> { }
  async getAllClientes(): Promise<Cliente[]> { }
  async deleteCliente(id: number): Promise<void> { }
}
```

**Beneficio:** Abstracción de acceso a datos.

---

### 3. Factory Pattern

```typescript
// DatabaseService.create() - Factory method
static async create(): Promise<DatabaseService> {
  const instance = new DatabaseService();
  await instance.initializeDatabaseAsync();
  return instance;
}
```

---

### 4. Context Pattern (React)

```typescript
// AppContext.tsx - Estado global
const AppContext = createContext<AppContextType>(...);

export function useApp() {
  return useContext(AppContext);
}
```

**Uso:** Estado compartido entre componentes.

---

### 5. Observer Pattern

```typescript
// IPC handlers observan eventos
ipcMain.handle('save-cliente', async (event, cliente) => {
  // Procesa evento
});
```

---

## ⚡ OPTIMIZACIONES

### 1. Memoización

```typescript
// useMemo para cálculos pesados
const clientesById = useMemo(() => {
  const map = new Map();
  clientes.forEach(c => map.set(c.id, c));
  return map;
}, [clientes]);

// O(1) lookup en lugar de O(n) find
const cliente = clientesById.get(id);
```

---

### 2. Lazy Loading

```typescript
// Carga diferida de datos pesados
useEffect(() => {
  const timer = setTimeout(() => {
    loadRepuestos();
  }, 500);
  return () => clearTimeout(timer);
}, []);
```

---

### 3. Paginación

```typescript
// Carga paginada en lugar de todo
const result = await dbService.getClientesPaginated({
  limit: 50,
  offset: 0
});
```

---

### 4. Caché de Queries

```typescript
// LRU Cache con TTL
class QueryCache {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private maxAge = 30000; // 30 segundos
}
```

---

### 5. StartTransition

```typescript
// UI no bloqueante
onChange={(e) => {
  startTransition(() => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  });
}}
```

---

### 6. useDeferredValue

```typescript
// Búsqueda debounced
const searchTerm = useState('');
const deferredSearch = useDeferredValue(searchTerm);
// deferredSearch se actualiza después de que searchTerm se estabiliza
```

---

## 🔒 SEGURIDAD

### Electron Security Best Practices

#### 1. Context Isolation
```typescript
webPreferences: {
  contextIsolation: true,  // ✅ Activado
  nodeIntegration: false,  // ✅ Desactivado
}
```

**Beneficio:** Previene acceso directo a Node.js desde el renderer.

---

#### 2. Preload Script
```typescript
// Exposición limitada de API
contextBridge.exposeInMainWorld('electronAPI', {
  saveCliente: (cliente) => ipcRenderer.invoke('save-cliente', cliente),
  // Solo métodos específicos
});
```

**Beneficio:** API controlada y limitada.

---

#### 3. Validación de Entrada

Todos los handlers validan entrada con Zod:
```typescript
const clienteValidado = validateData(ClienteSchema, cliente);
// Lanza error si datos son inválidos
```

**Beneficio:** Previene inyección de datos malformados.

---

#### 4. Sanitización

Los schemas Zod sanitizan datos:
```typescript
.transform((data) => ({
  ...data,
  descripcion: data.descripcion || '', // String vacío en lugar de undefined
}))
```

---

### Manejo de Errores

#### ErrorBoundary (React)
```typescript
class ErrorBoundary extends Component {
  componentDidCatch(error, errorInfo) {
    // Log error
    // Mostrar UI de error
  }
}
```

#### Global Error Handlers
```typescript
window.addEventListener('error', (event) => {
  persistentLogger.error('Error global', event.error);
  // Prevenir crash
});
```

---

## 📊 RENDIMIENTO

### Métricas Objetivo

- **Tiempo de carga inicial:** < 2 segundos
- **Respuesta de formularios:** < 100ms
- **Búsqueda:** < 500ms (con FTS5)
- **Guardado de datos:** < 200ms (transacciones)

### Optimizaciones Aplicadas

1. ✅ **Memoización** de cálculos pesados
2. ✅ **Paginación** en listados grandes
3. ✅ **Caché LRU** para queries frecuentes
4. ✅ **FTS5** para búsqueda rápida
5. ✅ **StartTransition** para UI no bloqueante
6. ✅ **Lazy loading** de datos pesados
7. ✅ **Índices de BD** para queries rápidas

---

## 🧪 TESTING

### Estructura de Tests

```
__tests__/
├── integration/          # Tests de integración
│   └── transacciones.test.ts
├── e2e/                 # Tests E2E
│   └── flujos-principales.test.ts
├── database/            # Tests de BD
│   └── DatabaseService.test.ts
├── services/            # Tests de servicios
│   ├── NumberingService.test.ts
│   └── EnvioDocumentosService.test.ts
├── utils/              # Tests de utilidades
│   ├── Validation.test.ts
│   └── Logger.test.ts
└── main/               # Tests de validación
    └── validation-schemas.test.ts
```

### Ejecutar Tests

```bash
# Todos los tests
npm test

# Tests específicos
npm test -- validation-schemas

# Con cobertura
npm run test:coverage
```

---

## 📝 LOGGING

### Sistema de Logs

#### Desarrollo
- Logs en consola
- Logger condicional (`isDev`)

#### Producción
- Logs persistentes en archivos
- Ubicación: `AppData/Roaming/ResortesPuertoMontt/logs/`
- Rotación automática (10 MB por archivo)
- Mantiene últimos 5 archivos

#### Archivos de Log

- `app-YYYY-MM-DD.log` - Logs generales
- `error-YYYY-MM-DD.log` - Solo errores

---

## 🔄 CICLO DE VIDA

### Inicialización

```
1. app.whenReady()
   ↓
2. DatabaseService.create()
   ↓
3. Inicializar base de datos
   ↓
4. Crear índices
   ↓
5. Crear tablas FTS5
   ↓
6. Crear ventana principal
   ↓
7. Cargar datos críticos (clientes, vehículos)
   ↓
8. Mostrar Dashboard
   ↓
9. Cargar datos restantes en background
```

### Cierre

```
1. Usuario cierra ventana
   ↓
2. app.on('window-all-closed')
   ↓
3. Cerrar conexión de BD
   ↓
4. Guardar logs finales
   ↓
5. app.quit()
```

---

## 📦 EMPAQUETADO

### Electron Builder

**Configuración:** `package.json` → `build`

**Targets:**
- Windows: NSIS installer
- Custom uninstaller script

**Características:**
- Instalación para todos los usuarios
- Accesos directos en escritorio y menú inicio
- Opción de conservar/eliminar datos al desinstalar

---

## 🚀 DESPLIEGUE

### Proceso de Build

```bash
# Desarrollo
npm run dev

# Build de producción
npm run build

# Generar instalador
npm run dist
```

### Output

- `release/Resortes Puerto Montt Setup 1.1.2.exe` - Instalador
- `release/win-unpacked/` - Aplicación sin empaquetar

---

**Última actualización:** 2025-11-03  
**Versión:** 1.1.2

