/**
 * Tests para EditarRepuestoModal - Modal de edición de repuestos
 */

import * as React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import EditarRepuestoModal from '../../renderer/components/EditarRepuestoModal';
import { Repuesto } from '../../renderer/types';

describe('EditarRepuestoModal', () => {
  const mockRepuesto: Repuesto = {
    id: 1,
    codigo: 'REP001',
    nombre: 'Repuesto Test',
    precio: 10000,
    stock: 10,
    stockMinimo: 5,
    categoria: 'General',
    activo: true,
  };

  const mockOnSave = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('no debería renderizar cuando está cerrado', () => {
    render(
      <EditarRepuestoModal
        isOpen={false}
        onClose={mockOnClose}
        onSave={mockOnSave}
        repuesto={mockRepuesto}
      />
    );

    expect(screen.queryByText(/repuesto test/i)).not.toBeInTheDocument();
  });

  it('debería renderizar cuando está abierto', async () => {
    render(
      <EditarRepuestoModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        repuesto={mockRepuesto}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('REP001')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Repuesto Test')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('debería mostrar datos del repuesto', async () => {
    render(
      <EditarRepuestoModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        repuesto={mockRepuesto}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('10000')).toBeInTheDocument();
      expect(screen.getByDisplayValue('10')).toBeInTheDocument();
    });
  });

  it('debería cerrar el modal al hacer clic en cancelar', async () => {
    render(
      <EditarRepuestoModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        repuesto={mockRepuesto}
      />
    );

    await waitFor(() => {
      const cancelBtn = screen.getByText(/cancelar/i);
      fireEvent.click(cancelBtn);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});

