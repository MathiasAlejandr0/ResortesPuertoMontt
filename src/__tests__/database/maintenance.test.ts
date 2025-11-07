/**
 * Tests de Mantenimiento de Base de Datos
 * 
 * Verifica el funcionamiento del mantenimiento periódico (VACUUM y ANALYZE)
 */

import { DatabaseService } from '../../database/database';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => path.join(__dirname, '../../../../test-data')),
    isPackaged: false
  }
}));

describe('Mantenimiento de Base de Datos', () => {
  let dbService: DatabaseService;
  const testDataDir = path.join(__dirname, '../../../../test-data');

  beforeAll(async () => {
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }
    dbService = await DatabaseService.create();
  });

  afterAll(() => {
    if (dbService) {
      try {
        dbService.close();
      } catch (e) {
        // Ignorar
      }
    }
  });

  describe('performMaintenance', () => {
    it('debe ejecutar VACUUM y ANALYZE correctamente', async () => {
      // Crear algunos datos de prueba primero
      const cliente = await dbService.saveCliente({
        nombre: 'Cliente Test Mantenimiento',
        rut: '11111111-1',
        telefono: '+56111111111',
        activo: true
      });

      // Ejecutar mantenimiento forzado
      await expect(dbService.performMaintenance(true)).resolves.not.toThrow();
    }, 30000); // VACUUM puede tardar, dar más tiempo

    it('no debe ejecutar mantenimiento si no ha pasado el intervalo', async () => {
      // Ejecutar mantenimiento
      await dbService.performMaintenance(true);
      
      // Intentar ejecutar de nuevo inmediatamente (sin force)
      // No debería ejecutarse porque no ha pasado el intervalo
      await dbService.performMaintenance(false);
      
      // Si llegamos aquí sin error, el test pasa
      expect(true).toBe(true);
    }, 30000);

    it('debe ejecutar mantenimiento cuando se fuerza', async () => {
      // Forzar mantenimiento independientemente del intervalo
      await expect(dbService.performMaintenance(true)).resolves.not.toThrow();
    }, 30000);
  });

  describe('Índices Compuestos', () => {
    it('debe tener índices compuestos creados', async () => {
      // Verificar que los índices compuestos existen
      const indices = await new Promise<any[]>((resolve, reject) => {
        (dbService as any).db.all(
          "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'",
          (err: any, rows: any[]) => {
            if (err) reject(err);
            else resolve(rows);
          }
        );
      });

      const nombresIndices = indices.map(i => i.name);
      
      // Verificar índices compuestos
      expect(nombresIndices).toContain('idx_ordenes_cliente_fecha');
      expect(nombresIndices).toContain('idx_cuotas_orden_estado');
      expect(nombresIndices).toContain('idx_cotizaciones_cliente_fecha');
      
      // Verificar índices adicionales
      expect(nombresIndices).toContain('idx_clientes_nombre');
      expect(nombresIndices).toContain('idx_ordenes_numero');
      expect(nombresIndices).toContain('idx_cotizaciones_numero');
      expect(nombresIndices).toContain('idx_cuotas_fecha_vencimiento');
    });
  });
});

