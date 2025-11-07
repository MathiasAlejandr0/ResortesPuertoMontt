/**
 * Tests para VerOrdenModal - Modal de visualización de órdenes
 */

import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import VerOrdenModal from '../../renderer/components/VerOrdenModal';
import { AppProvider } from '../../renderer/contexts/AppContext';
import { OrdenTrabajo, Cliente, Vehiculo } from '../../renderer/types';

// Mock de electronAPI
const mockElectronAPI = {
  getDetallesOrden: jest.fn(() => Promise.resolve([])),
};

(global as any).window = {
  electronAPI: mockElectronAPI,
};

describe('VerOrdenModal', () => {
  const mockOrden: OrdenTrabajo = {
    id: 1,
    numero: 'ORD-001',
    clienteId: 1,
    vehiculoId: 1,
    fechaIngreso: new Date().toISOString(),
    estado: 'pendiente',
    total: 100000,
    descripcion: 'Reparación de frenos',
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
        <VerOrdenModal
          isOpen={false}
          onClose={() => {}}
          orden={mockOrden}
          cliente={mockCliente}
          vehiculo={mockVehiculo}
        />
      </AppProvider>
    );

    expect(screen.queryByText(/orden/i)).not.toBeInTheDocument();
  });

  it('debería renderizar cuando está abierto', async () => {
    render(
      <AppProvider>
        <VerOrdenModal
          isOpen={true}
          onClose={() => {}}
          orden={mockOrden}
          cliente={mockCliente}
          vehiculo={mockVehiculo}
        />
      </AppProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/ORD-001/i)).toBeInTheDocument();
    });
  });

  it('debería mostrar información del cliente', async () => {
    render(
      <AppProvider>
        <VerOrdenModal
          isOpen={true}
          onClose={() => {}}
          orden={mockOrden}
          cliente={mockCliente}
          vehiculo={mockVehiculo}
        />
      </AppProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
    });
  });

  it('debería cargar detalles de la orden', async () => {
    mockElectronAPI.getDetallesOrden.mockResolvedValue([
      { id: 1, ordenId: 1, tipo: 'servicio', cantidad: 1, precio: 50000 },
    ]);

    render(
      <AppProvider>
        <VerOrdenModal
          isOpen={true}
          onClose={() => {}}
          orden={mockOrden}
          cliente={mockCliente}
          vehiculo={mockVehiculo}
        />
      </AppProvider>
    );

    await waitFor(() => {
      expect(mockElectronAPI.getDetallesOrden).toHaveBeenCalledWith(1);
    });
  });
});

