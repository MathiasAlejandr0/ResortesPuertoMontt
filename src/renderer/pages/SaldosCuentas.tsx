import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { useApp } from '../contexts/AppContext';
import { Venta, CuotaPago, OrdenTrabajo } from '../types';

export default function SaldosCuentasPage() {
  const { clientes, ordenes } = useApp();
  const [filterBy, setFilterBy] = useState('Cuentas pendientes de pago');
  const [searchTerm, setSearchTerm] = useState('');
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [cuotas, setCuotas] = useState<CuotaPago[]>([]);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const [ventasData, cuotasData] = await Promise.all([
          window.electronAPI.getAllVentas(),
          window.electronAPI.getAllCuotasPago()
        ]);
        setVentas(Array.isArray(ventasData) ? ventasData : []);
        setCuotas(Array.isArray(cuotasData) ? cuotasData : []);
      } catch (error) {
        console.error('Error cargando saldos:', error);
      }
    };

    cargarDatos();
  }, []);

  const ordenesById = useMemo(() => {
    const map = new Map<number, OrdenTrabajo>();
    ordenes.forEach((orden) => {
      if (orden.id) map.set(orden.id, orden);
    });
    return map;
  }, [ordenes]);

  const saldos = useMemo(() => {
    const cuotasPendientes = cuotas.filter((c) => c.estado !== 'Pagada');
    const ventasCredito = ventas.filter((v) => v.metodoPago === 'Crédito');

    const data = clientes.map((cliente) => {
      const clienteId = cliente.id || 0;
      const cuotasCliente = cuotasPendientes.filter((c) => {
        const orden = ordenesById.get(c.ordenId);
        return orden?.clienteId === clienteId;
      });

      const ordenesPendientesIds = new Set(cuotasCliente.map((c) => c.ordenId));
      const ordenesPendientes = ordenesPendientesIds.size;
      const saldoOrdenes = cuotasCliente.reduce((sum, c) => sum + (c.monto || 0), 0);

      const ventasPendientes = ventasCredito.filter((v) => v.clienteId === clienteId);
      const saldoVentas = ventasPendientes.reduce((sum, v) => sum + (v.total || 0), 0);

      return {
        cliente,
        ordenesPendientes,
        ventasPendientes: ventasPendientes.length,
        saldo: saldoOrdenes + saldoVentas
      };
    });

    const term = searchTerm.trim().toLowerCase();
    let filtered = term
      ? data.filter((row) => {
          const nombre = row.cliente.nombre?.toLowerCase() || '';
          const rut = row.cliente.rut?.toLowerCase() || '';
          return nombre.includes(term) || rut.includes(term);
        })
      : data;

    if (filterBy === 'Cuentas pendientes de pago') {
      filtered = filtered.filter((row) => row.saldo > 0);
    } else if (filterBy === 'Saldos a favor') {
      filtered = filtered.filter((row) => row.saldo < 0);
    }

    return filtered;
  }, [clientes, cuotas, ventas, ordenesById, searchTerm, filterBy]);

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
                {saldos.length === 0 ? (
                  <tr className="border-b border-border text-gray-500">
                    <td className="px-4 py-6 text-center" colSpan={5}>
                      No hay cuentas registradas
                    </td>
                  </tr>
                ) : (
                  saldos.map((row) => (
                    <tr key={row.cliente.id} className="border-b border-border text-gray-700">
                      <td className="px-4 py-2">{row.cliente.nombre}</td>
                      <td className="px-4 py-2">{row.cliente.rut || '-'}</td>
                      <td className="px-4 py-2">{row.ordenesPendientes}</td>
                      <td className="px-4 py-2">{row.ventasPendientes}</td>
                      <td className="px-4 py-2 font-semibold">
                        ${row.saldo.toLocaleString('es-CL')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
