import React, { useState, useEffect, useMemo, useDeferredValue, startTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import StatCard from '../components/StatCard';
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
  X,
  ShoppingCart
} from 'lucide-react';
import { OrdenTrabajo, Cliente, Vehiculo, Servicio, Repuesto, Cotizacion } from '../types';

export default function OrdenesPage() {
  // Usar el contexto para acceder a los datos
  const { ordenes: initialOrdenes, clientes, vehiculos, servicios, repuestos, cotizaciones, refreshOrdenes } = useApp();
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

  return (
    <div className="flex flex-col gap-8 p-6 lg:p-8">
      {/* Manejo de errores */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
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

      {/* Header */}
      <div className="flex flex-col gap-3 pb-2 border-b border-border">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-card-foreground">Órdenes de Trabajo</h1>
            <p className="text-base text-muted-foreground mt-2">Gestiona las órdenes de servicio del taller</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleNewVenta}
              className="btn-primary flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              <ShoppingCart className="h-5 w-5" />
              Nueva Venta
            </button>
            <button 
              onClick={handleNewOrden}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="h-5 w-5" />
              Nueva Orden
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <StatCard
          title="Total"
          value={totalOrdenes.toString()}
          icon={Wrench}
          iconColor="icon-red"
        />
        <StatCard
          title="Pendientes"
          value={ordenesPendientes.toString()}
          icon={Clock}
          iconColor="icon-blue"
        />
        <StatCard
          title="En Progreso"
          value={ordenesEnProgreso.toString()}
          icon={Wrench}
          iconColor="icon-blue"
        />
        <StatCard
          title="Completadas"
          value={ordenesCompletadas.toString()}
          icon={CheckCircle}
          iconColor="icon-green"
        />
      </div>

      {/* Lista de Órdenes */}
      <Card className="shadow-sm border border-border">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl font-bold text-card-foreground">Lista de Órdenes</CardTitle>
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
                <option value="Pendiente">Pendientes</option>
                <option value="En Progreso">En Progreso</option>
                <option value="Completada">Completadas</option>
                <option value="Cancelada">Canceladas</option>
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
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Cliente / Vehículo</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Descripción</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Prioridad</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Estado</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Costo Est.</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Asignado</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {currentOrdenes.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-muted-foreground">
                      {ordenes.length === 0 ? 'No hay órdenes de trabajo registradas' : 'No se encontraron órdenes con los filtros aplicados'}
                    </td>
                  </tr>
                ) : (
                  currentOrdenes.map((orden) => {
                    const cliente = clientes.find(c => c.id === orden.clienteId);
                    const vehiculo = vehiculos.find(v => v.id === orden.vehiculoId);
                    
                    return (
                      <tr key={orden.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                        <td className="py-4 px-4">
                          <span className="font-semibold text-card-foreground">
                            {orden.numero || `OT-${orden.id}`}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div>
                            <div className="font-semibold text-card-foreground">
                              {cliente?.nombre || 'Cliente no encontrado'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {vehiculo ? `${vehiculo.marca} ${vehiculo.modelo} ${vehiculo.año}` : 'Vehículo no encontrado'}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm text-card-foreground">
                            {orden.descripcion || 'Sin descripción'}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <select
                            value={orden.prioridad || 'Normal'}
                            onChange={async (e) => {
                              const nuevaPrioridad = e.target.value;
                              try {
                                const ordenActualizada = { ...orden, prioridad: nuevaPrioridad };
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
                        </td>
                        <td className="py-4 px-4">
                          <select
                            value={orden.estado || 'Pendiente'}
                            onChange={async (e) => {
                              const nuevoEstado = e.target.value;
                              try {
                                const ordenActualizada = { ...orden, estado: nuevoEstado };
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
                        </td>
                        <td className="py-4 px-4">
                          <span className="font-semibold text-card-foreground">
                            ${orden.total?.toLocaleString() || '0'}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-card-foreground">
                              {orden.tecnicoAsignado || 'Sin asignar'}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => handleViewOrden(orden)}
                              className="p-1 hover:bg-muted rounded transition-colors"
                              title="Ver orden"
                            >
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            </button>
                            <button 
                              onClick={() => handleVerVersionInterna(orden)}
                              className="p-1 hover:bg-muted rounded transition-colors"
                              title="Ver versión interna (con precios)"
                            >
                              <DollarSign className="h-4 w-4 text-green-600" />
                            </button>
                            <button 
                              onClick={() => handleVerVersionCliente(orden)}
                              className="p-1 hover:bg-muted rounded transition-colors"
                              title="Ver versión cliente (sin precios)"
                            >
                              <FileText className="h-4 w-4 text-blue-600" />
                            </button>
                            <button 
                              onClick={() => handleEditOrden(orden)}
                              className="p-1 hover:bg-muted rounded transition-colors"
                              title="Editar orden"
                            >
                              <Edit className="h-4 w-4 text-muted-foreground" />
                            </button>
                            <button 
                              onClick={() => handleEnviarWhatsApp(orden)}
                              className="p-1 hover:bg-muted rounded transition-colors"
                              title="Enviar por WhatsApp"
                            >
                              <MessageSquare className="h-4 w-4 text-green-600" />
                            </button>
                            <button 
                              onClick={() => handleEnviarEmail(orden)}
                              className="p-1 hover:bg-muted rounded transition-colors"
                              title="Enviar por Email"
                            >
                              <Mail className="h-4 w-4 text-blue-600" />
                            </button>
                            {orden.estado === 'En Progreso' && (
                              <button 
                                onClick={() => handleAbrirFinalizarModal(orden)}
                                className="p-1 hover:bg-muted rounded transition-colors"
                                title="Finalizar orden"
                              >
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              </button>
                            )}
                            <button 
                              onClick={() => orden.id && handleDeleteOrden(orden.id)}
                              className="p-1 hover:bg-muted rounded transition-colors"
                              title="Eliminar orden"
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
                Mostrando {startIndex + 1} a {Math.min(endIndex, filteredOrdenes.length)} de {filteredOrdenes.length} órdenes
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
        onSave={handleSaveOrdenNueva}
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
                nombreTaller="Resortes Puerto Montt"
                telefonoTaller="+56 9 1234 5678"
                emailTaller="info@resortespuertomontt.cl"
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
                nombreTaller="Resortes Puerto Montt"
                telefonoTaller="+56 9 1234 5678"
                emailTaller="info@resortespuertomontt.cl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
