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

// Importar XLSX usando require ya que es una librería CommonJS
const XLSX = require('xlsx');

let mainWindow: BrowserWindow;
let dbService: DatabaseService | null = null;

// Desactivar Autofill completamente para evitar mensajes de error benignos en la consola
// Esto debe hacerse ANTES de que la app esté lista
app.commandLine.appendSwitch('disable-features', 'AutofillServerCommunication,AutofillClient,Autofill');
app.commandLine.appendSwitch('disable-autofill', '');
app.commandLine.appendSwitch('disable-ipc-flooding-protection');
// Suprimir errores de consola de DevTools relacionados con Autofill
app.commandLine.appendSwitch('disable-dev-shm-usage');

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

  // Suprimir errores benignos de Autofill en DevTools
  // Nota: Estos errores son benignos y no afectan la funcionalidad
  // Son generados por Chromium DevTools al intentar acceder a APIs de Autofill que están deshabilitadas
  mainWindow.webContents.on('console-message', (event, level, message, sourceId, lineNo) => {
    // Filtrar errores benignos de Autofill
    const messageStr = String(message || '');
    const sourceIdStr = sourceId ? String(sourceId) : '';
    
    const isAutofillError = 
      messageStr.includes('Request Autofill.enable failed') || 
      messageStr.includes('Request Autofill.setAddresses failed') ||
      messageStr.includes('Autofill.enable') ||
      messageStr.includes('Autofill.setAddresses') ||
      messageStr.includes("'Autofill.enable' wasn't found") ||
      messageStr.includes("'Autofill.setAddresses' wasn't found") ||
      (sourceIdStr.includes('devtools') && messageStr.includes('Autofill')) ||
      (sourceIdStr.includes('devtools://devtools') && messageStr.includes('Autofill'));
    
    if (isAutofillError) {
      // Prevenir que estos mensajes se muestren en la consola
      event.preventDefault();
      return;
    }
  });
  
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
ipcMain.handle('procesar-excel-repuestos', async (event) => {
  try {
    // Abrir diálogo de selección de archivo
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Seleccionar archivo Excel para importar',
      filters: [
        { name: 'Archivos Excel', extensions: ['xlsx', 'xls', 'csv'] },
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
    console.log('Procesando archivo Excel:', filePath);
    
    if (!fs.existsSync(filePath)) {
      throw new Error('El archivo no existe');
    }

    // Leer el archivo Excel
    const workbook = XLSX.readFile(filePath);
    const sheetNames = workbook.SheetNames;
    console.log('Hojas disponibles:', sheetNames);

    // Intentar detectar el formato del Excel
    let worksheet = null;
    let formato = 'plantilla'; // Por defecto asumimos plantilla

    // Buscar hoja "Repuestos" o "COD SAP MANG "
    if (sheetNames.includes('Repuestos')) {
      worksheet = workbook.Sheets['Repuestos'];
      formato = 'plantilla';
    } else if (sheetNames.includes('COD SAP MANG ')) {
      worksheet = workbook.Sheets['COD SAP MANG '];
      formato = 'inventario';
    } else if (sheetNames.length > 0) {
      // Usar la primera hoja disponible
      worksheet = workbook.Sheets[sheetNames[0]];
      formato = 'plantilla';
    }

    if (!worksheet) {
      throw new Error('No se encontró una hoja válida en el archivo Excel');
    }

    // Convertir a JSON con headers para detectar columnas dinámicamente
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    if (!jsonData || jsonData.length < 2) {
      throw new Error('El archivo Excel no contiene suficientes datos');
    }

    // Detectar headers en la primera fila
    const headerRow: any = jsonData[0];
    const headers: { [key: string]: number } = {};
    
    // Mapear headers a índices de columna según la estructura exacta del Excel:
    // SKU, Nombre, Categoría, Estado, Precio Unitario (precio uni), Precio Costo
    headerRow.forEach((header: any, index: number) => {
      if (header) {
        const headerLower = String(header).toLowerCase().trim();
        
        // SKU (código del producto) - priorizar "sku" exacto
        if (headerLower === 'sku') {
          if (!headers['codigo']) headers['codigo'] = index;
        } else if (headerLower === 'codigo' || headerLower === 'código' || headerLower === 'cod man') {
          if (!headers['codigo']) headers['codigo'] = index;
        } else if (headerLower.includes('sku') || headerLower.includes('codigo') || headerLower.includes('código')) {
          if (!headers['codigo']) headers['codigo'] = index;
        }
        
        // Nombre (nombre completo del producto)
        if (headerLower === 'nombre' || headerLower === 'name') {
          headers['nombre'] = index;
        } else if (headerLower.includes('nombre') && !headerLower.includes('descripcion')) {
          if (!headers['nombre']) headers['nombre'] = index;
        }
        
        // Descripción (opcional, puede no estar en el Excel)
        if (headerLower === 'descripcion' || headerLower === 'descripción' || headerLower === 'description') {
          if (!headers['descripcion']) headers['descripcion'] = index;
        } else if (headerLower.includes('descripcion') || headerLower.includes('descripción')) {
          if (!headers['descripcion']) headers['descripcion'] = index;
        }
        
        // Categoría
        if (headerLower === 'categoria' || headerLower === 'categoría' || headerLower === 'category') {
          headers['categoria'] = index;
        } else if (headerLower.includes('categoria') || headerLower.includes('categoría')) {
          if (!headers['categoria']) headers['categoria'] = index;
        }
        
        // Estado (ignorar, no tiene información según el usuario)
        // No se mapea
        
        // Precio Unitario (precio de venta) - buscar "precio uni" o "precio unitario" primero
        if (headerLower === 'precio uni' || headerLower === 'precio unit' || headerLower === 'precio unitario') {
          headers['precio'] = index;
        } else if (headerLower === 'precio venta' || headerLower === 'precio de venta') {
          headers['precio'] = index;
        } else if (headerLower === 'precio' || headerLower === 'price') {
          // Solo usar "precio" como precio de venta si no hay "precio costo" ya detectado
          if (!headers['precioCosto'] && !headers['precio']) {
            headers['precio'] = index;
          }
        } else if (headerLower.includes('precio') && !headerLower.includes('costo') && !headerLower.includes('uni')) {
          if (!headers['precio'] && !headers['precioCosto']) headers['precio'] = index;
        }
        
        // Precio Costo (precio de compra) - buscar "precio costo" exacto
        if (headerLower === 'precio costo' || headerLower === 'precio de costo') {
          headers['precioCosto'] = index;
        } else if (headerLower === 'costo' && !headers['precioCosto']) {
          // Solo usar "costo" si no hay "precio costo" ya detectado
          headers['precioCosto'] = index;
        } else if (headerLower.includes('precio') && headerLower.includes('costo')) {
          if (!headers['precioCosto']) headers['precioCosto'] = index;
        }
        
        // Stock
        if (headerLower.includes('stock') && !headerLower.includes('minimo') && !headerLower.includes('mínimo')) {
          if (!headers['stock']) headers['stock'] = index;
        }
        
        // Stock Mínimo
        if (headerLower.includes('stock') && (headerLower.includes('minimo') || headerLower.includes('mínimo'))) {
          headers['stockMinimo'] = index;
        }
        
        // Marca
        if (headerLower === 'marca' || headerLower === 'brand') {
          headers['marca'] = index;
        } else if (headerLower.includes('marca')) {
          if (!headers['marca']) headers['marca'] = index;
        }
        
        // Ubicación
        if (headerLower === 'ubicacion' || headerLower === 'ubicación' || headerLower === 'location') {
          headers['ubicacion'] = index;
        } else if (headerLower.includes('ubicacion') || headerLower.includes('ubicación')) {
          if (!headers['ubicacion']) headers['ubicacion'] = index;
        }
      }
    });

    console.log('Headers detectados:', headers);

    const repuestos: any[] = [];

    // Procesar filas de datos (empezar desde la fila 1, saltando el header)
    for (let i = 1; i < jsonData.length; i++) {
      const row: any = jsonData[i];
      if (!row || row.length === 0) continue;

      // Extraer datos según los headers detectados
      // Estructura del Excel: SKU, Nombre, Categoría, Estado, Precio Unitario (precio uni), Precio Costo
      const codigo = headers['codigo'] !== undefined && row[headers['codigo']] !== undefined 
        ? String(row[headers['codigo']]).trim() : '';
      const nombre = headers['nombre'] !== undefined && row[headers['nombre']] !== undefined 
        ? String(row[headers['nombre']]).trim() : '';
      // Usar el nombre completo como descripción si no hay columna de descripción
      const descripcion = headers['descripcion'] !== undefined && row[headers['descripcion']] !== undefined 
        ? String(row[headers['descripcion']]).trim() : nombre; // Usar nombre completo como descripción
      const categoriaRaw = headers['categoria'] !== undefined && row[headers['categoria']] !== undefined 
        ? String(row[headers['categoria']]).trim() : '';
      const categoria = categoriaRaw || 'General'; // Solo usar 'General' si realmente está vacío
      
      // Precio de venta (Precio Unitario / "precio uni" del Excel)
      const precio = headers['precio'] !== undefined && row[headers['precio']] !== undefined 
        ? parseFloat(String(row[headers['precio']]).replace(/[^0-9.,-]/g, '').replace(',', '.')) || 0 : 0;
      
      // Precio de costo (Precio Costo del Excel - valor que compra el dueño del taller)
      const precioCosto = headers['precioCosto'] !== undefined && row[headers['precioCosto']] !== undefined 
        ? parseFloat(String(row[headers['precioCosto']]).replace(/[^0-9.,-]/g, '').replace(',', '.')) || 0 : 0;
      
      // Stock y stock mínimo (pueden no estar en el Excel, usar 0 por defecto)
      const stock = headers['stock'] !== undefined && row[headers['stock']] !== undefined 
        ? parseInt(String(row[headers['stock']])) || 0 : 0;
      const stockMinimo = headers['stockMinimo'] !== undefined && row[headers['stockMinimo']] !== undefined 
        ? parseInt(String(row[headers['stockMinimo']])) || 0 : 0;
      
      // Marca y ubicación (pueden no estar en el Excel)
      const marca = headers['marca'] !== undefined && row[headers['marca']] !== undefined 
        ? String(row[headers['marca']]).trim() : '';
      const ubicacion = headers['ubicacion'] !== undefined && row[headers['ubicacion']] !== undefined 
        ? String(row[headers['ubicacion']]).trim() : 'Almacén';

      // Solo agregar si tiene código (SKU) o nombre (al menos uno es requerido)
      if (codigo || nombre) {
        repuestos.push({
          codigo: codigo || `SKU-${nombre.substring(0, 15)}`, // Usar nombre como código si no hay SKU
          nombre: nombre || codigo, // Usar nombre completo del Excel
          descripcion: descripcion || nombre || codigo, // Usar nombre completo como descripción
          precio, // Precio de venta (Precio Unitario / "precio uni" del Excel)
          precioCosto, // Precio de costo (Precio Costo del Excel - valor de compra)
          stock,
          stockMinimo,
          categoria: categoria || 'General', // Categoría del Excel
          marca,
          ubicacion,
          activo: true
        });
      }
    }

    if (repuestos.length === 0) {
      throw new Error('No se encontraron repuestos válidos en el archivo Excel');
    }

    console.log(`Procesados ${repuestos.length} repuestos del Excel`);

    // Guardar en la base de datos
    await ensureDbService().importarRepuestosDesdeJSON(repuestos);

    return {
      success: true,
      message: `Se importaron ${repuestos.length} repuestos exitosamente`,
      cantidad: repuestos.length
    };
  } catch (error) {
    console.error('Error procesando Excel:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido al procesar el archivo Excel',
      cantidad: 0
    };
  }
});
