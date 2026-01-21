import { useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

export default function RecordatoriosPage() {
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('Por defecto');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);

  if (isFormOpen) {
    return (
      <div className="flex flex-col h-full bg-background">
        <div className="flex items-center justify-end px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFormOpen(false)}
              className="px-4 py-2 text-sm font-medium rounded-md border border-border bg-white text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Volver
            </button>
            <button
              onClick={() => setIsFormOpen(false)}
              className="px-4 py-2 text-sm font-medium rounded-md border border-border bg-white text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button className="btn-primary text-sm px-4 py-2 rounded-md">
              Confirmar
            </button>
          </div>
        </div>

        <div className="p-6">
          <Card className="border border-border shadow-sm">
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Buscar cliente:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-gray-900"
                      />
                      <button className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors">
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Buscar Vehículo:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-gray-900"
                      />
                      <button className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors">
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="text-sm text-gray-700">
                    <span className="font-medium">RUT:</span> <span className="text-gray-500">| Tel:</span>
                  </div>
                  <div className="text-sm text-gray-700">
                    <span className="font-medium">Patente:</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Programar aviso:
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-gray-900">
                    <option value="">Seleccionar...</option>
                    <option>Mantenimiento</option>
                    <option>Revisión</option>
                    <option>Otro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kilometraje:
                  </label>
                  <input
                    type="number"
                    placeholder=""
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha:
                  </label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-gray-900"
                  />
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observaciones:
                </label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-gray-900"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8 bg-background text-foreground">
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option>Todos</option>
            <option>Pendientes</option>
            <option>Enviados</option>
          </select>
          <input
            type="date"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <input
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <button onClick={() => setIsFormOpen(true)} className="btn-primary">
            Nuevo
          </button>
        </div>
      </div>

      <Card className="border border-border shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-end">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <select className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                  <option>Fecha aviso</option>
                  <option>Fecha programada</option>
                </select>
                <button className="h-9 w-9 rounded-md border border-gray-300 bg-white text-gray-700">
                  ▼
                </button>
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar"
                className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option>Por defecto</option>
                <option>Más recientes</option>
                <option>Más antiguos</option>
              </select>
              <button className="h-9 w-9 rounded-md bg-red-600 text-white flex items-center justify-center hover:bg-red-700 transition-colors">
                <Search className="h-4 w-4" />
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-gray-700">
                  <th className="px-4 py-2 text-left font-semibold">Vehículo</th>
                  <th className="px-4 py-2 text-left font-semibold">Fecha programada</th>
                  <th className="px-4 py-2 text-left font-semibold">Concepto</th>
                  <th className="px-4 py-2 text-left font-semibold">Cliente</th>
                  <th className="px-4 py-2 text-left font-semibold">Email</th>
                  <th className="px-4 py-2 text-left font-semibold">Teléfono</th>
                  <th className="px-4 py-2 text-left font-semibold">Descripción</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border text-gray-500">
                  <td className="px-4 py-6 text-center" colSpan={7}>
                    No hay recordatorios registrados
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
