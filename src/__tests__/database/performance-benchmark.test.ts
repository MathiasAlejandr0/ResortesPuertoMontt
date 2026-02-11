/**
 * Benchmarks de Rendimiento
 * 
 * Mide el rendimiento de operaciones críticas del sistema
 */

import { DatabaseService } from '../../database/database';
import * as fs from 'fs';
import * as path from 'path';

const testDataDir = path.join(__dirname, '../../../../test-data/performance-benchmark');

jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => testDataDir),
    isPackaged: false
  }
}));

interface BenchmarkResult {
  operation: string;
  duration: number;
  records: number;
  avgTimePerRecord: number;
  status: 'PASS' | 'FAIL';
}

describe('Benchmarks de Rendimiento', () => {
  let dbService: DatabaseService;
  const testDataDir = path.join(__dirname, '../../../../test-data/performance-benchmark');
  const testDbPath = path.join(testDataDir, 'data', 'resortes.db');
  const results: BenchmarkResult[] = [];

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
    // Imprimir resultados
    console.log('\n📊 RESULTADOS DE BENCHMARKS:\n');
    console.table(results);
    
    if (dbService) {
      try {
        dbService.close();
      } catch (e) {
        // Ignorar
      }
    }
  });

  const addResult = (result: BenchmarkResult) => {
    results.push(result);
    const statusIcon = result.status === 'PASS' ? '✅' : '❌';
    console.log(
      `${statusIcon} ${result.operation}: ${result.duration}ms ` +
      `(${result.records} registros, ${result.avgTimePerRecord.toFixed(2)}ms/registro)`
    );
  };

  it('Benchmark: Crear 100 clientes', async () => {
    const startTime = Date.now();
    const count = 100;
    const baseTimestamp = Date.now() + 40000;

    for (let i = 0; i < count; i++) {
      const rutBase = baseTimestamp + i;
      const dv = rutBase % 11;
      const dvFinal = dv === 0 ? '0' : dv === 1 ? 'K' : String(11 - dv);
      await dbService.saveCliente({
        nombre: `Cliente Benchmark ${i}`,
        rut: `${rutBase}-${dvFinal}`,
        telefono: `+569${String(i + 40000).padStart(8, '0')}`,
        email: `benchmark${baseTimestamp}${i}@test.com`,
        activo: true
      });
    }

    const duration = Date.now() - startTime;
    const avgTime = duration / count;
    const status = avgTime < 50 ? 'PASS' : 'FAIL'; // Objetivo: < 50ms por registro

    addResult({
      operation: 'Crear 100 clientes',
      duration,
      records: count,
      avgTimePerRecord: avgTime,
      status
    });

    expect(avgTime).toBeLessThan(100); // Tolerancia: < 100ms
  }, 15000);

  it('Benchmark: Leer 1,000 clientes', async () => {
    // Primero crear 1,000 clientes si no existen
    const existing = await dbService.getAllClientes();
    if (existing.length < 1000) {
      const baseTimestamp = Date.now() + 50000;
      for (let i = existing.length; i < 1000; i++) {
        const rutBase = baseTimestamp + i;
        const dv = rutBase % 11;
        const dvFinal = dv === 0 ? '0' : dv === 1 ? 'K' : String(11 - dv);
        await dbService.saveCliente({
          nombre: `Cliente Benchmark Read ${i}`,
          rut: `${rutBase}-${dvFinal}`,
          telefono: `+569${String(i + 50000).padStart(8, '0')}`,
          email: `benchread${baseTimestamp}${i}@test.com`,
          activo: true
        });
      }
    }

    const startTime = Date.now();
    const clientes = await dbService.getAllClientes();
    const duration = Date.now() - startTime;
    const count = clientes.length;
    const avgTime = duration / count;
    const status = avgTime < 1 ? 'PASS' : 'FAIL'; // Objetivo: < 1ms por registro

    addResult({
      operation: 'Leer 1,000 clientes',
      duration,
      records: count,
      avgTimePerRecord: avgTime,
      status
    });

    expect(avgTime).toBeLessThan(5); // Tolerancia: < 5ms
  }, 10000);

  it('Benchmark: Búsqueda paginada (50 registros)', async () => {
    const startTime = Date.now();
    const iterations = 20;

    for (let i = 0; i < iterations; i++) {
      await dbService.getClientesPaginated(50, i * 50);
    }

    const duration = Date.now() - startTime;
    const avgTime = duration / iterations;
    const status = avgTime < 20 ? 'PASS' : 'FAIL'; // Objetivo: < 20ms por página

    addResult({
      operation: 'Búsqueda paginada (50 registros)',
      duration,
      records: iterations,
      avgTimePerRecord: avgTime,
      status
    });

    expect(avgTime).toBeLessThan(50); // Tolerancia: < 50ms
  }, 5000);

  it('Benchmark: Crear orden con detalles', async () => {
    // Preparar datos con valores únicos
    const baseTimestamp = Date.now() + 70000;
    const rutBase = baseTimestamp;
    const dv = rutBase % 11;
    const dvFinal = dv === 0 ? '0' : dv === 1 ? 'K' : String(11 - dv);
    
    let cliente;
    try {
      cliente = await dbService.saveCliente({
        nombre: 'Cliente Benchmark Orden',
        rut: `${rutBase}-${dvFinal}`,
        telefono: '+56999999999',
        email: `benchorden${baseTimestamp}@test.com`,
        activo: true
      });
    } catch (error) {
      const clientes = await dbService.getAllClientes();
      cliente = clientes.find(c => c.nombre === 'Cliente Benchmark Orden') || clientes[0];
    }

    let vehiculo;
    try {
      vehiculo = await dbService.saveVehiculo({
        clienteId: cliente.id!,
        marca: 'Test',
        modelo: 'Benchmark',
        año: 2020,
        patente: `BENCH-${baseTimestamp}`,
        activo: true
      });
    } catch (error) {
      const vehiculos = await dbService.getAllVehiculos();
      vehiculo = vehiculos.find(v => v.clienteId === cliente.id!) || vehiculos[0];
    }

    let repuesto;
    try {
      repuesto = await dbService.saveRepuesto({
        codigo: `REP-BENCH-${baseTimestamp}`,
        nombre: 'Repuesto Benchmark',
        descripcion: 'Repuesto de prueba',
        precio: 10000,
        stock: 100,
        stockMinimo: 5,
        categoria: 'Test',
        marca: 'Test',
        ubicacion: 'A1',
        activo: true
      });
    } catch (error) {
      const repuestos = await dbService.getAllRepuestos();
      repuesto = repuestos.find(r => r.nombre === 'Repuesto Benchmark') || repuestos[0];
    }

    const startTime = Date.now();
    const iterations = 50;

    for (let i = 0; i < iterations; i++) {
      const orden = await dbService.saveOrdenTrabajo({
        numero: `OT-BENCH-${i}`,
        clienteId: cliente.id!,
        vehiculoId: vehiculo.id!,
        fechaIngreso: new Date().toISOString(),
        estado: 'En Progreso',
        descripcion: `Orden benchmark ${i}`,
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
        descripcion: 'Repuesto Benchmark'
      });
    }

    const duration = Date.now() - startTime;
    const avgTime = duration / iterations;
    const status = avgTime < 100 ? 'PASS' : 'FAIL'; // Objetivo: < 100ms por orden

    addResult({
      operation: 'Crear orden con detalles',
      duration,
      records: iterations,
      avgTimePerRecord: avgTime,
      status
    });

    expect(avgTime).toBeLessThan(200); // Tolerancia: < 200ms
  }, 20000);

  it('Benchmark: Operaciones concurrentes (10 escrituras)', async () => {
    const startTime = Date.now();
    const count = 10;
    const baseTimestamp = Date.now() + 60000;

    const promises = Array.from({ length: count }, (_, i) => {
      const rutBase = baseTimestamp + i;
      const dv = rutBase % 11;
      const dvFinal = dv === 0 ? '0' : dv === 1 ? 'K' : String(11 - dv);
      return dbService.saveCliente({
        nombre: `Cliente Concurrente ${i}`,
        rut: `${rutBase}-${dvFinal}`,
        telefono: `+569${String(i + 60000).padStart(8, '0')}`,
        email: `concurrent${baseTimestamp}${i}@test.com`,
        activo: true
      });
    });

    await Promise.all(promises);

    const duration = Date.now() - startTime;
    const avgTime = duration / count;
    const status = avgTime < 150 ? 'PASS' : 'FAIL'; // Objetivo: < 150ms por escritura concurrente

    addResult({
      operation: 'Operaciones concurrentes (10 escrituras)',
      duration,
      records: count,
      avgTimePerRecord: avgTime,
      status
    });

    expect(avgTime).toBeLessThan(300); // Tolerancia: < 300ms
  }, 10000);
});

