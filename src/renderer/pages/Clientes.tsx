import { useState, useEffect, useMemo, useDeferredValue, startTransition, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import StatCard from '../components/StatCard';
import ClienteForm from '../components/ClienteForm';
import ClienteVehiculosModal from '../components/ClienteVehiculosModal';
import { RichTable, Column } from '../components/RichTable';
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

  // Preparar datos para RichTable
  const clientesTableData = useMemo(() => {
    return filteredClientes.map(cliente => ({
      ...cliente,
      vehiculosCount: getVehiculosCliente(cliente.id || 0).length,
      ultimaVisita: getUltimaVisita(cliente.id || 0),
      totalGastado: getTotalGastado(cliente.id || 0),
    }));
  }, [filteredClientes, vehiculos, ordenes]);

  // Columnas para RichTable
  const columns: Column<typeof clientesTableData[0]>[] = useMemo(() => [
    {
      key: 'nombre',
      header: 'Cliente',
      sortable: true,
      accessor: (row) => (
        <div>
          <p className="font-semibold text-foreground">{row.nombre}</p>
          <p className="text-sm text-muted-foreground">CLI-{String(row.id).padStart(3, '0')}</p>
        </div>
      ),
    },
    {
      key: 'contacto',
      header: 'Contacto',
      sortable: false,
      accessor: (row) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-foreground">{row.email || 'N/A'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-foreground">{row.telefono}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'vehiculos',
      header: 'Vehículos',
      sortable: true,
      accessor: (row) => (
        <div className="flex items-center gap-2">
          <Car className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-foreground">
            {row.vehiculosCount} vehículo{row.vehiculosCount !== 1 ? 's' : ''}
          </span>
          <button 
            className="text-xs underline text-primary ml-2" 
            onClick={() => setVehiculosModalCliente(row)}
          >
            editar
          </button>
        </div>
      ),
    },
    {
      key: 'ultimaVisita',
      header: 'Última Visita',
      sortable: true,
      accessor: (row) => (
        <span className="text-sm text-foreground">{row.ultimaVisita}</span>
      ),
    },
    {
      key: 'totalGastado',
      header: 'Total Gastado',
      sortable: true,
      accessor: (row) => (
        <span className="font-semibold text-foreground">
          ${row.totalGastado.toLocaleString()}
        </span>
      ),
    },
  ], []);

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Acciones rápidas */}
      <div className="flex items-center justify-end gap-3">
        <button 
          onClick={handleNewCliente}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Nuevo Cliente
        </button>
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
      <RichTable
        data={clientesTableData}
        columns={columns}
        searchable={true}
        searchPlaceholder="Buscar por nombre, email o teléfono..."
        onEdit={(row) => handleEditCliente(row)}
        onDelete={(row) => row.id && handleDeleteCliente(row.id)}
        emptyMessage={searchTerm ? 'No se encontraron clientes con ese criterio' : 'No hay clientes registrados'}
      />

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
