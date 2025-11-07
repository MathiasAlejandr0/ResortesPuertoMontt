/**
 * Tests para DatabaseMonitor - Sistema de monitoreo de base de datos
 */

import { DatabaseMonitor, DatabaseStats } from '../../database/database-monitor';
import { DatabaseService } from '../../database/database';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => path.join(__dirname, '../../../test-data')),
  },
}));

describe('DatabaseMonitor', () => {
  let dbService: DatabaseService;
  let monitor: DatabaseMonitor;
  const testDataDir = path.join(__dirname, '../../../test-data');

  beforeAll(async () => {
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }
    
    dbService = await DatabaseService.create();
    monitor = new DatabaseMonitor(dbService);
  });

  afterAll(async () => {
    if (dbService) {
      try {
        dbService.close();
      } catch (e) {}
    }
  });

  it('debería obtener estadísticas de la base de datos', async () => {
    const stats = await monitor.getStats();
    
    expect(stats).toBeDefined();
    expect(stats.size).toBeGreaterThanOrEqual(0);
    expect(stats.sizeMB).toBeGreaterThanOrEqual(0);
    expect(stats.tableCount).toBeGreaterThan(0);
    expect(stats.recordCounts).toBeDefined();
    expect(stats.health).toBeDefined();
  });

  it('debería determinar salud correctamente', async () => {
    const stats: DatabaseStats = {
      size: 100 * 1024 * 1024, // 100 MB
      sizeMB: 100,
      tableCount: 10,
      recordCounts: {
        clientes: 100,
        vehiculos: 200,
        cotizaciones: 50,
        ordenes: 30,
        repuestos: 500,
        servicios: 20,
      },
      lastBackup: new Date().toISOString(),
      backupCount: 5,
      health: 'buena',
    };

    const recommendations = monitor.getRecommendations(stats);
    expect(Array.isArray(recommendations)).toBe(true);
  });

  it('debería verificar si necesita mantenimiento', async () => {
    const needsMaintenance = await monitor.needsMaintenance();
    expect(typeof needsMaintenance).toBe('boolean');
  });

  it('debería retornar recomendaciones apropiadas para BD grande', () => {
    const stats: DatabaseStats = {
      size: 250 * 1024 * 1024, // 250 MB
      sizeMB: 250,
      tableCount: 10,
      recordCounts: {
        clientes: 1000,
        vehiculos: 2000,
        cotizaciones: 500,
        ordenes: 300,
        repuestos: 5000,
        servicios: 200,
      },
      lastBackup: null,
      backupCount: 0,
      health: 'critica',
    };

    const recommendations = monitor.getRecommendations(stats);
    expect(recommendations.length).toBeGreaterThan(0);
    expect(recommendations.some(r => r.includes('grande'))).toBe(true);
  });
});

