/**
 * Tests para schemas de validación de IPC handlers
 */

import { describe, it, expect } from '@jest/globals';
import {
  ClienteSchema,
  VehiculoSchema,
  CotizacionSchema,
  OrdenTrabajoSchema,
  RepuestoSchema,
  ServicioSchema,
  validateData,
  safeValidate,
} from '../../main/validation-schemas';

describe('Validation Schemas', () => {
  describe('ClienteSchema', () => {
    it('debe validar un cliente válido', () => {
      const cliente = {
        nombre: 'Juan Pérez',
        rut: '12345678-9',
        telefono: '+56912345678',
        email: 'juan@email.com',
        direccion: 'Calle 123',
      };
      const result = safeValidate(ClienteSchema, cliente);
      expect(result.success).toBe(true);
    });

    it('debe rechazar un cliente sin nombre', () => {
      const cliente = {
        rut: '12345678-9',
        telefono: '+56912345678',
      };
      const result = safeValidate(ClienteSchema, cliente);
      expect(result.success).toBe(false);
      expect(result.error).toContain('nombre');
    });

    it('debe rechazar un cliente con email inválido', () => {
      const cliente = {
        nombre: 'Juan Pérez',
        rut: '12345678-9',
        telefono: '+56912345678',
        email: 'email-invalido',
      };
      const result = safeValidate(ClienteSchema, cliente);
      expect(result.success).toBe(false);
      expect(result.error).toContain('email');
    });
  });

  describe('VehiculoSchema', () => {
    it('debe validar un vehículo válido', () => {
      const vehiculo = {
        clienteId: 1,
        marca: 'Toyota',
        modelo: 'Corolla',
        año: 2020,
        patente: 'ABCD12',
      };
      const result = safeValidate(VehiculoSchema, vehiculo);
      expect(result.success).toBe(true);
    });

    it('debe rechazar un vehículo sin clienteId', () => {
      const vehiculo = {
        marca: 'Toyota',
        modelo: 'Corolla',
        año: 2020,
        patente: 'ABCD12',
      };
      const result = safeValidate(VehiculoSchema, vehiculo);
      expect(result.success).toBe(false);
    });

    it('debe rechazar un vehículo con año inválido', () => {
      const vehiculo = {
        clienteId: 1,
        marca: 'Toyota',
        modelo: 'Corolla',
        año: 1800, // Muy antiguo
        patente: 'ABCD12',
      };
      const result = safeValidate(VehiculoSchema, vehiculo);
      expect(result.success).toBe(false);
    });
  });

  describe('CotizacionSchema', () => {
    it('debe validar una cotización válida', () => {
      const cotizacion = {
        numero: 'COT-001',
        clienteId: 1,
        vehiculoId: 1,
        fecha: '2025-01-01',
        estado: 'pendiente' as const,
        descripcion: 'Reparación de frenos',
        total: 150000,
      };
      const result = safeValidate(CotizacionSchema, cotizacion);
      expect(result.success).toBe(true);
    });

    it('debe rechazar una cotización con total negativo', () => {
      const cotizacion = {
        numero: 'COT-001',
        clienteId: 1,
        vehiculoId: 1,
        fecha: '2025-01-01',
        estado: 'pendiente' as const,
        descripcion: 'Reparación',
        total: -1000,
      };
      const result = safeValidate(CotizacionSchema, cotizacion);
      expect(result.success).toBe(false);
      expect(result.error).toContain('total');
    });
  });

  describe('OrdenTrabajoSchema', () => {
    it('debe validar una orden válida', () => {
      const orden = {
        numero: 'OT-001',
        clienteId: 1,
        vehiculoId: 1,
        fechaIngreso: '2025-01-01',
        estado: 'pendiente' as const,
        descripcion: 'Reparación de motor',
        total: 200000,
      };
      const result = safeValidate(OrdenTrabajoSchema, orden);
      expect(result.success).toBe(true);
    });
  });

  describe('RepuestoSchema', () => {
    it('debe validar un repuesto válido', () => {
      const repuesto = {
        codigo: 'REP-001',
        nombre: 'Filtro de aceite',
        descripcion: 'Filtro estándar',
        precio: 15000,
        stock: 10,
        stockMinimo: 5,
        categoria: 'Filtros',
        marca: 'Marca X',
        ubicacion: 'Estantería A1',
      };
      const result = safeValidate(RepuestoSchema, repuesto);
      expect(result.success).toBe(true);
    });

    it('debe rechazar un repuesto con stock negativo', () => {
      const repuesto = {
        codigo: 'REP-001',
        nombre: 'Filtro',
        precio: 15000,
        stock: -5, // Inválido
        stockMinimo: 5,
        categoria: 'Filtros',
      };
      const result = safeValidate(RepuestoSchema, repuesto);
      expect(result.success).toBe(false);
      expect(result.error).toContain('stock');
    });
  });

  describe('ServicioSchema', () => {
    it('debe validar un servicio válido', () => {
      const servicio = {
        nombre: 'Cambio de aceite',
        descripcion: 'Servicio estándar',
        precio: 25000,
        duracionEstimada: 30,
      };
      const result = safeValidate(ServicioSchema, servicio);
      expect(result.success).toBe(true);
    });

    it('debe rechazar un servicio con precio negativo', () => {
      const servicio = {
        nombre: 'Servicio',
        precio: -1000,
        duracionEstimada: 30,
      };
      const result = safeValidate(ServicioSchema, servicio);
      expect(result.success).toBe(false);
      expect(result.error).toContain('precio');
    });
  });

  describe('validateData', () => {
    it('debe lanzar error cuando la validación falla', () => {
      const clienteInvalido = {
        nombre: '', // Inválido
        rut: '12345678-9',
        telefono: '+56912345678',
      };
      expect(() => {
        validateData(ClienteSchema, clienteInvalido);
      }).toThrow();
    });
  });
});

