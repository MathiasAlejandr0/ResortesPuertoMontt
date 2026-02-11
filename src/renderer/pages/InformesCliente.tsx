import { useMemo, useState } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { useApp } from '../contexts/AppContext';

export default function InformesClientePage() {
  const { clientes, ordenes } = useApp();
  const [fechaInput, setFechaInput] = useState('');
  const [clienteSearch, setClienteSearch] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [fechaFiltro, setFechaFiltro] = useState('');
  const [clienteFiltro, setClienteFiltro] = useState('');

  const clientesFiltrados = useMemo(() => {
    const term = clienteSearch.trim().toLowerCase();
    if (!term) return clientes;
    return clientes.filter((cliente) => {
      const nombre = cliente.nombre?.toLowerCase() || '';
      const rut = cliente.rut?.toLowerCase() || '';
      return nombre.includes(term) || rut.includes(term);
    });
  }, [clientes, clienteSearch]);

  const ordenesFiltradas = useMemo(() => {
    return ordenes.filter((orden) => {
      if (clienteFiltro && String(orden.clienteId) !== clienteFiltro) return false;
      if (fechaFiltro) {
        const fecha = (orden.fechaIngreso || orden.fechaEntrega || '').split('T')[0];
        if (!fecha || fecha < fechaFiltro) return false;
      }
      return true;
    });
  }, [ordenes, clienteFiltro, fechaFiltro]);

  const handleGenerar = () => {
    setFechaFiltro(fechaInput);
    setClienteFiltro(clienteId);
  };

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8 bg-background text-foreground">
      <Card className="border border-border shadow-sm bg-white text-gray-900">
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-4 items-center">
            <div className="text-sm text-gray-700">Periodo :</div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={fechaInput}
                onChange={(e) => setFechaInput(e.target.value)}
                className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-4 items-center">
            <div className="text-sm text-gray-700">Cliente :</div>
            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={clienteSearch}
                onChange={(e) => setClienteSearch(e.target.value)}
                placeholder="Buscar cliente..."
                className="h-9 max-w-xs px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <select
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
                className="h-9 max-w-xs px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="">Seleccionar...</option>
                {clientesFiltrados.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nombre} {cliente.rut ? `(${cliente.rut})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-4 items-center">
            <div className="text-sm text-gray-700">Tipo Informe :</div>
            <select className="h-9 max-w-[200px] px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
              <option>Órdenes</option>
            </select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-4 items-center">
            <div className="text-sm text-gray-700">Imprimir :</div>
            <input type="checkbox" className="h-4 w-4 accent-red-600" />
          </div>

          <div>
            <button className="btn-primary px-4 py-2 text-sm" onClick={handleGenerar}>
              Generar Informe
            </button>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border border-gray-200 text-gray-700 bg-gray-50">
                    <th className="px-4 py-2 text-center font-semibold">Fecha</th>
                    <th className="px-4 py-2 text-center font-semibold">Comprobante</th>
                    <th className="px-4 py-2 text-center font-semibold">Receptor</th>
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
                  {ordenesFiltradas.length === 0 ? (
                    <tr className="text-gray-500">
                      <td className="px-4 py-6 text-center" colSpan={6}>
                        Sin datos
                      </td>
                    </tr>
                  ) : (
                    ordenesFiltradas.map((orden) => {
                      const bruto = orden.total || 0;
                      const neto = bruto / 1.19;
                      const iva = bruto - neto;
                      const fecha = (orden.fechaIngreso || orden.fechaEntrega || '').split('T')[0];
                      return (
                        <tr key={orden.id} className="border border-gray-200 text-gray-700">
                          <td className="px-4 py-2 text-center">{fecha || '-'}</td>
                          <td className="px-4 py-2 text-center">{orden.numero}</td>
                          <td className="px-4 py-2 text-center">{orden.descripcion || '-'}</td>
                          <td className="px-4 py-2 text-center">${neto.toLocaleString('es-CL')}</td>
                          <td className="px-4 py-2 text-center">${iva.toLocaleString('es-CL')}</td>
                          <td className="px-4 py-2 text-center">${bruto.toLocaleString('es-CL')}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
