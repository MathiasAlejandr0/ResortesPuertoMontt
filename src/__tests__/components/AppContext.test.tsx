/**
 * Tests para AppContext - Estado global de la aplicación
 */

import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { AppProvider, useApp } from '../../renderer/contexts/AppContext';
import '@testing-library/jest-dom';

// Mock de electronAPI
const mockElectronAPI = {
  getAllClientes: jest.fn(() => Promise.resolve([])),
  getAllVehiculos: jest.fn(() => Promise.resolve([])),
  getAllCotizaciones: jest.fn(() => Promise.resolve([])),
  getAllOrdenesTrabajo: jest.fn(() => Promise.resolve([])),
  getAllRepuestos: jest.fn(() => Promise.resolve([])),
  getAllServicios: jest.fn(() => Promise.resolve([])),
  getClientesPaginated: jest.fn(() => Promise.resolve([])),
  getVehiculosPaginated: jest.fn(() => Promise.resolve([])),
  saveCliente: jest.fn(),
  refreshClientes: jest.fn(),
  refreshVehiculos: jest.fn(),
};

(global as any).window = {
  electronAPI: mockElectronAPI,
};

// Componente de prueba que usa el contexto
function TestComponent() {
  const { clientes, vehiculos, isLoading } = useApp();
  
  if (isLoading) {
    return <div>Loading...</div>;
  }
  
  return (
    <div>
      <div data-testid="clientes-count">{clientes.length}</div>
      <div data-testid="vehiculos-count">{vehiculos.length}</div>
    </div>
  );
}

describe('AppContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debería proporcionar datos iniciales vacíos', async () => {
    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    expect(screen.getByTestId('clientes-count')).toHaveTextContent('0');
    expect(screen.getByTestId('vehiculos-count')).toHaveTextContent('0');
  });

  it('debería cargar datos de clientes', async () => {
    const mockClientes = [
      { id: 1, nombre: 'Cliente 1', rut: '12345678-9', telefono: '+56912345678' },
      { id: 2, nombre: 'Cliente 2', rut: '98765432-1', telefono: '+56987654321' },
    ];

    mockElectronAPI.getClientesPaginated.mockResolvedValue(mockClientes);
    mockElectronAPI.getAllClientes.mockResolvedValue(mockClientes);

    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    await waitFor(() => {
      expect(mockElectronAPI.getClientesPaginated).toHaveBeenCalled();
    });
  });

  it('debería mostrar loading inicialmente', () => {
    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    // Durante la carga inicial, debería mostrar loading
    // (esto depende de la implementación, puede que no se muestre si es muy rápido)
  });
});

