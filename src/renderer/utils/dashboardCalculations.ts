import { OrdenTrabajo } from '../types';

/**
 * Utilidades de cálculo para el Dashboard
 * Estas funciones son puras y testeables
 */

/**
 * Calcula las ganancias del mes actual basándose en las órdenes creadas
 * Una orden de trabajo es una venta concretada (se paga al crear)
 */
export function calcularGananciasMes(ordenes: OrdenTrabajo[]): number {
  const ahora = new Date();
  const mesActual = ahora.getMonth();
  const añoActual = ahora.getFullYear();

  return ordenes
    .filter(o => {
      if (!o.fechaIngreso) return false;
      const fechaOrden = new Date(o.fechaIngreso);
      return fechaOrden.getMonth() === mesActual && 
             fechaOrden.getFullYear() === añoActual;
    })
    .reduce((sum, o) => sum + (o.total || 0), 0);
}

/**
 * Calcula las ganancias de un mes específico
 */
export function calcularGananciasMesEspecifico(
  ordenes: OrdenTrabajo[], 
  mes: number, 
  año: number
): number {
  return ordenes
    .filter(o => {
      if (!o.fechaIngreso) return false;
      const fechaOrden = new Date(o.fechaIngreso);
      return fechaOrden.getMonth() === mes && 
             fechaOrden.getFullYear() === año;
    })
    .reduce((sum, o) => sum + (o.total || 0), 0);
}

/**
 * Calcula el porcentaje de cambio entre dos valores
 */
export function calcularPorcentajeCambio(valorActual: number, valorAnterior: number): number {
  if (valorAnterior > 0) {
    return ((valorActual - valorAnterior) / valorAnterior) * 100;
  }
  return valorActual > 0 ? 100 : 0;
}

/**
 * Cuenta órdenes por estado
 */
export function contarOrdenesPorEstado(
  ordenes: OrdenTrabajo[], 
  estado: 'Pendiente' | 'En Progreso' | 'Completada' | 'Cancelada'
): number {
  return ordenes.filter(o => o.estado === estado).length;
}

/**
 * Genera datos de ventas para los últimos N meses
 */
export function generarDatosVentasUltimosMeses(
  ordenes: OrdenTrabajo[], 
  mesesAtras: number = 6
): Array<{ month: string; sales: number }> {
  const nombresMeses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const datosVentas: Array<{ month: string; sales: number }> = [];
  
  for (let i = 0; i < mesesAtras; i++) {
    const mesReferencia = new Date();
    mesReferencia.setMonth(mesReferencia.getMonth() - (mesesAtras - 1 - i));
    
    const ventasMes = ordenes
      .filter(o => {
        if (!o.fechaIngreso) return false;
        const fechaOrden = new Date(o.fechaIngreso);
        return fechaOrden.getMonth() === mesReferencia.getMonth() && 
               fechaOrden.getFullYear() === mesReferencia.getFullYear();
      })
      .reduce((sum, o) => sum + (o.total || 0), 0);
    
    datosVentas.push({
      month: nombresMeses[mesReferencia.getMonth()],
      sales: ventasMes || 0
    });
  }
  
  return datosVentas;
}

/**
 * Verifica si una cotización está vencida
 */
export function estaCotizacionVencida(validaHasta: string): boolean {
  if (!validaHasta) return false;
  const hoy = new Date();
  const hoyLocal = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const partes = validaHasta.split('-').map(Number);
  const vencimiento = partes.length === 3
    ? new Date(partes[0], partes[1] - 1, partes[2])
    : new Date(validaHasta);
  vencimiento.setHours(0, 0, 0, 0);
  return vencimiento < hoyLocal; // Solo vencida si la fecha es anterior (no igual)
}

