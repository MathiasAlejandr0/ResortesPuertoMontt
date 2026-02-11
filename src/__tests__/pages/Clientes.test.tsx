/**
 * Tests para Clientes - Página de gestión de clientes
 */

import * as React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import ClientesPage from '../../renderer/pages/Clientes';
import { AppProvider } from '../../renderer/contexts/AppContext';

// Mock del contexto
const mockClientes = [
  { id: 1, nombre: 'Juan Pérez', rut: '12345678-9', telefono: '+56912345678', email: 'juan@email.com', activo: true },
  { id: 2, nombre: 'María González', rut: '98765432-1', telefono: '+56987654321', activo: true },
];

const mockVehiculos = [
  { id: 1, clienteId: 1, marca: 'Toyota', modelo: 'Corolla', año: 2020, patente: 'ABC123', activo: true },
];

const mockOrdenes = [
  { id: 1, clienteId: 1, total: 100000, fechaIngreso: new Date().toISOString() },
];

// Mock de electronAPI
(global as any).window = {
  electronAPI: {
    getAllClientes: jest.fn(() => Promise.resolve(mockClientes)),
    getAllVehiculos: jest.fn(() => Promise.resolve(mockVehiculos)),
    getAllOrdenesTrabajo: jest.fn(() => Promise.resolve(mockOrdenes)),
    getClientesPaginated: jest.fn(() => Promise.resolve({ data: mockClientes, total: mockClientes.length })),
    getVehiculosPaginated: jest.fn(() => Promise.resolve({ data: mockVehiculos, total: mockVehiculos.length })),
    deleteCliente: jest.fn(() => Promise.resolve(true)),
    saveCliente: jest.fn(() => Promise.resolve({ success: true })),
    on: jest.fn(),
  },
};

describe('ClientesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('debería renderizar la página de clientes', async () => {
    render(
      <AppProvider>
        <ClientesPage />
      </AppProvider>
    );

    await act(async () => {
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(screen.getAllByText(/clientes/i).length).toBeGreaterThan(0);
    }, { timeout: 3000 });
  });

  it('debería mostrar el botón de nuevo cliente', async () => {
    render(
      <AppProvider>
        <ClientesPage />
      </AppProvider>
    );

    await act(async () => {
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(screen.getByText(/nuevo cliente/i)).toBeInTheDocument();
    });
  });

  it('debería mostrar la barra de búsqueda', async () => {
    render(
      <AppProvider>
        <ClientesPage />
      </AppProvider>
    );

    await act(async () => {
      jest.runAllTimers();
    });

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(/buscar por nombre, email o teléfono/i);
      expect(searchInput).toBeInTheDocument();
    });
  });

  it('debería filtrar clientes al buscar', async () => {
    render(
      <AppProvider>
        <ClientesPage />
      </AppProvider>
    );

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(/buscar por nombre, email o teléfono/i);
      fireEvent.change(searchInput, { target: { value: 'Juan' } });
    });

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(/buscar por nombre, email o teléfono/i) as HTMLInputElement;
      expect(searchInput.value).toBe('Juan');
    });
  });

  it('debería mostrar estadísticas de clientes', async () => {
    render(
      <AppProvider>
        <ClientesPage />
      </AppProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/total clientes/i)).toBeInTheDocument();
    });
  });
});

