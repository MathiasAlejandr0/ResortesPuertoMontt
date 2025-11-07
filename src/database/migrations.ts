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
  private currentVersion: string = '1.1.2';

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

    // Agregar más migraciones aquí cuando se necesiten
    // Ejemplo para futura versión 1.2.0:
    // this.migrations.push({
    //   version: '1.2.0',
    //   description: 'Agregar nueva columna X a tabla Y',
    //   up: async (db) => {
    //     return new Promise((resolve, reject) => {
    //       db.run('ALTER TABLE tabla ADD COLUMN nueva_columna TEXT', (err) => {
    //         if (err) reject(err);
    //         else resolve();
    //       });
    //     });
    //   },
    // });
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

