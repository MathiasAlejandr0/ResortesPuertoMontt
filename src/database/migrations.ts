/**
 * Sistema de migraciones versionadas para la base de datos
 * Permite migrar el esquema de una versión a otra de forma controlada
 */

import * as sqlite3 from 'sqlite3';

export interface Migration {
  version: string;
  up: (db: sqlite3.Database) => Promise<void>;
  down?: (db: sqlite3.Database) => Promise<void>; // Opcional: rollback
  description: string;
}

export class MigrationService {
  private migrations: Migration[] = [];
  private currentVersion: string = '1.2.0';

  constructor() {
    this.registerMigrations();
  }

  /**
   * Registra todas las migraciones disponibles
   */
  private registerMigrations(): void {
    // Migración 1.1.2: Limpieza de duplicados y sistema de versionado
    this.migrations.push({
      version: '1.1.2',
      description: 'Sistema de versionado de esquema y limpieza de duplicados',
      up: async (db: sqlite3.Database) => {
        return new Promise((resolve, reject) => {
          // Esta migración ya se ejecuta en checkAndMigrateSchema
          // Aquí solo actualizamos la versión
          db.run(`
            INSERT OR REPLACE INTO configuracion (clave, valor, descripcion)
            VALUES ('schema_version', '1.1.2', 'Versión del esquema de base de datos')
          `, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      },
    });

    // Migración 1.2.0: Módulos de Agenda, Caja Diaria y Técnicos
    this.migrations.push({
      version: '1.2.0',
      description: 'Agregar módulos de Agenda, Caja Diaria y Técnicos con comisiones',
      up: async (db: sqlite3.Database) => {
        return new Promise((resolve, reject) => {
          db.serialize(() => {
            // Tabla de movimientos de caja
            db.run(`
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
            `, (err: any) => {
              if (err && !err.message.includes('already exists')) {
                console.error('Error creando tabla movimientos_caja:', err);
                reject(err);
                return;
              }
            });

            // Tabla de estado de caja
            db.run(`
              CREATE TABLE IF NOT EXISTS estado_caja (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                fecha_apertura DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                fecha_cierre DATETIME,
                monto_inicial INTEGER NOT NULL DEFAULT 0 CHECK (monto_inicial >= 0),
                monto_final INTEGER CHECK (monto_final >= 0),
                estado TEXT NOT NULL DEFAULT 'abierta' CHECK (estado IN ('abierta', 'cerrada')),
                observaciones TEXT
              )
            `, (err: any) => {
              if (err && !err.message.includes('already exists')) {
                console.error('Error creando tabla estado_caja:', err);
                reject(err);
                return;
              }
            });

            // Extender tabla usuarios con porcentaje_comision (o crear tabla tecnicos)
            // Primero intentamos agregar columna a usuarios
            db.run(`
              ALTER TABLE usuarios ADD COLUMN porcentaje_comision REAL DEFAULT 0 CHECK (porcentaje_comision >= 0 AND porcentaje_comision <= 100)
            `, (err: any) => {
              // Ignorar error si la columna ya existe
              if (err && !err.message.includes('duplicate column')) {
                console.warn('Advertencia al agregar columna porcentaje_comision:', err.message);
              }
            });

            // Agregar columna fechaProgramada a ordenes_trabajo para agenda
            db.run(`
              ALTER TABLE ordenes_trabajo ADD COLUMN fechaProgramada DATETIME
            `, (err: any) => {
              if (err && !err.message.includes('duplicate column')) {
                console.warn('Advertencia al agregar columna fechaProgramada:', err.message);
              }
            });

            // Tabla de comisiones de técnicos
            db.run(`
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
            `, (err: any) => {
              if (err && !err.message.includes('already exists')) {
                console.error('Error creando tabla comisiones_tecnicos:', err);
                reject(err);
                return;
              }
            });

            // Índices para mejor rendimiento
            db.run('CREATE INDEX IF NOT EXISTS idx_movimientos_caja_fecha ON movimientos_caja(fecha)');
            db.run('CREATE INDEX IF NOT EXISTS idx_movimientos_caja_tipo ON movimientos_caja(tipo)');
            db.run('CREATE INDEX IF NOT EXISTS idx_estado_caja_fecha ON estado_caja(fecha_apertura)');
            db.run('CREATE INDEX IF NOT EXISTS idx_comisiones_orden ON comisiones_tecnicos(ordenId)');
            db.run('CREATE INDEX IF NOT EXISTS idx_comisiones_tecnico ON comisiones_tecnicos(tecnicoId)');
            db.run('CREATE INDEX IF NOT EXISTS idx_comisiones_mes ON comisiones_tecnicos(mes_referencia)');
            db.run('CREATE INDEX IF NOT EXISTS idx_ordenes_fecha_programada ON ordenes_trabajo(fechaProgramada)');

            // Actualizar versión del esquema
            db.run(`
              INSERT OR REPLACE INTO configuracion (clave, valor, descripcion)
              VALUES ('schema_version', '1.2.0', 'Versión del esquema de base de datos')
            `, (err) => {
              if (err) reject(err);
              else resolve();
            });
          });
        });
      },
    });
  }

  /**
   * Obtiene la versión actual del esquema desde la base de datos
   */
  async getCurrentVersion(db: sqlite3.Database): Promise<string> {
    return new Promise((resolve, reject) => {
      db.get("SELECT valor FROM configuracion WHERE clave = 'schema_version'", (err, row: any) => {
        if (err) {
          // Si no existe, asumir versión 0.0.0 (primera instalación)
          resolve('0.0.0');
        } else {
          resolve(row?.valor || '0.0.0');
        }
      });
    });
  }

  /**
   * Ejecuta migraciones necesarias para llegar a la versión objetivo
   */
  async migrate(db: sqlite3.Database, targetVersion: string): Promise<void> {
    const currentVersion = await this.getCurrentVersion(db);
    
    if (currentVersion === targetVersion) {
      console.log(`✅ Esquema ya está en versión ${targetVersion}`);
      return;
    }

    console.log(`🔄 Migrando esquema de ${currentVersion} a ${targetVersion}`);

    // Ordenar migraciones por versión
    const sortedMigrations = this.migrations.sort((a, b) => {
      return this.compareVersions(a.version, b.version);
    });

    // Encontrar migraciones que necesitan ejecutarse
    const migrationsToRun = sortedMigrations.filter(migration => {
      return this.compareVersions(migration.version, currentVersion) > 0 &&
             this.compareVersions(migration.version, targetVersion) <= 0;
    });

    // Ejecutar migraciones en orden
    for (const migration of migrationsToRun) {
      console.log(`📦 Ejecutando migración ${migration.version}: ${migration.description}`);
      try {
        await migration.up(db);
        console.log(`✅ Migración ${migration.version} completada`);
      } catch (error) {
        console.error(`❌ Error ejecutando migración ${migration.version}:`, error);
        throw error;
      }
    }

    // Actualizar versión final
    await new Promise<void>((resolve, reject) => {
      db.run(`
        INSERT OR REPLACE INTO configuracion (clave, valor, descripcion)
        VALUES ('schema_version', ?, 'Versión del esquema de base de datos')
      `, [targetVersion], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    console.log(`✅ Migración completada a versión ${targetVersion}`);
  }

  /**
   * Compara dos versiones (formato semántico: x.y.z)
   * Retorna: >0 si v1 > v2, <0 si v1 < v2, 0 si v1 === v2
   */
  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const part1 = parts1[i] || 0;
      const part2 = parts2[i] || 0;

      if (part1 > part2) return 1;
      if (part1 < part2) return -1;
    }

    return 0;
  }

  /**
   * Obtiene todas las migraciones disponibles
   */
  getAvailableMigrations(): Migration[] {
    return this.migrations;
  }

  /**
   * Obtiene la versión objetivo (versión actual del código)
   */
  getTargetVersion(): string {
    return this.currentVersion;
  }
}

