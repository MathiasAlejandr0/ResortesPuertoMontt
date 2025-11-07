# 📦 GUÍA DE INSTALACIÓN Y CONFIGURACIÓN

**Sistema:** Resortes Puerto Montt v1.1.2  
**Fecha:** 2025-11-03

---

## 📋 TABLA DE CONTENIDOS

1. [Requisitos del Sistema](#requisitos-del-sistema)
2. [Instalación](#instalación)
3. [Configuración Inicial](#configuración-inicial)
4. [Actualización](#actualización)
5. [Desinstalación](#desinstalación)
6. [Solución de Problemas](#solución-de-problemas)

---

## 💻 REQUISITOS DEL SISTEMA

### Mínimos

- **Sistema Operativo:** Windows 10 (64-bit) o superior
- **Memoria RAM:** 4 GB
- **Espacio en Disco:** 500 MB libres
- **Procesador:** Dual-core 2.0 GHz o superior

### Recomendados

- **Sistema Operativo:** Windows 11
- **Memoria RAM:** 8 GB o más
- **Espacio en Disco:** 1 GB libres
- **Procesador:** Quad-core 2.5 GHz o superior

### Permisos Requeridos

- **Administrador:** Para la instalación inicial
- **Usuario estándar:** Para el uso diario (después de instalación)

---

## 📥 INSTALACIÓN

### Paso 1: Descargar el Instalador

1. Obtener el archivo: `Resortes Puerto Montt Setup 1.1.2.exe`
2. Guardar en una ubicación accesible (ej: Escritorio)

### Paso 2: Ejecutar el Instalador

1. **Hacer doble clic** en el instalador
2. Si aparece **"Windows protegió tu PC"**:
   - Hacer clic en **"Más información"**
   - Hacer clic en **"Ejecutar de todas formas"**
   - (Esto es normal para aplicaciones no firmadas)

### Paso 3: Asistente de Instalación

1. **Bienvenida**
   - Hacer clic en **"Siguiente"**

2. **Términos y Condiciones**
   - Leer términos
   - Marcar **"Acepto los términos"**
   - Hacer clic en **"Siguiente"**

3. **Directorio de Instalación**
   - **Recomendado:** Usar el directorio predeterminado
   - `C:\Program Files\Resortes Puerto Montt`
   - O seleccionar otra ubicación
   - Hacer clic en **"Siguiente"**

4. **Componentes**
   - Todos los componentes están seleccionados por defecto
   - Hacer clic en **"Siguiente"**

5. **Instalación**
   - Esperar a que se complete (1-2 minutos)
   - Hacer clic en **"Finalizar"**

### Paso 4: Primera Ejecución

1. La aplicación se iniciará automáticamente
2. **Primera vez:**
   - Se creará la base de datos inicial
   - Se crearán directorios de datos y backups
   - Proceso toma 10-30 segundos

3. **Pantalla de carga:**
   - Muestra logo y mensaje
   - Esperar a que cargue completamente

4. **Dashboard:**
   - Aparece cuando los datos críticos están listos
   - Listo para usar

---

## ⚙️ CONFIGURACIÓN INICIAL

### Configurar Datos del Taller

1. **Ir a "Configuración"** (menú lateral)
2. **Completar información:**
   - **Nombre del Taller:** Ej: "Resortes Puerto Montt"
   - **Teléfono:** Ej: "+56 9 1234 5678"
   - **Email:** Ej: "info@resortespuertomontt.cl"
   - **Dirección:** (Opcional)

3. **Hacer clic en "Guardar"**

**Importante:** Estos datos aparecen en los documentos exportados.

### Configurar Servicios

1. **Ir a "Configuración" → "Servicios"**
2. **Agregar servicios comunes:**
   - Cambio de aceite
   - Reparación de frenos
   - Alineación
   - etc.

3. **Completar para cada servicio:**
   - Nombre
   - Descripción (opcional)
   - Precio
   - Duración estimada (minutos)

### Configurar Backup Automático

El sistema crea backups automáticos cada 24 horas por defecto.

**Ubicación de backups:**
- `C:\Users\[Usuario]\AppData\Roaming\ResortesPuertoMontt\data\backups\`

**Verificar backups:**
1. Ir a "Configuración" → "Backups"
2. Ver lista de backups disponibles

---

## 🔄 ACTUALIZACIÓN

### Desde Versión Anterior

1. **⚠️ IMPORTANTE: Hacer backup manual**
   - Ir a "Configuración" → "Backups"
   - Hacer clic en "Crear Backup"
   - Anotar ubicación del backup

2. **Cerrar la aplicación** completamente

3. **Ejecutar el nuevo instalador**
   - `Resortes Puerto Montt Setup 1.1.2.exe`

4. **Seguir el asistente de instalación**
   - El instalador detectará la versión anterior
   - Preguntará si desea desinstalar la anterior
   - **Seleccionar "Sí"**

5. **Al desinstalar:**
   - **Seleccionar "Conservar datos"** para mantener información
   - O "Eliminar datos" para empezar desde cero

6. **Completar instalación del nuevo**

7. **Verificar datos:**
   - Abrir la aplicación
   - Verificar que los datos anteriores estén presentes

### Migración de Datos

Si los datos no aparecen:
1. **Ir a "Configuración" → "Backups"**
2. **Seleccionar el backup más reciente**
3. **Hacer clic en "Restaurar"**
4. **Confirmar restauración**
5. **Reiniciar la aplicación**

---

## 🗑️ DESINSTALACIÓN

### Método 1: Panel de Control

1. **Abrir Panel de Control**
2. **Ir a "Programas y características"**
3. **Buscar "Resortes Puerto Montt"**
4. **Hacer clic en "Desinstalar"**
5. **Seguir el asistente**

### Método 2: Menú Inicio

1. **Menú Inicio → "Resortes Puerto Montt"**
2. **Hacer clic en "Desinstalar"**
3. **Seguir el asistente**

### Opciones de Desinstalación

Durante la desinstalación, se mostrará una pregunta:

**"¿Desea eliminar también los datos de usuario (base de datos, backups y logs)?"**

#### Opción 1: Conservar Datos ✅

- **Marcar "No"** o dejar sin marcar
- **Se conservan:**
  - Base de datos (`resortes.db`)
  - Backups en `AppData/Roaming/ResortesPuertoMontt/data/backups/`
  - Logs en `AppData/Roaming/ResortesPuertoMontt/logs/`
- **Útil para:** Reinstalación futura o migración

#### Opción 2: Eliminar Datos ❌

- **Marcar "Sí"**
- **Se eliminan:**
  - Base de datos completa
  - Todos los backups
  - Todos los logs
- **⚠️ ADVERTENCIA:** Esta acción es irreversible
- **Útil para:** Empezar desde cero o liberar espacio

### Ubicación de Datos

Si conservas los datos, están en:

```
C:\Users\[Usuario]\AppData\Roaming\ResortesPuertoMontt\
├── data/
│   ├── resortes.db          # Base de datos principal
│   └── backups/             # Backups automáticos y manuales
└── logs/                    # Logs de la aplicación
    ├── app-YYYY-MM-DD.log
    └── error-YYYY-MM-DD.log
```

---

## 🔧 SOLUCIÓN DE PROBLEMAS

### Problema: "No se puede ejecutar el instalador"

**Solución:**
1. Hacer clic derecho en el instalador
2. Seleccionar "Ejecutar como administrador"
3. Si persiste, verificar que el archivo no esté corrupto

---

### Problema: "Error al iniciar la aplicación"

**Solución:**
1. **Verificar permisos:**
   - Hacer clic derecho en el acceso directo
   - "Propiedades" → "Compatibilidad"
   - Marcar "Ejecutar como administrador"

2. **Verificar espacio en disco:**
   - Asegurar al menos 500 MB libres
   - Especialmente en `C:\`

3. **Verificar antivirus:**
   - Agregar excepción para la aplicación
   - Ubicación: `C:\Program Files\Resortes Puerto Montt\`

---

### Problema: "La base de datos no se puede crear"

**Solución:**
1. **Verificar permisos de escritura:**
   - Ubicación: `C:\Users\[Usuario]\AppData\Roaming\`
   - Asegurar permisos de lectura/escritura

2. **Ejecutar como administrador:**
   - Cerrar la aplicación
   - Hacer clic derecho → "Ejecutar como administrador"

3. **Verificar espacio en disco:**
   - Asegurar espacio suficiente

---

### Problema: "Los datos no se guardan"

**Solución:**
1. **Verificar permisos:**
   - `AppData/Roaming/ResortesPuertoMontt/` debe tener permisos de escritura

2. **Verificar que la aplicación no esté en modo solo lectura:**
   - Propiedades del directorio de datos

3. **Revisar logs:**
   - Ubicación: `AppData/Roaming/ResortesPuertoMontt/logs/error-*.log`
   - Buscar errores recientes

---

### Problema: "La aplicación se cierra inesperadamente"

**Solución:**
1. **Revisar logs de errores:**
   - `AppData/Roaming/ResortesPuertoMontt/logs/error-*.log`

2. **Verificar que no haya otro proceso ejecutándose:**
   - Administrador de tareas
   - Buscar "Resortes Puerto Montt"
   - Cerrar procesos duplicados

3. **Reiniciar el equipo**

4. **Si persiste:**
   - Restaurar desde backup
   - O contactar soporte con los logs de error

---

### Problema: "Backup no se crea"

**Solución:**
1. **Verificar espacio en disco:**
   - Los backups ocupan espacio (similar al tamaño de la BD)

2. **Verificar permisos:**
   - `AppData/Roaming/ResortesPuertoMontt/data/backups/` debe tener permisos de escritura

3. **Crear backup manual:**
   - Ir a "Configuración" → "Backups"
   - "Crear Backup"

---

### Problema: "La búsqueda es muy lenta"

**Solución:**
1. **Esperar 200ms después de escribir:**
   - La búsqueda tiene un pequeño delay para no saturar

2. **Usar términos más específicos:**
   - En lugar de "filtro", usar "filtro aceite"

3. **Verificar cantidad de registros:**
   - Si hay más de 10,000 repuestos, puede ser más lento
   - Considerar limpiar repuestos inactivos

---

### Problema: "Los formularios no responden"

**Solución:**
1. **Cerrar y volver a abrir el formulario**

2. **Reiniciar la aplicación**

3. **Si persiste:**
   - Verificar logs de errores
   - Contactar soporte

---

## 📞 SOPORTE TÉCNICO

### Información para Reportar Problemas

Al contactar soporte, proporcionar:

1. **Versión del sistema:**
   - Se muestra en "Configuración" → "Acerca de"
   - O en el título de la ventana

2. **Sistema operativo:**
   - Windows 10/11
   - Versión exacta (Win + R → `winver`)

3. **Descripción del problema:**
   - Qué estabas haciendo
   - Qué error aparece (si hay)
   - Capturas de pantalla (si es posible)

4. **Logs de error:**
   - Ubicación: `AppData/Roaming/ResortesPuertoMontt/logs/error-*.log`
   - Enviar las últimas 50 líneas

### Contacto

- **Email:** info@resortespuertomontt.cl
- **Teléfono:** +56 9 1234 5678

---

## 📝 NOTAS IMPORTANTES

### Ubicación de Archivos

**Instalación:**
- `C:\Program Files\Resortes Puerto Montt\`

**Datos:**
- `C:\Users\[Usuario]\AppData\Roaming\ResortesPuertoMontt\`

**Backups:**
- `C:\Users\[Usuario]\AppData\Roaming\ResortesPuertoMontt\data\backups\`

**Logs:**
- `C:\Users\[Usuario]\AppData\Roaming\ResortesPuertoMontt\logs\`

### Recomendaciones

1. **Hacer backups regulares:**
   - Semanalmente o antes de actualizaciones importantes

2. **No mover archivos manualmente:**
   - Los datos están en ubicaciones específicas
   - Moverlos puede causar problemas

3. **Mantener espacio en disco:**
   - Los backups ocupan espacio
   - Limpiar backups antiguos periódicamente

4. **No editar la base de datos manualmente:**
   - Usar solo la aplicación
   - Editar manualmente puede corromper datos

---

**Última actualización:** 2025-11-03  
**Versión:** 1.1.2

