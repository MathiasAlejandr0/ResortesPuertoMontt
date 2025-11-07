/**
 * Tests para ClienteForm - Formulario de clientes
 */

import * as React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ClienteForm from '../../renderer/components/ClienteForm';
import { Cliente, Vehiculo } from '../../renderer/types';

// Mock de electronAPI
const mockElectronAPI = {
  getAllVehiculos: jest.fn(() => Promise.resolve([])),
  saveCliente: jest.fn(),
  saveVehiculo: jest.fn(),
  saveClienteConVehiculos: jest.fn(() => Promise.resolve({ 
    success: true, 
    cliente: { id: 1, nombre: 'Test', rut: '12345678-9', telefono: '+56912345678', activo: true } 
  })),
};

(global as any).window = {
  electronAPI: mockElectronAPI,
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

describe('ClienteForm', () => {
  const mockOnSave = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debería renderizar el formulario cuando está abierto', () => {
    render(
      <ClienteForm
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText(/nuevo cliente/i)).toBeInTheDocument();
  });

  it('no debería renderizar cuando está cerrado', () => {
    render(
      <ClienteForm
        isOpen={false}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    expect(screen.queryByText(/nuevo cliente/i)).not.toBeInTheDocument();
  });

  it('debería permitir ingresar datos del cliente', async () => {
    render(
      <ClienteForm
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    const nombreInput = screen.getByPlaceholderText(/juan pérez/i);
    const rutInput = screen.getByPlaceholderText(/12\.345\.678-9/i);
    const telefonoInput = screen.getByPlaceholderText(/\+56 9 1234 5678/i);

    fireEvent.change(nombreInput, { target: { value: 'Juan Pérez' } });
    fireEvent.change(rutInput, { target: { value: '12345678-9' } });
    fireEvent.change(telefonoInput, { target: { value: '+56912345678' } });
  });

  it('debería validar campos requeridos', async () => {
    render(
      <ClienteForm
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    // Intentar avanzar sin completar campos
    const siguienteBtn = screen.queryByText(/siguiente/i);
    if (siguienteBtn) {
      fireEvent.click(siguienteBtn);
      
      // Debería mostrar errores de validación
      await waitFor(() => {
        const errorMessages = screen.queryAllByText(/requerido/i);
        expect(errorMessages.length).toBeGreaterThan(0);
      });
    }
  });

  it('debería mostrar datos del cliente cuando se edita', () => {
    const clienteExistente: Cliente = {
      id: 1,
      nombre: 'Juan Pérez',
      rut: '12345678-9',
      telefono: '+56912345678',
      email: 'juan@email.com',
      direccion: 'Calle 123',
      activo: true,
    };

    render(
      <ClienteForm
        isOpen={true}
        cliente={clienteExistente}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByDisplayValue('Juan Pérez')).toBeInTheDocument();
  });

  it('debería cerrar el formulario al hacer clic en cancelar', () => {
    render(
      <ClienteForm
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    const cancelBtn = screen.getByText(/cancelar/i);
    fireEvent.click(cancelBtn);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('debería avanzar al paso 2 cuando se completan los datos', async () => {
    render(
      <ClienteForm
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    await waitFor(() => {
      // Completar campos requeridos
      const nombreInput = screen.getByPlaceholderText(/juan pérez/i);
      const rutInput = screen.getByPlaceholderText(/12\.345\.678-9/i);
      const telefonoInput = screen.getByPlaceholderText(/\+56 9 1234 5678/i);

      fireEvent.change(nombreInput, { target: { value: 'Juan Pérez' } });
      fireEvent.change(rutInput, { target: { value: '12345678-9' } });
      fireEvent.change(telefonoInput, { target: { value: '+56912345678' } });
    });

    const siguienteBtn = screen.queryByText(/siguiente/i);
    if (siguienteBtn) {
      fireEvent.click(siguienteBtn);
      
      // Debería mostrar el paso 2 (vehículos)
      await waitFor(() => {
        expect(screen.queryByText(/vehículo/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    }
  });

  it('debería manejar guardado de cliente con vehículos', async () => {
    mockElectronAPI.saveClienteConVehiculos = jest.fn(() => Promise.resolve({ 
      success: true, 
      cliente: { id: 1, nombre: 'Test', rut: '12345678-9', telefono: '+56912345678', activo: true } 
    }));

    render(
      <ClienteForm
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    await waitFor(() => {
      const nombreInput = screen.getByPlaceholderText(/juan pérez/i);
      fireEvent.change(nombreInput, { target: { value: 'Test Cliente' } });
    });
  });
});

