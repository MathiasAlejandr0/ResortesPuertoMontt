import '@testing-library/jest-dom';

// Mock de window.electronAPI para las pruebas
global.window = global.window || {};
(global.window as any).electronAPI = {
  getAllCotizaciones: jest.fn(),
  getAllOrdenesTrabajo: jest.fn(),
  getAllClientes: jest.fn(),
  getAllVehiculos: jest.fn(),
  getAllRepuestos: jest.fn(),
  getAllServicios: jest.fn(),
  saveCliente: jest.fn(),
  saveVehiculo: jest.fn(),
  saveCotizacion: jest.fn(),
  saveOrdenTrabajo: jest.fn(),
  deleteCliente: jest.fn(),
  deleteVehiculo: jest.fn(),
  deleteCotizacion: jest.fn(),
  deleteOrdenTrabajo: jest.fn(),
  getDetallesCotizacion: jest.fn(),
  saveDetalleCotizacion: jest.fn(),
  getDetallesOrden: jest.fn(),
  saveDetalleOrden: jest.fn(),
  getAllConfiguracion: jest.fn(),
  saveConfiguracion: jest.fn(),
  createBackup: jest.fn(),
  restoreBackup: jest.fn(),
  deleteBackup: jest.fn(),
};

// Mock de window.open
global.window.open = jest.fn();

// Mock de window.confirm
global.window.confirm = jest.fn(() => true);

// Mock de ResizeObserver (usado por Recharts)
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

(global as any).ResizeObserver = MockResizeObserver;
