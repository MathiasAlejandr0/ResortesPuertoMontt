import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { useApp } from '../contexts/AppContext';
import { Recordatorio } from '../types';
import { confirmAction, notify } from '../utils/cn';

export default function RecordatoriosPage() {
  const { clientes, vehiculos } = useApp();
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('Por defecto');
  const [fechaDesde, setFechaDesde] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [recordatorios, setRecordatorios] = useState<Recordatorio[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingRecordatorio, setEditingRecordatorio] = useState<Recordatorio | null>(null);

  const [formClienteId, setFormClienteId] = useState<number | ''>('');
  const [formVehiculoId, setFormVehiculoId] = useState<number | ''>('');
  const [formTipo, setFormTipo] = useState<'Mantenimiento' | 'Revisión' | 'Otro'>('Mantenimiento');
  const [formKilometraje, setFormKilometraje] = useState('');
  const [formFechaAviso, setFormFechaAviso] = useState('');
  const [formObservaciones, setFormObservaciones] = useState('');

  const clientesById = useMemo(() => {
    const map = new Map<number, typeof clientes[number]>();
    clientes.forEach((cliente) => {
      if (cliente.id) map.set(cliente.id, cliente);
    });
    return map;
  }, [clientes]);

  const vehiculosById = useMemo(() => {
    const map = new Map<number, typeof vehiculos[number]>();
    vehiculos.forEach((vehiculo) => {
      if (vehiculo.id) map.set(vehiculo.id, vehiculo);
    });
    return map;
  }, [vehiculos]);

  const vehiculosParaFormulario = useMemo(() => {
    if (!formClienteId) return vehiculos;
    return vehiculos.filter((v) => v.clienteId === formClienteId);
  }, [vehiculos, formClienteId]);

  const resetForm = useCallback(() => {
    setEditingRecordatorio(null);
    setFormClienteId('');
    setFormVehiculoId('');
    setFormTipo('Mantenimiento');
    setFormKilometraje('');
    setFormFechaAviso('');
    setFormObservaciones('');
  }, []);

  const cargarRecordatorios = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!window.electronAPI) return;
      const data = await window.electronAPI.getAllRecordatorios();
      setRecordatorios(Array.isArray(data) ? data : []);
    } catch (error: any) {
      notify.error('Error', error?.message || 'Error cargando recordatorios');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarRecordatorios();
  }, [cargarRecordatorios]);

  const openNewForm = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const openEditForm = (recordatorio: Recordatorio) => {
    setEditingRecordatorio(recordatorio);
    setFormClienteId(recordatorio.clienteId ?? '');
    setFormVehiculoId(recordatorio.vehiculoId ?? '');
    setFormTipo((recordatorio.tipo as any) || 'Mantenimiento');
    setFormKilometraje(recordatorio.kilometraje ? String(recordatorio.kilometraje) : '');
    setFormFechaAviso(recordatorio.fechaAviso ? recordatorio.fechaAviso.split('T')[0] : '');
    setFormObservaciones(recordatorio.observaciones || '');
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    if (!window.electronAPI) return;
    if (!formFechaAviso) {
      notify.error('Validación', 'Debes seleccionar una fecha de aviso');
      return;
    }

    const payload: Recordatorio = {
      id: editingRecordatorio?.id,
      clienteId: formClienteId ? Number(formClienteId) : null,
      vehiculoId: formVehiculoId ? Number(formVehiculoId) : null,
      tipo: formTipo,
      kilometraje: formKilometraje ? Number(formKilometraje) : null,
      fechaAviso: new Date(formFechaAviso).toISOString(),
      observaciones: formObservaciones.trim(),
      estado: editingRecordatorio?.estado || 'Pendiente',
      fechaEnvio: editingRecordatorio?.fechaEnvio || null
    };

    setIsLoading(true);
    try {
      await window.electronAPI.saveRecordatorio(payload);
      await cargarRecordatorios();
      notify.success(editingRecordatorio ? 'Recordatorio actualizado' : 'Recordatorio creado');
      setIsFormOpen(false);
      resetForm();
    } catch (error: any) {
      notify.error('Error', error?.message || 'Error guardando recordatorio');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (recordatorio: Recordatorio) => {
    if (!recordatorio.id || !window.electronAPI) return;
    const confirmed = await confirmAction('¿Eliminar este recordatorio?');
    if (!confirmed) return;
    setIsLoading(true);
    try {
      await window.electronAPI.deleteRecordatorio(recordatorio.id);
      await cargarRecordatorios();
      notify.success('Recordatorio eliminado');
    } catch (error: any) {
      notify.error('Error', error?.message || 'No se pudo eliminar');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkEnviado = async (recordatorio: Recordatorio) => {
    if (!recordatorio.id || !window.electronAPI) return;
    setIsLoading(true);
    try {
      await window.electronAPI.updateRecordatorioEstado({ id: recordatorio.id, estado: 'Enviado' });
      await cargarRecordatorios();
      notify.success('Recordatorio marcado como enviado');
    } catch (error: any) {
      notify.error('Error', error?.message || 'No se pudo actualizar');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRecordatorios = useMemo(() => {
    const desde = fechaDesde ? new Date(fechaDesde) : null;
    const hasta = null;
    const term = searchTerm.trim().toLowerCase();

    let data = recordatorios.filter((recordatorio) => {
      if (filterStatus === 'Pendientes' && recordatorio.estado !== 'Pendiente') return false;
      if (filterStatus === 'Enviados' && recordatorio.estado !== 'Enviado') return false;

      if (desde) {
        const fecha = new Date(recordatorio.fechaAviso);
        if (fecha < desde) return false;
      }
      if (hasta) {
        const fecha = new Date(recordatorio.fechaAviso);
        if (fecha > hasta) return false;
      }

      if (term) {
        const cliente = recordatorio.clienteId ? clientesById.get(recordatorio.clienteId) : undefined;
        const vehiculo = recordatorio.vehiculoId ? vehiculosById.get(recordatorio.vehiculoId) : undefined;
        const texto = [
          recordatorio.tipo,
          recordatorio.observaciones || '',
          cliente?.nombre || '',
          cliente?.email || '',
          cliente?.telefono || '',
          vehiculo?.patente || '',
          vehiculo?.marca || '',
          vehiculo?.modelo || ''
        ].join(' ').toLowerCase();
        if (!texto.includes(term)) return false;
      }

      return true;
    });

    if (sortBy === 'Más recientes') {
      data = data.sort((a, b) => new Date(b.fechaAviso).getTime() - new Date(a.fechaAviso).getTime());
    } else if (sortBy === 'Más antiguos') {
      data = data.sort((a, b) => new Date(a.fechaAviso).getTime() - new Date(b.fechaAviso).getTime());
    }

    return data;
  }, [recordatorios, filterStatus, fechaDesde, searchTerm, sortBy, clientesById, vehiculosById]);

  if (isFormOpen) {
    const clienteSeleccionado = formClienteId ? clientesById.get(Number(formClienteId)) : undefined;
    const vehiculoSeleccionado = formVehiculoId ? vehiculosById.get(Number(formVehiculoId)) : undefined;
    return (
      <div className="flex flex-col h-full bg-background">
        <div className="flex items-center justify-end px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setIsFormOpen(false);
                resetForm();
              }}
              className="px-4 py-2 text-sm font-medium rounded-md border border-border bg-white text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Volver
            </button>
            <button
              onClick={() => {
                setIsFormOpen(false);
                resetForm();
              }}
              className="px-4 py-2 text-sm font-medium rounded-md border border-border bg-white text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              className="btn-primary text-sm px-4 py-2 rounded-md"
              onClick={handleSave}
              disabled={isLoading}
            >
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
                      Cliente:
                    </label>
                    <select
                      value={formClienteId}
                      onChange={(e) => {
                        const next = e.target.value ? Number(e.target.value) : '';
                        setFormClienteId(next);
                        setFormVehiculoId('');
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-gray-900"
                    >
                      <option value="">Sin cliente</option>
                      {clientes.map((cliente) => (
                        <option key={cliente.id} value={cliente.id}>
                          {cliente.nombre} {cliente.rut ? `(${cliente.rut})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Vehículo:
                    </label>
                    <select
                      value={formVehiculoId}
                      onChange={(e) => setFormVehiculoId(e.target.value ? Number(e.target.value) : '')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-gray-900"
                    >
                      <option value="">Sin vehículo</option>
                      {vehiculosParaFormulario.map((vehiculo) => (
                        <option key={vehiculo.id} value={vehiculo.id}>
                          {vehiculo.patente} - {vehiculo.marca} {vehiculo.modelo}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="text-sm text-gray-700">
                    <span className="font-medium">RUT:</span>{' '}
                    <span className="text-gray-500">{clienteSeleccionado?.rut || 'N/A'}</span>{' '}
                    <span className="text-gray-500">| Tel:</span>{' '}
                    <span className="text-gray-500">{clienteSeleccionado?.telefono || 'N/A'}</span>
                  </div>
                  <div className="text-sm text-gray-700">
                    <span className="font-medium">Patente:</span>{' '}
                    <span className="text-gray-500">{vehiculoSeleccionado?.patente || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Programar aviso:
                  </label>
                  <select
                    value={formTipo}
                    onChange={(e) => setFormTipo(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-gray-900"
                  >
                    <option value="Mantenimiento">Mantenimiento</option>
                    <option value="Revisión">Revisión</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kilometraje:
                  </label>
                  <input
                    type="number"
                    value={formKilometraje}
                    onChange={(e) => setFormKilometraje(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha:
                  </label>
                  <input
                    type="date"
                    value={formFechaAviso}
                    onChange={(e) => setFormFechaAviso(e.target.value)}
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
                  value={formObservaciones}
                  onChange={(e) => setFormObservaciones(e.target.value)}
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
          <button onClick={openNewForm} className="btn-primary">
            Nuevo
          </button>
        </div>
      </div>

      <Card className="border border-border shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-end">
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
                  <th className="px-4 py-2 text-left font-semibold">Fecha aviso</th>
                  <th className="px-4 py-2 text-left font-semibold">Cliente</th>
                  <th className="px-4 py-2 text-left font-semibold">Vehículo</th>
                  <th className="px-4 py-2 text-left font-semibold">Tipo</th>
                  <th className="px-4 py-2 text-left font-semibold">Km</th>
                  <th className="px-4 py-2 text-left font-semibold">Estado</th>
                  <th className="px-4 py-2 text-left font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecordatorios.length === 0 ? (
                  <tr className="border-b border-border text-gray-500">
                    <td className="px-4 py-6 text-center" colSpan={7}>
                      {isLoading ? 'Cargando recordatorios...' : 'No hay recordatorios registrados'}
                    </td>
                  </tr>
                ) : (
                  filteredRecordatorios.map((recordatorio) => {
                    const cliente = recordatorio.clienteId ? clientesById.get(recordatorio.clienteId) : undefined;
                    const vehiculo = recordatorio.vehiculoId ? vehiculosById.get(recordatorio.vehiculoId) : undefined;
                    return (
                      <tr key={recordatorio.id} className="border-b border-border">
                        <td className="px-4 py-2">
                          {new Date(recordatorio.fechaAviso).toLocaleDateString('es-CL')}
                        </td>
                        <td className="px-4 py-2">
                          <div className="font-medium">{cliente?.nombre || 'Sin cliente'}</div>
                          <div className="text-xs text-gray-500">{cliente?.telefono || ''}</div>
                        </td>
                        <td className="px-4 py-2">
                          {vehiculo ? `${vehiculo.patente} - ${vehiculo.marca} ${vehiculo.modelo}` : 'Sin vehículo'}
                        </td>
                        <td className="px-4 py-2">{recordatorio.tipo}</td>
                        <td className="px-4 py-2">{recordatorio.kilometraje ?? '-'}</td>
                        <td className="px-4 py-2">
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              recordatorio.estado === 'Pendiente'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {recordatorio.estado}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex gap-2">
                            {recordatorio.estado === 'Pendiente' && (
                              <button
                                onClick={() => handleMarkEnviado(recordatorio)}
                                className="text-xs px-2 py-1 rounded border border-green-500 text-green-700 hover:bg-green-50"
                              >
                                Marcar enviado
                              </button>
                            )}
                            <button
                              onClick={() => openEditForm(recordatorio)}
                              className="text-xs px-2 py-1 rounded border border-blue-500 text-blue-700 hover:bg-blue-50"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleDelete(recordatorio)}
                              className="text-xs px-2 py-1 rounded border border-red-500 text-red-700 hover:bg-red-50"
                            >
                              Eliminar
                            </button>
                          </div>
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
