import { useEffect, useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';

export default function ClientesListadoPage() {
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [filterBy, setFilterBy] = useState('Nombre');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchBy, setSearchBy] = useState('Nom, dni');
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    const handleNuevoCliente = () => setIsFormOpen(true);
    window.addEventListener('app:nuevo-cliente', handleNuevoCliente as EventListener);
    return () => window.removeEventListener('app:nuevo-cliente', handleNuevoCliente as EventListener);
  }, []);

  if (isFormOpen) {
    return (
      <div className="flex flex-col h-full bg-background text-foreground">
        <div className="flex items-center justify-end px-6 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFormOpen(false)}
              className="px-4 py-2 text-sm font-medium rounded border border-border text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Volver
            </button>
            <button
              onClick={() => setIsFormOpen(false)}
              className="px-4 py-2 text-sm font-medium rounded border border-border text-gray-700 hover:bg-gray-50 transition-colors"
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
                      Nombre<span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tipo documento:</label>
                    <input
                      type="text"
                      placeholder="RUT"
                      className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Domicilio:</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Localidad:</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nombre fantasía</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">RUT</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tipo responsable</label>
                    <select className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                      <option>Consumidor Final</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <div className="text-sm font-medium text-gray-700 mb-4">Contacto</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Teléfono:</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email:</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Persona contacto:</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Teléfono alternativo:</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email alternativo:</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <div className="text-sm font-medium text-gray-700 mb-4">Vehículos</div>
                <div className="flex items-center gap-2 mb-4">
                  <label className="text-sm text-gray-700 min-w-[140px]">Buscar Vehículo :</label>
                  <input
                    type="text"
                    placeholder="..."
                    className="flex-1 px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <button className="h-9 w-9 rounded-md bg-red-600 text-white flex items-center justify-center">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <div className="overflow-x-auto border border-gray-200 rounded-md">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-gray-700">
                        <th className="px-4 py-2 text-left font-semibold">Vehículo</th>
                        <th className="px-4 py-2 text-left font-semibold">Patente</th>
                        <th className="px-4 py-2 text-left font-semibold">Tipo</th>
                        <th className="px-4 py-2 text-left font-semibold">Color</th>
                        <th className="px-4 py-2 text-left font-semibold">Año</th>
                        <th className="px-4 py-2 text-left font-semibold">N° Chasis</th>
                        <th className="px-4 py-2 text-left font-semibold">CC</th>
                        <th className="px-4 py-2 text-left font-semibold">Seguro</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-200 text-gray-500">
                        <td className="px-4 py-6 text-center" colSpan={8}>
                          No hay vehículos asociados
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Comentario :</label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
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
      <div className="flex items-center justify-end gap-2">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          <option>Todos</option>
          <option>Activos</option>
          <option>Inactivos</option>
        </select>
        <button onClick={() => setIsFormOpen(true)} className="btn-primary">Nuevo</button>
      </div>

      <Card className="border border-border shadow-sm">
        <CardContent className="p-4 space-y-4">
          <div className="rounded-md bg-sky-600 text-white text-sm px-4 py-3">
            Hemos actualizado el sistema de asociación de clientes y Vehículos. Además de la asignación automática que se realiza al crear una orden de servicio, ahora podés administrar los Vehículos asociados a tus clientes de manera independiente. Podés administrar los Vehículos de tus clientes desde este apartado haciendo click en "Editar" sobre el cliente que desees trabajar. Los Vehículos actualmente asignados se deben a una vinculación automática de tu histórico de órdenes con los clientes que tienen un número de identificación único, como el RUT o el correo electrónico.
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <select
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value)}
                className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option>Nombre</option>
                <option>Identificación</option>
                <option>Condición</option>
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
                value={searchBy}
                onChange={(e) => setSearchBy(e.target.value)}
                className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option>Nom, dni</option>
                <option>Nombre</option>
                <option>RUT</option>
              </select>
              <button className="h-9 w-9 rounded-md bg-red-600 text-white flex items-center justify-center hover:bg-red-700 transition-colors">
                <Search className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-gray-700">
                  <th className="px-4 py-2 text-left font-semibold">Nombre</th>
                  <th className="px-4 py-2 text-left font-semibold">Identificación</th>
                  <th className="px-4 py-2 text-left font-semibold">Condición</th>
                  <th className="px-4 py-2 text-left font-semibold">Teléfono</th>
                  <th className="px-4 py-2 text-left font-semibold">Domicilio</th>
                  <th className="px-4 py-2 text-left font-semibold">Localidad</th>
                  <th className="px-4 py-2 text-left font-semibold">Vehículos</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border text-gray-500">
                  <td className="px-4 py-6 text-center" colSpan={7}>
                    No hay clientes registrados
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
