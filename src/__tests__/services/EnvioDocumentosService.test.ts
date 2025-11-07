import { envioDocumentosService } from '../../renderer/services/EnvioDocumentosService';
import { Cotizacion, OrdenTrabajo, Cliente, Vehiculo } from '../../renderer/types/index';

// Mock de window.open
const mockOpen = jest.fn(() => {
  // Simular éxito al abrir ventana
  return {} as Window;
});

describe('EnvioDocumentosService', () => {
  const clienteMock: Cliente = {
    id: 1,
    nombre: 'Juan Pérez',
    rut: '12.345.678-9',
    telefono: '+56 9 1234 5678',
    email: 'juan.perez@example.com',
    direccion: 'Calle Test 123',
    activo: true,
  };

  const vehiculoMock: Vehiculo = {
    id: 1,
    clienteId: 1,
    marca: 'Toyota',
    modelo: 'Corolla',
    año: 2020,
    patente: 'ABCD12',
    color: 'Blanco',
    kilometraje: 50000,
    observaciones: '',
    activo: true,
  };

  const cotizacionMock: Cotizacion = {
    id: 1,
    numero: 'COT240001',
    clienteId: 1,
    vehiculoId: 1,
    fecha: new Date('2024-01-15').toISOString(),
    validaHasta: new Date('2024-02-15').toISOString(),
    estado: 'Pendiente',
    descripcion: 'Reparación de resortes',
    observaciones: 'Revisar estado general',
    total: 150000,
  };

  const ordenMock: OrdenTrabajo = {
    id: 1,
    numero: 'ORD240001',
    clienteId: 1,
    vehiculoId: 1,
    fechaIngreso: new Date('2024-01-15').toISOString(),
    fechaEntrega: new Date('2024-01-20').toISOString(),
    estado: 'En Proceso',
    descripcion: 'Reparación de resortes',
    observaciones: 'Trabajo urgente',
    total: 150000,
    prioridad: 'Alta',
    tecnicoAsignado: 'Carlos Mendez',
    kilometrajeEntrada: 50000,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockOpen.mockClear();
    mockOpen.mockReturnValue({} as Window);
    // Asegurar que window.open está correctamente mockeado
    (global.window as any).open = mockOpen;
  });

  describe('validarDatosCliente', () => {
    it('debería validar datos correctos para WhatsApp', () => {
      const resultado = envioDocumentosService.validarDatosCliente(clienteMock, 'whatsapp');
      
      expect(resultado.valido).toBe(true);
      expect(resultado.mensaje).toBe('Datos válidos para envío');
    });

    it('debería validar datos correctos para email', () => {
      const resultado = envioDocumentosService.validarDatosCliente(clienteMock, 'email');
      
      expect(resultado.valido).toBe(true);
    });

    it('debería rechazar cliente sin teléfono para WhatsApp', () => {
      const clienteSinTelefono = { ...clienteMock, telefono: '' };
      const resultado = envioDocumentosService.validarDatosCliente(clienteSinTelefono, 'whatsapp');
      
      expect(resultado.valido).toBe(false);
      expect(resultado.mensaje).toContain('teléfono');
    });

    it('debería rechazar cliente sin email para email', () => {
      const clienteSinEmail = { ...clienteMock, email: '' };
      const resultado = envioDocumentosService.validarDatosCliente(clienteSinEmail, 'email');
      
      expect(resultado.valido).toBe(false);
      expect(resultado.mensaje).toContain('email');
    });
  });

  describe('enviarCotizacionWhatsApp', () => {
    it('debería abrir WhatsApp con el mensaje formateado', async () => {
      const documento = {
        tipo: 'cotizacion' as const,
        documento: cotizacionMock,
        cliente: clienteMock,
        vehiculo: vehiculoMock,
      };

      const resultado = await envioDocumentosService.enviarCotizacionWhatsApp(
        documento,
        clienteMock.telefono!
      );

      expect(resultado.exito).toBe(true);
      expect(resultado.metodo).toBe('whatsapp');
      expect(mockOpen).toHaveBeenCalled();
      
      const urlLlamada = mockOpen.mock.calls[0][0];
      expect(urlLlamada).toContain('wa.me');
      expect(urlLlamada).toContain('text=');
      expect(decodeURIComponent(urlLlamada)).toContain(clienteMock.nombre);
      expect(decodeURIComponent(urlLlamada)).toContain(cotizacionMock.numero);
    });

    it('debería formatear correctamente el número de teléfono', async () => {
      const documento = {
        tipo: 'cotizacion' as const,
        documento: cotizacionMock,
        cliente: clienteMock,
        vehiculo: vehiculoMock,
      };

      await envioDocumentosService.enviarCotizacionWhatsApp(documento, '+56 9 1234-5678');

      const urlLlamada = mockOpen.mock.calls[0][0];
      expect(urlLlamada).toContain('56912345678');
    });

    it('debería manejar errores correctamente', async () => {
      mockOpen.mockImplementation(() => {
        throw new Error('Error al abrir ventana');
      });

      const documento = {
        tipo: 'cotizacion' as const,
        documento: cotizacionMock,
        cliente: clienteMock,
        vehiculo: vehiculoMock,
      };

      const resultado = await envioDocumentosService.enviarCotizacionWhatsApp(
        documento,
        clienteMock.telefono!
      );

      expect(resultado.exito).toBe(false);
      expect(resultado.mensaje).toContain('Error');
    });
  });

  describe('enviarOrdenWhatsApp', () => {
    it('debería abrir WhatsApp con el mensaje de orden formateado', async () => {
      const documento = {
        tipo: 'orden' as const,
        documento: ordenMock,
        cliente: clienteMock,
        vehiculo: vehiculoMock,
      };

      const resultado = await envioDocumentosService.enviarOrdenWhatsApp(
        documento,
        clienteMock.telefono!
      );

      expect(resultado.exito).toBe(true);
      expect(resultado.metodo).toBe('whatsapp');
      expect(mockOpen).toHaveBeenCalled();
      
      const urlLlamada = mockOpen.mock.calls[0][0];
      const textoDecodificado = decodeURIComponent(urlLlamada);
      expect(textoDecodificado).toContain(ordenMock.numero);
      expect(textoDecodificado).toContain(ordenMock.prioridad?.toUpperCase() || '');
    });
  });

  describe('enviarCotizacionEmail', () => {
    it('debería abrir cliente de email con datos correctos', async () => {
      const documento = {
        tipo: 'cotizacion' as const,
        documento: cotizacionMock,
        cliente: clienteMock,
        vehiculo: vehiculoMock,
      };

      const resultado = await envioDocumentosService.enviarCotizacionEmail(documento);

      expect(resultado.exito).toBe(true);
      expect(resultado.metodo).toBe('email');
      expect(mockOpen).toHaveBeenCalled();
      
      const urlLlamada = mockOpen.mock.calls[0][0];
      expect(urlLlamada).toContain('mailto:');
      expect(urlLlamada).toContain(clienteMock.email);
      expect(decodeURIComponent(urlLlamada)).toContain(cotizacionMock.numero);
    });

    it('debería manejar errores correctamente', async () => {
      mockOpen.mockImplementation(() => {
        throw new Error('Error al abrir email');
      });

      const documento = {
        tipo: 'cotizacion' as const,
        documento: cotizacionMock,
        cliente: clienteMock,
        vehiculo: vehiculoMock,
      };

      const resultado = await envioDocumentosService.enviarCotizacionEmail(documento);

      expect(resultado.exito).toBe(false);
      expect(resultado.mensaje).toContain('Error');
    });
  });

  describe('enviarOrdenEmail', () => {
    it('debería abrir cliente de email con orden de trabajo', async () => {
      const documento = {
        tipo: 'orden' as const,
        documento: ordenMock,
        cliente: clienteMock,
        vehiculo: vehiculoMock,
      };

      const resultado = await envioDocumentosService.enviarOrdenEmail(documento);

      expect(resultado.exito).toBe(true);
      expect(resultado.metodo).toBe('email');
      
      const urlLlamada = mockOpen.mock.calls[0][0];
      expect(decodeURIComponent(urlLlamada)).toContain(ordenMock.numero);
    });
  });
});

