import { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { notify, confirmAction } from '../utils/cn';
import { Usuario } from '../types';

export default function TrabajadoresListadoPage() {
  const [filterBy, setFilterBy] = useState('Nombre');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchBy, setSearchBy] = useState('Nombre');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [trabajadores, setTrabajadores] = useState<Usuario[]>([]);
  const [filteredTrabajadores, setFilteredTrabajadores] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTrabajador, setEditingTrabajador] = useState<Usuario | null>(null);
  
  const [formData, setFormData] = useState<Partial<Usuario>>({
    nombre: '',
    email: '',
    password: '',
    rol: 'Técnico',
    porcentaje_comision: 0
  });

  useEffect(() => {
    loadTrabajadores();
  }, []);

  useEffect(() => {
    filterTrabajadores();
  }, [trabajadores, searchTerm, searchBy, filterBy]);

  const loadTrabajadores = async () => {
    try {
      setLoading(true);
      const data = await window.electronAPI?.getAllUsuarios();
      setTrabajadores(data || []);
    } catch (error: any) {
      notify.error('Error', 'No se pudieron cargar los trabajadores: ' + (error.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  const filterTrabajadores = () => {
    let filtered = [...trabajadores];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(t => {
        if (searchBy === 'Nombre') {
          return t.nombre?.toLowerCase().includes(term);
        } else if (searchBy === 'RUT') {
          return t.email?.toLowerCase().includes(term);
        }
        return true;
      });
    }

    filtered.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
    setFilteredTrabajadores(filtered);
  };

  const handleSave = async () => {
    if (!formData.nombre?.trim() || !formData.email?.trim()) {
      notify.error('Error', 'El nombre y email son obligatorios');
      return;
    }

    try {
      const trabajadorToSave: Usuario = {
        ...formData,
        id: editingTrabajador?.id,
        nombre: formData.nombre.trim(),
        email: formData.email.trim(),
        password: formData.password || editingTrabajador?.password || 'password123',
        rol: formData.rol || 'Técnico',
        activo: editingTrabajador?.activo !== undefined ? editingTrabajador.activo : true,
        porcentaje_comision: formData.porcentaje_comision || 0
      };

      const result = await window.electronAPI?.saveUsuario(trabajadorToSave);
      if (result?.success) {
        notify.success('Éxito', editingTrabajador ? 'Trabajador actualizado' : 'Trabajador creado');
        setIsFormOpen(false);
        setEditingTrabajador(null);
        resetForm();
        loadTrabajadores();
      } else {
        throw new Error(result?.error || 'Error desconocido');
      }
    } catch (error: any) {
      notify.error('Error', 'No se pudo guardar el trabajador: ' + (error.message || 'Error desconocido'));
    }
  };

  const handleEdit = (trabajador: Usuario) => {
    setEditingTrabajador(trabajador);
    setFormData({
      nombre: trabajador.nombre || '',
      email: trabajador.email || '',
      password: '', // No mostrar password
      rol: trabajador.rol || 'Técnico',
      porcentaje_comision: trabajador.porcentaje_comision || 0
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (id: number) => {
    const confirmed = await confirmAction(
      '¿Estás seguro?',
      'Esta acción no se puede deshacer. El trabajador será eliminado permanentemente.'
    );
    
    if (!confirmed) return;

    try {
      await window.electronAPI?.deleteUsuario(id);
      notify.success('Éxito', 'Trabajador eliminado');
      loadTrabajadores();
    } catch (error: any) {
      notify.error('Error', 'No se pudo eliminar el trabajador: ' + (error.message || 'Error desconocido'));
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      email: '',
      password: '',
      rol: 'Técnico',
      porcentaje_comision: 0
    });
    setEditingTrabajador(null);
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre<span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.nombre || ''}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email<span className="text-red-600">*</span></label>
                    <input
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Rol</label>
                    <select
                      value={formData.rol || 'Técnico'}
                      onChange={(e) => setFormData({ ...formData, rol: e.target.value })}
                      className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option>Técnico</option>
                      <option>Administrador</option>
                      <option>Vendedor</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Comisión %<span className="text-gray-500 text-xs"> (Ej: 5 para 5%)</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.porcentaje_comision || ''}
                      onChange={(e) => setFormData({ ...formData, porcentaje_comision: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                      className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  {!editingTrabajador && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Contraseña</label>
                      <input
                        type="password"
                        value={formData.password || ''}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="Dejar vacío para contraseña por defecto"
                        className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                  )}
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
                <option>RUT</option>
                <option>ID</option>
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
                <option>RUT</option>
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
                  <th className="px-4 py-2 text-left font-semibold">Nombre</th>
                  <th className="px-4 py-2 text-left font-semibold">Email</th>
                  <th className="px-4 py-2 text-left font-semibold">Rol</th>
                  <th className="px-4 py-2 text-left font-semibold">Comisión %</th>
                  <th className="px-4 py-2 text-left font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="px-4 py-6 text-center" colSpan={5}>Cargando...</td>
                  </tr>
                ) : filteredTrabajadores.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-center" colSpan={5}>No hay trabajadores registrados</td>
                  </tr>
                ) : (
                  filteredTrabajadores.map((trabajador) => (
                    <tr key={trabajador.id} className="border-b border-border text-gray-700 hover:bg-gray-50">
                      <td className="px-4 py-2">{trabajador.nombre}</td>
                      <td className="px-4 py-2">{trabajador.email}</td>
                      <td className="px-4 py-2">{trabajador.rol}</td>
                      <td className="px-4 py-2">{trabajador.porcentaje_comision || 0}%</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(trabajador)}
                            className="p-1 text-blue-600 hover:text-blue-800"
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => trabajador.id && handleDelete(trabajador.id)}
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
