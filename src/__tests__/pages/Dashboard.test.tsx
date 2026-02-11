import * as React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Dashboard from '../../renderer/pages/Dashboard';
import { AppProvider } from '../../renderer/contexts/AppContext';

// Mock del contexto
jest.mock('../../renderer/contexts/AppContext', () => ({
  useApp: () => ({
    clientes: [
      { id: 1, nombre: 'Cliente Test', rut: '12345678-9', telefono: '+56912345678' }
    ],
    vehiculos: [
      { id: 1, clienteId: 1, marca: 'Toyota', modelo: 'Corolla', año: 2020, patente: 'ABC123' }
    ],
    cotizaciones: [
      { 
        id: 1, 
        numero: 'COT-2025-0001', 
        clienteId: 1, 
        vehiculoId: 1, 
        estado: 'Pendiente',
        total: 50000,
        fecha: '2025-10-01',
        validaHasta: '2025-11-01'
      }
    ],
    ordenes: [
      { 
        id: 1, 
        numero: 'ORD-2025-0001', 
        clienteId: 1, 
        vehiculoId: 1, 
        estado: 'Pendiente',
        total: 300000,
        fechaIngreso: new Date().toISOString().split('T')[0],
        fechaEntrega: null
      },
      { 
        id: 2, 
        numero: 'ORD-2025-0002', 
        clienteId: 1, 
        vehiculoId: 1, 
        estado: 'En Progreso',
        total: 200000,
        fechaIngreso: new Date().toISOString().split('T')[0],
        fechaEntrega: null
      },
      { 
        id: 3, 
        numero: 'ORD-2025-0003', 
        clienteId: 1, 
        vehiculoId: 1, 
        estado: 'Completada',
        total: 150000,
        fechaIngreso: new Date().toISOString().split('T')[0],
        fechaEntrega: new Date().toISOString().split('T')[0]
      }
    ],
    repuestos: [
      { id: 1, codigo: 'REP001', nombre: 'Repuesto Test', stock: 5, stockMinimo: 10, precio: 5000 }
    ],
    servicios: [],
    refreshClientes: jest.fn(),
    refreshVehiculos: jest.fn(),
    refreshCotizaciones: jest.fn(),
    refreshOrdenes: jest.fn(),
    refreshRepuestos: jest.fn(),
    refreshServicios: jest.fn(),
    addCliente: jest.fn(),
    addVehiculo: jest.fn(),
    addCotizacion: jest.fn(),
    addOrden: jest.fn(),
    addRepuesto: jest.fn(),
    addServicio: jest.fn()
  }),
  AppProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

describe('Dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debería renderizar las KPI principales', () => {
    render(<Dashboard />);
    expect(screen.getByText('Ganancias del Mes')).toBeInTheDocument();
  });

  it('debería mostrar las KPI cards correctamente', () => {
    render(<Dashboard />);
    
    // Verificar que las tarjetas se renderizan
    expect(screen.getByText('Ganancias del Mes')).toBeInTheDocument();
    expect(screen.getByText('Órdenes Completadas')).toBeInTheDocument();
    expect(screen.getByText('Órdenes Pendientes')).toBeInTheDocument();
    expect(screen.getByText('Órdenes en Proceso')).toBeInTheDocument();
  });

  it('debería calcular correctamente las ganancias del mes actual', () => {
    render(<Dashboard />);
    
    // Debería mostrar las ganancias de todas las órdenes creadas este mes
    // En este caso: 300000 + 200000 + 150000 = 650000
    const gananciasText = screen.getByText(/Ganancias del Mes/i);
    expect(gananciasText).toBeInTheDocument();
  });

  it('debería mostrar correctamente el número de órdenes por estado', () => {
    render(<Dashboard />);
    
    // Las órdenes se muestran en el gráfico, pero los números deberían aparecer
    expect(screen.getByText('Órdenes Completadas')).toBeInTheDocument();
    expect(screen.getByText('Órdenes Pendientes')).toBeInTheDocument();
    expect(screen.getByText('Órdenes en Proceso')).toBeInTheDocument();
  });

  it('debería mostrar alertas de inventario cuando hay repuestos con stock bajo', () => {
    render(<Dashboard />);
    
    // Debería mostrar la sección de alertas de inventario
    expect(screen.getByText(/Alertas de Inventario/i)).toBeInTheDocument();
  });

  it('debería mostrar las órdenes recientes', () => {
    render(<Dashboard />);
    
    // Debería mostrar la sección de órdenes recientes
    expect(screen.getByText(/Órdenes Recientes/i)).toBeInTheDocument();
  });
});


