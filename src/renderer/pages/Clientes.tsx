import { useState, useEffect, useMemo, useDeferredValue, startTransition, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import StatCard from '../components/StatCard';
import ClienteForm from '../components/ClienteForm';
import ClienteVehiculosModal from '../components/ClienteVehiculosModal';
import { useApp } from '../contexts/AppContext';
import { notify, confirmAction, Logger } from '../utils/cn';
import { 
  Users, 
  Truck, 
  Calendar, 
  DollarSign, 
  Search, 
  Plus, 
  Edit, 
  Trash2,
  Mail,
  Phone,
  Car,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Cliente, Vehiculo, OrdenTrabajo } from '../types';

export default function ClientesPage() {
  // Usar el contexto para acceder a los datos
  const { clientes: initialClientes, vehiculos, ordenes, refreshClientes, refreshVehiculos } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Usar clientes directamente del contexto
  const clientes = initialClientes;
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | undefined>();
  const [vehiculosModalCliente, setVehiculosModalCliente] = useState<Cliente | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);

  // Usar deferred value para búsqueda (no bloquea la UI)
  const deferredSearchTerm = useDeferredValue(searchTerm);

  // Filtrar clientes con useMemo para evitar re-renders innecesarios
  const filteredClientes = useMemo(() => {
    if (deferredSearchTerm) {
      const searchLower = deferredSearchTerm.toLowerCase();
      return clientes.filter(cliente => 
        cliente.nombre.toLowerCase().includes(searchLower) ||
        (cliente.email && cliente.email.toLowerCase().includes(searchLower)) ||
        cliente.telefono.includes(deferredSearchTerm)
      );
    }
    return clientes;
  }, [deferredSearchTerm, clientes]); // useMemo evita re-renders innecesarios

  // Calcular paginación
  const totalPages = Math.ceil(filteredClientes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentClientes = filteredClientes.slice(startIndex, endIndex);

  // Resetear página cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Listener para abrir formulario desde menú
  useEffect(() => {
    const handler = () => {
      setEditingCliente(undefined);
      setIsFormOpen(true);
    };
    window.addEventListener('app:nuevo-cliente', handler as any);
    return () => window.removeEventListener('app:nuevo-cliente', handler as any);
  }, []);

  // Calcular estadísticas
  const totalClientes = clientes.length;
  const clientesActivos = clientes.filter(c => c.activo).length;
  const ingresosTotales = ordenes.reduce((sum, orden) => sum + (orden.total || 0), 0);

  // Función para obtener vehículos de un cliente
  const getVehiculosCliente = (clienteId: number) => {
    return vehiculos.filter(v => v.clienteId === clienteId);
  };

  // Función para obtener última visita
  const getUltimaVisita = (clienteId: number) => {
    const ordenesCliente = ordenes.filter(o => o.clienteId === clienteId);
    if (ordenesCliente.length === 0) return 'N/A';
    
    const ultimaOrden = ordenesCliente.sort((a, b) => 
      new Date(b.fechaIngreso || 0).getTime() - new Date(a.fechaIngreso || 0).getTime()
    )[0];
    
    return ultimaOrden.fechaIngreso ? 
      new Date(ultimaOrden.fechaIngreso).toLocaleDateString('es-ES', { 
        day: 'numeric', 
        month: 'numeric', 
        year: 'numeric' 
      }) : 'N/A';
  };

  // Funciones CRUD (memoizadas con useCallback)
  const handleSaveCliente = useCallback(async (clienteData: Cliente) => {
    setIsLoading(true);
    // Capturar si estamos editando antes de limpiar el estado
    const wasEditing = !!editingCliente;
    
    try {
      // A partir del nuevo flujo, ClienteForm ya realiza el guardado atómico
      // Aquí solo refrescamos clientes y vehículos para reflejar la cantidad correctamente
        setIsFormOpen(false);
        setEditingCliente(undefined);
        
      if (typeof refreshVehiculos === 'function') {
        await Promise.all([refreshClientes(), refreshVehiculos()]);
      } else {
        await refreshClientes();
      }

        setTimeout(() => {
          notify.success(wasEditing ? 'Cliente actualizado exitosamente' : 'Cliente creado exitosamente');
        }, 100);
    } catch (error: any) {
      Logger.error('Error guardando cliente:', error);
      // No cerrar el formulario si hay error, para que el usuario pueda corregir
      // El error será manejado por ClienteForm
      throw error; // Re-lanzar el error para que ClienteForm lo maneje
    } finally {
      setIsLoading(false);
    }
  }, [refreshClientes, refreshVehiculos]);

  const handleEditCliente = useCallback((cliente: Cliente) => {
    setEditingCliente(cliente);
    setIsFormOpen(true);
  }, []);

  const handleDeleteCliente = useCallback(async (clienteId: number) => {
    const confirmed = await confirmAction(
      '¿Estás seguro de que quieres eliminar este cliente?',
      'Esta acción también eliminará sus vehículos y cotizaciones/órdenes asociadas.'
    );
    
    if (!confirmed) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await window.electronAPI.deleteCliente(clienteId);
      if (result) {
        // Refrescar clientes y vehículos para reflejar el borrado en cascada
        if (typeof refreshVehiculos === 'function') {
          await Promise.all([refreshClientes(), refreshVehiculos()]);
        } else {
          await refreshClientes();
        }
        notify.success('Cliente eliminado exitosamente');
      } else {
        notify.error('No se pudo eliminar el cliente');
      }
    } catch (error) {
      Logger.error('Error eliminando cliente:', error);
      notify.error('Error al eliminar el cliente', error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  }, [refreshClientes, refreshVehiculos]);

  const handleNewCliente = useCallback(() => {
    setEditingCliente(undefined);
    setIsFormOpen(true);
  }, []);

  const handleCloseForm = useCallback(() => {
    // Asegurarse de limpiar el estado al cerrar
    setIsFormOpen(false);
    setEditingCliente(undefined);
    setIsLoading(false);
  }, []);

  // Función para obtener total gastado
  const getTotalGastado = (clienteId: number) => {
    const ordenesCliente = ordenes.filter(o => o.clienteId === clienteId);
    const total = ordenesCliente.reduce((sum, orden) => sum + (orden.total || 0), 0);
    return total;
  };

  return (
    <div className="flex flex-col gap-8 p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-3 pb-2 border-b border-border">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-card-foreground">Clientes</h1>
            <p className="text-base text-muted-foreground mt-2">Gestiona la información de tus clientes</p>
          </div>
            <button 
              onClick={handleNewCliente}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="h-5 w-5" />
              Nuevo Cliente
            </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="stat-card-animated fade-in-up">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Total Clientes
                </p>
                <p className="text-3xl font-bold text-card-foreground tracking-tight">
                  {totalClientes}
                </p>
              </div>
              <div className="icon-red rounded-xl p-3.5 shadow-sm">
                <Truck className="h-7 w-7" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card-animated fade-in-up">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Clientes Activos
                </p>
                <p className="text-3xl font-bold text-card-foreground tracking-tight">
                  {clientesActivos}
                </p>
              </div>
              <div className="icon-green rounded-xl p-3.5 shadow-sm">
                <Calendar className="h-7 w-7" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card-animated fade-in-up">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Ingresos Totales
                </p>
                <p className="text-3xl font-bold text-card-foreground tracking-tight">
                  ${ingresosTotales.toLocaleString()}
                </p>
              </div>
              <div className="icon-red rounded-xl p-3.5 shadow-sm">
                <DollarSign className="h-7 w-7" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Clientes */}
      <Card className="shadow-sm border border-border">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl font-bold text-card-foreground">Lista de Clientes</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por nombre, email o teléfono..."
                value={searchTerm}
                onChange={(e) => {
                  // Actualizar inmediatamente para que el usuario vea los caracteres
                  // El filtrado se hará con deferredSearchTerm (no bloquea)
                  setSearchTerm(e.target.value);
                }}
                className="pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 w-80"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Cliente</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Contacto</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Vehículos</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Última Visita</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Total Gastado</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {currentClientes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-muted-foreground">
                      {searchTerm ? 'No se encontraron clientes con ese criterio' : 'No hay clientes registrados'}
                    </td>
                  </tr>
                ) : (
                  currentClientes.map((cliente) => {
                    const vehiculosCliente = getVehiculosCliente(cliente.id || 0);
                    const ultimaVisita = getUltimaVisita(cliente.id || 0);
                    const totalGastado = getTotalGastado(cliente.id || 0);
                    
                    return (
                      <tr key={cliente.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                        <td className="py-4 px-4">
                          <div>
                            <p className="font-semibold text-card-foreground">{cliente.nombre}</p>
                            <p className="text-sm text-muted-foreground">CLI-{String(cliente.id).padStart(3, '0')}</p>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-card-foreground">{cliente.email}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-card-foreground">{cliente.telefono}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <Car className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-card-foreground">
                              {vehiculosCliente.length} vehículo{vehiculosCliente.length !== 1 ? 's' : ''}
                            </span>
                            <button className="text-xs underline text-primary ml-2" onClick={() => setVehiculosModalCliente(cliente)}>
                              editar
                            </button>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm text-card-foreground">{ultimaVisita}</span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="font-semibold text-card-foreground">
                            ${totalGastado.toLocaleString()}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => handleEditCliente(cliente)}
                              className="p-2 hover:bg-muted rounded-lg transition-colors" 
                              title="Editar cliente"
                            >
                              <Edit className="h-4 w-4 text-primary" />
                            </button>
                            <button 
                              onClick={() => cliente.id && handleDeleteCliente(cliente.id)}
                              className="p-2 hover:bg-muted rounded-lg transition-colors" 
                              title="Eliminar cliente"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
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
          
          {/* Controles de Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <div className="text-sm text-muted-foreground">
                Mostrando {startIndex + 1} a {Math.min(endIndex, filteredClientes.length)} de {filteredClientes.length} clientes
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Página anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                        page === currentPage
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Página siguiente"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Formulario Modal */}
      <ClienteForm
        cliente={editingCliente}
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        onSave={handleSaveCliente}
        title={editingCliente ? "Editar Cliente" : "Nuevo Cliente"}
        subtitle={editingCliente ? "Modifica la información del cliente" : "Agrega un nuevo cliente al sistema"}
      />

      {vehiculosModalCliente && (
        <ClienteVehiculosModal 
          cliente={vehiculosModalCliente} 
          vehiculos={vehiculos}
          isOpen={!!vehiculosModalCliente}
          onClose={() => setVehiculosModalCliente(null)}
          onSaved={() => refreshVehiculos && refreshVehiculos()}
        />
      )}
    </div>
  );
}
