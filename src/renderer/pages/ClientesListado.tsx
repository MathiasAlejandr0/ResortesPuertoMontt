import { useEffect, useState, useMemo } from 'react';
import { Search, Plus, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { useApp } from '../contexts/AppContext';
import { notify, confirmAction } from '../utils/cn';
import { Cliente } from '../types';
import ClienteForm from '../components/ClienteForm';
import ClienteVehiculosModal from '../components/ClienteVehiculosModal';

export default function ClientesListadoPage() {
  const { clientes: initialClientes, vehiculos, refreshClientes } = useApp();
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [filterBy, setFilterBy] = useState('Nombre');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchBy, setSearchBy] = useState('Nom, dni');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | undefined>();
  const [vehiculosModalCliente, setVehiculosModalCliente] = useState<Cliente | null>(null);

  const clientes = initialClientes;

  useEffect(() => {
    const handleNuevoCliente = () => {
      setEditingCliente(undefined);
      setIsFormOpen(true);
    };
    window.addEventListener('app:nuevo-cliente', handleNuevoCliente as EventListener);
    return () => window.removeEventListener('app:nuevo-cliente', handleNuevoCliente as EventListener);
  }, []);

  const filteredClientes = useMemo(() => {
    let filtered = [...clientes];

    // Filtrar por estado
    if (filterStatus === 'Activos') {
      filtered = filtered.filter(c => c.activo !== false);
    } else if (filterStatus === 'Inactivos') {
      filtered = filtered.filter(c => c.activo === false);
    }

    // Filtrar por búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(c => {
        if (searchBy === 'Nom, dni' || searchBy === 'Nombre') {
          return c.nombre?.toLowerCase().includes(term) || c.rut?.toLowerCase().includes(term);
        } else if (searchBy === 'RUT') {
          return c.rut?.toLowerCase().includes(term);
        }
        return true;
      });
    }

    return filtered;
  }, [clientes, filterStatus, searchTerm, searchBy]);

  const handleEdit = (cliente: Cliente) => {
    setEditingCliente(cliente);
    setIsFormOpen(true);
  };

  const handleDelete = async (clienteId: number) => {
    const confirmed = await confirmAction(
      '¿Estás seguro?',
      'Esta acción no se puede deshacer. El cliente será eliminado permanentemente.'
    );
    
    if (!confirmed) return;

    try {
      await window.electronAPI?.deleteCliente(clienteId);
      notify.success('Éxito', 'Cliente eliminado');
      refreshClientes();
    } catch (error: any) {
      notify.error('Error', 'No se pudo eliminar el cliente: ' + (error.message || 'Error desconocido'));
    }
  };

  const handleSaveCliente = async (cliente: Cliente) => {
    try {
      await refreshClientes();
      setIsFormOpen(false);
      setEditingCliente(undefined);
      notify.success('Éxito', editingCliente ? 'Cliente actualizado' : 'Cliente creado');
    } catch (error: any) {
      notify.error('Error', 'No se pudo guardar el cliente');
    }
  };

  const getVehiculosCount = (clienteId: number) => {
    return vehiculos.filter(v => v.clienteId === clienteId).length;
  };

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8 bg-background text-foreground">
      <div className="flex items-center justify-end gap-2">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          <option>Todos</option>
          <option>Activos</option>
          <option>Inactivos</option>
        </select>
        <button onClick={() => { setEditingCliente(undefined); setIsFormOpen(true); }} className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nuevo
        </button>
      </div>

      <Card className="border border-border shadow-sm">
        <CardContent className="p-4 space-y-4">
          <div className="rounded-md bg-sky-600 text-white text-sm px-4 py-3">
            Hemos actualizado el sistema de asociación de clientes y Vehículos. Además de la asignación automática que se realiza al crear una orden de servicio, ahora puedes administrar los Vehículos asociados a tus clientes de manera independiente. Puedes administrar los Vehículos de tus clientes desde este apartado haciendo clic en "Editar" sobre el cliente con el que deseas trabajar. Los Vehículos actualmente asignados se deben a una vinculación automática de tu histórico de órdenes con los clientes que tienen un número de identificación único, como el RUT o el correo electrónico.
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <select
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value)}
                className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option>Nombre</option>
                <option>Identificación</option>
                <option>Condición</option>
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
                <option>Nom, dni</option>
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
                  <th className="px-4 py-2 text-left font-semibold">Identificación</th>
                  <th className="px-4 py-2 text-left font-semibold">Condición</th>
                  <th className="px-4 py-2 text-left font-semibold">Teléfono</th>
                  <th className="px-4 py-2 text-left font-semibold">Dirección</th>
                  <th className="px-4 py-2 text-left font-semibold">Ciudad</th>
                  <th className="px-4 py-2 text-left font-semibold">Vehículos</th>
                  <th className="px-4 py-2 text-left font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredClientes.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-center" colSpan={8}>
                      No hay clientes registrados
                    </td>
                  </tr>
                ) : (
                  filteredClientes.map((cliente) => (
                    <tr key={cliente.id} className="border-b border-border text-gray-700 hover:bg-gray-50">
                      <td className="px-4 py-2">{cliente.nombre}</td>
                      <td className="px-4 py-2">{cliente.rut || '-'}</td>
                      <td className="px-4 py-2">{cliente.activo !== false ? 'Activo' : 'Inactivo'}</td>
                      <td className="px-4 py-2">{cliente.telefono || '-'}</td>
                      <td className="px-4 py-2">{cliente.direccion || '-'}</td>
                      <td className="px-4 py-2">-</td>
                      <td className="px-4 py-2">{getVehiculosCount(cliente.id || 0)}</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(cliente)}
                            className="p-1 text-blue-600 hover:text-blue-800"
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setVehiculosModalCliente(cliente)}
                            className="p-1 text-green-600 hover:text-green-800"
                            title="Gestionar vehículos"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => cliente.id && handleDelete(cliente.id)}
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

      <ClienteForm
        cliente={editingCliente}
        isOpen={isFormOpen}
        onClose={() => { setIsFormOpen(false); setEditingCliente(undefined); }}
        onSave={handleSaveCliente}
      />

      {vehiculosModalCliente && (
        <ClienteVehiculosModal
          cliente={vehiculosModalCliente}
          isOpen={!!vehiculosModalCliente}
          onClose={() => setVehiculosModalCliente(null)}
        />
      )}
    </div>
  );
}
