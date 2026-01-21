import { Card, CardContent } from '../components/ui/card';

export default function InformesVehiculoPage() {
  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8 bg-background text-foreground">
      <Card className="border border-border bg-white text-gray-900 shadow-sm">
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-4 items-center">
            <div className="text-sm text-gray-700">Periodo :</div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <span className="text-gray-600">/</span>
              <input
                type="date"
                className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-4 items-center">
            <div className="text-sm text-gray-700">Patente :</div>
            <input
              type="text"
              placeholder="Buscar Vehículo..."
              className="h-9 max-w-xs px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-4 items-center">
            <div className="text-sm text-gray-700">Tipo Informe :</div>
            <select className="h-9 max-w-[200px] px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
              <option>Ordenes</option>
            </select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-4 items-center">
            <div className="text-sm text-gray-700">Imprimir :</div>
            <input type="checkbox" className="h-4 w-4 accent-red-600" />
          </div>

          <div>
            <button className="btn-primary px-4 py-2 text-sm">Generar Informe</button>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border border-gray-200 text-gray-700 bg-gray-50">
                    <th className="px-4 py-2 text-center font-semibold">Fecha</th>
                    <th className="px-4 py-2 text-center font-semibold">Comprobante</th>
                    <th className="px-4 py-2 text-center font-semibold">Vehículo</th>
                    <th className="px-4 py-2 text-center font-semibold">Neto</th>
                    <th className="px-4 py-2 text-center font-semibold">IVA</th>
                    <th className="px-4 py-2 text-center font-semibold">Bruto</th>
                  </tr>
                  <tr className="border border-gray-200 text-gray-700 bg-gray-50">
                    <th className="px-4 py-2 text-center font-semibold">Emisión</th>
                    <th className="px-4 py-2 text-center font-semibold"></th>
                    <th className="px-4 py-2 text-center font-semibold"></th>
                    <th className="px-4 py-2 text-center font-semibold"></th>
                    <th className="px-4 py-2 text-center font-semibold"></th>
                    <th className="px-4 py-2 text-center font-semibold"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="text-gray-500">
                    <td className="px-4 py-6 text-center" colSpan={6}>
                      Sin datos
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
