/**
 * Tests para CotizacionFormMejorado - Formulario de cotizaciones
 */

import * as React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CotizacionFormMejorado from '../../renderer/components/CotizacionFormMejorado';

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

describe('CotizacionFormMejorado', () => {
  const mockOnSave = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debería renderizar el formulario cuando está abierto', () => {
    render(
      <CotizacionFormMejorado
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText(/cotización/i)).toBeInTheDocument();
  });

  it('no debería renderizar cuando está cerrado', () => {
    render(
      <CotizacionFormMejorado
        isOpen={false}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    expect(screen.queryByText(/cotización/i)).not.toBeInTheDocument();
  });

  it('debería mostrar el paso de selección de cliente', async () => {
    render(
      <CotizacionFormMejorado
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
      <CotizacionFormMejorado
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
      <CotizacionFormMejorado
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/cotización/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});

