import { Card, CardContent } from '../components/ui/card';

export default function GraficasProductosPage() {
  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8 bg-background text-foreground">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <select className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
          <option>Ver total facturado</option>
        </select>
        <input
          type="date"
          className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
        />
        <input
          type="date"
          className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
        />
        <button className="btn-primary h-9 px-4 text-sm">Analizar</button>
      </div>

      <Card className="border border-border bg-white text-gray-900 shadow-sm">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="space-y-1 rounded-md bg-gray-50 px-4 py-3 border border-gray-200">
              <div className="text-sm text-gray-700">Productos vendidos</div>
              <div className="text-xs text-red-600">Filtro fecha</div>
            </div>
            <div className="space-y-1 rounded-md bg-gray-50 px-4 py-3 border border-gray-200">
              <div className="text-sm text-gray-700">Importe total</div>
              <div className="text-xs text-red-600">Filtro fecha</div>
            </div>
            <div className="lg:col-span-2 space-y-1 rounded-md bg-gray-50 px-4 py-3 border border-gray-200">
              <div className="text-sm text-gray-700">Producto más vendido</div>
              <div className="text-xs text-red-600">Filtro fecha</div>
            </div>
            <div className="space-y-1 rounded-md bg-gray-50 px-4 py-3 border border-gray-200">
              <div className="text-sm text-gray-700">Productos en stock</div>
              <div className="text-xs text-red-600">Inventario actual</div>
            </div>
            <div className="space-y-1 rounded-md bg-gray-50 px-4 py-3 border border-gray-200">
              <div className="text-sm text-gray-700">Costo de stock</div>
              <div className="text-xs text-red-600">Inventario actual</div>
            </div>
            <div className="space-y-1 rounded-md bg-gray-50 px-4 py-3 border border-gray-200">
              <div className="text-sm text-gray-700">Valorización neta de stock</div>
              <div className="text-xs text-red-600">Inventario actual</div>
            </div>
            <div className="space-y-1 rounded-md bg-gray-50 px-4 py-3 border border-gray-200">
              <div className="text-sm text-gray-700">Valorización bruta de stock</div>
              <div className="text-xs text-red-600">Inventario actual</div>
            </div>
          </div>

          <div className="mt-4 h-56 rounded-md border border-gray-200 bg-gray-50 flex items-center justify-center text-sm text-gray-500">
            Sin datos
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
                  <tr className="text-gray-500">
                    <td className="px-4 py-4 text-center" colSpan={3}>
                      Sin datos
                    </td>
                  </tr>
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
