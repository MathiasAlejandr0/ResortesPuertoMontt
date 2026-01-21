# 🚗 Resortes Puerto Montt - Sistema de Gestión Integral

**Versión:** 1.1.2  
**Fecha de Documentación:** 8 de enero de 2025  
**Autor:** Mathias Jara  
**Email:** mathias.jara@hotmail.com  
**Licencia:** MIT

---

## 📋 TABLA DE CONTENIDOS

1. [Descripción General](#descripción-general)
2. [Tecnologías Utilizadas](#tecnologías-utilizadas)
3. [Arquitectura del Sistema](#arquitectura-del-sistema)
4. [Estructura del Proyecto](#estructura-del-proyecto)
5. [Instalación y Configuración](#instalación-y-configuración)
6. [Seguridad Implementada](#seguridad-implementada)
7. [Base de Datos](#base-de-datos)
8. [Flujos de Trabajo Completos](#flujos-de-trabajo-completos)
9. [API Interna (IPC)](#api-interna-ipc)
10. [Testing](#testing)
11. [Rendimiento y Optimizaciones](#rendimiento-y-optimizaciones)
12. [Características Avanzadas](#características-avanzadas)
13. [Documentación Adicional](#documentación-adicional)

---

## 🎯 DESCRIPCIÓN GENERAL

### ¿Qué es Resortes Puerto Montt?

**Resortes Puerto Montt** es una aplicación de escritorio multiplataforma desarrollada con **Electron** que proporciona un sistema de gestión integral para talleres mecánicos. Permite gestionar de forma completa clientes, vehículos, cotizaciones, órdenes de trabajo, inventario de repuestos, servicios, sistema de pagos a crédito y procesamiento inteligente de facturas.

### Características Principales

#### Gestión de Clientes y Vehículos
- ✅ Crear, editar y eliminar clientes con validación de RUT chileno
- ✅ Gestión de múltiples vehículos por cliente
- ✅ Historial completo de órdenes y cotizaciones por cliente
- ✅ Búsqueda avanzada con resaltado de resultados
- ✅ Validación automática de RUT chileno

#### Sistema de Cotizaciones
- ✅ Creación de cotizaciones profesionales con múltiples estados
- ✅ Estados: Pendiente, Aprobada, Rechazada, Vencida, Convertida
- ✅ Conversión automática de cotizaciones a órdenes de trabajo
- ✅ Exportación de documentos PDF (versión cliente e interna)
- ✅ Envío de documentos por WhatsApp
- ✅ Uso automático de datos del taller desde configuración
- ✅ Formato profesional con RUT, dirección, teléfono, email

#### Órdenes de Trabajo
- ✅ Creación desde cotizaciones o desde cero
- ✅ Estados: En Proceso, Completada, Cancelada
- ✅ Finalización con método de pago (Efectivo, Débito, Crédito)
- ✅ Gestión de cuotas para pagos a crédito
- ✅ Seguimiento de repuestos y servicios utilizados
- ✅ Prioridades y asignación de técnicos
- ✅ Exportación de documentos PDF profesionales

#### Control de Inventario
- ✅ Gestión completa de repuestos con códigos únicos
- ✅ Control de stock con alertas de stock mínimo
- ✅ Precio de costo y precio de venta
- ✅ Importación masiva desde archivos Excel (validación segura)
- ✅ Búsqueda avanzada con FTS5 (Full-Text Search)
- ✅ Categorización y ubicación física
- ✅ **Motor Híbrido de Procesamiento de Facturas**:
  - Procesamiento de PDFs digitales (extracción directa de texto)
  - Procesamiento de imágenes con OCR (Tesseract.js)
  - Auto-rotación de imágenes
  - Eliminación de timbres mediante binarización
  - Extracción automática de items de facturas chilenas

#### Sistema de Pagos
- ✅ Gestión de cuotas de pago a crédito
- ✅ Alertas automáticas de pagos vencidos
- ✅ Confirmación de pagos con fecha y monto
- ✅ Cálculo automático de ingresos en KPIs

#### Dashboard y KPIs
- ✅ Ingresos del mes actual y anterior
- ✅ Total de órdenes y órdenes en proceso
- ✅ Total de clientes y vehículos
- ✅ Valor total de inventario (costo y venta)
- ✅ Órdenes recientes con detalles
- ✅ Gráficos y visualizaciones interactivas

#### Ventas Rápidas
- ✅ Venta de repuestos sin orden de trabajo completa
- ✅ Datos de cliente opcionales
- ✅ Código VT- para distinguir de órdenes (OT-)

#### Configuración del Negocio
- ✅ Gestión de información del taller (nombre, RUT, dirección, teléfono, email, sitio web)
- ✅ Persistencia en base de datos
- ✅ Uso automático en cotizaciones y órdenes de trabajo
- ✅ Mensajes predefinidos para WhatsApp

#### Seguridad y Cumplimiento
- ✅ **Encriptación AES-256-CBC** de base de datos (SQLCipher)
- ✅ **Migración automática** de bases de datos legacy sin encriptar
- ✅ **Validación segura de archivos** Excel (Magic Numbers + Streams)
- ✅ **PII Redaction** en logs (RUTs, emails, teléfonos, contraseñas)
- ✅ Cumplimiento OWASP, GDPR, ISO 27001

---

## 🛠️ TECNOLOGÍAS UTILIZADAS

### Frontend (Renderer Process)

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **React** | 18.3.1 | Biblioteca UI declarativa |
| **TypeScript** | 5.7.2 | Tipado estático |
| **Vite** | 5.4.20 | Build tool y dev server |
| **Tailwind CSS** | 3.4.17 | Framework CSS utility-first |
| **Radix UI** | Latest | Componentes accesibles sin estilos |
| **Lucide React** | 0.462.0 | Iconos modernos |
| **Sonner** | 1.7.4 | Notificaciones toast |
| **Recharts** | 2.15.4 | Gráficos y visualizaciones |
| **React Hook Form** | 7.61.1 | Gestión de formularios |
| **Zod** | 3.25.76 | Validación de esquemas |
| **TanStack Query** | 5.83.0 | Gestión de estado del servidor |
| **React Router** | 6.30.1 | Enrutamiento |
| **date-fns** | 3.6.0 | Manipulación de fechas |

### Backend (Main Process)

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **Electron** | 33.2.1 | Framework de aplicación de escritorio |
| **Node.js** | 18+ | Runtime de JavaScript |
| **@journeyapps/sqlcipher** | 5.3.1 | Base de datos encriptada (AES-256-CBC) |
| **TypeScript** | 5.7.2 | Tipado estático |
| **ExcelJS** | 4.4.0 | Procesamiento seguro de archivos Excel |
| **Zod** | 3.25.76 | Validación de datos |
| **pdf-parse** | 2.4.5 | Extracción de texto de PDFs digitales |
| **tesseract.js** | 5.1.1 | Motor OCR para procesamiento de imágenes |
| **sharp** | 0.33.5 | Procesamiento de imágenes (rotación, binarización) |
| **string-similarity** | 4.0.4 | Coincidencia difusa de strings |

### Herramientas de Desarrollo

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **Jest** | 29.7.0 | Framework de testing |
| **Testing Library** | Latest | Testing de componentes React |
| **ESLint** | 9.17.0 | Linting de código |
| **Electron Builder** | 25.1.8 | Empaquetado y distribución |
| **Concurrently** | 9.1.0 | Ejecución paralela de procesos |

### Características de Seguridad

- ✅ **SQLCipher**: Encriptación AES-256-CBC de base de datos
- ✅ **ExcelJS**: Procesamiento seguro de archivos Excel
- ✅ **Magic Numbers**: Validación de tipo de archivo
- ✅ **Stream-based Reading**: Prevención de DoS
- ✅ **PII Redaction**: Sanitización de logs
- ✅ **Context Isolation**: Aislamiento de contexto en Electron
- ✅ **Node Integration**: Desactivado en renderer

---

## 🏗️ ARQUITECTURA DEL SISTEMA

### Arquitectura Electron Multi-Proceso

```
┌─────────────────────────────────────────────────────────┐
│              Main Process (Node.js)                      │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Electron APIs                                    │   │
│  │  - Window Management                              │   │
│  │  - File System Access                             │   │
│  │  - Native Modules                                 │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  DatabaseService (Singleton)                      │   │
│  │  - SQLCipher (AES-256-CBC)                        │   │
│  │  - Migración Automática Legacy                    │   │
│  │  - Backups Automáticos                            │   │
│  │  - Mantenimiento Periódico                        │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  IPC Handlers                                      │   │
│  │  - Validación con Zod                            │   │
│  │  - Manejo de Errores                              │   │
│  │  - Transacciones Atómicas                         │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Services                                         │   │
│  │  - EncryptionKeyService                           │   │
│  │  - ExcelImportService                             │   │
│  │  - InvoiceParserService (PDF + OCR)              │   │
│  │  - Logger (PII Redaction)                         │   │
│  └──────────────────────────────────────────────────┘   │
└───────────────────────┬───────────────────────────────────┘
                        │ IPC (contextBridge)
                        ↓
┌─────────────────────────────────────────────────────────┐
│              Preload Script                             │
│  ┌──────────────────────────────────────────────────┐   │
│  │  contextBridge.exposeInMainWorld                  │   │
│  │  - API Segura y Limitada                          │   │
│  │  - Sin Acceso Directo a Node.js                   │   │
│  └──────────────────────────────────────────────────┘   │
└───────────────────────┬───────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────┐
│         Renderer Process (React)                        │
│  ┌──────────────────────────────────────────────────┐   │
│  │  React Components                                 │   │
│  │  - Pages (Dashboard, Clientes, etc.)             │   │
│  │  - Forms (ClienteForm, CotizacionForm, etc.)     │   │
│  │  - Modals (VerCotizacion, EditarOrden, etc.)     │   │
│  │  - UI Components (Radix UI)                       │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Context API                                      │   │
│  │  - AppContext (Estado Global)                     │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Hooks                                            │   │
│  │  - useNegocioInfo (Configuración del negocio)    │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Services                                         │   │
│  │  - NumberingService                               │   │
│  │  - EnvioDocumentosService                        │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Utils                                            │   │
│  │  - dashboardCalculations                          │   │
│  │  - Validation                                     │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Separación de Responsabilidades

#### Main Process
- ✅ Gestión de ventanas de Electron
- ✅ Comunicación IPC con renderer
- ✅ Acceso a base de datos encriptada (SQLCipher)
- ✅ Sistema de archivos (importación/exportación)
- ✅ Backups automáticos
- ✅ Mantenimiento de base de datos
- ✅ Validación de entrada con Zod
- ✅ Logging con PII Redaction
- ✅ Procesamiento de facturas (PDF + OCR)

#### Renderer Process
- ✅ Interfaz de usuario (React)
- ✅ Lógica de presentación
- ✅ Estado de componentes (React State)
- ✅ Validación de formularios (React Hook Form + Zod)
- ✅ Sin acceso directo a Node.js (seguridad)
- ✅ Hooks personalizados (useNegocioInfo)

#### Preload Script
- ✅ Bridge seguro entre procesos
- ✅ Exposición de API limitada
- ✅ Context isolation activado
- ✅ Node integration desactivado

### Patrones de Diseño Implementados

1. **Singleton Pattern**: `DatabaseService` - Una sola instancia de base de datos
2. **Factory Pattern**: `DatabaseService.create()` - Creación asíncrona con inicialización
3. **Repository Pattern**: Métodos del `DatabaseService` encapsulan acceso a datos
4. **Observer Pattern**: React Context API para estado global
5. **Strategy Pattern**: Validación con Zod - Diferentes schemas para diferentes entidades
6. **Retry Pattern**: `retryWithBackoff` para operaciones críticas
7. **Hook Pattern**: `useNegocioInfo` para acceso a configuración

---

## 📁 ESTRUCTURA DEL PROYECTO

```
ResortesPuertoMontt/
├── src/
│   ├── main/                          # Main Process (Electron)
│   │   ├── main.ts                    # Punto de entrada Electron
│   │   ├── preload.ts                 # Preload script (contextBridge)
│   │   ├── validation-schemas.ts       # Schemas Zod para validación IPC
│   │   ├── logger-persistente.ts       # Sistema de logs con PII Redaction
│   │   └── services/                  # Servicios del main process
│   │       ├── EncryptionKeyService.ts # Gestión de claves de encriptación
│   │       ├── ExcelImportService.ts   # Importación segura de Excel
│   │       └── InvoiceParserService.ts # Motor híbrido PDF + OCR
│   │
│   ├── renderer/                       # Renderer Process (React)
│   │   ├── main.tsx                    # Punto de entrada React
│   │   ├── AppNew.tsx                  # Componente raíz
│   │   ├── index.css                   # Estilos globales
│   │   │
│   │   ├── components/                 # Componentes React
│   │   │   ├── ClienteForm.tsx         # Formulario de cliente
│   │   │   ├── CotizacionFormMejorado.tsx
│   │   │   ├── CotizacionPDF.tsx       # Generación de PDFs de cotización
│   │   │   ├── OrdenFormMejorado.tsx
│   │   │   ├── OrdenCliente.tsx        # Generación de PDFs de orden
│   │   │   ├── InvoiceReviewModal.tsx  # Modal de revisión de facturas
│   │   │   ├── OCRModal.tsx            # Modal de selección de archivo
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
│   │   ├── hooks/                      # Hooks personalizados
│   │   │   └── useNegocioInfo.ts       # Hook para información del negocio
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
│   │   │                                # - SQLCipher (AES-256-CBC)
│   │   │                                # - Migración Automática Legacy
│   │   │                                # - Backups Automáticos
│   │   ├── database-monitor.ts         # Monitoreo de BD
│   │   ├── database-original.ts        # Versión original (backup)
│   │   ├── migrations.ts               # Migraciones de BD
│   │   └── retry-utils.ts              # Utilidades de reintento
│   │
│   └── __tests__/                      # Tests
│       ├── integration/                 # Tests de integración
│       ├── e2e/                        # Tests end-to-end
│       ├── database/                    # Tests de base de datos
│       ├── components/                  # Tests de componentes
│       ├── pages/                       # Tests de páginas
│       ├── services/                    # Tests de servicios
│       └── utils/                        # Tests de utilidades
│
├── assets/                             # Recursos estáticos
│   ├── icon.png                        # Icono de la aplicación
│   ├── icon.ico                        # Icono Windows
│   ├── logo-resortes.png               # Logo del taller
│   └── logo.svg                        # Logo SVG
│
├── docs/                               # Documentación
│   ├── API_INTERNA.md                  # Documentación de API IPC
│   ├── ARQUITECTURA_TECNICA.md          # Arquitectura técnica
│   ├── GUIA_INSTALACION.md              # Guía de instalación
│   └── MANUAL_USUARIO.md               # Manual de usuario
│
├── dist/                               # Archivos compilados
├── release/                            # Ejecutables generados
│
├── package.json                        # Configuración del proyecto
├── tsconfig.json                       # Configuración TypeScript
├── tsconfig.main.json                  # TypeScript para main process
├── tsconfig.node.json                  # TypeScript para Node
├── vite.config.ts                      # Configuración Vite
├── tailwind.config.js                  # Configuración Tailwind
├── jest.config.js                      # Configuración Jest
│
├── README.md                           # Este archivo
├── MIGRACION_COMPLETADA.md              # Estado de migración de seguridad
├── MIGRACION_SEGURIDAD_COMPLETA.md     # Guía completa de migración
├── RESUMEN_MIGRACION_SEGURIDAD.md     # Resumen de migración
├── INVOICE_PARSER_HYBRID.md            # Documentación del motor de facturas
└── FIX_DATABASE_ERRORS.md              # Guía de solución de errores de BD
```

---

## 🚀 INSTALACIÓN Y CONFIGURACIÓN

### Requisitos del Sistema (Producción)

- **Sistema Operativo**: Windows 10 (64-bit) o superior, macOS 10.15+, Linux
- **RAM**: 4 GB mínimo (8 GB recomendado)
- **Espacio en Disco**: 600 MB
- **Procesador**: 64 bits

### Instalación para Usuarios Finales

1. Descargar `Resortes Puerto Montt Setup 1.1.2.exe` desde [Releases](https://github.com/MathiasAlejandr0/ResortesPuertoMontt/releases)
2. Ejecutar el instalador
3. Seguir el asistente de instalación
4. La aplicación se iniciará automáticamente

**Nota**: Si el usuario tiene una versión anterior con base de datos sin encriptar, la migración automática se ejecutará en el primer inicio.

### Primera Configuración

1. Ir a **Configuración** → **Información del Negocio**
2. Completar información del taller:
   - Nombre del Taller
   - RUT
   - Dirección
   - Teléfono
   - Email
   - Sitio Web (opcional)
3. Guardar información
4. Agregar servicios comunes en **Configuración** → **Servicios**
5. Importar inventario desde Excel (opcional)
6. ¡Listo para usar!

### Requisitos para Desarrollo

- **Node.js**: 18+ 
- **npm**: 9+
- **Sistema Operativo**: Windows 10+, macOS 10.15+, Linux
- **Git**: Para clonar el repositorio

### Instalación para Desarrollo

```bash
# Clonar repositorio
git clone https://github.com/MathiasAlejandr0/ResortesPuertoMontt.git
cd ResortesPuertoMontt

# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm run dev
```

### Scripts Disponibles

```bash
# Desarrollo
npm run dev              # Ejecutar en modo desarrollo (main + renderer)
npm run dev:main         # Solo main process
npm run dev:renderer     # Solo renderer process

# Build
npm run build            # Compilar para producción
npm run build:main       # Compilar solo main process
npm run build:renderer  # Compilar solo renderer process

# Distribución
npm run dist             # Generar instalador .exe
npm run pack             # Empaquetar sin instalador

# Testing
npm test                 # Ejecutar todos los tests
npm run test:watch       # Tests en modo watch
npm run test:coverage    # Tests con cobertura
npm run test:load        # Tests de carga y rendimiento
npm run test:integrity   # Tests de integridad de BD
```

---

## 🔒 SEGURIDAD IMPLEMENTADA

### Capas de Seguridad

El sistema implementa **3 capas críticas de seguridad** para cumplimiento OWASP/GDPR/ISO 27001:

#### 1. Encriptación de Datos (Encryption at Rest)

**Tecnología**: SQLCipher con AES-256-CBC

**Características**:
- ✅ Base de datos completamente encriptada
- ✅ Clave de encriptación de 256 bits (32 bytes)
- ✅ Generación segura de claves con PBKDF2 (100,000 iteraciones)
- ✅ Almacenamiento encriptado de claves
- ✅ Migración automática de bases de datos legacy (sin encriptar → encriptada)
- ✅ Backup automático antes de migración: `resortes.db.backup_legacy`

**Archivos**:
- `src/main/services/EncryptionKeyService.ts` - Gestión de claves
- `src/database/database.ts` - Implementación SQLCipher

**Flujo de Migración Automática**:
```
1. Usuario instala nueva versión
   ↓
2. Sistema detecta resortes.db existente
   ↓
3. Intenta abrir con clave de encriptación
   ↓
4. Si falla → Intenta sin clave (BD legacy)
   ↓
5. Si es legacy:
   - Crea encrypted_temp.db (encriptada)
   - ATTACH DATABASE legacy
   - sqlcipher_export('legacy')
   - Renombra: resortes.db → resortes.db.backup_legacy
   - Renombra: encrypted_temp.db → resortes.db
   ↓
6. Continúa inicio normal con BD encriptada
```

#### 2. Validación Segura de Archivos (Secure Parsing)

**Tecnología**: ExcelJS con validación de Magic Numbers

**Características**:
- ✅ Validación de Magic Numbers (50 4B 03 04) - Previene ejecutables disfrazados
- ✅ Lectura por streams - Previene DoS por archivos grandes
- ✅ Validación estricta con Zod - Schema-based validation
- ✅ Sanitización de datos - Previene Prototype Pollution y XSS
- ✅ Límites de seguridad:
  - Tamaño máximo: 50 MB
  - Máximo de hojas: 10
  - Máximo de filas: 10,000
  - Máximo de columnas: 100
- ✅ Manejo de errores específicos (PasswordError, FileError, TimeoutError)

**Archivo**:
- `src/main/services/ExcelImportService.ts`

#### 3. Sanitización de Logs (PII Redaction)

**Tecnología**: PII Redactor con expresiones regulares

**Características**:
- ✅ Detección automática de RUTs chilenos: `\b\d{1,2}\.\d{3}\.\d{3}[-][0-9Kk]\b`
- ✅ Detección automática de emails: `\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b`
- ✅ Detección automática de teléfonos: `\b(?:\+?56)?(?:0?9)?\s?\d{4}\s?\d{4}\b`
- ✅ Detección automática de contraseñas/tokens en objetos
- ✅ Redacción recursiva en objetos anidados

**Archivo**:
- `src/main/logger-persistente.ts`

### Otras Medidas de Seguridad

- ✅ **Context Isolation**: Activado - Aislamiento de contexto en Electron
- ✅ **Node Integration**: Desactivado - Sin acceso directo a Node.js desde renderer
- ✅ **Validación de Entrada**: Todos los IPC handlers validan con Zod
- ✅ **Sanitización de Datos**: Limpieza de strings peligrosos
- ✅ **Foreign Keys**: Activadas en SQLite para integridad referencial
- ✅ **Transacciones Atómicas**: Operaciones críticas en transacciones
- ✅ **Manejo de Errores**: Try/catch robusto en todas las operaciones

### Cumplimiento

- ✅ **OWASP Top 10**: Protección contra inyecciones, XSS, etc.
- ✅ **GDPR**: Art. 32 (Seguridad de procesamiento), Art. 25 (Privacy by Design)
- ✅ **ISO 27001**: A.10.1.1 (Política de control de acceso), A.12.3.1 (Gestión de copias de seguridad)

---

## 🗄️ BASE DE DATOS

### Tecnología

- **Motor**: SQLCipher 5.3.1 (SQLite con encriptación)
- **Algoritmo**: AES-256-CBC
- **KDF Iterations**: 256,000
- **Ubicación**: 
  - Windows: `%APPDATA%/ResortesPuertoMontt/data/resortes.db`
  - macOS: `~/Library/Application Support/ResortesPuertoMontt/data/resortes.db`
  - Linux: `~/.config/ResortesPuertoMontt/data/resortes.db`

### Esquema Principal

#### Tablas Principales

| Tabla | Descripción |
|-------|-------------|
| `usuarios` | Usuarios del sistema |
| `clientes` | Información de clientes |
| `vehiculos` | Vehículos asociados a clientes |
| `cotizaciones` | Cotizaciones de servicios |
| `detalles_cotizacion` | Detalles de cotizaciones (repuestos/servicios) |
| `ordenes_trabajo` | Órdenes de trabajo |
| `detalles_orden` | Detalles de órdenes (repuestos/servicios) |
| `repuestos` | Inventario de repuestos |
| `servicios` | Catálogo de servicios |
| `cuotas_pago` | Cuotas de pago a crédito |
| `configuracion` | Configuración del sistema (incluye datos del negocio) |

#### Relaciones

```
clientes (1) ──< (N) vehiculos
clientes (1) ──< (N) cotizaciones
clientes (1) ──< (N) ordenes_trabajo
vehiculos (1) ──< (N) cotizaciones
vehiculos (1) ──< (N) ordenes_trabajo
cotizaciones (1) ──< (N) detalles_cotizacion
ordenes_trabajo (1) ──< (N) detalles_orden
ordenes_trabajo (1) ──< (N) cuotas_pago
servicios (1) ──< (N) detalles_cotizacion
servicios (1) ──< (N) detalles_orden
repuestos (1) ──< (N) detalles_cotizacion
repuestos (1) ──< (N) detalles_orden
```

### Características

- ✅ **Foreign Keys**: Activadas para integridad referencial
- ✅ **Índices Compuestos**: Para mejor rendimiento en búsquedas
- ✅ **FTS5**: Full-Text Search para búsqueda rápida
- ✅ **Backups Automáticos**: Cada 5 minutos durante trabajo activo
- ✅ **Mantenimiento Periódico**: VACUUM/ANALYZE semanal
- ✅ **Limpieza Automática**: Eliminación de duplicados
- ✅ **Transacciones**: Operaciones críticas en transacciones atómicas
- ✅ **Journal Mode**: DELETE (compatible con SQLCipher)

### Migración Automática

El sistema detecta automáticamente bases de datos legacy (sin encriptar) y las migra a formato encriptado:

1. Detecta `resortes.db` existente
2. Intenta abrir con clave de encriptación
3. Si falla, intenta sin clave (legacy)
4. Si es legacy, migra usando `ATTACH DATABASE` + `sqlcipher_export()`
5. Crea backup: `resortes.db.backup_legacy`
6. Reemplazo atómico: `encrypted_temp.db` → `resortes.db`

**Los usuarios NO pierden sus datos**

---

## 🔄 FLUJOS DE TRABAJO COMPLETOS

### Flujo: Crear Cotización

```
1. Usuario selecciona "Nueva Cotización"
   ↓
2. Selecciona Cliente y Vehículo
   ↓
3. Agrega Servicios y Repuestos
   ↓
4. Calcula Total Automáticamente
   ↓
5. Guarda Cotización (Estado: Pendiente)
   ↓
6. Puede Exportar PDF o Enviar por WhatsApp
   ↓
7. PDF incluye automáticamente datos del taller desde configuración
```

### Flujo: Convertir Cotización a Orden

```
1. Usuario visualiza Cotización
   ↓
2. Selecciona "Convertir a Orden"
   ↓
3. Sistema copia todos los datos
   ↓
4. Crea Orden de Trabajo (Estado: En Proceso)
   ↓
5. Actualiza Cotización (Estado: Convertida)
   ↓
6. Usuario puede continuar trabajando en la Orden
```

### Flujo: Finalizar Orden con Pago a Crédito

```
1. Usuario finaliza Orden
   ↓
2. Selecciona Método de Pago: "Crédito"
   ↓
3. Ingresa Número de Cuotas
   ↓
4. Sistema calcula Monto por Cuota
   ↓
5. Genera Cuotas Automáticamente
   ↓
6. Orden cambia a Estado: "Completada"
   ↓
7. Sistema genera Alertas de Vencimiento
```

### Flujo: Importar Inventario desde Excel

```
1. Usuario selecciona "Importar desde Excel"
   ↓
2. Selecciona archivo .xlsx
   ↓
3. Sistema valida Magic Numbers (50 4B 03 04)
   ↓
4. Lee archivo por streams
   ↓
5. Valida cada fila con Zod Schema
   ↓
6. Sanitiza datos (trim, remove dangerous chars)
   ↓
7. Inserta en base de datos (transacción)
   ↓
8. Muestra reporte: Total procesados, Errores
```

### Flujo: Procesar Factura (Motor Híbrido)

```
1. Usuario selecciona "Escanear Factura" en Inventario
   ↓
2. Selecciona archivo (PDF o Imagen)
   ↓
3. Sistema detecta tipo de archivo automáticamente
   ↓
4a. Si es PDF Digital:
   - Extrae texto directamente (pdf-parse)
   - Parseo con Regex optimizado
   - Confianza: 100%
   ↓
4b. Si es Imagen:
   - Normaliza orientación (EXIF)
   - Binariza imagen (elimina timbres)
   - OCR con Tesseract.js
   - Parseo con Regex adaptado
   - Confianza: Variable (0-100%)
   ↓
5. Muestra modal de revisión con items extraídos
   ↓
6. Usuario revisa y edita si es necesario
   ↓
7. Confirma para guardar en inventario
```

### Flujo: Configurar Datos del Negocio

```
1. Usuario va a Configuración → Información del Negocio
   ↓
2. Completa datos del taller:
   - Nombre del Taller
   - RUT
   - Dirección
   - Teléfono
   - Email
   - Sitio Web
   ↓
3. Guarda información
   ↓
4. Sistema persiste en tabla `configuracion`
   ↓
5. Hook `useNegocioInfo` carga datos automáticamente
   ↓
6. Todas las cotizaciones y órdenes usan estos datos
```

### Flujo: Migración Automática de BD Legacy

```
1. Usuario instala nueva versión
   ↓
2. Sistema detecta resortes.db existente
   ↓
3. Intenta abrir con clave de encriptación
   ↓
4. Si falla → Intenta sin clave (legacy)
   ↓
5. Si es legacy:
   - Crea encrypted_temp.db (encriptada)
   - ATTACH DATABASE legacy
   - sqlcipher_export('legacy')
   - Renombra: resortes.db → resortes.db.backup_legacy
   - Renombra: encrypted_temp.db → resortes.db
   ↓
6. Continúa inicio normal con BD encriptada
```

---

## 🔌 API INTERNA (IPC)

### Comunicación Main ↔ Renderer

El sistema utiliza **IPC (Inter-Process Communication)** de Electron con validación Zod:

```typescript
// Renderer → Main
window.electronAPI.invoke('nombre-handler', datos)

// Main → Renderer
ipcMain.handle('nombre-handler', async (event, datos) => {
  // Validación con Zod
  const validated = schema.parse(datos)
  // Procesamiento
  return resultado
})
```

### Handlers Principales

#### Clientes
- `get-clientes` - Obtener lista de clientes
- `create-cliente` - Crear nuevo cliente
- `update-cliente` - Actualizar cliente
- `delete-cliente` - Eliminar cliente
- `get-cliente-by-id` - Obtener cliente por ID

#### Cotizaciones
- `get-cotizaciones` - Obtener lista de cotizaciones
- `create-cotizacion` - Crear nueva cotización
- `update-cotizacion` - Actualizar cotización
- `delete-cotizacion` - Eliminar cotización
- `convert-cotizacion-to-orden` - Convertir a orden

#### Órdenes
- `get-ordenes` - Obtener lista de órdenes
- `create-orden` - Crear nueva orden
- `update-orden` - Actualizar orden
- `finalize-orden` - Finalizar orden con pago
- `save-cuotas-pago` - Guardar cuotas de pago

#### Inventario
- `get-repuestos` - Obtener lista de repuestos
- `create-repuesto` - Crear nuevo repuesto
- `update-repuesto` - Actualizar repuesto
- `delete-repuesto` - Eliminar repuesto
- `procesar-excel-repuestos` - Importar desde Excel
- `scan-invoice` - Procesar factura (PDF o imagen)

#### Configuración
- `get-all-configuracion` - Obtener todas las configuraciones
- `get-configuracion` - Obtener configuración por clave
- `save-configuracion` - Guardar configuración

#### Dashboard
- `get-dashboard-stats` - Obtener KPIs del dashboard

**Documentación completa**: Ver `docs/API_INTERNA.md`

---

## 🧪 TESTING

### Cobertura de Tests

- ✅ **Tests Unitarios**: Validación, utilidades, servicios
- ✅ **Tests de Integración**: Transacciones, operaciones de BD
- ✅ **Tests E2E**: Flujos principales completos
- ✅ **Tests de Carga**: Rendimiento y stress testing
- ✅ **Tests de Integridad**: Verificación de BD
- ✅ **Tests de Componentes**: Componentes React

### Ejecutar Tests

```bash
# Todos los tests
npm test

# Tests específicos
npm run test:load          # Tests de carga y rendimiento
npm run test:integrity     # Tests de integridad de BD
npm run test:coverage      # Tests con cobertura
npm run test:watch         # Tests en modo watch
```

### Estructura de Tests

```
src/__tests__/
├── components/            # Tests de componentes React
├── database/              # Tests de base de datos
│   ├── database-integrity.test.ts
│   ├── load-test.test.ts
│   └── performance-benchmark.test.ts
├── e2e/                   # Tests end-to-end
├── integration/           # Tests de integración
├── pages/                 # Tests de páginas
├── services/              # Tests de servicios
└── utils/                 # Tests de utilidades
```

---

## ⚡ RENDIMIENTO Y OPTIMIZACIONES

### Optimizaciones Implementadas

#### Frontend
- ✅ **Memoización**: `useMemo` y `useCallback` para cálculos pesados
- ✅ **Paginación**: Listados grandes con paginación
- ✅ **Lazy Loading**: Carga diferida de datos
- ✅ **StartTransition**: UI no bloqueante durante actualizaciones
- ✅ **React Query**: Caché inteligente de queries
- ✅ **Deferred Values**: Búsquedas no bloqueantes

#### Backend
- ✅ **Caché LRU**: Queries frecuentes en caché
- ✅ **Índices Compuestos**: Búsquedas rápidas en BD
- ✅ **FTS5**: Full-Text Search optimizado
- ✅ **Journal Mode DELETE**: Compatible con SQLCipher
- ✅ **Batch Operations**: Operaciones en lote cuando es posible

#### Base de Datos
- ✅ **Cache Size**: 32 MB de caché
- ✅ **Temp Store**: MEMORY para mejor rendimiento
- ✅ **Busy Timeout**: 5 segundos para evitar bloqueos
- ✅ **Optimize**: Optimización automática periódica
- ✅ **VACUUM/ANALYZE**: Mantenimiento semanal

### Métricas de Rendimiento

- ✅ **Carga Inicial**: < 2 segundos
- ✅ **Búsqueda de Clientes**: < 100ms (con FTS5)
- ✅ **Cálculo de KPIs**: < 200ms (con caché)
- ✅ **Importación Excel**: ~1000 filas/segundo
- ✅ **Procesamiento PDF**: < 1 segundo
- ✅ **Procesamiento OCR**: 2-5 segundos (depende de tamaño de imagen)

---

## 🚀 CARACTERÍSTICAS AVANZADAS

### Motor Híbrido de Procesamiento de Facturas

El sistema incluye un motor inteligente que procesa facturas de dos formas:

#### Estrategia A: PDF Digital (Alta Precisión)
- **Tecnología**: `pdf-parse`
- **Precisión**: 100% (sin OCR)
- **Uso**: Facturas digitales del SII/ERP
- **Formato**: Extracción directa de texto
- **Regex**: Optimizado para facturas chilenas

#### Estrategia B: Imágenes con OCR
- **Tecnología**: `tesseract.js` + `sharp`
- **Precisión**: Variable (60-95%)
- **Uso**: Fotos de facturas físicas
- **Procesamiento**:
  - Auto-rotación basada en EXIF
  - Binarización (threshold 180) para eliminar timbres
  - OCR optimizado para español
  - Regex adaptado para códigos numéricos

**Archivo**: `src/main/services/InvoiceParserService.ts`

### Sistema de Configuración del Negocio

- **Hook Personalizado**: `useNegocioInfo`
- **Persistencia**: Base de datos (`configuracion` table)
- **Uso Automático**: En todas las cotizaciones y órdenes
- **Datos Incluidos**:
  - Nombre del Taller
  - RUT
  - Dirección
  - Teléfono
  - Email
  - Sitio Web

**Archivo**: `src/renderer/hooks/useNegocioInfo.ts`

### Generación de PDFs Profesionales

- **Cotizaciones**: Formato profesional con datos del taller
- **Órdenes de Trabajo**: Formato completo con todos los detalles
- **Datos Automáticos**: RUT, dirección, teléfono, email del taller
- **Versiones**: Cliente e Interna

**Archivos**:
- `src/renderer/components/CotizacionPDF.tsx`
- `src/renderer/components/OrdenCliente.tsx`

---

## 📚 DOCUMENTACIÓN ADICIONAL

### Documentos Disponibles

1. **README.md** (este archivo) - Documentación completa del sistema
2. **docs/API_INTERNA.md** - Documentación detallada de API IPC
3. **docs/ARQUITECTURA_TECNICA.md** - Arquitectura técnica detallada
4. **docs/GUIA_INSTALACION.md** - Guía de instalación paso a paso
5. **docs/MANUAL_USUARIO.md** - Manual de usuario completo
6. **MIGRACION_COMPLETADA.md** - Estado de migración de seguridad
7. **MIGRACION_SEGURIDAD_COMPLETA.md** - Guía completa de migración
8. **RESUMEN_MIGRACION_SEGURIDAD.md** - Resumen ejecutivo de migración
9. **INVOICE_PARSER_HYBRID.md** - Documentación del motor de facturas
10. **FIX_DATABASE_ERRORS.md** - Guía de solución de errores de BD

### Recursos Externos

- **GitHub Repository**: [ResortesPuertoMontt](https://github.com/MathiasAlejandr0/ResortesPuertoMontt)
- **Electron Documentation**: https://www.electronjs.org/docs
- **SQLCipher Documentation**: https://www.zetetic.net/sqlcipher/
- **React Documentation**: https://react.dev/
- **TypeScript Documentation**: https://www.typescriptlang.org/docs/

---

## 🐛 REPORTAR PROBLEMAS

Si encuentras un problema:

1. **Revisar Logs**: 
   - Windows: `%APPDATA%/ResortesPuertoMontt/logs/`
   - macOS: `~/Library/Application Support/ResortesPuertoMontt/logs/`
   - Linux: `~/.config/ResortesPuertoMontt/logs/`
2. **Crear Issue**: [GitHub Issues](https://github.com/MathiasAlejandr0/ResortesPuertoMontt/issues)
3. **Incluir Información**:
   - Versión del sistema
   - Descripción del problema
   - Pasos para reproducir
   - Logs de error (últimas 50 líneas)
   - Screenshots (si aplica)

---

## 📝 CHANGELOG

### v1.1.2 (Enero 2025)

#### Nuevas Funcionalidades
- ✅ Motor Híbrido de Procesamiento de Facturas (PDF + OCR)
- ✅ Sistema de Configuración del Negocio
- ✅ Hook `useNegocioInfo` para acceso a configuración
- ✅ PDFs profesionales con datos del taller automáticos
- ✅ Auto-rotación y binarización de imágenes para OCR

#### Seguridad
- ✅ Migración a SQLCipher (AES-256-CBC)
- ✅ Migración automática de BD legacy
- ✅ ExcelJS con validación segura (Magic Numbers + Streams)
- ✅ PII Redaction en logs
- ✅ Cumplimiento OWASP/GDPR/ISO 27001

#### Funcionalidades
- ✅ Sistema de pagos a crédito con cuotas
- ✅ Alertas de pagos vencidos
- ✅ Ventas rápidas de repuestos
- ✅ Importación masiva desde Excel

#### Optimizaciones
- ✅ Índices compuestos para mejor rendimiento
- ✅ Mantenimiento automático de base de datos
- ✅ Caché LRU de queries
- ✅ Optimizaciones SQLite (cache_size, temp_store, busy_timeout)

#### Testing
- ✅ Tests de integración, carga e integridad
- ✅ Tests E2E de flujos principales
- ✅ Cobertura de tests mejorada

### v1.1.0 (Diciembre 2024)
- ✅ Gestión completa de clientes y vehículos
- ✅ Sistema de cotizaciones
- ✅ Órdenes de trabajo
- ✅ Control de inventario
- ✅ Dashboard con KPIs

---

## 🚀 ESTADO DEL PROYECTO

✅ **Listo para Producción**

El sistema ha sido analizado y probado exhaustivamente:
- ✅ Integridad de base de datos verificada
- ✅ Tests de carga y rendimiento pasados
- ✅ Validaciones completas implementadas
- ✅ Manejo de errores robusto
- ✅ Seguridad de nivel empresarial
- ✅ Documentación completa
- ✅ Motor híbrido de facturas implementado
- ✅ Sistema de configuración funcional

---

## 👤 AUTOR

**Mathias Jara**  
Full Stack Developer  
Email: mathias.jara@hotmail.com

---

## 📄 LICENCIA

MIT License

---

**Última actualización:** 8 de enero de 2025
