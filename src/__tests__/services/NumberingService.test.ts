import { NumberingService } from '../../renderer/services/NumberingService';

// Mock de window.electronAPI
const mockElectronAPI = {
  getAllCotizaciones: jest.fn(),
  getAllOrdenesTrabajo: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  (window as any).electronAPI = mockElectronAPI;
});

describe('NumberingService', () => {
  describe('getNextCotizacionNumber', () => {
    it('debería generar el primer número de cotización del año', async () => {
      mockElectronAPI.getAllCotizaciones.mockResolvedValue([]);
      const yearSuffix = new Date().getFullYear().toString().slice(-2);
      
      const numero = await NumberingService.getNextCotizacionNumber();
      
      expect(numero).toBe(`COT${yearSuffix}0001`);
    });

    it('debería generar el siguiente número secuencial', async () => {
      const yearSuffix = new Date().getFullYear().toString().slice(-2);
      mockElectronAPI.getAllCotizaciones.mockResolvedValue([
        { numero: `COT${yearSuffix}0001` },
        { numero: `COT${yearSuffix}0002` },
        { numero: `COT${yearSuffix}0003` },
      ]);
      
      const numero = await NumberingService.getNextCotizacionNumber();
      
      expect(numero).toBe(`COT${yearSuffix}0004`);
    });

    it('debería ignorar cotizaciones de años anteriores', async () => {
      const yearSuffix = new Date().getFullYear().toString().slice(-2);
      const previousYear = (new Date().getFullYear() - 1).toString().slice(-2);
      mockElectronAPI.getAllCotizaciones.mockResolvedValue([
        { numero: `COT${previousYear}9999` },
        { numero: `COT${yearSuffix}0001` },
      ]);
      
      const numero = await NumberingService.getNextCotizacionNumber();
      
      expect(numero).toBe(`COT${yearSuffix}0002`);
    });

    it('debería manejar errores y generar un número fallback', async () => {
      mockElectronAPI.getAllCotizaciones.mockRejectedValue(new Error('Database error'));
      
      const numero = await NumberingService.getNextCotizacionNumber();
      
      expect(numero).toMatch(/^COT\d{2}\d{4}$/);
      expect(numero).toContain('COT');
    });

    it('debería encontrar el número máximo correctamente', async () => {
      const yearSuffix = new Date().getFullYear().toString().slice(-2);
      mockElectronAPI.getAllCotizaciones.mockResolvedValue([
        { numero: `COT${yearSuffix}0001` },
        { numero: `COT${yearSuffix}0005` },
        { numero: `COT${yearSuffix}0003` },
        { numero: `COT${yearSuffix}0010` },
      ]);
      
      const numero = await NumberingService.getNextCotizacionNumber();
      
      expect(numero).toBe(`COT${yearSuffix}0011`);
    });
  });

  describe('getNextOrdenNumber', () => {
    it('debería generar el primer número de orden del año', async () => {
      mockElectronAPI.getAllOrdenesTrabajo.mockResolvedValue([]);
      const yearSuffix = new Date().getFullYear().toString().slice(-2);
      
      const numero = await NumberingService.getNextOrdenNumber();
      
      expect(numero).toBe(`ORD${yearSuffix}0001`);
    });

    it('debería generar el siguiente número secuencial de orden', async () => {
      const yearSuffix = new Date().getFullYear().toString().slice(-2);
      mockElectronAPI.getAllOrdenesTrabajo.mockResolvedValue([
        { numero: `ORD${yearSuffix}0001` },
        { numero: `ORD${yearSuffix}0025` },
      ]);
      
      const numero = await NumberingService.getNextOrdenNumber();
      
      expect(numero).toBe(`ORD${yearSuffix}0026`);
    });

    it('debería manejar errores y generar un número fallback', async () => {
      mockElectronAPI.getAllOrdenesTrabajo.mockRejectedValue(new Error('Database error'));
      
      const numero = await NumberingService.getNextOrdenNumber();
      
      expect(numero).toMatch(/^ORD\d{2}\d{4}$/);
      expect(numero).toContain('ORD');
    });
  });

  describe('validateNumberExists', () => {
    it('debería retornar true si el número de cotización existe', async () => {
      mockElectronAPI.getAllCotizaciones.mockResolvedValue([
        { numero: 'COT240001' },
        { numero: 'COT240002' },
      ]);
      
      const existe = await NumberingService.validateNumberExists('COT240001', 'cotizacion');
      
      expect(existe).toBe(true);
    });

    it('debería retornar false si el número de cotización no existe', async () => {
      mockElectronAPI.getAllCotizaciones.mockResolvedValue([
        { numero: 'COT240001' },
        { numero: 'COT240002' },
      ]);
      
      const existe = await NumberingService.validateNumberExists('COT249999', 'cotizacion');
      
      expect(existe).toBe(false);
    });

    it('debería retornar true si el número de orden existe', async () => {
      mockElectronAPI.getAllOrdenesTrabajo.mockResolvedValue([
        { numero: 'ORD240001' },
        { numero: 'ORD240002' },
      ]);
      
      const existe = await NumberingService.validateNumberExists('ORD240001', 'orden');
      
      expect(existe).toBe(true);
    });

    it('debería retornar false si el número de orden no existe', async () => {
      mockElectronAPI.getAllOrdenesTrabajo.mockResolvedValue([
        { numero: 'ORD240001' },
      ]);
      
      const existe = await NumberingService.validateNumberExists('ORD249999', 'orden');
      
      expect(existe).toBe(false);
    });

    it('debería retornar false en caso de error', async () => {
      mockElectronAPI.getAllCotizaciones.mockRejectedValue(new Error('Database error'));
      
      const existe = await NumberingService.validateNumberExists('COT240001', 'cotizacion');
      
      expect(existe).toBe(false);
    });
  });

  describe('getNumberingStats', () => {
    it('debería retornar estadísticas correctas para el año actual', async () => {
      const yearSuffix = new Date().getFullYear().toString().slice(-2);
      mockElectronAPI.getAllCotizaciones.mockResolvedValue([
        { numero: `COT${yearSuffix}0001` },
        { numero: `COT${yearSuffix}0002` },
      ]);
      mockElectronAPI.getAllOrdenesTrabajo.mockResolvedValue([
        { numero: `ORD${yearSuffix}0001` },
      ]);
      
      const stats = await NumberingService.getNumberingStats();
      
      expect(stats.cotizacionesThisYear).toBe(2);
      expect(stats.ordenesThisYear).toBe(1);
      expect(stats.lastCotizacionNumber).toBe(`COT${yearSuffix}0002`);
      expect(stats.lastOrdenNumber).toBe(`ORD${yearSuffix}0001`);
    });

    it('debería ignorar documentos de años anteriores', async () => {
      const yearSuffix = new Date().getFullYear().toString().slice(-2);
      const previousYear = (new Date().getFullYear() - 1).toString().slice(-2);
      mockElectronAPI.getAllCotizaciones.mockResolvedValue([
        { numero: `COT${previousYear}9999` },
        { numero: `COT${yearSuffix}0001` },
      ]);
      mockElectronAPI.getAllOrdenesTrabajo.mockResolvedValue([
        { numero: `ORD${previousYear}9999` },
      ]);
      
      const stats = await NumberingService.getNumberingStats();
      
      expect(stats.cotizacionesThisYear).toBe(1);
      expect(stats.ordenesThisYear).toBe(0);
      expect(stats.lastCotizacionNumber).toBe(`COT${yearSuffix}0001`);
      expect(stats.lastOrdenNumber).toBeNull();
    });

    it('debería retornar null para últimos números si no hay documentos', async () => {
      mockElectronAPI.getAllCotizaciones.mockResolvedValue([]);
      mockElectronAPI.getAllOrdenesTrabajo.mockResolvedValue([]);
      
      const stats = await NumberingService.getNumberingStats();
      
      expect(stats.cotizacionesThisYear).toBe(0);
      expect(stats.ordenesThisYear).toBe(0);
      expect(stats.lastCotizacionNumber).toBeNull();
      expect(stats.lastOrdenNumber).toBeNull();
    });

    it('debería manejar errores y retornar valores por defecto', async () => {
      mockElectronAPI.getAllCotizaciones.mockRejectedValue(new Error('Database error'));
      mockElectronAPI.getAllOrdenesTrabajo.mockRejectedValue(new Error('Database error'));
      
      const stats = await NumberingService.getNumberingStats();
      
      expect(stats.cotizacionesThisYear).toBe(0);
      expect(stats.ordenesThisYear).toBe(0);
      expect(stats.lastCotizacionNumber).toBeNull();
      expect(stats.lastOrdenNumber).toBeNull();
    });
  });
});

