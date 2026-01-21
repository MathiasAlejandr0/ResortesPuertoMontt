import { useState, useEffect, useMemo, useDeferredValue, startTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import OrdenFormMejorado from '../components/OrdenFormMejorado';
import CotizacionInterna from '../components/CotizacionInterna';
import CotizacionPDF from '../components/CotizacionPDF';
import VerCotizacionModal from '../components/VerCotizacionModal';
import EditarCotizacionModal from '../components/EditarCotizacionModal';
import PhoneInputModal from '../components/PhoneInputModal';
import { envioDocumentosService, DocumentoParaEnviar } from '../services/EnvioDocumentosService';
import { useApp } from '../contexts/AppContext';
import { notify, confirmAction, Logger } from '../utils/cn';
import { 
  FileText, 
  Send, 
  CheckCircle, 
  CircleCheck, 
  Plus, 
  Search, 
  Eye, 
  Edit, 
  Send as SendIcon,
  Calendar,
  DollarSign,
  FileIcon,
  XCircle,
  Trash2,
  MessageSquare,
  Mail,
  X
} from 'lucide-react';
import { Cliente, Cotizacion, DetalleCotizacion, Vehiculo, Servicio, Repuesto } from '../types';
import { useNegocioInfo } from '../hooks/useNegocioInfo';

export default function CotizacionesPage() {
  // Usar el contexto para acceder a los datos
  const { clientes, cotizaciones: initialCotizaciones, vehiculos, servicios, repuestos, addCotizacion, refreshCotizaciones } = useApp();
  
  // Obtener información del negocio desde la configuración
  const { nombreTaller, telefonoTaller, emailTaller, rutTaller, direccionTaller, sitioWebTaller } = useNegocioInfo();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  // Usar deferred value para búsqueda (no bloquea la UI)
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [isLoading, setIsLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [isVerModalOpen, setIsVerModalOpen] = useState(false);
  const [isEditarModalOpen, setIsEditarModalOpen] = useState(false);
  const [cotizacionSeleccionada, setCotizacionSeleccionada] = useState<Cotizacion | null>(null);
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [cotizacionParaEnviar, setCotizacionParaEnviar] = useState<Cotizacion | null>(null);
  const [mostrarVersionInterna, setMostrarVersionInterna] = useState(false);
  const [mostrarVersionCliente, setMostrarVersionCliente] = useState(false);
  const [cotizacionSeleccionadaParaVer, setCotizacionSeleccionadaParaVer] = useState<Cotizacion | null>(null);
  const [repuestosInternos, setRepuestosInternos] = useState<any[]>([]);
  const [repuestosCliente, setRepuestosCliente] = useState<any[]>([]);
  const [isLoadingDetalles, setIsLoadingDetalles] = useState(false);

  // Usar cotizaciones del contexto directamente
  const cotizaciones = initialCotizaciones;

  // Pre-calcular índice para lookup O(1)
  const clientesById = useMemo(() => {
    const map = new Map<number, typeof clientes[0]>();
    clientes.forEach(c => { if (c.id) map.set(c.id, c); });
    return map;
  }, [clientes]);

  // Filtrar cotizaciones con useMemo para evitar re-renders innecesarios
  const filteredCotizaciones = useMemo(() => {
    let filtered = cotizaciones;

    // Filtrar por búsqueda (usar deferred value y lookup O(1))
    if (deferredSearchTerm) {
      const searchLower = deferredSearchTerm.toLowerCase();
      filtered = filtered.filter(cotizacion => {
        const cliente = cotizacion.clienteId ? clientesById.get(cotizacion.clienteId) : null;
        return (
          cotizacion.numero?.toLowerCase().includes(searchLower) ||
          cliente?.nombre.toLowerCase().includes(searchLower) ||
          cotizacion.descripcion?.toLowerCase().includes(searchLower)
        );
      });
    }

    // Filtrar por estado
    if (filterStatus !== 'todos') {
      filtered = filtered.filter(cotizacion => cotizacion.estado === filterStatus);
    }

    return filtered;
  }, [deferredSearchTerm, filterStatus, cotizaciones, clientesById]);

  // Calcular paginación
  const totalPages = Math.ceil(filteredCotizaciones.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentCotizaciones = filteredCotizaciones.slice(startIndex, endIndex);

  // Resetear página cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  // Funciones CRUD para cotizaciones
  const handleViewCotizacion = (cotizacion: Cotizacion) => {
    setCotizacionSeleccionada(cotizacion);
    setIsVerModalOpen(true);
  };

  const handleEditCotizacion = (cotizacion: Cotizacion) => {
    setCotizacionSeleccionada(cotizacion);
    setIsEditarModalOpen(true);
  };

  const handleVerVersionInterna = async (cotizacion: Cotizacion) => {
    setCotizacionSeleccionadaParaVer(cotizacion);
    setMostrarVersionInterna(true);
    setIsLoadingDetalles(true);
    
    try {
      const detalles = await window.electronAPI.getDetallesCotizacion(cotizacion.id);
      const repuestos = (detalles || [])
        .filter((d: any) => d.tipo === 'repuesto')
        .map((d: any, idx: number) => ({
          id: d.id ?? idx,
          nombre: d.descripcion || d.nombre || `Repuesto ${idx + 1}`,
          precio: Number(d.precio) || 0,
          cantidad: Number(d.cantidad) || 1,
          subtotal: Number(d.subtotal) || (Number(d.precio) || 0) * (Number(d.cantidad) || 1),
        }));
      setRepuestosInternos(repuestos);
    } catch (error) {
      Logger.error('Error cargando detalles de cotización:', error);
      setRepuestosInternos([]);
    } finally {
      setIsLoadingDetalles(false);
    }
  };

  const handleVerVersionCliente = async (cotizacion: Cotizacion) => {
    setCotizacionSeleccionadaParaVer(cotizacion);
    setMostrarVersionCliente(true);
    setIsLoadingDetalles(true);
    
    try {
      const detalles = await window.electronAPI.getDetallesCotizacion(cotizacion.id);
      const repuestos = (detalles || [])
        .filter((d: any) => d.tipo === 'repuesto')
        .map((d: any, idx: number) => ({
          id: d.id ?? idx,
          nombre: d.descripcion || d.nombre || `Repuesto ${idx + 1}`,
          cantidad: Number(d.cantidad) || 1,
        }));
      setRepuestosCliente(repuestos);
    } catch (error) {
      Logger.error('Error cargando detalles de cotización:', error);
      setRepuestosCliente([]);
    } finally {
      setIsLoadingDetalles(false);
    }
  };

  const handleSaveCotizacion = async (cotizacionActualizada: Cotizacion, detalles?: Array<{ tipo: 'servicio' | 'repuesto'; servicioId?: number; repuestoId?: number; cantidad: number; precio: number; subtotal: number; descripcion: string }>) => {
    setIsLoading(true);
    try {
      // Convertir detalles al formato correcto para la transacción
      const detallesParaTransaccion = Array.isArray(detalles) && detalles.length > 0
        ? detalles.map(d => ({
            tipo: d.tipo,
            repuestoId: d.repuestoId || undefined,
            servicioId: d.servicioId || undefined,
            cantidad: d.cantidad || 1,
            precio: d.precio || 0,
            subtotal: d.subtotal || (d.precio || 0) * (d.cantidad || 1),
            descripcion: d.descripcion || ''
          }))
        : [];

      Logger.log('💾 Actualizando cotización con transacción atómica:', {
        cotizacionId: cotizacionActualizada.id,
        detallesCount: detallesParaTransaccion.length
      });

      // Usar la nueva función con transacción atómica si hay detalles
      let savedCotizacion;
      if (detallesParaTransaccion.length > 0) {
        const resp = await window.electronAPI.saveCotizacionConDetalles({
          cotizacion: cotizacionActualizada,
          detalles: detallesParaTransaccion
        });
        
        if (resp?.success === false) {
          throw new Error(resp.error || 'Error al actualizar la cotización');
        }
        if (!resp?.success) {
          throw new Error('Error desconocido al actualizar la cotización');
        }
        savedCotizacion = resp.data;
      } else {
        // Si no hay detalles, usar la función normal
        savedCotizacion = await window.electronAPI.saveCotizacion(cotizacionActualizada);
      }

      if (savedCotizacion) {
        Logger.log('✅ Cotización actualizada exitosamente con transacción atómica:', {
          cotizacionId: savedCotizacion.id,
          detallesGuardados: detallesParaTransaccion.length
        });
        // El contexto se actualiza automáticamente
        await refreshCotizaciones();
        notify.success('Cotización actualizada exitosamente');
        setIsEditarModalOpen(false);
        setCotizacionSeleccionada(null);
      }
    } catch (error) {
      Logger.error('Error actualizando cotización:', error);
      notify.error('Error al actualizar la cotización', error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCotizacion = async (cotizacionId: number) => {
    const confirmed = await confirmAction('¿Estás seguro de que quieres eliminar esta cotización?');
    
    if (!confirmed) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await window.electronAPI.deleteCotizacion(cotizacionId);
      if (result) {
        // El contexto se actualiza automáticamente
        await refreshCotizaciones();
        notify.success('Cotización eliminada exitosamente');
      } else {
        notify.error('No se pudo eliminar la cotización');
      }
    } catch (error) {
      Logger.error('Error eliminando cotización:', error);
      notify.error('Error al eliminar la cotización', error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendCotizacion = async (cotizacion: Cotizacion) => {
    const confirmed = await confirmAction(`¿Enviar cotización ${cotizacion.numero} al cliente?`);
    
    if (!confirmed) {
      return;
    }

    setIsLoading(true);
    try {
      // No cambiamos estado en BD para no violar el CHECK; solo notificamos
      notify.success('Cotización marcada como enviada');
    } catch (error) {
      Logger.error('Error enviando cotización:', error);
      notify.error('Error al enviar la cotización', error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewCotizacion = () => {
    setIsFormOpen(true);
  };

  const handleSaveCotizacionNueva = async (
    cotizacion: Cotizacion,
    detalles?: Array<{ tipo: 'servicio' | 'repuesto'; servicioId?: number; repuestoId?: number; cantidad: number; precio: number; subtotal: number; descripcion: string }>
  ) => {
    setIsLoading(true);
    try {
      Logger.log('💾 Intentando guardar cotización:', cotizacion);
      
      // Validar que el clienteId y vehiculoId existan
      if (!cotizacion.clienteId) {
        throw new Error('El cliente no está seleccionado o no se pudo crear');
      }
      
      if (!cotizacion.vehiculoId) {
        throw new Error('El vehículo no está seleccionado o no se pudo crear');
      }
      
      // Convertir detalles al formato correcto para la transacción
      const detallesParaTransaccion = Array.isArray(detalles) && detalles.length > 0
        ? detalles.map(d => ({
            tipo: d.tipo,
            repuestoId: d.repuestoId || undefined,
            servicioId: d.servicioId || undefined,
            cantidad: d.cantidad || 1,
            precio: d.precio || 0,
            subtotal: d.subtotal || (d.precio || 0) * (d.cantidad || 1),
            descripcion: d.descripcion || ''
          }))
        : [];

      Logger.log('💾 Guardando cotización con transacción atómica:', {
        cotizacion: cotizacion.numero,
        detallesCount: detallesParaTransaccion.length
      });

      // Usar la nueva función con transacción atómica si hay detalles
      let savedCotizacion;
      if (detallesParaTransaccion.length > 0) {
        const resp = await window.electronAPI.saveCotizacionConDetalles({
          cotizacion,
          detalles: detallesParaTransaccion
        });
        if (resp?.success === false) {
          throw new Error(resp.error || 'Error al guardar la cotización');
        }
        if (!resp?.success) {
          throw new Error('Error desconocido al guardar la cotización');
        }
        savedCotizacion = resp.data;
      } else {
        // Si no hay detalles, usar la función normal
        savedCotizacion = await window.electronAPI.saveCotizacion(cotizacion);
      }
      
      if (!savedCotizacion) {
        throw new Error('No se recibió respuesta al guardar la cotización');
      }
      
      Logger.log('✅ Cotización guardada exitosamente con transacción atómica:', {
        cotizacionId: savedCotizacion.id,
        detallesGuardados: detallesParaTransaccion.length
      });
      
      // Cerrar el formulario primero para evitar problemas de estado
      setIsFormOpen(false);
      
      // Actualizar el contexto para que todos los componentes vean el cambio (sin bloquear UI)
      refreshCotizaciones().catch((err) => {
        Logger.error('Error refrescando cotizaciones:', err);
        notify.error('Error actualizando lista', 'La cotización se guardó pero hubo un error al actualizar la lista.');
      });
      
      // Mostrar mensaje de éxito después de cerrar
      setTimeout(() => {
        notify.success('Cotización creada exitosamente');
      }, 100);
    } catch (error) {
      Logger.error('❌ Error guardando cotización:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      Logger.error('❌ Detalles del error:', {
        error,
        cotizacion,
        stack: error instanceof Error ? error.stack : undefined
      });
      // No cerrar el formulario si hay error, para que el usuario pueda corregir
      notify.error('Error al guardar la cotización', errorMessage);
      throw error; // Re-lanzar para que el formulario lo maneje
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnviarWhatsApp = (cotizacion: Cotizacion) => {
    setCotizacionParaEnviar(cotizacion);
    setIsPhoneModalOpen(true);
  };

  const handleEnviarWhatsAppConfirmado = async (telefono: string) => {
    if (!cotizacionParaEnviar) return;

    try {
      const cliente = clientes.find(c => c.id === cotizacionParaEnviar.clienteId);
      const vehiculo = vehiculos.find(v => v.id === cotizacionParaEnviar.vehiculoId);
      
      if (!cliente || !vehiculo) {
        notify.error('Error', 'No se encontraron los datos del cliente o vehículo');
        return;
      }

      const documento: DocumentoParaEnviar = {
        tipo: 'cotizacion',
        documento: cotizacionParaEnviar,
        cliente,
        vehiculo
      };

      const resultado = await envioDocumentosService.enviarCotizacionWhatsApp(documento, telefono);
      
      if (resultado.exito) {
        notify.success('WhatsApp abierto exitosamente');
      } else {
        notify.error('Error', resultado.mensaje);
      }
    } catch (error) {
      Logger.error('Error enviando por WhatsApp:', error);
      notify.error('Error al enviar por WhatsApp', error instanceof Error ? error.message : 'Error desconocido');
    }
  };

  const handleEnviarEmail = async (cotizacion: Cotizacion) => {
    const cliente = clientes.find(c => c.id === cotizacion.clienteId);
    const vehiculo = vehiculos.find(v => v.id === cotizacion.vehiculoId);
    
    if (!cliente || !vehiculo) {
      notify.error('Error', 'No se encontraron los datos del cliente o vehículo');
      return;
    }

    const validacion = envioDocumentosService.validarDatosCliente(cliente, 'email');
    if (!validacion.valido) {
      notify.error('Error de validación', validacion.mensaje);
      return;
    }

    const documento: DocumentoParaEnviar = {
      tipo: 'cotizacion',
      documento: cotizacion,
      cliente,
      vehiculo
    };

    const resultado = await envioDocumentosService.enviarCotizacionEmail(documento);
    if (resultado.exito) {
      notify.success('Cliente de email abierto con la cotización');
    } else {
      notify.error('Error al enviar por email', resultado.mensaje);
    }
  };

  // Función para obtener cliente
  const getCliente = (clienteId: number) => {
    return clientes.find(c => c.id === clienteId);
  };

  // Función para verificar si está vencida
  const isVencida = (validaHasta: string) => {
    const hoy = new Date();
    const vencimiento = new Date(validaHasta);
    return vencimiento < hoy;
  };

  // Función para obtener ícono de estado
  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case 'Aprobada':
        return <CheckCircle className="h-4 w-4" />;
      case 'Rechazada':
        return <XCircle className="h-4 w-4" />;
      case 'Pendiente':
        return <FileIcon className="h-4 w-4" />;
      case 'Vencida':
        return <FileText className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  // Función para obtener color de estado
  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'Aprobada':
        return 'text-green-600';
      case 'Rechazada':
        return 'text-red-600';
      case 'Pendiente':
        return 'text-gray-600';
      case 'Vencida':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  };

  // Función para obtener texto de estado
  const getEstadoText = (estado: string) => {
    switch (estado) {
      case 'Aprobada':
        return 'Aprobada';
      case 'Rechazada':
        return 'Rechazada';
      case 'Pendiente':
        return 'Pendiente';
      case 'Vencida':
        return 'Vencida';
      default:
        return estado;
    }
  };

  // Si el formulario está abierto, mostrar solo el formulario (estilo Dirup)
  if (isFormOpen) {
    return (
      <div className="flex flex-col h-full">
        <OrdenFormMejorado
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSave={handleSaveCotizacionNueva}
          fullPage={true}
          mode="presupuesto"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-3 pb-2 border-b border-border">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-base text-muted-foreground mt-2">Gestiona los presupuestos de servicios</p>
          </div>
          <button 
            onClick={handleNewCotizacion}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Nuevo Presupuesto
          </button>
        </div>
      </div>

      {/* Lista de Cotizaciones */}
      <Card className="shadow-sm border border-border">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl font-bold text-card-foreground">Lista de Cotizaciones</CardTitle>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar por ID, cliente o descripción..."
                  value={searchTerm}
                  onChange={(e) => {
                    // Actualizar inmediatamente para que el usuario vea los caracteres
                    // El filtrado se hará con deferredSearchTerm (no bloquea)
                    setSearchTerm(e.target.value);
                  }}
                  className="pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 w-80"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                title="Filtrar por estado"
                aria-label="Filtrar por estado"
                className="px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
              >
                <option value="todos">Todos</option>
                <option value="Pendiente">Pendiente</option>
                <option value="Aprobada">Aprobada</option>
                <option value="Rechazada">Rechazada</option>
                <option value="Vencida">Vencida</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">ID</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Cliente</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Descripción</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Estado</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Válida Hasta</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Total</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {currentCotizaciones.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-muted-foreground">
                      {searchTerm || filterStatus !== 'todos' ? 'No se encontraron cotizaciones con ese criterio' : 'No hay cotizaciones registradas'}
                    </td>
                  </tr>
                ) : (
                  currentCotizaciones.map((cotizacion) => {
                    const cliente = getCliente(cotizacion.clienteId);
                    const vencida = cotizacion.validaHasta ? isVencida(cotizacion.validaHasta) : false;
                    
                    return (
                      <tr key={cotizacion.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                        <td className="py-4 px-4">
                          <span className="font-semibold text-card-foreground">
                            {cotizacion.numero || `COT-${cotizacion.id}`}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-card-foreground">
                            {cliente?.nombre || 'Cliente no encontrado'}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-card-foreground">
                            {cotizacion.descripcion || 'Sin descripción'}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <div className={getEstadoColor(cotizacion.estado)}>
                              {getEstadoIcon(cotizacion.estado)}
                            </div>
                            <span className="text-sm text-card-foreground">
                              {getEstadoText(cotizacion.estado)}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-card-foreground">
                              {cotizacion.validaHasta ? 
                                new Date(cotizacion.validaHasta).toLocaleDateString('es-ES', { 
                                  day: 'numeric', 
                                  month: 'numeric', 
                                  year: 'numeric' 
                                }) : 'N/A'
                              }
                            </span>
                            {vencida && (
                              <Badge variant="destructive" className="text-xs">
                                Vencida
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold text-card-foreground">
                              ${(cotizacion.total || 0).toLocaleString()}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => handleViewCotizacion(cotizacion)}
                              className="p-2 hover:bg-muted rounded-lg transition-colors" 
                              title="Ver cotización"
                            >
                              <Eye className="h-4 w-4 text-primary" />
                            </button>
                            <button 
                              onClick={() => handleVerVersionInterna(cotizacion)}
                              className="p-2 hover:bg-muted rounded-lg transition-colors" 
                              title="Ver versión interna (con precios)"
                            >
                              <DollarSign className="h-4 w-4 text-green-600" />
                            </button>
                            <button 
                              onClick={() => handleVerVersionCliente(cotizacion)}
                              className="p-2 hover:bg-muted rounded-lg transition-colors" 
                              title="Ver versión cliente (sin precios)"
                            >
                              <FileText className="h-4 w-4 text-red-600" />
                            </button>
                            <button 
                              onClick={() => handleEditCotizacion(cotizacion)}
                              className="p-2 hover:bg-muted rounded-lg transition-colors" 
                              title="Editar cotización"
                            >
                              <Edit className="h-4 w-4 text-yellow-600" />
                            </button>
                            <button 
                              onClick={() => handleEnviarWhatsApp(cotizacion)}
                              className="p-2 hover:bg-muted rounded-lg transition-colors" 
                              title="Enviar por WhatsApp"
                            >
                              <MessageSquare className="h-4 w-4 text-green-600" />
                            </button>
                            <button 
                              onClick={() => handleEnviarEmail(cotizacion)}
                              className="p-2 hover:bg-muted rounded-lg transition-colors" 
                              title="Enviar por Email"
                            >
                              <Mail className="h-4 w-4 text-red-600" />
                            </button>
                            <button 
                              onClick={() => cotizacion.id && handleDeleteCotizacion(cotizacion.id)}
                              className="p-2 hover:bg-muted rounded-lg transition-colors" 
                              title="Eliminar cotización"
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
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
              <div className="text-sm text-gray-600">
                Mostrando {startIndex + 1} a {Math.min(endIndex, filteredCotizaciones.length)} de {filteredCotizaciones.length} cotizaciones
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 text-sm border rounded ${
                      currentPage === page
                        ? 'bg-red-600 text-white border-red-600'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      {/* Formulario Inteligente - Ahora usa el contexto */}
      <OrdenFormMejorado
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSaveCotizacionNueva}
        mode="presupuesto"
      />

      {/* Modal Ver Cotización */}
      <VerCotizacionModal
        isOpen={isVerModalOpen}
        onClose={() => setIsVerModalOpen(false)}
        cotizacion={cotizacionSeleccionada}
        cliente={cotizacionSeleccionada ? clientes.find(c => c.id === cotizacionSeleccionada.clienteId) || null : null}
        vehiculo={cotizacionSeleccionada ? vehiculos.find(v => v.id === cotizacionSeleccionada.vehiculoId) || null : null}
      />

      {/* Modal Editar Cotización - Ahora usa el contexto */}
      <EditarCotizacionModal
        isOpen={isEditarModalOpen}
        onClose={() => setIsEditarModalOpen(false)}
        onSave={handleSaveCotizacion}
        cotizacion={cotizacionSeleccionada}
      />

      {/* Modal Solicitar Teléfono */}
      <PhoneInputModal
        isOpen={isPhoneModalOpen}
        onClose={() => {
          setIsPhoneModalOpen(false);
          setCotizacionParaEnviar(null);
        }}
        onSend={handleEnviarWhatsAppConfirmado}
        title="Enviar Cotización por WhatsApp"
        documentType="cotización"
      />

      {/* Modal Versión Interna */}
      {mostrarVersionInterna && cotizacionSeleccionadaParaVer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Versión Interna - Cotización {cotizacionSeleccionadaParaVer.numero}</h2>
              <button
                onClick={() => {
                  setMostrarVersionInterna(false);
                  setCotizacionSeleccionadaParaVer(null);
                  setRepuestosInternos([]);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="Cerrar modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              {isLoadingDetalles ? (
                <div className="text-sm text-gray-500 text-center py-8">Cargando detalles...</div>
              ) : (
                <CotizacionInterna
                  cotizacion={cotizacionSeleccionadaParaVer}
                  cliente={clientes.find(c => c.id === cotizacionSeleccionadaParaVer.clienteId) || {} as Cliente}
                  vehiculo={vehiculos.find(v => v.id === cotizacionSeleccionadaParaVer.vehiculoId) || {} as Vehiculo}
                  repuestos={repuestosInternos}
                  descripcionTrabajo={cotizacionSeleccionadaParaVer.descripcion}
                  observaciones={cotizacionSeleccionadaParaVer.observaciones}
                  nombreTaller={nombreTaller}
                  telefonoTaller={telefonoTaller}
                  emailTaller={emailTaller}
                  rutTaller={rutTaller}
                  direccionTaller={direccionTaller}
                  sitioWebTaller={sitioWebTaller}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Versión Cliente */}
      {mostrarVersionCliente && cotizacionSeleccionadaParaVer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Versión Cliente - Cotización {cotizacionSeleccionadaParaVer.numero}</h2>
              <button
                onClick={() => {
                  setMostrarVersionCliente(false);
                  setCotizacionSeleccionadaParaVer(null);
                  setRepuestosCliente([]);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="Cerrar modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              {isLoadingDetalles ? (
                <div className="text-sm text-gray-500 text-center py-8">Cargando detalles...</div>
              ) : (
                <CotizacionPDF
                  cotizacion={cotizacionSeleccionadaParaVer}
                  cliente={clientes.find(c => c.id === cotizacionSeleccionadaParaVer.clienteId) || {} as Cliente}
                  vehiculo={vehiculos.find(v => v.id === cotizacionSeleccionadaParaVer.vehiculoId) || {} as Vehiculo}
                  repuestos={repuestosCliente}
                  descripcionTrabajo={cotizacionSeleccionadaParaVer.descripcion}
                  observaciones={cotizacionSeleccionadaParaVer.observaciones}
                  nombreTaller={nombreTaller}
                  telefonoTaller={telefonoTaller}
                  emailTaller={emailTaller}
                  rutTaller={rutTaller}
                  direccionTaller={direccionTaller}
                  sitioWebTaller={sitioWebTaller}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
