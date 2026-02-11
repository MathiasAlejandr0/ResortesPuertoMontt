import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { useApp } from '../contexts/AppContext';
import { DetalleVenta, Venta } from '../types';
import { notify } from '../utils/cn';

export default function GraficasProductosPage() {
  const { repuestos } = useApp();
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [detallesVenta, setDetallesVenta] = useState<DetalleVenta[]>([]);
  const [fechaFiltro, setFechaFiltro] = useState('');
  const [fechaInput, setFechaInput] = useState('');

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        if (!window.electronAPI) return;
        const [ventasData, detallesVentaData] = await Promise.all([
          window.electronAPI.getAllVentas(),
          window.electronAPI.getAllDetallesVenta()
        ]);
        setVentas(Array.isArray(ventasData) ? ventasData : []);
        setDetallesVenta(Array.isArray(detallesVentaData) ? detallesVentaData : []);
      } catch (error: any) {
        notify.error('Error', error?.message || 'No se pudieron cargar los datos');
      }
    };
    cargarDatos();
  }, []);

  const toDateOnly = (date: string) => (date || '').split('T')[0];
  const isAfter = (date: string, from: string) => (!from ? true : toDateOnly(date) >= from);

  const ventasFiltradas = useMemo(() => {
    return ventas.filter((venta) => isAfter(venta.fecha, fechaFiltro));
  }, [ventas, fechaFiltro]);

  const ventasById = useMemo(() => new Map(ventasFiltradas.map((venta) => [venta.id, venta])), [ventasFiltradas]);

  const detallesFiltrados = useMemo(() => {
    return detallesVenta.filter((detalle) => ventasById.has(detalle.ventaId));
  }, [detallesVenta, ventasById]);

  const resumen = useMemo(() => {
    const items = new Map<number, { nombre: string; cantidad: number; total: number }>();
    detallesFiltrados.forEach((detalle) => {
      const repuesto = repuestos.find((r) => r.id === detalle.repuestoId);
      const nombre = repuesto?.nombre || detalle.descripcion || 'Repuesto';
      if (!items.has(detalle.repuestoId)) {
        items.set(detalle.repuestoId, { nombre, cantidad: 0, total: 0 });
      }
      const item = items.get(detalle.repuestoId)!;
      item.cantidad += detalle.cantidad || 0;
      item.total += detalle.subtotal || 0;
    });

    const lista = Array.from(items.values()).sort((a, b) => b.cantidad - a.cantidad);
    const totalCantidad = lista.reduce((sum, item) => sum + item.cantidad, 0);
    const totalImporte = lista.reduce((sum, item) => sum + item.total, 0);
    const top = lista[0];

    const stockTotal = repuestos.reduce((sum, repuesto) => sum + (repuesto.stock || 0), 0);
    const costoStock = repuestos.reduce((sum, repuesto) => sum + (repuesto.precioCosto || 0) * (repuesto.stock || 0), 0);
    const netoStock = repuestos.reduce((sum, repuesto) => sum + (repuesto.precio || 0) * (repuesto.stock || 0), 0);
    const brutoStock = netoStock * 1.19;

    return {
      lista,
      totalCantidad,
      totalImporte,
      topNombre: top ? `${top.nombre} (${top.cantidad})` : 'Sin datos',
      stockTotal,
      costoStock,
      netoStock,
      brutoStock
    };
  }, [detallesFiltrados, repuestos]);

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8 bg-background text-foreground">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <select className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
          <option>Ver total facturado</option>
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

      <Card className="border border-border bg-white text-gray-900 shadow-sm">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="space-y-1 rounded-md bg-gray-50 px-4 py-3 border border-gray-200">
              <div className="text-sm text-gray-700">Productos vendidos</div>
              <div className="text-xs text-red-600">{resumen.totalCantidad}</div>
            </div>
            <div className="space-y-1 rounded-md bg-gray-50 px-4 py-3 border border-gray-200">
              <div className="text-sm text-gray-700">Importe total</div>
              <div className="text-xs text-red-600">${resumen.totalImporte.toLocaleString('es-CL')}</div>
            </div>
            <div className="lg:col-span-2 space-y-1 rounded-md bg-gray-50 px-4 py-3 border border-gray-200">
              <div className="text-sm text-gray-700">Producto más vendido</div>
              <div className="text-xs text-red-600">{resumen.topNombre}</div>
            </div>
            <div className="space-y-1 rounded-md bg-gray-50 px-4 py-3 border border-gray-200">
              <div className="text-sm text-gray-700">Productos en stock</div>
              <div className="text-xs text-red-600">{resumen.stockTotal}</div>
            </div>
            <div className="space-y-1 rounded-md bg-gray-50 px-4 py-3 border border-gray-200">
              <div className="text-sm text-gray-700">Costo de stock</div>
              <div className="text-xs text-red-600">${resumen.costoStock.toLocaleString('es-CL')}</div>
            </div>
            <div className="space-y-1 rounded-md bg-gray-50 px-4 py-3 border border-gray-200">
              <div className="text-sm text-gray-700">Valorización neta de stock</div>
              <div className="text-xs text-red-600">${resumen.netoStock.toLocaleString('es-CL')}</div>
            </div>
            <div className="space-y-1 rounded-md bg-gray-50 px-4 py-3 border border-gray-200">
              <div className="text-sm text-gray-700">Valorización bruta de stock</div>
              <div className="text-xs text-red-600">${resumen.brutoStock.toLocaleString('es-CL')}</div>
            </div>
          </div>

          <div className="mt-4 h-56 rounded-md border border-gray-200 bg-gray-50 flex flex-col items-center justify-center text-sm text-gray-500">
            <div>Ventas de repuestos</div>
            <div className="text-red-600 font-medium mt-1">${resumen.totalImporte.toLocaleString('es-CL')}</div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="border border-border bg-white text-gray-900 shadow-sm lg:col-span-2">
          <CardContent className="p-4 space-y-4">
            <div className="text-sm font-medium bg-gray-100 text-gray-700 rounded px-3 py-2">
              Detalle
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-700">
                    <th className="px-4 py-2 text-left font-semibold">Producto</th>
                    <th className="px-4 py-2 text-left font-semibold">Cantidad</th>
                    <th className="px-4 py-2 text-left font-semibold">Importe</th>
                  </tr>
                </thead>
                <tbody>
                  {resumen.lista.length === 0 ? (
                    <tr className="text-gray-500">
                      <td className="px-4 py-4 text-center" colSpan={3}>
                        Sin datos
                      </td>
                    </tr>
                  ) : (
                    resumen.lista.map((item) => (
                      <tr key={item.nombre} className="border-b border-gray-100 text-gray-700">
                        <td className="px-4 py-2">{item.nombre}</td>
                        <td className="px-4 py-2">{item.cantidad}</td>
                        <td className="px-4 py-2">${item.total.toLocaleString('es-CL')}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-white text-gray-900 shadow-sm">
          <CardContent className="p-4 flex items-center justify-center text-sm text-gray-500 h-full">
            Sin datos
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
