/**
 * Tests para EditarOrdenModal - Modal de edición de órdenes
 */

import * as React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import EditarOrdenModal from '../../renderer/components/EditarOrdenModal';
import { AppProvider } from '../../renderer/contexts/AppContext';
import { OrdenTrabajo } from '../../renderer/types';

// Mock de electronAPI
const mockElectronAPI = {
  getDetallesOrden: jest.fn(() => Promise.resolve([])),
};

(global as any).window = {
  electronAPI: mockElectronAPI,
};

describe('EditarOrdenModal', () => {
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

  const mockOnSave = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('no debería renderizar cuando está cerrado', () => {
    render(
      <AppProvider>
        <EditarOrdenModal
          isOpen={false}
          onClose={mockOnClose}
          onSave={mockOnSave}
          orden={mockOrden}
        />
      </AppProvider>
    );

    expect(screen.queryByText(/ORD-001/i)).not.toBeInTheDocument();
  });

  it('debería renderizar cuando está abierto', async () => {
    render(
      <AppProvider>
        <EditarOrdenModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          orden={mockOrden}
        />
      </AppProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/ORD-001/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('debería mostrar datos básicos de la orden', async () => {
    mockElectronAPI.getDetallesOrden.mockResolvedValue([
      { id: 1, ordenId: 1, tipo: 'servicio', cantidad: 1, precio: 50000 },
    ]);

    render(
      <AppProvider>
        <EditarOrdenModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          orden={mockOrden}
        />
      </AppProvider>
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('ORD-001')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('debería cerrar el modal al hacer clic en cerrar', async () => {
    render(
      <AppProvider>
        <EditarOrdenModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          orden={mockOrden}
        />
      </AppProvider>
    );

    await waitFor(() => {
      const closeBtn = screen.getByRole('button', { name: /cerrar/i }) || screen.queryByText(/×/);
      if (closeBtn) {
        fireEvent.click(closeBtn);
        expect(mockOnClose).toHaveBeenCalled();
      }
    });
  });
});

