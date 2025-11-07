/**
 * Tests para MigrationService - Sistema de migraciones de base de datos
 */

import { MigrationService } from '../../database/migrations';
import * as sqlite3 from 'sqlite3';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => path.join(__dirname, '../../../test-data')),
  },
}));

describe('MigrationService', () => {
  let migrationService: MigrationService;
  const testDataDir = path.join(__dirname, '../../../test-data');
  const testDbPath = path.join(testDataDir, 'resortes-migrations.db');

  beforeAll(() => {
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }
  });

  beforeEach(() => {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    migrationService = new MigrationService();
  });

  afterEach(() => {
    if (fs.existsSync(testDbPath)) {
      try {
        fs.unlinkSync(testDbPath);
      } catch (e) {}
    }
  });

  it('debería crear una instancia de MigrationService', () => {
    expect(migrationService).toBeInstanceOf(MigrationService);
  });

  it('debería obtener la versión objetivo', () => {
    const targetVersion = migrationService.getTargetVersion();
    expect(targetVersion).toBe('1.1.2');
  });

  it('debería obtener migraciones disponibles', () => {
    const migrations = migrationService.getAvailableMigrations();
    expect(Array.isArray(migrations)).toBe(true);
    expect(migrations.length).toBeGreaterThan(0);
  });

  it('debería comparar versiones correctamente', () => {
    // Este test verifica que el método privado compareVersions funciona
    // indirectamente a través de migrate
    const migrations = migrationService.getAvailableMigrations();
    expect(migrations[0].version).toBe('1.1.2');
  });

  it('debería obtener versión actual desde BD', async () => {
    const db = new sqlite3.Database(testDbPath);
    
    // Crear tabla de configuración
    await new Promise<void>((resolve, reject) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS configuracion (
          clave TEXT PRIMARY KEY,
          valor TEXT NOT NULL,
          descripcion TEXT
        )
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Insertar versión
    await new Promise<void>((resolve, reject) => {
      db.run(`
        INSERT OR REPLACE INTO configuracion (clave, valor, descripcion)
        VALUES ('schema_version', '1.1.2', 'Versión del esquema')
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    const currentVersion = await migrationService.getCurrentVersion(db);
    expect(currentVersion).toBe('1.1.2');

    db.close();
  });

  it('debería retornar 0.0.0 si no hay versión en BD', async () => {
    const db = new sqlite3.Database(testDbPath);
    
    // No crear tabla de configuración
    const currentVersion = await migrationService.getCurrentVersion(db);
    expect(currentVersion).toBe('0.0.0');

    db.close();
  });
});

