/**
 * Tests para StockModal - Modal de actualización de stock
 */

import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import StockModal from '../../renderer/components/StockModal';
import { Repuesto } from '../../renderer/types';

describe('StockModal', () => {
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

  const mockOnClose = jest.fn();
  const mockOnConfirm = jest.fn();
  const mockSetCantidad = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('no debería renderizar cuando está cerrado', () => {
    render(
      <StockModal
        isOpen={false}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        repuesto={mockRepuesto}
        action="aumentar"
        cantidad={1}
        setCantidad={mockSetCantidad}
        isLoading={false}
      />
    );

    expect(screen.queryByText(/aumentar stock/i)).not.toBeInTheDocument();
  });

  it('debería renderizar modal de aumentar stock', () => {
    render(
      <StockModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        repuesto={mockRepuesto}
        action="aumentar"
        cantidad={1}
        setCantidad={mockSetCantidad}
        isLoading={false}
      />
    );

    expect(screen.getByText(/aumentar stock/i)).toBeInTheDocument();
    expect(screen.getByText('Repuesto Test')).toBeInTheDocument();
  });

  it('debería renderizar modal de reducir stock', () => {
    render(
      <StockModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        repuesto={mockRepuesto}
        action="reducir"
        cantidad={1}
        setCantidad={mockSetCantidad}
        isLoading={false}
      />
    );

    expect(screen.getByText(/reducir stock/i)).toBeInTheDocument();
  });

  it('debería mostrar stock actual y nuevo stock', () => {
    render(
      <StockModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        repuesto={mockRepuesto}
        action="aumentar"
        cantidad={5}
        setCantidad={mockSetCantidad}
        isLoading={false}
      />
    );

    expect(screen.getByText(/10/i)).toBeInTheDocument(); // Stock actual
    expect(screen.getByText(/15/i)).toBeInTheDocument(); // Nuevo stock (10 + 5)
  });

  it('debería cerrar el modal al hacer clic en cerrar', () => {
    render(
      <StockModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        repuesto={mockRepuesto}
        action="aumentar"
        cantidad={1}
        setCantidad={mockSetCantidad}
        isLoading={false}
      />
    );

    const closeBtn = screen.getByRole('button', { name: /cerrar/i }) || screen.queryByText(/×/);
    if (closeBtn) {
      fireEvent.click(closeBtn);
      expect(mockOnClose).toHaveBeenCalled();
      expect(mockSetCantidad).toHaveBeenCalledWith(1); // Resetea cantidad
    }
  });
});

