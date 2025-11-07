# 📖 MANUAL DE USUARIO - RESORTES PUERTO MONTT

**Versión:** 1.1.2  
**Fecha:** 2025-11-03

---

## 📋 TABLA DE CONTENIDOS

1. [Introducción](#introducción)
2. [Instalación](#instalación)
3. [Primeros Pasos](#primeros-pasos)
4. [Gestión de Clientes](#gestión-de-clientes)
5. [Gestión de Vehículos](#gestión-de-vehículos)
6. [Cotizaciones](#cotizaciones)
7. [Órdenes de Trabajo](#órdenes-de-trabajo)
8. [Inventario](#inventario)
9. [Dashboard](#dashboard)
10. [Búsqueda Avanzada](#búsqueda-avanzada)
11. [Exportación de Documentos](#exportación-de-documentos)
12. [Configuración](#configuración)
13. [Backups](#backups)
14. [Solución de Problemas](#solución-de-problemas)

---

## 🎯 INTRODUCCIÓN

**Resortes Puerto Montt** es un sistema de gestión completo para talleres mecánicos que permite administrar clientes, vehículos, cotizaciones, órdenes de trabajo e inventario de forma eficiente y profesional.

### Características Principales

- ✅ **Gestión completa de clientes y vehículos**
- ✅ **Creación de cotizaciones profesionales**
- ✅ **Seguimiento de órdenes de trabajo**
- ✅ **Control de inventario con alertas de stock**
- ✅ **Dashboard con KPIs en tiempo real**
- ✅ **Búsqueda avanzada con resaltado**
- ✅ **Exportación de documentos (versión interna y cliente)**
- ✅ **Envío de documentos por WhatsApp**
- ✅ **Sistema de backups automático**

---

## 💻 INSTALACIÓN

### Requisitos del Sistema

- **Sistema Operativo:** Windows 10 o superior
- **Memoria RAM:** Mínimo 4 GB (recomendado 8 GB)
- **Espacio en disco:** 500 MB libres
- **Permisos:** Administrador para la instalación

### Proceso de Instalación

1. **Ejecutar el instalador:**
   - Doble clic en `Resortes Puerto Montt Setup 1.1.2.exe`
   - Si aparece aviso de seguridad, hacer clic en "Más información" → "Ejecutar de todas formas"

2. **Seguir el asistente:**
   - Aceptar términos y condiciones
   - Seleccionar directorio de instalación (o usar el predeterminado)
   - Hacer clic en "Instalar"

3. **Finalizar instalación:**
   - El sistema se iniciará automáticamente
   - La primera vez se creará la base de datos inicial

### Desinstalación

1. **Abrir Panel de Control → Programas y características**
2. **Buscar "Resortes Puerto Montt"**
3. **Hacer clic en "Desinstalar"**
4. **Seleccionar si desea conservar o eliminar los datos:**
   - ✅ **Conservar datos:** Mantiene base de datos y backups para futuras instalaciones
   - ❌ **Eliminar datos:** Borra toda la información (irreversible)

---

## 🚀 PRIMEROS PASOS

### Pantalla de Inicio

Al abrir la aplicación, verás el **Dashboard** con:
- **KPIs principales:** Ingresos del mes, órdenes pendientes, clientes activos
- **Gráfico de ventas:** Ingresos por mes
- **Órdenes recientes:** Últimas 5 órdenes creadas

### Navegación

El menú lateral permite acceder a:
- 🏠 **Dashboard** - Vista general
- 👥 **Clientes** - Gestión de clientes
- 📄 **Cotizaciones** - Cotizaciones
- 🔧 **Órdenes de Trabajo** - Órdenes
- 📦 **Inventario** - Repuestos y servicios
- ⚙️ **Configuración** - Ajustes del sistema

---

## 👥 GESTIÓN DE CLIENTES

### Crear un Nuevo Cliente

1. **Ir a la sección "Clientes"**
2. **Hacer clic en el botón "Nuevo Cliente"** (botón +)
3. **Completar el formulario:**

   **Paso 1: Datos del Cliente**
   - **Nombre Completo** * (requerido)
   - **RUT** * (requerido, formato: 12.345.678-9)
   - **Correo Electrónico** (opcional)
   - **Teléfono** * (requerido)
   - **Dirección** (opcional)

4. **Hacer clic en "Siguiente"**
5. **Paso 2: Agregar Vehículos**
   - Hacer clic en "Agregar vehículo"
   - Completar: Marca, Modelo, Año, Patente, Color
   - Puedes agregar múltiples vehículos
6. **Hacer clic en "Crear"** para guardar

### Editar Cliente

1. **En la lista de clientes**, hacer clic en el botón de editar (✏️)
2. **Modificar los datos necesarios**
3. **Hacer clic en "Actualizar"**

### Eliminar Cliente

1. **En la lista de clientes**, hacer clic en el botón de eliminar (🗑️)
2. **Confirmar la eliminación**
3. **⚠️ ADVERTENCIA:** Se eliminarán todos los datos relacionados:
   - Vehículos del cliente
   - Cotizaciones
   - Órdenes de trabajo

### Buscar Cliente

- **Usar la barra de búsqueda** en la parte superior
- Busca por: nombre, RUT, teléfono, email
- Los resultados se actualizan mientras escribes

---

## 🚗 GESTIÓN DE VEHÍCULOS

### Agregar Vehículo a un Cliente

1. **Desde la lista de clientes**, hacer clic en el botón de vehículos (🚗)
2. **Hacer clic en "Agregar vehículo"**
3. **Completar los datos:**
   - **Marca** * (requerido)
   - **Modelo** * (requerido)
   - **Año** * (requerido)
   - **Patente** * (requerido, formato: ABCD12 o 1234AB)
   - **Color** (opcional)
   - **Kilometraje** (opcional)
   - **Observaciones** (opcional)

### Editar Vehículo

1. **Desde la lista de vehículos del cliente**
2. **Hacer clic en el botón de editar**
3. **Modificar los datos**
4. **Guardar cambios**

---

## 📄 COTIZACIONES

### Crear una Nueva Cotización

1. **Ir a la sección "Cotizaciones"**
2. **Hacer clic en "Nueva Cotización"** (botón +)

3. **Paso 1: Seleccionar Cliente y Vehículo**
   - **Tipo de Cliente:**
     - **Cliente Existente:** Seleccionar de la lista
     - **Nuevo Cliente:** Completar datos del cliente
   - **Tipo de Vehículo:**
     - **Vehículo Existente:** Seleccionar de la lista
     - **Nuevo Vehículo:** Completar datos del vehículo
   - El sistema creará automáticamente cliente/vehículo si no existen

4. **Paso 2: Descripción del Trabajo**
   - Describir el trabajo a realizar
   - Agregar observaciones si es necesario

5. **Paso 3: Agregar Servicios y Repuestos**
   - **Servicios:**
     - Seleccionar servicio de la lista
     - Ajustar cantidad si es necesario
     - Hacer clic en "Agregar"
   - **Repuestos:**
     - Buscar repuesto por nombre o código
     - Seleccionar repuesto (se muestra nombre y categoría)
     - Ajustar cantidad y precio si es necesario
     - Hacer clic en "Agregar"
   - Los repuestos muestran: `Nombre (Categoría)`

6. **Paso 4: Resumen y Precio Final**
   - Revisar el resumen completo
   - **Ajustar precio final** si es necesario
   - **Fecha de validez** (opcional)
   - **Observaciones** (opcional)

7. **Hacer clic en "Crear Cotización"**

### Ver Cotización

1. **En la lista de cotizaciones**, hacer clic en el botón de ver (👁️)
2. **Seleccionar versión:**
   - **Versión Interna:** Muestra todos los precios detallados
   - **Versión Cliente:** Muestra solo trabajo y precio final (sin precios individuales)

### Editar Cotización

1. **En la lista de cotizaciones**, hacer clic en el botón de editar (✏️)
2. **Modificar los datos necesarios**
3. **Guardar cambios**

### Convertir Cotización a Orden

1. **Ver la cotización** (botón 👁️)
2. **Hacer clic en "Crear Orden desde Cotización"**
3. **Se importarán automáticamente:**
   - Datos del cliente y vehículo
   - Descripción del trabajo
   - Servicios y repuestos
   - Precio total

### Estados de Cotización

- **Pendiente:** Cotización recién creada
- **Aprobada:** Cliente aprobó la cotización
- **Rechazada:** Cliente rechazó la cotización
- **Vencida:** Fecha de validez expirada
- **Convertida:** Convertida a orden de trabajo

---

## 🔧 ÓRDENES DE TRABAJO

### Crear una Nueva Orden

1. **Ir a la sección "Órdenes de Trabajo"**
2. **Hacer clic en "Nueva Orden"** (botón +)

3. **Paso 1: Cliente y Vehículo**
   - Seleccionar cliente y vehículo (o crear nuevos)

4. **Paso 2: Descripción del Trabajo**
   - Describir el trabajo a realizar
   - **Kilometraje de entrada** (opcional)
   - **Prioridad:** Baja, Media, Alta, Urgente
   - **Técnico asignado** (opcional)

5. **Paso 3: Servicios y Repuestos**
   - Agregar servicios y repuestos necesarios
   - Ajustar cantidades y precios

6. **Paso 4: Resumen**
   - Revisar resumen completo
   - **Fecha de entrega estimada** (opcional)
   - **Observaciones** (opcional)

7. **Hacer clic en "Crear Orden"**

### Importar desde Cotización

1. **Crear orden desde cotización** (ver sección Cotizaciones)
2. Los datos se importan automáticamente
3. Ajustar información adicional si es necesario
4. Guardar

### Ver Orden

1. **En la lista de órdenes**, hacer clic en el botón de ver (👁️)
2. **Verás:**
   - Información completa de la orden
   - Cliente y vehículo
   - Servicios y repuestos con precios
   - Estado actual
   - Técnico asignado

### Editar Orden

1. **En la lista de órdenes**, hacer clic en el botón de editar (✏️)
2. **Puedes modificar:**
   - Estado
   - Fecha de entrega
   - Kilometraje de salida
   - Prioridad
   - Técnico asignado
   - Observaciones
   - Servicios y repuestos

### Estados de Orden

- **Pendiente:** Orden recién creada
- **En Proceso:** Trabajo en ejecución
- **Completada:** Trabajo finalizado
- **Cancelada:** Orden cancelada

### Filtrar Órdenes

- **Por estado:** Usar filtros en la parte superior
- **Buscar:** Usar barra de búsqueda (busca por número, cliente, vehículo)

---

## 📦 INVENTARIO

### Agregar Repuesto

1. **Ir a la sección "Inventario"**
2. **Hacer clic en "Nuevo Repuesto"** (botón +)
3. **Completar datos:**
   - **Código** * (SKU único)
   - **Nombre** * (nombre del repuesto)
   - **Descripción** (opcional)
   - **Precio** * (precio de venta)
   - **Stock** * (cantidad actual)
   - **Stock Mínimo** * (alerta cuando baje de este nivel)
   - **Categoría** * (ej: Filtros, Frenos, Motor)
   - **Marca** (opcional)
   - **Ubicación** (opcional, ej: Estantería A1)

4. **Hacer clic en "Guardar"**

### Editar Repuesto

1. **En la lista de repuestos**, hacer clic en el botón de editar (✏️)
2. **Modificar datos**
3. **Guardar cambios**

### Actualizar Stock

1. **En la lista de repuestos**, hacer clic en el botón de stock (📊)
2. **Ingresar cantidad** a agregar o quitar
3. **Hacer clic en "Confirmar"**
4. El sistema actualizará el stock automáticamente

### Buscar Repuesto

- **Usar la barra de búsqueda**
- Busca por: nombre, código, descripción, categoría
- **Soporta múltiples términos:** Ej: "filtro aceite motor"
- Los resultados se resaltan en amarillo
- Muestra coincidencias en código, nombre y descripción

### Gestión de Servicios

1. **Ir a "Configuración" → "Servicios"**
2. **Agregar nuevo servicio:**
   - Nombre
   - Descripción
   - Precio
   - Duración estimada (en minutos)
3. **Editar o eliminar servicios existentes**

---

## 📊 DASHBOARD

El Dashboard muestra información en tiempo real:

### KPIs Principales

- **💰 Ingresos del Mes:** Total de órdenes completadas este mes
- **📋 Órdenes Pendientes:** Órdenes en estado "pendiente" o "en_proceso"
- **👥 Clientes Activos:** Total de clientes activos
- **📦 Stock Bajo:** Repuestos con stock por debajo del mínimo

### Gráfico de Ventas

- Muestra ingresos por mes
- Gráfico interactivo
- Hover para ver detalles

### Órdenes Recientes

- Últimas 5 órdenes creadas
- Muestra: número, cliente, vehículo, estado, total
- Clic en orden para ver detalles

---

## 🔍 BÚSQUEDA AVANZADA

### Búsqueda en Clientes

- **Barra de búsqueda** en la parte superior
- Busca en: nombre, RUT, teléfono, email
- Resultados en tiempo real

### Búsqueda en Cotizaciones/Órdenes

- Busca por: número, cliente, vehículo, estado
- Filtros por estado disponibles

### Búsqueda en Inventario

- **Búsqueda full-text avanzada:**
  - Busca en: nombre, código, descripción, categoría
  - **Soporta múltiples términos:** Ej: "filtro aceite"
  - **Resaltado de coincidencias:** Términos encontrados se resaltan en amarillo
  - **Paginación:** Carga 100 resultados inicialmente, "Cargar más" para ver más

**Ejemplos de búsqueda:**
- `filtro` - Busca todos los filtros
- `aceite motor` - Busca repuestos con ambos términos
- `FR-001` - Busca por código específico
- `frenos suspensión` - Busca en múltiples categorías

---

## 📤 EXPORTACIÓN DE DOCUMENTOS

### Versión Interna

1. **Ver cotización u orden** (botón 👁️)
2. **Hacer clic en "Versión Interna"** (botón 💰)
3. **Se muestra:**
   - Todos los precios detallados
   - Desglose de servicios y repuestos
   - Precios unitarios y subtotales
   - Información completa para uso interno

### Versión Cliente

1. **Ver cotización u orden**
2. **Hacer clic en "Versión Cliente"** (botón 📄)
3. **Se muestra:**
   - Descripción del trabajo
   - Repuestos necesarios (sin precios)
   - **Solo precio final total**
   - Listo para enviar al cliente

### Enviar por WhatsApp

1. **Ver cotización u orden**
2. **Hacer clic en "Enviar por WhatsApp"** (botón 📱)
3. **Ingresar número de teléfono** del cliente
4. **Confirmar envío**
5. Se abrirá WhatsApp Web con el mensaje preformateado

---

## ⚙️ CONFIGURACIÓN

### Datos del Taller

1. **Ir a "Configuración"**
2. **Configurar:**
   - **Nombre del taller**
   - **Teléfono**
   - **Email**
   - **Dirección**
3. **Guardar cambios**

Estos datos aparecen en los documentos exportados.

### Servicios

1. **Ir a "Configuración" → "Servicios"**
2. **Agregar, editar o eliminar servicios**
3. Los servicios estarán disponibles al crear cotizaciones/órdenes

---

## 💾 BACKUPS

### Backups Automáticos

- El sistema crea backups automáticos cada 24 horas
- Se guardan en: `AppData/Roaming/ResortesPuertoMontt/data/backups/`
- Formato: `auto-backup-YYYY-MM-DDTHH-mm-ss.db`

### Backup Manual

1. **Ir a "Configuración" → "Backups"**
2. **Hacer clic en "Crear Backup"**
3. Se creará un backup con timestamp

### Restaurar Backup

1. **Ir a "Configuración" → "Backups"**
2. **Seleccionar backup** de la lista
3. **Hacer clic en "Restaurar"**
4. **⚠️ ADVERTENCIA:** Se reemplazará la base de datos actual
5. **Confirmar restauración**

### Eliminar Backup

1. **Seleccionar backup**
2. **Hacer clic en "Eliminar"**
3. **Confirmar eliminación**

---

## 🔧 SOLUCIÓN DE PROBLEMAS

### La aplicación no inicia

1. **Verificar que el instalador se ejecutó correctamente**
2. **Reiniciar el equipo**
3. **Ejecutar como administrador**
4. **Verificar espacio en disco**

### Los datos no se guardan

1. **Verificar permisos de escritura en:**
   - `AppData/Roaming/ResortesPuertoMontt/`
2. **Ejecutar como administrador**
3. **Verificar espacio en disco**

### La búsqueda es lenta

1. **Usar búsqueda específica** (no buscar términos muy generales)
2. **Usar múltiples términos** para refinar búsqueda
3. **Esperar 200ms** después de escribir (la búsqueda se actualiza automáticamente)

### Los formularios no responden

1. **Cerrar y volver a abrir el formulario**
2. **Reiniciar la aplicación**
3. Si persiste, contactar soporte

### Error al guardar

1. **Verificar que todos los campos requeridos estén completos**
2. **Revisar formato de datos** (RUT, teléfono, etc.)
3. **Verificar que no haya datos duplicados** (RUT, patente)
4. **Revisar mensaje de error** específico

### Backup no se crea

1. **Verificar espacio en disco**
2. **Verificar permisos de escritura**
3. **Crear backup manual** desde Configuración

---

## 📞 SOPORTE

### Contacto

- **Email:** info@resortespuertomontt.cl
- **Teléfono:** +56 9 1234 5678

### Información del Sistema

- **Versión:** 1.1.2
- **Base de datos:** SQLite
- **Sistema operativo:** Windows 10+

---

## 📝 NOTAS IMPORTANTES

### Datos

- Los datos se guardan localmente en tu computadora
- **No se requieren conexión a internet** para usar el sistema
- Los backups se guardan localmente
- **Recomendación:** Hacer backups regulares

### Seguridad

- Los datos son privados y locales
- No se envían a servidores externos
- Los backups contienen toda la información

### Rendimiento

- El sistema funciona mejor con menos de 10,000 repuestos
- Recomendado menos de 1,000 clientes para mejor rendimiento
- Los backups grandes pueden tardar más en restaurarse

---

**Última actualización:** 2025-11-03  
**Versión del Manual:** 1.1.2

