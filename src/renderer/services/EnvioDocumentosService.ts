import { Cotizacion, OrdenTrabajo, Cliente, Vehiculo } from '../types';

export interface DocumentoParaEnviar {
  tipo: 'cotizacion' | 'orden';
  documento: Cotizacion | OrdenTrabajo;
  cliente: Cliente;
  vehiculo: Vehiculo;
}

export interface ResultadoEnvio {
  exito: boolean;
  mensaje: string;
  metodo: 'whatsapp' | 'email';
}

export interface MensajesPredefinidos {
  whatsappCotizacion: string;
  whatsappOrden: string;
  emailCotizacion: string;
  emailOrden: string;
  nombreTaller: string;
  telefonoTaller: string;
  emailTaller: string;
}

class EnvioDocumentosService {
  
  /**
   * Envía una cotización por WhatsApp con número de teléfono específico
   */
  async enviarCotizacionWhatsApp(documento: DocumentoParaEnviar, telefono: string, mensajesPredefinidos?: MensajesPredefinidos): Promise<ResultadoEnvio> {
    try {
      const cotizacion = documento.documento as Cotizacion;
      const cliente = documento.cliente;
      const vehiculo = documento.vehiculo;
      
      // Generar mensaje para WhatsApp usando plantilla predefinida
      const mensaje = this.generarMensajeCotizacion(cotizacion, cliente, vehiculo, mensajesPredefinidos);
      
      // Formatear número de teléfono (remover caracteres especiales)
      const telefonoFormateado = telefono.replace(/[^\d]/g, '');
      
      // Crear URL de WhatsApp
      const urlWhatsApp = `https://wa.me/${telefonoFormateado}?text=${encodeURIComponent(mensaje)}`;
      
      // Abrir WhatsApp en el navegador
      window.open(urlWhatsApp, '_blank');
      
      return {
        exito: true,
        mensaje: 'WhatsApp abierto con el mensaje de cotización',
        metodo: 'whatsapp'
      };
      
    } catch (error) {
      console.error('Error enviando cotización por WhatsApp:', error);
      return {
        exito: false,
        mensaje: 'Error al enviar por WhatsApp',
        metodo: 'whatsapp'
      };
    }
  }

  /**
   * Envía una orden de trabajo por WhatsApp con número de teléfono específico
   */
  async enviarOrdenWhatsApp(documento: DocumentoParaEnviar, telefono: string, mensajesPredefinidos?: MensajesPredefinidos): Promise<ResultadoEnvio> {
    try {
      const orden = documento.documento as OrdenTrabajo;
      const cliente = documento.cliente;
      const vehiculo = documento.vehiculo;
      
      // Generar mensaje para WhatsApp usando plantilla predefinida
      const mensaje = this.generarMensajeOrden(orden, cliente, vehiculo, mensajesPredefinidos);
      
      // Formatear número de teléfono
      const telefonoFormateado = telefono.replace(/[^\d]/g, '');
      
      // Crear URL de WhatsApp
      const urlWhatsApp = `https://wa.me/${telefonoFormateado}?text=${encodeURIComponent(mensaje)}`;
      
      // Abrir WhatsApp en el navegador
      window.open(urlWhatsApp, '_blank');
      
      return {
        exito: true,
        mensaje: 'WhatsApp abierto con el mensaje de orden de trabajo',
        metodo: 'whatsapp'
      };
      
    } catch (error) {
      console.error('Error enviando orden por WhatsApp:', error);
      return {
        exito: false,
        mensaje: 'Error al enviar por WhatsApp',
        metodo: 'whatsapp'
      };
    }
  }

  /**
   * Envía una cotización por Email
   */
  async enviarCotizacionEmail(documento: DocumentoParaEnviar): Promise<ResultadoEnvio> {
    try {
      const cotizacion = documento.documento as Cotizacion;
      const cliente = documento.cliente;
      const vehiculo = documento.vehiculo;
      
      // Generar contenido del email
      const asunto = `Cotización ${cotizacion.numero} - Resortes Puerto Montt`;
      const cuerpo = this.generarContenidoEmailCotizacion(cotizacion, cliente, vehiculo);
      
      // Crear URL de email
      const emailUrl = `mailto:${cliente.email}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
      
      // Abrir cliente de email
      window.open(emailUrl, '_blank');
      
      return {
        exito: true,
        mensaje: 'Cliente de email abierto con la cotización',
        metodo: 'email'
      };
      
    } catch (error) {
      console.error('Error enviando cotización por email:', error);
      return {
        exito: false,
        mensaje: 'Error al enviar por email',
        metodo: 'email'
      };
    }
  }

  /**
   * Envía una orden de trabajo por Email
   */
  async enviarOrdenEmail(documento: DocumentoParaEnviar): Promise<ResultadoEnvio> {
    try {
      const orden = documento.documento as OrdenTrabajo;
      const cliente = documento.cliente;
      const vehiculo = documento.vehiculo;
      
      // Generar contenido del email
      const asunto = `Orden de Trabajo ${orden.numero} - Resortes Puerto Montt`;
      const cuerpo = this.generarContenidoEmailOrden(orden, cliente, vehiculo);
      
      // Crear URL de email
      const emailUrl = `mailto:${cliente.email}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
      
      // Abrir cliente de email
      window.open(emailUrl, '_blank');
      
      return {
        exito: true,
        mensaje: 'Cliente de email abierto con la orden de trabajo',
        metodo: 'email'
      };
      
    } catch (error) {
      console.error('Error enviando orden por email:', error);
      return {
        exito: false,
        mensaje: 'Error al enviar por email',
        metodo: 'email'
      };
    }
  }

  /**
   * Genera el mensaje de WhatsApp para cotización usando plantilla predefinida
   */
  private generarMensajeCotizacion(cotizacion: Cotizacion, cliente: Cliente, vehiculo: Vehiculo, mensajesPredefinidos?: MensajesPredefinidos): string {
    const plantilla = mensajesPredefinidos?.whatsappCotizacion || `🏢 *{NOMBRE_TALLER}*

Hola {NOMBRE_CLIENTE},

Te enviamos la cotización solicitada:

📋 *COTIZACIÓN {NUMERO_COTIZACION}*
📅 Fecha: {FECHA_COTIZACION}
📅 Válida hasta: {FECHA_VALIDA}

🚗 *VEHÍCULO:*
{MARCA_VEHICULO} {MODELO_VEHICULO} {AÑO_VEHICULO}
Patente: {PATENTE_VEHICULO}

📝 *DESCRIPCIÓN:*
{DESCRIPCION_COTIZACION}

💰 *TOTAL: $'{TOTAL_COTIZACION}'*

{OBSERVACIONES_COTIZACION}

¿Te interesa proceder con esta cotización?

Saludos cordiales,
Equipo {NOMBRE_TALLER}
📞 {TELEFONO_TALLER}`;

    return this.reemplazarVariables(plantilla, {
      NOMBRE_TALLER: mensajesPredefinidos?.nombreTaller || 'RESORTES PUERTO MONTT',
      NOMBRE_CLIENTE: cliente.nombre,
      NUMERO_COTIZACION: cotizacion.numero,
      FECHA_COTIZACION: cotizacion.fecha ? new Date(cotizacion.fecha).toLocaleDateString('es-CL') : 'No especificada',
      FECHA_VALIDA: cotizacion.validaHasta ? new Date(cotizacion.validaHasta).toLocaleDateString('es-CL') : 'No especificada',
      MARCA_VEHICULO: vehiculo.marca,
      MODELO_VEHICULO: vehiculo.modelo,
      AÑO_VEHICULO: vehiculo.año?.toString() || '',
      PATENTE_VEHICULO: vehiculo.patente,
      DESCRIPCION_COTIZACION: cotizacion.descripcion,
      TOTAL_COTIZACION: cotizacion.total?.toLocaleString('es-CL') || '0',
      OBSERVACIONES_COTIZACION: cotizacion.observaciones ? `📌 *OBSERVACIONES:*\n${cotizacion.observaciones}` : '',
      TELEFONO_TALLER: mensajesPredefinidos?.telefonoTaller || '+56 9 1234 5678',
      EMAIL_TALLER: mensajesPredefinidos?.emailTaller || 'info@resortespuertomontt.cl'
    });
  }

  /**
   * Genera el mensaje de WhatsApp para orden de trabajo usando plantilla predefinida
   */
  private generarMensajeOrden(orden: OrdenTrabajo, cliente: Cliente, vehiculo: Vehiculo, mensajesPredefinidos?: MensajesPredefinidos): string {
    const plantilla = mensajesPredefinidos?.whatsappOrden || `🏢 *{NOMBRE_TALLER}*

Hola {NOMBRE_CLIENTE},

Te informamos sobre tu orden de trabajo:

🔧 *ORDEN DE TRABAJO {NUMERO_ORDEN}*
📅 Fecha de ingreso: {FECHA_INGRESO}
{FECHA_ENTREGA}

🚗 *VEHÍCULO:*
{MARCA_VEHICULO} {MODELO_VEHICULO} {AÑO_VEHICULO}
Patente: {PATENTE_VEHICULO}
{KILOMETRAJE_ENTRADA}

📝 *DESCRIPCIÓN DEL TRABAJO:*
{DESCRIPCION_ORDEN}

⚡ *PRIORIDAD:* {PRIORIDAD_ORDEN}
{TECNICO_ASIGNADO}

💰 *TOTAL ESTIMADO: $'{TOTAL_ORDEN}'*

{OBSERVACIONES_ORDEN}

Te mantendremos informado del progreso.

Saludos cordiales,
Equipo {NOMBRE_TALLER}
📞 {TELEFONO_TALLER}`;

    return this.reemplazarVariables(plantilla, {
      NOMBRE_TALLER: mensajesPredefinidos?.nombreTaller || 'RESORTES PUERTO MONTT',
      NOMBRE_CLIENTE: cliente.nombre,
      NUMERO_ORDEN: orden.numero,
      FECHA_INGRESO: orden.fechaIngreso ? new Date(orden.fechaIngreso).toLocaleDateString('es-CL') : 'No especificada',
      FECHA_ENTREGA: orden.fechaEntrega ? `📅 Fecha estimada de entrega: ${new Date(orden.fechaEntrega).toLocaleDateString('es-CL')}` : '',
      MARCA_VEHICULO: vehiculo.marca,
      MODELO_VEHICULO: vehiculo.modelo,
      AÑO_VEHICULO: vehiculo.año?.toString() || '',
      PATENTE_VEHICULO: vehiculo.patente,
      KILOMETRAJE_ENTRADA: orden.kilometrajeEntrada ? `Kilometraje: ${orden.kilometrajeEntrada.toLocaleString('es-CL')} km` : '',
      DESCRIPCION_ORDEN: orden.descripcion,
      PRIORIDAD_ORDEN: orden.prioridad?.toUpperCase() || 'NORMAL',
      TECNICO_ASIGNADO: orden.tecnicoAsignado ? `👨‍🔧 *TÉCNICO:* ${orden.tecnicoAsignado}` : '',
      TOTAL_ORDEN: orden.total?.toLocaleString('es-CL') || '0',
      OBSERVACIONES_ORDEN: orden.observaciones ? `📌 *OBSERVACIONES:*\n${orden.observaciones}` : '',
      TELEFONO_TALLER: mensajesPredefinidos?.telefonoTaller || '+56 9 1234 5678',
      EMAIL_TALLER: mensajesPredefinidos?.emailTaller || 'info@resortespuertomontt.cl'
    });
  }

  /**
   * Reemplaza variables en una plantilla de texto
   */
  private reemplazarVariables(plantilla: string, variables: Record<string, string>): string {
    let resultado = plantilla;
    Object.entries(variables).forEach(([key, value]) => {
      resultado = resultado.replace(new RegExp(`{${key}}`, 'g'), value);
    });
    return resultado;
  }

  /**
   * Genera el contenido del email para cotización
   */
  private generarContenidoEmailCotizacion(cotizacion: Cotizacion, cliente: Cliente, vehiculo: Vehiculo): string {
    return `Estimado/a ${cliente.nombre},

Esperamos que se encuentre bien. Le enviamos la cotización solicitada para su vehículo.

DETALLES DE LA COTIZACIÓN:
- Número: ${cotizacion.numero}
- Fecha: ${cotizacion.fecha ? new Date(cotizacion.fecha).toLocaleDateString('es-CL') : 'No especificada'}
- Válida hasta: ${cotizacion.validaHasta ? new Date(cotizacion.validaHasta).toLocaleDateString('es-CL') : 'No especificada'}

VEHÍCULO:
- Marca: ${vehiculo.marca}
- Modelo: ${vehiculo.modelo}
- Año: ${vehiculo.año}
- Patente: ${vehiculo.patente}

DESCRIPCIÓN DEL TRABAJO:
${cotizacion.descripcion}

TOTAL: $${cotizacion.total?.toLocaleString('es-CL')}

${cotizacion.observaciones ? `OBSERVACIONES:
${cotizacion.observaciones}` : ''}

Si está de acuerdo con esta cotización, por favor confírmenos para proceder con el trabajo.

Quedamos atentos a sus comentarios.

Saludos cordiales,
Equipo Resortes Puerto Montt
Teléfono: +56 9 1234 5678
Email: info@resortespuertomontt.cl`;
  }

  /**
   * Genera el contenido del email para orden de trabajo
   */
  private generarContenidoEmailOrden(orden: OrdenTrabajo, cliente: Cliente, vehiculo: Vehiculo): string {
    return `Estimado/a ${cliente.nombre},

Le informamos sobre su orden de trabajo:

DETALLES DE LA ORDEN:
- Número: ${orden.numero}
- Fecha de ingreso: ${orden.fechaIngreso ? new Date(orden.fechaIngreso).toLocaleDateString('es-CL') : 'No especificada'}
${orden.fechaEntrega ? `- Fecha estimada de entrega: ${new Date(orden.fechaEntrega).toLocaleDateString('es-CL')}` : ''}

VEHÍCULO:
- Marca: ${vehiculo.marca}
- Modelo: ${vehiculo.modelo}
- Año: ${vehiculo.año}
- Patente: ${vehiculo.patente}
${orden.kilometrajeEntrada ? `- Kilometraje: ${orden.kilometrajeEntrada.toLocaleString('es-CL')} km` : ''}

DESCRIPCIÓN DEL TRABAJO:
${orden.descripcion}

PRIORIDAD: ${orden.prioridad?.toUpperCase() || 'NORMAL'}
${orden.tecnicoAsignado ? `TÉCNICO ASIGNADO: ${orden.tecnicoAsignado}` : ''}

TOTAL ESTIMADO: $${orden.total?.toLocaleString('es-CL')}

${orden.observaciones ? `OBSERVACIONES:
${orden.observaciones}` : ''}

Le mantendremos informado del progreso del trabajo.

Saludos cordiales,
Equipo Resortes Puerto Montt
Teléfono: +56 9 1234 5678
Email: info@resortespuertomontt.cl`;
  }

  /**
   * Valida si el cliente tiene los datos necesarios para envío
   */
  validarDatosCliente(cliente: Cliente, metodo: 'whatsapp' | 'email'): { valido: boolean; mensaje: string } {
    if (metodo === 'whatsapp') {
      if (!cliente.telefono) {
        return {
          valido: false,
          mensaje: 'El cliente no tiene número de teléfono registrado'
        };
      }
    }
    
    if (metodo === 'email') {
      if (!cliente.email) {
        return {
          valido: false,
          mensaje: 'El cliente no tiene email registrado'
        };
      }
    }
    
    return {
      valido: true,
      mensaje: 'Datos válidos para envío'
    };
  }
}

export const envioDocumentosService = new EnvioDocumentosService();
