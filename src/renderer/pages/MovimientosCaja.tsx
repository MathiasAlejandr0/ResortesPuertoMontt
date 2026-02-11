import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { notify } from '../utils/cn';

export default function MovimientosCajaPage() {
  const [filterBy, setFilterBy] = useState('Fecha');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchBy, setSearchBy] = useState('Comentario');
  const [fechaDesde, setFechaDesde] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [metodoPago, setMetodoPago] = useState('');
  const [montoEfectivo, setMontoEfectivo] = useState('');
  const [montoOtros, setMontoOtros] = useState('');
  const [detalle, setDetalle] = useState('');
  const [movimientos, setMovimientos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fechaSeleccionada = fechaDesde || new Date().toISOString().split('T')[0];

  useEffect(() => {
    const cargarMovimientos = async () => {
      try {
        if (!window.electronAPI) return;
        const data = await window.electronAPI.getMovimientosCajaPorFecha(fechaSeleccionada);
        setMovimientos(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error cargando movimientos:', error);
      }
    };
    cargarMovimientos();
  }, [fechaSeleccionada]);

  const mapMetodoPago = (value: string) => {
    const lower = value.toLowerCase();
    if (lower.includes('crédito')) return 'Crédito';
    if (lower.includes('débito')) return 'Débito';
    if (lower.includes('transferencia')) return 'Transferencia';
    return 'Transferencia';
  };

  const handleConfirm = async () => {
    if (!window.electronAPI) return;
    const efectivo = Number(montoEfectivo || 0);
    const otros = Number(montoOtros || 0);

    if (!detalle.trim()) {
      notify.error('Validación', 'Debes ingresar un detalle.');
      return;
    }

    if (efectivo === 0 && otros === 0) {
      notify.error('Validación', 'Debes ingresar un monto.');
      return;
    }

    if (otros !== 0 && !metodoPago) {
      notify.error('Validación', 'Selecciona un método de pago para el monto en otros.');
      return;
    }

    setIsLoading(true);
    try {
      const fecha = new Date().toISOString();
      const movimientosParaGuardar: any[] = [];

      if (efectivo !== 0) {
        movimientosParaGuardar.push({
          tipo: efectivo < 0 ? 'egreso' : 'ingreso',
          monto: Math.abs(efectivo),
          descripcion: detalle.trim(),
          metodo_pago: 'Efectivo',
          fecha,
        });
      }

      if (otros !== 0) {
        movimientosParaGuardar.push({
          tipo: otros < 0 ? 'egreso' : 'ingreso',
          monto: Math.abs(otros),
          descripcion: detalle.trim(),
          metodo_pago: mapMetodoPago(metodoPago),
          fecha,
        });
      }

      for (const movimiento of movimientosParaGuardar) {
        await window.electronAPI.registrarMovimientoCaja(movimiento);
      }

      const data = await window.electronAPI.getMovimientosCajaPorFecha(fechaSeleccionada);
      setMovimientos(Array.isArray(data) ? data : []);
      setMontoEfectivo('');
      setMontoOtros('');
      setMetodoPago('');
      setDetalle('');
      setIsFormOpen(false);
      notify.success('Movimiento registrado');
    } catch (error: any) {
      notify.error('Error', error?.message || 'No se pudo registrar el movimiento');
    } finally {
      setIsLoading(false);
    }
  };

  const movimientosFiltrados = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return movimientos;
    return movimientos.filter((mov) => {
      const comentario = mov.descripcion?.toLowerCase() || '';
      const metodo = mov.metodo_pago?.toLowerCase() || '';
      const fecha = mov.fecha || '';
      if (searchBy === 'Comentario') return comentario.includes(term);
      if (searchBy === 'ID') return String(mov.id || '').includes(term);
      if (searchBy === 'Detalle') return comentario.includes(term);
      if (searchBy === 'Método') return metodo.includes(term);
      if (searchBy === 'Fecha') return fecha.includes(term);
      return comentario.includes(term);
    });
  }, [movimientos, searchTerm, searchBy]);

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
            <button className="btn-primary text-sm px-4 py-2 rounded-md" onClick={handleConfirm} disabled={isLoading}>
              Confirmar
            </button>
          </div>
        </div>

        <div className="p-6">
          <Card className="border border-border shadow-sm">
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <div className="rounded-md bg-sky-600 text-white text-sm font-medium px-4 py-3">
                    Para descontar dinero de la caja ingresa el monto en negativo
                  </div>
                </div>
                <div className="border border-gray-200 rounded-md">
                  <div className="px-3 py-2 border-b border-gray-200 text-sm font-medium text-gray-700">
                    Pago
                  </div>
                  <div className="p-0">
                    <table className="w-full text-sm">
                      <tbody>
                        <tr className="border-b border-gray-200">
                          <td className="px-3 py-2">Efectivo</td>
                          <td className="px-3 py-2 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-gray-500">$</span>
                              <input
                                type="number"
                                value={montoEfectivo}
                                onChange={(e) => setMontoEfectivo(e.target.value)}
                                className="w-24 px-2 py-1 border border-gray-300 rounded-md text-right"
                              />
                            </div>
                          </td>
                        </tr>
                        <tr className="border-b border-gray-200">
                          <td className="px-3 py-2">
                            <select
                              value={metodoPago}
                              onChange={(e) => setMetodoPago(e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded-md"
                            >
                              <option value="">Seleccionar</option>
                              <option>Tarjeta de crédito</option>
                              <option>Tarjeta de débito</option>
                              <option>Transferencia bancaria</option>
                              <option>Cheque</option>
                              <option>Otro</option>
                            </select>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-gray-500">$</span>
                              <input
                                type="number"
                                value={montoOtros}
                                onChange={(e) => setMontoOtros(e.target.value)}
                                className="w-24 px-2 py-1 border border-gray-300 rounded-md text-right"
                              />
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 font-medium">Total pago</td>
                          <td className="px-3 py-2 text-right">$0</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Detalle:
                </label>
                <textarea
                  value={detalle}
                  onChange={(e) => setDetalle(e.target.value)}
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
        <input
          type="date"
          value={fechaDesde}
          onChange={(e) => setFechaDesde(e.target.value)}
          className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
        />
        <button onClick={() => setIsFormOpen(true)} className="btn-primary">
          Nuevo
        </button>
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
                <option>Detalle</option>
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
                <option>Comentario</option>
                <option>ID</option>
                <option>Detalle</option>
                <option>Método</option>
                <option>Fecha</option>
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
                  <th className="px-4 py-2 text-left font-semibold">Fecha</th>
                  <th className="px-4 py-2 text-left font-semibold">ID</th>
                  <th className="px-4 py-2 text-left font-semibold">Detalle</th>
                  <th className="px-4 py-2 text-left font-semibold">Caja</th>
                  <th className="px-4 py-2 text-left font-semibold">Efectivo</th>
                  <th className="px-4 py-2 text-left font-semibold">Otros</th>
                  <th className="px-4 py-2 text-left font-semibold">Total</th>
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
                  movimientosFiltrados.map((mov) => {
                    const efectivo = mov.metodo_pago === 'Efectivo' ? mov.monto : 0;
                    const otros = mov.metodo_pago !== 'Efectivo' ? mov.monto : 0;
                    const total = mov.tipo === 'egreso' ? -mov.monto : mov.monto;
                    return (
                      <tr key={mov.id} className="border-b border-border text-gray-700">
                        <td className="px-4 py-2">{new Date(mov.fecha).toLocaleString('es-CL')}</td>
                        <td className="px-4 py-2">{mov.id}</td>
                        <td className="px-4 py-2">{mov.descripcion}</td>
                        <td className="px-4 py-2">{mov.tipo}</td>
                        <td className="px-4 py-2 text-right">${Number(efectivo).toLocaleString('es-CL')}</td>
                        <td className="px-4 py-2 text-right">${Number(otros).toLocaleString('es-CL')}</td>
                        <td className="px-4 py-2 text-right">
                          {total < 0 ? '-' : ''}${Math.abs(total).toLocaleString('es-CL')}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
