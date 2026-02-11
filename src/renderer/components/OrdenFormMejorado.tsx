import React, { useState, useEffect, useMemo, useDeferredValue, startTransition, useLayoutEffect, useRef } from 'react';
import { X, User, Car, Calendar, DollarSign, Plus, Search, Wrench, Send, Clock, AlertTriangle, FileText, Info, ArrowUp } from 'lucide-react';
import { Cliente, Vehiculo, OrdenTrabajo, Repuesto, Cotizacion } from '../types';
import { useApp } from '../contexts/AppContext';
import { notify, Logger, formatearRUT, Validation } from '../utils/cn';
import { ActionDialog } from './ActionDialog';
import { useAutoSave } from '../hooks/useAutoSave';

interface OrdenFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: OrdenTrabajo | Cotizacion, detalles?: DetalleOrdenForm[]) => void;
  fullPage?: boolean;
  mode?: 'orden' | 'presupuesto';
}

interface RepuestoOrden {
  id: number;
  nombre: string;
  precio: number;
  cantidad: number;
  subtotal: number;
}

interface DetalleOrdenForm {
  tipo: 'servicio' | 'repuesto';
  servicioId?: number;
  repuestoId?: number;
  cantidad: number;
  precio: number;
  subtotal: number;
  descripcion: string;
}

export default function OrdenFormMejorado({ 
  isOpen, 
  onClose, 
  onSave,
  fullPage = false,
  mode = 'orden'
}: OrdenFormProps) {
  const isPresupuesto = mode === 'presupuesto';
  // Usar el contexto para acceder a los datos
  const { clientes, vehiculos, repuestos, servicios, cotizaciones, addCliente, addVehiculo, refreshRepuestos } = useApp();
  const [step, setStep] = useState(1); // 1: Cliente, 2: Vehículo, 3: Trabajo y Repuestos, 4: Resumen
  const [tipoCliente, setTipoCliente] = useState<'nuevo' | 'existente'>('existente');
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [nuevoCliente, setNuevoCliente] = useState<Cliente>({
    nombre: '',
    rut: '',
    telefono: '',
    email: '',
    direccion: '',
    activo: true
  });
  const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState<Vehiculo | null>(null);
  const [nuevoVehiculo, setNuevoVehiculo] = useState<Vehiculo>({
    clienteId: 0,
    marca: '',
    modelo: '',
    año: new Date().getFullYear(),
    patente: '',
    numeroChasis: '',
    color: '',
    kilometraje: 0,
    observaciones: '',
    activo: true
  });
  const [descripcionTrabajo, setDescripcionTrabajo] = useState('');
  const [usandoCotizacion, setUsandoCotizacion] = useState(false);
  const [repuestosSeleccionados, setRepuestosSeleccionados] = useState<RepuestoOrden[]>([]);
  const [detallesOrden, setDetallesOrden] = useState<DetalleOrdenForm[]>([]);
  const [precioFinal, setPrecioFinal] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [fotos, setFotos] = useState<{ name: string; dataUrl: string }[]>([]);
  const [prioridad, setPrioridad] = useState<'baja' | 'normal' | 'alta' | 'urgente'>('normal');
  const [tecnicoAsignado, setTecnicoAsignado] = useState('');
  const [kilometrajeEntrada, setKilometrajeEntrada] = useState<number | ''>('');
  const [fechaEntrega, setFechaEntrega] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [totalBloqueado, setTotalBloqueado] = useState(false);
  const [cotizacionesCliente, setCotizacionesCliente] = useState<Cotizacion[]>([]);
  const [cotizacionSeleccionada, setCotizacionSeleccionada] = useState<Cotizacion | null>(null);
  const [modoVehiculo, setModoVehiculo] = useState<'existente' | 'nuevo'>('existente');
  
  // Nuevos campos según Dirup
  const [fechaIngreso, setFechaIngreso] = useState(new Date().toISOString().split('T')[0]);
  const [fechaEgreso, setFechaEgreso] = useState('');
  const [fechaProgramada, setFechaProgramada] = useState('');
  const [concepto, setConcepto] = useState('REPARACIÓN');
  const [combustible, setCombustible] = useState('Bajo');
  const [nombreInspector, setNombreInspector] = useState('');
  const [numeroSiniestro, setNumeroSiniestro] = useState('');
  const [franquicia, setFranquicia] = useState('');
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [itemsTabla, setItemsTabla] = useState<Array<{
    id: number;
    nombre: string;
    importe: number;
    cantidad: number;
    tipo: 'servicio' | 'repuesto';
    bonif: number;
    subtotal: number;
    iva: number;
  }>>([]);
  const [descuento, setDescuento] = useState(0);
  const [efectivo, setEfectivo] = useState(0);
  const [cuentaCorriente, setCuentaCorriente] = useState('');
  const [totalPago, setTotalPago] = useState(0);
  const [comentarioInterno, setComentarioInterno] = useState('');
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [showVehiculoModal, setShowVehiculoModal] = useState(false);
  const [showProductoModal, setShowProductoModal] = useState(false);

  // Vehículos del cliente seleccionado
  const vehiculosDelCliente = useMemo(() => {
    if (!clienteSeleccionado?.id) return [] as Vehiculo[];
    return vehiculos.filter(v => v.clienteId === clienteSeleccionado.id);
  }, [vehiculos, clienteSeleccionado?.id]);

  // Al cambiar cliente, resetear selección de vehículo y modo
  useEffect(() => {
    setVehiculoSeleccionado(null);
    if (vehiculosDelCliente.length > 0) {
      setModoVehiculo('existente');
    } else {
      setModoVehiculo('nuevo');
    }
  }, [clienteSeleccionado?.id, vehiculosDelCliente.length]);

  // Filtrar cotizaciones cuando se selecciona un cliente
  useEffect(() => {
    if (clienteSeleccionado) {
      const cotizacionesClienteSeleccionado = cotizaciones.filter(
        c => c.clienteId === clienteSeleccionado.id
      );
      setCotizacionesCliente(cotizacionesClienteSeleccionado);
    } else {
      setCotizacionesCliente([]);
      setCotizacionSeleccionada(null);
    }
  }, [clienteSeleccionado, cotizaciones]);

  // Función para importar datos de una cotización
  const importarDesdeCotizacion = async (cotiParam?: Cotizacion | null) => {
    const cotizacion = cotiParam ?? cotizacionSeleccionada;
    if (!cotizacion) return;
    
    // Importar cliente
    const cliente = clientes.find(c => c.id === cotizacion.clienteId);
    if (cliente) {
      setClienteSeleccionado(cliente);
      setTipoCliente('existente');
    }

    // Importar vehículo
    const vehiculo = vehiculos.find(v => v.id === cotizacion.vehiculoId);
    if (vehiculo) {
      setVehiculoSeleccionado(vehiculo);
      setModoVehiculo('existente');
    } else {
      // Si no se encuentra el vehículo, usar modo nuevo
      setModoVehiculo('nuevo');
      setVehiculoSeleccionado(null);
      // Los datos del vehículo se pueden obtener del vehículo asociado si existe en la BD
      // Por ahora dejamos campos vacíos para que el usuario los complete
      const nuevoVehiculo: Vehiculo = {
        clienteId: cotizacion.clienteId,
        marca: '',
        modelo: '',
        año: new Date().getFullYear(),
        patente: '',
        numeroChasis: '',
        color: '',
        kilometraje: 0,
        observaciones: '',
        activo: true
      };
      setNuevoVehiculo(nuevoVehiculo);
    }

    // Importar descripción
    setDescripcionTrabajo(cotizacion.descripcion || '');

    // Importar detalles de la cotización (tanto servicios como repuestos)
    try {
      if (cotizacion.id) {
        Logger.log('📥 Importando detalles de cotización ID:', cotizacion.id);
        const detalles = await window.electronAPI.getDetallesCotizacion(cotizacion.id);
        Logger.log('📥 Detalles obtenidos de cotización:', detalles?.length || 0, detalles);
        
        if (Array.isArray(detalles) && detalles.length > 0) {
          Logger.debug('📥 OrdenFormMejorado: Detalles recibidos de cotización:', detalles);
          
          // Convertir todos los detalles a formato DetalleOrdenForm
          const detallesImportados: DetalleOrdenForm[] = detalles.map((d: any) => {
            const detalle = {
              tipo: d.tipo || 'repuesto',
              servicioId: d.servicioId || undefined,
              repuestoId: d.repuestoId || undefined,
              cantidad: d.cantidad || 1,
              precio: d.precio || 0,
              subtotal: d.subtotal || ((d.cantidad || 1) * (d.precio || 0)),
              descripcion: d.descripcion || ''
            };
            Logger.debug('  → Detalle convertido:', detalle);
            return detalle;
          });
          
          Logger.info('✅ Detalles importados convertidos:', detallesImportados.length, detallesImportados);
          Logger.debug('📥 OrdenFormMejorado: Estableciendo', detallesImportados.length, 'detalles en detallesOrden');
          setDetallesOrden(detallesImportados);
          
          // También mantener repuestos para compatibilidad con UI
          const repuestosDesdeDetalles = detalles
            .filter((d: any) => d.tipo === 'repuesto')
            .map((d: any) => ({
              id: d.repuestoId || 0,
              nombre: d.descripcion || '',
              precio: d.precio || 0,
              cantidad: d.cantidad || 1,
              subtotal: d.subtotal || ((d.cantidad || 1) * (d.precio || 0))
            }));
          Logger.debug('📥 OrdenFormMejorado: Estableciendo', repuestosDesdeDetalles.length, 'repuestos en repuestosSeleccionados');
          setRepuestosSeleccionados(repuestosDesdeDetalles);
          
          Logger.info('✅ Repuestos seleccionados actualizados:', repuestosDesdeDetalles.length);
        } else {
          Logger.warn('⚠️ No se encontraron detalles en la cotización');
          setDetallesOrden([]);
          setRepuestosSeleccionados([]);
        }
      } else {
        Logger.warn('⚠️ Cotización sin ID, no se pueden importar detalles');
      }
    } catch (e) {
      Logger.error('❌ Error importando detalles de cotización:', e);
      // Si falla, seguimos sin detalles importados para no bloquear al usuario
      setDetallesOrden([]);
      setRepuestosSeleccionados([]);
    }

    // Importar total como precio final
    if (cotizacion.total) {
      setPrecioFinal(String(cotizacion.total));
      setTotalBloqueado(true);
    }

    // Avanzar directo al resumen para no volver a pedir la descripción
    setUsandoCotizacion(true);
    setStep(4);

    // Limpiar selección
    setCotizacionSeleccionada(null);
    setCotizacionesCliente([]);
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    const max = 10;
    const toProcess = Array.from(files).slice(0, max - fotos.length);
    toProcess.forEach((file) => {
      if (!allowed.includes(file.type)) return;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result || '');
        setFotos((prev) => [...prev, { name: file.name, dataUrl }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFoto = (idx: number) => setFotos((prev) => prev.filter((_, i) => i !== idx));

  // Refs para los inputs principales
  const inputBusquedaClienteRef = useRef<HTMLInputElement>(null);
  const inputNombreClienteRef = useRef<HTMLInputElement>(null);
  const inputPatenteRef = useRef<HTMLInputElement>(null);
  const textareaDescripcionRef = useRef<HTMLTextAreaElement>(null);

  // Objeto con todos los datos del formulario para auto-guardar
  const formData = useMemo(() => ({
    step,
    tipoCliente,
    busquedaCliente,
    clienteSeleccionado: clienteSeleccionado ? { id: clienteSeleccionado.id, nombre: clienteSeleccionado.nombre } : null,
    nuevoCliente,
    vehiculoSeleccionado: vehiculoSeleccionado ? { id: vehiculoSeleccionado.id, patente: vehiculoSeleccionado.patente } : null,
    nuevoVehiculo,
    descripcionTrabajo,
    usandoCotizacion,
    repuestosSeleccionados,
    detallesOrden,
    precioFinal,
    observaciones,
    prioridad,
    tecnicoAsignado,
    kilometrajeEntrada,
    fechaEntrega,
    cotizacionSeleccionada: cotizacionSeleccionada ? { id: cotizacionSeleccionada.id } : null,
    modoVehiculo,
    fechaIngreso,
    fechaEgreso,
    fechaProgramada,
    concepto,
    combustible,
    nombreInspector,
    numeroSiniestro,
    franquicia,
    busquedaProducto,
    itemsTabla,
    descuento,
    efectivo,
    cuentaCorriente,
    totalPago,
    comentarioInterno,
    mode
  }), [
    step, tipoCliente, busquedaCliente, clienteSeleccionado, nuevoCliente,
    vehiculoSeleccionado, nuevoVehiculo, descripcionTrabajo, usandoCotizacion,
    repuestosSeleccionados, detallesOrden, precioFinal, observaciones,
    prioridad, tecnicoAsignado, kilometrajeEntrada, fechaEntrega,
    cotizacionSeleccionada, modoVehiculo, fechaIngreso, fechaEgreso,
    fechaProgramada, concepto, combustible, nombreInspector, numeroSiniestro,
    franquicia, busquedaProducto, itemsTabla, descuento, efectivo,
    cuentaCorriente, totalPago, comentarioInterno, mode
  ]);

  // Hook de auto-guardado
  const { restore, clear } = useAutoSave({
    key: `orden_${mode}`,
    data: formData,
    enabled: isOpen,
    onRestore: (restored: any) => {
      if (restored) {
        Logger.log('📂 Restaurando datos del formulario de orden:', restored);
        if (restored.step) setStep(restored.step);
        if (restored.tipoCliente) setTipoCliente(restored.tipoCliente);
        if (restored.busquedaCliente) setBusquedaCliente(restored.busquedaCliente);
        if (restored.nuevoCliente) setNuevoCliente(restored.nuevoCliente);
        if (restored.nuevoVehiculo) setNuevoVehiculo(restored.nuevoVehiculo);
        if (restored.descripcionTrabajo) setDescripcionTrabajo(restored.descripcionTrabajo);
        if (restored.repuestosSeleccionados) setRepuestosSeleccionados(restored.repuestosSeleccionados);
        if (restored.detallesOrden) setDetallesOrden(restored.detallesOrden);
        if (restored.precioFinal) setPrecioFinal(restored.precioFinal);
        if (restored.observaciones) setObservaciones(restored.observaciones);
        if (restored.prioridad) setPrioridad(restored.prioridad);
        if (restored.tecnicoAsignado) setTecnicoAsignado(restored.tecnicoAsignado);
        if (restored.kilometrajeEntrada !== undefined) setKilometrajeEntrada(restored.kilometrajeEntrada);
        if (restored.fechaEntrega) setFechaEntrega(restored.fechaEntrega);
        if (restored.modoVehiculo) setModoVehiculo(restored.modoVehiculo);
        if (restored.fechaIngreso) setFechaIngreso(restored.fechaIngreso);
        if (restored.fechaEgreso) setFechaEgreso(restored.fechaEgreso);
        if (restored.fechaProgramada) setFechaProgramada(restored.fechaProgramada);
        if (restored.concepto) setConcepto(restored.concepto);
        if (restored.combustible) setCombustible(restored.combustible);
        if (restored.nombreInspector) setNombreInspector(restored.nombreInspector);
        if (restored.numeroSiniestro) setNumeroSiniestro(restored.numeroSiniestro);
        if (restored.franquicia) setFranquicia(restored.franquicia);
        if (restored.busquedaProducto) setBusquedaProducto(restored.busquedaProducto);
        if (restored.itemsTabla) setItemsTabla(restored.itemsTabla);
        if (restored.descuento !== undefined) setDescuento(restored.descuento);
        if (restored.efectivo !== undefined) setEfectivo(restored.efectivo);
        if (restored.cuentaCorriente) setCuentaCorriente(restored.cuentaCorriente);
        if (restored.totalPago !== undefined) setTotalPago(restored.totalPago);
        if (restored.comentarioInterno) setComentarioInterno(restored.comentarioInterno);
        if (restored.usandoCotizacion !== undefined) setUsandoCotizacion(restored.usandoCotizacion);
        if (restored.totalBloqueado !== undefined) setTotalBloqueado(restored.totalBloqueado);
        
        // Restaurar cliente y vehículo seleccionados si existen
        if (restored.clienteSeleccionado?.id) {
          const cliente = clientes.find(c => c.id === restored.clienteSeleccionado.id);
          if (cliente) setClienteSeleccionado(cliente);
        }
        if (restored.vehiculoSeleccionado?.id) {
          const vehiculo = vehiculos.find(v => v.id === restored.vehiculoSeleccionado.id);
          if (vehiculo) setVehiculoSeleccionado(vehiculo);
        }
        if (restored.cotizacionSeleccionada?.id) {
          const cotizacion = cotizaciones.find(c => c.id === restored.cotizacionSeleccionada.id);
          if (cotizacion) setCotizacionSeleccionada(cotizacion);
        }
        
        notify.success('Datos restaurados', 'Se han restaurado los datos del formulario anterior');
      }
    }
  });

  // Resetear formulario cuando se abre (pero primero intentar restaurar)
  // Usar useEffect en lugar de useLayoutEffect para evitar bloquear el render inicial
  useEffect(() => {
    if (isOpen) {
      // El hook de auto-guardado restaurará automáticamente si hay datos guardados
      // Si no hay datos guardados, resetear normalmente
      setIsLoading(false);
      setStep(1);
      setTipoCliente('existente');
      setBusquedaCliente('');
      setBusquedaRepuesto('');
      setClienteSeleccionado(null);
      setNuevoCliente({
        nombre: '',
        rut: '',
        telefono: '',
        email: '',
        direccion: '',
        activo: true
      });
      setVehiculoSeleccionado(null);
      setNuevoVehiculo({
        clienteId: 0,
        marca: '',
        modelo: '',
        año: new Date().getFullYear(),
        patente: '',
        numeroChasis: '',
        color: '',
        kilometraje: 0,
        observaciones: '',
        activo: true
      });
      setDescripcionTrabajo('');
      setRepuestosSeleccionados([]);
      // Resetear detallesOrden cuando se cierra/abre el modal
      setDetallesOrden([]);
      setPrecioFinal('');
      setObservaciones('');
      setPrioridad('normal');
      setTecnicoAsignado('');
      setKilometrajeEntrada('');
      setFechaEntrega('');
      setCotizacionesCliente([]);
      setCotizacionSeleccionada(null);
      setUsandoCotizacion(false);
      setTotalBloqueado(false);
      setFotos([]);
      // Resetear nuevos campos
      setFechaIngreso(new Date().toISOString().split('T')[0]);
      setFechaEgreso('');
      setFechaProgramada('');
      setConcepto('REPARACIÓN');
      setCombustible('Bajo');
      setNombreInspector('');
      setNumeroSiniestro('');
      setFranquicia('');
      setBusquedaProducto('');
      setItemsTabla([]);
      setDescuento(0);
      setEfectivo(0);
      setCuentaCorriente('');
      setTotalPago(0);
      setComentarioInterno('');
      setShowClienteModal(false);
      setShowVehiculoModal(false);
      setShowProductoModal(false);
    }
  }, [isOpen]);

  // Enfocar el primer input cuando el modal se abre y el step cambia
  // Usar doble requestAnimationFrame para asegurar que el DOM esté completamente listo
  useEffect(() => {
    if (isOpen) {
      // Usar doble requestAnimationFrame para asegurar que el DOM esté completamente renderizado
      let timeoutId: NodeJS.Timeout;
      let rafId2: number;
      const rafId1 = requestAnimationFrame(() => {
        rafId2 = requestAnimationFrame(() => {
          timeoutId = setTimeout(() => {
            if (step === 1) {
              if (tipoCliente === 'existente') {
                inputBusquedaClienteRef.current?.focus();
              } else {
                inputNombreClienteRef.current?.focus();
              }
            } else if (step === 2) {
              if (modoVehiculo === 'nuevo') {
                inputPatenteRef.current?.focus();
              }
            } else if (step === 3) {
              // Para el textarea, asegurar que sea interactivo
              textareaDescripcionRef.current?.focus();
              // Forzar interacción para desbloquear el textarea
              textareaDescripcionRef.current?.click();
            }
          }, 100);
        });
      });
      
      // Retornar función de limpieza
      return () => {
        cancelAnimationFrame(rafId1);
        if (rafId2) cancelAnimationFrame(rafId2);
        if (timeoutId) clearTimeout(timeoutId);
      };
    }
  }, [isOpen, step, tipoCliente, modoVehiculo]);

  // Cargar datos en background DESPUÉS del render (sin bloquear)
  useEffect(() => {
    if (isOpen) {
      // Cargar repuestos en background (después de que el formulario ya esté renderizado)
      // Usar un delay más largo para asegurar que el formulario ya está interactivo
      const timeoutId = setTimeout(() => {
        startTransition(() => {
          try { 
            void refreshRepuestos(); 
          } catch {} 
        });
      }, 500); // Aumentado a 500ms para dar más tiempo al render inicial
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen, refreshRepuestos]);

  // Generar número de orden automático
  const generarNumeroOrden = () => {
    const fecha = new Date();
    const año = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    const numero = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `OT-${año}-${mes}${dia}-${numero}`;
  };

  // Generar número de presupuesto automático
  const generarNumeroCotizacion = () => {
    const fecha = new Date();
    const año = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    const numero = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `COT-${año}-${mes}${dia}-${numero}`;
  };

  // Pre-calcular clientes únicos UNA VEZ (evita O(n²) en cada filtro)
  const clientesUnicos = useMemo(() => {
    if (!clientes || clientes.length === 0) return [];
    const seen = new Set<number>();
    return clientes.filter(cliente => {
      if (cliente.id && !seen.has(cliente.id)) {
        seen.add(cliente.id);
        return true;
      }
      return false;
    });
  }, [clientes]);

  // Filtrar clientes - SIEMPRE sincrónico y rápido
  const clientesFiltrados = useMemo(() => {
    // Si no hay clientes todavía, retornar vacío inmediatamente
    if (!clientesUnicos || clientesUnicos.length === 0) {
      return [];
    }
    
    const busquedaTrimmed = busquedaCliente.trim();
    
    // Si no hay búsqueda, limitar para no bloquear
    if (!busquedaTrimmed) {
      return clientesUnicos.slice(0, 10);
    }
    
    // Si hay búsqueda, filtrar rápidamente
    const busquedaLower = busquedaTrimmed.toLowerCase();
    return clientesUnicos.filter(cliente =>
      cliente.nombre.toLowerCase().includes(busquedaLower) ||
      (cliente.rut && cliente.rut.includes(busquedaTrimmed)) ||
      (cliente.telefono && cliente.telefono.includes(busquedaTrimmed))
    );
  }, [clientesUnicos, busquedaCliente]);

  // Filtrar repuestos por búsqueda - SIEMPRE sincrónico y rápido
  const [busquedaRepuesto, setBusquedaRepuesto] = useState('');
  const repuestosFiltrados = useMemo(() => {
    // Si no hay repuestos todavía, retornar vacío inmediatamente
    if (!repuestos || repuestos.length === 0) {
      return [];
    }
    
    const termino = busquedaRepuesto.toLowerCase().trim();
    if (termino) {
      // Si hay búsqueda, filtrar
      return repuestos.filter((repuesto) =>
        repuesto.nombre.toLowerCase().includes(termino) ||
        repuesto.codigo?.toLowerCase().includes(termino) ||
        repuesto.categoria?.toLowerCase().includes(termino)
      );
    }
    // Si no hay búsqueda, mostrar los primeros 10 repuestos para que el usuario vea que hay repuestos disponibles
    return repuestos.slice(0, 10);
  }, [repuestos, busquedaRepuesto]);

  // Agregar repuesto a la orden
  const agregarRepuesto = (repuesto: Repuesto) => {
    const repuestoExistente = repuestosSeleccionados.find(r => r.id === repuesto.id);
    if (repuestoExistente) {
      setRepuestosSeleccionados(prev =>
        prev.map(r =>
          r.id === repuesto.id
            ? { ...r, cantidad: r.cantidad + 1, subtotal: (r.cantidad + 1) * r.precio }
            : r
        )
      );
      // También actualizar en detallesOrden
      setDetallesOrden(prev => {
        const detalleExistente = prev.find(d => d.tipo === 'repuesto' && d.repuestoId === repuesto.id);
        if (detalleExistente) {
          return prev.map(d =>
            d.tipo === 'repuesto' && d.repuestoId === repuesto.id
              ? { ...d, cantidad: d.cantidad + 1, subtotal: (d.cantidad + 1) * d.precio }
              : d
          );
        } else {
          return [...prev, {
            tipo: 'repuesto',
            repuestoId: repuesto.id || 0,
            cantidad: repuestoExistente.cantidad + 1,
            precio: repuesto.precio || 0,
            subtotal: (repuestoExistente.cantidad + 1) * (repuesto.precio || 0),
            descripcion: repuesto.nombre
          }];
        }
      });
    } else {
      const nuevoRepuesto: RepuestoOrden = {
        id: repuesto.id || 0,
        nombre: repuesto.nombre,
        precio: repuesto.precio || 0,
        cantidad: 1,
        subtotal: repuesto.precio || 0
      };
      setRepuestosSeleccionados(prev => [...prev, nuevoRepuesto]);
      // También agregar a detallesOrden
      setDetallesOrden(prev => [...prev, {
        tipo: 'repuesto',
        repuestoId: repuesto.id || 0,
        cantidad: 1,
        precio: repuesto.precio || 0,
        subtotal: repuesto.precio || 0,
        descripcion: repuesto.nombre
      }]);
    }
    setBusquedaRepuesto('');
  };

  // Actualizar cantidad de repuesto
  const actualizarCantidadRepuesto = (id: number, cantidad: number) => {
    if (cantidad <= 0) {
      setRepuestosSeleccionados(prev => prev.filter(r => r.id !== id));
      setDetallesOrden(prev => prev.filter(d => !(d.tipo === 'repuesto' && d.repuestoId === id)));
    } else {
      setRepuestosSeleccionados(prev =>
        prev.map(r =>
          r.id === id
            ? { ...r, cantidad, subtotal: cantidad * r.precio }
            : r
        )
      );
      // También actualizar en detallesOrden
      setDetallesOrden(prev =>
        prev.map(d =>
          d.tipo === 'repuesto' && d.repuestoId === id
            ? { ...d, cantidad, subtotal: cantidad * d.precio }
            : d
        )
      );
    }
  };

  // Calcular subtotal de repuestos
  const subtotalRepuestos = repuestosSeleccionados.reduce((total, repuesto) => total + repuesto.subtotal, 0);

  // Función para validar formato de RUT (usa la función centralizada)
  const validarRUT = (rut: string): boolean => {
    if (!rut) return true; // Permitir RUT vacío
    const resultado = Validation.rut(rut);
    return resultado.valido;
  };

  // Función inteligente para encontrar o crear cliente
  const encontrarOCrearCliente = async (clienteData: Cliente): Promise<Cliente> => {
    // Buscar cliente existente por RUT o email
    let clienteExistente = clientes.find(c => 
      (clienteData.rut && c.rut === clienteData.rut) ||
      (clienteData.email && c.email === clienteData.email)
    );

    if (clienteExistente) {
      console.log('🔧 Cliente encontrado:', clienteExistente);
      return clienteExistente;
    }

    // Si no existe, crear nuevo cliente
    console.log('🔧 Creando nuevo cliente:', clienteData);
    const nuevoCliente = await window.electronAPI.saveCliente(clienteData);
    
    // Actualizar el contexto con el nuevo cliente
    await addCliente(nuevoCliente);
    
    return nuevoCliente;
  };

  // Función inteligente para encontrar o crear vehículo
  const encontrarOCrearVehiculo = async (vehiculoData: Vehiculo, clienteId: number): Promise<Vehiculo> => {
    // Buscar vehículo existente por patente
    let vehiculoExistente = vehiculos.find(v => 
      vehiculoData.patente && v.patente === vehiculoData.patente
    );

    if (vehiculoExistente) {
      console.log('🔧 Vehículo encontrado:', vehiculoExistente);
      return vehiculoExistente;
    }

    // Si no existe, crear nuevo vehículo
    console.log('🔧 Creando nuevo vehículo:', vehiculoData);
    const nuevoVehiculo = { ...vehiculoData, clienteId };
    const vehiculoCreado = await window.electronAPI.saveVehiculo(nuevoVehiculo);
    
    // Actualizar el contexto con el nuevo vehículo
    addVehiculo(vehiculoCreado);
    
    return vehiculoCreado;
  };

  // Manejar guardado de orden
  const handleSave = async () => {
    // Prevenir múltiples envíos
    if (isLoading) {
      return;
    }
    
    setIsLoading(true);
    try {
      let clienteFinal: Cliente;
      let vehiculoFinal: Vehiculo;
      let detallesParaGuardar: DetalleOrdenForm[] = [];
      let totalCalculado = 0;
      let fechaIngresoISO = '';
      let fechaEgresoISO = '';
      let fechaProgramadaISO: string | undefined;
      let observacionesFinal = observaciones;

      // Si está en modo fullPage, usar los nuevos campos
      if (fullPage) {
        // Validar cliente seleccionado
        if (!clienteSeleccionado) {
          notify.error('Validación', 'Debes seleccionar un cliente');
          setIsLoading(false);
          return;
        }
        clienteFinal = clienteSeleccionado;

        // Validar vehículo seleccionado
        if (!vehiculoSeleccionado) {
          notify.error('Validación', 'Debes seleccionar un vehículo');
          setIsLoading(false);
          return;
        }
        vehiculoFinal = vehiculoSeleccionado;

        // Validar que haya items en la tabla
        if (itemsTabla.length === 0) {
          notify.error('Validación', 'Debes agregar al menos un item (producto o servicio)');
          setIsLoading(false);
          return;
        }

        // Convertir itemsTabla a detallesOrden
        detallesParaGuardar = itemsTabla.map(item => {
          // Buscar el repuesto o servicio en la base de datos
          let repuestoId: number | undefined;
          let servicioId: number | undefined;
          
          if (item.tipo === 'repuesto') {
            const repuesto = repuestos.find(r => r.nombre === item.nombre || r.id === item.id);
            repuestoId = repuesto?.id;
          } else {
            // Para servicios, necesitaríamos tener acceso a servicios
            // Por ahora, solo guardamos la descripción
          }

          return {
            tipo: item.tipo,
            repuestoId,
            servicioId,
            cantidad: item.cantidad,
            precio: item.importe,
            subtotal: item.subtotal,
            descripcion: item.nombre
          };
        });

        // Calcular total desde itemsTabla
        const subtotalRepuestos = itemsTabla.filter(i => i.tipo === 'repuesto').reduce((sum, item) => sum + item.subtotal, 0);
        const subtotalServicios = itemsTabla.filter(i => i.tipo === 'servicio').reduce((sum, item) => sum + item.subtotal, 0);
        const totalNeto = subtotalRepuestos + subtotalServicios - descuento;
        const iva = totalNeto * 0.19;
        totalCalculado = totalNeto + iva;

        // Usar fechas del formulario
        fechaIngresoISO = fechaIngreso ? new Date(fechaIngreso).toISOString() : new Date().toISOString();
        fechaEgresoISO = fechaEgreso ? new Date(fechaEgreso).toISOString() : '';
        fechaProgramadaISO = fechaProgramada ? new Date(fechaProgramada).toISOString() : undefined;

        // Combinar observaciones y comentario interno
        if (comentarioInterno) {
          observacionesFinal = observaciones 
            ? `${observaciones}\n\n[Comentario Interno]\n${comentarioInterno}`
            : `[Comentario Interno]\n${comentarioInterno}`;
        }

        // Agregar información adicional a observaciones
        const infoAdicional: string[] = [];
        if (concepto) infoAdicional.push(`Concepto: ${concepto}`);
        if (combustible) infoAdicional.push(`Combustible: ${combustible}`);
        if (nombreInspector) infoAdicional.push(`Inspector: ${nombreInspector}`);
        if (numeroSiniestro) infoAdicional.push(`Número Siniestro: ${numeroSiniestro}`);
        if (franquicia) infoAdicional.push(`Franquicia: $${franquicia}`);
        
        if (infoAdicional.length > 0) {
          observacionesFinal = observacionesFinal 
            ? `${observacionesFinal}\n\n${infoAdicional.join('\n')}`
            : infoAdicional.join('\n');
        }
      } else {
        // Modo modal (comportamiento original)
        // Validar precio final (debe ser mayor a 0)
        const precioFinalStr = typeof precioFinal === 'number' ? String(precioFinal) : (precioFinal || '');
        const precioFinalNumero = Number(precioFinalStr.replace(/[^0-9]/g, ''));
        if (!precioFinalNumero || precioFinalNumero <= 0) {
          notify.error('Validación', 'Debes ingresar un precio final mayor a 0');
          setIsLoading(false);
          return;
        }
        totalCalculado = precioFinalNumero;

        // Lógica inteligente: usar cliente existente o crear automáticamente
        if (tipoCliente === 'existente' && clienteSeleccionado) {
          clienteFinal = clienteSeleccionado;
        } else {
          // Validar RUT si se proporciona
          if (nuevoCliente.rut) {
            const validacionRUT = Validation.rut(nuevoCliente.rut);
            if (!validacionRUT.valido) {
              notify.error('Validación', validacionRUT.mensaje || 'El RUT ingresado no es válido');
              setIsLoading(false);
              return;
            }
          }
          
          // Buscar cliente existente o crear automáticamente
          clienteFinal = await encontrarOCrearCliente(nuevoCliente);
        }

        // Lógica inteligente: usar vehículo existente o crear automáticamente
        if (vehiculoSeleccionado) {
          vehiculoFinal = vehiculoSeleccionado;
        } else {
          // Validación mínima cuando se crea vehículo manualmente
          const patenteOk = (nuevoVehiculo.patente || '').trim().length > 0;
          const marcaOk = (nuevoVehiculo.marca || '').trim().length > 0;
          const modeloOk = (nuevoVehiculo.modelo || '').trim().length > 0;
          if (!patenteOk || !marcaOk || !modeloOk) {
            notify.error('Validación', 'Debes ingresar Patente, Marca y Modelo del vehículo');
            setStep(2);
            setIsLoading(false);
            return;
          }
          // Crear vehículo automáticamente si no existe
          vehiculoFinal = await encontrarOCrearVehiculo(nuevoVehiculo, clienteFinal.id!);
        }

        // Convertir repuestosSeleccionados a detallesOrden si no hay detalles importados desde cotización
        detallesParaGuardar = detallesOrden;
        
        // Si hay repuestos seleccionados pero no están en detallesOrden, agregarlos
        if (repuestosSeleccionados.length > 0) {
          const detallesDeRepuestos = repuestosSeleccionados.map(r => ({
            tipo: 'repuesto' as const,
            repuestoId: r.id,
            cantidad: r.cantidad,
            precio: r.precio,
            subtotal: r.subtotal,
            descripcion: r.nombre
          }));
          
          // Si no hay detallesOrden, usar los de repuestos
          if (detallesOrden.length === 0) {
            detallesParaGuardar = detallesDeRepuestos;
          } else {
            // Si hay detallesOrden, combinar ambos (evitando duplicados)
            const detallesCombinados = [...detallesOrden];
            detallesDeRepuestos.forEach(detalleRepuesto => {
              const existe = detallesCombinados.some(d => 
                d.tipo === 'repuesto' && d.repuestoId === detalleRepuesto.repuestoId
              );
              if (!existe) {
                detallesCombinados.push(detalleRepuesto);
              }
            });
            detallesParaGuardar = detallesCombinados;
          }
        }

        fechaIngresoISO = new Date().toISOString();
        // Normalizar fechaEntrega a ISO si viene como dd/mm/aaaa
        let fechaEntregaISO = fechaEntrega;
        const matchFecha = /^\d{2}\/\d{2}\/\d{4}$/.test(fechaEntrega || '');
        if (matchFecha && fechaEntrega) {
          const [dd, mm, yyyy] = fechaEntrega.split('/') as any;
          fechaEntregaISO = new Date(Number(yyyy), Number(mm) - 1, Number(dd)).toISOString();
        }
        fechaEgresoISO = fechaEntregaISO || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      }

      // Normalizar prioridad a formato minúsculas esperado por el esquema de validación
      const prioridadMap: Record<string, 'baja' | 'media' | 'alta' | 'urgente'> = {
        'Baja': 'baja',
        'baja': 'baja',
        'Normal': 'media',
        'normal': 'media',
        'Media': 'media',
        'media': 'media',
        'Alta': 'alta',
        'alta': 'alta',
        'Urgente': 'urgente',
        'urgente': 'urgente'
      };
      const prioridadDb = prioridadMap[prioridad] || 'media';
      
      if (isPresupuesto) {
        const cotizacionData: Cotizacion = {
          numero: generarNumeroCotizacion(),
          clienteId: clienteFinal.id!,
          vehiculoId: vehiculoFinal.id!,
          fecha: fechaIngresoISO || new Date().toISOString(),
          validaHasta: fechaEgresoISO || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          estado: 'Pendiente',
          descripcion: fullPage ? (descripcionTrabajo || concepto || 'Presupuesto') : (descripcionTrabajo || 'Presupuesto'),
          observaciones: observacionesFinal,
          total: totalCalculado
        };

        Logger.log('💾 Guardando presupuesto con detalles:', {
          modo: fullPage ? 'fullPage' : 'modal',
          detallesParaGuardarCount: detallesParaGuardar.length,
          totalCalculado,
          clienteId: clienteFinal.id,
          vehiculoId: vehiculoFinal.id
        });

        await onSave(cotizacionData, detallesParaGuardar);
      } else {
        const ordenData: OrdenTrabajo & { fotos?: { name: string; dataUrl: string }[] } = {
          numero: generarNumeroOrden(),
          clienteId: clienteFinal.id!,
          vehiculoId: vehiculoFinal.id!,
          fechaIngreso: fechaIngresoISO,
          fechaEntrega: fechaEgresoISO,
          fechaProgramada: fechaProgramadaISO,
          estado: 'En Progreso', // Las órdenes nuevas se crean automáticamente como "En Progreso"
          descripcion: fullPage ? (descripcionTrabajo || concepto || 'Orden de trabajo') : descripcionTrabajo,
          observaciones: observacionesFinal,
          total: totalCalculado,
          kilometrajeEntrada: kilometrajeEntrada === '' ? 0 : Number(kilometrajeEntrada),
          kilometrajeSalida: undefined,
          prioridad: prioridadDb,
          tecnicoAsignado: tecnicoAsignado
        };
      
      // Log para debugging
        Logger.log('💾 Guardando orden con detalles:', {
          modo: fullPage ? 'fullPage' : 'modal',
          detallesParaGuardarCount: detallesParaGuardar.length,
          totalCalculado,
          clienteId: clienteFinal.id,
          vehiculoId: vehiculoFinal.id,
          usandoCotizacion,
          detallesParaGuardar: JSON.stringify(detallesParaGuardar, null, 2)
        });
        
        Logger.debug('💾 OrdenFormMejorado: Guardando orden con', detallesParaGuardar.length, 'detalles');
        Logger.debug('  modo:', fullPage ? 'fullPage' : 'modal');
        Logger.debug('  totalCalculado:', totalCalculado);
        if (fullPage) {
          Logger.debug('  itemsTabla.length:', itemsTabla.length);
          Logger.debug('  descuento:', descuento);
        } else {
          Logger.debug('  usandoCotizacion:', usandoCotizacion);
          Logger.debug('  detallesOrden.length:', detallesOrden.length);
          Logger.debug('  repuestosSeleccionados.length:', repuestosSeleccionados.length);
        }
        
        if (detallesParaGuardar.length > 0) {
          detallesParaGuardar.forEach((d, idx) => {
            Logger.debug(`  Detalle ${idx + 1}: tipo=${d.tipo}, servicioId=${d.servicioId}, repuestoId=${d.repuestoId}, cantidad=${d.cantidad}, descripcion=${d.descripcion}`);
          });
        }
        
        // Validar que tenemos detalles si usamos cotización
        if (usandoCotizacion && detallesParaGuardar.length === 0) {
          Logger.warn('⚠️ Importando desde cotización pero no hay detalles para guardar');
          Logger.error('❌ OrdenFormMejorado: CRÍTICO - Importando desde cotización pero no hay detalles para guardar!');
          notify.error('Error', 'No se encontraron detalles en la cotización para importar');
          setIsLoading(false);
          return;
        }
        
        // Pasar también los detalles (servicios y repuestos) para que el contenedor los persista
        await onSave(ordenData as any, detallesParaGuardar as any);
      }
      
      // Limpiar auto-guardado después de guardar exitosamente
      clear();
      
      // Resetear formulario completamente
      setStep(1);
      setTipoCliente('existente');
      setBusquedaCliente('');
      setClienteSeleccionado(null);
      setNuevoCliente({
        nombre: '',
        rut: '',
        telefono: '',
        email: '',
        direccion: '',
        activo: true
      });
      setVehiculoSeleccionado(null);
      setNuevoVehiculo({
        clienteId: 0,
        marca: '',
        modelo: '',
        año: new Date().getFullYear(),
        patente: '',
        numeroChasis: '',
        color: '',
        kilometraje: 0,
        observaciones: '',
        activo: true
      });
      setDescripcionTrabajo('');
      setRepuestosSeleccionados([]);
      setDetallesOrden([]);
      setPrecioFinal('');
      setObservaciones('');
      setPrioridad('normal');
      setTecnicoAsignado('');
      setKilometrajeEntrada('');
      setFechaEntrega('');
      setCotizacionSeleccionada(null);
      setCotizacionesCliente([]);
      setUsandoCotizacion(false);
      setTotalBloqueado(false);
      setFotos([]);
      // Resetear nuevos campos
      setFechaIngreso(new Date().toISOString().split('T')[0]);
      setFechaEgreso('');
      setFechaProgramada('');
      setConcepto('REPARACIÓN');
      setCombustible('Bajo');
      setNombreInspector('');
      setNumeroSiniestro('');
      setFranquicia('');
      setBusquedaProducto('');
      setItemsTabla([]);
      setDescuento(0);
      setEfectivo(0);
      setCuentaCorriente('');
      setTotalPago(0);
      setComentarioInterno('');
      setShowClienteModal(false);
      setShowVehiculoModal(false);
      setShowProductoModal(false);
      // Resetear detallesOrden SOLO después de guardar exitosamente
      setDetallesOrden([]);
      setIsLoading(false);
      onClose();
    } catch (error) {
      Logger.error('Error guardando orden:', error);
      setIsLoading(false);
      notify.error('Error al guardar la orden de trabajo', error instanceof Error ? error.message : 'Error desconocido');
      // No cerrar el formulario si hay error, para que el usuario pueda corregir
    }
  };

  // Si no está abierto, no renderizar nada
  if (!isOpen) return null;

  // Contenido del formulario (reutilizable para ambos modos)
  const formContent = (
    <div className="h-full">
        {/* Header interno con información del paso */}
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <Wrench className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Nueva Orden de Trabajo</h2>
            <p className="text-sm text-gray-500">Paso {step} de 4</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-3 bg-gray-50">
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4].map((stepNumber) => (
              <div key={stepNumber} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step >= stepNumber
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {stepNumber}
                </div>
                {stepNumber < 4 && (
                  <div
                    className={`w-16 h-1 mx-2 ${
                      step > stepNumber ? 'bg-red-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Paso 1: Selección de Cliente */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Seleccionar Cliente</h3>
                
                {/* Tipo de Cliente */}
                <div className="flex gap-4 mb-6">
                  <button
                    onClick={() => setTipoCliente('existente')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      tipoCliente === 'existente'
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    🔍 Buscar Cliente Existente
                  </button>
                  <button
                    onClick={() => setTipoCliente('nuevo')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      tipoCliente === 'nuevo'
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    ✨ Nuevo Cliente
                  </button>
                </div>

                {tipoCliente === 'existente' ? (
                  <div className="space-y-4">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-sm text-red-800">
                        <strong>💡 Buscar Cliente:</strong> Selecciona un cliente existente de la lista. 
                        Si no encuentras el cliente, cambia a "Nuevo Cliente" para ingresar sus datos.
                      </p>
                    </div>
                    {/* Búsqueda de Cliente */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        ref={inputBusquedaClienteRef}
                        value={busquedaCliente}
                        onChange={(e) => {
                          // Actualización síncrona e inmediata - useDeferredValue maneja la optimización
                          setBusquedaCliente(e.target.value);
                        }}
                        autoFocus
                        placeholder="Buscar por nombre, RUT o teléfono..."
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 pointer-events-auto"
                      />
                    </div>

                    {/* Lista de Clientes */}
                    <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md">
                      {clientesFiltrados.map((cliente) => (
                        <div
                          key={cliente.id}
                          onClick={() => setClienteSeleccionado(cliente)}
                          className={`p-3 cursor-pointer hover:bg-gray-50 border-b border-gray-100 ${
                            clienteSeleccionado?.id === cliente.id ? 'bg-red-50 border-red-200' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <User className="h-5 w-5 text-gray-400" />
                            <div>
                              <p className="font-medium text-gray-900">{cliente.nombre}</p>
                              <p className="text-sm text-gray-500">
                                RUT: {cliente.rut} | Tel: {cliente.telefono}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Mostrar cotizaciones del cliente si existen */}
                    {cotizacionesCliente.length > 0 && (
                      <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-3">
                          <FileText className="h-4 w-4 text-red-600" />
                          <h4 className="font-medium text-red-900">
                            Cotizaciones Previas del Cliente ({cotizacionesCliente.length})
                          </h4>
                        </div>
                        <select
                          value={cotizacionSeleccionada?.id || ''}
                          onChange={async (e) => {
                            const cotiSel = cotizacionesCliente.find(c => c.id === Number(e.target.value)) || null;
                            setCotizacionSeleccionada(cotiSel);
                            if (cotiSel) {
                              await importarDesdeCotizacion(cotiSel);
                            }
                          }}
                          className="w-full px-3 py-2 border border-red-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 mb-3"
                          aria-label="Seleccionar cotización previa del cliente"
                          title="Seleccionar cotización previa del cliente"
                        >
                          <option value="">Seleccionar cotización...</option>
                          {cotizacionesCliente.map((cotizacion) => (
                            <option key={cotizacion.id} value={cotizacion.id}>
                              {cotizacion.numero} - ${cotizacion.total?.toLocaleString('es-CL') || 0}
                            </option>
                          ))}
                        </select>
                        {cotizacionSeleccionada && (
                          <button
                            type="button"
                            onClick={importarDesdeCotizacion}
                            className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
                          >
                            📥 Importar Datos de Cotización
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-sm text-green-800">
                        <strong>✨ Nuevo Cliente:</strong> Ingresa los datos del cliente en este formulario. 
                        El sistema verificará si el cliente ya existe (por RUT o email). Si no existe, 
                        se guardará en la base de datos para futuras gestiones. Podrás crear la orden de trabajo 
                        sin necesidad de salir del formulario.
                      </p>
                    </div>
                    {/* Formulario Nuevo Cliente */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Nombre Completo
                        </label>
                        <input
                          ref={inputNombreClienteRef}
                          type="text"
                          value={nuevoCliente.nombre}
                          onChange={(e) => setNuevoCliente(prev => ({ ...prev, nombre: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 pointer-events-auto"
                          placeholder="Nombre del cliente"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          RUT
                        </label>
                        <input
                          type="text"
                          value={nuevoCliente.rut}
                          onChange={(e) => {
                            const formatted = formatearRUT(e.target.value);
                            setNuevoCliente(prev => ({ ...prev, rut: formatted }));
                          }}
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 ${
                            nuevoCliente.rut && !validarRUT(nuevoCliente.rut) 
                              ? 'border-red-500' 
                              : 'border-gray-300'
                          }`}
                          placeholder="12.345.678-9"
                        />
                        {nuevoCliente.rut && (() => {
                          const validacion = Validation.rut(nuevoCliente.rut);
                          return !validacion.valido ? (
                            <p className="text-red-500 text-xs mt-1">
                              {validacion.mensaje || 'El RUT ingresado no es válido'}
                            </p>
                          ) : null;
                        })()}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Teléfono
                        </label>
                        <input
                          type="tel"
                          value={nuevoCliente.telefono}
                          onChange={(e) => setNuevoCliente(prev => ({ ...prev, telefono: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                          placeholder="+56 9 1234 5678"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email
                        </label>
                        <input
                          type="email"
                          value={nuevoCliente.email}
                          onChange={(e) => setNuevoCliente(prev => ({ ...prev, email: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                          placeholder="cliente@email.com"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Dirección
                        </label>
                        <input
                          type="text"
                          value={nuevoCliente.direccion}
                          onChange={(e) => setNuevoCliente(prev => ({ ...prev, direccion: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                          placeholder="Dirección del cliente"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Paso 2: Datos del Vehículo */}
          {step === 2 && !usandoCotizacion && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Datos del Vehículo</h3>
                {/* Selector de modo si el cliente tiene vehículos */}
                {tipoCliente === 'existente' && clienteSeleccionado && (
                  <div className="mb-4 flex gap-2">
                    <button 
                      onClick={() => setModoVehiculo('existente')} 
                      className={`px-3 py-1 rounded ${modoVehiculo === 'existente' ? 'bg-red-600 text-white' : 'bg-gray-100'}`}
                    >
                      Usar vehículo existente
                    </button>
                    <button 
                      onClick={() => setModoVehiculo('nuevo')} 
                      className={`px-3 py-1 rounded ${modoVehiculo === 'nuevo' ? 'bg-red-600 text-white' : 'bg-gray-100'}`}
                    >
                      Vehículo nuevo
                    </button>
                  </div>
                )}

                {modoVehiculo === 'existente' && vehiculosDelCliente.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Selecciona uno de los vehículos del cliente:</p>
                    <div className="max-h-56 overflow-y-auto border rounded">
                      {vehiculosDelCliente.map(v => (
                        <div 
                          key={v.id} 
                          onClick={() => setVehiculoSeleccionado(v)} 
                          className={`p-3 border-b cursor-pointer ${vehiculoSeleccionado?.id === v.id ? 'bg-red-50 border-red-200' : ''}`}
                        >
                          <div className="flex items-center gap-3">
                            <Car className="h-4 w-4 text-gray-500"/>
                            <div>
                              <p className="font-medium text-gray-900">{v.marca} {v.modelo} ({v.año})</p>
                              <p className="text-sm text-gray-600">Patente: {v.patente}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {vehiculosDelCliente.length === 0 && (
                      <p className="text-sm text-gray-500">Este cliente no tiene vehículos. Cambia a "Vehículo nuevo".</p>
                    )}
                  </div>
                ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Patente *
                    </label>
                    <input
                      type="text"
                      ref={inputPatenteRef}
                      value={nuevoVehiculo.patente}
                      onChange={(e) => setNuevoVehiculo(prev => ({ ...prev, patente: e.target.value.toUpperCase() }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 pointer-events-auto"
                      placeholder="ABC123"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Marca *
                    </label>
                    <input
                      type="text"
                      value={nuevoVehiculo.marca}
                      onChange={(e) => setNuevoVehiculo(prev => ({ ...prev, marca: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="Toyota"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Modelo *
                    </label>
                    <input
                      type="text"
                      value={nuevoVehiculo.modelo}
                      onChange={(e) => setNuevoVehiculo(prev => ({ ...prev, modelo: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="Corolla"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      N° Chasis
                    </label>
                    <input
                      type="text"
                      value={nuevoVehiculo.numeroChasis || ''}
                      onChange={(e) => setNuevoVehiculo(prev => ({ ...prev, numeroChasis: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="Opcional"
                    />
                  </div>
                </div>
                )}

                {/* Kilometraje de Entrada */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kilometraje de Entrada
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={kilometrajeEntrada === '' ? '' : kilometrajeEntrada}
                    onChange={(e) => {
                      const valor = e.target.value;
                      startTransition(() => {
                        if (valor === '') {
                          setKilometrajeEntrada('');
                        } else {
                          const num = parseInt(valor.replace(/[^0-9]/g, ''), 10);
                          if (!isNaN(num)) {
                            setKilometrajeEntrada(num);
                          }
                        }
                      });
                    }}
                    onFocus={(e) => {
                      if (kilometrajeEntrada === '' || kilometrajeEntrada === 0) {
                        e.target.select();
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="50000"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Paso 3: Trabajo y Repuestos */}
          {step === 3 && !usandoCotizacion && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Descripción del Trabajo</h3>
                <textarea
                  ref={textareaDescripcionRef}
                  value={descripcionTrabajo}
                  onChange={(e) => setDescripcionTrabajo(e.target.value)}
                  onFocus={(e) => {
                    // Asegurar que el textarea sea interactivo
                    e.target.style.pointerEvents = 'auto';
                  }}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  style={{ pointerEvents: 'auto' }}
                  placeholder="Describe el trabajo a realizar..."
                />
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Repuestos a Utilizar</h3>
                
                {/* Búsqueda de Repuestos */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={busquedaRepuesto}
                    onChange={(e) => {
                      const value = e.target.value;
                      startTransition(() => {
                        setBusquedaRepuesto(value);
                      });
                    }}
                    placeholder="Buscar repuestos..."
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                {/* Lista de Repuestos Disponibles */}
                {repuestosFiltrados.length > 0 && (
                  <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md mb-4">
                    {!busquedaRepuesto && (
                      <div className="p-2 bg-gray-50 border-b border-gray-200">
                        <p className="text-xs text-gray-600 font-medium">
                          Mostrando {repuestosFiltrados.length} de {repuestos.length} repuestos disponibles
                        </p>
                      </div>
                    )}
                    {repuestosFiltrados.map((repuesto) => (
                      <div
                        key={repuesto.id}
                        onClick={() => agregarRepuesto(repuesto)}
                        className="p-3 cursor-pointer hover:bg-gray-50 border-b border-gray-100 flex items-center justify-between transition-colors"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{repuesto.nombre}</p>
                          <p className="text-sm text-gray-500">
                            {repuesto.codigo && `Código: ${repuesto.codigo} | `}Stock: {repuesto.stock || 0} | {repuesto.categoria || 'Sin categoría'}
                          </p>
                        </div>
                        <div className="text-right ml-4">
                          <p className="font-medium text-gray-900">${repuesto.precio?.toLocaleString('es-CL') || 0}</p>
                          <Plus className="h-4 w-4 text-green-600 mx-auto mt-1" />
                        </div>
                      </div>
                    ))}
                    {repuestosFiltrados.length === 0 && busquedaRepuesto && (
                      <div className="p-3 text-sm text-gray-500 text-center">
                        No se encontraron repuestos que coincidan con "{busquedaRepuesto}"
                      </div>
                    )}
                  </div>
                )}

                {/* Repuestos Seleccionados */}
                <div className="space-y-2">
                  {repuestosSeleccionados.map((repuesto) => (
                    <div key={repuesto.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{repuesto.nombre}</p>
                        <p className="text-sm text-gray-500">${repuesto.precio.toLocaleString('es-CL')} c/u</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => actualizarCantidadRepuesto(repuesto.id, repuesto.cantidad - 1)}
                            className="w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center hover:bg-red-200"
                          >
                            -
                          </button>
                          <span className="w-8 text-center font-medium">{repuesto.cantidad}</span>
                          <button
                            onClick={() => actualizarCantidadRepuesto(repuesto.id, repuesto.cantidad + 1)}
                            className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center hover:bg-green-200"
                          >
                            +
                          </button>
                        </div>
                        <div className="text-right min-w-[100px]">
                          <p className="font-medium text-gray-900">${repuesto.subtotal.toLocaleString('es-CL')}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Resumen de Repuestos */}
                {repuestosSeleccionados.length > 0 && (
                  <div className="mt-4 p-4 bg-red-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-900">Subtotal Repuestos:</span>
                      <span className="font-bold text-red-600">${subtotalRepuestos.toLocaleString('es-CL')}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Paso 4: Resumen y Configuración Final */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Resumen de la Orden de Trabajo</h3>
                
                {/* Información del Cliente */}
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">Cliente</h4>
                  <p className="text-gray-700">
                    {tipoCliente === 'existente' && clienteSeleccionado
                      ? `${clienteSeleccionado.nombre} (${clienteSeleccionado.rut})`
                      : `${nuevoCliente.nombre} (${nuevoCliente.rut})`
                    }
                  </p>
                </div>

                {/* Información del Vehículo */}
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">Vehículo</h4>
                  <p className="text-gray-700">
                    {vehiculoSeleccionado 
                      ? `${vehiculoSeleccionado.marca} ${vehiculoSeleccionado.modelo} - ${vehiculoSeleccionado.patente}`
                      : `${nuevoVehiculo.marca} ${nuevoVehiculo.modelo} - ${nuevoVehiculo.patente}`
                    }
                  </p>
                  {((typeof kilometrajeEntrada === 'number' && kilometrajeEntrada > 0) || (typeof kilometrajeEntrada === 'string' && kilometrajeEntrada !== '' && Number(kilometrajeEntrada) > 0)) && (
                    <p className="text-gray-700">Kilometraje: {Number(kilometrajeEntrada).toLocaleString('es-CL')} km</p>
                  )}
                </div>

                {/* Descripción del Trabajo */}
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">Trabajo a Realizar</h4>
                  <p className="text-gray-700">{descripcionTrabajo}</p>
                </div>

                {/* Repuestos */}
                {repuestosSeleccionados.length > 0 && (
                  <div className="bg-gray-50 p-4 rounded-lg mb-4">
                    <h4 className="font-medium text-gray-900 mb-2">Repuestos</h4>
                    <div className="space-y-2">
                      {repuestosSeleccionados.map((repuesto) => (
                        <div key={repuesto.id} className="flex justify-between">
                          <span className="text-gray-700">
                            {repuesto.nombre} x{repuesto.cantidad}
                          </span>
                          <span className="font-medium text-gray-900">
                            ${repuesto.subtotal.toLocaleString('es-CL')}
                          </span>
                        </div>
                      ))}
                      <div className="border-t pt-2 flex justify-between font-medium">
                        <span>Subtotal Repuestos:</span>
                        <span>${subtotalRepuestos.toLocaleString('es-CL')}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Configuración de la Orden */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Prioridad
                    </label>
                    <select
                      value={prioridad}
                      onChange={(e) => {
                        startTransition(() => {
                          setPrioridad(e.target.value as 'baja' | 'normal' | 'alta' | 'urgente');
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                      title="Seleccionar prioridad de la orden"
                    >
                      <option value="baja">Baja</option>
                      <option value="normal">Normal</option>
                      <option value="alta">Alta</option>
                      <option value="urgente">Urgente</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Técnico Asignado
                    </label>
                    <input
                      type="text"
                      value={tecnicoAsignado}
                      onChange={(e) => {
                        startTransition(() => {
                          setTecnicoAsignado(e.target.value);
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="Nombre del técnico"
                    />
                  </div>
                </div>

                {/* Fecha de Entrega */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha Estimada de Entrega
                  </label>
                  <input
                    type="date"
                    value={fechaEntrega}
                    onChange={(e) => {
                      startTransition(() => {
                        setFechaEntrega(e.target.value);
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    title="Fecha estimada de entrega"
                  />
                </div>

                {/* Precio Final */}
                <div className="bg-red-50 p-4 rounded-lg mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Precio Final del Trabajo *
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      inputMode="numeric"
                      value={precioFinal}
                      onChange={(e) => {
                        // Permitir solo números
                        const valor = e.target.value.replace(/[^0-9]/g, '');
                        setPrecioFinal(valor);
                      }}
                      onFocus={(e) => {
                        // Seleccionar todo el texto cuando se hace foco para poder escribir directamente
                        e.target.select();
                      }}
                      disabled={totalBloqueado}
                      className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 ${totalBloqueado ? 'bg-gray-100 border-gray-200 text-gray-600' : 'border-gray-300'}`}
                      placeholder="0"
                    />
                  </div>
                  {totalBloqueado && (
                    <p className="text-xs text-gray-600 mt-1">Total fijado desde la cotización.</p>
                  )}
                  <p className="text-sm text-gray-500 mt-1">
                    Incluye mano de obra y todos los repuestos
                  </p>
                </div>

                {/* Observaciones y Fotografías */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Observaciones</label>
                  <textarea
                    value={observaciones}
                    onChange={(e) => {
                      startTransition(() => {
                        setObservaciones(e.target.value);
                      });
                    }}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Observaciones adicionales..."
                  />

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Fotografías (JPG/PNG/WebP)</label>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => handleFiles(e.target.files)}
                      className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                    />
                    {fotos.length > 0 && (
                      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                        {fotos.map((f, idx) => (
                          <div key={idx} className="relative border rounded-md overflow-hidden">
                            <img src={f.dataUrl} alt={f.name} className="w-full h-28 object-cover" />
                            <button type="button" onClick={() => removeFoto(idx)} className="absolute top-1 right-1 bg-white/80 hover:bg-white text-red-600 text-xs px-2 py-0.5 rounded">Quitar</button>
                </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer - Solo en modo modal */}
        {!fullPage && (
          <div className="flex justify-between items-center p-6 border-t border-gray-200">
            <button
              onClick={() => step > 1 ? setStep(step - 1) : onClose()}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              {step > 1 ? 'Anterior' : 'Cancelar'}
            </button>
            
            <div className="flex gap-3">
              {step < 4 ? (
                <button
                  onClick={() => setStep(usandoCotizacion ? (step === 1 ? 4 : Math.min(4, step + 1)) : step + 1)}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
                >
                  Siguiente
                </button>
              ) : (
                <button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Crear Orden de Trabajo
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
  );

  // Modo página completa (estilo Dirup) - Formulario completo de una sola página
  if (fullPage) {
    // Calcular totales
    const subtotalRepuestos = itemsTabla.filter(i => i.tipo === 'repuesto').reduce((sum, item) => sum + item.subtotal, 0);
    const subtotalServicios = itemsTabla.filter(i => i.tipo === 'servicio').reduce((sum, item) => sum + item.subtotal, 0);
    const totalNeto = subtotalRepuestos + subtotalServicios - descuento;
    const iva = totalNeto * 0.19;
    const total = totalNeto + iva;
    
    return (
      <div className="flex flex-col h-full bg-gray-50">
        {/* Header estilo Dirup */}
        <div className="bg-black text-white px-6 py-4 flex items-center justify-between border-b border-gray-800">
          <h1 className="text-xl font-semibold">{isPresupuesto ? 'Presupuesto' : 'Orden'}</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-white bg-transparent hover:bg-gray-800 rounded transition-colors"
            >
              Volver
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-white bg-transparent hover:bg-gray-800 rounded transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Guardando...
                </>
              ) : (
                'Confirmar'
              )}
            </button>
          </div>
        </div>
        
        {/* Contenido del formulario completo */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Sección 1: Fechas y Técnico */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className={`grid grid-cols-1 ${isPresupuesto ? 'md:grid-cols-2' : 'md:grid-cols-4'} gap-4`}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {isPresupuesto ? 'Fecha emisión:' : 'Fecha ingreso:'}
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="date"
                      value={fechaIngreso}
                      onChange={(e) => setFechaIngreso(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-gray-900"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {isPresupuesto ? 'Válida hasta:' : 'Fecha egreso:'}
                  </label>
                  <div className="relative">
                    <Info className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="date"
                      value={fechaEgreso}
                      onChange={(e) => setFechaEgreso(e.target.value)}
                      className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-gray-900"
                      placeholder="dd/mm/aaaa, --:--"
                    />
                  </div>
                </div>
                {!isPresupuesto && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fecha programada:
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="datetime-local"
                        value={fechaProgramada}
                        onChange={(e) => setFechaProgramada(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-gray-900"
                      />
                    </div>
                  </div>
                )}
                {!isPresupuesto && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Técnico:</label>
                    <input
                      type="text"
                      value={tecnicoAsignado}
                      onChange={(e) => setTecnicoAsignado(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-gray-900"
                      placeholder="Nombre del técnico"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Sección 2: Cliente y Vehículo */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Buscar cliente:</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={clienteSeleccionado ? `${clienteSeleccionado.nombre} (${clienteSeleccionado.rut})` : busquedaCliente}
                        onChange={(e) => setBusquedaCliente(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-gray-900"
                        placeholder="..."
                      />
                      {clienteSeleccionado && (
                        <div className="mt-2 text-xs text-gray-600">
                          RUT: {clienteSeleccionado.rut} | Tel: {clienteSeleccionado.telefono}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => setShowClienteModal(true)}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Buscar Vehículo:</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Car className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={vehiculoSeleccionado ? `${vehiculoSeleccionado.marca} ${vehiculoSeleccionado.modelo} - ${vehiculoSeleccionado.patente}` : ''}
                        onChange={(e) => {}}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-gray-900"
                        placeholder="..."
                      />
                      {vehiculoSeleccionado && (
                        <div className="mt-2 text-xs text-gray-600">
                          Patente: {vehiculoSeleccionado.patente}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => setShowVehiculoModal(true)}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Sección 3: Concepto, Combustible, Recordatorio */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className={`grid grid-cols-1 ${isPresupuesto ? 'md:grid-cols-1' : 'md:grid-cols-3'} gap-4`}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Concepto:</label>
                  <select
                    value={concepto}
                    onChange={(e) => setConcepto(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-gray-900"
                  >
                    <option value="REPARACIÓN">REPARACIÓN</option>
                    <option value="MANTENCIÓN">MANTENCIÓN</option>
                    <option value="REVISIÓN">REVISIÓN</option>
                    <option value="OTRO">OTRO</option>
                  </select>
                </div>
                {!isPresupuesto && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Combustible:</label>
                      <select
                        value={combustible}
                        onChange={(e) => setCombustible(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-gray-900"
                      >
                        <option value="Bajo">Bajo</option>
                        <option value="Medio">Medio</option>
                        <option value="Alto">Alto</option>
                        <option value="Lleno">Lleno</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Recordatorio:</label>
                      <button
                        type="button"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-red-600 hover:bg-red-700 text-white transition-colors"
                      >
                        Programar
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Sección 4: Kilometraje, Inspector, Número Siniestro, Franquicia */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Kilometraje:</label>
                  <div className="flex">
                    <span className="px-3 py-2 bg-gray-100 border border-r-0 border-gray-300 rounded-l-md text-gray-700">KM</span>
                    <input
                      type="number"
                      value={kilometrajeEntrada}
                      onChange={(e) => setKilometrajeEntrada(e.target.value === '' ? '' : Number(e.target.value))}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-r-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-gray-900"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nombre Inspector:</label>
                  <input
                    type="text"
                    value={nombreInspector}
                    onChange={(e) => setNombreInspector(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-gray-900"
                    placeholder="Nombre del inspector"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Número Siniestro:</label>
                  <input
                    type="text"
                    value={numeroSiniestro}
                    onChange={(e) => setNumeroSiniestro(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-gray-900"
                    placeholder="Número de siniestro"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Franquicia:</label>
                  <div className="flex">
                    <span className="px-3 py-2 bg-gray-100 border border-r-0 border-gray-300 rounded-l-md text-gray-700">$</span>
                    <input
                      type="number"
                      value={franquicia}
                      onChange={(e) => setFranquicia(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-r-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-gray-900"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Sección 5: Tabla de Items */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <label className="text-sm font-medium text-gray-700">Buscar Producto o Servicio...</label>
                  <button
                    onClick={() => setShowProductoModal(true)}
                    className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <input
                  type="text"
                  value={busquedaProducto}
                  onChange={(e) => setBusquedaProducto(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-gray-900"
                  placeholder="Buscar producto o servicio..."
                />
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100 text-gray-900">
                      <th className="px-4 py-2 border border-gray-300 text-left">Item</th>
                      <th className="px-4 py-2 border border-gray-300 text-left">Importe</th>
                      <th className="px-4 py-2 border border-gray-300 text-left">Cantidad</th>
                      <th className="px-4 py-2 border border-gray-300 text-left">Tipo</th>
                      <th className="px-4 py-2 border border-gray-300 text-left">Bonif.</th>
                      <th className="px-4 py-2 border border-gray-300 text-left">Subtotal</th>
                      <th className="px-4 py-2 border border-gray-300 text-left">IVA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemsTabla.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-4 text-center text-gray-500 border border-gray-300">
                          No hay items agregados
                        </td>
                      </tr>
                    ) : (
                      itemsTabla.map((item, index) => (
                        <tr key={item.id} className="border-b border-gray-300">
                          <td className="px-4 py-2 border border-gray-300 bg-white text-gray-900">{item.nombre}</td>
                          <td className="px-4 py-2 border border-gray-300 bg-white text-gray-900">${item.importe.toLocaleString('es-CL')}</td>
                          <td className="px-4 py-2 border border-gray-300 bg-white text-gray-900">
                            <input
                              type="number"
                              value={item.cantidad === 0 ? '' : item.cantidad}
                              onChange={(e) => {
                                const newItems = [...itemsTabla];
                                newItems[index].cantidad = e.target.value === '' ? 0 : Number(e.target.value);
                                newItems[index].subtotal = newItems[index].importe * newItems[index].cantidad * (1 - newItems[index].bonif / 100);
                                newItems[index].iva = newItems[index].subtotal * 0.19;
                                setItemsTabla(newItems);
                              }}
                              className="w-20 px-2 py-1 border border-gray-300 rounded bg-white text-gray-900"
                            />
                          </td>
                          <td className="px-4 py-2 border border-gray-300 bg-white text-gray-900">
                            <select
                              value={item.tipo}
                              onChange={(e) => {
                                const newItems = [...itemsTabla];
                                newItems[index].tipo = e.target.value as 'servicio' | 'repuesto';
                                setItemsTabla(newItems);
                              }}
                              className="px-2 py-1 border border-gray-300 rounded bg-white text-gray-900"
                            >
                              <option value="servicio">Servicio</option>
                              <option value="repuesto">Repuesto</option>
                            </select>
                          </td>
                          <td className="px-4 py-2 border border-gray-300 bg-white text-gray-900">
                            <input
                              type="number"
                              value={item.bonif === 0 ? '' : item.bonif}
                              onChange={(e) => {
                                const newItems = [...itemsTabla];
                                newItems[index].bonif = e.target.value === '' ? 0 : Number(e.target.value);
                                newItems[index].subtotal = newItems[index].importe * newItems[index].cantidad * (1 - newItems[index].bonif / 100);
                                newItems[index].iva = newItems[index].subtotal * 0.19;
                                setItemsTabla(newItems);
                              }}
                              className="w-20 px-2 py-1 border border-gray-300 rounded bg-white text-gray-900"
                            />
                          </td>
                          <td className="px-4 py-2 border border-gray-300 bg-white text-gray-900">${item.subtotal.toLocaleString('es-CL')}</td>
                          <td className="px-4 py-2 border border-gray-300 bg-white text-gray-900">${item.iva.toLocaleString('es-CL')}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sección 6: Resumen y Pago */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Resumen */}
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold mb-4">Resumen</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Descuento:</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={descuento === 0 ? '' : descuento}
                        onChange={(e) => setDescuento(e.target.value === '' ? 0 : Number(e.target.value))}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-right"
                      />
                      <span>%</span>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span>Repuestos:</span>
                    <span>${subtotalRepuestos.toLocaleString('es-CL')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Mano de obra:</span>
                    <span>${subtotalServicios.toLocaleString('es-CL')}</span>
                  </div>
                  <div className="flex justify-between font-semibold border-t pt-2">
                    <span>Total neto:</span>
                    <span>${totalNeto.toLocaleString('es-CL')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>IVA:</span>
                    <span>${iva.toLocaleString('es-CL')}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total:</span>
                    <span>${total.toLocaleString('es-CL')}</span>
                  </div>
                </div>
              </div>

              {/* Pago */}
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold mb-4">Pago</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span>Efectivo:</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={efectivo === 0 ? '' : efectivo}
                        onChange={(e) => setEfectivo(e.target.value === '' ? 0 : Number(e.target.value))}
                        className="w-32 px-2 py-1 border border-gray-300 rounded text-right"
                      />
                      <Info className="h-4 w-4 text-red-600" />
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Cuenta corriente:</span>
                    <div className="flex items-center gap-2">
                      <select
                        value={cuentaCorriente}
                        onChange={(e) => setCuentaCorriente(e.target.value)}
                        className="px-2 py-1 border border-gray-300 rounded"
                      >
                        <option value="">Seleccionar</option>
                      </select>
                      <input
                        type="number"
                        value={totalPago === 0 ? '' : totalPago}
                        onChange={(e) => setTotalPago(e.target.value === '' ? 0 : Number(e.target.value))}
                        className="w-32 px-2 py-1 border border-gray-300 rounded text-right"
                      />
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    </div>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total pago:</span>
                    <span>${(efectivo + totalPago).toLocaleString('es-CL')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sección 7: Observaciones y Comentario Interno */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">Observaciones:</label>
                <textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-gray-900"
                  placeholder="Observaciones..."
                />
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">Comentario Interno:</label>
                <textarea
                  value={comentarioInterno}
                  onChange={(e) => setComentarioInterno(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-gray-900"
                  placeholder="Comentario interno..."
                />
              </div>
            </div>

            {/* Botón Ir arriba */}
            <div className="flex justify-end">
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <ArrowUp className="h-4 w-4" />
                Ir arriba
              </button>
            </div>
          </div>
        </div>

        {/* Modales de selección */}
        {/* Modal Cliente */}
        {showClienteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Seleccionar Cliente</h2>
                <button onClick={() => setShowClienteModal(false)} className="text-gray-500 hover:text-gray-700">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={busquedaCliente}
                  onChange={(e) => setBusquedaCliente(e.target.value)}
                  placeholder="Buscar por nombre, RUT o teléfono..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div className="max-h-96 overflow-y-auto">
                {clientesFiltrados.map((cliente) => (
                  <div
                    key={cliente.id}
                    onClick={() => {
                      setClienteSeleccionado(cliente);
                      setShowClienteModal(false);
                    }}
                    className="p-3 cursor-pointer hover:bg-gray-50 border-b border-gray-100"
                  >
                    <div className="flex items-center gap-3">
                      <User className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">{cliente.nombre}</p>
                        <p className="text-sm text-gray-500">
                          RUT: {cliente.rut} | Tel: {cliente.telefono}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Modal Vehículo */}
        {showVehiculoModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Seleccionar Vehículo</h2>
                <button onClick={() => setShowVehiculoModal(false)} className="text-gray-500 hover:text-gray-700">
                  <X className="h-5 w-5" />
                </button>
              </div>
              {clienteSeleccionado ? (
                <div className="max-h-96 overflow-y-auto">
                  {vehiculosDelCliente.map((vehiculo) => (
                    <div
                      key={vehiculo.id}
                      onClick={() => {
                        setVehiculoSeleccionado(vehiculo);
                        setShowVehiculoModal(false);
                      }}
                      className="p-3 cursor-pointer hover:bg-gray-50 border-b border-gray-100"
                    >
                      <div className="flex items-center gap-3">
                        <Car className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900">{vehiculo.marca} {vehiculo.modelo} ({vehiculo.año})</p>
                          <p className="text-sm text-gray-500">Patente: {vehiculo.patente}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">Primero debe seleccionar un cliente</p>
              )}
            </div>
          </div>
        )}

        {/* Modal Producto/Servicio */}
        {showProductoModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Agregar Producto o Servicio</h2>
                <button onClick={() => setShowProductoModal(false)} className="text-gray-500 hover:text-gray-700">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={busquedaProducto}
                  onChange={(e) => setBusquedaProducto(e.target.value)}
                  placeholder="Buscar producto o servicio..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div className="max-h-96 overflow-y-auto">
                {/* Repuestos */}
                {repuestosFiltrados
                  .filter(r => !busquedaProducto || r.nombre.toLowerCase().includes(busquedaProducto.toLowerCase()) || r.codigo?.toLowerCase().includes(busquedaProducto.toLowerCase()))
                  .map((repuesto) => (
                    <div
                      key={`repuesto-${repuesto.id}`}
                      onClick={() => {
                        const newItem = {
                          id: repuesto.id || Date.now(),
                          nombre: repuesto.nombre,
                          importe: repuesto.precio || 0,
                          cantidad: 1,
                          tipo: 'repuesto' as const,
                          bonif: 0,
                          subtotal: repuesto.precio || 0,
                          iva: (repuesto.precio || 0) * 0.19
                        };
                        setItemsTabla([...itemsTabla, newItem]);
                        setShowProductoModal(false);
                        setBusquedaProducto('');
                      }}
                      className="p-3 cursor-pointer hover:bg-gray-50 border-b border-gray-100 flex justify-between"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{repuesto.nombre}</p>
                        <p className="text-sm text-gray-500">{repuesto.codigo || 'Sin código'} | Stock: {repuesto.stock || 0} | Repuesto</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">${(repuesto.precio || 0).toLocaleString('es-CL')}</p>
                      </div>
                    </div>
                  ))}
                
                {/* Servicios */}
                {servicios
                  .filter(s => !busquedaProducto || s.nombre.toLowerCase().includes(busquedaProducto.toLowerCase()))
                  .map((servicio) => (
                    <div
                      key={`servicio-${servicio.id}`}
                      onClick={() => {
                        const newItem = {
                          id: servicio.id || Date.now(),
                          nombre: servicio.nombre,
                          importe: servicio.precio || 0,
                          cantidad: 1,
                          tipo: 'servicio' as const,
                          bonif: 0,
                          subtotal: servicio.precio || 0,
                          iva: (servicio.precio || 0) * 0.19
                        };
                        setItemsTabla([...itemsTabla, newItem]);
                        setShowProductoModal(false);
                        setBusquedaProducto('');
                      }}
                      className="p-3 cursor-pointer hover:bg-gray-50 border-b border-gray-100 flex justify-between"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{servicio.nombre}</p>
                        <p className="text-sm text-gray-500">{servicio.descripcion || 'Sin descripción'} | Servicio</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">${(servicio.precio || 0).toLocaleString('es-CL')}</p>
                      </div>
                    </div>
                  ))}
                
                {repuestosFiltrados.length === 0 && servicios.length === 0 && (
                  <div className="p-3 text-center text-gray-500">
                    No se encontraron productos o servicios
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Modo modal (comportamiento original)
  // El preventAutoClose en ActionDialog ya previene el cierre automático
  // Los datos se guardan automáticamente, así que el formulario puede permanecer abierto

  return (
    <ActionDialog
      open={isOpen}
      onOpenChange={handleOpenChange}
      variant="modal"
      size="xl"
      title={step === 1 ? "Seleccionar Cliente" : step === 2 ? "Seleccionar Vehículo" : step === 3 ? "Detalles del Trabajo" : "Resumen de la Orden"}
      preventAutoClose={true}
    >
      {formContent}
    </ActionDialog>
  );
}
