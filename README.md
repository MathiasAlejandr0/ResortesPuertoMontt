# 🚗 Resortes Puerto Montt - Sistema de Gestión

**Versión:** 1.1.2  
**Sistema de gestión completo para talleres mecánicos**

---

## 📋 Descripción

Resortes Puerto Montt es una aplicación de escritorio desarrollada con Electron que permite gestionar de forma integral un taller mecánico, incluyendo clientes, vehículos, cotizaciones, órdenes de trabajo, inventario y sistema de pagos a crédito.

### Características Principales

- ✅ **Gestión completa de clientes y vehículos**
- ✅ **Creación de cotizaciones profesionales**
- ✅ **Seguimiento de órdenes de trabajo con estados**
- ✅ **Control de inventario con alertas de stock mínimo**
- ✅ **Dashboard con KPIs en tiempo real**
- ✅ **Sistema de pagos a crédito con cuotas**
- ✅ **Alertas de pagos vencidos**
- ✅ **Ventas rápidas de repuestos**
- ✅ **Búsqueda avanzada con resaltado**
- ✅ **Exportación de documentos**
- ✅ **Sistema de backups automático**
- ✅ **Mantenimiento automático de base de datos**

---

## 🚀 Inicio Rápido

### Requisitos del Sistema

- Windows 10 (64-bit) o superior
- 4 GB RAM mínimo (8 GB recomendado)
- 600 MB de espacio en disco
- Procesador de 64 bits

### Instalación

1. Descargar `Resortes Puerto Montt Setup 1.1.2.exe` desde [Releases](https://github.com/MathiasAlejandr0/ResortesPuertoMontt/releases)
2. Ejecutar el instalador
3. Seguir el asistente de instalación
4. La aplicación se iniciará automáticamente

### Primera Configuración

1. Ir a **Configuración** → **Datos del Taller**
2. Completar información del taller
3. Agregar servicios comunes en **Configuración** → **Servicios**
4. Importar inventario desde Excel (opcional)
5. ¡Listo para usar!

---

## 🛠️ Desarrollo

### Requisitos

- Node.js 18+ 
- npm 9+
- Windows 10+ (para desarrollo en Windows)

### Instalación para Desarrollo

```bash
# Clonar repositorio
git clone https://github.com/MathiasAlejandr0/ResortesPuertoMontt.git
cd ResortesPuertoMontt/resortes-puerto-montt-2.0

# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm run dev
```

### Scripts Disponibles

```bash
# Desarrollo
npm run dev              # Ejecutar en modo desarrollo
npm run dev:main         # Solo main process
npm run dev:renderer     # Solo renderer process

# Build
npm run build            # Compilar para producción
npm run build:main       # Compilar solo main
npm run build:renderer   # Compilar solo renderer

# Distribución
npm run dist             # Generar instalador .exe
npm run pack             # Empaquetar sin instalador

# Testing
npm test                 # Ejecutar todos los tests
npm run test:watch       # Tests en modo watch
npm run test:coverage    # Tests con cobertura
npm run test:load        # Tests de carga
npm run test:integrity    # Tests de integridad
```

### Estructura del Proyecto

```
resortes-puerto-montt-2.0/
├── src/
│   ├── main/              # Electron main process
│   │   ├── main.ts         # Punto de entrada
│   │   ├── preload.ts      # Preload script
│   │   ├── validation-schemas.ts  # Validación Zod
│   │   └── logger-persistente.ts   # Sistema de logs
│   ├── renderer/           # React frontend
│   │   ├── pages/          # Páginas principales
│   │   ├── components/     # Componentes reutilizables
│   │   ├── contexts/       # Context API
│   │   └── utils/          # Utilidades
│   ├── database/           # SQLite database service
│   │   ├── database.ts    # Servicio principal
│   │   └── retry-utils.ts # Utilidades de reintento
│   └── __tests__/         # Tests
├── dist/                   # Archivos compilados
├── release/                # Ejecutables generados
└── package.json
```

---

## 🧪 Testing

### Ejecutar Tests

```bash
# Todos los tests
npm test

# Tests específicos
npm run test:load          # Tests de carga y rendimiento
npm run test:integrity     # Tests de integridad de BD
npm run test:coverage      # Tests con cobertura
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

## 📦 Tecnologías

- **Frontend:** React 18, TypeScript, Tailwind CSS
- **Backend:** Electron 33, Node.js
- **Base de Datos:** SQLite3 con FTS5
- **Validación:** Zod
- **Testing:** Jest
- **Build:** Vite, Electron Builder

---

## 🔒 Seguridad

- ✅ Context isolation activado
- ✅ Node integration desactivado
- ✅ Validación de entrada en todos los IPC handlers
- ✅ Sanitización de datos de usuario
- ✅ Foreign keys activadas en SQLite
- ✅ Transacciones atómicas para operaciones críticas

---

## 📊 Rendimiento

- ✅ Memoización de cálculos pesados
- ✅ Paginación en listados grandes
- ✅ Caché LRU de queries
- ✅ FTS5 para búsqueda rápida
- ✅ Índices compuestos en base de datos
- ✅ StartTransition para UI no bloqueante
- ✅ Lazy loading de datos
- ✅ Mantenimiento automático de BD (VACUUM/ANALYZE)

---

## 🎯 Funcionalidades Principales

### Gestión de Clientes
- Crear, editar y eliminar clientes
- Validación automática de RUT chileno
- Gestión de vehículos por cliente
- Historial de órdenes y cotizaciones

### Órdenes de Trabajo
- Crear órdenes desde cotizaciones o desde cero
- Estados: En Proceso, Completada, Cancelada
- Finalización con método de pago (Efectivo, Débito, Crédito)
- Gestión de cuotas para pagos a crédito
- Seguimiento de repuestos y servicios

### Cotizaciones
- Crear cotizaciones profesionales
- Estados: Pendiente, Aprobada, Rechazada, Vencida, Convertida
- Convertir cotizaciones a órdenes de trabajo
- Exportación de documentos

### Inventario
- Gestión completa de repuestos
- Control de stock con alertas de mínimo
- Precio de costo y precio de venta
- Importación desde Excel
- Búsqueda avanzada

### Sistema de Pagos
- Gestión de cuotas de pago
- Alertas de pagos vencidos (2 días antes, día de vencimiento, cada 3 días después)
- Confirmación de pagos
- Cálculo automático de ingresos en KPIs

### Ventas Rápidas
- Venta de repuestos sin orden de trabajo completa
- Datos de cliente opcionales
- Código VT- para distinguir de órdenes (OT-)

---

## 📈 KPIs y Dashboard

- Ingresos del mes actual
- Ingresos del mes anterior
- Total de órdenes
- Órdenes en proceso
- Total de clientes
- Total de vehículos
- Valor total de inventario (costo y venta)
- Órdenes recientes

---

## 🗄️ Base de Datos

### Esquema Principal

- **clientes**: Información de clientes
- **vehiculos**: Vehículos asociados a clientes
- **cotizaciones**: Cotizaciones de servicios
- **detalles_cotizacion**: Detalles de cotizaciones (repuestos/servicios)
- **ordenes_trabajo**: Órdenes de trabajo
- **detalles_orden**: Detalles de órdenes (repuestos/servicios)
- **repuestos**: Inventario de repuestos
- **servicios**: Catálogo de servicios
- **cuotas_pago**: Cuotas de pago a crédito
- **configuracion**: Configuración del sistema

### Características

- ✅ Foreign keys activadas
- ✅ Índices compuestos para mejor rendimiento
- ✅ FTS5 para búsqueda de texto completo
- ✅ Backups automáticos
- ✅ Mantenimiento periódico (VACUUM/ANALYZE)
- ✅ Limpieza automática de duplicados

---

## 🐛 Reportar Problemas

Si encuentras un problema:

1. Revisar logs en: `AppData/Roaming/ResortesPuertoMontt/logs/`
2. Crear un [Issue](https://github.com/MathiasAlejandr0/ResortesPuertoMontt/issues) con:
   - Versión del sistema
   - Descripción del problema
   - Pasos para reproducir
   - Logs de error (últimas 50 líneas)

---

## 📝 Licencia

MIT

---

## 👤 Autor

**Mathias Jara**  
Full Stack Developer  
Email: mathias.jara@hotmail.com

---

## 📅 Versión

**1.1.2** - Diciembre 2025

---

## 🔄 Changelog

### v1.1.2 (Diciembre 2025)
- ✅ Sistema de pagos a crédito con cuotas
- ✅ Alertas de pagos vencidos
- ✅ Ventas rápidas de repuestos
- ✅ Índices compuestos para mejor rendimiento
- ✅ Mantenimiento automático de base de datos
- ✅ Validación completa de entrada en IPC handlers
- ✅ Sistema de logs persistentes
- ✅ Tests de integración, carga e integridad
- ✅ Optimizaciones de rendimiento
- ✅ Búsqueda avanzada con FTS5
- ✅ Protección contra datos de prueba en producción

### v1.1.0
- ✅ Gestión completa de clientes y vehículos
- ✅ Sistema de cotizaciones
- ✅ Órdenes de trabajo
- ✅ Control de inventario
- ✅ Dashboard con KPIs

---

## 🚀 Estado del Proyecto

✅ **Listo para Producción**

El sistema ha sido analizado y probado exhaustivamente:
- ✅ Integridad de base de datos verificada
- ✅ Tests de carga y rendimiento pasados
- ✅ Validaciones completas implementadas
- ✅ Manejo de errores robusto
- ✅ Documentación completa

---

**Última actualización:** 2025-12-07
