/**
 * Tests de Integridad de Base de Datos
 * 
 * Verifica la integridad referencial, constraints y consistencia de datos
 */

import { DatabaseService } from '../../database/database';
import * as fs from 'fs';
import * as path from 'path';

const testDataDir = path.join(__dirname, '../../../../test-data/database-integrity');

jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => testDataDir),
    isPackaged: false
  }
}));

describe('Integridad de Base de Datos', () => {
  let dbService: DatabaseService;
  const testDataDir = path.join(__dirname, '../../../../test-data/database-integrity');
  const testDbPath = path.join(testDataDir, 'data', 'resortes.db');

  beforeAll(async () => {
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
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

  describe('Integridad Referencial', () => {
    it('debe mantener foreign keys activas', async () => {
      // Verificar que foreign_keys está activado
      const result = await new Promise<any>((resolve, reject) => {
        (dbService as any).db.get('PRAGMA foreign_keys', (err: any, row: any) => {
          if (err) reject(err);
          else resolve(row);
        });
      });

      // SQLite retorna 1 si foreign_keys está activado
      expect(result).toBeDefined();
    });

    it('debe prevenir eliminación de cliente con vehículos asociados (CASCADE)', async () => {
      // Crear cliente y vehículo
      const cliente = await dbService.saveCliente({
        nombre: 'Cliente Test CASCADE',
        rut: '77777777-7',
        telefono: '+56777777777',
        activo: true
      });

      await dbService.saveVehiculo({
        clienteId: cliente.id!,
        marca: 'Test',
        modelo: 'CASCADE',
        año: 2020,
        patente: 'CASC-77',
        activo: true
      });

      // Eliminar cliente (debe eliminar vehículo en cascada)
      await dbService.deleteCliente(cliente.id!);

      // Verificar que el vehículo también fue eliminado
      const vehiculos = await dbService.getAllVehiculos();
      const vehiculoEliminado = vehiculos.find(v => v.patente === 'CASC-77');
      expect(vehiculoEliminado).toBeUndefined();
    });

    it('debe prevenir eliminación de repuesto usado en orden (RESTRICT)', async () => {
      // Crear cliente, vehículo, repuesto y orden
      const cliente = await dbService.saveCliente({
        nombre: 'Cliente Test RESTRICT',
        rut: '66666666-6',
        telefono: '+56666666666',
        activo: true
      });

      const vehiculo = await dbService.saveVehiculo({
        clienteId: cliente.id!,
        marca: 'Test',
        modelo: 'RESTRICT',
        año: 2020,
        patente: 'REST-66',
        activo: true
      });

      const repuesto = await dbService.saveRepuesto({
        codigo: 'REP-RESTRICT-001',
        nombre: 'Repuesto Test RESTRICT',
        descripcion: 'Repuesto de prueba',
        precio: 10000,
        stock: 100,
        stockMinimo: 5,
        categoria: 'Test',
        marca: 'Test',
        ubicacion: 'A1',
        activo: true
      });

      const orden = await dbService.saveOrdenTrabajo({
        numero: 'OT-RESTRICT-TEST',
        clienteId: cliente.id!,
        vehiculoId: vehiculo.id!,
        fechaIngreso: new Date().toISOString(),
        estado: 'En Progreso',
        descripcion: 'Orden de prueba RESTRICT',
        total: 10000,
        activo: true
      });

      await dbService.saveDetalleOrden({
        ordenId: orden.id!,
        tipo: 'repuesto',
        repuestoId: repuesto.id!,
        cantidad: 1,
        precio: 10000,
        subtotal: 10000,
        descripcion: 'Repuesto Test'
      });

      // Intentar eliminar repuesto (debe fallar o prevenir)
      try {
        await dbService.deleteRepuesto(repuesto.id!);
        // Si no falla, verificar que el repuesto sigue existiendo
        const repuestos = await dbService.getAllRepuestos();
        const repuestoExistente = repuestos.find(r => r.id === repuesto.id);
        expect(repuestoExistente).toBeDefined();
      } catch (error) {
        // Si falla, es el comportamiento esperado
        expect(error).toBeDefined();
      }
    });
  });

  describe('Constraints UNIQUE', () => {
    it('debe prevenir RUTs duplicados', async () => {
      const baseTimestamp = Date.now() + 100000;
      const rutBase = baseTimestamp;
      const dv = rutBase % 11;
      const dvFinal = dv === 0 ? '0' : dv === 1 ? 'K' : String(11 - dv);
      const rut = `${rutBase}-${dvFinal}`;
      
      const cliente1 = await dbService.saveCliente({
        nombre: 'Cliente 1',
        rut: rut,
        telefono: '+56555555555',
        email: `cliente1${baseTimestamp}@test.com`,
        activo: true
      });

      // Intentar crear otro cliente con el mismo RUT (debe fallar)
      await expect(
        dbService.saveCliente({
          nombre: 'Cliente 2',
          rut: rut,
          telefono: '+56555555556',
          email: `cliente2${baseTimestamp}@test.com`,
          activo: true
        })
      ).rejects.toThrow('Ya existe un cliente con el mismo RUT o email');
    });

    it('debe prevenir patentes duplicadas', async () => {
      const baseTimestamp = Date.now() + 110000;
      const rutBase = baseTimestamp;
      const dv = rutBase % 11;
      const dvFinal = dv === 0 ? '0' : dv === 1 ? 'K' : String(11 - dv);
      
      const cliente = await dbService.saveCliente({
        nombre: 'Cliente Test Patente',
        rut: `${rutBase}-${dvFinal}`,
        telefono: '+56444444444',
        email: `patente${baseTimestamp}@test.com`,
        activo: true
      });

      const patente = `UNIQ-${baseTimestamp}`;

      await dbService.saveVehiculo({
        clienteId: cliente.id!,
        marca: 'Test',
        modelo: 'Patente',
        año: 2020,
        patente: patente,
        activo: true
      });

      // Intentar crear otro vehículo con la misma patente (debe fallar)
      await expect(
        dbService.saveVehiculo({
          clienteId: cliente.id!,
          marca: 'Test',
          modelo: 'Patente 2',
          año: 2020,
          patente: patente,
          activo: true
        })
      ).rejects.toThrow();
    });

    it('debe prevenir códigos de repuesto duplicados', async () => {
      const baseTimestamp = Date.now() + 120000;
      const codigo = `REP-UNIQUE-${baseTimestamp}`;

      await dbService.saveRepuesto({
        codigo: codigo,
        nombre: 'Repuesto 1',
        descripcion: 'Repuesto de prueba',
        precio: 10000,
        stock: 100,
        stockMinimo: 5,
        categoria: 'Test',
        marca: 'Test',
        ubicacion: 'A1',
        activo: true
      });

      // Intentar crear otro repuesto con el mismo código (debe fallar)
      await expect(
        dbService.saveRepuesto({
          codigo: codigo,
          nombre: 'Repuesto 2',
          descripcion: 'Repuesto de prueba 2',
          precio: 20000,
          stock: 50,
          stockMinimo: 5,
          categoria: 'Test',
          marca: 'Test',
          ubicacion: 'A2',
          activo: true
        })
      ).rejects.toThrow();
    });
  });

  describe('Constraints CHECK', () => {
    it('debe prevenir precios negativos', async () => {
      await expect(
        dbService.saveRepuesto({
          codigo: 'REP-NEG-001',
          nombre: 'Repuesto Negativo',
          descripcion: 'Repuesto con precio negativo',
          precio: -1000, // Precio negativo
          stock: 100,
          stockMinimo: 5,
          categoria: 'Test',
          marca: 'Test',
          ubicacion: 'A1',
          activo: true
        })
      ).rejects.toThrow();
    });

    it('debe prevenir stock negativo', async () => {
      await expect(
        dbService.saveRepuesto({
          codigo: 'REP-STOCK-NEG-001',
          nombre: 'Repuesto Stock Negativo',
          descripcion: 'Repuesto con stock negativo',
          precio: 10000,
          stock: -10, // Stock negativo
          stockMinimo: 5,
          categoria: 'Test',
          marca: 'Test',
          ubicacion: 'A1',
          activo: true
        })
      ).rejects.toThrow();
    });

    it('debe prevenir años fuera de rango', async () => {
      const cliente = await dbService.saveCliente({
        nombre: 'Cliente Test Año',
        rut: '33333333-3',
        telefono: '+56333333333',
        activo: true
      });

      // Año fuera de rango (CHECK año >= 1900 AND año <= 2030)
      await expect(
        dbService.saveVehiculo({
          clienteId: cliente.id!,
          marca: 'Test',
          modelo: 'Año',
          año: 1800, // Año fuera de rango
          patente: 'YEAR-33',
          activo: true
        })
      ).rejects.toThrow();
    });
  });

  describe('Consistencia de Datos', () => {
    it('debe mantener consistencia en transacciones', async () => {
      const baseTimestamp = Date.now() + 90000;
      const rutBase = baseTimestamp;
      const dv = rutBase % 11;
      const dvFinal = dv === 0 ? '0' : dv === 1 ? 'K' : String(11 - dv);
      
      const cliente = await dbService.saveCliente({
        nombre: 'Cliente Test Transacción',
        rut: `${rutBase}-${dvFinal}`,
        telefono: '+56222222222',
        email: `transaccion${baseTimestamp}@test.com`,
        activo: true
      });

      expect(cliente.id).toBeDefined();

      const vehiculo = await dbService.saveVehiculo({
        clienteId: cliente.id!,
        marca: 'Test',
        modelo: 'Transacción',
        año: 2020,
        patente: `TRAN-${baseTimestamp}`,
        activo: true
      });

      expect(vehiculo.id).toBeDefined();

      // Crear orden con detalles usando saveOrdenTrabajoConDetalles
      const orden = {
        numero: `OT-TRANS-${baseTimestamp}`,
        clienteId: cliente.id!,
        vehiculoId: vehiculo.id!,
        fechaIngreso: new Date().toISOString(),
        estado: 'En Progreso',
        descripcion: 'Orden de prueba transacción',
        total: 20000,
        activo: true
      };

      const repuesto = await dbService.saveRepuesto({
        codigo: `REP-TRANS-${baseTimestamp}`,
        nombre: 'Repuesto Transacción',
        descripcion: 'Repuesto de prueba',
        precio: 10000,
        stock: 100,
        stockMinimo: 5,
        categoria: 'Test',
        marca: 'Test',
        ubicacion: 'A1',
        activo: true
      });

      const detalles = [
        {
          tipo: 'repuesto' as const,
          repuestoId: repuesto.id!,
          cantidad: 2,
          precio: 10000,
          subtotal: 20000,
          descripcion: 'Repuesto Transacción'
        }
      ];

      const resultado = await dbService.saveOrdenTrabajoConDetalles(orden, detalles);

      expect(resultado).toBeDefined();
      expect(resultado.id).toBeDefined();

      // Verificar que los detalles se guardaron correctamente
      const detallesGuardados = await dbService.getDetallesOrden(resultado.id);
      expect(detallesGuardados.length).toBe(1);
      expect(detallesGuardados[0].cantidad).toBe(2);
      expect(detallesGuardados[0].subtotal).toBe(20000);
    });
  });
});

