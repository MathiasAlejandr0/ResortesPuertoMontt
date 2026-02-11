import { useEffect, useMemo, useState } from 'react';
import { Search, Trash2 } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { useApp } from '../contexts/AppContext';
import { Venta } from '../types';
import { notify } from '../utils/cn';

interface VentaItem {
  repuestoId: number;
  nombre: string;
  precio: number;
  cantidad: number;
  bonif: number;
  iva: number;
  subtotal: number;
}

export default function TiendaPage() {
  const { clientes, repuestos, refreshRepuestos } = useApp();
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('Por defecto');
  const [fechaDesde, setFechaDesde] = useState('');
  const [filterBy, setFilterBy] = useState('Fecha emisión');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const [fechaEmision, setFechaEmision] = useState(new Date().toISOString().split('T')[0]);
  const [clienteSearch, setClienteSearch] = useState('');
  const [clienteId, setClienteId] = useState<number | null>(null);
  const [metodoPago, setMetodoPago] = useState<'Efectivo' | 'Débito' | 'Crédito'>('Efectivo');
  const [observaciones, setObservaciones] = useState('');
  const [comentarioInterno, setComentarioInterno] = useState('');
  const [descuentoPct, setDescuentoPct] = useState('');

  const [itemSearch, setItemSearch] = useState('');
  const [itemRepuestoId, setItemRepuestoId] = useState<number | null>(null);
  const [itemPrecio, setItemPrecio] = useState('');
  const [itemCantidad, setItemCantidad] = useState('');
  const [itemBonif, setItemBonif] = useState('');
  const [itemIva, setItemIva] = useState('19');
  const [items, setItems] = useState<VentaItem[]>([]);

  useEffect(() => {
    const handleVentaRapida = () => setIsFormOpen(true);
    window.addEventListener('app:venta-rapida', handleVentaRapida);
    return () => window.removeEventListener('app:venta-rapida', handleVentaRapida);
  }, []);

  const refreshVentas = async () => {
    try {
      if (!window.electronAPI) return;
      const data = await window.electronAPI.getAllVentas();
      setVentas(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error cargando ventas:', error);
    }
  };

  useEffect(() => {
    refreshVentas();
  }, []);

  const clienteSeleccionado = useMemo(
    () => clientes.find((cliente) => cliente.id === clienteId) || null,
    [clientes, clienteId]
  );

  const clientesFiltrados = useMemo(() => {
    const term = clienteSearch.trim().toLowerCase();
    if (!term) return clientes;
    return clientes.filter((cliente) => {
      const nombre = cliente.nombre?.toLowerCase() || '';
      const rut = cliente.rut?.toLowerCase() || '';
      const telefono = cliente.telefono?.toLowerCase() || '';
      return nombre.includes(term) || rut.includes(term) || telefono.includes(term);
    });
  }, [clientes, clienteSearch]);

  const resumen = useMemo(() => {
    const descuento = Math.max(0, Math.min(100, Number(descuentoPct || 0))) / 100;
    let repuestosBase = 0;
    let totalNeto = 0;
    let totalIva = 0;

    items.forEach((item) => {
      const base = item.subtotal;
      const baseConDescuento = base * (1 - descuento);
      const iva = baseConDescuento * (item.iva / 100);
      repuestosBase += base;
      totalNeto += baseConDescuento;
      totalIva += iva;
    });

    return {
      repuestosBase,
      totalNeto,
      totalIva,
      total: totalNeto + totalIva
    };
  }, [items, descuentoPct]);

  const handleSelectCliente = (value: string) => {
    if (!value) {
      setClienteId(null);
      return;
    }
    const selected = clientes.find((cliente) => String(cliente.id) === value);
    if (selected?.id) {
      setClienteId(selected.id);
      setClienteSearch(`${selected.nombre}${selected.rut ? ` (${selected.rut})` : ''}`);
    }
  };

  const handleSelectRepuesto = (value: string) => {
    if (!value) {
      setItemRepuestoId(null);
      setItemSearch('');
      return;
    }
    const selected = repuestos.find((repuesto) => String(repuesto.id) === value);
    if (selected?.id) {
      setItemRepuestoId(selected.id);
      setItemSearch(`${selected.nombre}${selected.codigo ? ` (${selected.codigo})` : ''}`);
      setItemPrecio(String(selected.precio ?? ''));
    }
  };

  const handleAgregarItem = () => {
    if (!itemRepuestoId) {
      notify.error('Validación', 'Selecciona un repuesto.');
      return;
    }
    const repuesto = repuestos.find((r) => r.id === itemRepuestoId);
    if (!repuesto) {
      notify.error('Validación', 'Repuesto no encontrado.');
      return;
    }
    const cantidad = Number(itemCantidad || 0) || 0;
    const precio = Number(itemPrecio || 0) || 0;
    const bonif = Number(itemBonif || 0) || 0;
    const iva = Number(itemIva || 0) || 0;

    if (cantidad <= 0 || precio <= 0) {
      notify.error('Validación', 'Cantidad y precio deben ser mayores a 0.');
      return;
    }

    if (repuesto.stock !== undefined && repuesto.stock !== null && cantidad > repuesto.stock) {
      notify.error('Stock insuficiente', `Stock disponible: ${repuesto.stock}`);
      return;
    }

    const subtotal = precio * cantidad * (1 - bonif / 100);
    setItems((prev) => {
      const existing = prev.find((item) => item.repuestoId === repuesto.id);
      if (existing) {
        const nuevaCantidad = existing.cantidad + cantidad;
        const nuevoSubtotal = precio * nuevaCantidad * (1 - bonif / 100);
        return prev.map((item) =>
          item.repuestoId === repuesto.id
            ? { ...item, cantidad: nuevaCantidad, precio, bonif, iva, subtotal: nuevoSubtotal }
            : item
        );
      }
      return [
        ...prev,
        {
          repuestoId: repuesto.id!,
          nombre: repuesto.nombre,
          precio,
          cantidad,
          bonif,
          iva,
          subtotal
        }
      ];
    });

    setItemCantidad('');
    setItemBonif('');
  };

  const handleRemoveItem = (repuestoId: number) => {
    setItems((prev) => prev.filter((item) => item.repuestoId !== repuestoId));
  };

  const resetForm = () => {
    setFechaEmision(new Date().toISOString().split('T')[0]);
    setClienteSearch('');
    setClienteId(null);
    setMetodoPago('Efectivo');
    setObservaciones('');
    setComentarioInterno('');
    setDescuentoPct('');
    setItemSearch('');
    setItemRepuestoId(null);
    setItemPrecio('');
    setItemCantidad('');
    setItemBonif('');
    setItemIva('19');
    setItems([]);
  };

  const handleConfirm = async () => {
    if (!window.electronAPI) return;
    if (items.length === 0) {
      notify.error('Validación', 'Debes agregar al menos un repuesto.');
      return;
    }
    setIsSaving(true);
    try {
      await window.electronAPI.saveVenta({
        clienteId: clienteSeleccionado?.id,
        clienteNombre: clienteSeleccionado?.nombre,
        clienteRut: clienteSeleccionado?.rut,
        clienteTelefono: clienteSeleccionado?.telefono,
        clienteEmail: clienteSeleccionado?.email,
        repuestos: items.map((item) => ({
          id: item.repuestoId,
          nombre: item.nombre,
          precio: item.precio,
          cantidad: item.cantidad,
          subtotal: item.subtotal
        })),
        total: resumen.total,
        metodoPago,
        fecha: `${fechaEmision}T00:00:00.000Z`
      });

      await refreshVentas();
      await refreshRepuestos();
      notify.success('Venta registrada');
      resetForm();
      setIsFormOpen(false);
    } catch (error: any) {
      notify.error('Error', error?.message || 'No se pudo registrar la venta');
    } finally {
      setIsSaving(false);
    }
  };

  const ventasFiltradas = useMemo(() => {
    let data = ventas;
    if (filterStatus === 'Pagadas') {
      data = data.filter((venta) => venta.metodoPago !== 'Crédito');
    } else if (filterStatus === 'Pendientes') {
      data = data.filter((venta) => venta.metodoPago === 'Crédito');
    }

    if (fechaDesde) {
      data = data.filter((venta) => (venta.fecha || '').includes(fechaDesde));
    }

    const term = searchTerm.trim().toLowerCase();
    if (term) {
      data = data.filter((venta) => {
        if (filterBy === 'Cliente') {
          return (venta.clienteNombre || '').toLowerCase().includes(term);
        }
        return (venta.fecha || '').toLowerCase().includes(term) || (venta.numero || '').toLowerCase().includes(term);
      });
    }

    if (sortBy === 'Más recientes') {
      data = [...data].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
    } else if (sortBy === 'Más antiguos') {
      data = [...data].sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));
    }

    return data;
  }, [ventas, filterStatus, fechaDesde, searchTerm, filterBy, sortBy]);

  if (isFormOpen) {
    return (
      <div className="flex flex-col h-full bg-background text-foreground">
        <div className="flex items-center justify-end px-6 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <button onClick={() => { resetForm(); setIsFormOpen(false); }} className="px-4 py-2 text-sm font-medium rounded border border-border text-gray-700 hover:bg-gray-50 transition-colors">
              Volver
            </button>
            <button onClick={() => { resetForm(); setIsFormOpen(false); }} className="px-4 py-2 text-sm font-medium rounded border border-border text-gray-700 hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button className="btn-primary text-sm px-4 py-2 rounded-md" onClick={handleConfirm} disabled={isSaving}>
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
                    value={fechaEmision}
                    onChange={(e) => setFechaEmision(e.target.value)}
                    className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Método de pago:
                  </label>
                  <select
                    value={metodoPago}
                    onChange={(e) => setMetodoPago(e.target.value as 'Efectivo' | 'Débito' | 'Crédito')}
                    className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="Efectivo">Efectivo</option>
                    <option value="Débito">Débito</option>
                    <option value="Crédito">Cuenta corriente</option>
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
                        value={clienteSearch}
                        onChange={(e) => setClienteSearch(e.target.value)}
                        placeholder="Nombre, RUT o teléfono..."
                        className="flex-1 px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                      <button className="h-9 w-9 rounded-md bg-red-600 text-white">
                        +
                      </button>
                    </div>
                    <select
                      value={clienteId ? String(clienteId) : ''}
                      onChange={(e) => handleSelectCliente(e.target.value)}
                      className="mt-2 w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="">Seleccionar cliente</option>
                      {clientesFiltrados.map((cliente) => (
                        <option key={cliente.id} value={cliente.id}>
                          {cliente.nombre} {cliente.rut ? `(${cliente.rut})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="text-sm text-gray-700 pt-8">
                    RUT:{' '}
                    <span className="text-gray-500">
                      {clienteSeleccionado?.rut || '-'} | Tel: {clienteSeleccionado?.telefono || '-'}
                    </span>
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
                              value={itemSearch}
                              onChange={(e) => setItemSearch(e.target.value)}
                              placeholder="Buscar repuesto..."
                              className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                            />
                            <select
                              value={itemRepuestoId ? String(itemRepuestoId) : ''}
                              onChange={(e) => handleSelectRepuesto(e.target.value)}
                              className="px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm"
                            >
                              <option value="">Seleccionar</option>
                              {repuestos
                                .filter((repuesto) => {
                                  const term = itemSearch.trim().toLowerCase();
                                  if (!term) return true;
                                  const nombre = repuesto.nombre?.toLowerCase() || '';
                                  const codigo = repuesto.codigo?.toLowerCase() || '';
                                  return nombre.includes(term) || codigo.includes(term);
                                })
                                .map((repuesto) => (
                                  <option key={repuesto.id} value={repuesto.id}>
                                    {repuesto.nombre} {repuesto.codigo ? `(${repuesto.codigo})` : ''}
                                  </option>
                                ))}
                            </select>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={itemPrecio}
                            onChange={(e) => setItemPrecio(e.target.value)}
                            className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={itemCantidad}
                            onChange={(e) => setItemCantidad(e.target.value)}
                            className="w-20 px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <select className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm" disabled>
                            <option>Repuesto</option>
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={itemBonif}
                            onChange={(e) => setItemBonif(e.target.value)}
                            className="w-20 px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={
                              itemPrecio && itemCantidad
                                ? (Number(itemPrecio) * Number(itemCantidad)).toLocaleString('es-CL')
                                : ''
                            }
                            readOnly
                            className="w-full px-3 py-2 rounded-md border border-gray-300 bg-gray-50 text-gray-900 text-sm"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={itemIva}
                            onChange={(e) => setItemIva(e.target.value)}
                            className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm"
                          >
                            <option value="0">0</option>
                            <option value="19">19</option>
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <button className="btn-primary text-sm px-3 py-2 rounded-md" onClick={handleAgregarItem}>
                            Agregar
                          </button>
                        </td>
                      </tr>
                      {items.map((item) => (
                        <tr key={item.repuestoId} className="border-b border-border text-gray-700">
                          <td className="px-3 py-2">{item.nombre}</td>
                          <td className="px-3 py-2">${item.precio.toLocaleString('es-CL')}</td>
                          <td className="px-3 py-2">{item.cantidad}</td>
                          <td className="px-3 py-2">Repuesto</td>
                          <td className="px-3 py-2">{item.bonif}%</td>
                          <td className="px-3 py-2">${item.subtotal.toLocaleString('es-CL')}</td>
                          <td className="px-3 py-2">{item.iva}%</td>
                          <td className="px-3 py-2">
                            <button
                              className="h-8 w-8 rounded-md border border-gray-300 bg-white text-gray-600 hover:text-red-600"
                              onClick={() => handleRemoveItem(item.repuestoId)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
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
                              <input
                                type="number"
                                value={descuentoPct}
                                onChange={(e) => setDescuentoPct(e.target.value)}
                                className="w-20 px-2 py-1 border rounded-md text-right"
                              />
                              <span>%</span>
                            </div>
                          </td>
                        </tr>
                        <tr className="border-b border-border">
                          <td className="px-3 py-2">Repuestos</td>
                          <td className="px-3 py-2 text-right">${resumen.repuestosBase.toLocaleString('es-CL')}</td>
                        </tr>
                        <tr className="border-b border-border">
                          <td className="px-3 py-2">Mano de obra</td>
                          <td className="px-3 py-2 text-right">$0</td>
                        </tr>
                        <tr className="border-b border-border">
                          <td className="px-3 py-2">Total neto</td>
                          <td className="px-3 py-2 text-right">${resumen.totalNeto.toLocaleString('es-CL')}</td>
                        </tr>
                        <tr className="border-b border-border">
                          <td className="px-3 py-2">IVA</td>
                          <td className="px-3 py-2 text-right">${resumen.totalIva.toLocaleString('es-CL')}</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 font-medium">Total</td>
                          <td className="px-3 py-2 text-right">${resumen.total.toLocaleString('es-CL')}</td>
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
                          <td className="px-3 py-2 text-right">
                            ${metodoPago === 'Efectivo' ? resumen.total.toLocaleString('es-CL') : '0'}
                          </td>
                        </tr>
                        <tr className="border-b border-border">
                          <td className="px-3 py-2">Débito</td>
                          <td className="px-3 py-2 text-right">
                            ${metodoPago === 'Débito' ? resumen.total.toLocaleString('es-CL') : '0'}
                          </td>
                        </tr>
                        <tr className="border-b border-border">
                          <td className="px-3 py-2">Cuenta corriente</td>
                          <td className="px-3 py-2 text-right">
                            ${metodoPago === 'Crédito' ? resumen.total.toLocaleString('es-CL') : '0'}
                          </td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 font-medium">Total pago</td>
                          <td className="px-3 py-2 text-right text-green-600">
                            ${resumen.total.toLocaleString('es-CL')}
                          </td>
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
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comentario Interno:
                </label>
                <textarea
                  value={comentarioInterno}
                  onChange={(e) => setComentarioInterno(e.target.value)}
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
                {ventasFiltradas.length === 0 ? (
                  <tr className="border-b border-border text-gray-500">
                    <td className="px-4 py-6 text-center" colSpan={5}>
                      No hay ventas registradas
                    </td>
                  </tr>
                ) : (
                  ventasFiltradas.map((venta) => (
                    <tr key={venta.id} className="border-b border-border text-gray-700">
                      <td className="px-4 py-2">{venta.clienteNombre || 'Sin cliente'}</td>
                      <td className="px-4 py-2">{new Date(venta.fecha).toLocaleDateString('es-CL')}</td>
                      <td className="px-4 py-2">{venta.numero}</td>
                      <td className="px-4 py-2">{venta.metodoPago || 'Efectivo'}</td>
                      <td className="px-4 py-2">${venta.total.toLocaleString('es-CL')}</td>
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
