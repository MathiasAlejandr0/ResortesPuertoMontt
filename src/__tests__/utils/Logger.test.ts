// Usar el mock existente que evita problemas con import.meta
jest.mock('../../renderer/utils/cn', () => require('../__mocks__/cn'));

import { Logger } from '../../renderer/utils/cn';

describe('Logger', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleInfoSpy: jest.SpyInstance;

  beforeEach(() => {
    // Crear spies después de importar el mock
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Logger.log', () => {
    it('debería llamar a console.log en modo desarrollo', () => {
      Logger.log('Test message', { data: 'test' });
      
      expect(consoleLogSpy).toHaveBeenCalledWith('Test message', { data: 'test' });
    });

    it('debería aceptar múltiples argumentos', () => {
      Logger.log('Arg1', 'Arg2', 'Arg3');
      
      expect(consoleLogSpy).toHaveBeenCalledWith('Arg1', 'Arg2', 'Arg3');
    });
  });

  describe('Logger.error', () => {
    it('debería llamar a console.error siempre (incluso en producción)', () => {
      Logger.error('Error message', new Error('Test error'));
      
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error message', expect.any(Error));
    });

    it('debería aceptar múltiples argumentos', () => {
      Logger.error('Error', 'Details', { code: 500 });
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error', 'Details', { code: 500 });
    });
  });

  describe('Logger.warn', () => {
    it('debería llamar a console.warn en modo desarrollo', () => {
      Logger.warn('Warning message');
      
      expect(consoleWarnSpy).toHaveBeenCalledWith('Warning message');
    });
  });

  describe('Logger.info', () => {
    it('debería llamar a console.info en modo desarrollo', () => {
      Logger.info('Info message');
      
      expect(consoleInfoSpy).toHaveBeenCalledWith('Info message');
    });
  });
});

