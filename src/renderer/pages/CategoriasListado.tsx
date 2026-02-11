import { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { notify, confirmAction } from '../utils/cn';
import { Categoria } from '../types';

export default function CategoriasListadoPage() {
  const [filterBy, setFilterBy] = useState('Nombre');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchBy, setSearchBy] = useState('Nombre');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [filteredCategorias, setFilteredCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCategoria, setEditingCategoria] = useState<Categoria | null>(null);
  
  const [formData, setFormData] = useState<Partial<Categoria>>({
    nombre: ''
  });

  useEffect(() => {
    loadCategorias();
  }, []);

  useEffect(() => {
    filterCategorias();
  }, [categorias, searchTerm, searchBy, filterBy]);

  const loadCategorias = async () => {
    try {
      setLoading(true);
      const data = await window.electronAPI?.getAllCategorias();
      setCategorias(data || []);
    } catch (error: any) {
      notify.error('Error', 'No se pudieron cargar las categorías: ' + (error.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  const filterCategorias = () => {
    let filtered = [...categorias];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(c => 
        c.nombre?.toLowerCase().includes(term)
      );
    }

    filtered.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
    setFilteredCategorias(filtered);
  };

  const handleSave = async () => {
    if (!formData.nombre?.trim()) {
      notify.error('Error', 'El nombre es obligatorio');
      return;
    }

    try {
      const categoriaToSave: Categoria = {
        ...formData,
        id: editingCategoria?.id,
        nombre: formData.nombre.trim(),
        activo: editingCategoria?.activo !== undefined ? editingCategoria.activo : true
      };

      await window.electronAPI?.saveCategoria(categoriaToSave);
      notify.success('Éxito', editingCategoria ? 'Categoría actualizada' : 'Categoría creada');
      setIsFormOpen(false);
      setEditingCategoria(null);
      resetForm();
      loadCategorias();
    } catch (error: any) {
      notify.error('Error', 'No se pudo guardar la categoría: ' + (error.message || 'Error desconocido'));
    }
  };

  const handleEdit = (categoria: Categoria) => {
    setEditingCategoria(categoria);
    setFormData({
      nombre: categoria.nombre || ''
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (id: number) => {
    const confirmed = await confirmAction(
      '¿Estás seguro?',
      'Esta acción no se puede deshacer. La categoría será eliminada permanentemente.'
    );
    
    if (!confirmed) return;

    try {
      await window.electronAPI?.deleteCategoria(id);
      notify.success('Éxito', 'Categoría eliminada');
      loadCategorias();
    } catch (error: any) {
      notify.error('Error', 'No se pudo eliminar la categoría: ' + (error.message || 'Error desconocido'));
    }
  };

  const resetForm = () => {
    setFormData({ nombre: '' });
    setEditingCategoria(null);
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
                <option>ID</option>
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
                  <th className="px-4 py-2 text-left font-semibold">ID</th>
                  <th className="px-4 py-2 text-left font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="px-4 py-6 text-center" colSpan={3}>Cargando...</td>
                  </tr>
                ) : filteredCategorias.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-center" colSpan={3}>No hay categorías registradas</td>
                  </tr>
                ) : (
                  filteredCategorias.map((categoria) => (
                    <tr key={categoria.id} className="border-b border-border text-gray-700 hover:bg-gray-50">
                      <td className="px-4 py-2">{categoria.nombre}</td>
                      <td className="px-4 py-2">{categoria.id}</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(categoria)}
                            className="p-1 text-blue-600 hover:text-blue-800"
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => categoria.id && handleDelete(categoria.id)}
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
