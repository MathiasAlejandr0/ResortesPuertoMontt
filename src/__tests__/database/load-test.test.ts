/**
 * Pruebas de Carga y Rendimiento
 * 
 * Este archivo contiene pruebas de carga para evaluar el rendimiento
 * del sistema bajo diferentes condiciones de uso.
 */

import { DatabaseService } from '../../database/database';
import * as fs from 'fs';
import * as path from 'path';

// Mock de electron.app
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => path.join(__dirname, '../../../../test-data')),
    isPackaged: false
  }
}));

describe('Pruebas de Carga - DatabaseService', () => {
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

  describe('Escenario 1: Carga Inicial de Datos', () => {
    it('debe cargar 1,000 clientes en menos de 3 segundos', async () => {
      const startTime = Date.now();
      const baseTimestamp = Date.now();
      
      // Crear 1,000 clientes con RUTs únicos
      const clientes = Array.from({ length: 1000 }, (_, i) => {
        const rutBase = baseTimestamp + i;
        const dv = rutBase % 11;
        const dvFinal = dv === 0 ? '0' : dv === 1 ? 'K' : String(11 - dv);
        return {
          nombre: `Cliente Test ${i}`,
          rut: `${rutBase}-${dvFinal}`,
          telefono: `+569${String(i).padStart(8, '0')}`,
          email: `cliente${baseTimestamp}${i}@test.com`,
          direccion: `Dirección ${i}`,
          activo: true
        };
      });

      for (const cliente of clientes) {
        await dbService.saveCliente(cliente);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`⏱️ Tiempo para crear 1,000 clientes: ${duration}ms`);
      expect(duration).toBeLessThan(3000); // Menos de 3 segundos
    }, 10000);

    it('debe cargar 2,000 órdenes en menos de 5 segundos', async () => {
      // Primero crear un cliente y vehículo de prueba con datos únicos
      const baseTimestamp = Date.now() + 70000;
      const rutBase = baseTimestamp;
      const dv = rutBase % 11;
      const dvFinal = dv === 0 ? '0' : dv === 1 ? 'K' : String(11 - dv);
      
      let cliente;
      try {
        cliente = await dbService.saveCliente({
          nombre: 'Cliente Test Carga',
          rut: `${rutBase}-${dvFinal}`,
          telefono: '+56999999999',
          email: `carga${baseTimestamp}@test.com`,
          activo: true
        });
      } catch (error) {
        // Si ya existe, buscarlo
        const clientes = await dbService.getAllClientes();
        cliente = clientes.find(c => c.nombre === 'Cliente Test Carga') || clientes[0];
      }

      let vehiculo;
      try {
        vehiculo = await dbService.saveVehiculo({
          clienteId: cliente.id!,
          marca: 'Test',
          modelo: 'Carga',
          año: 2020,
          patente: `TEST-${baseTimestamp}`,
          activo: true
        });
      } catch (error) {
        // Si ya existe, buscarlo
        const vehiculos = await dbService.getAllVehiculos();
        vehiculo = vehiculos.find(v => v.clienteId === cliente.id!) || vehiculos[0];
      }

      const startTime = Date.now();

      // Crear 2,000 órdenes
      for (let i = 0; i < 2000; i++) {
        await dbService.saveOrdenTrabajo({
          numero: `OT-TEST-${i}`,
          clienteId: cliente.id!,
          vehiculoId: vehiculo.id!,
          fechaIngreso: new Date().toISOString(),
          estado: 'En Progreso',
          descripcion: `Orden de prueba ${i}`,
          total: 100000 + i,
          activo: true
        });
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`⏱️ Tiempo para crear 2,000 órdenes: ${duration}ms`);
      expect(duration).toBeLessThan(5000); // Menos de 5 segundos
    }, 15000);
  });

  describe('Escenario 2: Búsqueda Intensiva', () => {
    beforeEach(async () => {
      // Crear datos de prueba
      for (let i = 0; i < 100; i++) {
        await dbService.saveCliente({
          nombre: `Cliente Búsqueda ${i}`,
          rut: `${20000000 + i}-${i % 10}`,
          telefono: `+569${String(i).padStart(8, '0')}`,
          email: `busqueda${i}@test.com`,
          activo: true
        });
      }
    });

    it('debe realizar 100 búsquedas en menos de 1 segundo', async () => {
      // Primero crear algunos clientes de prueba si no existen
      const existing = await dbService.getAllClientes();
      if (existing.length < 10) {
        const baseTimestamp = Date.now();
        for (let i = 0; i < 10; i++) {
          const rutBase = baseTimestamp + i + 10000;
          const dv = rutBase % 11;
          const dvFinal = dv === 0 ? '0' : dv === 1 ? 'K' : String(11 - dv);
          await dbService.saveCliente({
            nombre: `Cliente Búsqueda ${i}`,
            rut: `${rutBase}-${dvFinal}`,
            telefono: `+569${String(i + 10000).padStart(8, '0')}`,
            email: `busqueda${baseTimestamp}${i}@test.com`,
            activo: true
          });
        }
      }

      const startTime = Date.now();

      // Realizar 100 búsquedas
      for (let i = 0; i < 100; i++) {
        await dbService.getAllClientes();
      }

      const endTime = Date.now();
      const duration = endTime - startTime;
      const avgTime = duration / 100;

      console.log(`⏱️ Tiempo total para 100 búsquedas: ${duration}ms`);
      console.log(`⏱️ Tiempo promedio por búsqueda: ${avgTime.toFixed(2)}ms`);
      
      expect(avgTime).toBeLessThan(10); // Menos de 10ms por búsqueda
    }, 5000);

    it('debe realizar búsquedas paginadas eficientemente', async () => {
      // Asegurar que hay suficientes clientes para paginar
      const existing = await dbService.getAllClientes();
      if (existing.length < 100) {
        const baseTimestamp = Date.now() + 20000;
        for (let i = existing.length; i < 100; i++) {
          const rutBase = baseTimestamp + i;
          const dv = rutBase % 11;
          const dvFinal = dv === 0 ? '0' : dv === 1 ? 'K' : String(11 - dv);
          await dbService.saveCliente({
            nombre: `Cliente Paginado ${i}`,
            rut: `${rutBase}-${dvFinal}`,
            telefono: `+569${String(i + 20000).padStart(8, '0')}`,
            email: `paginado${baseTimestamp}${i}@test.com`,
            activo: true
          });
        }
      }

      const startTime = Date.now();

      // Realizar 50 búsquedas paginadas
      for (let i = 0; i < 50; i++) {
        await dbService.getClientesPaginated(50, i * 50);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;
      const avgTime = duration / 50;

      console.log(`⏱️ Tiempo total para 50 búsquedas paginadas: ${duration}ms`);
      console.log(`⏱️ Tiempo promedio por búsqueda paginada: ${avgTime.toFixed(2)}ms`);
      
      expect(avgTime).toBeLessThan(20); // Menos de 20ms por búsqueda paginada
    }, 5000);
  });

  describe('Escenario 3: Escritura Concurrente', () => {
    it('debe manejar 50 escrituras simultáneas correctamente', async () => {
      const startTime = Date.now();
      const baseTimestamp = Date.now() + 30000;

      // Crear 50 escrituras simultáneas con RUTs únicos
      const promises = Array.from({ length: 50 }, (_, i) => {
        const rutBase = baseTimestamp + i;
        const dv = rutBase % 11;
        const dvFinal = dv === 0 ? '0' : dv === 1 ? 'K' : String(11 - dv);
        return dbService.saveCliente({
          nombre: `Cliente Concurrente ${i}`,
          rut: `${rutBase}-${dvFinal}`,
          telefono: `+569${String(i + 30000).padStart(8, '0')}`,
          email: `concurrente${baseTimestamp}${i}@test.com`,
          activo: true
        });
      });

      await Promise.all(promises);

      const endTime = Date.now();
      const duration = endTime - startTime;
      const avgTime = duration / 50;

      console.log(`⏱️ Tiempo total para 50 escrituras concurrentes: ${duration}ms`);
      console.log(`⏱️ Tiempo promedio por escritura: ${avgTime.toFixed(2)}ms`);
      
      expect(avgTime).toBeLessThan(100); // Menos de 100ms por escritura
    }, 10000);
  });

  describe('Escenario 4: Transacciones Complejas', () => {
    it('debe crear orden con detalles en menos de 500ms', async () => {
      // Preparar datos
      const cliente = await dbService.saveCliente({
        nombre: 'Cliente Transacción',
        rut: '88888888-8',
        telefono: '+56888888888',
        activo: true
      });

      const vehiculo = await dbService.saveVehiculo({
        clienteId: cliente.id!,
        marca: 'Test',
        modelo: 'Transacción',
        año: 2020,
        patente: 'TRANS-88',
        activo: true
      });

      const repuesto = await dbService.saveRepuesto({
        codigo: 'REP-TEST-001',
        nombre: 'Repuesto Test',
        descripcion: 'Repuesto de prueba',
        precio: 10000,
        stock: 100,
        stockMinimo: 5,
        categoria: 'Test',
        marca: 'Test',
        ubicacion: 'A1',
        activo: true
      });

      const startTime = Date.now();

      // Crear orden con detalles
      const orden = await dbService.saveOrdenTrabajo({
        numero: 'OT-TRANS-TEST',
        clienteId: cliente.id!,
        vehiculoId: vehiculo.id!,
        fechaIngreso: new Date().toISOString(),
        estado: 'En Progreso',
        descripcion: 'Orden de prueba transacción',
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

      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`⏱️ Tiempo para crear orden con detalles: ${duration}ms`);
      expect(duration).toBeLessThan(500); // Menos de 500ms
    }, 5000);
  });

  describe('Escenario 5: Uso de Memoria', () => {
    it('debe mantener uso de memoria razonable con 1,000 registros', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Cargar 1,000 clientes
      const clientes = await dbService.getAllClientes();

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      const memoryMB = memoryIncrease / 1024 / 1024;

      console.log(`💾 Aumento de memoria: ${memoryMB.toFixed(2)}MB`);
      console.log(`📊 Total de clientes cargados: ${clientes.length}`);
      
      // No debería aumentar más de 50MB por 1,000 registros
      expect(memoryMB).toBeLessThan(50);
    }, 5000);
  });
});

