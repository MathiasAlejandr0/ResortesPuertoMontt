import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { useApp } from '../contexts/AppContext';
import { CuotaPago, Venta } from '../types';
import { notify } from '../utils/cn';

export default function MovimientosCuentasPage() {
  const { clientes, ordenes } = useApp();
  const [filterBy, setFilterBy] = useState('Fecha');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchBy, setSearchBy] = useState('Nom, dni, comp');
  const [fechaDesde, setFechaDesde] = useState('');
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [cuotas, setCuotas] = useState<CuotaPago[]>([]);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        if (!window.electronAPI) return;
        const [ventasData, cuotasData] = await Promise.all([
          window.electronAPI.getAllVentas(),
          window.electronAPI.getAllCuotasPago()
        ]);
        setVentas(Array.isArray(ventasData) ? ventasData : []);
        setCuotas(Array.isArray(cuotasData) ? cuotasData : []);
      } catch (error: any) {
        notify.error('Error', error?.message || 'No se pudieron cargar los movimientos');
      }
    };
    cargarDatos();
  }, []);

  const clientesById = useMemo(() => {
    const map = new Map<number, any>();
    clientes.forEach((cliente) => {
      if (cliente.id) map.set(cliente.id, cliente);
    });
    return map;
  }, [clientes]);

  const ordenesById = useMemo(() => {
    const map = new Map<number, any>();
    ordenes.forEach((orden) => {
      if (orden.id) map.set(orden.id, orden);
    });
    return map;
  }, [ordenes]);

  const movimientos = useMemo(() => {
    const rows: Array<{
      id: string;
      nombre: string;
      ident: string;
      tipo: string;
      fecha: string;
      comprobante: string;
      importe: number;
    }> = [];

    ordenes
      .filter((orden) => orden.metodoPago === 'Crédito')
      .forEach((orden) => {
        const cliente = clientesById.get(orden.clienteId);
        rows.push({
          id: `OT-${orden.id}`,
          nombre: cliente?.nombre || 'Sin cliente',
          ident: cliente?.rut || '-',
          tipo: 'Cargo orden',
          fecha: orden.fechaIngreso || orden.fechaEntrega || '',
          comprobante: orden.numero || `OT-${orden.id}`,
          importe: orden.total || 0
        });
      });

    ventas
      .filter((venta) => venta.metodoPago === 'Crédito')
      .forEach((venta) => {
        const cliente = venta.clienteId ? clientesById.get(venta.clienteId) : null;
        rows.push({
          id: `V-${venta.id}`,
          nombre: venta.clienteNombre || cliente?.nombre || 'Sin cliente',
          ident: venta.clienteRut || cliente?.rut || '-',
          tipo: 'Cargo venta',
          fecha: venta.fecha,
          comprobante: venta.numero,
          importe: venta.total || 0
        });
      });

    cuotas
      .filter((cuota) => cuota.estado === 'Pagada' && cuota.montoPagado)
      .forEach((cuota) => {
        const orden = ordenesById.get(cuota.ordenId);
        const cliente = orden ? clientesById.get(orden.clienteId) : null;
        rows.push({
          id: `C-${cuota.id}`,
          nombre: cliente?.nombre || 'Sin cliente',
          ident: cliente?.rut || '-',
          tipo: 'Pago cuota',
          fecha: cuota.fechaPago || cuota.fechaVencimiento,
          comprobante: `Cuota ${cuota.numeroCuota}`,
          importe: -(cuota.montoPagado || 0)
        });
      });

    return rows;
  }, [ordenes, ventas, cuotas, clientesById, ordenesById]);

  const movimientosFiltrados = useMemo(() => {
    let data = movimientos;
    if (fechaDesde) {
      data = data.filter((mov) => (mov.fecha || '').includes(fechaDesde));
    }
    const term = searchTerm.trim().toLowerCase();
    if (term) {
      data = data.filter((mov) => {
        if (searchBy === 'Nombre') {
          return mov.nombre.toLowerCase().includes(term);
        }
        if (searchBy === 'Comprobante') {
          return mov.comprobante.toLowerCase().includes(term);
        }
        return (
          mov.nombre.toLowerCase().includes(term) ||
          mov.ident.toLowerCase().includes(term) ||
          mov.comprobante.toLowerCase().includes(term)
        );
      });
    }

    if (filterBy === 'ID') {
      data = [...data].sort((a, b) => a.id.localeCompare(b.id));
    } else if (filterBy === 'Nombre') {
      data = [...data].sort((a, b) => a.nombre.localeCompare(b.nombre));
    } else {
      data = [...data].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
    }
    return data;
  }, [movimientos, fechaDesde, searchTerm, searchBy, filterBy]);

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8 bg-background text-foreground">
      <div className="flex items-center justify-end gap-2">
        <input
          type="date"
          value={fechaDesde}
          onChange={(e) => setFechaDesde(e.target.value)}
          className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
        />
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
                <option>Fecha</option>
                <option>ID</option>
                <option>Nombre</option>
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
                value={searchBy}
                onChange={(e) => setSearchBy(e.target.value)}
                className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option>Nom, dni, comp</option>
                <option>Nombre</option>
                <option>Comprobante</option>
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
                  <th className="px-4 py-2 text-left font-semibold">ID</th>
                  <th className="px-4 py-2 text-left font-semibold">Nombre</th>
                  <th className="px-4 py-2 text-left font-semibold">Ident.</th>
                  <th className="px-4 py-2 text-left font-semibold">Tipo</th>
                  <th className="px-4 py-2 text-left font-semibold">Fecha</th>
                  <th className="px-4 py-2 text-left font-semibold">Comprobante</th>
                  <th className="px-4 py-2 text-left font-semibold">Importe</th>
                </tr>
              </thead>
              <tbody>
                {movimientosFiltrados.length === 0 ? (
                  <tr className="border-b border-border text-gray-500">
                    <td className="px-4 py-6 text-center" colSpan={7}>
                      No hay movimientos registrados
                    </td>
                  </tr>
                ) : (
                  movimientosFiltrados.map((mov) => (
                    <tr key={mov.id} className="border-b border-border text-gray-700">
                      <td className="px-4 py-2">{mov.id}</td>
                      <td className="px-4 py-2">{mov.nombre}</td>
                      <td className="px-4 py-2">{mov.ident}</td>
                      <td className="px-4 py-2">{mov.tipo}</td>
                      <td className="px-4 py-2">{mov.fecha ? new Date(mov.fecha).toLocaleDateString('es-CL') : '-'}</td>
                      <td className="px-4 py-2">{mov.comprobante}</td>
                      <td className="px-4 py-2 text-right">
                        {mov.importe < 0 ? '-' : ''}${Math.abs(mov.importe).toLocaleString('es-CL')}
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
