import { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { notify, confirmAction } from '../utils/cn';
import { Proveedor } from '../types';

export default function ProveedoresListadoPage() {
  const [filterBy, setFilterBy] = useState('Nombre');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchBy, setSearchBy] = useState('Nombre');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [filteredProveedores, setFilteredProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProveedor, setEditingProveedor] = useState<Proveedor | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<Partial<Proveedor>>({
    nombre: '',
    tipoContribuyente: 'Consumidor final',
    direccionFiscal: '',
    nombreFantasia: '',
    identificacionTributaria: '',
    ciudadFiscal: '',
    telefono: '',
    email: '',
    personaContacto: '',
    telefonoAlternativo: '',
    emailAlternativo: '',
    comentario: ''
  });

  useEffect(() => {
    loadProveedores();
  }, []);

  useEffect(() => {
    filterProveedores();
  }, [proveedores, searchTerm, searchBy, filterBy]);

  const loadProveedores = async () => {
    try {
      setLoading(true);
      if (!window.electronAPI?.getAllProveedores) {
        console.warn('getAllProveedores no está disponible aún, esperando...');
        setProveedores([]);
        return;
      }
      const data = await window.electronAPI.getAllProveedores();
      setProveedores(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Error cargando proveedores:', error);
      // No mostrar error si el handler no está registrado (probablemente el proceso principal necesita reiniciarse)
      // O si simplemente no hay datos (array vacío)
      const errorMessage = error?.message || '';
      if (errorMessage.includes('No handler registered')) {
        console.warn('Handler no registrado aún, esto es normal al iniciar la aplicación');
        setProveedores([]);
      } else if (errorMessage) {
        // Solo mostrar error si es un error real de conexión o base de datos
        notify.error('Error', 'No se pudieron cargar los proveedores: ' + errorMessage);
        setProveedores([]);
      } else {
        // Si no hay error específico, simplemente inicializar con array vacío
        setProveedores([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const filterProveedores = () => {
    let filtered = [...proveedores];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p => {
        if (searchBy === 'Nombre') {
          return p.nombre?.toLowerCase().includes(term);
        } else if (searchBy === 'Identificación') {
          return p.identificacionTributaria?.toLowerCase().includes(term);
        } else if (searchBy === 'RUT') {
          return p.identificacionTributaria?.toLowerCase().includes(term);
        }
        return true;
      });
    }

    // Ordenar
    filtered.sort((a, b) => {
      if (filterBy === 'Nombre') {
        return (a.nombre || '').localeCompare(b.nombre || '');
      } else if (filterBy === 'Identificación') {
        return (a.identificacionTributaria || '').localeCompare(b.identificacionTributaria || '');
      }
      return 0;
    });

    setFilteredProveedores(filtered);
  };

  const handleSave = async () => {
    if (!formData.nombre?.trim()) {
      notify.error('Error', 'El nombre es obligatorio');
      return;
    }

    try {
      const proveedorToSave: Proveedor = {
        ...formData,
        id: editingProveedor?.id,
        nombre: formData.nombre.trim(),
        activo: editingProveedor?.activo !== undefined ? editingProveedor.activo : true
      };

      await window.electronAPI?.saveProveedor(proveedorToSave);
      notify.success('Éxito', editingProveedor ? 'Proveedor actualizado' : 'Proveedor creado');
      setIsFormOpen(false);
      setEditingProveedor(null);
      resetForm();
      loadProveedores();
    } catch (error: any) {
      notify.error('Error', 'No se pudo guardar el proveedor: ' + (error.message || 'Error desconocido'));
    }
  };

  const handleEdit = (proveedor: Proveedor) => {
    setEditingProveedor(proveedor);
    setFormData({
      nombre: proveedor.nombre || '',
      tipoContribuyente: proveedor.tipoContribuyente || 'Consumidor final',
      direccionFiscal: proveedor.direccionFiscal || '',
      nombreFantasia: proveedor.nombreFantasia || '',
      identificacionTributaria: proveedor.identificacionTributaria || '',
      ciudadFiscal: proveedor.ciudadFiscal || '',
      telefono: proveedor.telefono || '',
      email: proveedor.email || '',
      personaContacto: proveedor.personaContacto || '',
      telefonoAlternativo: proveedor.telefonoAlternativo || '',
      emailAlternativo: proveedor.emailAlternativo || '',
      comentario: proveedor.comentario || ''
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (id: number) => {
    const confirmed = await confirmAction(
      '¿Estás seguro?',
      'Esta acción no se puede deshacer. El proveedor será eliminado permanentemente.'
    );
    
    if (!confirmed) return;

    try {
      await window.electronAPI?.deleteProveedor(id);
      notify.success('Éxito', 'Proveedor eliminado');
      loadProveedores();
    } catch (error: any) {
      notify.error('Error', 'No se pudo eliminar el proveedor: ' + (error.message || 'Error desconocido'));
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      tipoContribuyente: 'Consumidor final',
      direccionFiscal: '',
      nombreFantasia: '',
      identificacionTributaria: '',
      ciudadFiscal: '',
      telefono: '',
      email: '',
      personaContacto: '',
      telefonoAlternativo: '',
      emailAlternativo: '',
      comentario: ''
    });
    setEditingProveedor(null);
  };

  const handleCancel = () => {
    setIsFormOpen(false);
    setEditingProveedor(null);
    resetForm();
  };

  if (isFormOpen) {
    return (
      <div className="flex flex-col h-full bg-background text-foreground">
        <div className="flex items-center justify-end px-6 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium rounded border border-border text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Volver
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium rounded border border-border text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button 
              onClick={handleSave}
              className="btn-primary text-sm px-4 py-2 rounded-md"
            >
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de contribuyente</label>
                    <select 
                      value={formData.tipoContribuyente || 'Consumidor final'}
                      onChange={(e) => setFormData({ ...formData, tipoContribuyente: e.target.value })}
                      className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option>Consumidor final</option>
                      <option>Responsable inscripto</option>
                      <option>Exento</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Dirección fiscal</label>
                    <input
                      type="text"
                      value={formData.direccionFiscal || ''}
                      onChange={(e) => setFormData({ ...formData, direccionFiscal: e.target.value })}
                      className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nombre fantasía</label>
                    <input
                      type="text"
                      value={formData.nombreFantasia || ''}
                      onChange={(e) => setFormData({ ...formData, nombreFantasia: e.target.value })}
                      className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Identificación tributaria</label>
                    <input
                      type="text"
                      value={formData.identificacionTributaria || ''}
                      onChange={(e) => setFormData({ ...formData, identificacionTributaria: e.target.value })}
                      className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Ciudad fiscal</label>
                    <input
                      type="text"
                      value={formData.ciudadFiscal || ''}
                      onChange={(e) => setFormData({ ...formData, ciudadFiscal: e.target.value })}
                      className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <div className="text-sm font-medium text-gray-700 mb-4">Contacto</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Teléfono</label>
                      <input
                        type="text"
                        value={formData.telefono || ''}
                        onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                        className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                      <input
                        type="email"
                        value={formData.email || ''}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Persona contacto</label>
                      <input
                        type="text"
                        value={formData.personaContacto || ''}
                        onChange={(e) => setFormData({ ...formData, personaContacto: e.target.value })}
                        className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Teléfono alternativo</label>
                      <input
                        type="text"
                        value={formData.telefonoAlternativo || ''}
                        onChange={(e) => setFormData({ ...formData, telefonoAlternativo: e.target.value })}
                        className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email alternativo</label>
                      <input
                        type="email"
                        value={formData.emailAlternativo || ''}
                        onChange={(e) => setFormData({ ...formData, emailAlternativo: e.target.value })}
                        className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Comentario</label>
                <textarea
                  rows={3}
                  value={formData.comentario || ''}
                  onChange={(e) => setFormData({ ...formData, comentario: e.target.value })}
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
        <button onClick={() => setIsFormOpen(true)} className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nuevo
        </button>
      </div>

      <Card className="border border-border shadow-sm">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <select
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value)}
                className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option>Nombre</option>
                <option>Identificación</option>
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
                <option>Identificación</option>
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
                  <th className="px-4 py-2 text-left font-semibold">Identificación</th>
                  <th className="px-4 py-2 text-left font-semibold">Teléfono</th>
                  <th className="px-4 py-2 text-left font-semibold">Dirección</th>
                  <th className="px-4 py-2 text-left font-semibold">Ciudad</th>
                  <th className="px-4 py-2 text-left font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="px-4 py-6 text-center" colSpan={6}>
                      Cargando...
                    </td>
                  </tr>
                ) : filteredProveedores.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-center" colSpan={6}>
                      No hay proveedores registrados
                    </td>
                  </tr>
                ) : (
                  filteredProveedores.map((proveedor) => (
                    <tr key={proveedor.id} className="border-b border-border text-gray-700 hover:bg-gray-50">
                      <td className="px-4 py-2">{proveedor.nombre}</td>
                      <td className="px-4 py-2">{proveedor.identificacionTributaria || '-'}</td>
                      <td className="px-4 py-2">{proveedor.telefono || '-'}</td>
                      <td className="px-4 py-2">{proveedor.direccionFiscal || '-'}</td>
                      <td className="px-4 py-2">{proveedor.ciudadFiscal || '-'}</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(proveedor)}
                            className="p-1 text-blue-600 hover:text-blue-800"
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => proveedor.id && handleDelete(proveedor.id)}
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
