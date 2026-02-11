# Instalador y arquitectura – Resortes Puerto Montt

## 1. Qué es el .exe que tienes (y qué es NSIS)

**Lo que necesitas:** Un solo archivo `.exe` que el cliente ejecute, instale el programa y pueda usarlo en su notebook.

**Lo que tienes:** El archivo **`Resortes Puerto Montt-Setup.exe`** (en la carpeta `release`) es exactamente eso: el instalador. El cliente solo tiene que:

1. Copiar ese .exe al notebook (o llevarlo en USB).
2. Ejecutarlo (doble clic).
3. Seguir los pasos (carpeta de instalación, atajos).
4. Abrir “Resortes Puerto Montt” desde el escritorio o el menú Inicio.

**Qué es NSIS:** Es el nombre de la tecnología con la que se generó ese instalador (Nullsoft Scriptable Install System). Es algo interno del proceso de construcción: tú no instalas NSIS en el cliente ni haces nada extra. Para el cliente solo existe “un .exe que instala el programa”. Ese .exe ya está generado y es el que debe usar.

---

## 2. Cómo funciona la aplicación (visión simple)

- **Un solo programa de escritorio** que el cliente instala en Windows.
- **Todo corre en el notebook:** no hace falta internet ni servidor.
- **Datos en el mismo PC:** clientes, vehículos, cotizaciones, órdenes, inventario, etc. se guardan en una base de datos encriptada en el equipo.
- **Uso:** abrir el programa → gestionar negocio (altas, edición, listados, informes, backups).

No hay pasos ocultos: instalar el .exe y usar el programa.

---

## 3. Análisis de arquitectura (como arquitecto de software)

### 3.1 Stack tecnológico

| Capa | Tecnología | Rol |
|------|------------|-----|
| Escritorio | **Electron** | Aplicación Windows, ventana, menús, acceso a disco y a la BD |
| Interfaz | **React** (Vite) | Pantallas, formularios, listados, navegación |
| Comunicación | **IPC** (preload + `invoke`) | La interfaz pide datos al proceso principal; el proceso principal usa la BD |
| Datos | **SQLCipher** (@journeyapps/sqlcipher) | Base de datos SQLite encriptada en disco |
| Clave | **EncryptionKeyService** | Genera/guarda la clave de encriptación en `userData/keys` |

Todo es local: no hay servidor externo ni dependencia de internet para el uso normal.

### 3.2 Flujo de arranque (crítico para que “funcione sin problemas”)

1. **Electron arranca** → `app.whenReady()`.
2. **Rutas de datos:** se usa `app.getPath('userData')`:
   - En Windows instalado: típicamente `C:\Users\<usuario>\AppData\Roaming\Resortes Puerto Montt\`.
   - Ahí se crean `data\` (BD y backups) y `keys\` (clave de encriptación).
3. **Carpeta `data`:** si no existe, se crea con `fs.mkdirSync(dataDir, { recursive: true })`. Así la app no depende de que el instalador cree esas carpetas.
4. **Base de datos:** se llama a `DatabaseService.create()` y se **espera** (await) a que termine antes de seguir.
5. **Solo después** se crea la ventana (`createWindow()`) y se carga la interfaz.

Conclusión: la ventana no se muestra hasta que la BD está lista. Eso evita errores del tipo “base de datos no inicializada” al abrir.

### 3.3 Dónde se guardan los datos (importante para el cliente)

- **App empaquetada (instalada):**  
  `userData` = `%APPDATA%\Resortes Puerto Montt` (por usuario).
- **Base de datos:** `userData\data\resortes.db` (encriptada con SQLCipher).
- **Clave:** `userData\keys\` (generada/guardada automáticamente).
- **Backups:** `userData\backups\` (y lógica de backup automático en código).
- **Logs:** `userData\logs\`.

Todo queda en el equipo del usuario; un solo usuario por instalación (una carpeta por usuario de Windows).

### 3.4 Comunicación proceso principal ↔ interfaz

- **Preload** (`preload.ts`) expone una API acotada al renderer vía `contextBridge` (patrón recomendado en Electron).
- La UI (React) solo llama a `window.electronAPI.*` (ej. `getClientesPaginated`, `saveCotizacionConDetalles`, etc.).
- Esas llamadas son `ipcRenderer.invoke('...')` que en el proceso principal (`main.ts`) están registradas con `ipcMain.handle(...)` y delegan en `DatabaseService`.

La separación está bien definida: la BD solo se toca desde el proceso principal; la interfaz no tiene acceso directo al sistema de archivos ni a la BD.

### 3.5 Carga de la interfaz en producción

- **Desarrollo:** se usa Vite en `localhost` (puerto configurado).
- **Instalado (empaquetado):** `mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))` — se sirve el HTML/JS compilado desde dentro del .exe, sin red.

Por tanto, en el notebook del cliente no hay dependencia de internet para que la app funcione.

### 3.6 Integración entre tecnologías

- **Electron ↔ React:** correcta: carga de `index.html` y API vía preload.
- **Electron ↔ SQLCipher:** correcta: la BD se abre en el proceso principal con rutas derivadas de `userData`; la clave se obtiene de `EncryptionKeyService`.
- **Instalador ↔ App:** el instalador pone los archivos en `Program Files` (o la ruta elegida); la app al ejecutarse usa `userData` para datos; no hay conflicto.

No se ven capas mal acopladas para el objetivo “instalar en un notebook y gestionar el negocio”.

### 3.7 Puntos de riesgo (y cómo están resueltos)

| Riesgo | Implementación actual |
|--------|------------------------|
| Ventana abierta antes de que la BD esté lista | Se hace `await DatabaseService.create()` antes de `createWindow()`. |
| Carpeta de datos inexistente o sin permisos | Se crea `userData/data` al inicio y se muestra un mensaje claro si falla. |
| Clave distinta a la BD (reinstalación, etc.) | Existe lógica de recuperación (respaldar y crear BD nueva) y flujo de “instalación limpia” con marcador. |
| Antivirus o permisos bloqueando la app | El mensaje de error al iniciar sugiere revisar antivirus y espacio en disco. |

Para un uso en un solo notebook, con un usuario, el diseño es coherente.

### 3.8 Conclusión del análisis

- Las tecnologías están bien elegidas para una app de escritorio local (Electron + React + SQLCipher).
- La integración entre proceso principal, BD, clave e interfaz está bien delimitada y es adecuada para el caso de uso.
- El flujo de arranque evita usar la BD antes de tiempo y la app no depende de red para funcionar.
- El instalador que tienes (**Resortes Puerto Montt-Setup.exe**) es el que debe usarse para instalar en el notebook del cliente; no hace falta explicar NSIS al cliente ni instalar nada más.

---

## 4. Qué hacer en la práctica

1. **Entregar al cliente:** el archivo **`release\Resortes Puerto Montt-Setup.exe`**.
2. **En el notebook del cliente:** ejecutar ese .exe, completar la instalación, abrir el programa desde el escritorio o el menú Inicio.
3. **Uso:** gestionar clientes, vehículos, cotizaciones, órdenes, inventario, etc. Todo queda guardado en ese mismo PC.

Si algo falla (por ejemplo, error al iniciar), el mensaje que muestra la app y los logs en `userData\logs` son el siguiente paso para diagnosticar (antivirus, permisos, espacio en disco).
