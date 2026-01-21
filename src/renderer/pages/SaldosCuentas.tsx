import { useState } from 'react';
import { Search } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';

export default function SaldosCuentasPage() {
  const [filterBy, setFilterBy] = useState('Cuentas pendientes de pago');
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8 bg-background text-foreground">
      <Card className="border border-border shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <select
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value)}
                className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option>Cuentas pendientes de pago</option>
                <option>Saldos a favor</option>
                <option>Todas las cuentas</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar cliente"
                className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
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
                  <th className="px-4 py-2 text-left font-semibold">RUT</th>
                  <th className="px-4 py-2 text-left font-semibold">Órdenes pendientes</th>
                  <th className="px-4 py-2 text-left font-semibold">Ventas pendientes</th>
                  <th className="px-4 py-2 text-left font-semibold">Saldo</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border text-gray-500">
                  <td className="px-4 py-6 text-center" colSpan={5}>
                    No hay cuentas registradas
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
