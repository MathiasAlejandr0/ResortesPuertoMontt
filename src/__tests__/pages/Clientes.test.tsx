/**
 * Tests para Clientes - Página de gestión de clientes
 */

import * as React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
    deleteCliente: jest.fn(() => Promise.resolve(true)),
    saveCliente: jest.fn(() => Promise.resolve({ success: true })),
    on: jest.fn(),
  },
};

// Mock de notify
jest.mock('../../renderer/utils/cn', () => ({
  notify: {
    success: jest.fn(),
    error: jest.fn(),
  },
  confirmAction: jest.fn(() => Promise.resolve(true)),
  Logger: {
    log: jest.fn(),
    error: jest.fn(),
  },
}));

describe('ClientesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debería renderizar la página de clientes', async () => {
    render(
      <AppProvider>
        <ClientesPage />
      </AppProvider>
    );

    await waitFor(() => {
      // Buscar el título o cualquier elemento característico de la página
      const title = screen.queryByText(/clientes/i) || screen.queryByText(/gestiona la información/i);
      expect(title).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('debería mostrar el botón de nuevo cliente', async () => {
    render(
      <AppProvider>
        <ClientesPage />
      </AppProvider>
    );

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

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(/buscar cliente/i);
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
      const searchInput = screen.getByPlaceholderText(/buscar cliente/i);
      fireEvent.change(searchInput, { target: { value: 'Juan' } });
    });

    await waitFor(() => {
      expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
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

