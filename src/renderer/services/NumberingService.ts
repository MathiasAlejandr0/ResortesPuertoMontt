export class NumberingService {
  static readonly COTIZACION_PREFIX = 'COT';
  static readonly ORDEN_PREFIX = 'ORD';
  static readonly YEAR_PREFIX = new Date().getFullYear().toString().slice(-2);

  static async getNextCotizacionNumber(): Promise<string> {
    try {
      const cotizaciones = await window.electronAPI.getAllCotizaciones();
      const yearSuffix = new Date().getFullYear().toString().slice(-2);
      const cotizacionesThisYear = cotizaciones.filter(
        (c: any) => c.numero && c.numero.startsWith(`${this.COTIZACION_PREFIX}${yearSuffix}`)
      );

      let maxNumber = 0;
      cotizacionesThisYear.forEach((cotizacion: any) => {
        const match = cotizacion.numero.match(new RegExp(`${this.COTIZACION_PREFIX}${yearSuffix}(\\d+)`));
        if (match) {
          const number = parseInt(match[1]);
          if (number > maxNumber) {
            maxNumber = number;
          }
        }
      });

      const nextNumber = maxNumber + 1;
      return `${this.COTIZACION_PREFIX}${yearSuffix}${nextNumber.toString().padStart(4, '0')}`;
    } catch (error) {
      console.error('Error generando número de cotización:', error);
      return `${this.COTIZACION_PREFIX}${this.YEAR_PREFIX}${Date.now().toString().slice(-4)}`;
    }
  }

  static async getNextOrdenNumber(): Promise<string> {
    try {
      const ordenes = await window.electronAPI.getAllOrdenesTrabajo();
      const yearSuffix = new Date().getFullYear().toString().slice(-2);
      const ordenesThisYear = ordenes.filter(
        (o: any) => o.numero && o.numero.startsWith(`${this.ORDEN_PREFIX}${yearSuffix}`)
      );

      let maxNumber = 0;
      ordenesThisYear.forEach((orden: any) => {
        const match = orden.numero.match(new RegExp(`${this.ORDEN_PREFIX}${yearSuffix}(\\d+)`));
        if (match) {
          const number = parseInt(match[1]);
          if (number > maxNumber) {
            maxNumber = number;
          }
        }
      });

      const nextNumber = maxNumber + 1;
      return `${this.ORDEN_PREFIX}${yearSuffix}${nextNumber.toString().padStart(4, '0')}`;
    } catch (error) {
      console.error('Error generando número de orden:', error);
      return `${this.ORDEN_PREFIX}${this.YEAR_PREFIX}${Date.now().toString().slice(-4)}`;
    }
  }

  static async validateNumberExists(number: string, type: 'cotizacion' | 'orden'): Promise<boolean> {
    try {
      if (type === 'cotizacion') {
        const cotizaciones = await window.electronAPI.getAllCotizaciones();
        return cotizaciones.some((c: any) => c.numero === number);
      } else {
        const ordenes = await window.electronAPI.getAllOrdenesTrabajo();
        return ordenes.some((o: any) => o.numero === number);
      }
    } catch (error) {
      console.error('Error validando número:', error);
      return false;
    }
  }

  static async getNumberingStats(): Promise<{
    cotizacionesThisYear: number;
    ordenesThisYear: number;
    lastCotizacionNumber: string | null;
    lastOrdenNumber: string | null;
  }> {
    try {
      const yearSuffix = new Date().getFullYear().toString().slice(-2);
      const [cotizaciones, ordenes] = await Promise.all([
        window.electronAPI.getAllCotizaciones(),
        window.electronAPI.getAllOrdenesTrabajo()
      ]);

      const cotizacionesThisYear = cotizaciones.filter(
        (c: any) => c.numero && c.numero.startsWith(`${this.COTIZACION_PREFIX}${yearSuffix}`)
      );
      const ordenesThisYear = ordenes.filter(
        (o: any) => o.numero && o.numero.startsWith(`${this.ORDEN_PREFIX}${yearSuffix}`)
      );

      let lastCotizacionNumber: string | null = null;
      let lastOrdenNumber: string | null = null;

      if (cotizacionesThisYear.length > 0) {
        lastCotizacionNumber = cotizacionesThisYear
          .sort((a: any, b: any) => b.numero.localeCompare(a.numero))[0].numero;
      }

      if (ordenesThisYear.length > 0) {
        lastOrdenNumber = ordenesThisYear
          .sort((a: any, b: any) => b.numero.localeCompare(a.numero))[0].numero;
      }

      return {
        cotizacionesThisYear: cotizacionesThisYear.length,
        ordenesThisYear: ordenesThisYear.length,
        lastCotizacionNumber,
        lastOrdenNumber
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas de numeración:', error);
      return {
        cotizacionesThisYear: 0,
        ordenesThisYear: 0,
        lastCotizacionNumber: null,
        lastOrdenNumber: null
      };
    }
  }
}
