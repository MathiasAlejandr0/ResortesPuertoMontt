import { useState } from 'react';
import { Card, CardContent } from '../components/ui/card';

export default function ScoreTrabajadoresPage() {
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [sumarPor, setSumarPor] = useState('Sumar total con impuestos');
  const [filtrarPor, setFiltrarPor] = useState('Filtrar sólo mano de obra');
  const [ordenesPor, setOrdenesPor] = useState('Todas las ordenes');

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8 bg-background text-foreground">
      <Card className="border border-border shadow-sm">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Desde:</label>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Hasta:</label>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center">
            <select
              value={sumarPor}
              onChange={(e) => setSumarPor(e.target.value)}
              className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option>Sumar total con impuestos</option>
              <option>Sumar total sin impuestos</option>
              <option>Sumar solo ganancia (Precio venta - costo)</option>
            </select>
            <select
              value={filtrarPor}
              onChange={(e) => setFiltrarPor(e.target.value)}
              className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option>Filtrar sólo mano de obra</option>
              <option>Filtrar sólo productos</option>
              <option>Todo (Mano de obra + productos)</option>
            </select>
            <select
              value={ordenesPor}
              onChange={(e) => setOrdenesPor(e.target.value)}
              className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option>Todas las ordenes</option>
              <option>Solo cobradas</option>
            </select>
            <button className="btn-primary">Actualizar</button>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border shadow-sm">
        <CardContent className="p-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-gray-700">
                  <th className="px-4 py-2 text-left font-semibold">Nombre</th>
                  <th className="px-4 py-2 text-left font-semibold">RUT</th>
                  <th className="px-4 py-2 text-left font-semibold">Ventas CANT</th>
                  <th className="px-4 py-2 text-left font-semibold">Ventas TOTAL</th>
                  <th className="px-4 py-2 text-left font-semibold">Órdenes CANT</th>
                  <th className="px-4 py-2 text-left font-semibold">Órdenes TOTAL</th>
                  <th className="px-4 py-2 text-left font-semibold">Total</th>
                  <th className="px-4 py-2 text-left font-semibold">Comisión %</th>
                  <th className="px-4 py-2 text-left font-semibold">Total Comisión</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border text-gray-500">
                  <td className="px-4 py-6 text-center" colSpan={9}>
                    No hay resultados para mostrar
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
