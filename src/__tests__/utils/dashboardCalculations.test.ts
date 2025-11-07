import {
  calcularGananciasMes,
  calcularGananciasMesEspecifico,
  calcularPorcentajeCambio,
  contarOrdenesPorEstado,
  generarDatosVentasUltimosMeses,
  estaCotizacionVencida
} from '../../renderer/utils/dashboardCalculations';
import { OrdenTrabajo } from '../../renderer/types';

describe('Dashboard Calculations', () => {
  const hoy = new Date();
  const mesActual = hoy.getMonth();
  const añoActual = hoy.getFullYear();

  const ordenesMesActual: OrdenTrabajo[] = [
    {
      id: 1,
      numero: 'ORD-001',
      clienteId: 1,
      vehiculoId: 1,
      estado: 'Pendiente',
      total: 100000,
      fechaIngreso: hoy.toISOString().split('T')[0],
      descripcion: 'Test 1'
    },
    {
      id: 2,
      numero: 'ORD-002',
      clienteId: 1,
      vehiculoId: 1,
      estado: 'En Progreso',
      total: 200000,
      fechaIngreso: hoy.toISOString().split('T')[0],
      descripcion: 'Test 2'
    }
  ];

  const ordenesMesAnterior: OrdenTrabajo[] = [
    {
      id: 3,
      numero: 'ORD-003',
      clienteId: 1,
      vehiculoId: 1,
      estado: 'Completada',
      total: 150000,
      fechaIngreso: new Date(añoActual, mesActual - 1, 15).toISOString().split('T')[0],
      descripcion: 'Test 3'
    }
  ];

  describe('calcularGananciasMes', () => {
    it('debería calcular correctamente las ganancias del mes actual', () => {
      const ganancias = calcularGananciasMes([...ordenesMesActual, ...ordenesMesAnterior]);
      expect(ganancias).toBe(300000); // 100000 + 200000
    });

    it('debería retornar 0 si no hay órdenes del mes actual', () => {
      const ganancias = calcularGananciasMes(ordenesMesAnterior);
      expect(ganancias).toBe(0);
    });

    it('debería retornar 0 si no hay órdenes', () => {
      const ganancias = calcularGananciasMes([]);
      expect(ganancias).toBe(0);
    });

    it('debería ignorar órdenes sin fechaIngreso', () => {
      const ordenSinFecha: OrdenTrabajo = {
        id: 4,
        numero: 'ORD-004',
        clienteId: 1,
        vehiculoId: 1,
        estado: 'Pendiente',
        total: 50000,
        descripcion: 'Sin fecha'
      };
      const ganancias = calcularGananciasMes([...ordenesMesActual, ordenSinFecha]);
      expect(ganancias).toBe(300000); // Solo cuenta las que tienen fecha
    });
  });

  describe('calcularGananciasMesEspecifico', () => {
    it('debería calcular correctamente las ganancias de un mes específico', () => {
      const mesAnterior = mesActual - 1 >= 0 ? mesActual - 1 : 11;
      const añoAnterior = mesActual - 1 >= 0 ? añoActual : añoActual - 1;
      
      const ganancias = calcularGananciasMesEspecifico(ordenesMesAnterior, mesAnterior, añoAnterior);
      expect(ganancias).toBe(150000);
    });

    it('debería retornar 0 para un mes sin órdenes', () => {
      const ganancias = calcularGananciasMesEspecifico([], 5, 2024);
      expect(ganancias).toBe(0);
    });
  });

  describe('calcularPorcentajeCambio', () => {
    it('debería calcular correctamente el porcentaje de cambio positivo', () => {
      const porcentaje = calcularPorcentajeCambio(200000, 100000);
      expect(porcentaje).toBe(100);
    });

    it('debería calcular correctamente el porcentaje de cambio negativo', () => {
      const porcentaje = calcularPorcentajeCambio(50000, 100000);
      expect(porcentaje).toBe(-50);
    });

    it('debería retornar 100 si el valor anterior es 0 y el actual es positivo', () => {
      const porcentaje = calcularPorcentajeCambio(100000, 0);
      expect(porcentaje).toBe(100);
    });

    it('debería retornar 0 si ambos valores son 0', () => {
      const porcentaje = calcularPorcentajeCambio(0, 0);
      expect(porcentaje).toBe(0);
    });
  });

  describe('contarOrdenesPorEstado', () => {
    const ordenesMixtas: OrdenTrabajo[] = [
      { id: 1, numero: 'ORD-001', clienteId: 1, vehiculoId: 1, estado: 'Pendiente', total: 100000, fechaIngreso: hoy.toISOString().split('T')[0], descripcion: 'Test' },
      { id: 2, numero: 'ORD-002', clienteId: 1, vehiculoId: 1, estado: 'En Progreso', total: 200000, fechaIngreso: hoy.toISOString().split('T')[0], descripcion: 'Test' },
      { id: 3, numero: 'ORD-003', clienteId: 1, vehiculoId: 1, estado: 'Completada', total: 150000, fechaIngreso: hoy.toISOString().split('T')[0], descripcion: 'Test' },
      { id: 4, numero: 'ORD-004', clienteId: 1, vehiculoId: 1, estado: 'Pendiente', total: 80000, fechaIngreso: hoy.toISOString().split('T')[0], descripcion: 'Test' }
    ];

    it('debería contar correctamente las órdenes pendientes', () => {
      expect(contarOrdenesPorEstado(ordenesMixtas, 'Pendiente')).toBe(2);
    });

    it('debería contar correctamente las órdenes en progreso', () => {
      expect(contarOrdenesPorEstado(ordenesMixtas, 'En Progreso')).toBe(1);
    });

    it('debería contar correctamente las órdenes completadas', () => {
      expect(contarOrdenesPorEstado(ordenesMixtas, 'Completada')).toBe(1);
    });

    it('debería retornar 0 si no hay órdenes con ese estado', () => {
      expect(contarOrdenesPorEstado(ordenesMixtas, 'Cancelada')).toBe(0);
    });
  });

  describe('generarDatosVentasUltimosMeses', () => {
    it('debería generar datos para los últimos 6 meses por defecto', () => {
      const datos = generarDatosVentasUltimosMeses([]);
      expect(datos).toHaveLength(6);
    });

    it('debería generar datos para N meses especificados', () => {
      const datos = generarDatosVentasUltimosMeses([], 3);
      expect(datos).toHaveLength(3);
    });

    it('debería incluir ventas de órdenes en el mes correcto', () => {
      const datos = generarDatosVentasUltimosMeses(ordenesMesActual, 1);
      expect(datos[datos.length - 1].sales).toBeGreaterThan(0);
    });
  });

  describe('estaCotizacionVencida', () => {
    it('debería retornar true si la fecha de validez ya pasó', () => {
      const fechaPasada = new Date();
      fechaPasada.setDate(fechaPasada.getDate() - 1);
      expect(estaCotizacionVencida(fechaPasada.toISOString().split('T')[0])).toBe(true);
    });

    it('debería retornar false si la fecha de validez es futura', () => {
      const fechaFutura = new Date();
      fechaFutura.setDate(fechaFutura.getDate() + 10);
      expect(estaCotizacionVencida(fechaFutura.toISOString().split('T')[0])).toBe(false);
    });

    it('debería retornar false si la fecha es hoy', () => {
      const hoy = new Date().toISOString().split('T')[0];
      expect(estaCotizacionVencida(hoy)).toBe(false);
    });

    it('debería retornar false si la fecha está vacía', () => {
      expect(estaCotizacionVencida('')).toBe(false);
    });
  });
});


