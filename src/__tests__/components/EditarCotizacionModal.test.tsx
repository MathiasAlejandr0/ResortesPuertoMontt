/**
 * Tests para EditarCotizacionModal - Modal de edición de cotizaciones
 */

import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import EditarCotizacionModal from '../../renderer/components/EditarCotizacionModal';
import { AppProvider } from '../../renderer/contexts/AppContext';
import { Cotizacion } from '../../renderer/types';

// Mock de electronAPI
const mockElectronAPI = {
  getDetallesCotizacion: jest.fn(() => Promise.resolve([])),
};

(global as any).window = {
  electronAPI: mockElectronAPI,
};

describe('EditarCotizacionModal', () => {
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

  const mockOnSave = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('no debería renderizar cuando está cerrado', () => {
    render(
      <AppProvider>
        <EditarCotizacionModal
          isOpen={false}
          onClose={mockOnClose}
          onSave={mockOnSave}
          cotizacion={mockCotizacion}
        />
      </AppProvider>
    );

    expect(screen.queryByText(/COT-001/i)).not.toBeInTheDocument();
  });

  it('debería renderizar cuando está abierto', async () => {
    render(
      <AppProvider>
        <EditarCotizacionModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          cotizacion={mockCotizacion}
        />
      </AppProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/COT-001/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('debería mostrar datos básicos de la cotización', async () => {
    mockElectronAPI.getDetallesCotizacion.mockResolvedValue([
      { id: 1, cotizacionId: 1, tipo: 'repuesto', cantidad: 2, precio: 50000 },
    ]);

    render(
      <AppProvider>
        <EditarCotizacionModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          cotizacion={mockCotizacion}
        />
      </AppProvider>
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('COT-001')).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});

