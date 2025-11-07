/**
 * Tests para Cotizaciones - Página de gestión de cotizaciones
 */

import * as React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CotizacionesPage from '../../renderer/pages/Cotizaciones';
import { AppProvider } from '../../renderer/contexts/AppContext';

// Mock de electronAPI
(global as any).window = {
  electronAPI: {
    getAllCotizaciones: jest.fn(() => Promise.resolve([])),
    getAllClientes: jest.fn(() => Promise.resolve([])),
    getAllVehiculos: jest.fn(() => Promise.resolve([])),
    getDetallesCotizacion: jest.fn(() => Promise.resolve([])),
    saveCotizacion: jest.fn(() => Promise.resolve({ success: true })),
    deleteCotizacion: jest.fn(() => Promise.resolve(true)),
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

describe('CotizacionesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debería renderizar la página de cotizaciones', async () => {
    render(
      <AppProvider>
        <CotizacionesPage />
      </AppProvider>
    );

    await waitFor(() => {
      // Buscar el título o cualquier elemento característico
      const title = screen.queryByText(/cotizaciones/i) || screen.queryByText(/nueva cotización/i);
      expect(title).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('debería mostrar el botón de nueva cotización', async () => {
    render(
      <AppProvider>
        <CotizacionesPage />
      </AppProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/nueva cotización/i)).toBeInTheDocument();
    });
  });

  it('debería mostrar filtros por estado', async () => {
    render(
      <AppProvider>
        <CotizacionesPage />
      </AppProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/estado/i)).toBeInTheDocument();
    });
  });
});

