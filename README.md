# Sistema de Gestión para Taller Mecánico

## Descripción

Sistema completo de gestión empresarial desarrollado en Python para talleres mecánicos. Incluye gestión de inventario, clientes, trabajos, proveedores y reportes con interfaz gráfica de escritorio.

## Características Principales

### 🔧 Módulo de Inventario
- **Gestión de Productos**: Registro completo con código, lote, proveedor, stock y precios
- **Control de Stock**: Alertas automáticas de stock bajo y configuración de mínimos/máximos
- **Ventas**: Sistema de ventas con control de sobrantes y actualización automática de inventario
- **Productos Estrella**: Análisis de productos más vendidos para recomendaciones de compra

### 👥 Módulo de Clientes y Ventas
- **Gestión de Clientes**: Datos completos (nombre, teléfono, correo, RUT, patente)
- **Historial de Ventas**: Seguimiento completo de transacciones con filtros por fecha y cliente
- **Cotizaciones**: Sistema de cotizaciones (en desarrollo)
- **Boletas**: Generación de boletas internas

### 🚗 Módulo de Taller
- **Órdenes de Trabajo**: Creación y seguimiento de trabajos con asignación de trabajadores
- **Gestión de Máquinas**: Registro de vehículos/máquinas por cliente
- **Trabajadores**: Asignación de personal a trabajos con control de horas
- **Costos**: Cálculo automático de costos (mano de obra + repuestos)
- **Precio Final**: Campo manual para que el dueño establezca el precio al cliente

### 🏢 Módulo de Proveedores
- **Gestión de Proveedores**: Datos completos de proveedores
- **Órdenes de Compra**: Sistema de compras (en desarrollo)
- **Control de Pagos**: Seguimiento de deudas y pagos a proveedores

### 📊 Módulo de Reportes
- **Stock Bajo**: Alertas y reportes de productos con stock insuficiente
- **Trabajos Pendientes**: Seguimiento de trabajos en curso
- **Ventas Mensuales**: Análisis de ventas por período
- **Utilidad por Trabajo**: Cálculo de rentabilidad por trabajo
- **Exportación**: Funcionalidad para exportar a Excel (en desarrollo)

### 🔐 Sistema de Seguridad
- **Control de Usuarios**: Roles diferenciados (administrador, taller, bodega, ventas)
- **Autenticación**: Sistema de login seguro
- **Permisos**: Acceso diferenciado según rol del usuario

## Instalación y Uso

### Requisitos del Sistema
- Windows 10/11
- Python 3.8 o superior
- 4GB RAM mínimo
- 500MB espacio en disco

### Instalación

#### Opción 1: Ejecutable (.exe) - RECOMENDADO
1. Descargar el archivo `TallerMecanico.exe`
2. Ejecutar directamente (no requiere instalación)
3. La base de datos se crea automáticamente en la primera ejecución

#### Opción 2: Código Fuente
1. Clonar o descargar el repositorio
2. Instalar dependencias:
   ```bash
   pip install -r requirements.txt
   ```
3. Ejecutar la aplicación:
   ```bash
   python main.py
   ```

### Usuarios por Defecto
- **Administrador**: `admin` / `admin123`
- **Taller**: `taller` / `taller123`
- **Bodega**: `bodega` / `bodega123`
- **Ventas**: `ventas` / `ventas123`

## Estructura del Proyecto

```
Proyecto ResortesPuertoMontt/
├── main.py                 # Archivo principal de la aplicación
├── requirements.txt        # Dependencias del proyecto
├── modules/               # Módulos del sistema
│   ├── __init__.py
│   ├── database.py        # Base de datos SQLite
│   ├── inventory.py       # Gestión de inventario
│   ├── clients.py         # Clientes y ventas
│   ├── workshop.py        # Taller mecánico
│   ├── suppliers.py       # Proveedores y compras
│   ├── reports.py         # Reportes y análisis
│   └── auth.py           # Autenticación y usuarios
├── README.md              # Esta documentación
└── build_exe.py          # Script para crear ejecutable
```

## Funcionalidades por Rol

### 👑 Administrador
- Acceso completo a todos los módulos
- Gestión de usuarios y contraseñas
- Configuración del sistema
- Reportes completos

### 🔧 Taller
- Gestión de órdenes de trabajo
- Asignación de trabajadores
- Control de máquinas y vehículos
- Establecimiento de precios finales

### 📦 Bodega
- Gestión de inventario
- Control de stock
- Registro de ventas
- Alertas de stock bajo

### 💰 Ventas
- Gestión de clientes
- Historial de ventas
- Generación de boletas
- Cotizaciones

## Base de Datos

El sistema utiliza SQLite como base de datos local, que se crea automáticamente en la primera ejecución. Las tablas principales incluyen:

- **users**: Usuarios del sistema
- **products**: Productos del inventario
- **clients**: Clientes del taller
- **suppliers**: Proveedores
- **work_orders**: Órdenes de trabajo
- **workers**: Trabajadores
- **machines**: Máquinas/vehículos
- **sales**: Ventas realizadas
- **purchase_orders**: Órdenes de compra

## Características Técnicas

- **Interfaz**: Tkinter con diseño moderno y responsive
- **Colores**: Esquema institucional con rojo bermellón (#a51611)
- **Base de Datos**: SQLite con transacciones ACID
- **Arquitectura**: Modular y escalable
- **Multiplataforma**: Desarrollado para Windows, portable a otros sistemas
- **Rendimiento**: Optimizado para uso empresarial

## Roadmap de Desarrollo

### Versión Actual (1.0)
- ✅ Sistema base completo
- ✅ Gestión de inventario
- ✅ Gestión de clientes y ventas
- ✅ Sistema de taller
- ✅ Gestión de proveedores
- ✅ Reportes básicos
- ✅ Sistema de usuarios y roles

### Próximas Versiones
- **1.1**: Sistema de cotizaciones completo
- **1.2**: Exportación a Excel y PDF
- **1.3**: Análisis avanzado de productos estrella
- **2.0**: Versión web
- **3.0**: Aplicación móvil

## Soporte y Contacto

Para soporte técnico o consultas sobre el sistema:
- Crear un issue en el repositorio
- Contactar al equipo de desarrollo

## Licencia

Este software es propiedad de la empresa y está destinado para uso interno.

---

**Desarrollado con ❤️ para optimizar la gestión de talleres mecánicos**
