import { useState } from 'react';
import { Search } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../components/ui/card';

export default function VehiculosPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('Por defecto');
  const [filterBy, setFilterBy] = useState('Marca');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [vehiculoForm, setVehiculoForm] = useState({
    patente: '',
    marca: '',
    modelo: '',
    tipo: '',
    color: '',
    año: '',
    numeroChasis: '',
    cc: '',
    seguro: ''
  });

  if (isFormOpen) {
    return (
      <div className="flex flex-col h-full bg-background text-foreground">
        <div className="flex items-center justify-end px-6 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <button onClick={() => setIsFormOpen(false)} className="px-4 py-2 text-sm font-medium rounded border border-border text-gray-700 hover:bg-gray-50 transition-colors">
              Volver
            </button>
            <button onClick={() => setIsFormOpen(false)} className="px-4 py-2 text-sm font-medium rounded border border-border text-gray-700 hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button className="btn-primary text-sm px-4 py-2 rounded-md">
              Confirmar
            </button>
          </div>
        </div>

        <div className="p-6">
          <Card className="border border-border shadow-sm">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <span className="text-red-600">*</span> Patente
                    </label>
                    <input
                      type="text"
                      value={vehiculoForm.patente}
                      onChange={(e) => setVehiculoForm(prev => ({ ...prev, patente: e.target.value }))}
                      className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Marca:</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={vehiculoForm.marca}
                        onChange={(e) => setVehiculoForm(prev => ({ ...prev, marca: e.target.value }))}
                        className="flex-1 px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                      <button className="h-9 w-9 rounded-md border border-gray-300 bg-white text-gray-700">
                        ▼
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Modelo:</label>
                    <input
                      type="text"
                      value={vehiculoForm.modelo}
                      onChange={(e) => setVehiculoForm(prev => ({ ...prev, modelo: e.target.value }))}
                      className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tipo:</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={vehiculoForm.tipo}
                        onChange={(e) => setVehiculoForm(prev => ({ ...prev, tipo: e.target.value }))}
                        className="flex-1 px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                      <button className="h-9 w-9 rounded-md border border-gray-300 bg-white text-gray-700">
                        ▼
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Color:</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={vehiculoForm.color}
                        onChange={(e) => setVehiculoForm(prev => ({ ...prev, color: e.target.value }))}
                        className="flex-1 px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                      <button className="h-9 w-9 rounded-md border border-gray-300 bg-white text-gray-700">
                        ▼
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Año:</label>
                    <input
                      type="text"
                    value={vehiculoForm.año}
                    onChange={(e) => setVehiculoForm(prev => ({ ...prev, año: e.target.value }))}
                    className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">N° Chasis:</label>
                    <input
                      type="text"
                    value={vehiculoForm.numeroChasis}
                    onChange={(e) => setVehiculoForm(prev => ({ ...prev, numeroChasis: e.target.value }))}
                    className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">CC:</label>
                    <input
                      type="text"
                    value={vehiculoForm.cc}
                    onChange={(e) => setVehiculoForm(prev => ({ ...prev, cc: e.target.value }))}
                    className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Seguro:</label>
                    <input
                      type="text"
                    value={vehiculoForm.seguro}
                    onChange={(e) => setVehiculoForm(prev => ({ ...prev, seguro: e.target.value }))}
                    className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>
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
        <button onClick={() => setIsFormOpen(true)} className="btn-primary">
          Nuevo
        </button>
      </div>

      <Card className="border border-border shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <select
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value)}
                className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option>Marca</option>
                <option>Modelo</option>
                <option>Patente</option>
              </select>
              <button className="h-9 w-9 rounded-md border border-gray-300 bg-white text-gray-700">
                ▲
              </button>
            </div>
            <div className="flex items-center gap-2">
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
                  <th className="px-4 py-2 text-left font-semibold">Patente</th>
                  <th className="px-4 py-2 text-left font-semibold">Tipo</th>
                  <th className="px-4 py-2 text-left font-semibold">Color</th>
                  <th className="px-4 py-2 text-left font-semibold">Año</th>
                  <th className="px-4 py-2 text-left font-semibold">N° Chasis</th>
                  <th className="px-4 py-2 text-left font-semibold">CC</th>
                  <th className="px-4 py-2 text-left font-semibold">Seguro</th>
                  <th className="px-4 py-2 text-left font-semibold">Órdenes</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border text-gray-500">
                  <td className="px-4 py-6 text-center" colSpan={9}>
                    No hay vehículos registrados
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
