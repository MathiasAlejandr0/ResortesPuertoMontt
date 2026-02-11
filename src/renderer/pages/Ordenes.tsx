import React, { useState, useEffect, useMemo, useDeferredValue, startTransition } from 'react';
import { Badge } from '../components/ui/badge';
import { RichTable, Column } from '../components/RichTable';
import OrdenFormMejorado from '../components/OrdenFormMejorado';
import VentaForm from '../components/VentaForm';
import OrdenInterna from '../components/OrdenInterna';
import OrdenCliente from '../components/OrdenCliente';
import VerOrdenModal from '../components/VerOrdenModal';
import EditarOrdenModal from '../components/EditarOrdenModal';
import PhoneInputModal from '../components/PhoneInputModal';
import FinalizarOrdenModal from '../components/FinalizarOrdenModal';
import { envioDocumentosService, DocumentoParaEnviar } from '../services/EnvioDocumentosService';
import { useApp } from '../contexts/AppContext';
import { notify, confirmAction, Logger } from '../utils/cn';
import { 
  Wrench, 
  Clock, 
  CheckCircle, 
  Plus, 
  Search, 
  ChevronDown,
  Eye,
  Edit,
  Send,
  AlertTriangle,
  User,
  Trash2,
  MessageSquare,
  Mail,
  DollarSign,
  FileText,
  X
} from 'lucide-react';
import { OrdenTrabajo, Cliente, Vehiculo, Servicio, Repuesto, Cotizacion } from '../types';
import { useNegocioInfo } from '../hooks/useNegocioInfo';

export default function OrdenesPage() {
  // Usar el contexto para acceder a los datos
  const { ordenes: initialOrdenes, clientes, vehiculos, servicios, repuestos, cotizaciones, refreshOrdenes } = useApp();
  
  // Obtener información del negocio desde la configuración
  const { nombreTaller, telefonoTaller, emailTaller, rutTaller, direccionTaller, sitioWebTaller } = useNegocioInfo();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  // Usar órdenes del contexto directamente
  const ordenes = initialOrdenes;
  
  // Pre-calcular índices para lookup O(1) en lugar de O(n)
  const clientesById = useMemo(() => {
    const map = new Map<number, typeof clientes[0]>();
    clientes.forEach(c => { if (c.id) map.set(c.id, c); });
    return map;
  }, [clientes]);

  const vehiculosById = useMemo(() => {
    const map = new Map<number, typeof vehiculos[0]>();
    vehiculos.forEach(v => { if (v.id) map.set(v.id, v); });
    return map;
  }, [vehiculos]);

  // Usar deferred value para búsqueda (no bloquea la UI)
  const deferredSearchTerm = useDeferredValue(searchTerm);
  
  // Filtrar órdenes con useMemo para evitar re-renders innecesarios
  const filteredOrdenes = useMemo(() => {
    let filtered = ordenes;

    // Filtrar por término de búsqueda (usar deferred value y lookup O(1))
    if (deferredSearchTerm) {
      const searchLower = deferredSearchTerm.toLowerCase();
      filtered = filtered.filter(orden => {
        const cliente = orden.clienteId ? clientesById.get(orden.clienteId) : null;
        const vehiculo = orden.vehiculoId ? vehiculosById.get(orden.vehiculoId) : null;
        
        return (
          orden.numero?.toLowerCase().includes(searchLower) ||
          cliente?.nombre.toLowerCase().includes(searchLower) ||
          orden.descripcion?.toLowerCase().includes(searchLower) ||
          vehiculo?.marca.toLowerCase().includes(searchLower) ||
          vehiculo?.modelo.toLowerCase().includes(searchLower)
        );
      });
    }

    // Filtrar por estado
    if (filterStatus !== 'todos') {
      filtered = filtered.filter(orden => orden.estado === filterStatus);
    }

    return filtered;
  }, [deferredSearchTerm, filterStatus, ordenes, clientesById, vehiculosById]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isVentaFormOpen, setIsVentaFormOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [isVerModalOpen, setIsVerModalOpen] = useState(false);
  const [isEditarModalOpen, setIsEditarModalOpen] = useState(false);
  const [ordenSeleccionada, setOrdenSeleccionada] = useState<OrdenTrabajo | null>(null);
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [ordenParaEnviar, setOrdenParaEnviar] = useState<OrdenTrabajo | null>(null);
  const [mostrarVersionInterna, setMostrarVersionInterna] = useState(false);
  const [mostrarVersionCliente, setMostrarVersionCliente] = useState(false);
  const [ordenSeleccionadaParaVer, setOrdenSeleccionadaParaVer] = useState<OrdenTrabajo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [repuestosInternos, setRepuestosInternos] = useState<Array<{ id: number; nombre: string; precio: number; cantidad: number; subtotal: number }>>([]);
  const [isFinalizarModalOpen, setIsFinalizarModalOpen] = useState(false);
  const [ordenParaFinalizar, setOrdenParaFinalizar] = useState<OrdenTrabajo | null>(null);

  // Calcular paginación (ya no necesitamos useEffect)
  const totalPages = Math.ceil(filteredOrdenes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentOrdenes = filteredOrdenes.slice(startIndex, endIndex);

  // Resetear página cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  // Listener para abrir modal de nueva orden desde el sidebar
  useEffect(() => {
    const handleNuevaOrdenEvent = () => {
      setIsFormOpen(true);
    };
    
    window.addEventListener('app:nueva-orden', handleNuevaOrdenEvent);
    
    return () => {
      window.removeEventListener('app:nueva-orden', handleNuevaOrdenEvent);
    };
  }, []);

  // Listener para abrir venta rápida desde acciones rápidas
  useEffect(() => {
    const handleNuevaVentaEvent = () => {
      setIsVentaFormOpen(true);
    };

    window.addEventListener('app:nueva-venta', handleNuevaVentaEvent);
    return () => {
      window.removeEventListener('app:nueva-venta', handleNuevaVentaEvent);
    };
  }, []);

  // Funciones CRUD para órdenes de trabajo
  const handleViewOrden = (orden: OrdenTrabajo) => {
    setOrdenSeleccionada(orden);
    setIsVerModalOpen(true);
  };

  const handleEditOrden = (orden: OrdenTrabajo) => {
    setOrdenSeleccionada(orden);
    setIsEditarModalOpen(true);
  };

  const handleVerVersionInterna = async (orden: OrdenTrabajo) => {
    setOrdenSeleccionadaParaVer(orden);
    // Resetear estado antes de cargar
    setRepuestosInternos([]);
    try {
      // Cargar todos los detalles de la orden (servicios y repuestos)
      if (orden.id) {
        const detalles = await window.electronAPI.getDetallesOrden(orden.id);
        const items = Array.isArray(detalles) && detalles.length > 0
          ? detalles.map((d: any, idx: number) => ({
              id: d.id || idx,
              nombre: d.descripcion || (d.tipo === 'servicio' ? 'Servicio' : 'Repuesto'),
              precio: Number(d.precio) || 0,
              cantidad: Number(d.cantidad) || 1,
              subtotal: Number(d.subtotal) || ((Number(d.precio) || 0) * (Number(d.cantidad) || 1))
            }))
          : [];
        setRepuestosInternos(items);
      }
    } catch (e) {
      console.error('Error cargando detalles de orden:', e);
      setRepuestosInternos([]);
    }
    setMostrarVersionInterna(true);
  };

  const handleVerVersionCliente = (orden: OrdenTrabajo) => {
    setOrdenSeleccionadaParaVer(orden);
    // En versión cliente no mostramos ítems detallados
    setMostrarVersionCliente(true);
  };

  const handleSaveOrden = async (ordenActualizada: OrdenTrabajo, detalles?: Array<{ id?: number; tipo: 'servicio' | 'repuesto'; servicioId?: number; repuestoId?: number; cantidad: number; precio: number; subtotal: number; descripcion: string }>) => {
    setIsLoading(true);
    setError(null);
    try {
      if (!window.electronAPI) {
        throw new Error('electronAPI no está disponible');
      }
      
      // Convertir detalles al formato correcto para la transacción
      const detallesParaTransaccion = Array.isArray(detalles) && detalles.length > 0
        ? detalles.map(d => ({
            tipo: d.tipo,
            servicioId: d.servicioId || undefined,
            repuestoId: d.repuestoId || undefined,
            cantidad: d.cantidad || 1,
            precio: d.precio || 0,
            subtotal: d.subtotal || (d.precio || 0) * (d.cantidad || 1),
            descripcion: d.descripcion || ''
          }))
        : [];

      Logger.log('💾 Actualizando orden con transacción atómica:', {
        ordenId: ordenActualizada.id,
        detallesCount: detallesParaTransaccion.length
      });

      // Usar la nueva función con transacción atómica
      let savedOrden;
      if (detallesParaTransaccion.length > 0) {
        const resp = await window.electronAPI.saveOrdenTrabajoConDetalles({
          orden: ordenActualizada,
          detalles: detallesParaTransaccion
        });
        
        if (resp?.success === false) {
          throw new Error(resp.error || 'Error al actualizar la orden');
        }
        if (!resp?.success) {
          throw new Error('Error desconocido al actualizar la orden');
        }
        savedOrden = resp.data;
      } else {
        // Si no hay detalles, usar la función normal
        const resp = await window.electronAPI.saveOrdenTrabajo(ordenActualizada);
        if (resp?.success === false) {
          throw new Error(resp.error || 'Error al actualizar la orden');
        }
        savedOrden = resp?.success ? resp.data : resp;
      }
      
      if (savedOrden && savedOrden.id) {
        Logger.log('✅ Orden actualizada exitosamente con transacción atómica:', {
          ordenId: savedOrden.id,
          detallesGuardados: detallesParaTransaccion.length
        });
        
        // El contexto se actualiza automáticamente
        await refreshOrdenes();
        notify.success('Orden de trabajo actualizada exitosamente');
        setIsEditarModalOpen(false);
        setOrdenSeleccionada(null);
        // Si la versión interna está abierta para esta orden, recargar los detalles
        if (mostrarVersionInterna && ordenSeleccionadaParaVer?.id === savedOrden.id) {
          try {
            const detalles = await window.electronAPI.getDetallesOrden(savedOrden.id);
            const items = Array.isArray(detalles) && detalles.length > 0
              ? detalles.map((d: any, idx: number) => ({
                  id: d.id || idx,
                  nombre: d.descripcion || (d.tipo === 'servicio' ? 'Servicio' : 'Repuesto'),
                  precio: Number(d.precio) || 0,
                  cantidad: Number(d.cantidad) || 1,
                  subtotal: Number(d.subtotal) || ((Number(d.precio) || 0) * (Number(d.cantidad) || 1))
                }))
              : [];
            setRepuestosInternos(items);
          } catch (e) {
            console.error('Error recargando detalles después de editar:', e);
          }
        }
      }
    } catch (error) {
      Logger.error('Error actualizando orden:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setError(`Error al actualizar la orden de trabajo: ${errorMessage}`);
      notify.error('Error al actualizar la orden de trabajo', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteOrden = async (ordenId: number) => {
    const confirmed = await confirmAction('¿Estás seguro de que quieres eliminar esta orden de trabajo?');
    
    if (!confirmed) {
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      if (!window.electronAPI) {
        throw new Error('electronAPI no está disponible');
      }
      
      const result = await window.electronAPI.deleteOrdenTrabajo(ordenId);
      if (result) {
        // El contexto se actualiza automáticamente
        await refreshOrdenes();
        notify.success('Orden de trabajo eliminada exitosamente');
      } else {
        throw new Error('No se pudo eliminar la orden de trabajo');
      }
    } catch (error) {
      Logger.error('Error eliminando orden:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setError(`Error al eliminar la orden de trabajo: ${errorMessage}`);
      notify.error('Error al eliminar la orden de trabajo', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOrden = async (orden: OrdenTrabajo) => {
    const confirmed = await confirmAction(`¿Enviar orden ${orden.numero} al cliente?`);
    
    if (!confirmed) {
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      if (!window.electronAPI) {
        throw new Error('electronAPI no está disponible');
      }
      // No forzamos cambio de estado aquí; solo notificación/envío
      notify.success('Orden de trabajo marcada como enviada');
    } catch (error) {
      Logger.error('Error enviando orden:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setError(`Error al enviar la orden de trabajo: ${errorMessage}`);
      notify.error('Error al enviar la orden de trabajo', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewOrden = () => {
    setIsFormOpen(true);
  };

  const handleNewVenta = () => {
    setIsVentaFormOpen(true);
  };

  const handleSaveVenta = async (
    orden: OrdenTrabajo,
    detalles: Array<{ tipo: 'servicio' | 'repuesto'; servicioId?: number; repuestoId?: number; cantidad: number; precio: number; subtotal: number; descripcion: string }>,
    metodoPago: 'Efectivo' | 'Débito' | 'Crédito',
    numeroCuotas?: number,
    fechaPago?: string,
    fechasCuotas?: string[]
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      if (!window.electronAPI) {
        throw new Error('electronAPI no está disponible');
      }

      Logger.log('💾 Guardando venta como orden de trabajo:', {
        orden: orden.numero,
        detallesCount: detalles.length,
        metodoPago,
        numeroCuotas,
        fechaPago
      });

      // Convertir detalles al formato correcto para la transacción
      const detallesParaTransaccion = Array.isArray(detalles) && detalles.length > 0
        ? detalles.map(d => ({
            tipo: d.tipo,
            servicioId: d.servicioId || undefined,
            repuestoId: d.repuestoId || undefined,
            cantidad: d.cantidad || 1,
            precio: d.precio || 0,
            subtotal: d.subtotal || (d.precio || 0) * (d.cantidad || 1),
            descripcion: d.descripcion || ''
          }))
        : [];

      // Guardar orden con detalles usando saveOrdenTrabajoConDetalles
      const resp = await window.electronAPI.saveOrdenTrabajoConDetalles({
        orden,
        detalles: detallesParaTransaccion
      });

      if (resp?.success === false) {
        throw new Error(resp.error || 'Error al guardar la venta');
      }

      if (!resp?.success) {
        throw new Error('Error desconocido al guardar la venta');
      }

      const savedOrden = resp.data;

      // Si es crédito, guardar las cuotas de pago
      if (metodoPago === 'Crédito' && numeroCuotas && fechasCuotas && fechasCuotas.length > 0) {
        const montoPorCuota = Math.floor((orden.total || 0) / numeroCuotas);
        const cuotas = fechasCuotas.map((fecha, index) => ({
          ordenId: savedOrden.id,
          numeroCuota: index + 1,
          fechaVencimiento: fecha,
          monto: index === numeroCuotas - 1 
            ? (orden.total || 0) - (montoPorCuota * (numeroCuotas - 1)) // Última cuota con el resto
            : montoPorCuota,
          estado: 'Pendiente' as const
        }));

        Logger.log('💾 Guardando cuotas de pago para venta:', cuotas);
        const respCuotas = await window.electronAPI.saveCuotasPago(cuotas);
        
        if (respCuotas?.success === false) {
          Logger.error('⚠️ Error guardando cuotas, pero la orden se guardó:', respCuotas.error);
        }
      }

      Logger.log('✅ Venta guardada exitosamente como orden de trabajo');
      
      // Actualizar el contexto
      await refreshOrdenes();
      
      setIsVentaFormOpen(false);
      notify.success('Venta registrada exitosamente');
    } catch (error) {
      Logger.error('Error guardando venta:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setError(`Error al guardar la venta: ${errorMessage}`);
      notify.error('Error al guardar la venta', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveOrdenNueva = async (orden: OrdenTrabajo, detalles?: Array<{ tipo: 'servicio' | 'repuesto'; servicioId?: number; repuestoId?: number; cantidad: number; precio: number; subtotal: number; descripcion: string }>) => {
    setIsLoading(true);
    setError(null);
    try {
      if (!window.electronAPI) {
        throw new Error('electronAPI no está disponible');
      }
      
      // Convertir detalles al formato correcto para la transacción
      const detallesParaTransaccion = Array.isArray(detalles) && detalles.length > 0
        ? detalles.map(d => ({
            tipo: d.tipo,
            servicioId: d.servicioId || undefined,
            repuestoId: d.repuestoId || undefined,
            cantidad: d.cantidad || 1,
            precio: d.precio || 0,
            subtotal: d.subtotal || (d.precio || 0) * (d.cantidad || 1),
            descripcion: d.descripcion || ''
          }))
        : [];

      Logger.log('💾 Guardando orden con transacción atómica:', {
        orden: orden.numero,
        detallesCount: detallesParaTransaccion.length,
        detalles: detallesParaTransaccion.map(d => ({
          tipo: d.tipo,
          servicioId: d.servicioId,
          repuestoId: d.repuestoId,
          cantidad: d.cantidad,
          descripcion: d.descripcion
        }))
      });
      
      Logger.debug('💾 Ordenes: Guardando orden con', detallesParaTransaccion.length, 'detalles');
      if (detallesParaTransaccion.length > 0) {
        detallesParaTransaccion.forEach((d, idx) => {
          Logger.debug(`  Detalle ${idx + 1}: tipo=${d.tipo}, servicioId=${d.servicioId}, repuestoId=${d.repuestoId}, cantidad=${d.cantidad}, descripcion=${d.descripcion}`);
        });
      } else {
        Logger.warn('⚠️ Ordenes: No hay detalles para guardar en la orden');
      }

      // Usar la nueva función con transacción atómica si hay detalles
      let resp;
      if (detallesParaTransaccion.length > 0) {
        resp = await window.electronAPI.saveOrdenTrabajoConDetalles({
          orden,
          detalles: detallesParaTransaccion
        });
        
        // La función con transacciones retorna { success, data }
        if (resp?.success === false) {
          throw new Error(resp.error || 'Error al guardar la orden');
        }
        if (!resp?.success) {
          throw new Error('Error desconocido al guardar la orden');
        }
        const savedOrden = resp.data;
        Logger.log('✅ Orden guardada exitosamente con transacción atómica:', {
          ordenId: savedOrden?.id,
          detallesGuardados: detallesParaTransaccion.length
        });
        
        // Verificar que los detalles se guardaron correctamente
        if (savedOrden?.id && detallesParaTransaccion.length > 0) {
          try {
            const detallesVerificados = await window.electronAPI.getDetallesOrden(savedOrden.id);
            Logger.debug('✅ Ordenes: Verificación de detalles guardados:', detallesVerificados?.length || 0, 'detalles encontrados');
            if (detallesVerificados && detallesVerificados.length === 0) {
              Logger.error('❌ Ordenes: CRÍTICO - Los detalles no se guardaron correctamente!');
              Logger.error('CRÍTICO: Los detalles no se guardaron correctamente para la orden', savedOrden.id);
            } else if (detallesVerificados && detallesVerificados.length > 0) {
              Logger.debug('✅ Ordenes: Detalles verificados correctamente:', detallesVerificados.map((d: any) => ({
                tipo: d.tipo,
                servicioId: d.servicioId,
                repuestoId: d.repuestoId,
                descripcion: d.descripcion
              })));
            }
          } catch (verifError) {
            Logger.error('❌ Ordenes: Error verificando detalles:', verifError);
          }
        }
        
        // Actualizar el contexto PRIMERO para que la nueva orden esté disponible
        await refreshOrdenes();
        
        // Cerrar el formulario después de actualizar
        setIsFormOpen(false);
        
        // Mostrar mensaje de éxito
        notify.success('Orden de trabajo creada exitosamente');
      } else {
        // Si no hay detalles, usar la función normal
        resp = await window.electronAPI.saveOrdenTrabajo(orden);
        if (resp?.success === false) {
          throw new Error(resp.error || 'Error al guardar la orden');
        }
        const savedOrden = resp?.success ? resp.data : resp;
        
        if (savedOrden && savedOrden.id) {
          Logger.log('✅ Orden guardada exitosamente:', savedOrden.id);
          await refreshOrdenes();
          setIsFormOpen(false);
          notify.success('Orden de trabajo creada exitosamente');
        }
      }
    } catch (error) {
      Logger.error('Error guardando orden:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setError(`Error al guardar la orden de trabajo: ${errorMessage}`);
      // No cerrar el formulario si hay error, para que el usuario pueda corregir
      notify.error('Error al guardar la orden de trabajo', errorMessage);
      throw error; // Re-lanzar para que el formulario lo maneje
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveOrdenNuevaWrapper = async (
    data: OrdenTrabajo | Cotizacion,
    detalles?: Array<{ tipo: 'servicio' | 'repuesto'; servicioId?: number; repuestoId?: number; cantidad: number; precio: number; subtotal: number; descripcion: string }>
  ) => {
    if ('fechaIngreso' in data) {
      await handleSaveOrdenNueva(data, detalles);
    }
  };

  const handleEnviarWhatsApp = (orden: OrdenTrabajo) => {
    setOrdenParaEnviar(orden);
    setIsPhoneModalOpen(true);
  };

  const handleEnviarWhatsAppConfirmado = async (telefono: string) => {
    if (!ordenParaEnviar) return;

    try {
      const cliente = clientes.find(c => c.id === ordenParaEnviar.clienteId);
      const vehiculo = vehiculos.find(v => v.id === ordenParaEnviar.vehiculoId);
      
      if (!cliente || !vehiculo) {
        notify.error('Error', 'No se encontraron los datos del cliente o vehículo');
        return;
      }

      const documento: DocumentoParaEnviar = {
        tipo: 'orden',
        documento: ordenParaEnviar,
        cliente,
        vehiculo
      };

      const resultado = await envioDocumentosService.enviarOrdenWhatsApp(documento, telefono);
      
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

  const handleEnviarEmail = async (orden: OrdenTrabajo) => {
    const cliente = clientes.find(c => c.id === orden.clienteId);
    const vehiculo = vehiculos.find(v => v.id === orden.vehiculoId);
    
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
      tipo: 'orden',
      documento: orden,
      cliente,
      vehiculo
    };

    const resultado = await envioDocumentosService.enviarOrdenEmail(documento);
    if (resultado.exito) {
      notify.success('Cliente de email abierto con la orden de trabajo');
    } else {
      notify.error('Error al enviar por email', resultado.mensaje);
    }
  };

  const handleFinalizarOrden = async (
    orden: OrdenTrabajo,
    metodoPago: 'Efectivo' | 'Débito' | 'Crédito',
    numeroCuotas?: number,
    fechaPago?: string,
    fechasCuotas?: string[]
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      if (!window.electronAPI) {
        throw new Error('electronAPI no está disponible');
      }

      const ordenActualizada: OrdenTrabajo = {
        ...orden,
        estado: 'Completada',
        metodoPago,
        numeroCuotas,
        fechaPago: fechaPago || new Date().toISOString().split('T')[0],
        fechaEntrega: new Date().toISOString().split('T')[0]
      };

      const resp = await window.electronAPI.saveOrdenTrabajo(ordenActualizada);
      if (resp?.success === false) {
        throw new Error(resp.error || 'Error al finalizar la orden');
      }
      
      const savedOrden = resp?.success ? resp.data : resp;
      if (savedOrden && savedOrden.id) {
        // Si es crédito, guardar las cuotas
        if (metodoPago === 'Crédito' && numeroCuotas && numeroCuotas > 0 && fechasCuotas && fechasCuotas.length > 0) {
          console.log('💾 Ordenes: Preparando para guardar cuotas:', {
            metodoPago,
            numeroCuotas,
            fechasCuotasLength: fechasCuotas.length,
            fechasCuotas,
            ordenTotal: orden.total,
            ordenId: savedOrden.id
          });

          // Validar que tenemos todas las fechas necesarias
          if (fechasCuotas.length !== numeroCuotas) {
            console.error('❌ Ordenes: ERROR - Número de fechas no coincide con número de cuotas:', {
              fechasCuotasLength: fechasCuotas.length,
              numeroCuotas
            });
            notify.error('Error', `Se esperaban ${numeroCuotas} fechas pero se recibieron ${fechasCuotas.length}`);
          }

          const montoPorCuota = Math.floor((orden.total || 0) / numeroCuotas);
          const cuotas = fechasCuotas.map((fecha, index) => {
            const numeroCuota = index + 1; // Comienza en 1, no en 0
            const cuota = {
              ordenId: savedOrden.id!,
              numeroCuota: numeroCuota,
              fechaVencimiento: fecha,
              monto: index === numeroCuotas - 1 
                ? (orden.total || 0) - (montoPorCuota * (numeroCuotas - 1)) // Última cuota con el resto
                : montoPorCuota,
              montoPagado: 0,
              estado: 'Pendiente' as const
            };
            console.log(`  Preparando cuota ${index + 1}:`, cuota);
            return cuota;
          });

          Logger.log('💾 Guardando cuotas:', cuotas.map(c => ({ numero: c.numeroCuota, monto: c.monto, fecha: c.fechaVencimiento })));
          console.log('💾 Ordenes: Guardando', cuotas.length, 'cuotas para orden', savedOrden.id);
          console.log('  Cuotas a guardar:', JSON.stringify(cuotas, null, 2));
          
          const cuotasResp = await window.electronAPI.saveCuotasPago(cuotas);
          if (cuotasResp?.success === false) {
            Logger.error('Error guardando cuotas:', cuotasResp.error);
            console.error('❌ Error guardando cuotas:', cuotasResp.error);
            notify.error('Error', `Error al guardar las cuotas: ${cuotasResp.error}`);
            // No lanzar error, solo loguear - la orden ya está guardada
          } else {
            const cuotasGuardadas = cuotasResp?.data || cuotasResp || cuotas;
            const cantidadGuardada = Array.isArray(cuotasGuardadas) ? cuotasGuardadas.length : cuotas.length;
            Logger.log('✅ Cuotas guardadas exitosamente:', cantidadGuardada);
            console.log('✅ Ordenes: Cuotas guardadas:', cantidadGuardada);
            
            if (cantidadGuardada !== cuotas.length) {
              console.error(`❌ Ordenes: ADVERTENCIA - Se esperaban ${cuotas.length} cuotas pero se guardaron ${cantidadGuardada}`);
              notify.error('Advertencia', `Se esperaban ${cuotas.length} cuotas pero solo se guardaron ${cantidadGuardada}`);
            }
            
            if (Array.isArray(cuotasGuardadas)) {
              cuotasGuardadas.forEach((c: any, idx: number) => {
                console.log(`  Cuota guardada ${idx + 1}: número=${c.numeroCuota}, monto=${c.monto}, ordenId=${c.ordenId}`);
              });
            }
            
            // Verificar que las cuotas se guardaron correctamente
            try {
              const cuotasVerificadas = await window.electronAPI.getCuotasPagoByOrden(savedOrden.id!);
              console.log('✅ Ordenes: Verificación de cuotas guardadas:', cuotasVerificadas?.length || 0, 'cuotas encontradas en BD');
              if (cuotasVerificadas && cuotasVerificadas.length !== cuotas.length) {
                console.error(`❌ Ordenes: CRÍTICO - Se guardaron ${cuotas.length} cuotas pero en BD hay ${cuotasVerificadas.length}`);
                cuotasVerificadas.forEach((c: any) => {
                  console.log(`  Cuota en BD: número=${c.numeroCuota}, ordenId=${c.ordenId}`);
                });
              }
            } catch (verifError) {
              console.error('❌ Ordenes: Error verificando cuotas:', verifError);
            }
          }
        }

        // Registrar pago en caja si la caja está abierta (solo para efectivo, débito o crédito con pago inmediato)
        if (metodoPago !== 'Crédito' || (metodoPago === 'Crédito' && fechaPago)) {
          try {
            const estadoCaja = await window.electronAPI.getEstadoCaja();
            if (estadoCaja && estadoCaja.estado === 'abierta') {
              const metodoPagoCaja = metodoPago === 'Crédito' ? 'Transferencia' : metodoPago;
              await window.electronAPI.registrarMovimientoCaja({
                tipo: 'ingreso',
                monto: orden.total,
                descripcion: `Pago de orden ${orden.numero}`,
                metodo_pago: metodoPagoCaja,
                fecha: fechaPago || new Date().toISOString(),
                ordenId: savedOrden.id,
                caja_abierta: true
              });
              Logger.log('✅ Pago registrado en caja');
            }
          } catch (error: any) {
            Logger.warn('⚠️ No se pudo registrar el pago en caja:', error.message);
            // No fallar la finalización si hay error en caja
          }
        }

        // Calcular y guardar comisión del técnico si hay técnico asignado
        if (orden.tecnicoAsignado) {
          try {
            // Obtener porcentaje de comisión del técnico (por defecto 40% si no está configurado)
            // Por ahora usamos 40% como valor por defecto
            const porcentajeComision = 40; // TODO: Obtener del usuario/tecnico
            
            await window.electronAPI.calcularYGuardarComision(
              savedOrden.id!,
              null, // tecnicoId - por ahora null ya que tecnicoAsignado es solo texto
              orden.tecnicoAsignado,
              porcentajeComision
            );
            Logger.log('✅ Comisión calculada y guardada');
          } catch (error: any) {
            Logger.warn('⚠️ No se pudo calcular la comisión:', error.message);
            // No fallar la finalización si hay error en comisión
          }
        }

        Logger.log('✅ Orden finalizada exitosamente:', savedOrden.id);
        await refreshOrdenes();
        notify.success('Orden de trabajo finalizada exitosamente');
        setIsFinalizarModalOpen(false);
        setOrdenParaFinalizar(null);
      }
    } catch (error) {
      Logger.error('Error finalizando orden:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setError(`Error al finalizar la orden de trabajo: ${errorMessage}`);
      notify.error('Error al finalizar la orden de trabajo', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAbrirFinalizarModal = (orden: OrdenTrabajo) => {
    if (orden.estado !== 'En Progreso') {
      notify.error('Error', 'Solo se pueden finalizar órdenes que están en progreso');
      return;
    }
    setOrdenParaFinalizar(orden);
    setIsFinalizarModalOpen(true);
  };

  // Calcular estadísticas
  const totalOrdenes = ordenes.length;
  const ordenesPendientes = ordenes.filter(o => o.estado === 'Pendiente').length;
  const ordenesEnProgreso = ordenes.filter(o => o.estado === 'En Progreso').length;
  const ordenesCompletadas = ordenes.filter(o => o.estado === 'Completada').length;

  // Función para obtener prioridad visual
  const getPrioridadBadge = (prioridad: string) => {
    // Normalizar a minúsculas para comparación
    const prioridadNormalizada = prioridad?.toLowerCase() || 'media';
    
    switch (prioridadNormalizada) {
      case 'alta':
      case 'high':
        return <Badge className="bg-red-500 text-white text-xs">▲ Alta</Badge>;
      case 'media':
      case 'normal':
      case 'medium':
        return <Badge className="bg-orange-500 text-white text-xs">Media</Badge>;
      case 'baja':
      case 'low':
        return <Badge className="bg-gray-400 text-white text-xs">Baja</Badge>;
      case 'urgente':
      case 'urgent':
        return <Badge className="bg-red-700 text-white text-xs">⚠ Urgente</Badge>;
      default:
        return <Badge className="bg-gray-400 text-white text-xs">Media</Badge>;
    }
  };

  // Preparar datos para RichTable
  const ordenesTableData = useMemo(() => {
    return filteredOrdenes.map(orden => {
      const cliente = orden.clienteId ? clientesById.get(orden.clienteId) : null;
      const vehiculo = orden.vehiculoId ? vehiculosById.get(orden.vehiculoId) : null;
      return {
        ...orden,
        clienteNombre: cliente?.nombre || 'Cliente no encontrado',
        vehiculoInfo: vehiculo ? `${vehiculo.marca} ${vehiculo.modelo} ${vehiculo.año}` : 'Vehículo no encontrado',
      };
    });
  }, [filteredOrdenes, clientesById, vehiculosById]);

  // Columnas para RichTable
  const columns: Column<typeof ordenesTableData[0]>[] = useMemo(() => [
    {
      key: 'numero',
      header: 'ID',
      sortable: true,
      accessor: (row) => (
        <span className="font-semibold text-foreground">
          {row.numero || `OT-${row.id}`}
        </span>
      ),
    },
    {
      key: 'cliente',
      header: 'Cliente / Vehículo',
      sortable: true,
      accessor: (row) => (
        <div>
          <div className="font-semibold text-foreground">
            {row.clienteNombre}
          </div>
          <div className="text-sm text-muted-foreground">
            {row.vehiculoInfo}
          </div>
        </div>
      ),
    },
    {
      key: 'descripcion',
      header: 'Descripción',
      sortable: true,
      accessor: (row) => (
        <span className="text-sm text-foreground">
          {row.descripcion || 'Sin descripción'}
        </span>
      ),
    },
    {
      key: 'prioridad',
      header: 'Prioridad',
      sortable: true,
      accessor: (row) => (
        <select
          value={row.prioridad || 'Normal'}
          onChange={async (e) => {
            const nuevaPrioridad = e.target.value;
            try {
              const ordenActualizada = { ...row, prioridad: nuevaPrioridad };
              const resp = await window.electronAPI.saveOrdenTrabajo(ordenActualizada);
              if (resp?.success !== false) {
                await refreshOrdenes();
                notify.success('Prioridad actualizada');
              } else {
                notify.error('Error', 'No se pudo actualizar la prioridad');
              }
            } catch (error) {
              Logger.error('Error actualizando prioridad:', error);
              notify.error('Error', 'No se pudo actualizar la prioridad');
            }
          }}
          className="px-2 py-1 border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          onClick={(e) => e.stopPropagation()}
        >
          <option value="Baja">Baja</option>
          <option value="Normal">Normal</option>
          <option value="Alta">Alta</option>
          <option value="Urgente">Urgente</option>
        </select>
      ),
    },
    {
      key: 'estado',
      header: 'Estado',
      sortable: true,
      accessor: (row) => (
        <select
          value={row.estado || 'Pendiente'}
          onChange={async (e) => {
            const nuevoEstado = e.target.value;
            try {
              const ordenActualizada = { ...row, estado: nuevoEstado };
              const resp = await window.electronAPI.saveOrdenTrabajo(ordenActualizada);
              if (resp?.success !== false) {
                await refreshOrdenes();
                notify.success('Estado actualizado');
              } else {
                notify.error('Error', 'No se pudo actualizar el estado');
              }
            } catch (error) {
              Logger.error('Error actualizando estado:', error);
              notify.error('Error', 'No se pudo actualizar el estado');
            }
          }}
          className="px-2 py-1 border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          onClick={(e) => e.stopPropagation()}
        >
          <option value="Pendiente">Pendiente</option>
          <option value="En Progreso">En Progreso</option>
          <option value="Completada">Completada</option>
          <option value="Cancelada">Cancelada</option>
        </select>
      ),
    },
    {
      key: 'total',
      header: 'Costo Est.',
      sortable: true,
      accessor: (row) => (
        <span className="font-semibold text-foreground">
          ${row.total?.toLocaleString() || '0'}
        </span>
      ),
    },
    {
      key: 'tecnicoAsignado',
      header: 'Asignado',
      sortable: true,
      accessor: (row) => (
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-foreground">
            {row.tecnicoAsignado || 'Sin asignar'}
          </span>
        </div>
      ),
    },
  ], [refreshOrdenes]);

  // Función para obtener estado visual
  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'Pendiente':
        return (
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">Pendiente</span>
          </div>
        );
      case 'En Progreso':
        return (
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">En Progreso</span>
          </div>
        );
      case 'Completada':
        return (
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-sm text-green-600">Completada</span>
          </div>
        );
      case 'Cancelada':
        return (
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span className="text-sm text-red-600">Cancelada</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">Pendiente</span>
          </div>
        );
    }
  };

  // Verificación de datos válidos antes del render
  if (!Array.isArray(ordenes)) {
    Logger.error('❌ OrdenesPage: datos de órdenes inválidos:', ordenes);
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Error de Datos</h2>
          <p className="text-gray-600 mb-4">Los datos de órdenes de trabajo no son válidos</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Recargar página
          </button>
        </div>
      </div>
    );
  }

  if (!Array.isArray(clientes)) {
    Logger.error('❌ OrdenesPage: datos de clientes inválidos:', clientes);
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Error de Datos</h2>
          <p className="text-gray-600 mb-4">Los datos de clientes no son válidos</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Recargar página
          </button>
        </div>
      </div>
    );
  }

  // Si el formulario está abierto, mostrar solo el formulario (estilo Dirup)
  if (isFormOpen) {
    return (
      <div className="flex flex-col h-full">
        <OrdenFormMejorado
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSave={handleSaveOrdenNuevaWrapper}
          fullPage={true}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Manejo de errores */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 m-6">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <div>
              <h3 className="font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-600 hover:text-red-800"
              title="Cerrar mensaje de error"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Contenido principal */}
      <div className="flex-1 overflow-y-auto bg-white p-6">
        {/* Barra de búsqueda, filtros y botón Nuevo */}
        <div className="mb-4 flex items-center gap-3">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="todos">Todos los estados</option>
            <option value="Pendiente">Pendiente</option>
            <option value="En Progreso">En Progreso</option>
            <option value="Completada">Completada</option>
            <option value="Cancelada">Cancelada</option>
          </select>
          <input
            type="text"
            placeholder="Buscar"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
          />
          <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
            Por defecto
          </button>
          <button className="p-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors">
            <Search className="h-5 w-5" />
          </button>
          <button 
            onClick={handleNewOrden}
            className="ml-auto px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded transition-colors flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Nuevo
          </button>
        </div>

        {/* Lista de Órdenes */}
        <div className="space-y-4">

        <RichTable
          data={ordenesTableData}
          columns={columns}
          searchable={false}
          onView={(row) => handleViewOrden(row)}
          onEdit={(row) => handleEditOrden(row)}
          onDelete={(row) => row.id && handleDeleteOrden(row.id)}
          customActions={(row) => (
            <div className="flex items-center gap-1">
              <button 
                onClick={() => handleVerVersionInterna(row)}
                className="p-1.5 hover:bg-muted rounded transition-colors"
                title="Ver versión interna (con precios)"
              >
                <DollarSign className="h-4 w-4 text-green-600" />
              </button>
              <button 
                onClick={() => handleVerVersionCliente(row)}
                className="p-1.5 hover:bg-muted rounded transition-colors"
                title="Ver versión cliente (sin precios)"
              >
                <FileText className="h-4 w-4 text-red-600" />
              </button>
              <button 
                onClick={() => handleEnviarWhatsApp(row)}
                className="p-1.5 hover:bg-muted rounded transition-colors"
                title="Enviar por WhatsApp"
              >
                <MessageSquare className="h-4 w-4 text-green-600" />
              </button>
              <button 
                onClick={() => handleEnviarEmail(row)}
                className="p-1.5 hover:bg-muted rounded transition-colors"
                title="Enviar por Email"
              >
                <Mail className="h-4 w-4 text-red-600" />
              </button>
              {row.estado === 'En Progreso' && (
                <button 
                  onClick={() => handleAbrirFinalizarModal(row)}
                  className="p-1.5 hover:bg-muted rounded transition-colors"
                  title="Finalizar orden"
                >
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </button>
              )}
            </div>
          )}
          emptyMessage={ordenes.length === 0 ? 'No hay órdenes de trabajo registradas' : 'No se encontraron órdenes con los filtros aplicados'}
        />
        </div>
      </div>

      {/* Formulario Inteligente - Ahora usa el contexto */}
      <OrdenFormMejorado
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSaveOrdenNuevaWrapper}
      />

      {/* Formulario de Venta */}
      <VentaForm
        isOpen={isVentaFormOpen}
        onClose={() => setIsVentaFormOpen(false)}
        onSave={handleSaveVenta}
      />

      {/* Modal Ver Orden */}
      <VerOrdenModal
        isOpen={isVerModalOpen}
        onClose={() => setIsVerModalOpen(false)}
        orden={ordenSeleccionada}
        cliente={ordenSeleccionada ? clientes.find(c => c.id === ordenSeleccionada.clienteId) || null : null}
        vehiculo={ordenSeleccionada ? vehiculos.find(v => v.id === ordenSeleccionada.vehiculoId) || null : null}
      />

      {/* Modal Editar Orden - Ahora usa el contexto */}
      <EditarOrdenModal
        isOpen={isEditarModalOpen}
        onClose={() => setIsEditarModalOpen(false)}
        onSave={handleSaveOrden}
        orden={ordenSeleccionada}
      />

      {/* Modal Solicitar Teléfono */}
      <PhoneInputModal
        isOpen={isPhoneModalOpen}
        onClose={() => {
          setIsPhoneModalOpen(false);
          setOrdenParaEnviar(null);
        }}
        onSend={handleEnviarWhatsAppConfirmado}
        title="Enviar Orden de Trabajo por WhatsApp"
        documentType="orden"
      />

      {/* Modal Finalizar Orden */}
      <FinalizarOrdenModal
        isOpen={isFinalizarModalOpen}
        onClose={() => {
          setIsFinalizarModalOpen(false);
          setOrdenParaFinalizar(null);
        }}
        orden={ordenParaFinalizar}
        onFinalizar={handleFinalizarOrden}
      />

      {/* Modal Versión Interna */}
      {mostrarVersionInterna && ordenSeleccionadaParaVer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Versión Interna - Orden {ordenSeleccionadaParaVer.numero}</h2>
              <button
                onClick={() => {
                  setMostrarVersionInterna(false);
                  setOrdenSeleccionadaParaVer(null);
                  setRepuestosInternos([]);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="Cerrar modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <OrdenInterna
                orden={ordenSeleccionadaParaVer}
                cliente={clientes.find(c => c.id === ordenSeleccionadaParaVer.clienteId) || ({} as Cliente)}
                vehiculo={vehiculos.find(v => v.id === ordenSeleccionadaParaVer.vehiculoId) || ({} as Vehiculo)}
                repuestos={repuestosInternos}
                descripcionTrabajo={ordenSeleccionadaParaVer.descripcion}
                observaciones={ordenSeleccionadaParaVer.observaciones}
                nombreTaller={nombreTaller}
                telefonoTaller={telefonoTaller}
                emailTaller={emailTaller}
                rutTaller={rutTaller}
                direccionTaller={direccionTaller}
                sitioWebTaller={sitioWebTaller}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal Versión Cliente */}
      {mostrarVersionCliente && ordenSeleccionadaParaVer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Versión Cliente - Orden {ordenSeleccionadaParaVer.numero}</h2>
              <button
                onClick={() => {
                  setMostrarVersionCliente(false);
                  setOrdenSeleccionadaParaVer(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="Cerrar modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <OrdenCliente
                orden={ordenSeleccionadaParaVer}
                cliente={clientes.find(c => c.id === ordenSeleccionadaParaVer.clienteId) || {} as Cliente}
                vehiculo={vehiculos.find(v => v.id === ordenSeleccionadaParaVer.vehiculoId) || {} as Vehiculo}
                repuestos={[]} // Aquí se cargarían los repuestos de la orden
                descripcionTrabajo={ordenSeleccionadaParaVer.descripcion}
                observaciones={ordenSeleccionadaParaVer.observaciones}
                nombreTaller={nombreTaller}
                telefonoTaller={telefonoTaller}
                emailTaller={emailTaller}
                rutTaller={rutTaller}
                direccionTaller={direccionTaller}
                sitioWebTaller={sitioWebTaller}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
