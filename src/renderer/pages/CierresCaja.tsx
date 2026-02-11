import { useState, useEffect, useMemo } from 'react';
import { Search } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { useApp } from '../contexts/AppContext';
import { notify, Logger } from '../utils/cn';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface EstadoCaja {
  id?: number;
  fecha_apertura: string;
  fecha_cierre?: string;
  monto_inicial: number;
  monto_final?: number;
  estado: 'abierta' | 'cerrada';
  observaciones?: string;
}

interface CierreConTotales extends EstadoCaja {
  ordenes?: number;
  ventas?: number;
  cobrosCC?: number;
  movimientos?: number;
  compras?: number;
  pagosTrabajadores?: number;
  enEfectivo?: number;
  otros?: number;
  total?: number;
}

export default function CierresCajaPage() {
  const { ordenes } = useApp();
  const [cierres, setCierres] = useState<EstadoCaja[]>([]);
  const [cierresConTotales, setCierresConTotales] = useState<CierreConTotales[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    cargarCierres();
  }, [fechaDesde, fechaHasta]);

  useEffect(() => {
    calcularTotales();
  }, [cierres]);

  const cargarCierres = async () => {
    setIsLoading(true);
    try {
      if (!window.electronAPI) return;
      
      const cierresData = await window.electronAPI.getAllCierresCaja(
        fechaDesde || undefined,
        fechaHasta || undefined
      );
      
      setCierres(cierresData || []);
    } catch (error: any) {
      Logger.error('Error cargando cierres:', error);
      notify.error('Error', 'No se pudieron cargar los cierres de caja');
    } finally {
      setIsLoading(false);
    }
  };

  const calcularTotales = async () => {
    if (!cierres.length) {
      setCierresConTotales([]);
      return;
    }

    try {
      const cierresConDatos = await Promise.all(
        cierres.map(async (cierre) => {
          if (!cierre.fecha_cierre) return { ...cierre };

          const fechaCierre = cierre.fecha_cierre.split('T')[0]; // Solo la fecha sin hora

          // Obtener datos del día del cierre
          const [ventas, movimientos, pagosTrabajadores] = await Promise.all([
            window.electronAPI?.getAllVentas() || Promise.resolve([]),
            window.electronAPI?.getMovimientosCajaPorFecha(fechaCierre) || Promise.resolve([]),
            window.electronAPI?.getPagosTrabajadoresPorFecha(fechaCierre) || Promise.resolve([]),
          ]);

          // Filtrar órdenes completadas y pagadas del día
          const ordenesDelDia = (ordenes || []).filter((o: any) => {
            if (o.estado !== 'Completada' && o.estado !== 'Pagada') return false;
            const fechaOrden = o.fechaSalida?.split('T')[0] || o.fechaIngreso?.split('T')[0];
            return fechaOrden === fechaCierre;
          });

          // Filtrar ventas del día
          const ventasDelDia = (ventas || []).filter((v: any) => {
            const fechaVenta = v.fecha?.split('T')[0];
            return fechaVenta === fechaCierre;
          });

          // Calcular totales
          const totalOrdenes = ordenesDelDia.reduce((sum: number, o: any) => sum + (o.total || 0), 0);
          const totalVentas = ventasDelDia.reduce((sum: number, v: any) => sum + (v.total || 0), 0);
          
          // Movimientos de caja del día
          const movimientosIngresos = (movimientos || []).filter((m: any) => m.tipo === 'ingreso');
          const movimientosEgresos = (movimientos || []).filter((m: any) => m.tipo === 'egreso');
          const totalMovimientos = movimientosIngresos.reduce((sum: number, m: any) => sum + (m.monto || 0), 0) -
                                  movimientosEgresos.reduce((sum: number, m: any) => sum + (m.monto || 0), 0);

          // Pagos a trabajadores del día
          const totalPagosTrabajadores = (pagosTrabajadores || []).reduce((sum: number, p: any) => sum + (p.monto || 0), 0);

          // Efectivo: movimientos en efectivo del día
          const efectivo = movimientosIngresos
            .filter((m: any) => m.metodo_pago === 'Efectivo')
            .reduce((sum: number, m: any) => sum + (m.monto || 0), 0);

          // Otros: movimientos no en efectivo
          const otros = movimientosIngresos
            .filter((m: any) => m.metodo_pago && m.metodo_pago !== 'Efectivo')
            .reduce((sum: number, m: any) => sum + (m.monto || 0), 0);

          // Cobros de cuenta corriente: pagos de cuotas del día
          const cuotas = await window.electronAPI?.getAllCuotasPago() || [];
          const cobrosCC = cuotas
            .filter((c: any) => {
              if (c.estado !== 'Pagada') return false;
              const fechaPago = c.fechaPago?.split('T')[0];
              return fechaPago === fechaCierre;
            })
            .reduce((sum: number, c: any) => sum + (c.montoPagado || c.monto || 0), 0);

          // Total general
          const total = totalOrdenes + totalVentas + cobrosCC + movimientosIngresos.reduce((sum: number, m: any) => sum + (m.monto || 0), 0) -
                        movimientosEgresos.reduce((sum: number, m: any) => sum + (m.monto || 0), 0) - totalPagosTrabajadores;

          return {
            ...cierre,
            ordenes: totalOrdenes,
            ventas: totalVentas,
            cobrosCC,
            movimientos: totalMovimientos,
            compras: 0, // Por ahora no hay tabla de compras
            pagosTrabajadores: totalPagosTrabajadores,
            enEfectivo: efectivo,
            otros,
            total,
          } as CierreConTotales;
        })
      );

      setCierresConTotales(cierresConDatos);
    } catch (error: any) {
      Logger.error('Error calculando totales:', error);
    }
  };

  const cierresFiltrados = useMemo(() => {
    let filtered = cierresConTotales;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((cierre) => {
        const id = cierre.id?.toString() || '';
        const fecha = cierre.fecha_cierre || '';
        return id.includes(term) || fecha.toLowerCase().includes(term);
      });
    }

    return filtered;
  }, [cierresConTotales, searchTerm]);

  const formatearMonto = (monto: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(monto);
  };

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8 bg-background text-foreground">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Cierres de Caja</h1>
          <p className="text-muted-foreground mt-1">
            Historial de cierres de caja realizados
          </p>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <input
          type="date"
          value={fechaDesde}
          onChange={(e) => setFechaDesde(e.target.value)}
          className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          placeholder="Desde"
        />
        <input
          type="date"
          value={fechaHasta}
          onChange={(e) => setFechaHasta(e.target.value)}
          className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          placeholder="Hasta"
        />
      </div>

      <Card className="border border-border shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por ID o fecha..."
                className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <button
                onClick={cargarCierres}
                className="h-9 w-9 rounded-md bg-red-600 text-white flex items-center justify-center hover:bg-red-700 transition-colors"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-gray-700">
                  <th className="px-4 py-2 text-left font-semibold">Fecha Cierre</th>
                  <th className="px-4 py-2 text-left font-semibold">Órdenes</th>
                  <th className="px-4 py-2 text-left font-semibold">Ventas</th>
                  <th className="px-4 py-2 text-left font-semibold">Cobros CC</th>
                  <th className="px-4 py-2 text-left font-semibold">Movimientos</th>
                  <th className="px-4 py-2 text-left font-semibold">Compras</th>
                  <th className="px-4 py-2 text-left font-semibold">Pagos Trabajadores</th>
                  <th className="px-4 py-2 text-left font-semibold">En Efectivo</th>
                  <th className="px-4 py-2 text-left font-semibold">Otros</th>
                  <th className="px-4 py-2 text-left font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td className="px-4 py-6 text-center" colSpan={10}>
                      Cargando...
                    </td>
                  </tr>
                ) : cierresFiltrados.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-center" colSpan={10}>
                      No hay cierres registrados
                    </td>
                  </tr>
                ) : (
                  cierresFiltrados.map((cierre) => (
                    <tr key={cierre.id} className="border-b border-border hover:bg-muted/50">
                      <td className="px-4 py-2">
                        {cierre.fecha_cierre
                          ? format(new Date(cierre.fecha_cierre), 'dd/MM/yyyy HH:mm', { locale: es })
                          : '-'}
                      </td>
                      <td className="px-4 py-2">{formatearMonto(cierre.ordenes || 0)}</td>
                      <td className="px-4 py-2">{formatearMonto(cierre.ventas || 0)}</td>
                      <td className="px-4 py-2">{formatearMonto(cierre.cobrosCC || 0)}</td>
                      <td className="px-4 py-2">{formatearMonto(cierre.movimientos || 0)}</td>
                      <td className="px-4 py-2">{formatearMonto(cierre.compras || 0)}</td>
                      <td className="px-4 py-2">{formatearMonto(cierre.pagosTrabajadores || 0)}</td>
                      <td className="px-4 py-2">{formatearMonto(cierre.enEfectivo || 0)}</td>
                      <td className="px-4 py-2">{formatearMonto(cierre.otros || 0)}</td>
                      <td className="px-4 py-2 font-semibold">{formatearMonto(cierre.total || 0)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
