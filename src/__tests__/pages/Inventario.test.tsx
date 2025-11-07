/**
 * Tests para Inventario - Página de gestión de inventario
 */

import * as React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import InventarioPage from '../../renderer/pages/Inventario';
import { AppProvider } from '../../renderer/contexts/AppContext';

// Mock de electronAPI
(global as any).window = {
  electronAPI: {
    getAllRepuestos: jest.fn(() => Promise.resolve([])),
    searchRepuestos: jest.fn(() => Promise.resolve([])),
    saveRepuesto: jest.fn(() => Promise.resolve({ success: true })),
    deleteRepuesto: jest.fn(() => Promise.resolve(true)),
    procesarExcelRepuestos: jest.fn(() => Promise.resolve({ success: true })),
    on: jest.fn(),
  },
};

// Mock de notify
jest.mock('../../renderer/utils/cn', () => ({
  notify: {
    success: jest.fn(),
    error: jest.fn(),
  },
  Logger: {
    log: jest.fn(),
    error: jest.fn(),
  },
}));

describe('InventarioPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debería renderizar la página de inventario', async () => {
    render(
      <AppProvider>
        <InventarioPage />
      </AppProvider>
    );

    await waitFor(() => {
      // Buscar el título o cualquier elemento característico
      const title = screen.queryByText(/inventario/i) || screen.queryByText(/nuevo repuesto/i);
      expect(title).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('debería mostrar el botón de nuevo repuesto', async () => {
    render(
      <AppProvider>
        <InventarioPage />
      </AppProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/nuevo repuesto/i)).toBeInTheDocument();
    });
  });

  it('debería mostrar la barra de búsqueda', async () => {
    render(
      <AppProvider>
        <InventarioPage />
      </AppProvider>
    );

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(/buscar repuesto/i);
      expect(searchInput).toBeInTheDocument();
    });
  });

  it('debería mostrar filtros por categoría', async () => {
    render(
      <AppProvider>
        <InventarioPage />
      </AppProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/categoría/i)).toBeInTheDocument();
    });
  });
});

