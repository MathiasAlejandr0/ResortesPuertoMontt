/**
 * Tests para VerCotizacionModal - Modal de visualización de cotizaciones
 */

import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import VerCotizacionModal from '../../renderer/components/VerCotizacionModal';
import { AppProvider } from '../../renderer/contexts/AppContext';
import { Cotizacion, Cliente, Vehiculo } from '../../renderer/types';

// Mock de electronAPI
const mockElectronAPI = {
  getDetallesCotizacion: jest.fn(() => Promise.resolve([])),
};

(global as any).window = {
  electronAPI: mockElectronAPI,
};

describe('VerCotizacionModal', () => {
  const mockCotizacion: Cotizacion = {
    id: 1,
    numero: 'COT-001',
    clienteId: 1,
    vehiculoId: 1,
    fecha: new Date().toISOString(),
    estado: 'pendiente',
    total: 150000,
    descripcion: 'Reparación completa',
  };

  const mockCliente: Cliente = {
    id: 1,
    nombre: 'Juan Pérez',
    rut: '12345678-9',
    telefono: '+56912345678',
    activo: true,
  };

  const mockVehiculo: Vehiculo = {
    id: 1,
    clienteId: 1,
    marca: 'Toyota',
    modelo: 'Corolla',
    año: 2020,
    patente: 'ABC123',
    activo: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('no debería renderizar cuando está cerrado', () => {
    render(
      <AppProvider>
        <VerCotizacionModal
          isOpen={false}
          onClose={() => {}}
          cotizacion={mockCotizacion}
          cliente={mockCliente}
          vehiculo={mockVehiculo}
        />
      </AppProvider>
    );

    expect(screen.queryByText(/cotización/i)).not.toBeInTheDocument();
  });

  it('debería renderizar cuando está abierto', async () => {
    render(
      <AppProvider>
        <VerCotizacionModal
          isOpen={true}
          onClose={() => {}}
          cotizacion={mockCotizacion}
          cliente={mockCliente}
          vehiculo={mockVehiculo}
        />
      </AppProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/COT-001/i)).toBeInTheDocument();
    });
  });

  it('debería mostrar información del cliente', async () => {
    render(
      <AppProvider>
        <VerCotizacionModal
          isOpen={true}
          onClose={() => {}}
          cotizacion={mockCotizacion}
          cliente={mockCliente}
          vehiculo={mockVehiculo}
        />
      </AppProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
    });
  });

  it('debería mostrar los datos básicos de la cotización', async () => {
    mockElectronAPI.getDetallesCotizacion.mockResolvedValue([
      { id: 1, cotizacionId: 1, tipo: 'repuesto', cantidad: 2, precio: 50000 },
    ]);

    render(
      <AppProvider>
        <VerCotizacionModal
          isOpen={true}
          onClose={() => {}}
          cotizacion={mockCotizacion}
          cliente={mockCliente}
          vehiculo={mockVehiculo}
        />
      </AppProvider>
    );

    await waitFor(() => {
      expect(screen.getAllByText(/cotización/i).length).toBeGreaterThan(0);
    });
  });
});

