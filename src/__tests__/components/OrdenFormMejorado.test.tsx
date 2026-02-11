/**
 * Tests para OrdenFormMejorado - Formulario de órdenes de trabajo
 */

import * as React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import OrdenFormMejorado from '../../renderer/components/OrdenFormMejorado';

// Mock del contexto
jest.mock('../../renderer/contexts/AppContext', () => ({
  useApp: () => ({
    clientes: [
      { id: 1, nombre: 'Cliente Test', rut: '12345678-9', telefono: '+56912345678' }
    ],
    vehiculos: [
      { id: 1, clienteId: 1, marca: 'Toyota', modelo: 'Corolla', año: 2020, patente: 'ABC123' }
    ],
    repuestos: [
      { id: 1, codigo: 'REP001', nombre: 'Repuesto 1', precio: 10000, stock: 10, categoria: 'General' }
    ],
    servicios: [
      { id: 1, nombre: 'Servicio 1', precio: 50000, duracionEstimada: 60 }
    ],
    addCliente: jest.fn(),
    addVehiculo: jest.fn(),
    refreshRepuestos: jest.fn(),
  }),
}));

// Mock de electronAPI
(global as any).window = {
  electronAPI: {
    getDetallesCotizacion: jest.fn(() => Promise.resolve([])),
  },
};

describe('OrdenFormMejorado', () => {
  const mockOnSave = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debería renderizar el formulario cuando está abierto', () => {
    render(
      <OrdenFormMejorado
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText(/orden de trabajo/i)).toBeInTheDocument();
  });

  it('no debería renderizar cuando está cerrado', () => {
    render(
      <OrdenFormMejorado
        isOpen={false}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    expect(screen.queryByText(/orden de trabajo/i)).not.toBeInTheDocument();
  });

  it('debería mostrar el paso de selección de cliente', async () => {
    render(
      <OrdenFormMejorado
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    await waitFor(() => {
      expect(screen.getAllByText(/seleccionar cliente/i).length).toBeGreaterThan(0);
    }, { timeout: 3000 });
  });

  it('debería mostrar la sección de cliente', async () => {
    render(
      <OrdenFormMejorado
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    await waitFor(() => {
      expect(screen.getAllByText(/seleccionar cliente/i).length).toBeGreaterThan(0);
    }, { timeout: 3000 });
  });

  it('debería cerrar el formulario al hacer clic en cancelar', async () => {
    render(
      <OrdenFormMejorado
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    await waitFor(() => {
      const cancelBtn = screen.getByText(/cancelar/i);
      fireEvent.click(cancelBtn);
      expect(mockOnClose).toHaveBeenCalled();
    }, { timeout: 3000 });
  });

  it('debería mostrar pasos del formulario', async () => {
    render(
      <OrdenFormMejorado
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/orden de trabajo/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});

