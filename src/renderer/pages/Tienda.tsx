import { useState } from 'react';
import { Search } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';

export default function TiendaPage() {
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('Por defecto');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [filterBy, setFilterBy] = useState('Fecha emisión');
  const [isFormOpen, setIsFormOpen] = useState(false);

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

        <div className="p-6 space-y-6">
          <Card className="border border-border shadow-sm">
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha emisión:
                  </label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vendedor:
                  </label>
                  <select className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                    <option>Seleccionar...</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Buscar cliente:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="..."
                        className="flex-1 px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                      <button className="h-9 w-9 rounded-md bg-red-600 text-white">
                        +
                      </button>
                    </div>
                  </div>
                  <div className="text-sm text-gray-700 pt-8">
                    RUT: <span className="text-gray-500">| Tel:</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-gray-700">
                    Item
                  </label>
                  <button className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-700">
                    Código de producto
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-gray-700">
                        <th className="px-3 py-2 text-left font-semibold">Item</th>
                        <th className="px-3 py-2 text-left font-semibold">Importe</th>
                        <th className="px-3 py-2 text-left font-semibold">Cantidad</th>
                        <th className="px-3 py-2 text-left font-semibold">Tipo</th>
                        <th className="px-3 py-2 text-left font-semibold">Bonif.</th>
                        <th className="px-3 py-2 text-left font-semibold">Subtotal</th>
                        <th className="px-3 py-2 text-left font-semibold">IVA</th>
                        <th className="px-3 py-2 text-left font-semibold"></th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-border">
                        <td className="px-3 py-2">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Buscar Producto o Servicio..."
                              className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                            />
                            <button className="h-9 w-9 rounded-md bg-red-600 text-white">
                              +
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            className="w-20 px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <select className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm">
                            <option>Servicio</option>
                            <option>Repuesto</option>
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            className="w-20 px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <select className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm">
                            <option>0</option>
                            <option>19</option>
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <button className="btn-primary text-sm px-3 py-2 rounded-md">
                            Agregar
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border border-border">
                  <CardContent className="p-0">
                    <table className="w-full text-sm">
                      <tbody>
                        <tr className="border-b border-border">
                          <td className="px-3 py-2 font-medium">Resumen</td>
                          <td className="px-3 py-2"></td>
                        </tr>
                        <tr className="border-b border-border">
                          <td className="px-3 py-2">Descuento</td>
                          <td className="px-3 py-2 text-right">
                            <div className="flex justify-end items-center gap-2">
                              <input className="w-20 px-2 py-1 border rounded-md text-right" />
                              <span>%</span>
                            </div>
                          </td>
                        </tr>
                        <tr className="border-b border-border">
                          <td className="px-3 py-2">Repuestos</td>
                          <td className="px-3 py-2 text-right">$0</td>
                        </tr>
                        <tr className="border-b border-border">
                          <td className="px-3 py-2">Mano de obra</td>
                          <td className="px-3 py-2 text-right">$0</td>
                        </tr>
                        <tr className="border-b border-border">
                          <td className="px-3 py-2">Total neto</td>
                          <td className="px-3 py-2 text-right">$0</td>
                        </tr>
                        <tr className="border-b border-border">
                          <td className="px-3 py-2">IVA</td>
                          <td className="px-3 py-2 text-right">$0</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 font-medium">Total</td>
                          <td className="px-3 py-2 text-right">$0</td>
                        </tr>
                      </tbody>
                    </table>
                  </CardContent>
                </Card>

                <Card className="border border-border">
                  <CardContent className="p-0">
                    <table className="w-full text-sm">
                      <tbody>
                        <tr className="border-b border-border">
                          <td className="px-3 py-2 font-medium">Pago</td>
                          <td className="px-3 py-2 text-right"></td>
                        </tr>
                        <tr className="border-b border-border">
                          <td className="px-3 py-2">Efectivo</td>
                          <td className="px-3 py-2 text-right">$0</td>
                        </tr>
                        <tr className="border-b border-border">
                          <td className="px-3 py-2">Cuenta corriente</td>
                          <td className="px-3 py-2 text-right">$0</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 font-medium">Total pago</td>
                          <td className="px-3 py-2 text-right text-green-600">$0</td>
                        </tr>
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observaciones:
                </label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comentario Interno:
                </label>
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
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option>Todos</option>
            <option>Pagadas</option>
            <option>Pendientes</option>
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
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <select
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value)}
                className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option>Fecha emisión</option>
                <option>Fecha</option>
                <option>Cliente</option>
              </select>
              <button className="h-9 w-9 rounded-md border border-gray-300 bg-white text-gray-700">
                ▼
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

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-gray-700">
                  <th className="px-4 py-2 text-left font-semibold">Cliente</th>
                  <th className="px-4 py-2 text-left font-semibold">Fecha</th>
                  <th className="px-4 py-2 text-left font-semibold">Comprobante</th>
                  <th className="px-4 py-2 text-left font-semibold">Pago</th>
                  <th className="px-4 py-2 text-left font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border text-gray-500">
                  <td className="px-4 py-6 text-center" colSpan={5}>
                    No hay ventas registradas
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
