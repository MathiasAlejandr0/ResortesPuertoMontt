import { Card, CardContent } from '../components/ui/card';

export default function GraficasGeneralPage() {
  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8 bg-background text-foreground">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <select className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
          <option>Contar todo lo ingresado</option>
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="border border-border bg-white text-gray-900 shadow-sm">
          <CardContent className="p-4 space-y-2">
            <div className="text-red-600 font-medium">Órdenes de servicio</div>
            {['Cantidad', 'Total neto', 'Total costo', 'Ganancia', 'Total', 'Total bruto'].map((label) => (
              <div key={label} className="flex items-center justify-between text-sm border-b border-gray-200 pb-1">
                <span>{label}</span>
                <span>0</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border border-border bg-white text-gray-900 shadow-sm">
          <CardContent className="p-4 space-y-2">
            <div className="text-red-600 font-medium">Ventas</div>
            {['Cantidad', 'Total neto', 'Total costo', 'Ganancia', 'Total', 'Total bruto'].map((label) => (
              <div key={label} className="flex items-center justify-between text-sm border-b border-gray-200 pb-1">
                <span>{label}</span>
                <span>0</span>
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
              'Total neto',
              'Total costo',
              'Total ganancia',
              'Total bruto',
              'Estado de',
              'Balance',
            ].map((label) => (
              <div key={label} className="flex items-center justify-between text-sm border-b border-gray-200 pb-1">
                <span className={label === 'Estado de' || label === 'Balance' ? 'flex items-center gap-1' : ''}>
                  {(label === 'Estado de' || label === 'Balance') && (
                    <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-gray-100 text-gray-700 text-xs">
                      i
                    </span>
                  )}
                  {label}
                </span>
                <span>$0</span>
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
                <tr className="text-gray-500">
                  <td className="px-4 py-4 text-center" colSpan={4}>
                    Sin datos
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
