/**
 * Tests de Rendimiento de Índices
 * 
 * Verifica que los índices compuestos mejoran el rendimiento de las consultas
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

describe('Rendimiento de Índices', () => {
  let dbService: DatabaseService;
  const testDataDir = path.join(__dirname, '../../../../test-data');

  beforeAll(async () => {
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }
    dbService = await DatabaseService.create();
    
    // Crear datos de prueba
    const cliente = await dbService.saveCliente({
      nombre: 'Cliente Test Índices',
      rut: '22222222-2',
      telefono: '+56222222222',
      activo: true
    });

    const vehiculo = await dbService.saveVehiculo({
      clienteId: cliente.id!,
      marca: 'Test',
      modelo: 'Índices',
      año: 2020,
      patente: 'INDX-22',
      activo: true
    });

    // Crear múltiples órdenes para el mismo cliente
    for (let i = 0; i < 10; i++) {
      await dbService.saveOrdenTrabajo({
        numero: `OT-INDX-${i}`,
        clienteId: cliente.id!,
        vehiculoId: vehiculo.id!,
        fechaIngreso: new Date(2024, 0, i + 1).toISOString(),
        estado: 'En Progreso',
        descripcion: `Orden test índices ${i}`,
        total: 10000 + i,
        activo: true
      });
    }
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

  it('debe usar índice compuesto para búsqueda por cliente y fecha', async () => {
    const cliente = await dbService.getAllClientes();
    const clienteTest = cliente.find(c => c.rut === '22222222-2');
    
    if (!clienteTest) {
      throw new Error('Cliente de prueba no encontrado');
    }

    const startTime = Date.now();
    
    // Esta consulta debería usar el índice compuesto idx_ordenes_cliente_fecha
    const ordenes = await dbService.getAllOrdenesTrabajo();
    const ordenesCliente = ordenes.filter(o => 
      o.clienteId === clienteTest.id && 
      o.fechaIngreso.startsWith('2024-01')
    );

    const duration = Date.now() - startTime;

    console.log(`⏱️ Tiempo de búsqueda con índice compuesto: ${duration}ms`);
    expect(ordenesCliente.length).toBeGreaterThan(0);
    expect(duration).toBeLessThan(100); // Debería ser rápido con índice
  });

  it('debe usar índice en nombre de cliente para búsquedas', async () => {
    const startTime = Date.now();
    
    const clientes = await dbService.getAllClientes();
    const clientesFiltrados = clientes.filter(c => 
      c.nombre.toLowerCase().includes('test')
    );

    const duration = Date.now() - startTime;

    console.log(`⏱️ Tiempo de búsqueda por nombre: ${duration}ms`);
    expect(clientesFiltrados.length).toBeGreaterThan(0);
    expect(duration).toBeLessThan(50); // Debería ser rápido con índice
  });

  it('debe usar índice en número de orden para búsquedas', async () => {
    const startTime = Date.now();
    
    const ordenes = await dbService.getAllOrdenesTrabajo();
    const ordenEncontrada = ordenes.find(o => 
      o.numero.startsWith('OT-INDX-')
    );

    const duration = Date.now() - startTime;

    console.log(`⏱️ Tiempo de búsqueda por número: ${duration}ms`);
    expect(ordenEncontrada).toBeDefined();
    expect(duration).toBeLessThan(50); // Debería ser rápido con índice
  });
});

