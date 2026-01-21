import { Card, CardContent } from '../components/ui/card';

export default function InformesCuentaCorrientePage() {
  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8 bg-background text-foreground">
      <Card className="border border-border bg-white text-gray-900 shadow-sm">
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-4 items-center">
            <div className="text-sm text-gray-700">Cliente :</div>
            <input
              type="text"
              placeholder="Buscar cliente..."
              className="h-9 max-w-xs px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-4 items-center">
            <div className="text-sm text-gray-700">Tipo Informe :</div>
            <select className="h-9 max-w-[220px] px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
              <option>Estado de cuenta</option>
            </select>
          </div>

          <div>
            <button className="btn-primary px-4 py-2 text-sm">Generar Informe</button>
          </div>

          <div className="border-t border-gray-200"></div>
        </CardContent>
      </Card>
    </div>
  );
}
