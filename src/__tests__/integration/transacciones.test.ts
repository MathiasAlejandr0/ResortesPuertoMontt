/**
 * Tests de integración para operaciones complejas con transacciones
 */

import { DatabaseService, Cliente, Vehiculo, Cotizacion, OrdenTrabajo, DetalleCotizacion, DetalleOrden } from '../../database/database';
import * as fs from 'fs';
import * as path from 'path';

const testDataDir = path.join(__dirname, '../../../../test-data/integration-transacciones');

jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => testDataDir)
  }
}));

const originalEnv = process.env.NODE_ENV;
process.env.NODE_ENV = 'development';

describe('Tests de Integración - Transacciones', () => {
  let dbService: DatabaseService;
  const testDataDir = path.join(__dirname, '../../../../test-data/integration-transacciones');
  const testDbPath = path.join(testDataDir, 'data', 'resortes.db');

  beforeAll(async () => {
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }
    
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  afterAll(() => {
    if (originalEnv) {
      process.env.NODE_ENV = originalEnv;
    } else {
      delete process.env.NODE_ENV;
    }
    
    if (dbService) {
      try {
        dbService.close();
      } catch (e) {
        // Ignorar
      }
    }
    
    if (fs.existsSync(testDbPath)) {
      try {
        fs.unlinkSync(testDbPath);
      } catch (e) {
        // Ignorar
      }
    }
  });

  beforeEach(async () => {
    if (dbService) {
      try {
        dbService.close();
      } catch (e) {
        // Ignorar
      }
    }
    
    // Esperar más tiempo para liberar locks
    await new Promise(resolve => setTimeout(resolve, 200));
    
    if (fs.existsSync(testDbPath)) {
      try {
        fs.unlinkSync(testDbPath);
      } catch (e) {
        // Esperar y reintentar si falla
        await new Promise(resolve => setTimeout(resolve, 100));
        try {
          fs.unlinkSync(testDbPath);
        } catch (e2) {}
      }
    }
    
    // Crear nueva instancia con retry
    let retries = 3;
    while (retries > 0) {
      try {
        dbService = await DatabaseService.create();
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 800); // Más tiempo para inicialización completa
        });
        break;
      } catch (error: any) {
        if (error?.code === 'SQLITE_BUSY' && retries > 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
          retries--;
        } else {
          throw error;
        }
      }
    }
  });

  describe('saveCotizacionConDetalles - Transacción Atómica', () => {
    it('debe guardar cotización con detalles en una sola transacción', async () => {
      const baseTimestamp = Date.now();
      const rutBase = baseTimestamp;
      const dv = rutBase % 11;
      const dvFinal = dv === 0 ? '0' : dv === 1 ? 'K' : String(11 - dv);
      const patente = `INT-${baseTimestamp}`;
      // Crear cliente y vehículo primero
      const cliente: Cliente = {
        nombre: 'Cliente Test Integración',
        rut: `${rutBase}-${dvFinal}`,
        telefono: '+56912345678',
        activo: true,
      };
      const clienteGuardado = await dbService.saveCliente(cliente);
      expect(clienteGuardado.id).toBeDefined();

      const vehiculo: Vehiculo = {
        clienteId: clienteGuardado.id!,
        marca: 'Toyota',
        modelo: 'Corolla',
        año: 2020,
        patente,
        activo: true,
      };
      const vehiculoGuardado = await dbService.saveVehiculo(vehiculo);
      expect(vehiculoGuardado.id).toBeDefined();

      // Crear cotización con detalles
      const cotizacion: Cotizacion = {
        numero: 'COT-INT-001',
        clienteId: clienteGuardado.id!,
        vehiculoId: vehiculoGuardado.id!,
        fecha: new Date().toISOString(),
        validaHasta: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        estado: 'pendiente',
        descripcion: 'Reparación completa',
        total: 150000,
      };

      const servicio = await dbService.saveServicio({
        nombre: `Servicio ${baseTimestamp}`,
        descripcion: 'Servicio test',
        precio: 50000,
        duracionEstimada: 60,
        activo: true
      });
      const repuesto = await dbService.saveRepuesto({
        codigo: `REP-INT-${baseTimestamp}`,
        nombre: 'Repuesto Test',
        descripcion: 'Repuesto test',
        precio: 50000,
        stock: 10,
        stockMinimo: 5,
        categoria: 'Test',
        marca: 'Test',
        ubicacion: 'A1',
        activo: true
      });

      const detalles: DetalleCotizacion[] = [
        {
          cotizacionId: 0, // Se actualizará después
          tipo: 'servicio',
          servicioId: servicio.id,
          cantidad: 2,
          precio: 50000,
          subtotal: 100000,
          descripcion: 'Servicio 1',
        },
        {
          cotizacionId: 0,
          tipo: 'repuesto',
          repuestoId: repuesto.id,
          cantidad: 1,
          precio: 50000,
          subtotal: 50000,
          descripcion: 'Repuesto 1',
        },
      ];

      // Guardar con transacción
      const resultado = await dbService.saveCotizacionConDetalles(cotizacion, detalles);
      
      expect(resultado.id).toBeDefined();
      expect(resultado.numero).toBe('COT-INT-001');

      // Verificar que los detalles se guardaron
      const detallesGuardados = await dbService.getDetallesCotizacion(resultado.id!);
      expect(detallesGuardados.length).toBe(2);
      expect(detallesGuardados[0].descripcion).toBe('Servicio 1');
      expect(detallesGuardados[1].descripcion).toBe('Repuesto 1');
    });

    it('debe hacer rollback si falla la validación de integridad referencial', async () => {
      const cotizacion: Cotizacion = {
        numero: 'COT-INT-002',
        clienteId: 99999, // Cliente inexistente
        vehiculoId: 99999, // Vehículo inexistente
        fecha: new Date().toISOString(),
        estado: 'pendiente',
        descripcion: 'Test',
        total: 100000,
      };

      const detalles: DetalleCotizacion[] = [];

      await expect(
        dbService.saveCotizacionConDetalles(cotizacion, detalles)
      ).rejects.toThrow();

      // Verificar que no se guardó nada
      const cotizaciones = await dbService.getAllCotizaciones();
      const cotizacionEncontrada = cotizaciones.find(c => c.numero === 'COT-INT-002');
      expect(cotizacionEncontrada).toBeUndefined();
    });
  });

  describe('saveOrdenTrabajoConDetalles - Transacción Atómica', () => {
    it('debe guardar orden con detalles en una sola transacción', async () => {
      const baseTimestamp = Date.now() + 10000;
      const rutBase = baseTimestamp;
      const dv = rutBase % 11;
      const dvFinal = dv === 0 ? '0' : dv === 1 ? 'K' : String(11 - dv);
      const patente = `ORD-${baseTimestamp}`;
      // Crear cliente y vehículo
      const cliente: Cliente = {
        nombre: 'Cliente Test Orden',
        rut: `${rutBase}-${dvFinal}`,
        telefono: '+56987654321',
        activo: true,
      };
      const clienteGuardado = await dbService.saveCliente(cliente);

      const vehiculo: Vehiculo = {
        clienteId: clienteGuardado.id!,
        marca: 'Honda',
        modelo: 'Civic',
        año: 2021,
        patente,
        activo: true,
      };
      const vehiculoGuardado = await dbService.saveVehiculo(vehiculo);

      // Crear orden con detalles
      const orden: OrdenTrabajo = {
        numero: 'OT-INT-001',
        clienteId: clienteGuardado.id!,
        vehiculoId: vehiculoGuardado.id!,
        fechaIngreso: new Date().toISOString(),
        estado: 'pendiente',
        descripcion: 'Reparación de motor',
        total: 200000,
      };

      const servicio = await dbService.saveServicio({
        nombre: `Servicio Orden ${baseTimestamp}`,
        descripcion: 'Servicio test',
        precio: 150000,
        duracionEstimada: 60,
        activo: true
      });
      const repuesto = await dbService.saveRepuesto({
        codigo: `REP-ORD-${baseTimestamp}`,
        nombre: 'Repuesto Orden',
        descripcion: 'Repuesto test',
        precio: 25000,
        stock: 10,
        stockMinimo: 5,
        categoria: 'Test',
        marca: 'Test',
        ubicacion: 'A1',
        activo: true
      });

      const detalles: DetalleOrden[] = [
        {
          ordenId: 0,
          tipo: 'servicio',
          servicioId: servicio.id,
          cantidad: 1,
          precio: 150000,
          subtotal: 150000,
          descripcion: 'Servicio de reparación',
        },
        {
          ordenId: 0,
          tipo: 'repuesto',
          repuestoId: repuesto.id,
          cantidad: 2,
          precio: 25000,
          subtotal: 50000,
          descripcion: 'Repuestos necesarios',
        },
      ];

      const resultado = await dbService.saveOrdenTrabajoConDetalles(orden, detalles);
      
      expect(resultado.id).toBeDefined();
      expect(resultado.numero).toBe('OT-INT-001');

      // Verificar detalles
      const detallesGuardados = await dbService.getDetallesOrden(resultado.id!);
      expect(detallesGuardados.length).toBe(2);
    });

    it('debe hacer rollback si falla la validación de integridad', async () => {
      const orden: OrdenTrabajo = {
        numero: 'OT-INT-002',
        clienteId: 99999,
        vehiculoId: 99999,
        fechaIngreso: new Date().toISOString(),
        estado: 'pendiente',
        descripcion: 'Test',
        total: 100000,
      };

      await expect(
        dbService.saveOrdenTrabajoConDetalles(orden, [])
      ).rejects.toThrow();

      // Verificar que no se guardó
      const ordenes = await dbService.getAllOrdenesTrabajo();
      const ordenEncontrada = ordenes.find(o => o.numero === 'OT-INT-002');
      expect(ordenEncontrada).toBeUndefined();
    });
  });

  describe('saveClienteConVehiculos - Transacción Atómica', () => {
    it('debe guardar cliente con múltiples vehículos en una transacción', async () => {
      const baseTimestamp = Date.now() + 20000;
      const rutBase = baseTimestamp;
      const dv = rutBase % 11;
      const dvFinal = dv === 0 ? '0' : dv === 1 ? 'K' : String(11 - dv);
      const cliente: Cliente = {
        nombre: 'Cliente Múltiples Vehículos',
        rut: `${rutBase}-${dvFinal}`,
        telefono: '+56911111111',
        activo: true,
      };

      const vehiculos: Vehiculo[] = [
        {
          clienteId: 0, // Se actualizará
          marca: 'Toyota',
          modelo: 'Corolla',
          año: 2020,
          patente: `VH-${baseTimestamp}-1`,
          activo: true,
        },
        {
          clienteId: 0,
          marca: 'Honda',
          modelo: 'Civic',
          año: 2021,
          patente: `VH-${baseTimestamp}-2`,
          activo: true,
        },
      ];

      const resultado = await dbService.saveClienteConVehiculos(cliente, vehiculos);
      
      expect(resultado.id).toBeDefined();
      
      // Verificar vehículos
      const todosVehiculos = await dbService.getAllVehiculos();
      const vehiculosDelCliente = todosVehiculos.filter(v => v.clienteId === resultado.id);
      expect(vehiculosDelCliente.length).toBe(2);
    });
  });
});

