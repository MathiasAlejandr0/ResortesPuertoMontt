import { app, BrowserWindow, ipcMain, Menu, shell, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { DatabaseService } from '../database/database';
import {
  ClienteSchema,
  VehiculoSchema,
  CotizacionSchema,
  DetalleCotizacionSchema,
  OrdenTrabajoSchema,
  DetalleOrdenSchema,
  RepuestoSchema,
  ServicioSchema,
  PaginationSchema,
  SaveClienteConVehiculosSchema,
  SaveCotizacionConDetallesSchema,
  SaveOrdenTrabajoConDetallesSchema,
  validateData,
  safeValidate,
} from './validation-schemas';
import { persistentLogger } from './logger-persistente';
import { ExcelImportService } from './services/ExcelImportService';
import { getInvoiceParserService } from './services/InvoiceParserService';

let mainWindow: BrowserWindow;
let dbService: DatabaseService | null = null;
let excelImportService: ExcelImportService | null = null;

// Desactivar Autofill completamente para evitar mensajes de error benignos en la consola
// Esto debe hacerse ANTES de que la app esté lista
app.commandLine.appendSwitch('disable-features', 'AutofillServerCommunication,AutofillClient,Autofill');
app.commandLine.appendSwitch('disable-autofill', '');
app.commandLine.appendSwitch('disable-ipc-flooding-protection');
// Suprimir errores de consola de DevTools relacionados con Autofill
app.commandLine.appendSwitch('disable-dev-shm-usage');

// Interceptar errores de consola del proceso principal para filtrar errores benignos
const originalStdErrWrite = process.stderr.write.bind(process.stderr);
process.stderr.write = (chunk: any, encoding?: any, callback?: any) => {
  const message = chunk?.toString() || '';
  
  // Filtrar errores benignos de DevTools y Autofill
  const isAutofillError = 
    message.includes('Request Autofill.enable failed') || 
    message.includes('Request Autofill.setAddresses failed') ||
    message.includes("'Autofill.enable' wasn't found") ||
    message.includes("'Autofill.setAddresses' wasn't found");
  
  const isDevToolsError = 
    message.includes('Unknown VE context') ||
    message.includes('language-mismatch') ||
    (message.includes('ERROR:CONSOLE') && (
      message.includes('devtools://devtools') ||
      message.includes('Autofill') ||
      message.includes('VE context')
    ));
  
  if (isAutofillError || isDevToolsError) {
    // Silenciar estos errores
    if (callback) callback();
    return true;
  }
  
  // Para otros errores, escribir normalmente
  return originalStdErrWrite(chunk, encoding, callback);
};

// Función helper para obtener rutas correctas
function getPaths() {
  if (app.isPackaged) {
    const userDataPath = app.getPath('userData');
    return {
      dbPath: path.join(userDataPath, 'data', 'resortes.db'),
      dataDir: path.join(userDataPath, 'data'),
      backupDir: path.join(userDataPath, 'backups')
    };
  } else {
    return {
      dbPath: path.join(__dirname, '../../data/resortes.db'),
      dataDir: path.join(__dirname, '../../data'),
      backupDir: path.join(__dirname, '../../backups')
    };
  }
}

function getLogDir(): string {
  return path.join(app.getPath('userData'), 'logs');
}

function formatLogSize(bytes: number): string {
  if (!bytes || bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(2)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

function getLatestLogFile(prefix: 'app-' | 'error-'): string | null {
  const logDir = getLogDir();
  if (!fs.existsSync(logDir)) return null;
  const files = fs.readdirSync(logDir)
    .filter(file => file.startsWith(prefix) && file.endsWith('.log'))
    .map(file => ({
      name: file,
      path: path.join(logDir, file),
      mtime: fs.statSync(path.join(logDir, file)).mtime.getTime()
    }))
    .sort((a, b) => b.mtime - a.mtime);
  return files.length > 0 ? files[0].path : null;
}

function readLastLines(filePath: string, limit: number): string[] {
  if (!filePath || !fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n').filter(line => line.trim());
  return lines.slice(-limit);
}

async function createWindow(): Promise<void> {
  console.log('🚀 Iniciando creación de ventana principal...');
  
  // Crear la ventana del navegador
  mainWindow = new BrowserWindow({
    height: 900,
    width: 1400,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, '../../assets/icon.png'),
    title: 'Resortes Puerto Montt - Sistema de Gestión',
    show: false,
  });

  console.log('✅ Ventana principal creada exitosamente');

  // Maximizar la ventana al inicio
  mainWindow.maximize();
  console.log('✅ Ventana maximizada');

  // Cargar la aplicación
  const isDev = !app.isPackaged;
  console.log('🔧 Modo desarrollo:', isDev);
  
  if (isDev) {
    // Esperar para que Vite esté completamente listo
    console.log('⏳ Esperando que Vite esté listo...');
    // Arranque ultra-rápido: solo puerto 3000 (strictPort) con reintentos breves (total <= 5s)
    const http = require('http');
    const wait = (ms: number) => new Promise(r => setTimeout(r, ms));
    const preferred = Number(process.env.VITE_PORT || 3000);
    const probe3000 = () => new Promise<boolean>((resolve) => {
      try {
        const req = http.get(`http://localhost:${preferred}`, (res: any) => {
          const code = Number(res.statusCode || 0);
          resolve(code >= 200 && code < 600);
            res.destroy();
          });
          req.on('error', () => resolve(false));
        req.setTimeout(200, () => { req.destroy(); resolve(false); });
      } catch {
        resolve(false);
      }
    });

    let vitePort: number | null = null;
    for (let attempt = 0; attempt < 25; attempt++) { // 25 * (200ms timeout + 200ms wait) ≈ 10s máximo; típico < 2s
      if (await probe3000()) { vitePort = preferred; break; }
      await wait(200);
    }
    
    if (vitePort) {
      const url = `http://localhost:${vitePort}`;
      console.log(`🌐 Cargando desde: ${url}`);
      await mainWindow.loadURL(url);
      console.log(`✅ Aplicación cargada desde puerto ${vitePort}`);
    } else {
      console.error('❌ No se encontró Vite en puerto 3000 tras reintentos rápidos');
      await mainWindow.loadURL('data:text/html,<h1 style="padding:20px">Error: No se pudo conectar al servidor de desarrollo</h1>');
    }
    
    // Configurar filtro de errores de Autofill en la consola del renderer
    mainWindow.webContents.once('did-finish-load', () => {
      // Inyectar script para filtrar errores de Autofill en la consola del renderer
      mainWindow.webContents.executeJavaScript(`
        (function() {
          const originalError = console.error;
          console.error = function(...args) {
            const message = args.join(' ');
            if (message.includes('Autofill.enable') || message.includes('Autofill.setAddresses')) {
              return; // Silenciar errores de Autofill
            }
            originalError.apply(console, args);
          };
        })();
      `).catch(() => {
        // Ignorar errores al inyectar el script
      });
    });
    
    mainWindow.webContents.openDevTools();
    console.log('✅ DevTools abiertos');
  } else {
    console.log('📁 Cargando archivo:', path.join(__dirname, '../renderer/index.html'));
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // Mostrar la ventana cuando esté lista
  mainWindow.once('ready-to-show', () => {
    console.log('🎉 Ventana lista para mostrar');
    mainWindow.show();
    console.log('✅ Ventana mostrada');
  });

  // Manejar el cierre de la ventana
  mainWindow.on('closed', () => {
    console.log('❌ Ventana cerrada');
    mainWindow = null as any;
  });

  // Log cuando la página esté completamente cargada
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('✅ Página cargada completamente');
  });

  // Log de errores de carga
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('❌ Error cargando página:', errorCode, errorDescription);
  });

  // Suprimir errores benignos de DevTools y otros errores no críticos
  mainWindow.webContents.on('console-message', (event, level, message, sourceId, lineNo) => {
    const messageStr = String(message || '');
    const sourceIdStr = sourceId ? String(sourceId) : '';
    
    // Errores de Autofill (benignos)
    const isAutofillError = 
      messageStr.includes('Request Autofill.enable failed') || 
      messageStr.includes('Request Autofill.setAddresses failed') ||
      messageStr.includes('Autofill.enable') ||
      messageStr.includes('Autofill.setAddresses') ||
      messageStr.includes("'Autofill.enable' wasn't found") ||
      messageStr.includes("'Autofill.setAddresses' wasn't found");
    
    // Errores de DevTools internos (benignos)
    const isDevToolsError = 
      messageStr.includes('Unknown VE context') ||
      messageStr.includes('language-mismatch') ||
      messageStr.includes('devtools://devtools') ||
      (sourceIdStr.includes('devtools://devtools') && (
        messageStr.includes('Autofill') ||
        messageStr.includes('VE context') ||
        messageStr.includes('visual_logging')
      ));
    
    // Errores de deprecación de Vite (informativos, no críticos)
    const isViteDeprecation = 
      messageStr.includes('CJS build of Vite') ||
      messageStr.includes('deprecated');
    
    if (isAutofillError || isDevToolsError || isViteDeprecation) {
      event.preventDefault();
      return;
    }
  });
  
  // También interceptar errores de consola del proceso principal de Electron
  // Estos errores vienen directamente de Chromium/DevTools
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    const message = args.join(' ');
    
    // Filtrar errores benignos de DevTools y Autofill
    const isAutofillError = 
      message.includes('Request Autofill.enable failed') || 
      message.includes('Request Autofill.setAddresses failed') ||
      message.includes("'Autofill.enable' wasn't found") ||
      message.includes("'Autofill.setAddresses' wasn't found");
    
    const isDevToolsError = 
      message.includes('Unknown VE context') ||
      message.includes('language-mismatch') ||
      message.includes('devtools://devtools');
    
    if (!isAutofillError && !isDevToolsError) {
      originalConsoleError.apply(console, args);
    }
  };
  
  // También interceptar errores de la consola del renderer usando el evento de errores
  mainWindow.webContents.on('preload-error', (event, preloadPath, error) => {
    // Ignorar errores de preload relacionados con Autofill
    if (error && error.message && error.message.includes('Autofill')) {
      event.preventDefault();
    }
  });

  // También interceptar errores de consola del renderer
  mainWindow.webContents.on('did-fail-load', () => {
    // Silenciar errores de carga si es necesario
  });
}

// Este método se llamará cuando Electron haya terminado de inicializar
app.whenReady().then(() => {
  persistentLogger.info('🚀 Iniciando aplicación Resortes Puerto Montt...');
  console.log('🚀 Iniciando aplicación Resortes Puerto Montt...');
  console.log('📁 Directorio de trabajo:', process.cwd());
  console.log('📁 Directorio de recursos:', process.resourcesPath);
  console.log('📁 Directorio de aplicación:', app.getAppPath());
  
  try {
    // Inicializar la base de datos de forma asíncrona
    console.log('🔧 Inicializando base de datos...');
    DatabaseService.create().then(service => {
      dbService = service;
      console.log('✅ Base de datos inicializada');
      
      // Inicializar servicio de importación Excel
      excelImportService = new ExcelImportService();
      console.log('✅ Servicio de importación Excel inicializado');
    }).catch(error => {
      console.error('❌ Error inicializando base de datos:', error);
    });
  } catch (error) {
    console.error('❌ Error inicializando base de datos:', error);
  }
  
  console.log('🔧 Creando ventana principal...');
  createWindow();

  // Menú de aplicación en español, coherente con el sistema
  const isMac = process.platform === 'darwin';
  const template: any[] = [
    {
      label: 'Archivo',
      submenu: [
        {
          label: 'Nuevo Cliente',
          accelerator: 'Ctrl+N',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu:nuevo-cliente');
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Crear Backup',
          accelerator: 'Ctrl+B',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu:crear-backup');
            }
          }
        },
        {
          label: 'Ir a Configuración',
          accelerator: 'Ctrl+,',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu:ir-configuracion');
            }
          }
        },
        { type: 'separator' },
        { role: isMac ? 'close' : 'quit', label: isMac ? 'Cerrar Ventana' : 'Salir' }
      ]
    },
    {
      label: 'Ver',
      submenu: [
        { role: 'reload', label: 'Recargar' },
        { role: 'togglefullscreen', label: 'Pantalla completa' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Restablecer Zoom' },
        { role: 'zoomIn', label: 'Acercar' },
        { role: 'zoomOut', label: 'Alejar' }
      ]
    },
    {
      label: 'Ventana',
      submenu: [
        { role: 'minimize', label: 'Minimizar' },
        { role: 'zoom', label: 'Zoom' },
        ...(isMac ? [{ role: 'front', label: 'Traer al frente' }] : [])
      ]
    },
    {
      label: 'Ayuda',
      submenu: [
        {
          label: 'Manual de Usuario',
          accelerator: 'F1',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('menu:manual-usuario');
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Documentación Técnica',
          click: async () => { 
            // Abrir documentación local si existe, o mostrar mensaje
            const docsPath = path.join(app.getAppPath(), 'docs');
            if (fs.existsSync(docsPath)) {
              await shell.openPath(docsPath);
            } else {
              dialog.showMessageBox(mainWindow, {
                type: 'info',
                title: 'Documentación',
                message: 'La documentación está disponible en el menú Ayuda → Manual de Usuario',
                buttons: ['OK']
              });
            }
          }
        },
        {
          label: 'Acerca de',
          click: () => {
            if (mainWindow) {
              dialog.showMessageBox(mainWindow, {
                type: 'info',
                title: 'Acerca de Resortes Puerto Montt',
                message: 'Sistema de Gestión para Talleres Mecánicos',
                detail: `Versión: 1.1.2\n\nDesarrollado por: Mathias Jara\nEmail: mathias.jara@hotmail.com\n\nFull Stack Developer\n\nBase de datos: SQLite\nFramework: Electron + React\n\n© 2025 Resortes Puerto Montt`,
                buttons: ['Cerrar']
              });
            }
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  // Handler para guardar cliente + vehículos de forma atómica
  ipcMain.handle('save-cliente-con-vehiculos', async (_evt, payload) => {
    try {
      if (!dbService) {
        throw new Error('Base de datos no inicializada');
      }
      
      // Log para debugging (solo en desarrollo)
      if (!app.isPackaged) {
        persistentLogger.debug('📥 Payload recibido:', JSON.stringify(payload, null, 2));
        persistentLogger.debug('📥 Vehículos recibidos:', payload.vehiculos);
      }
      
      // NO modificar los vehículos aquí - la validación y transformación lo hará
      // Si el cliente es nuevo, los vehículos NO deben tener clienteId
      // El backend lo asignará después de crear el cliente
      
      // Validar entrada
      const validated = validateData(SaveClienteConVehiculosSchema, payload) as { cliente: any; vehiculos: any[] };
      if (!app.isPackaged) {
        persistentLogger.debug('✅ Datos validados:', JSON.stringify(validated, null, 2));
      }
      const result = await ensureDbService().saveClienteConVehiculos(validated.cliente, validated.vehiculos);
      return { success: true, cliente: result };
    } catch (error) {
      persistentLogger.error('❌ Error en save-cliente-con-vehiculos:', error);
      if (!app.isPackaged) {
        persistentLogger.debug('❌ Payload que causó el error:', JSON.stringify(payload, null, 2));
      }
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  });

  ipcMain.handle('repair-integrity', async () => {
    try {
      if (!dbService) {
        throw new Error('Base de datos no inicializada');
      }
      const result = await ensureDbService().repairIntegrity();
      return { success: true, result };
    } catch (error) {
      console.error('❌ Error reparando integridad:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  });

  ipcMain.handle('diagnosticar-ordenes-problemas', async () => {
    try {
      if (!dbService) {
        throw new Error('Base de datos no inicializada');
      }
      const problemas = await ensureDbService().diagnosticarOrdenesConProblemas();
      return { success: true, problemas };
    } catch (error) {
      console.error('❌ Error diagnosticando órdenes:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  });

  ipcMain.handle('perform-maintenance', async (event, force?: boolean) => {
    console.log('📞 IPC: perform-maintenance', { force });
    try {
      if (!dbService) {
        throw new Error('Base de datos no inicializada');
      }
      await ensureDbService().performMaintenance(force);
      console.log('✅ IPC: perform-maintenance exitoso');
      return { success: true };
    } catch (error) {
      console.error('❌ Error ejecutando mantenimiento:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  });

  app.on('activate', () => {
    console.log('🔄 Aplicación activada');
    if (BrowserWindow.getAllWindows().length === 0) {
      console.log('🔧 Recreando ventana principal...');
      createWindow();
    }
  });
});

// Salir cuando todas las ventanas estén cerradas
app.on('window-all-closed', () => {
  console.log('❌ Todas las ventanas cerradas');
  if (process.platform !== 'darwin') {
    console.log('🔚 Cerrando aplicación...');
    app.quit();
  }
});

// Función helper para asegurar que dbService esté inicializado
function ensureDbService(): DatabaseService {
  if (!dbService) {
    throw new Error('Base de datos no inicializada. Por favor, espera unos segundos e intenta nuevamente.');
  }
  return dbService;
}

// Configurar IPC handlers para la base de datos
ipcMain.handle('get-all-clientes', async () => {
  console.log('📞 IPC: get-all-clientes');
  try {
    const result = await ensureDbService().getAllClientes();
    console.log('✅ IPC: get-all-clientes exitoso, registros:', result.length);
    return result;
  } catch (error) {
    console.error('❌ IPC: Error obteniendo clientes:', error);
    throw error;
  }
});

ipcMain.handle('get-clientes-paginated', async (event, params) => {
  console.log('📞 IPC: get-clientes-paginated', params);
  try {
    // Validar parámetros de paginación
    const validated = validateData(PaginationSchema, params || {});
    const result = await ensureDbService().getClientesPaginated(validated.limit!, validated.offset!);
    console.log('✅ IPC: get-clientes-paginated exitoso, registros:', result.data.length);
    return result;
  } catch (error) {
    console.error('❌ IPC: Error obteniendo clientes paginados:', error);
    throw error;
  }
});

ipcMain.handle('search-clientes', async (event, searchTerm) => {
  console.log('📞 IPC: search-clientes', searchTerm);
  try {
    const result = await ensureDbService().searchClientes(searchTerm);
    console.log('✅ IPC: search-clientes exitoso, registros:', result.length);
    return result;
  } catch (error) {
    console.error('❌ IPC: Error buscando clientes:', error);
    throw error;
  }
});

ipcMain.handle('save-cliente', async (event, cliente) => {
  persistentLogger.info('📞 IPC: save-cliente');
  console.log('📞 IPC: save-cliente');
  try {
    // Validar entrada
    const clienteValidado = validateData(ClienteSchema, cliente);
    const result = await ensureDbService().saveCliente(clienteValidado);
    persistentLogger.info('✅ IPC: save-cliente exitoso');
    console.log('✅ IPC: save-cliente exitoso');
    return result;
  } catch (error) {
    persistentLogger.error('❌ IPC: Error guardando cliente', error);
    console.error('❌ IPC: Error guardando cliente:', error);
    throw error;
  }
});

ipcMain.handle('delete-cliente', async (event, id) => {
  console.log('📞 IPC: delete-cliente');
  try {
    // Validar que id sea un número positivo
    if (typeof id !== 'number' || id <= 0) {
      throw new Error('ID inválido: debe ser un número positivo');
    }
    const result = await ensureDbService().deleteCliente(id);
    console.log('✅ IPC: delete-cliente exitoso');
    return result;
  } catch (error) {
    console.error('❌ IPC: Error eliminando cliente:', error);
    throw error;
  }
});

ipcMain.handle('limpiar-duplicados-clientes', async () => {
  console.log('📞 IPC: limpiar-duplicados-clientes');
  try {
    await ensureDbService().limpiarDuplicadosClientes();
    console.log('✅ IPC: limpiar-duplicados-clientes exitoso');
    return { success: true };
  } catch (error) {
    console.error('❌ IPC: Error limpiando duplicados de clientes:', error);
    throw error;
  }
});

ipcMain.handle('get-all-vehiculos', async () => {
  console.log('📞 IPC: get-all-vehiculos');
  try {
    const result = await ensureDbService().getAllVehiculos();
    console.log('✅ IPC: get-all-vehiculos exitoso, registros:', result.length);
    return result;
  } catch (error) {
    console.error('❌ IPC: Error obteniendo vehículos:', error);
    throw error;
  }
});

ipcMain.handle('get-vehiculos-paginated', async (event, { limit = 50, offset = 0 }) => {
  console.log('📞 IPC: get-vehiculos-paginated', { limit, offset });
  try {
    const result = await ensureDbService().getVehiculosPaginated(limit, offset);
    console.log('✅ IPC: get-vehiculos-paginated exitoso, registros:', result.data.length);
    return result;
  } catch (error) {
    console.error('❌ IPC: Error obteniendo vehículos paginados:', error);
    throw error;
  }
});

ipcMain.handle('save-vehiculo', async (event, vehiculo) => {
  console.log('📞 IPC: save-vehiculo');
  try {
    // Validar entrada
    const vehiculoValidado = validateData(VehiculoSchema, vehiculo);
    const result = await ensureDbService().saveVehiculo(vehiculoValidado);
    console.log('✅ IPC: save-vehiculo exitoso');
    return result;
  } catch (error) {
    console.error('❌ IPC: Error guardando vehículo:', error);
    throw error;
  }
});

ipcMain.handle('delete-vehiculo', async (event, id) => {
  console.log('📞 IPC: delete-vehiculo');
  try {
    // Validar que id sea un número positivo
    if (typeof id !== 'number' || id <= 0) {
      throw new Error('ID inválido: debe ser un número positivo');
    }
    const result = await ensureDbService().deleteVehiculo(id);
    console.log('✅ IPC: delete-vehiculo exitoso');
    return result;
  } catch (error) {
    console.error('❌ IPC: Error eliminando vehículo:', error);
    throw error;
  }
});

ipcMain.handle('get-all-cotizaciones', async () => {
  console.log('📞 IPC: get-all-cotizaciones');
  try {
    const result = await ensureDbService().getAllCotizaciones();
    console.log('✅ IPC: get-all-cotizaciones exitoso, registros:', result.length);
    return result;
  } catch (error) {
    console.error('❌ IPC: Error obteniendo cotizaciones:', error);
    throw error;
  }
});

ipcMain.handle('get-cotizaciones-paginated', async (event, { limit = 50, offset = 0 }) => {
  console.log('📞 IPC: get-cotizaciones-paginated', { limit, offset });
  try {
    const result = await ensureDbService().getCotizacionesPaginated(limit, offset);
    console.log('✅ IPC: get-cotizaciones-paginated exitoso, registros:', result.data.length);
    return result;
  } catch (error) {
    console.error('❌ IPC: Error obteniendo cotizaciones paginadas:', error);
    throw error;
  }
});

ipcMain.handle('save-cotizacion', async (event, cotizacion) => {
  console.log('📞 IPC: save-cotizacion');
  try {
    // Validar entrada
    const cotizacionValidada = validateData(CotizacionSchema, cotizacion);
    const result = await ensureDbService().saveCotizacion(cotizacionValidada as any);
    console.log('✅ IPC: save-cotizacion exitoso');
    return result;
  } catch (error) {
    console.error('❌ IPC: Error guardando cotización:', error);
    throw error;
  }
});

ipcMain.handle('save-cotizacion-con-detalles', async (event, data) => {
  console.log('📞 IPC: save-cotizacion-con-detalles');
  try {
    // Validar entrada
    const validated = validateData(SaveCotizacionConDetallesSchema, data);
    const result = await ensureDbService().saveCotizacionConDetalles(validated.cotizacion as any, validated.detalles);
    console.log('✅ IPC: save-cotizacion-con-detalles exitoso');
    return { success: true, data: result };
  } catch (error) {
    console.error('❌ IPC: Error guardando cotización con detalles:', error);
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return { success: false, error: message };
  }
});

ipcMain.handle('delete-cotizacion', async (event, id) => {
  console.log('📞 IPC: delete-cotizacion');
  try {
    const result = await ensureDbService().deleteCotizacion(id);
    console.log('✅ IPC: delete-cotizacion exitoso');
    return result;
  } catch (error) {
    console.error('❌ IPC: Error eliminando cotización:', error);
    throw error;
  }
});

ipcMain.handle('get-detalles-cotizacion', async (event, cotizacionId) => {
  console.log('📞 IPC: get-detalles-cotizacion', cotizacionId);
  try {
    const result = await ensureDbService().getDetallesCotizacion(cotizacionId);
    console.log('✅ IPC: get-detalles-cotizacion exitoso, registros:', result.length);
    return result;
  } catch (error) {
    console.error('❌ IPC: Error obteniendo detalles de cotización:', error);
    throw error;
  }
});

ipcMain.handle('save-detalle-cotizacion', async (event, detalle) => {
  console.log('📞 IPC: save-detalle-cotizacion');
  try {
    const result = await ensureDbService().saveDetalleCotizacion(detalle);
    console.log('✅ IPC: save-detalle-cotizacion exitoso');
    return result;
  } catch (error) {
    console.error('❌ IPC: Error guardando detalle de cotización:', error);
    throw error;
  }
});

ipcMain.handle('get-all-ordenes-trabajo', async () => {
  console.log('📞 IPC: get-all-ordenes-trabajo');
  try {
    const result = await ensureDbService().getAllOrdenesTrabajo();
    console.log('✅ IPC: get-all-ordenes-trabajo exitoso, registros:', result.length);
    return result;
  } catch (error) {
    console.error('❌ IPC: Error obteniendo órdenes de trabajo:', error);
    throw error;
  }
});

ipcMain.handle('get-ordenes-trabajo-paginated', async (event, { limit = 50, offset = 0 }) => {
  console.log('📞 IPC: get-ordenes-trabajo-paginated', { limit, offset });
  try {
    const result = await ensureDbService().getOrdenesTrabajoPaginated(limit, offset);
    console.log('✅ IPC: get-ordenes-trabajo-paginated exitoso, registros:', result.data.length);
    return result;
  } catch (error) {
    console.error('❌ IPC: Error obteniendo órdenes de trabajo paginadas:', error);
    throw error;
  }
});

ipcMain.handle('save-orden-trabajo', async (event, orden) => {
  console.log('📞 IPC: save-orden-trabajo');
  try {
    // Validar entrada
    // @ts-ignore - El transform normaliza el estado correctamente
    const ordenValidada = validateData(OrdenTrabajoSchema, orden);
    const result = await ensureDbService().saveOrdenTrabajo(ordenValidada);
    console.log('✅ IPC: save-orden-trabajo exitoso');
    return { success: true, data: result };
  } catch (error) {
    console.error('❌ IPC: Error guardando orden de trabajo:', error);
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return { success: false, error: message };
  }
});

ipcMain.handle('save-orden-trabajo-con-detalles', async (event, data) => {
  console.log('📞 IPC: save-orden-trabajo-con-detalles');
  try {
    // Validar entrada
    // @ts-ignore - El transform normaliza el estado correctamente
    const validated = validateData(SaveOrdenTrabajoConDetallesSchema, data);
    const result = await ensureDbService().saveOrdenTrabajoConDetalles(validated.orden, validated.detalles);
    console.log('✅ IPC: save-orden-trabajo-con-detalles exitoso');
    return { success: true, data: result };
  } catch (error) {
    console.error('❌ IPC: Error guardando orden de trabajo con detalles:', error);
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return { success: false, error: message };
  }
});

ipcMain.handle('delete-orden-trabajo', async (event, id) => {
  console.log('📞 IPC: delete-orden-trabajo');
  try {
    const result = await ensureDbService().deleteOrdenTrabajo(id);
    console.log('✅ IPC: delete-orden-trabajo exitoso');
    return result;
  } catch (error) {
    console.error('❌ IPC: Error eliminando orden de trabajo:', error);
    throw error;
  }
});

ipcMain.handle('save-venta', async (event, ventaData) => {
  console.log('📞 IPC: save-venta');
  try {
    const result = await ensureDbService().saveVenta(ventaData);
    console.log('✅ IPC: save-venta exitoso');
    return { success: true, data: result };
  } catch (error) {
    console.error('❌ IPC: Error guardando venta:', error);
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return { success: false, error: message };
  }
});

ipcMain.handle('get-detalles-orden', async (_event, ordenId) => {
  console.log('📞 IPC: get-detalles-orden', ordenId);
  try {
    const result = await ensureDbService().getDetallesOrden(Number(ordenId));
    console.log('✅ IPC: get-detalles-orden exitoso, registros:', result.length);
    return result;
  } catch (error) {
    console.error('❌ IPC: Error obteniendo detalles de orden:', error);
    throw error;
  }
});

// Handlers para cuotas de pago
ipcMain.handle('get-all-cuotas-pago', async () => {
  console.log('📞 IPC: get-all-cuotas-pago');
  try {
    const result = await ensureDbService().getAllCuotasPago();
    console.log('✅ IPC: get-all-cuotas-pago exitoso, registros:', result.length);
    return result;
  } catch (error) {
    console.error('❌ IPC: Error obteniendo cuotas de pago:', error);
    throw error;
  }
});

ipcMain.handle('get-cuotas-pago-by-orden', async (_event, ordenId) => {
  console.log('📞 IPC: get-cuotas-pago-by-orden', ordenId);
  try {
    const result = await ensureDbService().getCuotasPagoByOrden(Number(ordenId));
    console.log('✅ IPC: get-cuotas-pago-by-orden exitoso, registros:', result.length);
    return result;
  } catch (error) {
    console.error('❌ IPC: Error obteniendo cuotas de orden:', error);
    throw error;
  }
});

ipcMain.handle('get-cuotas-pendientes', async () => {
  console.log('📞 IPC: get-cuotas-pendientes');
  try {
    const result = await ensureDbService().getCuotasPendientes();
    console.log('✅ IPC: get-cuotas-pendientes exitoso, registros:', result.length);
    return result;
  } catch (error) {
    console.error('❌ IPC: Error obteniendo cuotas pendientes:', error);
    throw error;
  }
});

ipcMain.handle('save-cuotas-pago', async (_event, cuotas) => {
  console.log('📞 IPC: save-cuotas-pago');
  try {
    const result = await ensureDbService().saveCuotasPago(cuotas);
    console.log('✅ IPC: save-cuotas-pago exitoso, registros:', result.length);
    return { success: true, data: result };
  } catch (error) {
    console.error('❌ IPC: Error guardando cuotas de pago:', error);
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return { success: false, error: message };
  }
});

ipcMain.handle('confirmar-pago-cuota', async (_event, { cuotaId, montoPagado, fechaPago, observaciones }) => {
  console.log('📞 IPC: confirmar-pago-cuota', cuotaId);
  try {
    const result = await ensureDbService().confirmarPagoCuota(
      Number(cuotaId),
      Number(montoPagado),
      fechaPago,
      observaciones
    );
    console.log('✅ IPC: confirmar-pago-cuota exitoso');
    return { success: true, data: result };
  } catch (error) {
    console.error('❌ IPC: Error confirmando pago de cuota:', error);
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return { success: false, error: message };
  }
});

ipcMain.handle('actualizar-estados-cuotas-vencidas', async () => {
  console.log('📞 IPC: actualizar-estados-cuotas-vencidas');
  try {
    await ensureDbService().actualizarEstadosCuotasVencidas();
    console.log('✅ IPC: actualizar-estados-cuotas-vencidas exitoso');
    return { success: true };
  } catch (error) {
    console.error('❌ IPC: Error actualizando estados de cuotas vencidas:', error);
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return { success: false, error: message };
  }
});

ipcMain.handle('save-detalle-orden', async (event, detalle) => {
  console.log('📞 IPC: save-detalle-orden');
  try {
    const result = await ensureDbService().saveDetalleOrden(detalle);
    console.log('✅ IPC: save-detalle-orden exitoso');
    return result;
  } catch (error) {
    console.error('❌ IPC: Error guardando detalle de orden:', error);
    throw error;
  }
});

ipcMain.handle('delete-detalles-orden', async (event, ordenId) => {
  console.log('📞 IPC: delete-detalles-orden', ordenId);
  try {
    await ensureDbService().deleteDetallesOrden(Number(ordenId));
    console.log('✅ IPC: delete-detalles-orden exitoso');
    return { success: true };
  } catch (error) {
    console.error('❌ IPC: Error eliminando detalles de orden:', error);
    throw error;
  }
});

ipcMain.handle('get-all-repuestos', async () => {
  console.log('📞 IPC: get-all-repuestos');
  try {
    const result = await ensureDbService().getAllRepuestos();
    console.log('✅ IPC: get-all-repuestos exitoso, registros:', result.length);
    return result;
  } catch (error) {
    console.error('❌ IPC: Error obteniendo repuestos:', error);
    throw error;
  }
});

ipcMain.handle('get-repuestos-paginated', async (event, { limit = 50, offset = 0 }) => {
  console.log('📞 IPC: get-repuestos-paginated', { limit, offset });
  try {
    const result = await ensureDbService().getRepuestosPaginated(limit, offset);
    console.log('✅ IPC: get-repuestos-paginated exitoso, registros:', result.data.length);
    return result;
  } catch (error) {
    console.error('❌ IPC: Error obteniendo repuestos paginados:', error);
    throw error;
  }
});

ipcMain.handle('search-repuestos', async (event, searchTerm) => {
  console.log('📞 IPC: search-repuestos', searchTerm);
  try {
    const result = await ensureDbService().searchRepuestos(searchTerm);
    console.log('✅ IPC: search-repuestos exitoso, registros:', result.length);
    return result;
  } catch (error) {
    console.error('❌ IPC: Error buscando repuestos:', error);
    throw error;
  }
});

ipcMain.handle('save-repuesto', async (event, repuesto) => {
  console.log('📞 IPC: save-repuesto');
  try {
    // Validar entrada
    const repuestoValidado = validateData(RepuestoSchema, repuesto);
    const result = await ensureDbService().saveRepuesto(repuestoValidado as any);
    console.log('✅ IPC: save-repuesto exitoso');
    return result;
  } catch (error) {
    console.error('❌ IPC: Error guardando repuesto:', error);
    throw error;
  }
});

ipcMain.handle('delete-repuesto', async (event, id: number) => {
  console.log('📞 IPC: delete-repuesto, id:', id);
  try {
    const result = await ensureDbService().deleteRepuesto(id);
    console.log('✅ IPC: delete-repuesto exitoso');
    return result;
  } catch (error) {
    console.error('❌ IPC: Error eliminando repuesto:', error);
    throw error;
  }
});

ipcMain.handle('get-all-servicios', async () => {
  console.log('📞 IPC: get-all-servicios');
  try {
    const result = await ensureDbService().getAllServicios();
    console.log('✅ IPC: get-all-servicios exitoso, registros:', result.length);
    return result;
  } catch (error) {
    console.error('❌ IPC: Error obteniendo servicios:', error);
    throw error;
  }
});

ipcMain.handle('save-servicio', async (event, servicio) => {
  console.log('📞 IPC: save-servicio');
  try {
    // Validar entrada
    const servicioValidado = validateData(ServicioSchema, servicio);
    const result = await ensureDbService().saveServicio(servicioValidado as any);
    console.log('✅ IPC: save-servicio exitoso');
    return result;
  } catch (error) {
    console.error('❌ IPC: Error guardando servicio:', error);
    throw error;
  }
});

// Handler para obtener estadísticas de la base de datos
ipcMain.handle('get-database-stats', async () => {
  try {
    const dbService = await ensureDbService();
    const stats = await dbService.getDatabaseStats();
    console.log('📊 Estadísticas de BD obtenidas');
    return { success: true, stats };
  } catch (error) {
    console.error('Error obteniendo estadísticas de BD:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
  }
});

// Handler para verificar si la BD necesita mantenimiento
ipcMain.handle('database-needs-maintenance', async () => {
  try {
    const dbService = await ensureDbService();
    const needsMaintenance = await dbService.needsMaintenance();
    return { success: true, needsMaintenance };
  } catch (error) {
    console.error('Error verificando mantenimiento de BD:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
  }
});

ipcMain.handle('get-all-configuracion', async () => {
  console.log('📞 IPC: get-all-configuracion');
  try {
    const result = await ensureDbService().getAllConfiguracion();
    console.log('✅ IPC: get-all-configuracion exitoso, registros:', result.length);
    return result;
  } catch (error) {
    console.error('❌ IPC: Error obteniendo configuración:', error);
    throw error;
  }
});

ipcMain.handle('save-configuracion', async (event, config) => {
  console.log('📞 IPC: save-configuracion');
  try {
    const result = await ensureDbService().saveConfiguracion(config);
    console.log('✅ IPC: save-configuracion exitoso');
    return result;
  } catch (error) {
    console.error('❌ IPC: Error guardando configuración:', error);
    throw error;
  }
});

// Funciones de Backup
ipcMain.handle('create-backup', async () => {
  try {
    const paths = getPaths();
    
    // Crear directorio de backups si no existe
    if (!fs.existsSync(paths.backupDir)) {
      fs.mkdirSync(paths.backupDir, { recursive: true });
    }
    
    // Generar nombre único para el backup
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `backup-${timestamp}.db`;
    const backupPath = path.join(paths.backupDir, backupFileName);
    
    // Copiar la base de datos
    fs.copyFileSync(paths.dbPath, backupPath);
    
    // Obtener el tamaño del archivo
    const stats = fs.statSync(backupPath);
    const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
    
    // Eliminar backups antiguos (mantener solo los últimos 5)
    const backupFiles = fs.readdirSync(paths.backupDir)
      .filter((file: string) => file.startsWith('backup-') && file.endsWith('.db'))
      .map((file: string) => ({
        name: file,
        path: path.join(paths.backupDir, file),
        time: fs.statSync(path.join(paths.backupDir, file)).mtime.getTime()
      }))
      .sort((a: any, b: any) => b.time - a.time);
    
    // Eliminar backups antiguos si hay más de 5
    if (backupFiles.length > 5) {
      for (let i = 5; i < backupFiles.length; i++) {
        fs.unlinkSync(backupFiles[i].path);
      }
    }
    
    return {
      success: true,
      backupPath,
      size: `${sizeInMB} MB`,
      timestamp
    };
  } catch (error) {
    console.error('Error creando backup:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
});

ipcMain.handle('restore-backup', async (event, backupId) => {
  try {
    const paths = getPaths();
    
    // Intentar encontrar el backup (puede ser manual o automático)
    let backupPath = path.join(paths.backupDir, `backup-${backupId}.db`);
    if (!fs.existsSync(backupPath)) {
      backupPath = path.join(paths.backupDir, `auto-backup-${backupId}.db`);
    }
    
    const dbPath = paths.dbPath;
    
    // Verificar que el backup existe
    if (!fs.existsSync(backupPath)) {
      throw new Error('Backup no encontrado');
    }
    
    // Crear backup de la base de datos actual antes de restaurar
    const currentBackupPath = path.join(paths.backupDir, `pre-restore-${Date.now()}.db`);
    fs.copyFileSync(dbPath, currentBackupPath);
    
    // Restaurar el backup
    fs.copyFileSync(backupPath, dbPath);
    
    return {
      success: true,
      message: 'Sistema restaurado exitosamente'
    };
  } catch (error) {
    console.error('Error restaurando backup:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
});

ipcMain.handle('delete-backup', async (event, backupId) => {
  try {
    const paths = getPaths();
    
    // Intentar encontrar el backup (puede ser manual o automático)
    let backupPath = path.join(paths.backupDir, `backup-${backupId}.db`);
    if (!fs.existsSync(backupPath)) {
      backupPath = path.join(paths.backupDir, `auto-backup-${backupId}.db`);
    }
    
    // Verificar que el backup existe
    if (!fs.existsSync(backupPath)) {
      throw new Error('Backup no encontrado');
    }
    
    // Eliminar el backup
    fs.unlinkSync(backupPath);
    
    return {
      success: true,
      message: 'Backup eliminado exitosamente'
    };
  } catch (error) {
    console.error('Error eliminando backup:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
});

ipcMain.handle('get-backups', async () => {
  try {
    const paths = getPaths();
    
    if (!fs.existsSync(paths.backupDir)) {
      return [];
    }
    
    // Incluir tanto backups manuales como automáticos
    const backupFiles = fs.readdirSync(paths.backupDir)
      .filter((file: string) => (file.startsWith('backup-') || file.startsWith('auto-backup-')) && file.endsWith('.db'))
      .map((file: string) => {
        const filePath = path.join(paths.backupDir, file);
        const stats = fs.statSync(filePath);
        const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
        
        // Determinar tipo de backup y extraer ID
        const isAuto = file.startsWith('auto-backup-');
        const id = isAuto 
          ? file.replace('auto-backup-', '').replace('.db', '')
          : file.replace('backup-', '').replace('.db', '');
        
        return {
          id,
          fileName: file,
          size: `${sizeInMB} MB`,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime,
          tipo: isAuto ? 'automatico' : 'manual'
        };
      })
      .sort((a: any, b: any) => b.createdAt - a.createdAt);
    
    return backupFiles;
  } catch (error) {
    console.error('Error obteniendo backups:', error);
    return [];
  }
});

// Handlers para visor y exportación de logs
ipcMain.handle('get-logs-summary', async () => {
  try {
    const logDir = getLogDir();
    if (!fs.existsSync(logDir)) {
      return { files: [], recent: { app: [], error: [] }, logDir };
    }

    const files = fs.readdirSync(logDir)
      .filter(file => file.endsWith('.log'))
      .map(file => {
        const filePath = path.join(logDir, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          size: formatLogSize(stats.size),
          sizeBytes: stats.size,
          updatedAt: stats.mtime.toISOString(),
          createdAt: stats.birthtime.toISOString()
        };
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    const latestAppLog = getLatestLogFile('app-');
    const latestErrorLog = getLatestLogFile('error-');

    const recentAppLines = latestAppLog ? readLastLines(latestAppLog, 120) : [];
    const recentErrorLines = latestErrorLog ? readLastLines(latestErrorLog, 120) : [];

    return {
      files,
      recent: {
        app: recentAppLines,
        error: recentErrorLines
      },
      logDir
    };
  } catch (error) {
    console.error('Error obteniendo logs:', error);
    return {
      files: [],
      recent: { app: [], error: [] },
      logDir: getLogDir(),
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
});

ipcMain.handle('open-logs-folder', async () => {
  try {
    const logDir = getLogDir();
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    const result = await shell.openPath(logDir);
    if (result) {
      return { success: false, error: result };
    }
    return { success: true, path: logDir };
  } catch (error) {
    console.error('Error abriendo carpeta de logs:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
  }
});

ipcMain.handle('export-logs', async () => {
  try {
    const logDir = getLogDir();
    if (!fs.existsSync(logDir)) {
      return { success: false, error: 'No existen logs para exportar' };
    }

    const logFiles = fs.readdirSync(logDir).filter(file => file.endsWith('.log'));
    if (logFiles.length === 0) {
      return { success: false, error: 'No existen logs para exportar' };
    }

    const result = await dialog.showOpenDialog({
      title: 'Seleccionar carpeta de destino',
      properties: ['openDirectory', 'createDirectory']
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, canceled: true };
    }

    const destinationRoot = result.filePaths[0];
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const exportDir = path.join(destinationRoot, `ResortesPuertoMontt-logs-${timestamp}`);

    fs.mkdirSync(exportDir, { recursive: true });

    for (const file of logFiles) {
      const srcPath = path.join(logDir, file);
      const destPath = path.join(exportDir, file);
      fs.copyFileSync(srcPath, destPath);
    }

    return { success: true, path: exportDir, files: logFiles.length };
  } catch (error) {
    console.error('Error exportando logs:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
  }
});

// Handlers para importación de datos
ipcMain.handle('importar-repuestos', async (event, datos) => {
  try {
    console.log('Importando repuestos:', datos.length, 'elementos');
    await ensureDbService().importarRepuestosDesdeJSON(datos);
    console.log('Importación completada exitosamente');
    return {
      exitosos: datos.length,
      errores: 0
    };
  } catch (error) {
    console.error('Error importando repuestos:', error);
    return {
      exitosos: 0,
      errores: 1,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
});

ipcMain.handle('limpiar-repuestos', async () => {
  try {
    await ensureDbService().limpiarRepuestos();
    return { success: true, message: 'Repuestos eliminados exitosamente' };
  } catch (error) {
    console.error('Error limpiando repuestos:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
});

ipcMain.handle('limpiar-servicios', async () => {
  try {
    await ensureDbService().limpiarServicios();
    return { success: true, message: 'Servicios eliminados exitosamente' };
  } catch (error) {
    console.error('Error limpiando servicios:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
});

ipcMain.handle('limpiar-clientes', async () => {
  try {
    await ensureDbService().limpiarClientes();
    return { success: true, message: 'Clientes eliminados exitosamente' };
  } catch (error) {
    console.error('Error limpiando clientes:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
});

ipcMain.handle('obtener-estadisticas-repuestos', async () => {
  try {
    const estadisticas = await ensureDbService().obtenerEstadisticasRepuestos();
    return estadisticas;
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    return {
      total: 0,
      conStock: 0,
      sinStock: 0,
      categorias: []
    };
  }
});

// Handler para abrir diálogo y procesar archivo Excel e importar repuestos
// Migrado a ExcelImportService para mayor seguridad (reemplaza xlsx por exceljs)
ipcMain.handle('procesar-excel-repuestos', async (event) => {
  persistentLogger.info('📥 IPC: procesar-excel-repuestos - Iniciando');
  
  try {
    // Validar que el servicio esté inicializado
    if (!excelImportService) {
      excelImportService = new ExcelImportService();
    }

    if (!dbService) {
      throw new Error('Base de datos no inicializada. Por favor, espera unos segundos e intenta nuevamente.');
    }

    // Abrir diálogo de selección de archivo
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Seleccionar archivo Excel para importar',
      filters: [
        { name: 'Archivos Excel', extensions: ['xlsx', 'xls'] },
        { name: 'Todos los archivos', extensions: ['*'] }
      ],
      properties: ['openFile']
    });

    if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
      return {
        success: false,
        error: 'No se seleccionó ningún archivo',
        cantidad: 0
      };
    }

    const filePath = result.filePaths[0];
    persistentLogger.info(`📥 IPC: procesar-excel-repuestos - Archivo seleccionado: ${filePath}`);

    // Procesar archivo usando ExcelImportService (seguro)
    const importResult = await excelImportService.processExcelFile(filePath);

    // Validar que hay datos válidos
    if (importResult.datosValidos.length === 0) {
      return {
        success: false,
        error: 'No se encontraron repuestos válidos en el archivo Excel. ' +
               `Total procesados: ${importResult.totalProcesados}, Errores: ${importResult.totalErrores}`,
        cantidad: 0,
        erroresDetallados: importResult.erroresDetallados.slice(0, 10) // Primeros 10 errores
      };
    }

    // Guardar en la base de datos
    // Nota: importarRepuestosDesdeJSON espera un array de objetos con la estructura de Repuesto
    // Los datos ya están validados por Zod en ExcelImportService
    await ensureDbService().importarRepuestosDesdeJSON(importResult.datosValidos);

    persistentLogger.info(
      `✅ IPC: procesar-excel-repuestos - Importación exitosa. ` +
      `Válidos: ${importResult.datosValidos.length}, Errores: ${importResult.totalErrores}`
    );

    return {
      success: true,
      message: `Se importaron ${importResult.datosValidos.length} repuestos exitosamente. ` +
               (importResult.totalErrores > 0 
                 ? `${importResult.totalErrores} filas tuvieron errores y fueron omitidas.` 
                 : ''),
      cantidad: importResult.datosValidos.length,
      totalProcesados: importResult.totalProcesados,
      totalErrores: importResult.totalErrores,
      erroresDetallados: importResult.totalErrores > 0 
        ? importResult.erroresDetallados.slice(0, 10) // Primeros 10 errores para mostrar
        : []
    };

  } catch (error) {
    // Manejo robusto de errores con mensajes amigables
    let errorMessage = 'Error desconocido al procesar el archivo Excel';
    
    if (error instanceof Error) {
      // Errores específicos con mensajes amigables
      if (error.message.includes('timeout') || error.message.includes('Timeout')) {
        errorMessage = 'El archivo tardó demasiado en procesarse. Por favor, intenta con un archivo más pequeño o verifica que no esté corrupto.';
      } else if (error.message.includes('corrupto') || error.message.includes('corrupt')) {
        errorMessage = 'El archivo Excel está corrupto o no es un archivo válido. Por favor, verifica el archivo e intenta nuevamente.';
      } else if (error.message.includes('password') || error.message.includes('contraseña')) {
        errorMessage = 'El archivo Excel está protegido con contraseña. Por favor, desprotege el archivo antes de importarlo.';
      } else if (error.message.includes('firma') || error.message.includes('signature')) {
        errorMessage = 'El archivo no es un archivo Excel válido. Por favor, verifica que el archivo tenga extensión .xlsx o .xls';
      } else {
        errorMessage = error.message;
      }
    }

    persistentLogger.error('❌ IPC: procesar-excel-repuestos - Error:', error);
    
    return {
      success: false,
      error: errorMessage,
      cantidad: 0
    };
  }
});

ipcMain.handle('procesar-excel-servicios', async () => {
  persistentLogger.info('📥 IPC: procesar-excel-servicios - Iniciando');

  try {
    if (!excelImportService) {
      excelImportService = new ExcelImportService();
    }

    if (!dbService) {
      throw new Error('Base de datos no inicializada. Por favor, espera unos segundos e intenta nuevamente.');
    }

    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Seleccionar archivo Excel para importar servicios',
      filters: [
        { name: 'Archivos Excel', extensions: ['xlsx', 'xls'] },
        { name: 'Todos los archivos', extensions: ['*'] }
      ],
      properties: ['openFile']
    });

    if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
      return {
        success: false,
        error: 'No se seleccionó ningún archivo',
        cantidad: 0
      };
    }

    const filePath = result.filePaths[0];
    persistentLogger.info(`📥 IPC: procesar-excel-servicios - Archivo seleccionado: ${filePath}`);

    const importResult = await excelImportService.processServiciosFile(filePath);
    if (importResult.datosValidos.length === 0) {
      return {
        success: false,
        error: 'No se encontraron servicios válidos en el archivo Excel. ' +
               `Total procesados: ${importResult.totalProcesados}, Errores: ${importResult.totalErrores}`,
        cantidad: 0,
        erroresDetallados: importResult.erroresDetallados.slice(0, 10)
      };
    }

    let errores = 0;
    for (const servicio of importResult.datosValidos) {
      try {
        await ensureDbService().saveServicio(servicio as any);
      } catch (error) {
        errores++;
        console.error('Error guardando servicio importado:', error);
      }
    }

    return {
      success: true,
      cantidad: importResult.datosValidos.length,
      errores
    };
  } catch (error) {
    console.error('Error procesando Excel de servicios:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
      cantidad: 0
    };
  }
});

ipcMain.handle('procesar-excel-clientes', async () => {
  persistentLogger.info('📥 IPC: procesar-excel-clientes - Iniciando');

  try {
    if (!excelImportService) {
      excelImportService = new ExcelImportService();
    }

    if (!dbService) {
      throw new Error('Base de datos no inicializada. Por favor, espera unos segundos e intenta nuevamente.');
    }

    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Seleccionar archivo Excel para importar clientes',
      filters: [
        { name: 'Archivos Excel', extensions: ['xlsx', 'xls'] },
        { name: 'Todos los archivos', extensions: ['*'] }
      ],
      properties: ['openFile']
    });

    if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
      return {
        success: false,
        error: 'No se seleccionó ningún archivo',
        cantidad: 0
      };
    }

    const filePath = result.filePaths[0];
    persistentLogger.info(`📥 IPC: procesar-excel-clientes - Archivo seleccionado: ${filePath}`);

    const importResult = await excelImportService.processClientesFile(filePath);
    if (importResult.datosValidos.length === 0) {
      return {
        success: false,
        error: 'No se encontraron clientes válidos en el archivo Excel. ' +
               `Total procesados: ${importResult.totalProcesados}, Errores: ${importResult.totalErrores}`,
        cantidad: 0,
        erroresDetallados: importResult.erroresDetallados.slice(0, 10)
      };
    }

    let errores = 0;
    for (const cliente of importResult.datosValidos) {
      try {
        await ensureDbService().saveCliente(cliente as any);
      } catch (error) {
        errores++;
        console.error('Error guardando cliente importado:', error);
      }
    }

    return {
      success: true,
      cantidad: importResult.datosValidos.length,
      errores
    };
  } catch (error) {
    console.error('Error procesando Excel de clientes:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
      cantidad: 0
    };
  }
});

// Handler para escanear factura con OCR
ipcMain.handle('scan-invoice', async (event) => {
  persistentLogger.info('📥 IPC: scan-invoice - Iniciando');
  
  try {
    if (!dbService) {
      throw new Error('Base de datos no inicializada. Por favor, espera unos segundos e intenta nuevamente.');
    }

    // Abrir diálogo de selección de archivo (PDF o imagen)
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Seleccionar factura para procesar (PDF o Imagen)',
      filters: [
        { name: 'PDFs', extensions: ['pdf'] },
        { name: 'Imágenes', extensions: ['jpg', 'jpeg', 'png', 'bmp'] },
        { name: 'Todos los archivos', extensions: ['*'] }
      ],
      properties: ['openFile']
    });

    if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
      return {
        success: false,
        error: 'No se seleccionó ninguna imagen',
        items: [],
        textoCompleto: '',
        imagenProcesada: null
      };
    }

    const filePath = result.filePaths[0];
    persistentLogger.info(`📥 IPC: scan-invoice - Archivo seleccionado: ${filePath}`);

    // Obtener servicio de parser (híbrido: PDF + OCR)
    const parserService = getInvoiceParserService();
    
    // Parsear factura (detecta automáticamente PDF o imagen)
    const parseResult = await parserService.parseInvoice(filePath);

    // Convertir imagen procesada a base64 para enviar al renderer (solo si es imagen)
    let imagenProcesadaBase64: string | null = null;
    if (parseResult.imagenProcesada) {
      imagenProcesadaBase64 = `data:image/png;base64,${parseResult.imagenProcesada.toString('base64')}`;
    }

    // Leer archivo original para enviar al renderer
    let imagenOriginalBase64: string | null = null;
    try {
      const extension = path.extname(filePath).toLowerCase();
      
      // Solo leer como imagen si no es PDF
      if (extension !== '.pdf') {
        const imagenOriginal = fs.readFileSync(filePath);
        const mimeType = extension === '.png' ? 'image/png' : 
                         extension === '.jpg' || extension === '.jpeg' ? 'image/jpeg' : 
                         'image/png';
        imagenOriginalBase64 = `data:${mimeType};base64,${imagenOriginal.toString('base64')}`;
      }
    } catch (error) {
      persistentLogger.warn('No se pudo leer archivo original para preview:', error);
    }

    persistentLogger.info(
      `✅ IPC: scan-invoice - Parseo completado. ` +
      `Tipo: ${parseResult.sourceType}, Items: ${parseResult.items.length}, Baja confianza: ${parseResult.totalConBajaConfianza}`
    );

    return {
      success: true,
      items: parseResult.items,
      textoCompleto: parseResult.textoCompleto,
      imagenOriginal: imagenOriginalBase64,
      imagenProcesada: imagenProcesadaBase64,
      totalProcesados: parseResult.totalProcesados,
      totalConBajaConfianza: parseResult.totalConBajaConfianza,
      errores: parseResult.errores,
      sourceType: parseResult.sourceType
    };

  } catch (error) {
    let errorMessage = 'Error desconocido al escanear la factura';
    
    if (error instanceof Error) {
      if (error.message.includes('No se pudo extraer texto')) {
        errorMessage = 'No se pudo extraer texto de la imagen. Por favor, verifica que la imagen sea clara y legible.';
      } else if (error.message.includes('corrupto') || error.message.includes('corrupt')) {
        errorMessage = 'La imagen está corrupta o no es un archivo válido. Por favor, verifica el archivo e intenta nuevamente.';
      } else {
        errorMessage = error.message;
      }
    }

    persistentLogger.error('❌ IPC: scan-invoice - Error:', error);
    
    return {
      success: false,
      error: errorMessage,
      items: [],
      textoCompleto: '',
      imagenOriginal: null,
      imagenProcesada: null,
      sourceType: 'image'
    };
  }
});

// ========== HANDLERS PARA CAJA DIARIA ==========

ipcMain.handle('get-estado-caja', async () => {
  try {
    const estado = await ensureDbService().getEstadoCaja();
    return estado;
  } catch (error: any) {
    persistentLogger.error('❌ IPC: get-estado-caja - Error:', error);
    return null;
  }
});

ipcMain.handle('abrir-caja', async (_event, montoInicial: number, observaciones?: string) => {
  try {
    const estado = await ensureDbService().abrirCaja(montoInicial, observaciones);
    return estado;
  } catch (error: any) {
    persistentLogger.error('❌ IPC: abrir-caja - Error:', error);
    throw error;
  }
});

ipcMain.handle('cerrar-caja', async (_event, montoFinal: number, observaciones?: string) => {
  try {
    const estado = await ensureDbService().cerrarCaja(montoFinal, observaciones);
    return estado;
  } catch (error: any) {
    persistentLogger.error('❌ IPC: cerrar-caja - Error:', error);
    throw error;
  }
});

ipcMain.handle('registrar-movimiento-caja', async (_event, movimiento: any) => {
  try {
    const mov = await ensureDbService().registrarMovimientoCaja(movimiento);
    return mov;
  } catch (error: any) {
    persistentLogger.error('❌ IPC: registrar-movimiento-caja - Error:', error);
    throw error;
  }
});

ipcMain.handle('get-movimientos-caja-por-fecha', async (_event, fecha: string) => {
  try {
    const movimientos = await ensureDbService().getMovimientosCajaPorFecha(fecha);
    return movimientos;
  } catch (error: any) {
    persistentLogger.error('❌ IPC: get-movimientos-caja-por-fecha - Error:', error);
    return [];
  }
});

ipcMain.handle('get-arqueo-caja', async (_event, fecha: string) => {
  try {
    const arqueo = await ensureDbService().getArqueoCaja(fecha);
    return arqueo;
  } catch (error: any) {
    persistentLogger.error('❌ IPC: get-arqueo-caja - Error:', error);
    throw error;
  }
});

// ========== HANDLERS PARA COMISIONES DE TÉCNICOS ==========

ipcMain.handle('calcular-y-guardar-comision', async (_event, ordenId: number, tecnicoId: number | null, tecnicoNombre: string, porcentajeComision: number) => {
  try {
    const comision = await ensureDbService().calcularYGuardarComision(ordenId, tecnicoId, tecnicoNombre, porcentajeComision);
    return comision;
  } catch (error: any) {
    persistentLogger.error('❌ IPC: calcular-y-guardar-comision - Error:', error);
    throw error;
  }
});

ipcMain.handle('get-reporte-comisiones', async (_event, mes: string) => {
  try {
    const comisiones = await ensureDbService().getReporteComisiones(mes);
    return comisiones;
  } catch (error: any) {
    persistentLogger.error('❌ IPC: get-reporte-comisiones - Error:', error);
    return [];
  }
});

ipcMain.handle('get-resumen-comisiones-por-tecnico', async (_event, mes: string) => {
  try {
    const resumen = await ensureDbService().getResumenComisionesPorTecnico(mes);
    return resumen;
  } catch (error: any) {
    persistentLogger.error('❌ IPC: get-resumen-comisiones-por-tecnico - Error:', error);
    return [];
  }
});

// ========== HANDLERS PARA AGENDA ==========

ipcMain.handle('update-fecha-programada', async (_event, ordenId: number, fechaProgramada: string) => {
  try {
    const orden = await ensureDbService().actualizarFechaProgramada(ordenId, fechaProgramada);
    return { success: true, data: orden };
  } catch (error: any) {
    persistentLogger.error('❌ IPC: update-fecha-programada - Error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-ordenes-para-agenda', async (_event, fechaInicio: string, fechaFin: string) => {
  try {
    const ordenes = await ensureDbService().getOrdenesParaAgenda(fechaInicio, fechaFin);
    return ordenes;
  } catch (error: any) {
    persistentLogger.error('❌ IPC: get-ordenes-para-agenda - Error:', error);
    return [];
  }
});
