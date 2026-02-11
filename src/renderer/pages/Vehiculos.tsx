import { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { useApp } from '../contexts/AppContext';
import { notify, confirmAction } from '../utils/cn';
import { Vehiculo, Cliente } from '../types';

export default function VehiculosPage() {
  const { vehiculos: initialVehiculos, clientes, ordenes, refreshVehiculos } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('Por defecto');
  const [filterBy, setFilterBy] = useState('Marca');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingVehiculo, setEditingVehiculo] = useState<Vehiculo | null>(null);
  
  const vehiculos = initialVehiculos;

  const [formData, setFormData] = useState<Partial<Vehiculo>>({
    patente: '',
    marca: '',
    modelo: '',
    tipo: '',
    color: '',
    año: '',
    numeroChasis: '',
    cc: '',
    seguro: '',
    clienteId: null
  });

  const clientesById = useMemo(() => {
    const map = new Map<number, Cliente>();
    clientes.forEach(c => { if (c.id) map.set(c.id, c); });
    return map;
  }, [clientes]);

  const filteredVehiculos = useMemo(() => {
    let filtered = [...vehiculos];

    // Filtrar por búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(v => {
        if (filterBy === 'Marca') {
          return v.marca?.toLowerCase().includes(term);
        } else if (filterBy === 'Modelo') {
          return v.modelo?.toLowerCase().includes(term);
        } else if (filterBy === 'Patente') {
          return v.patente?.toLowerCase().includes(term);
        }
        return (
          v.patente?.toLowerCase().includes(term) ||
          v.marca?.toLowerCase().includes(term) ||
          v.modelo?.toLowerCase().includes(term)
        );
      });
    }

    // Ordenar
    if (sortBy === 'Más recientes') {
      filtered.sort((a, b) => {
        const fechaA = a.fechaRegistro ? new Date(a.fechaRegistro).getTime() : 0;
        const fechaB = b.fechaRegistro ? new Date(b.fechaRegistro).getTime() : 0;
        return fechaB - fechaA;
      });
    } else if (sortBy === 'Más antiguos') {
      filtered.sort((a, b) => {
        const fechaA = a.fechaRegistro ? new Date(a.fechaRegistro).getTime() : 0;
        const fechaB = b.fechaRegistro ? new Date(b.fechaRegistro).getTime() : 0;
        return fechaA - fechaB;
      });
    }

    return filtered;
  }, [vehiculos, searchTerm, filterBy, sortBy]);

  const getOrdenesCount = (vehiculoId: number) => {
    return ordenes.filter(o => o.vehiculoId === vehiculoId).length;
  };

  const handleSave = async () => {
    if (!formData.patente?.trim()) {
      notify.error('Error', 'La patente es obligatoria');
      return;
    }

    try {
      const vehiculoToSave: Vehiculo = {
        ...formData,
        id: editingVehiculo?.id,
        patente: formData.patente.trim(),
        marca: formData.marca || '',
        modelo: formData.modelo || '',
        tipo: formData.tipo || '',
        color: formData.color || '',
        año: formData.año ? parseInt(formData.año) : null,
        numeroChasis: formData.numeroChasis || '',
        cc: formData.cc || '',
        seguro: formData.seguro || '',
        clienteId: formData.clienteId || null,
        activo: editingVehiculo?.activo !== undefined ? editingVehiculo.activo : true
      };

      await window.electronAPI?.saveVehiculo(vehiculoToSave);
      notify.success('Éxito', editingVehiculo ? 'Vehículo actualizado' : 'Vehículo creado');
      setIsFormOpen(false);
      setEditingVehiculo(null);
      resetForm();
      refreshVehiculos();
    } catch (error: any) {
      notify.error('Error', 'No se pudo guardar el vehículo: ' + (error.message || 'Error desconocido'));
    }
  };

  const handleEdit = (vehiculo: Vehiculo) => {
    setEditingVehiculo(vehiculo);
    setFormData({
      patente: vehiculo.patente || '',
      marca: vehiculo.marca || '',
      modelo: vehiculo.modelo || '',
      tipo: vehiculo.tipo || '',
      color: vehiculo.color || '',
      año: vehiculo.año ? String(vehiculo.año) : '',
      numeroChasis: vehiculo.numeroChasis || '',
      cc: vehiculo.cc || '',
      seguro: vehiculo.seguro || '',
      clienteId: vehiculo.clienteId || null
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (vehiculoId: number) => {
    const confirmed = await confirmAction(
      '¿Estás seguro?',
      'Esta acción no se puede deshacer. El vehículo será eliminado permanentemente.'
    );
    
    if (!confirmed) return;

    try {
      await window.electronAPI?.deleteVehiculo(vehiculoId);
      notify.success('Éxito', 'Vehículo eliminado');
      refreshVehiculos();
    } catch (error: any) {
      notify.error('Error', 'No se pudo eliminar el vehículo: ' + (error.message || 'Error desconocido'));
    }
  };

  const resetForm = () => {
    setFormData({
      patente: '',
      marca: '',
      modelo: '',
      tipo: '',
      color: '',
      año: '',
      numeroChasis: '',
      cc: '',
      seguro: '',
      clienteId: null
    });
    setEditingVehiculo(null);
  };

  if (isFormOpen) {
    return (
      <div className="flex flex-col h-full bg-background text-foreground">
        <div className="flex items-center justify-end px-6 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <button onClick={() => { setIsFormOpen(false); resetForm(); }} className="px-4 py-2 text-sm font-medium rounded border border-border text-gray-700 hover:bg-gray-50 transition-colors">
              Volver
            </button>
            <button onClick={() => { setIsFormOpen(false); resetForm(); }} className="px-4 py-2 text-sm font-medium rounded border border-border text-gray-700 hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button onClick={handleSave} className="btn-primary text-sm px-4 py-2 rounded-md">
              Confirmar
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto">
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
                      value={formData.patente || ''}
                      onChange={(e) => setFormData({ ...formData, patente: e.target.value })}
                      className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Marca:</label>
                    <input
                      type="text"
                      value={formData.marca || ''}
                      onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                      className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Modelo:</label>
                    <input
                      type="text"
                      value={formData.modelo || ''}
                      onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                      className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tipo:</label>
                    <input
                      type="text"
                      value={formData.tipo || ''}
                      onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                      className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Color:</label>
                    <input
                      type="text"
                      value={formData.color || ''}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cliente:</label>
                    <select
                      value={formData.clienteId || ''}
                      onChange={(e) => setFormData({ ...formData, clienteId: e.target.value ? parseInt(e.target.value) : null })}
                      className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="">Sin cliente</option>
                      {clientes.map(c => (
                        <option key={c.id} value={c.id}>{c.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Año:</label>
                    <input
                      type="text"
                      value={formData.año || ''}
                      onChange={(e) => setFormData({ ...formData, año: e.target.value })}
                      className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">N° Chasis:</label>
                    <input
                      type="text"
                      value={formData.numeroChasis || ''}
                      onChange={(e) => setFormData({ ...formData, numeroChasis: e.target.value })}
                      className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">CC:</label>
                    <input
                      type="text"
                      value={formData.cc || ''}
                      onChange={(e) => setFormData({ ...formData, cc: e.target.value })}
                      className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Seguro:</label>
                    <input
                      type="text"
                      value={formData.seguro || ''}
                      onChange={(e) => setFormData({ ...formData, seguro: e.target.value })}
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
        <button onClick={() => setIsFormOpen(true)} className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" />
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
                  <th className="px-4 py-2 text-left font-semibold">Cliente</th>
                  <th className="px-4 py-2 text-left font-semibold">Tipo</th>
                  <th className="px-4 py-2 text-left font-semibold">Color</th>
                  <th className="px-4 py-2 text-left font-semibold">Año</th>
                  <th className="px-4 py-2 text-left font-semibold">N° Chasis</th>
                  <th className="px-4 py-2 text-left font-semibold">CC</th>
                  <th className="px-4 py-2 text-left font-semibold">Seguro</th>
                  <th className="px-4 py-2 text-left font-semibold">Órdenes</th>
                  <th className="px-4 py-2 text-left font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredVehiculos.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-center" colSpan={11}>
                      No hay vehículos registrados
                    </td>
                  </tr>
                ) : (
                  filteredVehiculos.map((vehiculo) => {
                    const cliente = vehiculo.clienteId ? clientesById.get(vehiculo.clienteId) : null;
                    return (
                      <tr key={vehiculo.id} className="border-b border-border text-gray-700 hover:bg-gray-50">
                        <td className="px-4 py-2">{vehiculo.marca} {vehiculo.modelo}</td>
                        <td className="px-4 py-2">{vehiculo.patente}</td>
                        <td className="px-4 py-2">{cliente?.nombre || '-'}</td>
                        <td className="px-4 py-2">{vehiculo.tipo || '-'}</td>
                        <td className="px-4 py-2">{vehiculo.color || '-'}</td>
                        <td className="px-4 py-2">{vehiculo.año || '-'}</td>
                        <td className="px-4 py-2">{vehiculo.numeroChasis || '-'}</td>
                        <td className="px-4 py-2">{vehiculo.cc || '-'}</td>
                        <td className="px-4 py-2">{vehiculo.seguro || '-'}</td>
                        <td className="px-4 py-2">{getOrdenesCount(vehiculo.id || 0)}</td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEdit(vehiculo)}
                              className="p-1 text-blue-600 hover:text-blue-800"
                              title="Editar"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => vehiculo.id && handleDelete(vehiculo.id)}
                              className="p-1 text-red-600 hover:text-red-800"
                              title="Eliminar"
                            >
                              <Trash2 className="h-4 w-4" />
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
