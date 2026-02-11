import { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { notify, confirmAction } from '../utils/cn';
import { Servicio } from '../types';

export default function ServiciosListadoPage() {
  const [filterBy, setFilterBy] = useState('Nombre');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchBy, setSearchBy] = useState('Nombre');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [filteredServicios, setFilteredServicios] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingServicio, setEditingServicio] = useState<Servicio | null>(null);
  
  const [formData, setFormData] = useState<Partial<Servicio>>({
    nombre: '',
    descripcion: '',
    precio: 0,
    duracionEstimada: 60
  });

  useEffect(() => {
    loadServicios();
  }, []);

  useEffect(() => {
    filterServicios();
  }, [servicios, searchTerm, searchBy, filterBy]);

  const loadServicios = async () => {
    try {
      setLoading(true);
      const data = await window.electronAPI?.getAllServicios();
      setServicios(data || []);
    } catch (error: any) {
      notify.error('Error', 'No se pudieron cargar los servicios: ' + (error.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  const filterServicios = () => {
    let filtered = [...servicios];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(s => {
        if (searchBy === 'Nombre') {
          return s.nombre?.toLowerCase().includes(term);
        } else if (searchBy === 'Código') {
          return s.id?.toString().includes(term);
        }
        return true;
      });
    }

    filtered.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
    setFilteredServicios(filtered);
  };

  const handleSave = async () => {
    if (!formData.nombre?.trim()) {
      notify.error('Error', 'El nombre del servicio es obligatorio');
      return;
    }

    if (!formData.precio || formData.precio < 0) {
      notify.error('Error', 'El precio debe ser mayor o igual a 0');
      return;
    }

    if (!formData.duracionEstimada || formData.duracionEstimada <= 0) {
      notify.error('Error', 'La duración estimada debe ser mayor a 0');
      return;
    }

    try {
      const servicioToSave: Servicio = {
        ...formData,
        id: editingServicio?.id,
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion?.trim() || '',
        precio: formData.precio || 0,
        duracionEstimada: formData.duracionEstimada || 60,
        activo: editingServicio?.activo !== undefined ? editingServicio.activo : true
      };

      await window.electronAPI?.saveServicio(servicioToSave);
      notify.success('Éxito', editingServicio ? 'Servicio actualizado' : 'Servicio creado');
      setIsFormOpen(false);
      setEditingServicio(null);
      resetForm();
      loadServicios();
    } catch (error: any) {
      notify.error('Error', 'No se pudo guardar el servicio: ' + (error.message || 'Error desconocido'));
    }
  };

  const handleEdit = (servicio: Servicio) => {
    setEditingServicio(servicio);
    setFormData({
      nombre: servicio.nombre || '',
      descripcion: servicio.descripcion || '',
      precio: servicio.precio || 0,
      duracionEstimada: servicio.duracionEstimada || 60
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (id: number) => {
    const confirmed = await confirmAction(
      '¿Estás seguro?',
      'Esta acción no se puede deshacer. El servicio será eliminado permanentemente.'
    );
    
    if (!confirmed) return;

    try {
      await window.electronAPI?.deleteServicio(id);
      notify.success('Éxito', 'Servicio eliminado');
      loadServicios();
    } catch (error: any) {
      notify.error('Error', 'No se pudo eliminar el servicio: ' + (error.message || 'Error desconocido'));
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      descripcion: '',
      precio: 0,
      duracionEstimada: 60
    });
    setEditingServicio(null);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(price);
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
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Código:</label>
                    <input
                      type="text"
                      value={editingServicio?.id || 'Automático'}
                      disabled
                      className="w-full px-3 py-2 rounded-md border border-gray-300 bg-gray-100 text-gray-600 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Servicio<span className="text-red-600">*</span>:
                    </label>
                    <input
                      type="text"
                      value={formData.nombre || ''}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Duración estimada (minutos):</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.duracionEstimada || ''}
                      onChange={(e) => setFormData({ ...formData, duracionEstimada: parseInt(e.target.value) || 60 })}
                      className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Precio Neto<span className="text-red-600">*</span>:
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={formData.precio || ''}
                      onChange={(e) => setFormData({ ...formData, precio: parseInt(e.target.value) || 0 })}
                      placeholder="0"
                      className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Descripción:</label>
                <textarea
                  rows={3}
                  value={formData.descripcion || ''}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
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
        <button onClick={() => setIsFormOpen(true)} className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" />
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
                <option>Nombre</option>
                <option>Código</option>
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
                value={searchBy}
                onChange={(e) => setSearchBy(e.target.value)}
                className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option>Nombre</option>
                <option>Código</option>
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
                  <th className="px-4 py-2 text-left font-semibold">Servicio</th>
                  <th className="px-4 py-2 text-left font-semibold">Código</th>
                  <th className="px-4 py-2 text-left font-semibold">Precio</th>
                  <th className="px-4 py-2 text-left font-semibold">Duración</th>
                  <th className="px-4 py-2 text-left font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="px-4 py-6 text-center" colSpan={5}>Cargando...</td>
                  </tr>
                ) : filteredServicios.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-center" colSpan={5}>No hay servicios registrados</td>
                  </tr>
                ) : (
                  filteredServicios.map((servicio) => (
                    <tr key={servicio.id} className="border-b border-border text-gray-700 hover:bg-gray-50">
                      <td className="px-4 py-2">{servicio.nombre}</td>
                      <td className="px-4 py-2">{servicio.id}</td>
                      <td className="px-4 py-2">{formatPrice(servicio.precio || 0)}</td>
                      <td className="px-4 py-2">{servicio.duracionEstimada || 60} min</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(servicio)}
                            className="p-1 text-blue-600 hover:text-blue-800"
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => servicio.id && handleDelete(servicio.id)}
                            className="p-1 text-red-600 hover:text-red-800"
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
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
