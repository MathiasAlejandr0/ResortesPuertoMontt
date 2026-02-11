import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { useApp } from '../contexts/AppContext';
import { DetalleVenta, Venta } from '../types';
import { notify } from '../utils/cn';

export default function GraficasGeneralPage() {
  const { ordenes, repuestos } = useApp();
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [detallesVenta, setDetallesVenta] = useState<DetalleVenta[]>([]);
  const [detallesOrden, setDetallesOrden] = useState<any[]>([]);
  const [fechaFiltro, setFechaFiltro] = useState('');
  const [fechaInput, setFechaInput] = useState('');

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        if (!window.electronAPI) return;
        const [ventasData, detallesVentaData, detallesOrdenData] = await Promise.all([
          window.electronAPI.getAllVentas(),
          window.electronAPI.getAllDetallesVenta(),
          window.electronAPI.getAllDetallesOrden()
        ]);
        setVentas(Array.isArray(ventasData) ? ventasData : []);
        setDetallesVenta(Array.isArray(detallesVentaData) ? detallesVentaData : []);
        setDetallesOrden(Array.isArray(detallesOrdenData) ? detallesOrdenData : []);
      } catch (error: any) {
        notify.error('Error', error?.message || 'No se pudieron cargar los datos');
      }
    };
    cargarDatos();
  }, []);

  const toDateOnly = (date: string) => (date || '').split('T')[0];
  const isAfter = (date: string, from: string) => (!from ? true : toDateOnly(date) >= from);

  const ordenesFiltradas = useMemo(() => {
    return ordenes.filter((orden) => {
      const fecha = orden.fechaIngreso || orden.fechaEntrega || '';
      return isAfter(fecha, fechaFiltro);
    });
  }, [ordenes, fechaFiltro]);

  const ventasFiltradas = useMemo(() => {
    return ventas.filter((venta) => isAfter(venta.fecha, fechaFiltro));
  }, [ventas, fechaFiltro]);

  const ordenesById = useMemo(() => {
    const map = new Map<number, any>();
    ordenesFiltradas.forEach((orden) => {
      if (orden.id) map.set(orden.id, orden);
    });
    return map;
  }, [ordenesFiltradas]);

  const repuestosById = useMemo(() => {
    const map = new Map<number, any>();
    repuestos.forEach((repuesto) => {
      if (repuesto.id) map.set(repuesto.id, repuesto);
    });
    return map;
  }, [repuestos]);

  const resumenOrdenes = useMemo(() => {
    const detallesRepuestos = detallesOrden.filter(
      (detalle) =>
        detalle.tipo === 'repuesto' &&
        detalle.ordenId &&
        ordenesById.has(Number(detalle.ordenId))
    );

    const total = ordenesFiltradas.reduce((sum, orden) => sum + (orden.total || 0), 0);
    const totalNeto = total / 1.19;
    const totalCosto = detallesRepuestos.reduce((sum, detalle) => {
      const repuesto = repuestosById.get(detalle.repuestoId);
      const costo = repuesto?.precioCosto || 0;
      return sum + costo * (detalle.cantidad || 0);
    }, 0);
    const ganancia = total - totalCosto;

    return {
      cantidad: ordenesFiltradas.length,
      total,
      totalNeto,
      totalCosto,
      ganancia,
      totalBruto: total
    };
  }, [ordenesFiltradas, detallesOrden, ordenesById, repuestosById]);

  const resumenVentas = useMemo(() => {
    const ventasById = new Map(ventasFiltradas.map((venta) => [venta.id, venta]));
    const detalles = detallesVenta.filter((detalle) => ventasById.has(detalle.ventaId));
    const total = ventasFiltradas.reduce((sum, venta) => sum + (venta.total || 0), 0);
    const totalNeto = total / 1.19;
    const totalCosto = detalles.reduce((sum, detalle) => {
      const repuesto = repuestosById.get(detalle.repuestoId);
      const costo = repuesto?.precioCosto || 0;
      return sum + costo * (detalle.cantidad || 0);
    }, 0);
    const ganancia = total - totalCosto;

    return {
      cantidad: ventasFiltradas.length,
      total,
      totalNeto,
      totalCosto,
      ganancia,
      totalBruto: total
    };
  }, [ventasFiltradas, detallesVenta, repuestosById]);

  const totales = useMemo(() => {
    const totalNeto = resumenOrdenes.totalNeto + resumenVentas.totalNeto;
    const totalCosto = resumenOrdenes.totalCosto + resumenVentas.totalCosto;
    const totalGanancia = resumenOrdenes.ganancia + resumenVentas.ganancia;
    const totalBruto = resumenOrdenes.totalBruto + resumenVentas.totalBruto;
    return { totalNeto, totalCosto, totalGanancia, totalBruto };
  }, [resumenOrdenes, resumenVentas]);

  const detallePorFecha = useMemo(() => {
    const map = new Map<string, { compras: number; ventas: number; ordenes: number }>();
    ordenesFiltradas.forEach((orden) => {
      const fecha = toDateOnly(orden.fechaIngreso || orden.fechaEntrega || '');
      if (!fecha) return;
      if (!map.has(fecha)) map.set(fecha, { compras: 0, ventas: 0, ordenes: 0 });
      map.get(fecha)!.ordenes += orden.total || 0;
    });
    ventasFiltradas.forEach((venta) => {
      const fecha = toDateOnly(venta.fecha);
      if (!fecha) return;
      if (!map.has(fecha)) map.set(fecha, { compras: 0, ventas: 0, ordenes: 0 });
      map.get(fecha)!.ventas += venta.total || 0;
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([fecha, data]) => ({ fecha, ...data }));
  }, [ordenesFiltradas, ventasFiltradas]);

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8 bg-background text-foreground">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <select className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
          <option>Contar todo lo ingresado</option>
        </select>
        <input
          type="date"
          value={fechaInput}
          onChange={(e) => setFechaInput(e.target.value)}
          className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
        />
        <button className="btn-primary h-9 px-4 text-sm" onClick={() => setFechaFiltro(fechaInput)}>
          Analizar
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="border border-border bg-white text-gray-900 shadow-sm">
          <CardContent className="p-4 space-y-2">
            <div className="text-red-600 font-medium">Órdenes de servicio</div>
            {[
              { label: 'Cantidad', value: resumenOrdenes.cantidad },
              { label: 'Total neto', value: `$${resumenOrdenes.totalNeto.toLocaleString('es-CL')}` },
              { label: 'Total costo', value: `$${resumenOrdenes.totalCosto.toLocaleString('es-CL')}` },
              { label: 'Ganancia', value: `$${resumenOrdenes.ganancia.toLocaleString('es-CL')}` },
              { label: 'Total', value: `$${resumenOrdenes.total.toLocaleString('es-CL')}` },
              { label: 'Total bruto', value: `$${resumenOrdenes.totalBruto.toLocaleString('es-CL')}` },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between text-sm border-b border-gray-200 pb-1">
                <span>{item.label}</span>
                <span>{item.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border border-border bg-white text-gray-900 shadow-sm">
          <CardContent className="p-4 space-y-2">
            <div className="text-red-600 font-medium">Ventas</div>
            {[
              { label: 'Cantidad', value: resumenVentas.cantidad },
              { label: 'Total neto', value: `$${resumenVentas.totalNeto.toLocaleString('es-CL')}` },
              { label: 'Total costo', value: `$${resumenVentas.totalCosto.toLocaleString('es-CL')}` },
              { label: 'Ganancia', value: `$${resumenVentas.ganancia.toLocaleString('es-CL')}` },
              { label: 'Total', value: `$${resumenVentas.total.toLocaleString('es-CL')}` },
              { label: 'Total bruto', value: `$${resumenVentas.totalBruto.toLocaleString('es-CL')}` },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between text-sm border-b border-gray-200 pb-1">
                <span>{item.label}</span>
                <span>{item.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border border-border bg-white text-gray-900 shadow-sm">
          <CardContent className="p-4 space-y-2">
            <div className="text-red-600 font-medium">Compras</div>
            {['Cantidad', 'Total neto', 'Total costo', 'Ganancia', 'Total', 'Total bruto'].map((label) => (
              <div key={label} className="flex items-center justify-between text-sm border-b border-gray-200 pb-1">
                <span>{label}</span>
                <span>{label === 'Total costo' || label === 'Ganancia' ? 'No aplica' : '0'}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border border-border bg-white text-gray-900 shadow-sm">
          <CardContent className="p-4 space-y-2">
            <div className="font-medium">Totales</div>
            {[
              { label: 'Total neto', value: `$${totales.totalNeto.toLocaleString('es-CL')}` },
              { label: 'Total costo', value: `$${totales.totalCosto.toLocaleString('es-CL')}` },
              { label: 'Total ganancia', value: `$${totales.totalGanancia.toLocaleString('es-CL')}` },
              { label: 'Total bruto', value: `$${totales.totalBruto.toLocaleString('es-CL')}` },
              { label: 'Estado de', value: totales.totalGanancia >= 0 ? 'Positivo' : 'Negativo' },
              { label: 'Balance', value: `$${totales.totalGanancia.toLocaleString('es-CL')}` },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between text-sm border-b border-gray-200 pb-1">
                <span className={item.label === 'Estado de' || item.label === 'Balance' ? 'flex items-center gap-1' : ''}>
                  {(item.label === 'Estado de' || item.label === 'Balance') && (
                    <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-gray-100 text-gray-700 text-xs">
                      i
                    </span>
                  )}
                  {item.label}
                </span>
                <span>{item.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border border-border bg-white text-gray-900 shadow-sm">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <select className="h-9 min-w-[220px] px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
              <option>Ver total ingresado</option>
            </select>
            <select className="h-9 min-w-[220px] px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
              <option>Agrupar por mes</option>
            </select>
            <select className="h-9 min-w-[220px] px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
              <option>Barras</option>
            </select>
          </div>
          <div className="h-56 rounded-md border border-gray-200 bg-gray-50 flex items-center justify-center text-sm text-gray-500">
            Sin datos
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border bg-white text-gray-900 shadow-sm">
        <CardContent className="p-4 space-y-4">
          <div className="text-sm font-medium bg-gray-100 text-gray-700 rounded px-3 py-2">
            Detalle
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-700">
                  <th className="px-4 py-2 text-left font-semibold">Fecha</th>
                  <th className="px-4 py-2 text-left font-semibold">Compras</th>
                  <th className="px-4 py-2 text-left font-semibold">Ventas</th>
                  <th className="px-4 py-2 text-left font-semibold">Órdenes</th>
                </tr>
              </thead>
              <tbody>
                {detallePorFecha.length === 0 ? (
                  <tr className="text-gray-500">
                    <td className="px-4 py-4 text-center" colSpan={4}>
                      Sin datos
                    </td>
                  </tr>
                ) : (
                  detallePorFecha.map((fila) => (
                    <tr key={fila.fecha} className="border-b border-gray-100 text-gray-700">
                      <td className="px-4 py-2">{fila.fecha}</td>
                      <td className="px-4 py-2">$0</td>
                      <td className="px-4 py-2">${fila.ventas.toLocaleString('es-CL')}</td>
                      <td className="px-4 py-2">${fila.ordenes.toLocaleString('es-CL')}</td>
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
