/**
 * Tests E2E para flujos principales del sistema
 * Simula el flujo completo de creación de cotización → orden de trabajo
 */

import { DatabaseService, Cliente, Vehiculo, Cotizacion, OrdenTrabajo, DetalleCotizacion, DetalleOrden } from '../../database/database';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => path.join(__dirname, '../../../../test-data'))
  }
}));

const originalEnv = process.env.NODE_ENV;
process.env.NODE_ENV = 'development';

describe('Tests E2E - Flujos Principales', () => {
  let dbService: DatabaseService;
  const testDataDir = path.join(__dirname, '../../../../test-data');
  const testDbPath = path.join(testDataDir, 'resortes-e2e.db');

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

  describe('Flujo Completo: Cliente → Vehículo → Cotización → Orden de Trabajo', () => {
    it('debe completar el flujo completo de negocio', async () => {
      // PASO 1: Crear cliente
      const cliente: Cliente = {
        nombre: 'Juan Pérez',
        rut: '12345678-9',
        telefono: '+56912345678',
        email: 'juan@email.com',
        activo: true,
      };
      const clienteGuardado = await dbService.saveCliente(cliente);
      expect(clienteGuardado.id).toBeDefined();
      expect(clienteGuardado.nombre).toBe('Juan Pérez');

      // PASO 2: Crear vehículo para el cliente
      const vehiculo: Vehiculo = {
        clienteId: clienteGuardado.id!,
        marca: 'Toyota',
        modelo: 'Corolla',
        año: 2020,
        patente: 'ABCD12',
        activo: true,
      };
      const vehiculoGuardado = await dbService.saveVehiculo(vehiculo);
      expect(vehiculoGuardado.id).toBeDefined();
      expect(vehiculoGuardado.patente).toBe('ABCD12');

      // PASO 3: Crear cotización con servicios y repuestos
      const cotizacion: Cotizacion = {
        numero: 'COT-E2E-001',
        clienteId: clienteGuardado.id!,
        vehiculoId: vehiculoGuardado.id!,
        fecha: new Date().toISOString(),
        validaHasta: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        estado: 'pendiente',
        descripcion: 'Reparación de frenos y cambio de aceite',
        total: 175000,
      };

      const detallesCotizacion: DetalleCotizacion[] = [
        {
          cotizacionId: 0,
          tipo: 'servicio',
          servicioId: 1,
          cantidad: 1,
          precio: 100000,
          subtotal: 100000,
          descripcion: 'Reparación de frenos',
        },
        {
          cotizacionId: 0,
          tipo: 'repuesto',
          repuestoId: 1,
          cantidad: 2,
          precio: 37500,
          subtotal: 75000,
          descripcion: 'Pastillas de freno',
        },
      ];

      const cotizacionGuardada = await dbService.saveCotizacionConDetalles(cotizacion, detallesCotizacion);
      expect(cotizacionGuardada.id).toBeDefined();
      expect(cotizacionGuardada.numero).toBe('COT-E2E-001');
      expect(cotizacionGuardada.estado).toBe('pendiente');

      // Verificar detalles de cotización
      const detallesGuardados = await dbService.getDetallesCotizacion(cotizacionGuardada.id!);
      expect(detallesGuardados.length).toBe(2);

      // PASO 4: Aprobar cotización (cambiar estado)
      const cotizacionAprobada = await dbService.saveCotizacion({
        ...cotizacionGuardada,
        estado: 'aprobada',
      });
      expect(cotizacionAprobada.estado).toBe('aprobada');

      // PASO 5: Crear orden de trabajo desde cotización
      const orden: OrdenTrabajo = {
        numero: 'OT-E2E-001',
        clienteId: clienteGuardado.id!,
        vehiculoId: vehiculoGuardado.id!,
        fechaIngreso: new Date().toISOString(),
        estado: 'en_proceso',
        descripcion: cotizacionGuardada.descripcion,
        total: cotizacionGuardada.total,
        kilometrajeEntrada: 50000,
      };

      // Convertir detalles de cotización a detalles de orden
      const detallesOrden: DetalleOrden[] = detallesGuardados.map(det => ({
        ordenId: 0,
        tipo: det.tipo,
        servicioId: det.servicioId,
        repuestoId: det.repuestoId,
        cantidad: det.cantidad,
        precio: det.precio,
        subtotal: det.subtotal,
        descripcion: det.descripcion,
      }));

      const ordenGuardada = await dbService.saveOrdenTrabajoConDetalles(orden, detallesOrden);
      expect(ordenGuardada.id).toBeDefined();
      expect(ordenGuardada.numero).toBe('OT-E2E-001');
      expect(ordenGuardada.estado).toBe('en_proceso');

      // Verificar detalles de orden
      const detallesOrdenGuardados = await dbService.getDetallesOrden(ordenGuardada.id!);
      expect(detallesOrdenGuardados.length).toBe(2);

      // PASO 6: Completar orden
      const ordenCompletada = await dbService.saveOrdenTrabajo({
        ...ordenGuardada,
        estado: 'completada',
        fechaEntrega: new Date().toISOString(),
        kilometrajeSalida: 50050,
      });
      expect(ordenCompletada.estado).toBe('completada');
      expect(ordenCompletada.fechaEntrega).toBeDefined();

      // PASO 7: Verificar que todo está relacionado correctamente
      const ordenesFinales = await dbService.getAllOrdenesTrabajo();
      const ordenFinal = ordenesFinales.find(o => o.id === ordenCompletada.id);
      expect(ordenFinal).toBeDefined();
      expect(ordenFinal?.clienteId).toBe(clienteGuardado.id);
      expect(ordenFinal?.vehiculoId).toBe(vehiculoGuardado.id);
    });

    it('debe manejar correctamente la conversión de cotización a orden', async () => {
      // Crear datos base
      const cliente = await dbService.saveCliente({
        nombre: 'Cliente E2E',
        rut: '22222222-2',
        telefono: '+56922222222',
        activo: true,
      });

      const vehiculo = await dbService.saveVehiculo({
        clienteId: cliente.id!,
        marca: 'Ford',
        modelo: 'Focus',
        año: 2019,
        patente: 'EFGH34',
        activo: true,
      });

      // Crear cotización
      const cotizacion = await dbService.saveCotizacionConDetalles(
        {
          numero: 'COT-E2E-002',
          clienteId: cliente.id!,
          vehiculoId: vehiculo.id!,
          fecha: new Date().toISOString(),
          estado: 'pendiente',
          descripcion: 'Mantención completa',
          total: 250000,
        },
        [
          {
            cotizacionId: 0,
            tipo: 'servicio',
            servicioId: 1,
            cantidad: 2,
            precio: 100000,
            subtotal: 200000,
            descripcion: 'Servicio 1',
          },
          {
            cotizacionId: 0,
            tipo: 'repuesto',
            repuestoId: 1,
            cantidad: 1,
            precio: 50000,
            subtotal: 50000,
            descripcion: 'Repuesto 1',
          },
        ]
      );

      // Convertir a orden
      const detallesCotizacion = await dbService.getDetallesCotizacion(cotizacion.id!);
      const orden = await dbService.saveOrdenTrabajoConDetalles(
        {
          numero: 'OT-E2E-002',
          clienteId: cliente.id!,
          vehiculoId: vehiculo.id!,
          fechaIngreso: new Date().toISOString(),
          estado: 'en_proceso',
          descripcion: cotizacion.descripcion,
          total: cotizacion.total,
        },
        detallesCotizacion.map(det => ({
          ordenId: 0,
          tipo: det.tipo,
          servicioId: det.servicioId,
          repuestoId: det.repuestoId,
          cantidad: det.cantidad,
          precio: det.precio,
          subtotal: det.subtotal,
          descripcion: det.descripcion,
        }))
      );

      // Verificar que los totales coinciden
      expect(orden.total).toBe(cotizacion.total);
      
      const detallesOrden = await dbService.getDetallesOrden(orden.id!);
      const totalDetalles = detallesOrden.reduce((sum, det) => sum + det.subtotal, 0);
      expect(totalDetalles).toBe(250000);
    });
  });
});

