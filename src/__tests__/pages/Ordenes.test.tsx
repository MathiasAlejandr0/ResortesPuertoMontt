/**
 * Tests para Ordenes - Página de gestión de órdenes de trabajo
 */

import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import OrdenesPage from '../../renderer/pages/Ordenes';
import { AppProvider } from '../../renderer/contexts/AppContext';

// Mock de electronAPI
(global as any).window = {
  electronAPI: {
    getAllOrdenesTrabajo: jest.fn(() => Promise.resolve([])),
    getAllClientes: jest.fn(() => Promise.resolve([])),
    getAllVehiculos: jest.fn(() => Promise.resolve([])),
    getDetallesOrden: jest.fn(() => Promise.resolve([])),
    saveOrdenTrabajo: jest.fn(() => Promise.resolve({ success: true })),
    deleteOrdenTrabajo: jest.fn(() => Promise.resolve(true)),
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

// Mock de servicios
jest.mock('../../renderer/services/EnvioDocumentosService', () => ({
  envioDocumentosService: {
    prepararEnvioWhatsApp: jest.fn(),
  },
}));

describe('OrdenesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debería renderizar la página de órdenes', async () => {
    render(
      <AppProvider>
        <OrdenesPage />
      </AppProvider>
    );

    await waitFor(() => {
      // Buscar el título o cualquier elemento característico
      const title = screen.queryByText(/órdenes/i) || screen.queryByText(/nueva orden/i);
      expect(title).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('debería mostrar el botón de nueva orden', async () => {
    render(
      <AppProvider>
        <OrdenesPage />
      </AppProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/nueva orden/i)).toBeInTheDocument();
    });
  });

  it('debería mostrar filtros por estado', async () => {
    render(
      <AppProvider>
        <OrdenesPage />
      </AppProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/estado/i)).toBeInTheDocument();
    });
  });
});

