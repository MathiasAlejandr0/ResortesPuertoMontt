// Migrado a SQLCipher para encriptación AES-256-CBC (compliance OWASP, GDPR, ISO 27001)
import * as sqlcipher from '@journeyapps/sqlcipher';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { retryWithBackoff } from './retry-utils';
import { EncryptionKeyService } from '../main/services/EncryptionKeyService';

// Type alias para compatibilidad con código existente
type Database = sqlcipher.Database;

export interface Usuario {
  id?: number;
  nombre: string;
  email: string;
  password: string;
  rol: string;
  activo: boolean;
  fechaCreacion?: string;
}

export interface Cliente {
  id?: number;
  nombre: string;
  rut: string;
  telefono: string;
  email?: string | null;
  direccion?: string;
  fechaRegistro?: string;
  activo?: boolean;
}

export interface Vehiculo {
  id?: number;
  clienteId: number;
  marca: string;
  modelo: string;
  año: number;
  patente: string;
  numeroChasis?: string;
  color?: string;
  kilometraje?: number;
  observaciones?: string;
  activo?: boolean;
}

export interface Servicio {
  id?: number;
  nombre: string;
  descripcion: string;
  precio: number;
  duracionEstimada: number;
  activo: boolean;
}

export interface Repuesto {
  id?: number;
  codigo: string;
  nombre: string;
  descripcion: string;
  precio: number; // Precio de venta
  precioCosto?: number; // Precio de costo
  stock: number;
  stockMinimo: number;
  categoria: string;
  marca: string;
  ubicacion: string;
  activo: boolean;
}

export interface Cotizacion {
  id?: number;
  numero: string;
  clienteId: number;
  vehiculoId: number;
  fecha: string;
  validaHasta: string;
  estado: string;
  descripcion: string;
  observaciones?: string;
  total: number;
}

export interface OrdenTrabajo {
  id?: number;
  numero: string;
  clienteId: number;
  vehiculoId: number;
  fechaIngreso: string;
  fechaEntrega?: string;
  estado: string;
  descripcion: string;
  observaciones?: string;
  total: number;
  kilometrajeEntrada?: number;
  kilometrajeSalida?: number;
  prioridad?: string;
  tecnicoAsignado?: string;
  metodoPago?: 'Efectivo' | 'Débito' | 'Crédito';
  numeroCuotas?: number;
  fechaPago?: string;
  fechaProgramada?: string;
}

export interface Recordatorio {
  id?: number;
  clienteId?: number | null;
  vehiculoId?: number | null;
  tipo: string;
  kilometraje?: number | null;
  fechaAviso: string;
  observaciones?: string;
  estado: 'Pendiente' | 'Enviado';
  fechaCreacion?: string;
  fechaEnvio?: string | null;
}

export interface DetalleCotizacion {
  id?: number;
  cotizacionId: number;
  tipo: 'servicio' | 'repuesto';
  servicioId?: number;
  repuestoId?: number;
  cantidad: number;
  precio: number;
  subtotal: number;
  descripcion: string;
}

export interface DetalleOrden {
  id?: number;
  ordenId: number;
  tipo: 'servicio' | 'repuesto';
  servicioId?: number;
  repuestoId?: number;
  cantidad: number;
  precio: number;
  subtotal: number;
  descripcion: string;
}

export interface CuotaPago {
  id?: number;
  ordenId: number;
  numeroCuota: number;
  fechaVencimiento: string;
  monto: number;
  montoPagado?: number;
  fechaPago?: string;
  estado: 'Pendiente' | 'Pagada' | 'Vencida';
  observaciones?: string;
}

export interface Venta {
  id?: number;
  numero: string;
  clienteId?: number;
  clienteNombre?: string;
  clienteRut?: string;
  clienteTelefono?: string;
  clienteEmail?: string;
  fecha: string;
  total: number;
  metodoPago?: 'Efectivo' | 'Débito' | 'Crédito';
  observaciones?: string;
}

export interface DetalleVenta {
  id?: number;
  ventaId: number;
  repuestoId: number;
  cantidad: number;
  precio: number;
  subtotal: number;
  descripcion: string;
}

export interface MovimientoCaja {
  id?: number;
  tipo: 'ingreso' | 'egreso';
  monto: number;
  descripcion: string;
  metodo_pago?: 'Efectivo' | 'Débito' | 'Crédito' | 'Transferencia';
  fecha: string;
  ordenId?: number;
  caja_abierta?: boolean;
}

export interface EstadoCaja {
  id?: number;
  fecha_apertura: string;
  fecha_cierre?: string;
  monto_inicial: number;
  monto_final?: number;
  estado: 'abierta' | 'cerrada';
  observaciones?: string;
}

export interface ComisionTecnico {
  id?: number;
  ordenId: number;
  tecnicoId?: number;
  tecnicoNombre: string;
  monto_mano_obra: number;
  porcentaje_comision: number;
  monto_comision: number;
  fecha_calculo: string;
  mes_referencia: string;
}

export interface PagoTrabajador {
  id?: number;
  trabajadorId?: number;
  trabajadorNombre: string;
  trabajadorRut?: string;
  concepto: string;
  monto_efectivo: number;
  monto_otros: number;
  metodo_pago?: string;
  comentario?: string;
  fecha: string;
  descontar_caja?: boolean;
  caja_id?: number | null;
}

export interface Proveedor {
  id?: number;
  nombre: string;
  tipoContribuyente?: string;
  direccionFiscal?: string;
  nombreFantasia?: string;
  identificacionTributaria?: string;
  ciudadFiscal?: string;
  telefono?: string;
  email?: string;
  personaContacto?: string;
  telefonoAlternativo?: string;
  emailAlternativo?: string;
  comentario?: string;
  activo?: boolean;
  fechaCreacion?: string;
}

export interface Categoria {
  id?: number;
  nombre: string;
  activo?: boolean;
  fechaCreacion?: string;
}

// Caché LRU simple para queries frecuentes
class QueryCache {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private maxSize = 100; // Máximo 100 queries en caché
  private maxAge = 30000; // 30 segundos

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (item && Date.now() - item.timestamp < this.maxAge) {
      return item.data;
    }
    if (item) {
      this.cache.delete(key); // Eliminar si expiró
    }
    return null;
  }

  set(key: string, data: any): void {
    // Si el caché está lleno, eliminar el más antiguo
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value as string | undefined;
      if (typeof firstKey === 'string') {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }
}

export class DatabaseService {
  private db: Database | null = null;
  
  // Type guard para verificar que db esté inicializado
  private ensureDb(): Database {
    if (!this.db) {
      throw new Error('Base de datos no inicializada. Asegúrate de llamar a DatabaseService.create() primero.');
    }
    return this.db;
  }
  private encryptionKeyService: EncryptionKeyService;
  private encryptionKey: Buffer | null = null;
  private lastBackupTime: number = 0;
  private backupInterval: number = 5 * 60 * 1000; // 5 minutos - evita generar demasiados backups durante trabajo activo
  private lastMaintenanceTime: number = 0;
  private maintenanceInterval: number = 7 * 24 * 60 * 60 * 1000; // 7 días - mantenimiento semanal
  private queryCache: QueryCache = new QueryCache();
  private isInitialized: boolean = false;

  private constructor() {
    // Inicializar servicio de gestión de claves
    this.encryptionKeyService = new EncryptionKeyService();
  }

  // Factory method asíncrono para inicialización con encriptación
  static async create(): Promise<DatabaseService> {
    const instance = new DatabaseService();
    await instance.initializeDatabaseAsync();
    instance.isInitialized = true;
    // Log solo en desarrollo
    if (!app.isPackaged) {
      console.log('✅ DatabaseService: Base de datos encriptada inicializada');
    }
    return instance;
  }

  /**
   * Inicializa la base de datos con encriptación SQLCipher
   * Incluye migración automática de bases de datos legacy (sin encriptar) a encriptadas
   * 
   * Flujo de Migración:
   * 1. Detecta si existe resortes.db
   * 2. Intenta abrirla con clave de encriptación
   * 3. Si falla, intenta sin clave (legacy)
   * 4. Si es legacy, migra datos usando ATTACH DATABASE y sqlcipher_export
   * 5. Reemplazo atómico: backup legacy + renombrado seguro
   */
  private async initializeDatabaseAsync(): Promise<void> {
    try {
      // 1. Obtener o generar clave de encriptación
      this.encryptionKey = await this.encryptionKeyService.getOrCreateEncryptionKey();
      
      if (!this.encryptionKeyService.validateKey(this.encryptionKey)) {
        throw new Error('Clave de encriptación inválida. Debe tener 32 bytes (256 bits)');
      }

      const paths = this.getPaths();
      const keyHex = this.encryptionKey.toString('hex');
      
      // Crear directorio de datos si no existe
      if (!fs.existsSync(paths.dataDir)) {
        fs.mkdirSync(paths.dataDir, { recursive: true });
      }

      // 2. Verificar si existe base de datos legacy (sin encriptar)
      const dbExists = fs.existsSync(paths.dbPath);
      let needsMigration = false;
      let legacyDb: sqlcipher.Database | null = null;

      if (!dbExists) {
        console.log('📋 No existe base de datos. Se creará una nueva base de datos encriptada...');
      } else {
        console.log('📋 Detectada base de datos existente. Verificando si requiere migración...');
        
        // Intentar abrir con clave de encriptación
        const testDb = new sqlcipher.Database(paths.dbPath);
        const canOpenWithKey = await new Promise<boolean>((resolve) => {
          testDb.serialize(() => {
            testDb.run(`PRAGMA key = "x'${keyHex}'"`, (err: Error | null) => {
              if (err) {
                // No se puede abrir con clave, probablemente es legacy
                testDb.close();
                resolve(false);
                return;
              }
              
              // Verificar que realmente está encriptada y la clave es correcta
              // Intentar leer de sqlite_master para confirmar que la clave es válida
              testDb.get('SELECT name FROM sqlite_master WHERE type="table" LIMIT 1', (err2: Error | null, row: any) => {
                testDb.close();
                // Si no hay error y podemos leer, la clave es correcta
                // Si hay error SQLITE_NOTADB, la clave no coincide
                if (err2 && (err2 as any).code === 'SQLITE_NOTADB') {
                  console.error('❌ La clave de encriptación no coincide con la base de datos existente');
                  console.error('⚠️ Esto puede ocurrir si la clave fue regenerada pero la BD usa una clave anterior');
                  resolve(false);
                } else {
                  resolve(!err2);
                }
              });
            });
          });
        });

        if (!canOpenWithKey) {
          // Intentar abrir como legacy (sin encriptar)
          console.log('🔄 Intentando abrir como base de datos legacy (sin encriptar)...');
          legacyDb = new sqlcipher.Database(paths.dbPath);
          const canOpenLegacy = await new Promise<boolean>((resolve) => {
            legacyDb!.serialize(() => {
              // Intentar leer sin clave (modo estándar SQLite)
              legacyDb!.get('SELECT name FROM sqlite_master WHERE type="table" LIMIT 1', (err: Error | null) => {
                if (!err) {
                  // Es legacy, mantener la conexión abierta para la migración
                  resolve(true);
                } else {
                  // No es legacy, probablemente la clave no coincide
                  legacyDb!.close();
                  legacyDb = null;
                  console.error('❌ No se pudo abrir la base de datos con la clave actual ni como legacy');
                  console.error('⚠️ La base de datos puede estar encriptada con una clave diferente');
                  console.error('💡 Solución: Si tienes un backup, restáuralo. Si no, la base de datos debe ser recreada.');
                  resolve(false);
                }
              });
            });
          });

          if (canOpenLegacy && legacyDb) {
            console.log('✅ Base de datos legacy detectada (sin encriptar). Iniciando migración...');
            needsMigration = true;
          } else {
            if (legacyDb) {
              legacyDb.close();
              legacyDb = null;
            }
            // La base de datos existe pero no se puede abrir (clave incorrecta o corrupta)
            // Eliminarla y crear una nueva
            console.log('⚠️ La base de datos existe pero no se puede abrir (clave incorrecta o corrupta)');
            console.log('🗑️  Eliminando base de datos problemática y creando una nueva...');
            try {
              const backupPath = paths.dbPath + '.corrupted-' + Date.now();
              fs.renameSync(paths.dbPath, backupPath);
              console.log(`✅ Base de datos problemática respaldada en: ${path.basename(backupPath)}`);
              console.log('📋 Se creará una nueva base de datos encriptada...');
            } catch (error) {
              console.warn('⚠️ No se pudo respaldar la base de datos, eliminándola directamente...');
              try {
                fs.unlinkSync(paths.dbPath);
                console.log('✅ Base de datos problemática eliminada');
              } catch (unlinkError) {
                console.error('❌ Error eliminando base de datos:', unlinkError);
                throw new Error('No se pudo eliminar la base de datos problemática. Por favor, elimínala manualmente.');
              }
            }
            // Continuar con la creación de una nueva base de datos
          }
        } else {
          console.log('✅ Base de datos ya está encriptada y la clave coincide. Continuando con inicio normal...');
        }
      }

      // 3. Migración de datos (si es necesario)
      if (needsMigration && legacyDb) {
        // Nota: migrateLegacyDatabase no usa realmente la conexión legacyDb,
        // usa ATTACH DATABASE para adjuntar el archivo directamente
        // Pero mantenemos la conexión abierta hasta que la migración esté completa
        await this.migrateLegacyDatabase(legacyDb, paths, keyHex);
        // Cerrar la conexión legacy después de la migración
        if (legacyDb) {
          try {
            legacyDb.close();
          } catch (closeErr) {
            console.warn('⚠️ Error cerrando conexión legacy (no crítico):', closeErr);
          }
          legacyDb = null;
        }
      }

      // 4. Crear/conectar a base de datos encriptada
      this.db = new sqlcipher.Database(paths.dbPath);
      
      return new Promise((resolve, reject) => {
        if (!this.db) {
          reject(new Error('Base de datos no inicializada'));
          return;
        }

        const db = this.ensureDb();
      db.serialize(() => {
          try {
            // Configurar clave de encriptación (debe ser lo primero)
            this.db!.run(`PRAGMA key = "x'${keyHex}'"`, (err: Error | null) => {
              if (err) {
                console.error('❌ Error configurando clave de encriptación:', err);
                reject(new Error(`Error configurando encriptación: ${err.message}`));
                return;
              }

              // Verificar que la encriptación está activa y la BD está lista
              // Primero verificar versión de cipher - esto confirma que la clave es correcta
              this.db!.get('PRAGMA cipher_version', (err: Error | null, row: any) => {
                if (err) {
                  console.error('❌ Error verificando versión de cipher:', err);
                  console.error('⚠️ Esto puede indicar que la clave de encriptación no coincide con la BD');
                  reject(new Error(`Error verificando encriptación: ${err.message}. La base de datos puede estar corrupta o usar una clave diferente. Si tienes un backup, restáuralo desde la configuración.`));
                  return;
                }

                console.log('✅ SQLCipher activo:', row?.cipher_version || 'versión desconocida');
                
                // Hacer una consulta simple para verificar que la BD está accesible
                this.db!.get('SELECT 1 as test', (err2: Error | null, row2: any) => {
                  if (err2) {
                    console.error('❌ Error verificando acceso a base de datos:', err2);
                    const errorCode = (err2 as any).code;
                    if (errorCode === 'SQLITE_NOTADB') {
                      reject(new Error(`La clave de encriptación no coincide con la base de datos. Esto puede ocurrir si la clave fue regenerada. Si tienes un backup, restáuralo. Si no, necesitarás recrear la base de datos.`));
                    } else {
                      reject(new Error(`Error accediendo a base de datos: ${err2.message}`));
                    }
                    return;
                  }

                  // Hacer una consulta adicional para asegurar que la BD está completamente lista
                  this.db!.get('SELECT name FROM sqlite_master WHERE type="table" LIMIT 1', (err3: Error | null, row3: any) => {
                    if (err3) {
                      console.error('❌ Error accediendo a sqlite_master:', err3);
                      const errorCode = (err3 as any).code;
                      if (errorCode === 'SQLITE_NOTADB') {
                        reject(new Error(`La clave de encriptación no coincide con la base de datos. Esto puede ocurrir si la clave fue regenerada. Si tienes un backup, restáuralo. Si no, necesitarás recrear la base de datos.`));
                      } else {
                        console.error('⚠️ La base de datos puede estar corrupta');
                        reject(new Error(`Error accediendo a estructura de BD: ${err3.message}`));
                      }
                      return;
                    }

                    console.log('✅ Base de datos verificada y lista para PRAGMAs');

                    // Configurar algoritmo de encriptación a AES-256-CBC
                    this.db!.run('PRAGMA cipher_default_kdf_iter = 256000', (err: Error | null) => {
                    if (err) {
                      console.warn('⚠️ No se pudo configurar iteraciones KDF:', err);
                    }

                    // Habilitar foreign keys para mantener integridad referencial
                    this.db!.run('PRAGMA foreign_keys = ON', (err: Error | null) => {
                      if (err) {
                        console.warn('⚠️ No se pudo habilitar foreign keys:', err);
                      }

                      // SQLCipher puede tener problemas con WAL, usar DELETE en su lugar
                      // WAL puede causar SQLITE_NOTADB en algunas configuraciones
                      this.db!.run('PRAGMA journal_mode = DELETE', (err: Error | null) => {
                        if (err) {
                          console.warn('⚠️ No se pudo configurar journal_mode:', err);
                        }
                        
                        // Configurar synchronous (NORMAL es más seguro que OFF)
                        this.db!.run('PRAGMA synchronous = NORMAL', (err: Error | null) => {
                          if (err) {
                            console.warn('⚠️ No se pudo configurar synchronous:', err);
                          }
                          
                          // Configurar cache_size
                          this.db!.run('PRAGMA cache_size = -32000', (err: Error | null) => {
                            if (err) {
                              console.warn('⚠️ No se pudo configurar cache_size:', err);
                            }
                            
                            // Configurar temp_store
                            this.db!.run('PRAGMA temp_store = MEMORY', (err: Error | null) => {
                              if (err) {
                                console.warn('⚠️ No se pudo configurar temp_store:', err);
                              }
                              
                              // Configurar busy_timeout
                              this.db!.run('PRAGMA busy_timeout = 5000', (err: Error | null) => {
                                if (err) {
                                  console.warn('⚠️ No se pudo configurar busy_timeout:', err);
                                }

                                console.log('✅ Optimizaciones SQLCipher aplicadas');

                                // Continuar con la creación de tablas
                                // PRAGMA optimize se ejecutará después de crear las tablas
                                this.createTables()
                                  .then(() => {
                                    // Ejecutar optimize después de crear las tablas
                                    this.db!.run('PRAGMA optimize', (err: Error | null) => {
                                      if (err) {
                                        console.warn('⚠️ No se pudo ejecutar optimize:', err);
                                      }
                                      console.log('✅ Base de datos encriptada creada y configurada');
                                      resolve();
                                    });
                                  })
                                  .catch((tableError) => {
                                    reject(tableError);
                                  });
                              });
                            });
                          });
                        });
                      });
                    });
                  });
                });
              });
            });
            });
          } catch (error) {
            reject(error);
          }
        });
      });
    } catch (error) {
      console.error('❌ Error inicializando base de datos encriptada:', error);
      throw error;
    }
  }

  /**
   * Migra una base de datos legacy (sin encriptar) a una encriptada
   * Usa ATTACH DATABASE y sqlcipher_export para copiar todos los datos
   */
  private async migrateLegacyDatabase(
    legacyDb: sqlcipher.Database,
    paths: { dataDir: string; dbPath: string; backupDir: string },
    keyHex: string
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const tempEncryptedPath = path.join(paths.dataDir, 'encrypted_temp.db');
      const backupPath = paths.dbPath + '.backup_legacy';
      
      console.log('🔄 Paso 1: Creando base de datos temporal encriptada...');

      // Crear nueva base de datos encriptada temporal
      const encryptedDb = new sqlcipher.Database(tempEncryptedPath);
      
      encryptedDb.serialize(() => {
        // Configurar clave de encriptación en la nueva BD
        encryptedDb.run(`PRAGMA key = "x'${keyHex}'"`, (err: Error | null) => {
          if (err) {
            encryptedDb.close();
            reject(new Error(`Error configurando encriptación en BD temporal: ${err.message}`));
            return;
          }

          console.log('🔄 Paso 2: Adjuntando base de datos legacy...');

          // Adjuntar base de datos legacy a la nueva encriptada
          // Usar ruta absoluta para evitar problemas de path
          const legacyPathAbsolute = path.resolve(paths.dbPath);
          encryptedDb.run(`ATTACH DATABASE '${legacyPathAbsolute}' AS legacy`, (err: Error | null) => {
            if (err) {
              encryptedDb.close();
              reject(new Error(`Error adjuntando base de datos legacy: ${err.message}`));
              return;
            }

            console.log('🔄 Paso 3: Exportando datos de legacy a encriptada...');

            // Exportar todos los datos usando sqlcipher_export
            // Esto copia todas las tablas, índices, triggers, etc.
            encryptedDb.run(`SELECT sqlcipher_export('legacy')`, (err: Error | null) => {
              if (err) {
                encryptedDb.run('DETACH DATABASE legacy', () => {});
                encryptedDb.close();
                reject(new Error(`Error exportando datos: ${err.message}`));
                return;
              }

              console.log('🔄 Paso 4: Desadjuntando base de datos legacy...');

              // Desadjuntar base de datos legacy
              encryptedDb.run('DETACH DATABASE legacy', (err: Error | null) => {
                if (err) {
                  console.warn('⚠️ Error desadjuntando legacy (no crítico):', err);
                }

                encryptedDb.close((closeErr: Error | null) => {
                  if (closeErr) {
                    reject(new Error(`Error cerrando BD temporal: ${closeErr.message}`));
                    return;
                  }

                  console.log('🔄 Paso 5: Realizando reemplazo atómico...');

                  try {
                    // Reemplazo atómico:
                    // 1. Renombrar BD original a backup (por seguridad)
                    if (fs.existsSync(paths.dbPath)) {
                      fs.renameSync(paths.dbPath, backupPath);
                      console.log(`✅ Backup legacy creado: ${backupPath}`);
                    }

                    // 2. Renombrar BD temporal encriptada a nombre final
                    fs.renameSync(tempEncryptedPath, paths.dbPath);
                    console.log('✅ Base de datos migrada exitosamente a formato encriptado');

                    resolve();
                  } catch (fsError: any) {
                    // Si algo falla, intentar restaurar backup
                    if (fs.existsSync(backupPath) && !fs.existsSync(paths.dbPath)) {
                      try {
                        fs.renameSync(backupPath, paths.dbPath);
                        console.log('✅ Backup restaurado debido a error en migración');
                      } catch (restoreError) {
                        console.error('❌ Error crítico: No se pudo restaurar backup', restoreError);
                      }
                    }
                    reject(new Error(`Error en reemplazo atómico: ${fsError.message}`));
                  }
                });
              });
            });
          });
        });
      });
    });
  }

  /**
   * Función para crear backup automático
   * Los backups también están encriptados (son copias de la BD encriptada)
   */
  private async createAutoBackup(): Promise<void> {
    const now = Date.now();
    if (now - this.lastBackupTime < this.backupInterval) {
      return; // No crear backup si no ha pasado el tiempo mínimo
    }

    try {
      const paths = this.getPaths();
      
      // Crear directorio de backups si no existe
      if (!fs.existsSync(paths.backupDir)) {
        fs.mkdirSync(paths.backupDir, { recursive: true });
      }
      
      // Generar nombre único para el backup
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `auto-backup-${timestamp}.db`;
      const backupPath = path.join(paths.backupDir, backupFileName);
      
      // Copiar la base de datos (mantiene la encriptación)
      if (fs.existsSync(paths.dbPath)) {
      fs.copyFileSync(paths.dbPath, backupPath);
      
      // Eliminar backups antiguos (mantener solo los últimos 5 automáticos para optimizar espacio)
      const backupFiles = fs.readdirSync(paths.backupDir)
        .filter((file: string) => file.startsWith('auto-backup-') && file.endsWith('.db'))
        .map((file: string) => ({
          name: file,
          path: path.join(paths.backupDir, file),
          time: fs.statSync(path.join(paths.backupDir, file)).mtime.getTime()
        }))
        .sort((a: any, b: any) => b.time - a.time);
      
      // Eliminar backups antiguos si hay más de 5 (reduce uso de almacenamiento)
      if (backupFiles.length > 5) {
        for (let i = 5; i < backupFiles.length; i++) {
          fs.unlinkSync(backupFiles[i].path);
        }
      }
      
      this.lastBackupTime = now;
      console.log('✅ DatabaseService: Backup automático creado:', backupFileName);
      }
    } catch (error) {
      console.error('❌ DatabaseService: Error creando backup automático:', error);
    }
  }

  /**
   * Crea todas las tablas de la base de datos
   * Separado del método de inicialización para mejor organización
   */
  private async createTables(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Base de datos no inicializada'));
        return;
      }

      const db = this.ensureDb();
      db.serialize(() => {
        try {
      // Tabla de usuarios (sistema de autenticación)
          this.db!.run(`
        CREATE TABLE IF NOT EXISTS usuarios (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nombre TEXT NOT NULL,
          email TEXT NOT NULL,
          password TEXT NOT NULL,
          rol TEXT NOT NULL,
          activo BOOLEAN DEFAULT 1,
          fechaCreacion DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Tabla de clientes
          this.db!.run(`
        CREATE TABLE IF NOT EXISTS clientes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nombre TEXT NOT NULL,
          rut TEXT NOT NULL UNIQUE,
          telefono TEXT NOT NULL,
          email TEXT UNIQUE,
          direccion TEXT,
          fechaRegistro DATETIME DEFAULT CURRENT_TIMESTAMP,
          activo BOOLEAN DEFAULT 1
        )
      `);

      // Tabla de vehículos (con color y kilometraje como en el original)
          this.db!.run(`
        CREATE TABLE IF NOT EXISTS vehiculos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          clienteId INTEGER NOT NULL,
          marca TEXT NOT NULL,
          modelo TEXT NOT NULL,
          año INTEGER NOT NULL CHECK (año >= 1900 AND año <= 2030),
          patente TEXT NOT NULL UNIQUE,
          numeroChasis TEXT,
          color TEXT,
          kilometraje INTEGER CHECK (kilometraje >= 0),
          observaciones TEXT,
          activo BOOLEAN DEFAULT 1,
          FOREIGN KEY (clienteId) REFERENCES clientes(id) ON DELETE CASCADE
        )
      `);

      // Tabla de recordatorios
          this.db!.run(`
        CREATE TABLE IF NOT EXISTS recordatorios (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          clienteId INTEGER,
          vehiculoId INTEGER,
          tipo TEXT NOT NULL,
          kilometraje INTEGER,
          fechaAviso DATETIME NOT NULL,
          observaciones TEXT,
          estado TEXT NOT NULL DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente', 'Enviado')),
          fechaCreacion DATETIME DEFAULT CURRENT_TIMESTAMP,
          fechaEnvio DATETIME,
          FOREIGN KEY (clienteId) REFERENCES clientes(id) ON DELETE SET NULL,
          FOREIGN KEY (vehiculoId) REFERENCES vehiculos(id) ON DELETE SET NULL
        )
      `);

          this.db!.run(
            `CREATE INDEX IF NOT EXISTS idx_recordatorios_fecha ON recordatorios(fechaAviso)`
          );

      // Tabla de servicios
          this.db!.run(`
        CREATE TABLE IF NOT EXISTS servicios (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nombre TEXT NOT NULL UNIQUE,
          descripcion TEXT NOT NULL,
          precio INTEGER NOT NULL CHECK (precio >= 0),
          duracionEstimada INTEGER NOT NULL CHECK (duracionEstimada > 0),
          activo BOOLEAN DEFAULT 1
        )
      `);

      // Tabla de repuestos
          this.db!.run(`
        CREATE TABLE IF NOT EXISTS repuestos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          codigo TEXT NOT NULL UNIQUE,
          nombre TEXT NOT NULL,
          descripcion TEXT NOT NULL,
          precio INTEGER NOT NULL CHECK (precio >= 0),
          precioCosto INTEGER DEFAULT 0 CHECK (precioCosto >= 0),
          stock INTEGER NOT NULL CHECK (stock >= 0),
          stockMinimo INTEGER NOT NULL CHECK (stockMinimo >= 0),
          categoria TEXT NOT NULL,
          marca TEXT NOT NULL,
          ubicacion TEXT NOT NULL,
          activo BOOLEAN DEFAULT 1
        )
      `);
      
      // Agregar columna precioCosto si no existe (para bases de datos existentes)
          this.db!.run(`
        ALTER TABLE repuestos ADD COLUMN precioCosto INTEGER DEFAULT 0 CHECK (precioCosto >= 0)
      `, (err: any) => {
        // Ignorar error si la columna ya existe
        if (err && !err.message.includes('duplicate column')) {
          console.warn('Advertencia al agregar columna precioCosto:', err.message);
        }
      });

      // Agregar columna numeroChasis si no existe (para bases de datos existentes)
          this.db!.run(`
        ALTER TABLE vehiculos ADD COLUMN numeroChasis TEXT
      `, (err: any) => {
        // Ignorar error si la columna ya existe
        if (err && !err.message.includes('duplicate column')) {
          console.warn('⚠️ Error agregando columna numeroChasis:', err.message);
        }
      });

      // Tabla de cotizaciones
          this.db!.run(`
        CREATE TABLE IF NOT EXISTS cotizaciones (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          numero TEXT NOT NULL UNIQUE,
          clienteId INTEGER NOT NULL,
          vehiculoId INTEGER NOT NULL,
          fecha DATETIME NOT NULL,
          validaHasta DATETIME NOT NULL,
          estado TEXT NOT NULL CHECK (estado IN ('Pendiente', 'Aprobada', 'Rechazada', 'Vencida')),
          descripcion TEXT NOT NULL,
          observaciones TEXT,
          total INTEGER NOT NULL CHECK (total >= 0),
          FOREIGN KEY (clienteId) REFERENCES clientes(id) ON DELETE CASCADE,
          FOREIGN KEY (vehiculoId) REFERENCES vehiculos(id) ON DELETE CASCADE
        )
      `);

      // Tabla de órdenes de trabajo
          this.db!.run(`
        CREATE TABLE IF NOT EXISTS ordenes_trabajo (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          numero TEXT NOT NULL UNIQUE,
          clienteId INTEGER NOT NULL,
          vehiculoId INTEGER NOT NULL,
          fechaIngreso DATETIME NOT NULL,
          fechaEntrega DATETIME,
          estado TEXT NOT NULL CHECK (estado IN ('Pendiente', 'En Progreso', 'Completada', 'Cancelada')),
          descripcion TEXT NOT NULL,
          observaciones TEXT,
          total INTEGER NOT NULL CHECK (total >= 0),
          kilometrajeEntrada INTEGER CHECK (kilometrajeEntrada >= 0),
          kilometrajeSalida INTEGER CHECK (kilometrajeSalida >= 0),
          prioridad TEXT CHECK (prioridad IN ('Baja', 'Normal', 'Alta', 'Urgente')),
          tecnicoAsignado TEXT,
          metodoPago TEXT CHECK (metodoPago IN ('Efectivo', 'Débito', 'Crédito')),
          numeroCuotas INTEGER,
          fechaPago DATETIME,
          FOREIGN KEY (clienteId) REFERENCES clientes(id) ON DELETE CASCADE,
          FOREIGN KEY (vehiculoId) REFERENCES vehiculos(id) ON DELETE CASCADE
        )
      `);

      // Tabla de ventas (ventas rápidas de repuestos sin mano de obra)
          this.db!.run(`
        CREATE TABLE IF NOT EXISTS ventas (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          numero TEXT NOT NULL UNIQUE,
          clienteId INTEGER,
          clienteNombre TEXT,
          clienteRut TEXT,
          clienteTelefono TEXT,
          clienteEmail TEXT,
          fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          total INTEGER NOT NULL CHECK (total >= 0),
          metodoPago TEXT CHECK (metodoPago IN ('Efectivo', 'Débito', 'Crédito')),
          observaciones TEXT,
          FOREIGN KEY (clienteId) REFERENCES clientes(id) ON DELETE SET NULL
        )
      `);

      // Tabla de detalles de venta
          this.db!.run(`
        CREATE TABLE IF NOT EXISTS detalles_venta (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          ventaId INTEGER NOT NULL,
          repuestoId INTEGER NOT NULL,
          cantidad INTEGER NOT NULL CHECK (cantidad > 0),
          precio INTEGER NOT NULL CHECK (precio >= 0),
          subtotal INTEGER NOT NULL CHECK (subtotal >= 0),
          descripcion TEXT NOT NULL,
          FOREIGN KEY (ventaId) REFERENCES ventas(id) ON DELETE CASCADE,
          FOREIGN KEY (repuestoId) REFERENCES repuestos(id) ON DELETE RESTRICT
        )
      `);
      
      // Agregar columnas de pago si no existen (migración)
      // SQLite no soporta CHECK constraints en ALTER TABLE, así que agregamos sin constraint
          this.db!.run(`
        ALTER TABLE ordenes_trabajo ADD COLUMN metodoPago TEXT
      `, (err: any) => {
        // Ignorar error si la columna ya existe
        if (err && !err.message.includes('duplicate column')) {
          console.warn('Advertencia al agregar columna metodoPago:', err.message);
        }
      });
      
          this.db!.run(`
        ALTER TABLE ordenes_trabajo ADD COLUMN numeroCuotas INTEGER
      `, (err: any) => {
        // Ignorar error si la columna ya existe
        if (err && !err.message.includes('duplicate column')) {
          console.warn('Advertencia al agregar columna numeroCuotas:', err.message);
        }
      });
      
          this.db!.run(`
        ALTER TABLE ordenes_trabajo ADD COLUMN fechaPago DATETIME
      `, (err: any) => {
        // Ignorar error si la columna ya existe
        if (err && !err.message.includes('duplicate column')) {
          console.warn('Advertencia al agregar columna fechaPago:', err.message);
        }
      });

      // Tabla de cuotas de pago (para órdenes con crédito)
          this.db!.run(`
        CREATE TABLE IF NOT EXISTS cuotas_pago (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          ordenId INTEGER NOT NULL,
          numeroCuota INTEGER NOT NULL CHECK (numeroCuota > 0),
          fechaVencimiento DATETIME NOT NULL,
          monto INTEGER NOT NULL CHECK (monto >= 0),
          montoPagado INTEGER DEFAULT 0 CHECK (montoPagado >= 0),
          fechaPago DATETIME,
          estado TEXT NOT NULL DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente', 'Pagada', 'Vencida')),
          observaciones TEXT,
          FOREIGN KEY (ordenId) REFERENCES ordenes_trabajo(id) ON DELETE CASCADE,
          UNIQUE(ordenId, numeroCuota)
        )
      `);

      // Tabla de detalles de cotización
          this.db!.run(`
        CREATE TABLE IF NOT EXISTS detalles_cotizacion (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          cotizacionId INTEGER NOT NULL,
          tipo TEXT NOT NULL CHECK (tipo IN ('servicio', 'repuesto')),
          servicioId INTEGER,
          repuestoId INTEGER,
          cantidad INTEGER NOT NULL CHECK (cantidad > 0),
          precio INTEGER NOT NULL CHECK (precio >= 0),
          subtotal INTEGER NOT NULL CHECK (subtotal >= 0),
          descripcion TEXT NOT NULL,
          FOREIGN KEY (cotizacionId) REFERENCES cotizaciones(id) ON DELETE CASCADE,
          FOREIGN KEY (servicioId) REFERENCES servicios(id) ON DELETE SET NULL,
          FOREIGN KEY (repuestoId) REFERENCES repuestos(id) ON DELETE SET NULL,
          CHECK ((tipo = 'servicio' AND servicioId IS NOT NULL AND repuestoId IS NULL) OR 
                 (tipo = 'repuesto' AND repuestoId IS NOT NULL AND servicioId IS NULL))
        )
      `);

      // Tabla de detalles de orden de trabajo
          this.db!.run(`
        CREATE TABLE IF NOT EXISTS detalles_orden (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          ordenId INTEGER NOT NULL,
          tipo TEXT NOT NULL CHECK (tipo IN ('servicio', 'repuesto')),
          servicioId INTEGER,
          repuestoId INTEGER,
          cantidad INTEGER NOT NULL CHECK (cantidad > 0),
          precio INTEGER NOT NULL CHECK (precio >= 0),
          subtotal INTEGER NOT NULL CHECK (subtotal >= 0),
          descripcion TEXT NOT NULL,
          FOREIGN KEY (ordenId) REFERENCES ordenes_trabajo(id) ON DELETE CASCADE,
          FOREIGN KEY (servicioId) REFERENCES servicios(id) ON DELETE SET NULL,
          FOREIGN KEY (repuestoId) REFERENCES repuestos(id) ON DELETE SET NULL,
          CHECK ((tipo = 'servicio' AND servicioId IS NOT NULL AND repuestoId IS NULL) OR 
                 (tipo = 'repuesto' AND repuestoId IS NOT NULL AND servicioId IS NULL))
        )
      `);

      // Tabla de configuración
          this.db!.run(`
        CREATE TABLE IF NOT EXISTS configuracion (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          clave TEXT NOT NULL UNIQUE,
          valor TEXT NOT NULL,
          descripcion TEXT
        )
      `);
      
      // Inicializar versión del esquema si no existe (después de crear la tabla)
          this.db!.run(`
        INSERT OR IGNORE INTO configuracion (clave, valor, descripcion)
        VALUES ('schema_version', '1.2.0', 'Versión del esquema de base de datos')
      `);

      // Tabla de movimientos de caja
          this.db!.run(`
        CREATE TABLE IF NOT EXISTS movimientos_caja (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tipo TEXT NOT NULL CHECK (tipo IN ('ingreso', 'egreso')),
          monto INTEGER NOT NULL CHECK (monto >= 0),
          descripcion TEXT NOT NULL,
          metodo_pago TEXT CHECK (metodo_pago IN ('Efectivo', 'Débito', 'Crédito', 'Transferencia')),
          fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          ordenId INTEGER,
          caja_abierta BOOLEAN DEFAULT 1,
          FOREIGN KEY (ordenId) REFERENCES ordenes_trabajo(id) ON DELETE SET NULL
        )
      `);

      // Tabla de estado de caja
          this.db!.run(`
        CREATE TABLE IF NOT EXISTS estado_caja (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          fecha_apertura DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          fecha_cierre DATETIME,
          monto_inicial INTEGER NOT NULL DEFAULT 0 CHECK (monto_inicial >= 0),
          monto_final INTEGER CHECK (monto_final >= 0),
          estado TEXT NOT NULL DEFAULT 'abierta' CHECK (estado IN ('abierta', 'cerrada')),
          observaciones TEXT
        )
      `);

      // Tabla de comisiones de técnicos
          this.db!.run(`
        CREATE TABLE IF NOT EXISTS comisiones_tecnicos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          ordenId INTEGER NOT NULL,
          tecnicoId INTEGER,
          tecnicoNombre TEXT NOT NULL,
          monto_mano_obra INTEGER NOT NULL CHECK (monto_mano_obra >= 0),
          porcentaje_comision REAL NOT NULL CHECK (porcentaje_comision >= 0 AND porcentaje_comision <= 100),
          monto_comision INTEGER NOT NULL CHECK (monto_comision >= 0),
          fecha_calculo DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          mes_referencia TEXT NOT NULL,
          FOREIGN KEY (ordenId) REFERENCES ordenes_trabajo(id) ON DELETE CASCADE,
          FOREIGN KEY (tecnicoId) REFERENCES usuarios(id) ON DELETE SET NULL
        )
      `);

      // Tabla de proveedores
          this.db!.run(`
        CREATE TABLE IF NOT EXISTS proveedores (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nombre TEXT NOT NULL,
          tipoContribuyente TEXT,
          direccionFiscal TEXT,
          nombreFantasia TEXT,
          identificacionTributaria TEXT,
          ciudadFiscal TEXT,
          telefono TEXT,
          email TEXT,
          personaContacto TEXT,
          telefonoAlternativo TEXT,
          emailAlternativo TEXT,
          comentario TEXT,
          activo BOOLEAN DEFAULT 1,
          fechaCreacion DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Tabla de categorías
          this.db!.run(`
        CREATE TABLE IF NOT EXISTS categorias (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nombre TEXT NOT NULL UNIQUE,
          activo BOOLEAN DEFAULT 1,
          fechaCreacion DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Tabla de pagos a trabajadores
          this.db!.run(`
        CREATE TABLE IF NOT EXISTS pagos_trabajadores (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          trabajadorId INTEGER,
          trabajadorNombre TEXT NOT NULL,
          trabajadorRut TEXT,
          concepto TEXT NOT NULL,
          monto_efectivo INTEGER NOT NULL DEFAULT 0,
          monto_otros INTEGER NOT NULL DEFAULT 0,
          metodo_pago TEXT,
          comentario TEXT,
          fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
          descontar_caja BOOLEAN DEFAULT 0,
          caja_id INTEGER,
          FOREIGN KEY (trabajadorId) REFERENCES usuarios(id) ON DELETE SET NULL,
          FOREIGN KEY (caja_id) REFERENCES estado_caja(id) ON DELETE SET NULL
        )
      `);

      // Agregar columnas a tablas existentes (migración)
          this.db!.run(`
        ALTER TABLE usuarios ADD COLUMN porcentaje_comision REAL DEFAULT 0 CHECK (porcentaje_comision >= 0 AND porcentaje_comision <= 100)
      `, (err: any) => {
        // Ignorar error si la columna ya existe
        if (err && !err.message.includes('duplicate column')) {
          console.warn('Advertencia al agregar columna porcentaje_comision:', err.message);
        }
      });

          this.db!.run(`
        ALTER TABLE ordenes_trabajo ADD COLUMN fechaProgramada DATETIME
      `, (err: any) => {
        if (err && !err.message.includes('duplicate column')) {
          console.warn('Advertencia al agregar columna fechaProgramada:', err.message);
        }
      });

          // Crear índices para mejorar rendimiento
          this.createIndexes();

          // Crear índices FULLTEXT para búsquedas rápidas
          this.createFullTextIndexes();

          // Verificar y migrar esquema si es necesario (después de crear todas las tablas)
          this.checkAndMigrateSchema();
          
          // Limpiar duplicados automáticamente al inicializar
          this.cleanDuplicatesOnInit();
          
          // Ejecutar mantenimiento periódico si es necesario (en background, no bloquea)
          // Usar setTimeout para ejecutar después de que termine la inicialización
          setTimeout(() => {
            this.performMaintenance().catch(err => {
              // Ignorar errores de VACUUM durante inicialización (puede haber transacciones activas)
              if (!err.message?.includes('VACUUM')) {
                console.warn('⚠️ Error en mantenimiento automático:', err);
              }
            });
          }, 2000); // Esperar 2 segundos después de la inicialización
          
          // Insertar datos iniciales (solo en desarrollo y si se solicita explícitamente)
          // NUNCA insertar datos de prueba en producción (app empaquetada)
          const { app } = require('electron');
          const isDevelopment = !app.isPackaged;
          const seedEnabled = process.env.SEED_SAMPLE_DATA === 'true';
          
          if (isDevelopment && seedEnabled) {
            console.log('🌱 SEED_SAMPLE_DATA habilitado: insertando datos de ejemplo (solo en desarrollo)');
            this.insertInitialData();
          } else {
            if (app.isPackaged) {
              console.log('✅ Modo producción: no se insertan datos de ejemplo');
            } else {
              console.log('🌱 SEED_SAMPLE_DATA deshabilitado: no se insertan datos de ejemplo');
            }
          }
          
          // Resolver cuando todas las operaciones estén listas
          // db.serialize() ejecuta todo de forma secuencial, así que resolve al final
          setTimeout(() => resolve(), 100); // Pequeño delay para asegurar que todas las operaciones terminen
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  private createIndexes(): void {
    const db = this.ensureDb();
    // Índices para búsquedas frecuentes
    db.run('CREATE INDEX IF NOT EXISTS idx_clientes_rut ON clientes(rut)');
    db.run('CREATE INDEX IF NOT EXISTS idx_clientes_email ON clientes(email)');
    db.run('CREATE INDEX IF NOT EXISTS idx_vehiculos_cliente ON vehiculos(clienteId)');
    db.run('CREATE INDEX IF NOT EXISTS idx_vehiculos_patente ON vehiculos(patente)');
    db.run('CREATE INDEX IF NOT EXISTS idx_cotizaciones_cliente ON cotizaciones(clienteId)');
    db.run('CREATE INDEX IF NOT EXISTS idx_cotizaciones_fecha ON cotizaciones(fecha)');
    db.run('CREATE INDEX IF NOT EXISTS idx_cotizaciones_estado ON cotizaciones(estado)');
    db.run('CREATE INDEX IF NOT EXISTS idx_ordenes_cliente ON ordenes_trabajo(clienteId)');
    db.run('CREATE INDEX IF NOT EXISTS idx_ordenes_fecha ON ordenes_trabajo(fechaIngreso)');
    db.run('CREATE INDEX IF NOT EXISTS idx_ordenes_estado ON ordenes_trabajo(estado)');
    db.run('CREATE INDEX IF NOT EXISTS idx_repuestos_codigo ON repuestos(codigo)');
    db.run('CREATE INDEX IF NOT EXISTS idx_repuestos_categoria ON repuestos(categoria)');
    db.run('CREATE INDEX IF NOT EXISTS idx_repuestos_nombre ON repuestos(nombre)');
    db.run('CREATE INDEX IF NOT EXISTS idx_servicios_nombre ON servicios(nombre)');
    
    // Índices para tablas de detalles (mejoran JOINs y búsquedas)
    db.run('CREATE INDEX IF NOT EXISTS idx_detalles_cotizacion_cotizacion ON detalles_cotizacion(cotizacionId)');
    db.run('CREATE INDEX IF NOT EXISTS idx_detalles_orden_orden ON detalles_orden(ordenId)');
    
    // Índices compuestos para búsquedas frecuentes (mejoras de rendimiento)
    db.run('CREATE INDEX IF NOT EXISTS idx_ordenes_cliente_fecha ON ordenes_trabajo(clienteId, fechaIngreso)');
    db.run('CREATE INDEX IF NOT EXISTS idx_cuotas_orden_estado ON cuotas_pago(ordenId, estado)');
    db.run('CREATE INDEX IF NOT EXISTS idx_cotizaciones_cliente_fecha ON cotizaciones(clienteId, fecha)');
    
    // Índices adicionales para búsquedas de texto
    db.run('CREATE INDEX IF NOT EXISTS idx_clientes_nombre ON clientes(nombre)');
    db.run('CREATE INDEX IF NOT EXISTS idx_ordenes_numero ON ordenes_trabajo(numero)');
    db.run('CREATE INDEX IF NOT EXISTS idx_cotizaciones_numero ON cotizaciones(numero)');
    db.run('CREATE INDEX IF NOT EXISTS idx_cuotas_fecha_vencimiento ON cuotas_pago(fechaVencimiento)');
    
    // Índices para nuevos módulos
    db.run('CREATE INDEX IF NOT EXISTS idx_movimientos_caja_fecha ON movimientos_caja(fecha)');
    db.run('CREATE INDEX IF NOT EXISTS idx_movimientos_caja_tipo ON movimientos_caja(tipo)');
    db.run('CREATE INDEX IF NOT EXISTS idx_estado_caja_fecha ON estado_caja(fecha_apertura)');
    db.run('CREATE INDEX IF NOT EXISTS idx_comisiones_orden ON comisiones_tecnicos(ordenId)');
    db.run('CREATE INDEX IF NOT EXISTS idx_comisiones_tecnico ON comisiones_tecnicos(tecnicoId)');
    db.run('CREATE INDEX IF NOT EXISTS idx_comisiones_mes ON comisiones_tecnicos(mes_referencia)');
    db.run('CREATE INDEX IF NOT EXISTS idx_pagos_trabajadores_fecha ON pagos_trabajadores(fecha)');
    db.run('CREATE INDEX IF NOT EXISTS idx_pagos_trabajadores_trabajador ON pagos_trabajadores(trabajadorId)');
    db.run('CREATE INDEX IF NOT EXISTS idx_ordenes_fecha_programada ON ordenes_trabajo(fechaProgramada)');
    
    console.log('✅ Índices de base de datos creados');
  }

  private createFullTextIndexes(): void {
    try {
      const db = this.ensureDb();
      // Crear tablas virtuales FULLTEXT para búsquedas rápidas en texto
      // Clientes FTS5
      db.run(`
        CREATE VIRTUAL TABLE IF NOT EXISTS clientes_fts USING fts5(
          nombre, email, telefono,
          content='clientes',
          content_rowid='id'
        )
      `);

      // Repuestos FTS5
      db.run(`
        CREATE VIRTUAL TABLE IF NOT EXISTS repuestos_fts USING fts5(
          nombre, codigo, descripcion, categoria,
          content='repuestos',
          content_rowid='id'
        )
      `);

      // Triggers para mantener sincronizado
      db.run(`
        CREATE TRIGGER IF NOT EXISTS clientes_fts_insert AFTER INSERT ON clientes BEGIN
          INSERT INTO clientes_fts(rowid, nombre, email, telefono)
          VALUES (new.id, new.nombre, COALESCE(new.email, ''), new.telefono);
        END
      `);

      db.run(`
        CREATE TRIGGER IF NOT EXISTS clientes_fts_update AFTER UPDATE ON clientes BEGIN
          UPDATE clientes_fts SET
            nombre = new.nombre,
            email = COALESCE(new.email, ''),
            telefono = new.telefono
          WHERE rowid = old.id;
        END
      `);

      db.run(`
        CREATE TRIGGER IF NOT EXISTS clientes_fts_delete AFTER DELETE ON clientes BEGIN
          DELETE FROM clientes_fts WHERE rowid = old.id;
        END
      `);

      db.run(`
        CREATE TRIGGER IF NOT EXISTS repuestos_fts_insert AFTER INSERT ON repuestos BEGIN
          INSERT INTO repuestos_fts(rowid, nombre, codigo, descripcion, categoria)
          VALUES (new.id, new.nombre, new.codigo, new.descripcion, new.categoria);
        END
      `);

      db.run(`
        CREATE TRIGGER IF NOT EXISTS repuestos_fts_update AFTER UPDATE ON repuestos BEGIN
          UPDATE repuestos_fts SET
            nombre = new.nombre,
            codigo = new.codigo,
            descripcion = new.descripcion,
            categoria = new.categoria
          WHERE rowid = old.id;
        END
      `);

      db.run(`
        CREATE TRIGGER IF NOT EXISTS repuestos_fts_delete AFTER DELETE ON repuestos BEGIN
          DELETE FROM repuestos_fts WHERE rowid = old.id;
        END
      `);

      // Poblar índices FTS con datos existentes (solo si hay datos)
      // Evitar duplicados usando INSERT OR IGNORE
      db.run(`
        INSERT OR IGNORE INTO clientes_fts(rowid, nombre, email, telefono)
        SELECT id, nombre, COALESCE(email, ''), telefono FROM clientes
        WHERE id NOT IN (SELECT rowid FROM clientes_fts)
      `);

      db.run(`
        INSERT OR IGNORE INTO repuestos_fts(rowid, nombre, codigo, descripcion, categoria)
        SELECT id, nombre, codigo, descripcion, categoria FROM repuestos
        WHERE id NOT IN (SELECT rowid FROM repuestos_fts)
      `);

      console.log('✅ Índices FULLTEXT creados');
    } catch (error) {
      // Si FTS5 no está disponible, continuar sin errores
      console.warn('⚠️ No se pudieron crear índices FULLTEXT (puede ser versión de SQLite):', error);
    }
  }

  /**
   * Verifica y migra el esquema de la base de datos si es necesario
   */
  private checkAndMigrateSchema(): void {
    const CURRENT_SCHEMA_VERSION = '1.2.1'; // Versión actual del esquema
    
    // Verificar si existe la tabla de configuración (para almacenar versión)
    this.ensureDb().get("SELECT name FROM sqlite_master WHERE type='table' AND name='configuracion'", (err, row: any) => {
      if (err) {
        console.error('Error verificando tabla configuracion:', err);
        return;
      }
      
      if (!row) {
        // Tabla de configuración no existe, se creará después
        console.log('📋 Primera instalación detectada');
        return;
      }
      
      // Verificar versión actual del esquema
      const dbInner = this.ensureDb();
      dbInner.get("SELECT valor FROM configuracion WHERE clave = 'schema_version'", async (err: Error | null, versionRow: any) => {
        if (err) {
          console.error('Error verificando versión del esquema:', err);
          return;
        }
        
        const currentVersion = versionRow?.valor || '0.0.0';
        
        if (currentVersion !== CURRENT_SCHEMA_VERSION) {
          console.log(`🔄 Migrando esquema de ${currentVersion} a ${CURRENT_SCHEMA_VERSION}`);
          await this.migrateSchema(currentVersion, CURRENT_SCHEMA_VERSION);
        } else {
          console.log(`✅ Esquema actualizado (versión ${CURRENT_SCHEMA_VERSION})`);
        }
      });
    });
  }

  /**
   * Migra el esquema de una versión a otra usando el sistema de migraciones
   */
  private async migrateSchema(fromVersion: string, toVersion: string): Promise<void> {
    // Limpiar duplicados antes de migrar
    this.cleanAllDuplicates();
    
    // Importar y usar el servicio de migraciones
    const db = this.ensureDb();
    try {
      const { MigrationService } = await import('./migrations');
      const migrationService = new MigrationService();
      await migrationService.migrate(db, toVersion);
      console.log(`✅ Esquema migrado a versión ${toVersion}`);
    } catch (error) {
      console.error('Error en migración:', error);
      // Fallback: actualizar versión manualmente
      db.run(`
        INSERT OR REPLACE INTO configuracion (clave, valor, descripcion)
        VALUES ('schema_version', ?, 'Versión del esquema de base de datos')
      `, [toVersion], (err) => {
        if (err) {
          console.error('Error actualizando versión del esquema:', err);
        } else {
          console.log(`✅ Versión actualizada a ${toVersion} (migración simplificada)`);
        }
      });
    }
  }

  /**
   * Limpia duplicados de todas las tablas de forma segura
   */
  private cleanAllDuplicates(): void {
    console.log('🧹 Limpiando duplicados de todas las tablas...');
    const db = this.ensureDb();
    
    // Usar transacción para evitar SQLITE_BUSY
    db.serialize(() => {
      // Limpiar duplicados de clientes (por RUT único)
      db.run(`
        DELETE FROM clientes 
        WHERE id NOT IN (
          SELECT MIN(id) FROM clientes GROUP BY rut
        )
      `, (err: any) => {
        if (err && (err as any).code !== 'SQLITE_BUSY') {
          console.error('Error limpiando duplicados de clientes:', err);
        } else if (!err) {
          console.log('✅ Duplicados de clientes limpiados');
        }
      });
    
      // Limpiar duplicados de vehículos (por patente única)
      db.run(`
        DELETE FROM vehiculos 
        WHERE id NOT IN (
          SELECT MIN(id) FROM vehiculos GROUP BY patente
        )
      `, (err: any) => {
        if (err && (err as any).code !== 'SQLITE_BUSY') {
          console.error('Error limpiando duplicados de vehículos:', err);
        } else if (!err) {
          console.log('✅ Duplicados de vehículos limpiados');
        }
      });
      
      // Limpiar duplicados de cotizaciones (por número único)
      db.run(`
        DELETE FROM cotizaciones 
        WHERE id NOT IN (
          SELECT MIN(id) FROM cotizaciones GROUP BY numero
        )
      `, (err: any) => {
        if (err && (err as any).code !== 'SQLITE_BUSY') {
          console.error('Error limpiando duplicados de cotizaciones:', err);
        } else if (!err) {
          console.log('✅ Duplicados de cotizaciones limpiados');
        }
      });
      
      // Limpiar duplicados de órdenes (por número único)
      db.run(`
        DELETE FROM ordenes_trabajo 
        WHERE id NOT IN (
          SELECT MIN(id) FROM ordenes_trabajo GROUP BY numero
        )
      `, (err: any) => {
        if (err && (err as any).code !== 'SQLITE_BUSY') {
          console.error('Error limpiando duplicados de órdenes:', err);
        } else if (!err) {
          console.log('✅ Duplicados de órdenes limpiados');
        }
      });
      
      // Limpiar duplicados de repuestos (por código único)
      db.run(`
        DELETE FROM repuestos 
        WHERE id NOT IN (
          SELECT MIN(id) FROM repuestos GROUP BY codigo
        )
      `, (err: any) => {
        if (err && (err as any).code !== 'SQLITE_BUSY') {
          console.error('Error limpiando duplicados de repuestos:', err);
        } else if (!err) {
          console.log('✅ Duplicados de repuestos limpiados');
        }
      });
      
      // Limpiar duplicados de servicios (por nombre único)
      db.run(`
        DELETE FROM servicios 
        WHERE id NOT IN (
          SELECT MIN(id) FROM servicios GROUP BY nombre
        )
      `, (err: any) => {
        if (err && (err as any).code !== 'SQLITE_BUSY') {
          console.error('Error limpiando duplicados de servicios:', err);
        } else if (!err) {
          console.log('✅ Duplicados de servicios limpiados');
        }
      });
      
      // Limpiar detalles huérfanos (sin relación válida)
      db.run(`
        DELETE FROM detalles_cotizacion 
        WHERE cotizacionId NOT IN (SELECT id FROM cotizaciones)
      `, (err: any) => {
        if (err && (err as any).code !== 'SQLITE_BUSY') {
          console.error('Error limpiando detalles de cotización huérfanos:', err);
        } else if (!err) {
          console.log('✅ Detalles de cotización huérfanos limpiados');
        }
      });
      
      db.run(`
        DELETE FROM detalles_orden 
        WHERE ordenId NOT IN (SELECT id FROM ordenes_trabajo)
      `, (err: any) => {
        if (err && (err as any).code !== 'SQLITE_BUSY') {
          console.error('Error limpiando detalles de orden huérfanos:', err);
        } else if (!err) {
          console.log('✅ Detalles de orden huérfanos limpiados');
        }
      });
      
      // Limpiar vehículos huérfanos (sin cliente válido)
      db.run(`
        DELETE FROM vehiculos 
        WHERE clienteId NOT IN (SELECT id FROM clientes)
      `, (err: any) => {
        if (err && (err as any).code !== 'SQLITE_BUSY') {
          console.error('Error limpiando vehículos huérfanos:', err);
        } else if (!err) {
          console.log('✅ Vehículos huérfanos limpiados');
        }
      });
    });
  }

  private cleanDuplicatesOnInit(): void {
    // Verificar si hay datos existentes antes de limpiar
    const db = this.ensureDb();
    db.get('SELECT COUNT(*) as count FROM clientes', (err, row: any) => {
      if (err) {
        console.error('Error verificando datos existentes:', err);
        return;
      }
      
      const hasData = row?.count > 0;
      
      if (hasData) {
        console.log('📊 Base de datos existente detectada, limpiando duplicados...');
        // Limpiar duplicados de todas las tablas
        this.cleanAllDuplicates();
      } else {
        console.log('📊 Base de datos nueva, no hay duplicados que limpiar');
      }
    });
  }

  private insertInitialData(): void {
    // Verificar si ya existen datos iniciales específicos para evitar duplicados
    this.ensureDb().get('SELECT COUNT(*) as count FROM clientes WHERE nombre IN ("Juan Pérez", "María González", "Carlos Mendoza", "Ana Torres", "Pedro Silva")', (err, row: any) => {
      if (err) {
        console.error('Error verificando datos iniciales:', err);
        return;
      }

      // Si ya existen los 5 clientes específicos, verificar si hay datos completos
      if (row.count >= 5) {
        // Verificar si hay vehículos y cotizaciones
        this.ensureDb().get('SELECT COUNT(*) as vehiculos FROM vehiculos', (err, vehiculosRow: any) => {
          if (err) {
            console.error('Error verificando vehículos:', err);
            return;
          }
          
          this.ensureDb().get('SELECT COUNT(*) as cotizaciones FROM cotizaciones', (err, cotizacionesRow: any) => {
            if (err) {
              console.error('Error verificando cotizaciones:', err);
              return;
            }
            
            const vehiculosCount = vehiculosRow?.vehiculos || 0;
            const cotizacionesCount = cotizacionesRow?.cotizaciones || 0;
            
            if (vehiculosCount >= 5 && cotizacionesCount >= 5) {
              console.log('✅ Datos iniciales ya existen, omitiendo inserción');
              return;
            }
            
            console.log('⚠️ Datos incompletos encontrados (vehículos: ' + vehiculosCount + ', cotizaciones: ' + cotizacionesCount + ')');
            console.log('🔄 Reinsertando datos faltantes...');
            
            // Reinsertar solo los datos faltantes
            if (vehiculosCount < 5) {
              console.log('🔄 Insertando vehículos faltantes...');
            }
            if (cotizacionesCount < 5) {
              console.log('🔄 Insertando cotizaciones faltantes...');
              this.insertInitialCotizaciones();
            }
          });
        });
        return;
      }

      // Si hay datos pero no son los iniciales, limpiar duplicados primero
      this.ensureDb().get('SELECT COUNT(*) as total FROM clientes', (err, totalRow: any) => {
        if (err) {
          console.error('Error verificando total de clientes:', err);
          return;
        }

        if (totalRow.total > 0) {
          console.log('🧹 Limpiando duplicados existentes...');
          this.ensureDb().run('DELETE FROM clientes WHERE id NOT IN (SELECT MIN(id) FROM clientes GROUP BY rut)', (err) => {
            if (err) {
              console.error('Error limpiando duplicados:', err);
            } else {
              console.log('✅ Duplicados eliminados');
            }
          });
        }

        // Primero limpiar completamente todos los datos existentes
        console.log('🧹 Limpiando base de datos...');
        const db = this.ensureDb();
        db.run(`DELETE FROM detalles_orden`);
        db.run(`DELETE FROM detalles_cotizacion`);
        db.run(`DELETE FROM ordenes_trabajo`);
        db.run(`DELETE FROM cotizaciones`);
        db.run(`DELETE FROM vehiculos`);
        db.run(`DELETE FROM clientes`);
        db.run(`DELETE FROM repuestos`);
        db.run(`DELETE FROM servicios`);
        db.run(`DELETE FROM usuarios`);

        // Resetear los contadores de ID
        db.run(`DELETE FROM sqlite_sequence WHERE name IN ('usuarios', 'servicios', 'repuestos', 'clientes', 'vehiculos', 'cotizaciones', 'ordenes_trabajo', 'detalles_cotizacion', 'detalles_orden')`);

        console.log('✅ Base de datos limpiada completamente');

        // Insertar usuario administrador
        db.run(`
          INSERT INTO usuarios (nombre, email, password, rol, activo) 
          VALUES ('Administrador', 'admin@resortespm.cl', 'admin123', 'admin', 1)
        `);

        // Insertar servicios predefinidos (5 únicos)
        db.run(`
          INSERT OR IGNORE INTO servicios (nombre, descripcion, precio, duracionEstimada, activo) 
          VALUES 
            ('Frenos', 'Revisión y reparación de sistema de frenos', 35000, 90, 1),
            ('Suspensión', 'Revisión y reparación de suspensión', 40000, 120, 1),
            ('Revisión General', 'Revisión completa del vehículo', 25000, 60, 1),
            ('Cambio de Aceite', 'Cambio de aceite y filtro', 15000, 30, 1),
            ('Alineación', 'Alineación y balanceo de ruedas', 20000, 45, 1)
        `);

        // Insertar datos iniciales de repuestos (5 únicos)
        db.run(`
          INSERT OR IGNORE INTO repuestos (codigo, nombre, descripcion, precio, precioCosto, stock, stockMinimo, categoria, marca, ubicacion, activo) 
          VALUES 
            ('ACE001', 'Aceite Motor 5W30', 'Aceite sintético para motor', 25000, 20000, 20, 5, 'Motor', 'Castrol', 'Estante A1', 1),
            ('FIL001', 'Filtro de Aceite', 'Filtro de aceite motor', 8000, 6000, 15, 3, 'Motor', 'Mann', 'Estante A2', 1),
            ('FR001', 'Pastillas de Freno', 'Pastillas de freno delanteras', 35000, 28000, 10, 2, 'Frenos', 'Brembo', 'Estante B1', 1),
            ('AM001', 'Amortiguador Delantero', 'Amortiguador hidráulico', 120000, 95000, 5, 1, 'Suspensión', 'Monroe', 'Estante C1', 1),
            ('BAT001', 'Batería 12V 60Ah', 'Batería para vehículo', 85000, 70000, 8, 2, 'Eléctrico', 'Varta', 'Estante D1', 1)
        `);

        // Insertar datos iniciales de clientes (5 únicos)
        db.run(`
          INSERT OR IGNORE INTO clientes (nombre, rut, email, telefono, direccion, activo) 
          VALUES 
            ('Juan Pérez', '12.345.678-9', 'juan.perez@email.com', '+56912345678', 'Av. Principal 123, Puerto Montt', 1),
            ('María González', '98.765.432-1', 'maria.gonzalez@email.com', '+56987654321', 'Calle Secundaria 456, Puerto Montt', 1),
            ('Carlos Mendoza', '11.222.333-4', 'carlos.mendoza@email.com', '+56911222333', 'Pasaje Norte 789, Puerto Montt', 1),
            ('Ana Torres', '55.666.777-8', 'ana.torres@email.com', '+56955666777', 'Av. Sur 321, Puerto Montt', 1),
            ('Pedro Silva', '99.888.777-6', 'pedro.silva@email.com', '+56999888777', 'Calle Este 654, Puerto Montt', 1)
        `);

        // Insertar datos iniciales de vehículos (5 únicos, uno por cliente)
        db.run(`
          INSERT OR IGNORE INTO vehiculos (clienteId, marca, modelo, año, patente, color, kilometraje, activo) 
          VALUES 
            (1, 'Toyota', 'Corolla', 2020, 'ABC123', 'Blanco', 45000, 1),
            (2, 'Honda', 'Civic', 2019, 'DEF456', 'Negro', 32000, 1),
            (3, 'Nissan', 'Sentra', 2021, 'GHI789', 'Azul', 28000, 1),
            (4, 'Hyundai', 'Elantra', 2020, 'JKL012', 'Rojo', 35000, 1),
            (5, 'Kia', 'Forte', 2018, 'MNO345', 'Gris', 42000, 1)
        `);

        // Insertar datos iniciales de cotizaciones (5 únicos)
        db.run(`
          INSERT INTO cotizaciones (numero, clienteId, vehiculoId, fecha, validaHasta, estado, descripcion, observaciones, total) 
          VALUES 
            ('COT-2025-001', 1, 1, '${new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}', '${new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}', 'Pendiente', 'Revisión general del vehículo', 'Cliente solicita cotización para mantenimiento preventivo', 85000),
            ('COT-2025-002', 2, 2, '${new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}', '${new Date(Date.now() + 22 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}', 'Aprobada', 'Reparación de frenos', 'Cambio de pastillas y discos de freno', 120000),
            ('COT-2025-003', 3, 3, '${new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}', '${new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}', 'Vencida', 'Reparación de suspensión', 'Cambio de amortiguadores delanteros', 180000),
            ('COT-2025-004', 4, 4, '${new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}', '${new Date(Date.now() + 27 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}', 'Pendiente', 'Sistema de climatización', 'Reparación del aire acondicionado', 95000),
            ('COT-2025-005', 5, 5, '${new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}', '${new Date(Date.now() + 29 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}', 'Aprobada', 'Cambio de aceite y filtros', 'Mantenimiento básico del motor', 35000)
        `);

        // Insertar datos iniciales de órdenes de trabajo (5 únicos)
        db.run(`
          INSERT OR IGNORE INTO ordenes_trabajo (numero, clienteId, vehiculoId, fechaIngreso, fechaEntrega, estado, descripcion, observaciones, total, kilometrajeEntrada, prioridad, tecnicoAsignado) 
          VALUES 
            ('ORD-2025-001', 1, 1, '${new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}', '${new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}', 'En Progreso', 'Revisión general del vehículo', 'Cliente solicita mantenimiento preventivo', 85000, 45000, 'Normal', 'Carlos Mendoza'),
            ('ORD-2025-002', 2, 2, '${new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}', '${new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}', 'Completada', 'Reparación de frenos', 'Cambio de pastillas y discos de freno', 120000, 32000, 'Alta', 'María González'),
            ('ORD-2025-003', 3, 3, '${new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}', '${new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}', 'Pendiente', 'Reparación de suspensión', 'Cambio de amortiguadores delanteros', 180000, 28000, 'Normal', 'Pedro Silva'),
            ('ORD-2025-004', 4, 4, '${new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}', '${new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}', 'En Progreso', 'Sistema de climatización', 'Reparación del aire acondicionado', 95000, 35000, 'Baja', 'Ana Torres'),
            ('ORD-2025-005', 5, 5, '${new Date().toISOString().split('T')[0]}', '${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}', 'Pendiente', 'Cambio de aceite y filtros', 'Mantenimiento básico del motor', 35000, 42000, 'Normal', 'Juan Pérez')
        `);

        // Insertar detalles de cotizaciones
        db.run(`
          INSERT INTO detalles_cotizacion (cotizacionId, tipo, servicioId, repuestoId, cantidad, precio, subtotal, descripcion) 
          VALUES 
            (1, 'servicio', 3, NULL, 1, 25000, 25000, 'Revisión General'),
            (1, 'servicio', 4, NULL, 1, 15000, 15000, 'Cambio de Aceite'),
            (1, 'repuesto', NULL, 2, 1, 8000, 8000, 'Filtro de Aceite'),
            (1, 'servicio', 5, NULL, 1, 20000, 20000, 'Alineación'),
            
            (2, 'servicio', 1, NULL, 1, 35000, 35000, 'Frenos'),
            (2, 'repuesto', NULL, 3, 1, 35000, 35000, 'Pastillas de Freno'),
            (2, 'repuesto', NULL, 2, 2, 45000, 90000, 'Discos de Freno'),
            
            (3, 'servicio', 2, NULL, 1, 40000, 40000, 'Suspensión'),
            (3, 'repuesto', NULL, 4, 2, 120000, 240000, 'Amortiguador Delantero'),
            
            (4, 'servicio', 3, NULL, 1, 25000, 25000, 'Revisión General'),
            (4, 'servicio', 1, NULL, 1, 35000, 35000, 'Frenos'),
            (4, 'repuesto', NULL, 4, 1, 120000, 120000, 'Amortiguador Delantero'),
            
            (5, 'servicio', 4, NULL, 1, 15000, 15000, 'Cambio de Aceite'),
            (5, 'repuesto', NULL, 2, 1, 8000, 8000, 'Filtro de Aceite'),
            (5, 'servicio', 1, NULL, 1, 35000, 35000, 'Frenos')
        `);

        // Insertar datos iniciales de órdenes de trabajo
        db.run(`
          INSERT OR IGNORE INTO ordenes_trabajo (numero, clienteId, vehiculoId, fechaIngreso, fechaEntrega, estado, descripcion, observaciones, total, kilometrajeEntrada, kilometrajeSalida, prioridad, tecnicoAsignado) 
          VALUES 
            ('OT-2025-001', 1, 1, '${new Date().toISOString().split('T')[0]}', '${new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}', 'Completada', 'Revisión general y mantenimiento', 'Vehículo en buen estado general', 85000, 45000, 45000, 'Media', 'Carlos Mendoza'),
            ('OT-2025-002', 2, 2, '${new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}', '${new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}', 'Completada', 'Reparación de frenos', 'Cambio completo de sistema de frenos', 120000, 32000, 32000, 'Alta', 'María González'),
            ('OT-2025-003', 1, 1, '${new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}', NULL, 'En Proceso', 'Reparación de suspensión', 'Cambio de amortiguadores delanteros', 180000, 46000, NULL, 'Media', 'Carlos Mendoza'),
            ('OT-2025-004', 2, 2, '${new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}', NULL, 'Pendiente', 'Sistema de climatización', 'Reparación del aire acondicionado', 95000, 33000, NULL, 'Baja', 'Pedro Silva'),
            ('OT-2025-005', 1, 1, '${new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}', '${new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}', 'Completada', 'Cambio de aceite y filtros', 'Mantenimiento básico del motor', 35000, 47000, 47000, 'Baja', 'Ana Torres')
        `);

        // Insertar detalles de órdenes de trabajo
        const dbDetalles = this.ensureDb();
        dbDetalles.run(`
          INSERT INTO detalles_orden (ordenId, tipo, servicioId, repuestoId, cantidad, precio, subtotal, descripcion) 
          VALUES 
            (1, 'servicio', 3, NULL, 1, 25000, 25000, 'Revisión General'),
            (1, 'servicio', 4, NULL, 1, 15000, 15000, 'Cambio de Aceite'),
            (1, 'repuesto', NULL, 2, 1, 8000, 8000, 'Filtro de Aceite'),
            (1, 'servicio', 5, NULL, 1, 20000, 20000, 'Alineación'),
            
            (2, 'servicio', 1, NULL, 1, 35000, 35000, 'Frenos'),
            (2, 'repuesto', NULL, 3, 1, 35000, 35000, 'Pastillas de Freno'),
            (2, 'repuesto', NULL, 2, 2, 45000, 90000, 'Discos de Freno'),
            
            (3, 'servicio', 2, NULL, 1, 40000, 40000, 'Suspensión'),
            (3, 'repuesto', NULL, 4, 2, 120000, 240000, 'Amortiguador Delantero'),
            
            (4, 'servicio', 3, NULL, 1, 25000, 25000, 'Revisión General'),
            (4, 'servicio', 1, NULL, 1, 35000, 35000, 'Frenos'),
            (4, 'repuesto', NULL, 4, 1, 120000, 120000, 'Amortiguador Delantero'),
            
            (5, 'servicio', 4, NULL, 1, 15000, 15000, 'Cambio de Aceite'),
            (5, 'repuesto', NULL, 2, 1, 8000, 8000, 'Filtro de Aceite'),
            (5, 'servicio', 1, NULL, 1, 35000, 35000, 'Frenos')
        `);

        console.log('✅ Datos iniciales únicos insertados (5 por módulo)');
      });
    });
  }

  // Métodos para usuarios
  async getAllUsuarios(): Promise<Usuario[]> {
    return new Promise((resolve, reject) => {
      this.ensureDb().all('SELECT * FROM usuarios ORDER BY nombre', (err, rows) => {
        if (err) reject(err);
        else resolve(rows as Usuario[]);
      });
    });
  }

  async saveUsuario(usuario: Usuario): Promise<Usuario> {
    const id = usuario.id || Date.now();
    const usuarioToSave = { ...usuario, id };

    return new Promise((resolve, reject) => {
      this.ensureDb().run(
        `INSERT OR REPLACE INTO usuarios (id, nombre, email, password, rol, activo, fechaCreacion)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, usuarioToSave.nombre, usuarioToSave.email, usuarioToSave.password, 
         usuarioToSave.rol, usuarioToSave.activo, usuarioToSave.fechaCreacion || new Date().toISOString()],
        function(err) {
          if (err) reject(err);
          else resolve(usuarioToSave);
        }
      );
    });
  }

  async deleteUsuario(id: number): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.ensureDb().run(
        'DELETE FROM usuarios WHERE id = ?',
        [id],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes > 0);
        }
      );
    });
  }

  // Métodos para proveedores
  async getAllProveedores(): Promise<Proveedor[]> {
    return new Promise((resolve, reject) => {
      this.ensureDb().all('SELECT * FROM proveedores ORDER BY nombre', (err, rows) => {
        if (err) reject(err);
        else resolve(rows as Proveedor[]);
      });
    });
  }

  async saveProveedor(proveedor: Proveedor): Promise<Proveedor> {
    const id = proveedor.id || Date.now();
    const proveedorToSave = { ...proveedor, id };

    return new Promise((resolve, reject) => {
      const dbServiceInstance = this;
      this.ensureDb().run(
        `INSERT OR REPLACE INTO proveedores 
         (id, nombre, tipoContribuyente, direccionFiscal, nombreFantasia, identificacionTributaria, 
          ciudadFiscal, telefono, email, personaContacto, telefonoAlternativo, emailAlternativo, 
          comentario, activo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          proveedorToSave.nombre,
          proveedorToSave.tipoContribuyente || null,
          proveedorToSave.direccionFiscal || null,
          proveedorToSave.nombreFantasia || null,
          proveedorToSave.identificacionTributaria || null,
          proveedorToSave.ciudadFiscal || null,
          proveedorToSave.telefono || null,
          proveedorToSave.email || null,
          proveedorToSave.personaContacto || null,
          proveedorToSave.telefonoAlternativo || null,
          proveedorToSave.emailAlternativo || null,
          proveedorToSave.comentario || null,
          proveedorToSave.activo !== undefined ? proveedorToSave.activo : 1
        ],
        function(err) {
          if (err) reject(err);
          else {
            dbServiceInstance.createAutoBackup().catch(console.error);
            dbServiceInstance.invalidateCache();
            resolve(proveedorToSave);
          }
        }
      );
    });
  }

  async deleteProveedor(id: number): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const dbServiceInstance = this;
      this.ensureDb().run(
        'DELETE FROM proveedores WHERE id = ?',
        [id],
        function(err) {
          if (err) reject(err);
          else {
            if (this.changes > 0) {
              dbServiceInstance.createAutoBackup().catch(console.error);
              dbServiceInstance.invalidateCache();
            }
            resolve(this.changes > 0);
          }
        }
      );
    });
  }

  // Métodos para categorías
  async getAllCategorias(): Promise<Categoria[]> {
    return new Promise((resolve, reject) => {
      this.ensureDb().all('SELECT * FROM categorias ORDER BY nombre', (err, rows) => {
        if (err) reject(err);
        else resolve(rows as Categoria[]);
      });
    });
  }

  async saveCategoria(categoria: Categoria): Promise<Categoria> {
    const id = categoria.id || Date.now();
    const categoriaToSave = { ...categoria, id };

    return new Promise((resolve, reject) => {
      const dbServiceInstance = this;
      this.ensureDb().run(
        `INSERT OR REPLACE INTO categorias (id, nombre, activo)
         VALUES (?, ?, ?)`,
        [
          id,
          categoriaToSave.nombre,
          categoriaToSave.activo !== undefined ? categoriaToSave.activo : 1
        ],
        function(err) {
          if (err) reject(err);
          else {
            dbServiceInstance.createAutoBackup().catch(console.error);
            dbServiceInstance.invalidateCache();
            resolve(categoriaToSave);
          }
        }
      );
    });
  }

  async deleteCategoria(id: number): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const dbServiceInstance = this;
      this.ensureDb().run(
        'DELETE FROM categorias WHERE id = ?',
        [id],
        function(err) {
          if (err) reject(err);
          else {
            if (this.changes > 0) {
              dbServiceInstance.createAutoBackup().catch(console.error);
              dbServiceInstance.invalidateCache();
            }
            resolve(this.changes > 0);
          }
        }
      );
    });
  }

  // Métodos para clientes
  async getAllClientes(): Promise<Cliente[]> {
    const cacheKey = 'getAllClientes';
    const cached = this.queryCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    return retryWithBackoff(() => {
      return new Promise<Cliente[]>((resolve, reject) => {
        this.ensureDb().all('SELECT * FROM clientes ORDER BY nombre', (err, rows) => {
          if (err) reject(err);
          else {
            // Eliminar duplicados por ID antes de devolver
            const clientesUnicos = rows.filter((cliente: any, index: number, self: any[]) => 
              index === self.findIndex((c: any) => c.id === cliente.id)
            );
            this.queryCache.set(cacheKey, clientesUnicos);
            resolve(clientesUnicos as Cliente[]);
          }
        });
      });
    }, {
      maxRetries: 3,
      initialDelay: 100,
      retryableErrors: ['SQLITE_BUSY', 'SQLITE_LOCKED']
    });
  }

  async getClientesPaginated(limit: number = 50, offset: number = 0): Promise<{ data: Cliente[]; total: number }> {
    const cacheKey = `getClientesPaginated_${limit}_${offset}`;
    const cached = this.queryCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    return new Promise((resolve, reject) => {
      // Obtener total primero
      this.ensureDb().get('SELECT COUNT(*) as total FROM clientes', (err: any, countRow: any) => {
        if (err) {
          reject(err);
          return;
        }
        const total = countRow?.total || 0;

        // Obtener datos paginados
        this.ensureDb().all(
          'SELECT * FROM clientes ORDER BY nombre LIMIT ? OFFSET ?',
          [limit, offset],
          (err: any, rows: any[]) => {
            if (err) {
              reject(err);
            } else {
              const clientesUnicos = rows.filter((cliente: any, index: number, self: any[]) => 
                index === self.findIndex((c: any) => c.id === cliente.id)
              );
              const result = { data: clientesUnicos as Cliente[], total };
              this.queryCache.set(cacheKey, result);
              resolve(result);
            }
          }
        );
      });
    });
  }

  async searchClientes(searchTerm: string): Promise<Cliente[]> {
    const cacheKey = `searchClientes_${searchTerm}`;
    const cached = this.queryCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    return new Promise((resolve, reject) => {
      // Usar índice FULLTEXT si está disponible
      this.ensureDb().all(
        `SELECT c.* FROM clientes c
         JOIN clientes_fts fts ON c.id = fts.rowid
         WHERE clientes_fts MATCH ?
         ORDER BY c.nombre`,
        [`${searchTerm}*`],
        (err: any, rows: any[]) => {
          if (err) {
            // Fallback a búsqueda normal si FTS falla
            const searchLower = searchTerm.toLowerCase();
            this.ensureDb().all(
              'SELECT * FROM clientes WHERE nombre LIKE ? OR email LIKE ? OR telefono LIKE ? ORDER BY nombre',
              [`%${searchLower}%`, `%${searchLower}%`, `%${searchTerm}%`],
              (err2: any, rows2: any[]) => {
                if (err2) reject(err2);
                else {
                  this.queryCache.set(cacheKey, rows2 as Cliente[]);
                  resolve(rows2 as Cliente[]);
                }
              }
            );
          } else {
            this.queryCache.set(cacheKey, rows as Cliente[]);
            resolve(rows as Cliente[]);
          }
        }
      );
    });
  }

  // Invalidar caché cuando se modifica datos
  private invalidateCache(): void {
    this.queryCache.clear();
  }

  async saveCliente(cliente: Cliente): Promise<Cliente> {
    const id = cliente.id || Date.now();
    const emailNormalizado = cliente.email?.trim() ? cliente.email.trim() : null;
    const clienteToSave = { ...cliente, id, email: emailNormalizado };
    const db = this.ensureDb();

    return new Promise((resolve, reject) => {
      // Primero verificar si ya existe un cliente con el mismo RUT o email
      const params = clienteToSave.email
        ? [clienteToSave.rut, clienteToSave.email, clienteToSave.id]
        : [clienteToSave.rut, clienteToSave.id];
      const query = clienteToSave.email
        ? `SELECT id FROM clientes WHERE (rut = ? OR email = ?) AND id != ?`
        : `SELECT id FROM clientes WHERE rut = ? AND id != ?`;

      db.get(query, params, (err, existingCliente) => {
        if (err) {
          reject(err);
          return;
        }

        if (existingCliente) {
          reject(new Error('Ya existe un cliente con el mismo RUT o email'));
          return;
        }

        // Si no existe duplicado, proceder con el guardado
        db.run(
          `INSERT INTO clientes (id, nombre, rut, telefono, email, direccion, fechaRegistro)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             nombre = excluded.nombre,
             rut = excluded.rut,
             telefono = excluded.telefono,
             email = excluded.email,
             direccion = excluded.direccion,
             fechaRegistro = excluded.fechaRegistro`,
          [id, clienteToSave.nombre, clienteToSave.rut, clienteToSave.telefono, 
           clienteToSave.email, clienteToSave.direccion, clienteToSave.fechaRegistro || new Date().toISOString()],
          (err: any) => {
            if (err) reject(err);
            else {
              // Crear backup automático después de guardar
              this.createAutoBackup().catch(console.error);
              this.invalidateCache(); // Invalidar caché después de modificar
              resolve(clienteToSave);
            }
          }
        );
      });
    });
  }

  async deleteCliente(id: number): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const db = this.ensureDb();
      
      // Validar ID
      if (!id || typeof id !== 'number' || id <= 0) {
        reject(new Error('ID de cliente inválido'));
        return;
      }

      const begin = () => new Promise<void>((res, rej) => db.run('BEGIN TRANSACTION', (e) => e ? rej(e) : res()));
      const commit = () => new Promise<void>((res, rej) => db.run('COMMIT', (e) => e ? rej(e) : res()));
      const rollback = () => new Promise<void>((res) => {
        db.run('ROLLBACK', (err) => {
          if (err) {
            console.error('Error al hacer rollback:', err);
          }
          res();
        });
      });

      // Verificar que el cliente existe antes de intentar eliminarlo
      db.get('SELECT id FROM clientes WHERE id = ?', [id], (err: any, row: any) => {
        if (err) {
          reject(new Error(`Error al verificar existencia del cliente: ${err.message}`));
          return;
        }
        
        if (!row) {
          reject(new Error(`Cliente con ID ${id} no existe`));
          return;
        }

        // Iniciar transacción y habilitar foreign keys
        begin()
          .then(() => new Promise<void>((res, rej) => {
            // Habilitar foreign keys dentro de la transacción
            db.run('PRAGMA foreign_keys = ON', (e: any) => {
              if (e) {
                console.warn('Advertencia: No se pudieron habilitar foreign keys:', e);
                // Continuar de todas formas, ya que deberían estar habilitadas globalmente
              }
              res();
            });
          }))
          // Eliminar detalles de órdenes primero (en cascada pero más seguro hacerlo manualmente)
          .then(() => new Promise<void>((res, rej) => {
            db.run(`
              DELETE FROM detalles_orden 
              WHERE ordenId IN (
                SELECT id FROM ordenes_trabajo WHERE clienteId = ?
              )
            `, [id], (err: any) => {
              if (err) {
                console.error('Error eliminando detalles de órdenes:', err);
                rej(new Error(`Error al eliminar detalles de órdenes: ${err.message}`));
              } else {
                res();
              }
            });
          }))
          // Eliminar detalles de cotizaciones
          .then(() => new Promise<void>((res, rej) => {
            db.run(`
              DELETE FROM detalles_cotizacion 
              WHERE cotizacionId IN (
                SELECT id FROM cotizaciones WHERE clienteId = ?
              )
            `, [id], (err: any) => {
              if (err) {
                console.error('Error eliminando detalles de cotizaciones:', err);
                rej(new Error(`Error al eliminar detalles de cotizaciones: ${err.message}`));
              } else {
                res();
              }
            });
          }))
          // Eliminar órdenes de trabajo
          .then(() => new Promise<void>((res, rej) => {
            db.run('DELETE FROM ordenes_trabajo WHERE clienteId = ?', [id], (err: any) => {
              if (err) {
                console.error('Error eliminando órdenes de trabajo:', err);
                rej(new Error(`Error al eliminar órdenes de trabajo: ${err.message}`));
              } else {
                res();
              }
            });
          }))
          // Eliminar cotizaciones
          .then(() => new Promise<void>((res, rej) => {
            db.run('DELETE FROM cotizaciones WHERE clienteId = ?', [id], (err: any) => {
              if (err) {
                console.error('Error eliminando cotizaciones:', err);
                rej(new Error(`Error al eliminar cotizaciones: ${err.message}`));
              } else {
                res();
              }
            });
          }))
          // Eliminar vehículos (tiene FK a cliente)
          .then(() => new Promise<void>((res, rej) => {
            db.run('DELETE FROM vehiculos WHERE clienteId = ?', [id], (err: any) => {
              if (err) {
                console.error('Error eliminando vehículos:', err);
                rej(new Error(`Error al eliminar vehículos: ${err.message}`));
              } else {
                res();
              }
            });
          }))
          // Finalmente eliminar el cliente
          .then(() => new Promise<boolean>((res, rej) => {
            db.run('DELETE FROM clientes WHERE id = ?', [id], function(err: any) {
              if (err) {
                console.error('Error eliminando cliente:', err);
                rej(new Error(`Error al eliminar cliente: ${err.message}`));
              } else {
                const deleted = (this as any).changes > 0;
                if (!deleted) {
                  console.warn(`Advertencia: No se eliminó ningún cliente con ID ${id}`);
                }
                res(deleted);
              }
            });
          }))
          .then((deleted) => {
            if (!deleted) {
              return rollback().then(() => {
                reject(new Error(`No se pudo eliminar el cliente con ID ${id}`));
              });
            }
            return commit().then(() => {
              console.log(`✅ Cliente ${id} eliminado exitosamente`);
              this.createAutoBackup().catch(console.error);
              this.invalidateCache();
              resolve(deleted);
            });
          })
          .catch(async (error) => {
            console.error('❌ Error en transacción de eliminación de cliente:', error);
            try {
              await rollback();
            } catch (rollbackError) {
              console.error('Error crítico al hacer rollback:', rollbackError);
            }
            reject(error);
          });
      });
    });
  }

  // Función para limpiar duplicados de clientes
  async limpiarDuplicadosClientes(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ensureDb().run(`
        DELETE FROM clientes 
        WHERE id NOT IN (
          SELECT MIN(id) 
          FROM clientes 
          GROUP BY rut
        )
      `, (err) => {
        if (err) reject(err);
        else {
          console.log('✅ Duplicados de clientes eliminados');
          resolve();
        }
      });
    });
  }

  // Métodos para vehículos
  async getAllVehiculos(): Promise<Vehiculo[]> {
    return new Promise((resolve, reject) => {
      this.ensureDb().all('SELECT * FROM vehiculos ORDER BY marca, modelo', (err, rows) => {
        if (err) reject(err);
        else resolve(rows as Vehiculo[]);
      });
    });
  }

  async getVehiculosPaginated(limit: number = 50, offset: number = 0): Promise<{ data: Vehiculo[]; total: number }> {
    const cacheKey = `getVehiculosPaginated_${limit}_${offset}`;
    const cached = this.queryCache.get(cacheKey);
    if (cached) return cached;

    return new Promise((resolve, reject) => {
      this.ensureDb().get('SELECT COUNT(*) as total FROM vehiculos', (err: any, row: any) => {
        if (err) {
          reject(err);
          return;
        }
        const total = row?.total ?? 0;
        this.ensureDb().all(
          'SELECT * FROM vehiculos ORDER BY marca, modelo LIMIT ? OFFSET ?',
          [limit, offset],
          (err2: any, rows: any[]) => {
            if (err2) reject(err2);
            else {
              const result = { data: rows as Vehiculo[], total };
              this.queryCache.set(cacheKey, result);
              resolve(result);
            }
          }
        );
      });
    });
  }

  async saveVehiculo(vehiculo: Vehiculo): Promise<Vehiculo> {
    const id = vehiculo.id || 0;
    const vehiculoToSave = { ...vehiculo, id };
    const db = this.ensureDb();

    return new Promise((resolve, reject) => {
      // Validar FK: cliente debe existir
      db.get('SELECT COUNT(*) as c FROM clientes WHERE id = ?', [vehiculoToSave.clienteId], (chkErr: any, row: any) => {
        if (chkErr) {
          reject(chkErr);
          return;
        }
        if (!row || row.c === 0) {
          reject(new Error(`Cliente con ID ${vehiculoToSave.clienteId} no existe`));
          return;
        }

        // Verificar patente duplicada en otro vehículo
        db.get(
          'SELECT id FROM vehiculos WHERE patente = ? AND id != ?',
          [vehiculoToSave.patente, vehiculoToSave.id || 0],
          (dupErr: any, dupRow: any) => {
            if (dupErr) {
              reject(dupErr);
              return;
            }
            if (dupRow) {
              reject(new Error('Ya existe un vehículo con esa patente'));
              return;
            }

            if (vehiculoToSave.id && vehiculoToSave.id > 0) {
              db.run(
                `UPDATE vehiculos
                 SET clienteId = ?, marca = ?, modelo = ?, año = ?, patente = ?, numeroChasis = ?, color = ?, kilometraje = ?, observaciones = ?, activo = ?
                 WHERE id = ?`,
                [
                  vehiculoToSave.clienteId, vehiculoToSave.marca, vehiculoToSave.modelo,
                  vehiculoToSave.año, vehiculoToSave.patente, vehiculoToSave.numeroChasis, vehiculoToSave.color,
                  vehiculoToSave.kilometraje, vehiculoToSave.observaciones, vehiculoToSave.activo, vehiculoToSave.id
                ],
                function(err: any) {
                  if (err) {
                    reject(err);
                  } else if ((this as any).changes === 0) {
                    reject(new Error(`Vehículo con ID ${vehiculoToSave.id} no existe`));
                  } else {
                    resolve(vehiculoToSave);
                  }
                }
              );
            } else {
              db.run(
                `INSERT INTO vehiculos (clienteId, marca, modelo, año, patente, numeroChasis, color, kilometraje, observaciones, activo)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  vehiculoToSave.clienteId, vehiculoToSave.marca, vehiculoToSave.modelo,
                  vehiculoToSave.año, vehiculoToSave.patente, vehiculoToSave.numeroChasis, vehiculoToSave.color,
                  vehiculoToSave.kilometraje, vehiculoToSave.observaciones, vehiculoToSave.activo
                ],
                function(err: any) {
                  if (err) reject(err);
                  else resolve({ ...vehiculoToSave, id: (this as any).lastID });
                }
              );
            }
          }
        );
      });
    }).then((saved) => {
      this.createAutoBackup().catch(console.error);
      this.invalidateCache();
      return saved as Vehiculo;
    });
  }

  async deleteVehiculo(id: number): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const dbServiceInstance = this;
      this.ensureDb().run(
        'DELETE FROM vehiculos WHERE id = ?',
        [id],
        function(err: any) {
          if (err) reject(err);
          else {
            dbServiceInstance.createAutoBackup().catch(console.error);
            const deleted = (this as any).changes > 0;
            resolve(deleted);
          }
        }
      );
    });
  }

  // Métodos para servicios
  async getAllServicios(): Promise<Servicio[]> {
    return new Promise((resolve, reject) => {
      this.ensureDb().all('SELECT * FROM servicios ORDER BY nombre', (err, rows) => {
        if (err) reject(err);
        else resolve(rows as Servicio[]);
      });
    });
  }

  async saveServicio(servicio: Servicio): Promise<Servicio> {
    const id = servicio.id || Date.now();
    const servicioToSave = { ...servicio, id };

    return new Promise((resolve, reject) => {
      const dbServiceInstance = this;
      this.ensureDb().run(
        `INSERT OR REPLACE INTO servicios (id, nombre, descripcion, precio, duracionEstimada, activo)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, servicioToSave.nombre, servicioToSave.descripcion, servicioToSave.precio, 
         servicioToSave.duracionEstimada, servicioToSave.activo],
        function(err) {
          if (err) reject(err);
          else {
            dbServiceInstance.createAutoBackup().catch(console.error);
            dbServiceInstance.invalidateCache(); // Invalidar caché después de modificar
            resolve(servicioToSave);
          }
        }
      );
    });
  }

  async deleteServicio(id: number): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.ensureDb().run(
        'DELETE FROM servicios WHERE id = ?',
        [id],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes > 0);
        }
      );
    });
  }

  // Métodos para repuestos
  async getAllRepuestos(): Promise<Repuesto[]> {
    const cacheKey = 'getAllRepuestos';
    const cached = this.queryCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    return new Promise((resolve, reject) => {
      this.ensureDb().all('SELECT * FROM repuestos ORDER BY nombre', (err, rows) => {
        if (err) reject(err);
        else {
          this.queryCache.set(cacheKey, rows as Repuesto[]);
          resolve(rows as Repuesto[]);
        }
      });
    });
  }

  async getRepuestosPaginated(limit: number = 50, offset: number = 0): Promise<{ data: Repuesto[]; total: number }> {
    const cacheKey = `getRepuestosPaginated_${limit}_${offset}`;
    const cached = this.queryCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    return new Promise((resolve, reject) => {
      this.ensureDb().get('SELECT COUNT(*) as total FROM repuestos', (err: any, countRow: any) => {
        if (err) {
          reject(err);
          return;
        }
        const total = countRow?.total || 0;

        this.ensureDb().all(
          'SELECT * FROM repuestos ORDER BY nombre LIMIT ? OFFSET ?',
          [limit, offset],
          (err: any, rows: any[]) => {
            if (err) {
              reject(err);
            } else {
              const result = { data: rows as Repuesto[], total };
              this.queryCache.set(cacheKey, result);
              resolve(result);
            }
          }
        );
      });
    });
  }

  async searchRepuestos(searchTerm: string): Promise<Repuesto[]> {
    const normalizedTerm = searchTerm.trim();
    if (!normalizedTerm) {
      return [];
    }

    const cacheKey = `searchRepuestos_${normalizedTerm}`;
    const cached = this.queryCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    return new Promise((resolve, reject) => {
      // Extraer términos individuales
      const terms = normalizedTerm.split(/\s+/).filter(t => t.length > 0);
      
      // Construir query FTS5 para múltiples términos (cada término debe aparecer)
      // FTS5 soporta "term1 term2" (AND) o "term1 OR term2"
      // Usamos formato de múltiples términos para búsqueda más flexible
      const ftsQuery = terms.map(t => `${t}*`).join(' OR ');
      
      // Usar índice FULLTEXT si está disponible (búsqueda rápida)
      this.ensureDb().all(
        `SELECT DISTINCT r.* FROM repuestos r
         JOIN repuestos_fts fts ON r.id = fts.rowid
         WHERE repuestos_fts MATCH ?
         ORDER BY 
           CASE 
             WHEN LOWER(r.nombre) LIKE ? THEN 1
             WHEN LOWER(r.codigo) LIKE ? THEN 2
             ELSE 3
           END,
           r.nombre`,
        [ftsQuery, `%${normalizedTerm.toLowerCase()}%`, `%${normalizedTerm.toLowerCase()}%`],
        (err: any, rows: any[]) => {
          if (err) {
            // Fallback a búsqueda normal si FTS falla (búsqueda con LIKE en múltiples campos)
            const searchLower = normalizedTerm.toLowerCase();
            const likePattern = `%${searchLower}%`;
            
            // Construir query con múltiples términos (cada término debe aparecer en algún campo)
            const termConditions = terms.map(() => 
              '(LOWER(nombre) LIKE ? OR LOWER(codigo) LIKE ? OR LOWER(descripcion) LIKE ? OR LOWER(categoria) LIKE ?)'
            ).join(' AND ');
            
            const termParams = terms.flatMap(t => {
              const termPattern = `%${t.toLowerCase()}%`;
              return [termPattern, termPattern, termPattern, termPattern];
            });
            
            this.ensureDb().all(
              `SELECT * FROM repuestos 
               WHERE ${termConditions}
               ORDER BY 
                 CASE 
                   WHEN LOWER(nombre) LIKE ? THEN 1
                   WHEN LOWER(codigo) LIKE ? THEN 2
                   ELSE 3
                 END,
                 nombre`,
              [...termParams, likePattern, likePattern],
              (err2: any, rows2: any[]) => {
                if (err2) reject(err2);
                else {
                  // Eliminar duplicados por ID
                  const uniqueRows = rows2.filter((row: any, index: number, self: any[]) =>
                    index === self.findIndex((r: any) => r.id === row.id)
                  );
                  this.queryCache.set(cacheKey, uniqueRows as Repuesto[]);
                  resolve(uniqueRows as Repuesto[]);
                }
              }
            );
          } else {
            // Eliminar duplicados por ID
            const uniqueRows = rows.filter((row: any, index: number, self: any[]) =>
              index === self.findIndex((r: any) => r.id === row.id)
            );
            this.queryCache.set(cacheKey, uniqueRows as Repuesto[]);
            resolve(uniqueRows as Repuesto[]);
          }
        }
      );
    });
  }

  async saveRepuesto(repuesto: Repuesto): Promise<Repuesto> {
    const [saved] = await this.saveRepuestosBatch([repuesto]);
    return saved;
  }

  async deleteRepuesto(id: number): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const dbServiceInstance = this;
      this.ensureDb().run(
        'DELETE FROM repuestos WHERE id = ?',
        [id],
        function(err: any) {
          if (err) reject(err);
          else {
            dbServiceInstance.createAutoBackup().catch(console.error);
            const deleted = (this as any).changes > 0;
            resolve(deleted);
          }
        }
      );
    });
  }

  // Métodos para cotizaciones
  async getAllCotizaciones(): Promise<Cotizacion[]> {
    return new Promise((resolve, reject) => {
      this.ensureDb().all('SELECT * FROM cotizaciones ORDER BY fecha DESC', (err, rows) => {
        if (err) reject(err);
        else resolve(rows as Cotizacion[]);
      });
    });
  }

  async getCotizacionesPaginated(limit: number = 50, offset: number = 0): Promise<{ data: Cotizacion[]; total: number }> {
    const cacheKey = `getCotizacionesPaginated_${limit}_${offset}`;
    const cached = this.queryCache.get(cacheKey);
    if (cached) return cached;

    return new Promise((resolve, reject) => {
      this.ensureDb().get('SELECT COUNT(*) as total FROM cotizaciones', (err: any, row: any) => {
        if (err) {
          reject(err);
          return;
        }
        const total = row?.total ?? 0;
        this.ensureDb().all(
          'SELECT * FROM cotizaciones ORDER BY fecha DESC LIMIT ? OFFSET ?',
          [limit, offset],
          (err2: any, rows: any[]) => {
            if (err2) reject(err2);
            else {
              const result = { data: rows as Cotizacion[], total };
              this.queryCache.set(cacheKey, result);
              resolve(result);
            }
          }
        );
      });
    });
  }

  async saveCotizacion(cotizacion: Cotizacion): Promise<Cotizacion> {
    const id = cotizacion.id || Date.now();
    const cotizacionToSave = { 
      ...cotizacion, 
      id,
      estado: this.normalizeEstadoCotizacion(cotizacion.estado)
    };

    console.log('💾 Guardando cotización:', {
      id: cotizacionToSave.id,
      numero: cotizacionToSave.numero,
      clienteId: cotizacionToSave.clienteId,
      vehiculoId: cotizacionToSave.vehiculoId,
      total: cotizacionToSave.total
    });

    return new Promise((resolve, reject) => {
      const dbServiceInstance = this;
      // Validar que los IDs existan antes de insertar
      this.ensureDb().get('SELECT COUNT(*) as count FROM clientes WHERE id = ?', [cotizacionToSave.clienteId], (err, row: any) => {
        if (err) {
          console.error('❌ Error verificando cliente:', err);
          reject(err);
          return;
        }
        
        if (row.count === 0) {
          const errorMsg = `Cliente con ID ${cotizacionToSave.clienteId} no existe`;
          console.error('❌', errorMsg);
          reject(new Error(errorMsg));
          return;
        }

        this.ensureDb().get('SELECT COUNT(*) as count FROM vehiculos WHERE id = ?', [cotizacionToSave.vehiculoId], (err, row: any) => {
          if (err) {
            console.error('❌ Error verificando vehículo:', err);
            reject(err);
            return;
          }
          
          if (row.count === 0) {
            const errorMsg = `Vehículo con ID ${cotizacionToSave.vehiculoId} no existe`;
            console.error('❌', errorMsg);
            reject(new Error(errorMsg));
            return;
          }

          // Transacción para insertar cotización (atomicidad)
          const begin = () => new Promise<void>((res, rej) => this.ensureDb().run('BEGIN TRANSACTION', (e) => e ? rej(e) : res()));
          const commit = () => new Promise<void>((res, rej) => this.ensureDb().run('COMMIT', (e) => e ? rej(e) : res()));
          const rollback = () => new Promise<void>((res) => this.ensureDb().run('ROLLBACK', () => res()));

          begin()
            .then(() => new Promise<void>((res, rej) => {
              dbServiceInstance.ensureDb().run(
            `INSERT OR REPLACE INTO cotizaciones (id, numero, clienteId, vehiculoId, fecha, validaHasta, estado, descripcion, observaciones, total)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, cotizacionToSave.numero, cotizacionToSave.clienteId, cotizacionToSave.vehiculoId, 
             cotizacionToSave.fecha, cotizacionToSave.validaHasta, cotizacionToSave.estado, 
             cotizacionToSave.descripcion, cotizacionToSave.observaciones, cotizacionToSave.total],
            function(err: any) {
              if (err) {
                    rej(err);
              } else {
                    res();
                  }
                }
              );
            }))
            .then(() => commit())
            .then(() => {
              console.log('✅ Cotización guardada exitosamente, ID:', id);
                dbServiceInstance.createAutoBackup().catch(console.error);
                dbServiceInstance.invalidateCache(); // Invalidar caché después de modificar
                resolve(cotizacionToSave);
            })
            .catch(async (txErr) => {
              console.error('❌ Error en transacción de cotización:', txErr);
              await rollback();
              reject(txErr);
            });
        });
      });
    });
  }

  async deleteCotizacion(id: number): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const dbServiceInstance = this;
      this.ensureDb().run(
        'DELETE FROM cotizaciones WHERE id = ?',
        [id],
        function(err: any) {
          if (err) reject(err);
          else {
            dbServiceInstance.createAutoBackup().catch(console.error);
            const deleted = (this as any).changes > 0;
            resolve(deleted);
          }
        }
      );
    });
  }

  // Métodos para órdenes de trabajo
  async getAllOrdenesTrabajo(): Promise<OrdenTrabajo[]> {
    const cacheKey = 'getAllOrdenesTrabajo';
    const cached = this.queryCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    return retryWithBackoff(() => {
      return new Promise<OrdenTrabajo[]>((resolve, reject) => {
        this.ensureDb().all('SELECT * FROM ordenes_trabajo ORDER BY fechaIngreso DESC', (err, rows) => {
          if (err) reject(err);
          else {
            this.queryCache.set(cacheKey, rows as OrdenTrabajo[]);
            resolve(rows as OrdenTrabajo[]);
          }
        });
      });
    }, {
      maxRetries: 3,
      initialDelay: 100,
      retryableErrors: ['SQLITE_BUSY', 'SQLITE_LOCKED']
    });
  }

  async getOrdenesTrabajoPaginated(limit: number = 50, offset: number = 0): Promise<{ data: OrdenTrabajo[]; total: number }> {
    const cacheKey = `getOrdenesTrabajoPaginated_${limit}_${offset}`;
    const cached = this.queryCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    return new Promise((resolve, reject) => {
      this.ensureDb().get('SELECT COUNT(*) as total FROM ordenes_trabajo', (err: any, countRow: any) => {
        if (err) {
          reject(err);
          return;
        }
        const total = countRow?.total || 0;

        this.ensureDb().all(
          'SELECT * FROM ordenes_trabajo ORDER BY fechaIngreso DESC LIMIT ? OFFSET ?',
          [limit, offset],
          (err: any, rows: any[]) => {
            if (err) {
              reject(err);
            } else {
              const result = { data: rows as OrdenTrabajo[], total };
              this.queryCache.set(cacheKey, result);
              resolve(result);
            }
          }
        );
      });
    });
  }

  // Funciones helper para normalizar valores al formato de la base de datos
  private normalizeEstado(estado: string): string {
    const estadoMap: Record<string, string> = {
      'pendiente': 'Pendiente',
      'Pendiente': 'Pendiente',
      'en_proceso': 'En Progreso',
      'En Progreso': 'En Progreso',
      'En Proceso': 'En Progreso',
      'completada': 'Completada',
      'Completada': 'Completada',
      'cancelada': 'Cancelada',
      'Cancelada': 'Cancelada'
    };
    return estadoMap[estado] || 'Pendiente';
  }

  private normalizeEstadoCotizacion(estado: string): string {
    const estadoMap: Record<string, string> = {
      'pendiente': 'Pendiente',
      'Pendiente': 'Pendiente',
      'aprobada': 'Aprobada',
      'Aprobada': 'Aprobada',
      'rechazada': 'Rechazada',
      'Rechazada': 'Rechazada',
      'vencida': 'Vencida',
      'Vencida': 'Vencida',
      'convertida': 'Convertida',
      'Convertida': 'Convertida'
    };
    return estadoMap[estado] || 'Pendiente';
  }

  private normalizePrioridad(prioridad?: string): string | undefined {
    if (!prioridad) return undefined;
    const prioridadMap: Record<string, string> = {
      'baja': 'Baja',
      'Baja': 'Baja',
      'media': 'Normal',
      'Media': 'Normal',
      'Normal': 'Normal',
      'normal': 'Normal',
      'alta': 'Alta',
      'Alta': 'Alta',
      'urgente': 'Urgente',
      'Urgente': 'Urgente'
    };
    return prioridadMap[prioridad] || 'Normal';
  }

  async saveOrdenTrabajo(orden: OrdenTrabajo): Promise<OrdenTrabajo> {
    const id = orden.id || Date.now();
    // Si es una orden nueva (sin id o id === 0), establecer automáticamente como "En Progreso"
    const estadoFinal = (!orden.id || orden.id === 0) ? 'En Progreso' : this.normalizeEstado(orden.estado);
    const ordenToSave = { 
      ...orden, 
      id,
      estado: estadoFinal,
      prioridad: this.normalizePrioridad(orden.prioridad)
    };

    return new Promise((resolve, reject) => {
      const dbServiceInstance = this;
      const begin = () => new Promise<void>((res, rej) => this.ensureDb().run('BEGIN TRANSACTION', (e) => e ? rej(e) : res()));
      const commit = () => new Promise<void>((res, rej) => this.ensureDb().run('COMMIT', (e) => e ? rej(e) : res()));
      const rollback = () => new Promise<void>((res) => this.ensureDb().run('ROLLBACK', () => res()));

      begin()
        // Validaciones FK explícitas para dar mejores mensajes
        .then(() => new Promise<void>((res, rej) => {
          dbServiceInstance.ensureDb().get('SELECT COUNT(*) as c FROM clientes WHERE id = ?', [ordenToSave.clienteId], (err: any, row: any) => {
            if (err) return rej(err);
            if (!row || row.c === 0) return rej(new Error(`Cliente con ID ${ordenToSave.clienteId} no existe`));
            res();
          });
        }))
        .then(() => new Promise<void>((res, rej) => {
          dbServiceInstance.ensureDb().get('SELECT COUNT(*) as c FROM vehiculos WHERE id = ?', [ordenToSave.vehiculoId], (err: any, row: any) => {
            if (err) return rej(err);
            if (!row || row.c === 0) return rej(new Error(`Vehículo con ID ${ordenToSave.vehiculoId} no existe`));
            res();
          });
        }))
        .then(() => new Promise<void>((res, rej) => {
          dbServiceInstance.ensureDb().run(
        `INSERT OR REPLACE INTO ordenes_trabajo (id, numero, clienteId, vehiculoId, fechaIngreso, fechaEntrega, estado, descripcion, observaciones, total, kilometrajeEntrada, kilometrajeSalida, prioridad, tecnicoAsignado, metodoPago, numeroCuotas, fechaPago)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, ordenToSave.numero, ordenToSave.clienteId, ordenToSave.vehiculoId, 
         ordenToSave.fechaIngreso, ordenToSave.fechaEntrega, ordenToSave.estado, 
         ordenToSave.descripcion, ordenToSave.observaciones, ordenToSave.total, 
         ordenToSave.kilometrajeEntrada, ordenToSave.kilometrajeSalida, ordenToSave.prioridad, ordenToSave.tecnicoAsignado,
         ordenToSave.metodoPago || null, ordenToSave.numeroCuotas || null, ordenToSave.fechaPago || null],
        function(err) {
              if (err) rej(err);
              else res();
            }
          );
        }))
        .then(() => commit())
        .then(() => {
            dbServiceInstance.createAutoBackup().catch(console.error);
            dbServiceInstance.invalidateCache(); // Invalidar caché después de modificar
            resolve(ordenToSave);
        })
        .catch(async (txErr) => {
          console.error('❌ Error en transacción de orden de trabajo:', txErr);
          await rollback();
          reject(txErr);
        });
    });
  }

  async deleteOrdenTrabajo(id: number): Promise<boolean> {
    return new Promise((resolve, reject) => {
      // Validar ID
      if (!id || typeof id !== 'number' || id <= 0) {
        reject(new Error('ID de orden de trabajo inválido'));
        return;
      }

      const dbServiceInstance = this;

      // Verificar que la orden existe antes de intentar eliminarla
      this.ensureDb().get('SELECT id FROM ordenes_trabajo WHERE id = ?', [id], (err: any, row: any) => {
        if (err) {
          console.error('Error verificando existencia de orden:', err);
          reject(new Error(`Error al verificar la orden: ${err.message}`));
          return;
        }

        if (!row) {
          reject(new Error('La orden de trabajo no existe'));
          return;
        }

        // Usar transacción para asegurar consistencia
        dbServiceInstance.ensureDb().serialize(() => {
          // Iniciar transacción
          dbServiceInstance.ensureDb().run('BEGIN TRANSACTION', (errBegin: any) => {
            if (errBegin) {
              console.error('Error iniciando transacción:', errBegin);
              reject(new Error(`Error al iniciar la transacción: ${errBegin.message}`));
              return;
            }

            // Restituir stock de repuestos asociados a la orden antes de eliminar detalles
            dbServiceInstance.ensureDb().all(
              'SELECT repuestoId, cantidad FROM detalles_orden WHERE ordenId = ? AND tipo = ? AND repuestoId IS NOT NULL',
              [id, 'repuesto'],
              (errRepuestos: any, rows: Array<{ repuestoId: number; cantidad: number }>) => {
                if (errRepuestos) {
                  dbServiceInstance.ensureDb().run('ROLLBACK', () => {
                    console.error('Error obteniendo repuestos de la orden:', errRepuestos);
                    reject(new Error(`Error al obtener repuestos de la orden: ${errRepuestos.message}`));
                  });
                  return;
                }

                const updates = (rows || []).map((row) => {
                  const cantidad = Number(row.cantidad) || 1;
                  return new Promise<void>((resolveUpdate, rejectUpdate) => {
                    dbServiceInstance.ensureDb().run(
                      'UPDATE repuestos SET stock = stock + ? WHERE id = ?',
                      [cantidad, row.repuestoId],
                      (updateErr: any) => {
                        if (updateErr) rejectUpdate(updateErr);
                        else resolveUpdate();
                      }
                    );
                  });
                });

                Promise.all(updates).then(() => {
                  // Eliminar SOLO los detalles de ESTA orden específica (servicios y repuestos de esta orden)
                  // NOTA: Esto solo elimina los detalles de la orden que estás eliminando, NO afecta otras órdenes
                  dbServiceInstance.ensureDb().run('DELETE FROM detalles_orden WHERE ordenId = ?', [id], (errDetalles: any) => {
                    if (errDetalles) {
                      dbServiceInstance.ensureDb().run('ROLLBACK', () => {
                        console.error('Error eliminando detalles de orden:', errDetalles);
                        reject(new Error(`Error al eliminar detalles de la orden: ${errDetalles.message}`));
                      });
                      return;
                    }

                    // Eliminar SOLO esta orden específica (la que el usuario seleccionó)
                    // NOTA: Solo elimina la orden con este ID, NO elimina otras órdenes
                    dbServiceInstance.ensureDb().run('DELETE FROM ordenes_trabajo WHERE id = ?', [id], function(errOrden: any) {
                      if (errOrden) {
                        dbServiceInstance.ensureDb().run('ROLLBACK', () => {
                          console.error('Error eliminando orden de trabajo:', errOrden);
                          reject(new Error(`Error al eliminar la orden de trabajo: ${errOrden.message}`));
                        });
                        return;
                      }

                      const deleted = (this as any).changes > 0;
                      
                      if (deleted) {
                        // Confirmar transacción
                        dbServiceInstance.ensureDb().run('COMMIT', (errCommit: any) => {
                          if (errCommit) {
                            console.error('Error en commit:', errCommit);
                            reject(new Error(`Error al confirmar la eliminación: ${errCommit.message}`));
                            return;
                          }

                          // Invalidar caché después de eliminar
                          dbServiceInstance.invalidateCache();
                          
                          // Crear backup automático después de eliminar orden
                          dbServiceInstance.createAutoBackup().catch(console.error);
                          
                          console.log(`✅ Orden de trabajo ${id} eliminada exitosamente`);
                          resolve(true);
                        });
                      } else {
                        dbServiceInstance.ensureDb().run('ROLLBACK', () => {
                          reject(new Error('No se pudo eliminar la orden de trabajo (ningún registro afectado)'));
                        });
                      }
                    });
                  });
                }).catch((updateErr) => {
                  dbServiceInstance.ensureDb().run('ROLLBACK', () => {
                    console.error('Error restituyendo stock:', updateErr);
                    reject(new Error(`Error al restituir stock: ${updateErr.message}`));
                  });
                });
              }
            );
          });
        });
      });
    });
  }

  // Métodos para detalles de cotización
  async getDetallesCotizacion(cotizacionId: number): Promise<DetalleCotizacion[]> {
    return new Promise((resolve, reject) => {
      this.ensureDb().all('SELECT * FROM detalles_cotizacion WHERE cotizacionId = ?', [cotizacionId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows as DetalleCotizacion[]);
      });
    });
  }

  async saveDetalleCotizacion(detalle: DetalleCotizacion): Promise<DetalleCotizacion> {
    const id = detalle.id || Date.now();
    const detalleToSave = { ...detalle, id };

    return new Promise((resolve, reject) => {
      this.ensureDb().run(
        `INSERT OR REPLACE INTO detalles_cotizacion (id, cotizacionId, tipo, servicioId, repuestoId, cantidad, precio, subtotal, descripcion)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, detalleToSave.cotizacionId, detalleToSave.tipo, detalleToSave.servicioId, 
         detalleToSave.repuestoId, detalleToSave.cantidad, detalleToSave.precio, 
         detalleToSave.subtotal, detalleToSave.descripcion],
        function(err) {
          if (err) reject(err);
          else resolve(detalleToSave);
        }
      );
    });
  }

  // Métodos para detalles de orden
  async getDetallesOrden(ordenId: number): Promise<DetalleOrden[]> {
    return new Promise((resolve, reject) => {
      this.ensureDb().all('SELECT * FROM detalles_orden WHERE ordenId = ?', [ordenId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows as DetalleOrden[]);
      });
    });
  }

  async getAllDetallesOrden(): Promise<DetalleOrden[]> {
    return new Promise((resolve, reject) => {
      this.ensureDb().all('SELECT * FROM detalles_orden', (err, rows) => {
        if (err) reject(err);
        else resolve(rows as DetalleOrden[]);
      });
    });
  }

  async saveDetalleOrden(detalle: DetalleOrden): Promise<DetalleOrden> {
    const id = detalle.id || Date.now();
    const detalleToSave = { ...detalle, id };

    return new Promise((resolve, reject) => {
      this.ensureDb().run(
        `INSERT OR REPLACE INTO detalles_orden (id, ordenId, tipo, servicioId, repuestoId, cantidad, precio, subtotal, descripcion)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, detalleToSave.ordenId, detalleToSave.tipo, detalleToSave.servicioId, 
         detalleToSave.repuestoId, detalleToSave.cantidad, detalleToSave.precio, 
         detalleToSave.subtotal, detalleToSave.descripcion],
        function(err) {
          if (err) reject(err);
          else resolve(detalleToSave);
        }
      );
    });
  }

  async deleteDetallesOrden(ordenId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ensureDb().run('DELETE FROM detalles_orden WHERE ordenId = ?', [ordenId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // Métodos para cuotas de pago
  async getAllCuotasPago(): Promise<CuotaPago[]> {
    return new Promise((resolve, reject) => {
      this.ensureDb().all('SELECT * FROM cuotas_pago ORDER BY ordenId ASC, numeroCuota ASC', (err, rows) => {
        if (err) {
          console.error('❌ Error obteniendo todas las cuotas:', err);
          reject(err);
        } else {
          // Log detallado solo en desarrollo
          if (!app.isPackaged) {
            console.log(`✅ getAllCuotasPago: Se encontraron ${rows?.length || 0} cuotas`);
            if (rows && rows.length > 0) {
              // Agrupar por ordenId para verificar
              const porOrden = new Map<number, CuotaPago[]>();
              rows.forEach((row: any) => {
                const ordenId = row.ordenId;
                if (!porOrden.has(ordenId)) {
                  porOrden.set(ordenId, []);
                }
                porOrden.get(ordenId)!.push(row);
              });
              porOrden.forEach((cuotas, ordenId) => {
                console.log(`  Orden ${ordenId}: ${cuotas.length} cuotas - números: ${cuotas.map(c => c.numeroCuota).join(', ')}`);
                // Log detallado de cada cuota
                cuotas.forEach(c => {
                  console.log(`    - Cuota ${c.numeroCuota}: ID=${c.id}, monto=${c.monto}, estado=${c.estado}, fechaVenc=${c.fechaVencimiento}`);
                });
              });
            }
          }
          resolve((rows || []) as CuotaPago[]);
        }
      });
    });
  }

  async getCuotasPagoByOrden(ordenId: number): Promise<CuotaPago[]> {
    return new Promise((resolve, reject) => {
      this.ensureDb().all('SELECT * FROM cuotas_pago WHERE ordenId = ? ORDER BY numeroCuota ASC', [ordenId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows as CuotaPago[]);
      });
    });
  }

  async getCuotasPendientes(): Promise<CuotaPago[]> {
    return new Promise((resolve, reject) => {
      this.ensureDb().all(
        `SELECT * FROM cuotas_pago 
         WHERE estado = 'Pendiente' 
         ORDER BY fechaVencimiento ASC`,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows as CuotaPago[]);
        }
      );
    });
  }

  async saveCuotaPago(cuota: CuotaPago): Promise<CuotaPago> {
    const id = cuota.id || Date.now();
    const cuotaToSave = { ...cuota, id };
    const dbServiceInstance = this;

    return new Promise((resolve, reject) => {
      dbServiceInstance.ensureDb().run(
        `INSERT OR REPLACE INTO cuotas_pago (id, ordenId, numeroCuota, fechaVencimiento, monto, montoPagado, fechaPago, estado, observaciones)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          cuotaToSave.ordenId,
          cuotaToSave.numeroCuota,
          cuotaToSave.fechaVencimiento,
          cuotaToSave.monto,
          cuotaToSave.montoPagado || 0,
          cuotaToSave.fechaPago || null,
          cuotaToSave.estado,
          cuotaToSave.observaciones || null
        ],
        function(err: any) {
          if (err) reject(err);
          else {
            dbServiceInstance.invalidateCache();
            resolve(cuotaToSave);
          }
        }
      );
    });
  }

  async saveCuotasPago(cuotas: CuotaPago[]): Promise<CuotaPago[]> {
    if (!cuotas || cuotas.length === 0) {
      return Promise.resolve([]);
    }

    // Si hay cuotas, obtener el ordenId de la primera (todas deben ser del mismo orden)
    const ordenId = cuotas[0]?.ordenId;
    if (!ordenId) {
      return Promise.reject(new Error('Las cuotas deben tener un ordenId válido'));
    }

    const dbServiceInstance = this;
    return new Promise((resolve, reject) => {
      const db = dbServiceInstance.ensureDb();
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        // Primero eliminar cuotas existentes para esta orden para evitar duplicados
        db.run('DELETE FROM cuotas_pago WHERE ordenId = ?', [ordenId], (deleteErr: any) => {
          if (deleteErr) {
            db.run('ROLLBACK', () => {
              reject(new Error(`Error eliminando cuotas existentes: ${deleteErr.message}`));
            });
            return;
          }

          // Ahora insertar las nuevas cuotas
          const stmt = db.prepare(
            `INSERT INTO cuotas_pago (ordenId, numeroCuota, fechaVencimiento, monto, montoPagado, fechaPago, estado, observaciones)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
          );

          let completed = 0;
          let hasError = false;
          const errors: any[] = [];

          // Log detallado solo en desarrollo
          if (!app.isPackaged) {
            cuotas.forEach((cuota, index) => {
              console.log(`💾 Guardando cuota ${index + 1}/${cuotas.length}:`, {
                ordenId: cuota.ordenId,
                numeroCuota: cuota.numeroCuota,
                monto: cuota.monto,
                fechaVencimiento: cuota.fechaVencimiento
              });
            });
          }

          cuotas.forEach((cuota, index) => {
            // Log detallado antes de insertar (solo en desarrollo)
            if (!app.isPackaged) {
              console.log(`💾 Insertando cuota ${index + 1}/${cuotas.length}:`, {
                ordenId: cuota.ordenId,
                numeroCuota: cuota.numeroCuota,
                monto: cuota.monto,
                fechaVencimiento: cuota.fechaVencimiento,
                estado: cuota.estado
              });
            }
            
            stmt.run(
              [
                cuota.ordenId,
                cuota.numeroCuota,
                cuota.fechaVencimiento,
                cuota.monto,
                cuota.montoPagado || 0,
                cuota.fechaPago || null,
                cuota.estado,
                cuota.observaciones || null
              ],
              function(err: any) {
                if (err) {
                  hasError = true;
                  errors.push(err);
                  console.error(`❌ Error guardando cuota ${index + 1} (número ${cuota.numeroCuota}):`, err);
                } else {
                  // Log solo en desarrollo
                  if (!app.isPackaged) {
                    console.log(`✅ Cuota ${index + 1}/${cuotas.length} (número ${cuota.numeroCuota}) guardada correctamente, ID: ${this.lastID}`);
                  }
                }
                completed++;
                if (completed === cuotas.length) {
                  stmt.finalize();
                  if (hasError) {
                    db.run('ROLLBACK', () => {
                      reject(new Error(`Error guardando cuotas: ${errors.map(e => e.message).join(', ')}`));
                    });
                  } else {
                    db.run('COMMIT', () => {
                      // Log solo en desarrollo
                      if (!app.isPackaged) {
                        console.log(`✅ Todas las cuotas (${cuotas.length}) guardadas exitosamente para orden ${ordenId}`);
                        // Verificar que se guardaron todas
                        db.all('SELECT numeroCuota FROM cuotas_pago WHERE ordenId = ? ORDER BY numeroCuota', [ordenId], (verifErr: any, verifRows: any) => {
                          if (!verifErr && verifRows) {
                            const numerosGuardados = verifRows.map((r: any) => r.numeroCuota);
                            console.log(`✅ Verificación: Cuotas guardadas en BD para orden ${ordenId}:`, numerosGuardados);
                            if (numerosGuardados.length !== cuotas.length) {
                              console.error(`❌ ADVERTENCIA: Se esperaban ${cuotas.length} cuotas pero se guardaron ${numerosGuardados.length}`);
                            }
                          }
                        });
                      }
                      dbServiceInstance.invalidateCache();
                      resolve(cuotas);
                    });
                  }
                }
              }
            );
          });
        });
      });
    });
  }

  async confirmarPagoCuota(cuotaId: number, montoPagado: number, fechaPago: string, observaciones?: string): Promise<CuotaPago> {
    return new Promise((resolve, reject) => {
      this.ensureDb().get('SELECT * FROM cuotas_pago WHERE id = ?', [cuotaId], (err: any, row: any) => {
        if (err) {
          reject(err);
          return;
        }
        if (!row) {
          reject(new Error('Cuota no encontrada'));
          return;
        }

        const cuota = row as CuotaPago;
        const nuevoMontoPagado = (cuota.montoPagado || 0) + montoPagado;
        const nuevoEstado = nuevoMontoPagado >= cuota.monto ? 'Pagada' : cuota.estado;

        this.ensureDb().run(
          `UPDATE cuotas_pago 
           SET montoPagado = ?, fechaPago = ?, estado = ?, observaciones = ?
           WHERE id = ?`,
          [
            nuevoMontoPagado,
            fechaPago,
            nuevoEstado,
            observaciones || cuota.observaciones || null,
            cuotaId
          ],
          (updateErr: any) => {
            if (updateErr) {
              reject(updateErr);
              return;
            }
            this.invalidateCache();
            this.ensureDb().get('SELECT * FROM cuotas_pago WHERE id = ?', [cuotaId], (selectErr: any, updatedRow: any) => {
              if (selectErr) reject(selectErr);
              else resolve(updatedRow as CuotaPago);
            });
          }
        );
      });
    });
  }

  async actualizarEstadosCuotasVencidas(): Promise<void> {
    const hoy = new Date().toISOString().split('T')[0];
    return new Promise((resolve, reject) => {
      const db = this.ensureDb();
      db.run(
        `UPDATE cuotas_pago 
         SET estado = 'Vencida' 
         WHERE estado = 'Pendiente' AND fechaVencimiento < ?`,
        [hoy],
        (err) => {
          if (err) reject(err);
          else {
            this.invalidateCache();
            resolve();
          }
        }
      );
    });
  }

  // Guardar orden de trabajo CON detalles en una sola transacción (ATÓMICA)
  async saveOrdenTrabajoConDetalles(orden: OrdenTrabajo, detalles: Array<Omit<DetalleOrden, 'ordenId'> & { ordenId?: number }>): Promise<OrdenTrabajo> {
    const ordenId = orden.id || Date.now();
    // Si es una orden nueva (sin id o id === 0), establecer automáticamente como "En Progreso"
    const estadoFinal = (!orden.id || orden.id === 0) ? 'En Progreso' : this.normalizeEstado(orden.estado);
    const ordenToSave = { 
      ...orden, 
      id: ordenId,
      estado: estadoFinal,
      prioridad: this.normalizePrioridad(orden.prioridad)
    };

    return new Promise((resolve, reject) => {
      const db = this.ensureDb();
      const begin = () => new Promise<void>((res, rej) => db.run('BEGIN TRANSACTION', (e) => e ? rej(e) : res()));
      const commit = () => new Promise<void>((res, rej) => db.run('COMMIT', (e) => e ? rej(e) : res()));
      const rollback = () => new Promise<void>((res) => db.run('ROLLBACK', () => res()));

      begin()
        // Validar integridad referencial
        .then(() => new Promise<void>((res, rej) => {
          db.get('SELECT COUNT(*) as c FROM clientes WHERE id = ?', [ordenToSave.clienteId], (err: any, row: any) => {
            if (err) return rej(err);
            if (!row || row.c === 0) return rej(new Error(`Cliente con ID ${ordenToSave.clienteId} no existe`));
            res();
          });
        }))
        .then(() => new Promise<void>((res, rej) => {
          db.get('SELECT COUNT(*) as c FROM vehiculos WHERE id = ?', [ordenToSave.vehiculoId], (err: any, row: any) => {
            if (err) return rej(err);
            if (!row || row.c === 0) return rej(new Error(`Vehículo con ID ${ordenToSave.vehiculoId} no existe`));
            res();
          });
        }))
        // Guardar orden
        .then(() => new Promise<void>((res, rej) => {
          db.run(
            `INSERT OR REPLACE INTO ordenes_trabajo (id, numero, clienteId, vehiculoId, fechaIngreso, fechaEntrega, estado, descripcion, observaciones, total, kilometrajeEntrada, kilometrajeSalida, prioridad, tecnicoAsignado, metodoPago, numeroCuotas, fechaPago)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [ordenId, ordenToSave.numero, ordenToSave.clienteId, ordenToSave.vehiculoId, 
             ordenToSave.fechaIngreso, ordenToSave.fechaEntrega, ordenToSave.estado, 
             ordenToSave.descripcion, ordenToSave.observaciones, ordenToSave.total, 
             ordenToSave.kilometrajeEntrada, ordenToSave.kilometrajeSalida, ordenToSave.prioridad, ordenToSave.tecnicoAsignado,
             ordenToSave.metodoPago || null, ordenToSave.numeroCuotas || null, ordenToSave.fechaPago || null],
            function(err: any) {
              if (err) rej(err);
              else res();
            }
          );
        }))
        // Devolver stock de detalles anteriores (solo repuestos)
        .then(() => new Promise<void>((res, rej) => {
          db.all(
            'SELECT repuestoId, cantidad FROM detalles_orden WHERE ordenId = ? AND tipo = ? AND repuestoId IS NOT NULL',
            [ordenId, 'repuesto'],
            (err: any, rows: Array<{ repuestoId: number; cantidad: number }>) => {
              if (err) return rej(err);
              if (!rows || rows.length === 0) return res();

              const updates = rows.map((row) => {
                const cantidad = Number(row.cantidad) || 1;
                return new Promise<void>((resolveUpdate, rejectUpdate) => {
                  db.run(
                    'UPDATE repuestos SET stock = stock + ? WHERE id = ?',
                    [cantidad, row.repuestoId],
                    (updateErr: any) => {
                      if (updateErr) rejectUpdate(updateErr);
                      else resolveUpdate();
                    }
                  );
                });
              });

              Promise.all(updates).then(() => res()).catch(rej);
            }
          );
        }))
        // Eliminar detalles antiguos
        .then(() => new Promise<void>((res, rej) => {
          db.run('DELETE FROM detalles_orden WHERE ordenId = ?', [ordenId], (err: any) => {
            if (err) rej(err);
            else res();
          });
        }))
        // Descontar stock para detalles nuevos (solo repuestos)
        .then(() => {
          const repuestoDetalles = (detalles || []).filter(
            (detalle) => detalle.tipo === 'repuesto' && detalle.repuestoId
          );
          if (repuestoDetalles.length === 0) {
            return Promise.resolve();
          }

          const updates = repuestoDetalles.map((detalle) => {
            const cantidad = Number(detalle.cantidad) || 1;
            return new Promise<void>((resolveUpdate, rejectUpdate) => {
              db.run(
                'UPDATE repuestos SET stock = stock - ? WHERE id = ? AND stock >= ?',
                [cantidad, detalle.repuestoId, cantidad],
                function(updateErr: any) {
                  if (updateErr) {
                    rejectUpdate(updateErr);
                    return;
                  }
                  if ((this as any).changes === 0) {
                    rejectUpdate(new Error(`Stock insuficiente para repuesto ${detalle.repuestoId}`));
                    return;
                  }
                  resolveUpdate();
                }
              );
            });
          });

          return Promise.all(updates).then(() => undefined);
        })
        // Guardar detalles nuevos
        .then(() => {
          // Los detalles ya fueron eliminados en el paso anterior, ahora solo insertar los nuevos
          if (!detalles || detalles.length === 0) {
            // Log solo en desarrollo
            if (!app.isPackaged) {
              console.log('⚠️ saveOrdenTrabajoConDetalles: No hay detalles para guardar en la orden', ordenId);
            }
            return Promise.resolve();
          }
          
          // Log detallado solo en desarrollo
          if (!app.isPackaged) {
            console.log(`💾 saveOrdenTrabajoConDetalles: Guardando ${detalles.length} detalles para orden ${ordenId}`);
            detalles.forEach((d, idx) => {
              console.log(`  Detalle ${idx + 1}: tipo=${d.tipo}, repuestoId=${d.repuestoId}, servicioId=${d.servicioId}, cantidad=${d.cantidad}, descripcion=${d.descripcion}`);
            });
          }
          
          return new Promise<void>((res, rej) => {
            const stmt = db.prepare(
              `INSERT INTO detalles_orden (ordenId, tipo, servicioId, repuestoId, cantidad, precio, subtotal, descripcion)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
            );
            let completed = 0;
            let hasError = false;
            const errors: any[] = [];
            let timeoutId: NodeJS.Timeout | null = null;

            // Timeout de seguridad: si después de 10 segundos no se completaron todos los detalles, rechazar
            timeoutId = setTimeout(() => {
              if (completed < detalles.length && !hasError) {
                hasError = true;
                const error = new Error(`Timeout: Solo se completaron ${completed} de ${detalles.length} detalles después de 10 segundos`);
                console.error('❌ Timeout guardando detalles:', error);
                stmt.finalize();
                rej(error);
              }
            }, 10000);

            for (let index = 0; index < detalles.length; index++) {
              const detalle = detalles[index];
              // NO insertar el ID - dejar que SQLite lo genere automáticamente
              // Esto evita conflictos UNIQUE con IDs antiguos
              // Aplicar valores por defecto para asegurar que todos los campos estén presentes
              const params = [
                ordenId,
                detalle.tipo || 'repuesto',
                detalle.servicioId || null,
                detalle.repuestoId || null,
                detalle.cantidad || 1,
                detalle.precio || 0,
                detalle.subtotal || ((detalle.cantidad || 1) * (detalle.precio || 0)),
                detalle.descripcion || ''
              ];
              
              // Log detallado solo en desarrollo
              if (!app.isPackaged) {
                console.log(`  → Insertando detalle ${index + 1}/${detalles.length}: tipo=${detalle.tipo}, repuestoId=${detalle.repuestoId}, servicioId=${detalle.servicioId}, cantidad=${detalle.cantidad}, descripcion=${detalle.descripcion}`);
                console.log(`    Params:`, params);
              }
              
              try {
                stmt.run(params, function(err: any) {
                  if (err && !hasError) {
                    hasError = true;
                    errors.push(err);
                    console.error(`❌ Error insertando detalle ${index + 1}:`, err, 'Params:', params);
                    if (timeoutId) clearTimeout(timeoutId);
                    stmt.finalize();
                    rej(err);
                    return;
                  }

                  if (err) {
                    errors.push(err);
                    console.error(`❌ Error adicional insertando detalle ${index + 1}:`, err);
                  }

                  completed++;
                  const lastID = (this as any).lastID;
                  // Log solo en desarrollo
                  if (!app.isPackaged) {
                    console.log(`  ✓ Detalle ${completed}/${detalles.length} completado (ID insertado: ${lastID})`);
                  }
                  
                  if (completed === detalles.length && !hasError) {
                    if (timeoutId) clearTimeout(timeoutId);
                    if (!app.isPackaged) {
                      console.log(`✅ Todos los detalles guardados correctamente (${completed}/${detalles.length})`);
                    }
                    stmt.finalize();
                    res();
                  }
                });
              } catch (syncErr: any) {
                if (!hasError) {
                  hasError = true;
                  console.error(`❌ Error síncrono insertando detalle ${index + 1}:`, syncErr);
                  if (timeoutId) clearTimeout(timeoutId);
                  stmt.finalize();
                  rej(syncErr);
                }
              }
            }
          });
        })
        .then(() => {
          // Log solo en desarrollo
          if (!app.isPackaged) {
            console.log(`💾 Commit de transacción para orden ${ordenId}`);
          }
          return commit();
        })
        .then(() => {
          // Verificar que los detalles se guardaron correctamente
          return new Promise<void>((res, rej) => {
            db.get('SELECT COUNT(*) as count FROM detalles_orden WHERE ordenId = ?', [ordenId], (err: any, row: any) => {
              if (err) {
                console.error('❌ Error verificando detalles guardados:', err);
                rej(err);
                return;
              }
              const count = row?.count || 0;
              // Log solo en desarrollo, pero errores siempre
              if (!app.isPackaged) {
                console.log(`✅ Verificación: ${count} detalles guardados para orden ${ordenId} (esperados: ${detalles?.length || 0})`);
              }
              if (detalles && detalles.length > 0 && count === 0) {
                console.error('❌ CRÍTICO: Los detalles no se guardaron correctamente!');
                rej(new Error(`Los detalles no se guardaron. Esperados: ${detalles.length}, Encontrados: ${count}`));
                return;
              }
              res();
            });
          });
        })
        .then(() => {
          this.createAutoBackup().catch(console.error);
          this.invalidateCache(); // Invalidar caché después de modificar
          console.log(`✅ Orden ${ordenId} guardada exitosamente con ${detalles?.length || 0} detalles`);
          resolve(ordenToSave);
        })
        .catch(async (txErr) => {
          console.error('❌ Error en transacción de orden con detalles:', txErr);
          await rollback();
          reject(txErr);
        });
    });
  }

  // Generar número de venta único
  private generarNumeroVenta(): string {
    const fecha = new Date();
    const año = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `V-${año}${mes}${dia}-${random}`;
  }

  // Guardar venta CON detalles en una sola transacción (ATÓMICA)
  async saveVenta(ventaData: {
    clienteId?: number;
    clienteNombre?: string;
    clienteRut?: string;
    clienteTelefono?: string;
    clienteEmail?: string;
    repuestos: Array<{ id: number; nombre: string; precio: number; cantidad: number; subtotal: number }>;
    total: number;
    metodoPago?: 'Efectivo' | 'Débito' | 'Crédito';
    fecha?: string;
  }): Promise<Venta> {
    const ventaId = Date.now();
    const numeroVenta = this.generarNumeroVenta();
    const fecha = ventaData.fecha || new Date().toISOString();

    return new Promise((resolve, reject) => {
      const db = this.ensureDb();
      const begin = () => new Promise<void>((res, rej) => db.run('BEGIN TRANSACTION', (e) => e ? rej(e) : res()));
      const commit = () => new Promise<void>((res, rej) => db.run('COMMIT', (e) => e ? rej(e) : res()));
      const rollback = () => new Promise<void>((res) => db.run('ROLLBACK', () => res()));

      begin()
        // Validar cliente si se proporciona clienteId
        .then(() => {
          if (ventaData.clienteId) {
            return new Promise<void>((res, rej) => {
              db.get('SELECT COUNT(*) as c FROM clientes WHERE id = ?', [ventaData.clienteId], (err: any, row: any) => {
                if (err) return rej(err);
                if (!row || row.c === 0) return rej(new Error(`Cliente con ID ${ventaData.clienteId} no existe`));
                res();
              });
            });
          }
          return Promise.resolve();
        })
        // Guardar venta
        .then(() => new Promise<void>((res, rej) => {
          db.run(
            `INSERT INTO ventas (id, numero, clienteId, clienteNombre, clienteRut, clienteTelefono, clienteEmail, fecha, total, metodoPago)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              ventaId,
              numeroVenta,
              ventaData.clienteId || null,
              ventaData.clienteNombre || null,
              ventaData.clienteRut || null,
              ventaData.clienteTelefono || null,
              ventaData.clienteEmail || null,
              fecha,
              ventaData.total,
              ventaData.metodoPago || 'Efectivo'
            ],
            function(err: any) {
              if (err) rej(err);
              else res();
            }
          );
        }))
        // Descontar stock para repuestos de la venta
        .then(() => {
          if (!ventaData.repuestos || ventaData.repuestos.length === 0) {
            return Promise.reject(new Error('Debe haber al menos un repuesto en la venta'));
          }

          const updates = ventaData.repuestos.map((repuesto) => {
            const cantidad = Number(repuesto.cantidad) || 1;
            return new Promise<void>((resolveUpdate, rejectUpdate) => {
              db.run(
                'UPDATE repuestos SET stock = stock - ? WHERE id = ? AND stock >= ?',
                [cantidad, repuesto.id, cantidad],
                function(updateErr: any) {
                  if (updateErr) {
                    rejectUpdate(updateErr);
                    return;
                  }
                  if ((this as any).changes === 0) {
                    rejectUpdate(new Error(`Stock insuficiente para repuesto ${repuesto.id}`));
                    return;
                  }
                  resolveUpdate();
                }
              );
            });
          });

          return Promise.all(updates).then(() => undefined);
        })
        // Guardar detalles de venta
        .then(() => {
          if (!ventaData.repuestos || ventaData.repuestos.length === 0) {
            return Promise.reject(new Error('Debe haber al menos un repuesto en la venta'));
          }

          return new Promise<void>((res, rej) => {
            const stmt = db.prepare(
              `INSERT INTO detalles_venta (ventaId, repuestoId, cantidad, precio, subtotal, descripcion)
               VALUES (?, ?, ?, ?, ?, ?)`
            );
            let completed = 0;
            let hasError = false;

            for (let index = 0; index < ventaData.repuestos.length; index++) {
              const repuesto = ventaData.repuestos[index];
              const params = [
                ventaId,
                repuesto.id,
                repuesto.cantidad,
                repuesto.precio,
                repuesto.subtotal,
                repuesto.nombre
              ];

              stmt.run(params, function(err: any) {
                if (err && !hasError) {
                  hasError = true;
                  stmt.finalize();
                  rej(err);
                  return;
                }

                completed++;
                if (completed === ventaData.repuestos.length && !hasError) {
                  stmt.finalize();
                  res();
                }
              });
            }
          });
        })
        .then(() => commit())
        .then(() => {
          this.createAutoBackup().catch(console.error);
          this.invalidateCache();
          const venta: Venta = {
            id: ventaId,
            numero: numeroVenta,
            clienteId: ventaData.clienteId,
            clienteNombre: ventaData.clienteNombre,
            clienteRut: ventaData.clienteRut,
            clienteTelefono: ventaData.clienteTelefono,
            clienteEmail: ventaData.clienteEmail,
            fecha,
            total: ventaData.total,
            metodoPago: ventaData.metodoPago || 'Efectivo'
          };
          resolve(venta);
        })
        .catch(async (txErr) => {
          console.error('❌ Error en transacción de venta:', txErr);
          await rollback();
          reject(txErr);
        });
    });
  }

  async getAllVentas(): Promise<Venta[]> {
    const cacheKey = 'getAllVentas';
    const cached = this.queryCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    return new Promise((resolve, reject) => {
      this.ensureDb().all(
        'SELECT * FROM ventas ORDER BY fecha DESC',
        (err, rows) => {
          if (err) reject(err);
          else {
            this.queryCache.set(cacheKey, rows as Venta[]);
            resolve(rows as Venta[]);
          }
        }
      );
    });
  }

  async getAllDetallesVenta(): Promise<DetalleVenta[]> {
    return new Promise((resolve, reject) => {
      this.ensureDb().all('SELECT * FROM detalles_venta', (err, rows) => {
        if (err) reject(err);
        else resolve(rows as DetalleVenta[]);
      });
    });
  }

  // Guardar cotización CON detalles en una sola transacción (ATÓMICA)
  async saveCotizacionConDetalles(cotizacion: Cotizacion, detalles: Array<Omit<DetalleCotizacion, 'cotizacionId'> & { cotizacionId?: number }>): Promise<Cotizacion> {
    const cotizacionId = cotizacion.id || Date.now();
    const cotizacionToSave = { 
      ...cotizacion, 
      id: cotizacionId,
      estado: this.normalizeEstadoCotizacion(cotizacion.estado)
    };

    return new Promise((resolve, reject) => {
      const db = this.ensureDb();
      const begin = () => new Promise<void>((res, rej) => db.run('BEGIN TRANSACTION', (e) => e ? rej(e) : res()));
      const commit = () => new Promise<void>((res, rej) => db.run('COMMIT', (e) => e ? rej(e) : res()));
      const rollback = () => new Promise<void>((res) => db.run('ROLLBACK', () => res()));

      begin()
        // Validar integridad referencial
        .then(() => new Promise<void>((res, rej) => {
          db.get('SELECT COUNT(*) as c FROM clientes WHERE id = ?', [cotizacionToSave.clienteId], (err: any, row: any) => {
            if (err) return rej(err);
            if (!row || row.c === 0) return rej(new Error(`Cliente con ID ${cotizacionToSave.clienteId} no existe`));
            res();
          });
        }))
        .then(() => new Promise<void>((res, rej) => {
          db.get('SELECT COUNT(*) as c FROM vehiculos WHERE id = ?', [cotizacionToSave.vehiculoId], (err: any, row: any) => {
            if (err) return rej(err);
            if (!row || row.c === 0) return rej(new Error(`Vehículo con ID ${cotizacionToSave.vehiculoId} no existe`));
            res();
          });
        }))
        // Guardar cotización
        .then(() => new Promise<void>((res, rej) => {
          db.run(
            `INSERT OR REPLACE INTO cotizaciones (id, numero, clienteId, vehiculoId, fecha, validaHasta, estado, descripcion, observaciones, total)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [cotizacionId, cotizacionToSave.numero, cotizacionToSave.clienteId, cotizacionToSave.vehiculoId, 
             cotizacionToSave.fecha, cotizacionToSave.validaHasta, cotizacionToSave.estado, 
             cotizacionToSave.descripcion, cotizacionToSave.observaciones, cotizacionToSave.total],
            function(err: any) {
              if (err) rej(err);
              else res();
            }
          );
        }))
        // Eliminar detalles antiguos
        .then(() => new Promise<void>((res, rej) => {
          db.run('DELETE FROM detalles_cotizacion WHERE cotizacionId = ?', [cotizacionId], (err: any) => {
            if (err) rej(err);
            else res();
          });
        }))
        // Guardar detalles nuevos
        .then(() => {
          if (!detalles || detalles.length === 0) {
            console.log('⚠️ No hay detalles para guardar en la cotización');
            return Promise.resolve();
          }
          
          console.log(`💾 Guardando ${detalles.length} detalles para cotización ${cotizacionId}:`, detalles);
          
          const stmt = db.prepare(
            `INSERT INTO detalles_cotizacion (cotizacionId, tipo, servicioId, repuestoId, cantidad, precio, subtotal, descripcion)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
          );

          return new Promise<void>((res, rej) => {
            let completed = 0;
            let hasError = false;
            const errors: any[] = [];
            let timeoutId: NodeJS.Timeout | null = null;

            // Timeout de seguridad: si después de 10 segundos no se completaron todos los detalles, rechazar
            timeoutId = setTimeout(() => {
              if (completed < detalles.length && !hasError) {
                hasError = true;
                const error = new Error(`Timeout: Solo se completaron ${completed} de ${detalles.length} detalles después de 10 segundos`);
                console.error('❌ Timeout guardando detalles:', error);
                stmt.finalize();
                rej(error);
              }
            }, 10000);

            for (const detalle of detalles) {
              // NO insertar el ID - dejar que SQLite lo genere automáticamente
              // Esto evita conflictos UNIQUE con IDs antiguos
              const params = [
                cotizacionId,
                detalle.tipo,
                detalle.servicioId || null,
                detalle.repuestoId || null,
                detalle.cantidad,
                detalle.precio,
                detalle.subtotal,
                detalle.descripcion
              ];
              
              console.log(`  → Insertando detalle: tipo=${detalle.tipo}, repuestoId=${detalle.repuestoId}, servicioId=${detalle.servicioId}, cantidad=${detalle.cantidad}`);
              
              try {
                stmt.run(params, (err: any) => {
                  if (err && !hasError) {
                    hasError = true;
                    errors.push(err);
                    console.error(`❌ Error insertando detalle:`, err, 'Params:', params);
                    if (timeoutId) clearTimeout(timeoutId);
                    stmt.finalize();
                    rej(err);
                    return;
                  }

                  if (err) {
                    errors.push(err);
                    console.error(`❌ Error adicional insertando detalle:`, err);
                  }

                  completed++;
                  console.log(`  ✓ Detalle ${completed}/${detalles.length} completado`);
                  
                  if (completed === detalles.length && !hasError) {
                    if (timeoutId) clearTimeout(timeoutId);
                    console.log(`✅ Todos los detalles guardados correctamente (${completed}/${detalles.length})`);
                    stmt.finalize();
                    res();
                  }
                });
              } catch (syncErr: any) {
                if (!hasError) {
                  hasError = true;
                  console.error('❌ Error síncrono insertando detalle:', syncErr);
                  if (timeoutId) clearTimeout(timeoutId);
                  stmt.finalize();
                  rej(syncErr);
                }
              }
            }

            if (detalles.length === 0) {
              if (timeoutId) clearTimeout(timeoutId);
              res();
            }
          });
        })
        .then(() => {
          // Log solo en desarrollo
          if (!app.isPackaged) {
            console.log(`💾 Commit de transacción para cotización ${cotizacionId}`);
          }
          return commit();
        })
        .then(() => {
          // Verificar que los detalles se guardaron correctamente
          return new Promise<void>((res, rej) => {
            db.get('SELECT COUNT(*) as count FROM detalles_cotizacion WHERE cotizacionId = ?', [cotizacionId], (err: any, row: any) => {
              if (err) {
                console.error('❌ Error verificando detalles guardados:', err);
                rej(err);
                return;
              }
              const count = row?.count || 0;
              console.log(`✅ Verificación: ${count} detalles guardados para cotización ${cotizacionId} (esperados: ${detalles?.length || 0})`);
              if (detalles && detalles.length > 0 && count === 0) {
                console.error('❌ CRÍTICO: Los detalles no se guardaron correctamente!');
                rej(new Error(`Los detalles no se guardaron. Esperados: ${detalles.length}, Encontrados: ${count}`));
                return;
              }
              res();
            });
          });
        })
        .then(() => {
          this.createAutoBackup().catch(console.error);
          this.invalidateCache(); // Invalidar caché después de modificar
          console.log(`✅ Cotización ${cotizacionId} guardada exitosamente con ${detalles?.length || 0} detalles`);
          resolve(cotizacionToSave);
        })
        .catch(async (txErr) => {
          console.error('❌ Error en transacción de cotización con detalles:', txErr);
          await rollback();
          reject(txErr);
        });
    });
  }

  // Guardar cliente y vehículos en una sola transacción para evitar errores de FK
  async saveClienteConVehiculos(cliente: Cliente, vehiculos: Vehiculo[]): Promise<Cliente> {
    const db = this.ensureDb();
    const begin = () => new Promise<void>((res, rej) => db.run('BEGIN TRANSACTION', (e) => e ? rej(e) : res()));
    const commit = () => new Promise<void>((res, rej) => db.run('COMMIT', (e) => e ? rej(e) : res()));
    const rollback = () => new Promise<void>((res) => db.run('ROLLBACK', () => res()));

    try {
      await begin();
      const emailNormalizado = cliente.email?.trim() ? cliente.email.trim() : null;
      const clienteId = cliente.id || 0;
      const existingCliente = await new Promise<{ id: number } | undefined>((resolve, reject) => {
        const params = emailNormalizado
          ? [cliente.rut, emailNormalizado, clienteId]
          : [cliente.rut, clienteId];
        const query = emailNormalizado
          ? `SELECT id FROM clientes WHERE (rut = ? OR email = ?) AND id != ?`
          : `SELECT id FROM clientes WHERE rut = ? AND id != ?`;
        db.get(query, params, (err, row) => err ? reject(err) : resolve(row as any));
      });

      if (existingCliente) {
        throw new Error('Ya existe un cliente con el mismo RUT o email');
      }

      let savedClienteId = clienteId;
      const fechaRegistro = cliente.fechaRegistro || new Date().toISOString();

      if (clienteId > 0) {
        await new Promise<void>((resolve, reject) => {
          db.run(
            `UPDATE clientes
             SET nombre = ?, rut = ?, telefono = ?, email = ?, direccion = ?, fechaRegistro = ?
             WHERE id = ?`,
            [cliente.nombre, cliente.rut, cliente.telefono, emailNormalizado, cliente.direccion, fechaRegistro, clienteId],
            function(err: any) {
              if (err) {
                reject(err);
              } else if ((this as any).changes === 0) {
                reject(new Error(`Cliente con ID ${clienteId} no existe`));
              } else {
                resolve();
              }
            }
          );
        });
      } else {
        savedClienteId = await new Promise<number>((resolve, reject) => {
          db.run(
            `INSERT INTO clientes (nombre, rut, telefono, email, direccion, fechaRegistro)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [cliente.nombre, cliente.rut, cliente.telefono, emailNormalizado, cliente.direccion, fechaRegistro],
            function(err: any) {
              if (err) reject(err);
              else resolve((this as any).lastID);
            }
          );
        });
      }

      // Guardar vehículos
      for (const v of vehiculos) {
        if (!v.marca || !v.modelo || !v.patente) { continue; }
        if (v.id) {
          await new Promise<void>((resolve, reject) => {
            db.run(
              `UPDATE vehiculos
               SET clienteId = ?, marca = ?, modelo = ?, año = ?, patente = ?, color = ?, kilometraje = ?, observaciones = ?, activo = ?
               WHERE id = ?`,
              [savedClienteId, v.marca, v.modelo, v.año, v.patente, v.color, v.kilometraje, v.observaciones, v.activo, v.id],
              function(err: any) {
                if (err) {
                  reject(err);
                } else if ((this as any).changes === 0) {
                  reject(new Error(`Vehículo con ID ${v.id} no existe`));
                } else {
                  resolve();
                }
              }
            );
          });
        } else {
          await new Promise<void>((resolve, reject) => {
            db.run(
              `INSERT INTO vehiculos (clienteId, marca, modelo, año, patente, color, kilometraje, observaciones, activo)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [savedClienteId, v.marca, v.modelo, v.año, v.patente, v.color, v.kilometraje, v.observaciones, v.activo],
              (err: any) => err ? reject(err) : resolve()
            );
          });
        }
      }

      await commit();
      // backup opcional
      await this.createAutoBackup().catch(() => {});
      this.invalidateCache(); // Invalidar caché después de modificar
      return { ...cliente, id: savedClienteId, fechaRegistro };
    } catch (e) {
      await rollback();
      throw e;
    }
  }

  async saveRepuestosBatch(repuestos: Repuesto[]): Promise<Repuesto[]> {
    const db = this.ensureDb();
    const begin = () => new Promise<void>((res, rej) => db.run('BEGIN TRANSACTION', (e) => e ? rej(e) : res()));
    const commit = () => new Promise<void>((res, rej) => db.run('COMMIT', (e) => e ? rej(e) : res()));
    const rollback = () => new Promise<void>((res) => db.run('ROLLBACK', () => res()));

    if (!repuestos.length) return [];

    try {
      await begin();
      const saved: Repuesto[] = [];

      for (const repuesto of repuestos) {
        const id = repuesto.id || 0;
        const stockMinimoFinal = repuesto.stockMinimo && repuesto.stockMinimo > 0 ? repuesto.stockMinimo : 5;
        const repuestoToSave = { ...repuesto, stockMinimo: stockMinimoFinal };

        const existing = await new Promise<{ id: number } | undefined>((resolve, reject) => {
          db.get(
            `SELECT id FROM repuestos WHERE codigo = ? AND id != ?`,
            [repuestoToSave.codigo, id || 0],
            (err, row) => err ? reject(err) : resolve(row as any)
          );
        });

        if (existing) {
          throw new Error(`Ya existe un repuesto con el código ${repuestoToSave.codigo}`);
        }

        if (id > 0) {
          await new Promise<void>((resolve, reject) => {
            db.run(
              `UPDATE repuestos
               SET codigo = ?, nombre = ?, descripcion = ?, precio = ?, precioCosto = ?, stock = ?, stockMinimo = ?, categoria = ?, marca = ?, ubicacion = ?, activo = ?
               WHERE id = ?`,
              [
                repuestoToSave.codigo, repuestoToSave.nombre, repuestoToSave.descripcion,
                repuestoToSave.precio, repuestoToSave.precioCosto || 0, repuestoToSave.stock, stockMinimoFinal,
                repuestoToSave.categoria, repuestoToSave.marca, repuestoToSave.ubicacion, repuestoToSave.activo, id
              ],
              function(err: any) {
                if (err) {
                  reject(err);
                } else if ((this as any).changes === 0) {
                  reject(new Error(`Repuesto con ID ${id} no existe`));
                } else {
                  resolve();
                }
              }
            );
          });
          saved.push({ ...repuestoToSave, id });
        } else {
          const newId = await new Promise<number>((resolve, reject) => {
            db.run(
              `INSERT INTO repuestos (codigo, nombre, descripcion, precio, precioCosto, stock, stockMinimo, categoria, marca, ubicacion, activo)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                repuestoToSave.codigo, repuestoToSave.nombre, repuestoToSave.descripcion,
                repuestoToSave.precio, repuestoToSave.precioCosto || 0, repuestoToSave.stock, stockMinimoFinal,
                repuestoToSave.categoria, repuestoToSave.marca, repuestoToSave.ubicacion, repuestoToSave.activo
              ],
              function(err: any) {
                if (err) reject(err);
                else resolve((this as any).lastID);
              }
            );
          });
          saved.push({ ...repuestoToSave, id: newId });
        }
      }

      await commit();
      this.createAutoBackup().catch(console.error);
      this.invalidateCache();
      return saved;
    } catch (error) {
      await rollback();
      throw error;
    }
  }

  async deleteRepuestosByIds(ids: number[]): Promise<number> {
    if (!ids.length) return 0;
    const db = this.ensureDb();
    const placeholders = ids.map(() => '?').join(',');
    return new Promise<number>((resolve, reject) => {
      db.run(
        `DELETE FROM repuestos WHERE id IN (${placeholders})`,
        ids,
        function(err: any) {
          if (err) reject(err);
          else resolve((this as any).changes || 0);
        }
      );
    }).then((deletedCount) => {
      if (deletedCount > 0) {
        this.createAutoBackup().catch(console.error);
        this.invalidateCache();
      }
      return deletedCount;
    });
  }
  // Método para obtener estadísticas de inventario
  async getEstadisticasInventario(): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      const db = this.ensureDb();
      db.get('SELECT COUNT(*) as total, SUM(CASE WHEN stock > 0 THEN 1 ELSE 0 END) as conStock, SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END) as sinStock FROM repuestos', (err, stats: any) => {
        if (err) {
          reject(err);
          return;
        }

        db.all('SELECT categoria, COUNT(*) as cantidad FROM repuestos GROUP BY categoria', (err2, categorias) => {
          if (err2) {
            reject(err2);
            return;
          }

          resolve({
            total: stats.total,
            conStock: stats.conStock,
            sinStock: stats.sinStock,
            categorias: categorias
          });
        });
      });
    });
  }

  // Funciones helper para validación de integridad referencial
  async validateForeignKey(table: string, id: number, fieldName: string): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      const db = this.ensureDb();
      db.get(`SELECT COUNT(*) as count FROM ${table} WHERE id = ?`, [id], (err, row: any) => {
        if (err) {
          reject(new Error(`Error validando ${fieldName}: ${err.message}`));
        } else {
          resolve(row && row.count > 0);
        }
      });
    });
  }

  async validateClienteExists(clienteId: number): Promise<boolean> {
    return this.validateForeignKey('clientes', clienteId, 'cliente');
  }

  async validateVehiculoExists(vehiculoId: number): Promise<boolean> {
    return this.validateForeignKey('vehiculos', vehiculoId, 'vehiculo');
  }

  async validateRepuestoExists(repuestoId: number): Promise<boolean> {
    return this.validateForeignKey('repuestos', repuestoId, 'repuesto');
  }

  async validateServicioExists(servicioId: number): Promise<boolean> {
    return this.validateForeignKey('servicios', servicioId, 'servicio');
  }

  // Métodos para configuración
  async getAllConfiguracion(): Promise<any[]> {
    return new Promise<any[]>((resolve, reject) => {
      const db = this.ensureDb();
      db.all('SELECT * FROM configuracion ORDER BY clave', (err, rows) => {
        if (err) reject(err);
        else resolve(rows as any[]);
      });
    });
  }

  async saveConfiguracion(config: any): Promise<any> {
    const id = config.id || Date.now();
    const configToSave = { ...config, id };

    return new Promise<any>((resolve, reject) => {
      const dbServiceInstance = this;
      const db = this.ensureDb();
      db.run(
        `INSERT OR REPLACE INTO configuracion (id, clave, valor, descripcion)
         VALUES (?, ?, ?, ?)`,
        [id, configToSave.clave, configToSave.valor, configToSave.descripcion],
        function(err) {
          if (err) reject(err);
          else {
            dbServiceInstance.createAutoBackup().catch(console.error);
            dbServiceInstance.invalidateCache(); // Invalidar caché después de modificar
            resolve(configToSave);
          }
        }
      );
    });
  }

  // Métodos para importación de repuestos
  async importarRepuestosDesdeJSON(repuestos: any[]): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const db = this.ensureDb();
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO repuestos (codigo, nombre, descripcion, precio, precioCosto, stock, stockMinimo, categoria, marca, ubicacion, activo)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      repuestos.forEach(repuesto => {
        // Si stockMinimo es 0 o null, usar 5 como valor por defecto
        const stockMinimoFinal = repuesto.stockMinimo && repuesto.stockMinimo > 0 ? repuesto.stockMinimo : 5;
        stmt.run([
          repuesto.codigo,
          repuesto.nombre,
          repuesto.descripcion || '',
          repuesto.precio || 0, // Precio de venta
          repuesto.precioCosto || 0, // Precio de costo
          repuesto.stock || 0,
          stockMinimoFinal, // Usar 5 por defecto si no está definido
          repuesto.categoria || '',
          repuesto.marca || '',
          repuesto.ubicacion || '',
          repuesto.activo !== false ? 1 : 0
        ]);
      });

      stmt.finalize((err) => {
        if (err) reject(err);
        else {
          // Invalidar caché después de importar repuestos
          this.invalidateCache();
          
          // Crear backup automático después de importar repuestos
          this.createAutoBackup().catch(console.error);
          
          console.log(`✅ ${repuestos.length} repuestos importados exitosamente`);
          resolve();
        }
      });
    });
  }

  async limpiarRepuestos(): Promise<void> {
    return new Promise((resolve, reject) => {
      const dbServiceInstance = this;
      const db = this.ensureDb();
      
      // Primero obtener el conteo para logging
      db.get('SELECT COUNT(*) as total FROM repuestos', (errCount: any, row: any) => {
        if (errCount) {
          console.warn('No se pudo obtener el conteo de repuestos:', errCount);
        } else {
          const total = row?.total || 0;
          console.log(`🗑️ Eliminando ${total} repuestos del inventario...`);
        }
        
        // Eliminar todos los repuestos
        db.run('DELETE FROM repuestos', function(err: any) {
          if (err) {
            console.error('Error eliminando repuestos:', err);
            reject(new Error(`Error al eliminar repuestos: ${err.message}`));
            return;
          }
          
          const deleted = (this as any).changes || 0;
          console.log(`✅ ${deleted} repuestos eliminados exitosamente`);
          
          // Invalidar caché después de limpiar repuestos
          dbServiceInstance.invalidateCache();
          
          // Crear backup automático después de limpiar repuestos
          dbServiceInstance.createAutoBackup().catch(console.error);
          
          resolve();
        });
      });
    });
  }

  async limpiarServicios(): Promise<void> {
    return new Promise((resolve, reject) => {
      const dbServiceInstance = this;
      const db = this.ensureDb();
      
      db.get('SELECT COUNT(*) as total FROM servicios', (errCount: any, row: any) => {
        if (errCount) {
          console.warn('No se pudo obtener el conteo de servicios:', errCount);
        } else {
          const total = row?.total || 0;
          console.log(`🗑️ Eliminando ${total} servicios...`);
        }
        
        db.run('DELETE FROM servicios', function(err: any) {
          if (err) {
            console.error('Error eliminando servicios:', err);
            reject(new Error(`Error al eliminar servicios: ${err.message}`));
            return;
          }
          
          const deleted = (this as any).changes || 0;
          console.log(`✅ ${deleted} servicios eliminados exitosamente`);
          
          dbServiceInstance.invalidateCache();
          dbServiceInstance.createAutoBackup().catch(console.error);
          resolve();
        });
      });
    });
  }

  async limpiarClientes(): Promise<void> {
    return new Promise((resolve, reject) => {
      const dbServiceInstance = this;
      const db = this.ensureDb();
      
      db.get('SELECT COUNT(*) as total FROM clientes', (errCount: any, row: any) => {
        if (errCount) {
          console.warn('No se pudo obtener el conteo de clientes:', errCount);
        } else {
          const total = row?.total || 0;
          console.log(`🗑️ Eliminando ${total} clientes...`);
        }
        
        db.run('DELETE FROM clientes', function(err: any) {
          if (err) {
            console.error('Error eliminando clientes:', err);
            reject(new Error(`Error al eliminar clientes: ${err.message}`));
            return;
          }
          
          const deleted = (this as any).changes || 0;
          console.log(`✅ ${deleted} clientes eliminados exitosamente`);
          
          dbServiceInstance.invalidateCache();
          dbServiceInstance.createAutoBackup().catch(console.error);
          resolve();
        });
      });
    });
  }

  /**
   * Obtiene estadísticas de la base de datos
   */
  async getDatabaseStats(): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        const { DatabaseMonitor } = require('./database-monitor');
        const monitor = new DatabaseMonitor(this);
        monitor.getStats().then(resolve).catch(reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Verifica si la base de datos necesita mantenimiento
   */
  async needsMaintenance(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        const { DatabaseMonitor } = require('./database-monitor');
        const monitor = new DatabaseMonitor(this);
        monitor.needsMaintenance().then(resolve).catch(reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  async obtenerEstadisticasRepuestos(): Promise<any> {
    return new Promise((resolve, reject) => {
      const db = this.ensureDb();
      db.get('SELECT COUNT(*) as total, SUM(CASE WHEN stock > 0 THEN 1 ELSE 0 END) as conStock, SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END) as sinStock FROM repuestos', (err, stats: any) => {
        if (err) {
          reject(err);
          return;
        }

        db.all('SELECT categoria, COUNT(*) as cantidad FROM repuestos GROUP BY categoria', (err2, categorias) => {
          if (err2) {
            reject(err2);
            return;
          }

          resolve({
            total: stats.total,
            conStock: stats.conStock,
            sinStock: stats.sinStock,
            categorias: categorias
          });
        });
      });
    });
  }

  // Reparación de integridad: elimina filas huérfanas y devuelve métricas
  // Diagnosticar órdenes con problemas (cuotas incompletas o sin detalles)
  async diagnosticarOrdenesConProblemas(): Promise<Array<{
    ordenId: number;
    numeroOrden: string;
    problemas: string[];
    cuotasEsperadas?: number;
    cuotasEncontradas?: number;
    detallesEsperados?: boolean;
    detallesEncontrados?: number;
  }>> {
    return new Promise((resolve, reject) => {
      const problemas: Array<{
        ordenId: number;
        numeroOrden: string;
        problemas: string[];
        cuotasEsperadas?: number;
        cuotasEncontradas?: number;
        detallesEsperados?: boolean;
        detallesEncontrados?: number;
      }> = [];

      const db = this.ensureDb();
      // Obtener todas las órdenes con crédito
      db.all(`
        SELECT o.id, o.numero, o.numeroCuotas, o.total, o.metodoPago
        FROM ordenes_trabajo o
        WHERE o.metodoPago = 'Crédito' AND o.numeroCuotas IS NOT NULL AND o.numeroCuotas > 0
      `, (err, ordenes: any[]) => {
        if (err) {
          reject(err);
          return;
        }

        if (!ordenes || ordenes.length === 0) {
          resolve([]);
          return;
        }

        let procesadas = 0;
        ordenes.forEach((orden) => {
          const ordenId = orden.id;
          const numeroCuotas = orden.numeroCuotas;
          const problemasOrden: string[] = [];

          // Verificar cuotas
          db.all('SELECT numeroCuota FROM cuotas_pago WHERE ordenId = ? ORDER BY numeroCuota', [ordenId], (errCuotas, cuotas: any[]) => {
            if (errCuotas) {
              problemasOrden.push(`Error verificando cuotas: ${errCuotas.message}`);
            } else {
              const cuotasEncontradas = cuotas?.length || 0;
              const numerosCuotas = cuotas?.map((c: any) => c.numeroCuota) || [];
              
              if (cuotasEncontradas !== numeroCuotas) {
                problemasOrden.push(`Cuotas incompletas: esperadas ${numeroCuotas}, encontradas ${cuotasEncontradas}`);
              }
              
              // Verificar que las cuotas sean consecutivas desde 1
              for (let i = 1; i <= numeroCuotas; i++) {
                if (!numerosCuotas.includes(i)) {
                  problemasOrden.push(`Falta la cuota ${i}`);
                }
              }
            }

            // Verificar detalles
            db.all('SELECT COUNT(*) as count FROM detalles_orden WHERE ordenId = ?', [ordenId], (errDetalles, detallesRow: any) => {
              if (errDetalles) {
                problemasOrden.push(`Error verificando detalles: ${errDetalles.message}`);
              } else {
                const detallesCount = detallesRow?.[0]?.count || 0;
                if (detallesCount === 0) {
                  problemasOrden.push(`No tiene detalles guardados`);
                }
              }

              if (problemasOrden.length > 0) {
                problemas.push({
                  ordenId,
                  numeroOrden: orden.numero || `OT-${ordenId}`,
                  problemas: problemasOrden,
                  cuotasEsperadas: numeroCuotas,
                  cuotasEncontradas: cuotas?.length || 0,
                  detallesEncontrados: detallesRow?.[0]?.count || 0
                });
              }

              procesadas++;
              if (procesadas === ordenes.length) {
                resolve(problemas);
              }
            });
          });
        });
      });
    });
  }

  /**
   * Ejecuta mantenimiento periódico de la base de datos (VACUUM y ANALYZE)
   * Se ejecuta automáticamente cada 7 días o manualmente
   */
  async performMaintenance(force: boolean = false): Promise<void> {
    const now = Date.now();
    
    // Verificar si es necesario ejecutar mantenimiento
    if (!force && (now - this.lastMaintenanceTime < this.maintenanceInterval)) {
      return; // No ejecutar si no ha pasado el tiempo mínimo
    }

    return new Promise((resolve, reject) => {
      try {
        console.log('🔧 Iniciando mantenimiento de base de datos...');
        const db = this.ensureDb();
        
        // Ejecutar ANALYZE para actualizar estadísticas
        db.run('ANALYZE', (err: any) => {
          if (err) {
            console.warn('⚠️ Error ejecutando ANALYZE:', err.message);
          } else {
            console.log('✅ ANALYZE completado');
          }
          
          // Ejecutar VACUUM para optimizar espacio
          db.run('VACUUM', (err: any) => {
            if (err) {
              console.warn('⚠️ Error ejecutando VACUUM:', err.message);
              reject(err);
            } else {
              this.lastMaintenanceTime = now;
              console.log('✅ VACUUM completado - Base de datos optimizada');
              this.invalidateCache(); // Invalidar caché después de mantenimiento
              resolve();
            }
          });
        });
      } catch (error) {
        console.error('❌ Error en mantenimiento de base de datos:', error);
        reject(error);
      }
    });
  }

  async repairIntegrity(): Promise<{deleted: Record<string, number>}> {
    const db = this.ensureDb();
    const run = (sql: string) => new Promise<number>((resolve, reject) => {
      db.run(sql, function(this: any, err: any) {
        if (err) reject(err); else resolve(this.changes || 0);
      });
    });
    const deleted: Record<string, number> = {};
    try {
      await run('PRAGMA foreign_keys = ON');
      deleted['detalles_orden_huerfanos'] = await run('DELETE FROM detalles_orden WHERE ordenId NOT IN (SELECT id FROM ordenes_trabajo)');
      deleted['detalles_cotizacion_huerfanos'] = await run('DELETE FROM detalles_cotizacion WHERE cotizacionId NOT IN (SELECT id FROM cotizaciones)');
      deleted['ordenes_sin_cliente'] = await run('DELETE FROM ordenes_trabajo WHERE clienteId NOT IN (SELECT id FROM clientes)');
      deleted['ordenes_sin_vehiculo'] = await run('DELETE FROM ordenes_trabajo WHERE vehiculoId NOT IN (SELECT id FROM vehiculos)');
      deleted['cotizaciones_sin_cliente'] = await run('DELETE FROM cotizaciones WHERE clienteId NOT IN (SELECT id FROM clientes)');
      deleted['cotizaciones_sin_vehiculo'] = await run('DELETE FROM cotizaciones WHERE vehiculoId NOT IN (SELECT id FROM vehiculos)');
      deleted['vehiculos_sin_cliente'] = await run('DELETE FROM vehiculos WHERE clienteId NOT IN (SELECT id FROM clientes)');
      return { deleted };
    } catch (e) {
      throw e;
    }
  }

  // Función para insertar solo cotizaciones si faltan
  private insertInitialCotizaciones(): void {
    const db = this.ensureDb();
    // Primero obtener los IDs de los clientes existentes
    db.all('SELECT id FROM clientes ORDER BY id LIMIT 5', (err, clientes: any[]) => {
      if (err) {
        console.error('Error obteniendo clientes:', err);
        return;
      }

      if (clientes.length === 0) {
        console.error('No hay clientes en la base de datos');
        return;
      }

      // Obtener los IDs de los vehículos de estos clientes
      const clienteIds = clientes.map(c => c.id);
      
      db.all(`SELECT id FROM vehiculos WHERE clienteId IN (${clienteIds.join(',')}) ORDER BY id LIMIT 5`, (err, vehiculos: any[]) => {
        if (err) {
          console.error('Error obteniendo vehículos:', err);
          return;
        }

        if (vehiculos.length === 0) {
          console.warn('No hay vehículos en la base de datos, creando vehículos primero...');
          // Crear vehículos de prueba para los clientes existentes
          const vehiculosToInsert = clienteIds.map((clienteId, index) => {
            const marcas = ['Toyota', 'Honda', 'Nissan', 'Hyundai', 'Kia'];
            const modelos = ['Corolla', 'Civic', 'Sentra', 'Elantra', 'Forte'];
            const patentes = ['ABC123', 'DEF456', 'GHI789', 'JKL012', 'MNO345'];
            return `(${clienteId}, '${marcas[index]}', '${modelos[index]}', 2020, '${patentes[index]}', 'Blanco', 45000, 1)`;
          }).join(',');

          const db = this.ensureDb();
        db.run(`INSERT INTO vehiculos (clienteId, marca, modelo, año, patente, color, kilometraje, activo) VALUES ${vehiculosToInsert}`, (err) => {
            if (err) {
              console.error('Error insertando vehículos:', err);
              return;
            }
            console.log('✅ Vehículos insertados');
            // Reintentar obtener vehículos
            db.all(`SELECT id FROM vehiculos WHERE clienteId IN (${clienteIds.join(',')}) ORDER BY id LIMIT 5`, (err, newVehiculos: any[]) => {
              if (!err && newVehiculos.length > 0) {
                this.insertCotizacionesWithIds(clientes, newVehiculos);
              }
            });
          });
          return;
        }

        this.insertCotizacionesWithIds(clientes, vehiculos);
      });
    });
  }

  private insertCotizacionesWithIds(clientes: any[], vehiculos: any[]): void {
    const cotizacionesSQL = clientes.map((cliente, index) => {
      const vehiculo = vehiculos[index] || vehiculos[0]; // Usar el primero si no hay suficiente
      const estados = ['Pendiente', 'Aprobada', 'Vencida', 'Pendiente', 'Aprobada'];
      const descripciones = [
        'Revisión general del vehículo',
        'Reparación de frenos',
        'Reparación de suspensión',
        'Sistema de climatización',
        'Cambio de aceite y filtros'
      ];
      const totals = [85000, 120000, 180000, 95000, 35000];
      
      return `('COT-2025-${String(index + 1).padStart(3, '0')}', ${cliente.id}, ${vehiculo.id}, '${new Date(Date.now() - (10 - index) * 24 * 60 * 60 * 1000).toISOString()}', '${new Date(Date.now() + (20 + index) * 24 * 60 * 60 * 1000).toISOString()}', '${estados[index]}', '${descripciones[index]}', 'Observaciones de prueba ${index + 1}', ${totals[index]})`;
    }).join(',');

    const db = this.ensureDb();
    db.run(`
      INSERT INTO cotizaciones (numero, clienteId, vehiculoId, fecha, validaHasta, estado, descripcion, observaciones, total) 
      VALUES ${cotizacionesSQL}
    `, (err) => {
      if (err) {
        console.error('Error insertando cotizaciones:', err);
        return;
      }

      // Obtener los IDs de las cotizaciones recién insertadas
      db.all('SELECT id FROM cotizaciones ORDER BY id DESC LIMIT 5', (err, cotizaciones: any[]) => {
        if (err || !cotizaciones) {
          console.error('Error obteniendo cotizaciones:', err);
          return;
        }

        // Insertar detalles de cotizaciones
        const detallesSQL = cotizaciones.flatMap((cotizacion, index) => {
          const detalles = [
            `(${cotizacion.id}, 'servicio', 3, NULL, 1, 25000, 25000, 'Revisión General')`,
            `(${cotizacion.id}, 'servicio', 4, NULL, 1, 15000, 15000, 'Cambio de Aceite')`,
            `(${cotizacion.id}, 'repuesto', NULL, 2, 1, 8000, 8000, 'Filtro de Aceite')`,
            `(${cotizacion.id}, 'servicio', 5, NULL, 1, 20000, 20000, 'Alineación')`,
          ];
          return detalles;
        }).join(',');

        const dbDetalles = this.ensureDb();
        dbDetalles.run(`INSERT INTO detalles_cotizacion (cotizacionId, tipo, servicioId, repuestoId, cantidad, precio, subtotal, descripcion) VALUES ${detallesSQL}`, (err) => {
          if (err) {
            console.error('Error insertando detalles:', err);
            return;
          }
          console.log('✅ Cotizaciones de prueba insertadas correctamente');
        });
      });
    });
  }

  // Función helper para obtener rutas correctas
  getPaths() {
    if (process.env.NODE_ENV === 'development') {
      return {
        dataDir: path.join(__dirname, '../../data'),
        dbPath: path.join(__dirname, '../../data/resortes.db'),
        backupDir: path.join(__dirname, '../../data/backups')
      };
    } else {
      const userDataPath = app.getPath('userData');
      return {
        dataDir: path.join(userDataPath, 'data'),
        dbPath: path.join(userDataPath, 'data/resortes.db'),
        backupDir: path.join(userDataPath, 'data/backups')
      };
    }
  }

  // Método para cerrar la conexión
  close(): void {
    if (this.db) {
      this.ensureDb().close((err: Error | null) => {
        if (err) {
          console.error('Error cerrando base de datos:', err);
        } else {
          console.log('✅ Base de datos cerrada correctamente');
        }
      });
      this.db = null;
    }
  }

  // ========== MÓDULO DE CAJA DIARIA ==========

  /**
   * Obtiene el estado actual de la caja
   */
  async getEstadoCaja(): Promise<EstadoCaja | null> {
    return new Promise((resolve, reject) => {
      this.ensureDb().get(
        "SELECT * FROM estado_caja WHERE estado = 'abierta' ORDER BY fecha_apertura DESC LIMIT 1",
        (err, row: any) => {
          if (err) reject(err);
          else resolve(row || null);
        }
      );
    });
  }

  /**
   * Abre una nueva caja
   */
  async abrirCaja(montoInicial: number, observaciones?: string): Promise<EstadoCaja> {
    return new Promise((resolve, reject) => {
      const db = this.ensureDb();
      const dbServiceInstance = this;
      db.serialize(() => {
        // Cerrar cualquier caja abierta anterior
        db.run(
          "UPDATE estado_caja SET estado = 'cerrada', fecha_cierre = CURRENT_TIMESTAMP WHERE estado = 'abierta'",
          (err: any) => {
            if (err) {
              console.warn('Advertencia al cerrar cajas anteriores:', err);
            }

            // Crear nueva caja
            db.run(
              `INSERT INTO estado_caja (monto_inicial, observaciones, estado)
               VALUES (?, ?, 'abierta')`,
              [montoInicial, observaciones || ''],
              function(err: any) {
                if (err) {
                  reject(err);
                  return;
                }

                // Obtener la caja creada
                db.get(
                  'SELECT * FROM estado_caja WHERE id = ?',
                  [this.lastID],
                  (err2: any, row: any) => {
                    if (err2) reject(err2);
                    else {
                      dbServiceInstance.invalidateCache();
                      resolve(row);
                    }
                  }
                );
              }
            );
          }
        );
      });
    });
  }

  /**
   * Cierra la caja actual
   */
  async cerrarCaja(montoFinal: number, observaciones?: string): Promise<EstadoCaja> {
    return new Promise((resolve, reject) => {
      const db = this.ensureDb();
      const dbServiceInstance = this;
      db.serialize(() => {
        db.get(
          "SELECT * FROM estado_caja WHERE estado = 'abierta' ORDER BY fecha_apertura DESC LIMIT 1",
          (err: any, caja: any) => {
            if (err) {
              reject(err);
              return;
            }

            if (!caja) {
              reject(new Error('No hay caja abierta'));
              return;
            }

            db.run(
              `UPDATE estado_caja 
               SET estado = 'cerrada', fecha_cierre = CURRENT_TIMESTAMP, monto_final = ?, observaciones = ?
               WHERE id = ?`,
              [montoFinal, observaciones || '', caja.id],
              function(err2: any) {
                if (err2) {
                  reject(err2);
                  return;
                }

                // Obtener la caja actualizada
                db.get(
                  'SELECT * FROM estado_caja WHERE id = ?',
                  [caja.id],
                  (err3: any, row: any) => {
                    if (err3) reject(err3);
                    else {
                      dbServiceInstance.invalidateCache();
                      resolve(row);
                    }
                  }
                );
              }
            );
          }
        );
      });
    });
  }

  /**
   * Registra un movimiento de caja
   */
  async registrarMovimientoCaja(movimiento: MovimientoCaja): Promise<MovimientoCaja> {
    return new Promise((resolve, reject) => {
      const db = this.ensureDb();
      const dbServiceInstance = this;
      db.run(
        `INSERT INTO movimientos_caja (tipo, monto, descripcion, metodo_pago, fecha, ordenId, caja_abierta)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          movimiento.tipo,
          movimiento.monto,
          movimiento.descripcion,
          movimiento.metodo_pago || null,
          movimiento.fecha || new Date().toISOString(),
          movimiento.ordenId || null,
          movimiento.caja_abierta !== undefined ? movimiento.caja_abierta : 1
        ],
        function(err: any) {
          if (err) {
            reject(err);
            return;
          }

          db.get(
            'SELECT * FROM movimientos_caja WHERE id = ?',
            [this.lastID],
            (err2: any, row: any) => {
              if (err2) reject(err2);
              else {
                dbServiceInstance.invalidateCache();
                resolve(row);
              }
            }
          );
        }
      );
    });
  }

  /**
   * Obtiene los movimientos de caja de un día específico
   */
  async getMovimientosCajaPorFecha(fecha: string): Promise<MovimientoCaja[]> {
    return new Promise((resolve, reject) => {
      this.ensureDb().all(
        `SELECT * FROM movimientos_caja 
         WHERE DATE(fecha) = DATE(?) 
         ORDER BY fecha DESC`,
        [fecha],
        (err, rows: any[]) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  /**
   * Obtiene todos los movimientos de caja
   */
  async getAllMovimientosCaja(): Promise<MovimientoCaja[]> {
    return new Promise((resolve, reject) => {
      this.ensureDb().all(
        `SELECT * FROM movimientos_caja ORDER BY fecha DESC`,
        (err, rows: any[]) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  /**
   * Obtiene todos los cierres de caja
   */
  async getAllCierresCaja(fechaDesde?: string, fechaHasta?: string): Promise<EstadoCaja[]> {
    return new Promise((resolve, reject) => {
      let query = "SELECT * FROM estado_caja WHERE estado = 'cerrada'";
      const params: any[] = [];

      if (fechaDesde && fechaHasta) {
        query += " AND DATE(fecha_cierre) BETWEEN DATE(?) AND DATE(?)";
        params.push(fechaDesde, fechaHasta);
      } else if (fechaDesde) {
        query += " AND DATE(fecha_cierre) >= DATE(?)";
        params.push(fechaDesde);
      } else if (fechaHasta) {
        query += " AND DATE(fecha_cierre) <= DATE(?)";
        params.push(fechaHasta);
      }

      query += " ORDER BY fecha_cierre DESC";

      this.ensureDb().all(query, params, (err, rows: any[]) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  /**
   * Obtiene el arqueo del día (totales por método de pago)
   */
  async getArqueoCaja(fecha: string): Promise<{
    totalEfectivo: number;
    totalTarjeta: number;
    totalTransferencia: number;
    totalIngresos: number;
    totalEgresos: number;
  }> {
    return new Promise((resolve, reject) => {
      this.ensureDb().all(
        `SELECT 
          metodo_pago,
          tipo,
          SUM(monto) as total
         FROM movimientos_caja
         WHERE DATE(fecha) = DATE(?)
         GROUP BY metodo_pago, tipo`,
        [fecha],
        (err, rows: any[]) => {
          if (err) {
            reject(err);
            return;
          }

          let totalEfectivo = 0;
          let totalTarjeta = 0;
          let totalTransferencia = 0;
          let totalIngresos = 0;
          let totalEgresos = 0;

          rows.forEach((row: any) => {
            const monto = row.total || 0;
            if (row.tipo === 'ingreso') {
              totalIngresos += monto;
            } else {
              totalEgresos += monto;
            }

            if (row.metodo_pago === 'Efectivo') {
              totalEfectivo += row.tipo === 'ingreso' ? monto : -monto;
            } else if (row.metodo_pago === 'Débito' || row.metodo_pago === 'Crédito') {
              totalTarjeta += row.tipo === 'ingreso' ? monto : -monto;
            } else if (row.metodo_pago === 'Transferencia') {
              totalTransferencia += row.tipo === 'ingreso' ? monto : -monto;
            }
          });

          resolve({
            totalEfectivo,
            totalTarjeta,
            totalTransferencia,
            totalIngresos,
            totalEgresos
          });
        }
      );
    });
  }

  // ========== MÓDULO DE COMISIONES DE TÉCNICOS ==========

  /**
   * Calcula y guarda la comisión de un técnico por una orden
   */
  async calcularYGuardarComision(
    ordenId: number,
    tecnicoId: number | null,
    tecnicoNombre: string,
    porcentajeComision: number
  ): Promise<ComisionTecnico> {
    return new Promise((resolve, reject) => {
      const db = this.ensureDb();
      const dbServiceInstance = this;
      
      // Obtener la orden y calcular monto de mano de obra (solo servicios)
      db.get(
        `SELECT 
          o.total as total_orden,
          COALESCE(SUM(CASE WHEN d.tipo = 'servicio' THEN d.subtotal ELSE 0 END), 0) as monto_mano_obra
         FROM ordenes_trabajo o
         LEFT JOIN detalles_orden d ON o.id = d.ordenId
         WHERE o.id = ?`,
        [ordenId],
        (err: any, orden: any) => {
          if (err) {
            reject(err);
            return;
          }

          if (!orden) {
            reject(new Error('Orden no encontrada'));
            return;
          }

          const montoManoObra = orden.monto_mano_obra || 0;
          const montoComision = Math.round(montoManoObra * (porcentajeComision / 100));

          const fecha = new Date();
          const mesReferencia = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;

          db.run(
            `INSERT INTO comisiones_tecnicos 
             (ordenId, tecnicoId, tecnicoNombre, monto_mano_obra, porcentaje_comision, monto_comision, mes_referencia)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [ordenId, tecnicoId, tecnicoNombre, montoManoObra, porcentajeComision, montoComision, mesReferencia],
            function(err2: any) {
              if (err2) {
                reject(err2);
                return;
              }

              db.get(
                'SELECT * FROM comisiones_tecnicos WHERE id = ?',
                [this.lastID],
                (err3: any, row: any) => {
                  if (err3) reject(err3);
                  else {
                    dbServiceInstance.invalidateCache();
                    resolve(row);
                  }
                }
              );
            }
          );
        }
      );
    });
  }

  /**
   * Obtiene el reporte de comisiones por mes
   */
  async getReporteComisiones(mes: string): Promise<ComisionTecnico[]> {
    return new Promise((resolve, reject) => {
      this.ensureDb().all(
        `SELECT * FROM comisiones_tecnicos 
         WHERE mes_referencia = ? 
         ORDER BY tecnicoNombre, fecha_calculo`,
        [mes],
        (err, rows: any[]) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  /**
   * Obtiene el resumen de comisiones por técnico en un mes
   */
  async getResumenComisionesPorTecnico(mes: string): Promise<Array<{
    tecnicoId: number | null;
    tecnicoNombre: string;
    totalComisiones: number;
    cantidadOrdenes: number;
  }>> {
    return new Promise((resolve, reject) => {
      this.ensureDb().all(
        `SELECT 
          tecnicoId,
          tecnicoNombre,
          SUM(monto_comision) as totalComisiones,
          COUNT(*) as cantidadOrdenes
         FROM comisiones_tecnicos
         WHERE mes_referencia = ?
         GROUP BY tecnicoId, tecnicoNombre
         ORDER BY totalComisiones DESC`,
        [mes],
        (err, rows: any[]) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  /**
   * Guarda un pago a trabajador
   */
  async savePagoTrabajador(pago: PagoTrabajador): Promise<PagoTrabajador> {
    const id = pago.id || Date.now();
    const pagoToSave = { ...pago, id };

    return new Promise((resolve, reject) => {
      this.ensureDb().run(
        `INSERT OR REPLACE INTO pagos_trabajadores 
         (id, trabajadorId, trabajadorNombre, trabajadorRut, concepto, monto_efectivo, monto_otros, metodo_pago, comentario, fecha, descontar_caja, caja_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          pagoToSave.trabajadorId || null,
          pagoToSave.trabajadorNombre,
          pagoToSave.trabajadorRut || null,
          pagoToSave.concepto,
          pagoToSave.monto_efectivo || 0,
          pagoToSave.monto_otros || 0,
          pagoToSave.metodo_pago || null,
          pagoToSave.comentario || null,
          pagoToSave.fecha || new Date().toISOString(),
          pagoToSave.descontar_caja ? 1 : 0,
          pagoToSave.caja_id || null
        ],
        function(err) {
          if (err) reject(err);
          else resolve(pagoToSave);
        }
      );
    });
  }

  async getAllPagosTrabajadores(): Promise<PagoTrabajador[]> {
    return new Promise((resolve, reject) => {
      this.ensureDb().all('SELECT * FROM pagos_trabajadores ORDER BY fecha DESC', (err, rows) => {
        if (err) reject(err);
        else resolve(rows as PagoTrabajador[]);
      });
    });
  }

  async getPagosTrabajadoresPorFecha(fecha: string): Promise<PagoTrabajador[]> {
    return new Promise((resolve, reject) => {
      this.ensureDb().all(
        `SELECT * FROM pagos_trabajadores 
         WHERE DATE(fecha) = DATE(?) 
         ORDER BY fecha DESC`,
        [fecha],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows as PagoTrabajador[]);
        }
      );
    });
  }

  // ========== MÓDULO DE AGENDA ==========

  /**
   * Actualiza la fecha programada de una orden (para agenda)
   */
  async actualizarFechaProgramada(ordenId: number, fechaProgramada: string | null): Promise<OrdenTrabajo> {
    return new Promise((resolve, reject) => {
      const db = this.ensureDb();
      const dbServiceInstance = this;
      db.run(
        'UPDATE ordenes_trabajo SET fechaProgramada = ? WHERE id = ?',
        [fechaProgramada, ordenId],
        function(err: any) {
          if (err) {
            reject(err);
            return;
          }

          db.get(
            'SELECT * FROM ordenes_trabajo WHERE id = ?',
            [ordenId],
            (err2: any, row: any) => {
              if (err2) reject(err2);
              else {
                dbServiceInstance.invalidateCache();
                resolve(row);
              }
            }
          );
        }
      );
    });
  }

  /**
   * Obtiene órdenes para la agenda en un rango de fechas
   */
  async getOrdenesParaAgenda(fechaInicio: string, fechaFin: string): Promise<OrdenTrabajo[]> {
    return new Promise((resolve, reject) => {
      this.ensureDb().all(
        `SELECT * FROM ordenes_trabajo 
         WHERE (fechaProgramada BETWEEN ? AND ?) 
            OR (fechaIngreso BETWEEN ? AND ?)
         ORDER BY COALESCE(fechaProgramada, fechaIngreso) ASC`,
        [fechaInicio, fechaFin, fechaInicio, fechaFin],
        (err, rows: any[]) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  // ========== MÓDULO DE RECORDATORIOS ==========

  async getAllRecordatorios(): Promise<Recordatorio[]> {
    return new Promise((resolve, reject) => {
      this.ensureDb().all(
        `SELECT * FROM recordatorios ORDER BY fechaAviso ASC`,
        [],
        (err, rows: any[]) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  async saveRecordatorio(recordatorio: Recordatorio): Promise<Recordatorio> {
    const db = this.ensureDb();
    const estado = recordatorio.estado || 'Pendiente';
    const fechaEnvio = estado === 'Enviado'
      ? (recordatorio.fechaEnvio || new Date().toISOString())
      : null;
    const clienteId = recordatorio.clienteId ?? null;
    const vehiculoId = recordatorio.vehiculoId ?? null;

    if (recordatorio.id && recordatorio.id > 0) {
      return new Promise<Recordatorio>((resolve, reject) => {
        db.run(
          `UPDATE recordatorios
           SET clienteId = ?, vehiculoId = ?, tipo = ?, kilometraje = ?, fechaAviso = ?, observaciones = ?, estado = ?, fechaEnvio = ?
           WHERE id = ?`,
          [
            clienteId,
            vehiculoId,
            recordatorio.tipo,
            recordatorio.kilometraje ?? null,
            recordatorio.fechaAviso,
            recordatorio.observaciones || '',
            estado,
            fechaEnvio,
            recordatorio.id
          ],
          (err: any) => {
            if (err) reject(err);
            else {
              this.createAutoBackup().catch(console.error);
              this.invalidateCache();
              resolve({
                ...recordatorio,
                estado,
                fechaEnvio
              });
            }
          }
        );
      });
    }

    return new Promise<Recordatorio>((resolve, reject) => {
      db.run(
        `INSERT INTO recordatorios (clienteId, vehiculoId, tipo, kilometraje, fechaAviso, observaciones, estado, fechaEnvio)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          clienteId,
          vehiculoId,
          recordatorio.tipo,
          recordatorio.kilometraje ?? null,
          recordatorio.fechaAviso,
          recordatorio.observaciones || '',
          estado,
          fechaEnvio
        ],
        function(err: any) {
          if (err) reject(err);
          else {
            const saved: Recordatorio = {
              ...recordatorio,
              id: (this as any).lastID,
              estado,
              fechaEnvio
            };
            resolve(saved);
          }
        }
      );
    }).then((saved) => {
      this.createAutoBackup().catch(console.error);
      this.invalidateCache();
      return saved;
    });
  }

  async deleteRecordatorio(id: number): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      this.ensureDb().run(
        `DELETE FROM recordatorios WHERE id = ?`,
        [id],
        function(err: any) {
          if (err) reject(err);
          else resolve((this as any).changes > 0);
        }
      );
    }).then((result) => {
      if (result) {
        this.createAutoBackup().catch(console.error);
        this.invalidateCache();
      }
      return result;
    });
  }

  async updateRecordatorioEstado(id: number, estado: 'Pendiente' | 'Enviado'): Promise<Recordatorio> {
    const fechaEnvio = estado === 'Enviado' ? new Date().toISOString() : null;
    return new Promise((resolve, reject) => {
      const db = this.ensureDb();
      db.run(
        `UPDATE recordatorios SET estado = ?, fechaEnvio = ? WHERE id = ?`,
        [estado, fechaEnvio, id],
        (err: any) => {
          if (err) {
            reject(err);
            return;
          }
          db.get(
            `SELECT * FROM recordatorios WHERE id = ?`,
            [id],
            (err2: any, row: any) => {
              if (err2) reject(err2);
              else {
                this.createAutoBackup().catch(console.error);
                this.invalidateCache();
                resolve(row);
              }
            }
          );
        }
      );
    });
  }

}