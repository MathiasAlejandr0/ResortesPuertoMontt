import React, { useState, useEffect, useMemo, useDeferredValue, startTransition, useLayoutEffect, useRef } from 'react';
import { X, User, Car, Calendar, DollarSign, Plus, Search, FileText, Send, Eye, EyeOff } from 'lucide-react';
import { Cliente, Vehiculo, Cotizacion, Repuesto } from '../types';
import { useApp } from '../contexts/AppContext';
import { notify, Logger, formatearRUT } from '../utils/cn';

interface CotizacionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (cotizacion: Cotizacion) => void;
}

interface RepuestoCotizacion {
  id: number;
  nombre: string;
  categoria: string;
  precio: number;
  cantidad: number;
  subtotal: number;
}

export default function CotizacionFormMejorado({ 
  isOpen, 
  onClose, 
  onSave
}: CotizacionFormProps) {
  // Usar el contexto para acceder a los datos
  const { clientes, vehiculos, repuestos, addCliente, addVehiculo, refreshRepuestos } = useApp();
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
  const [modoVehiculo, setModoVehiculo] = useState<'existente'|'nuevo'>('existente');
  const [nuevoVehiculo, setNuevoVehiculo] = useState<Vehiculo>({
    clienteId: 0,
    marca: '',
    modelo: '',
    año: new Date().getFullYear(),
    patente: '',
    color: '',
    kilometraje: 0,
    observaciones: '',
    activo: true
  });
  const [descripcionTrabajo, setDescripcionTrabajo] = useState('');
  const [repuestosSeleccionados, setRepuestosSeleccionados] = useState<RepuestoCotizacion[]>([]);
  const [precioFinal, setPrecioFinal] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [validaHasta, setValidaHasta] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Vehículos del cliente seleccionado
  const vehiculosDelCliente = useMemo(() => {
    if (!clienteSeleccionado?.id) return [] as Vehiculo[];
    return vehiculos.filter(v => v.clienteId === clienteSeleccionado.id);
  }, [vehiculos, clienteSeleccionado?.id]);

  // Al cambiar cliente, resetear selección de vehículo y modo (usando startTransition para no bloquear)
  useEffect(() => {
    startTransition(() => {
      setVehiculoSeleccionado(null);
      if (vehiculosDelCliente.length > 0) {
        setModoVehiculo('existente');
      } else {
        setModoVehiculo('nuevo');
      }
    });
  }, [clienteSeleccionado?.id, vehiculosDelCliente.length]);

  // Resetear formulario SIEMPRE que se abre (no usar ref para permitir múltiples aperturas)
  useLayoutEffect(() => {
    if (isOpen) {
      // Resetear TODOS los estados INMEDIATAMENTE cuando se abre
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
        color: '',
        kilometraje: 0,
        observaciones: '',
        activo: true
      });
      setDescripcionTrabajo('');
      setRepuestosSeleccionados([]);
      setPrecioFinal('');
      setObservaciones('');
      setValidaHasta('');
    }
  }, [isOpen]);

  // Refs para los inputs principales
  const inputBusquedaClienteRef = useRef<HTMLInputElement>(null);
  const inputNombreClienteRef = useRef<HTMLInputElement>(null);
  const inputPatenteRef = useRef<HTMLInputElement>(null);
  const textareaDescripcionRef = useRef<HTMLTextAreaElement>(null);

  // Enfocar el primer input cuando el modal se abre y el step cambia
  useEffect(() => {
    if (isOpen) {
      // Pequeño delay para asegurar que el DOM esté completamente renderizado
      const timeoutId = setTimeout(() => {
        // Enfocar el primer input según el step actual
        if (step === 1) {
          if (tipoCliente === 'existente') {
            inputBusquedaClienteRef.current?.focus();
            inputBusquedaClienteRef.current?.click(); // Forzar click para activar el campo
          } else {
            inputNombreClienteRef.current?.focus();
            inputNombreClienteRef.current?.click();
          }
        } else if (step === 2) {
          if (modoVehiculo === 'nuevo') {
            inputPatenteRef.current?.focus();
            inputPatenteRef.current?.click();
          }
        } else if (step === 3) {
          textareaDescripcionRef.current?.focus();
          textareaDescripcionRef.current?.click();
        }
      }, 150); // Delay de 150ms para asegurar que el DOM esté listo

      return () => clearTimeout(timeoutId);
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

  // Generar número de cotización automático
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

  // Usar deferred value para búsqueda de clientes (no bloquea la UI)
  const deferredBusquedaCliente = useDeferredValue(busquedaCliente);
  
  // Filtrar clientes - SIEMPRE sincrónico y rápido
  const clientesFiltrados = useMemo(() => {
    // Si no hay clientes todavía, retornar vacío inmediatamente
    if (!clientesUnicos || clientesUnicos.length === 0) {
      return [];
    }
    
    const busquedaTrimmed = deferredBusquedaCliente.trim();
    
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
  }, [clientesUnicos, deferredBusquedaCliente]);

  // Filtrar repuestos por búsqueda - SIEMPRE sincrónico y rápido
  const [busquedaRepuesto, setBusquedaRepuesto] = useState('');
  // Usar deferred value para búsqueda (no bloquea la UI)
  const deferredBusquedaRepuesto = useDeferredValue(busquedaRepuesto);
  const repuestosFiltrados = useMemo(() => {
    // Si no hay repuestos todavía, retornar vacío inmediatamente
    if (!repuestos || repuestos.length === 0) {
      return [];
    }
    
    const termino = deferredBusquedaRepuesto.toLowerCase().trim();
    if (termino) {
      return repuestos.filter((repuesto) =>
        repuesto.nombre.toLowerCase().includes(termino) ||
        repuesto.codigo?.toLowerCase().includes(termino)
      );
    }
    // Limitar a 5 inicialmente para no bloquear
    return repuestos.slice(0, 5);
  }, [repuestos, deferredBusquedaRepuesto]);

  // Agregar repuesto a la cotización
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
    } else {
      const nuevoRepuesto: RepuestoCotizacion = {
        id: repuesto.id || 0,
        nombre: repuesto.nombre,
        categoria: repuesto.categoria || 'General',
        precio: repuesto.precio || 0,
        cantidad: 1,
        subtotal: repuesto.precio || 0
      };
      setRepuestosSeleccionados(prev => [...prev, nuevoRepuesto]);
    }
    setBusquedaRepuesto('');
  };

  // Actualizar cantidad de repuesto
  const actualizarCantidadRepuesto = (id: number, cantidad: number) => {
    if (cantidad <= 0) {
      setRepuestosSeleccionados(prev => prev.filter(r => r.id !== id));
    } else {
      setRepuestosSeleccionados(prev =>
        prev.map(r =>
          r.id === id
            ? { ...r, cantidad, subtotal: cantidad * r.precio }
            : r
        )
      );
    }
  };

  // Calcular subtotal de repuestos
  const subtotalRepuestos = repuestosSeleccionados.reduce((total, repuesto) => total + repuesto.subtotal, 0);

  // Función para validar formato de RUT
  const validarRUT = (rut: string): boolean => {
    if (!rut) return true; // Permitir RUT vacío
    const rutLimpio = rut.replace(/[^0-9kK]/g, '');
    if (rutLimpio.length < 8) return false;
    
    const cuerpo = rutLimpio.slice(0, -1);
    const dv = rutLimpio.slice(-1).toUpperCase();
    
    let suma = 0;
    let multiplicador = 2;
    
    for (let i = cuerpo.length - 1; i >= 0; i--) {
      suma += parseInt(cuerpo[i]) * multiplicador;
      multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
    }
    
    const resto = suma % 11;
    const dvCalculado = resto === 0 ? '0' : resto === 1 ? 'K' : (11 - resto).toString();
    
    return dv === dvCalculado;
  };

  // Función inteligente para encontrar o crear cliente
  const encontrarOCrearCliente = async (clienteData: Cliente): Promise<Cliente> => {
    try {
      // Buscar cliente existente por RUT o email
      let clienteExistente = clientes.find(c => 
        (clienteData.rut && c.rut === clienteData.rut) ||
        (clienteData.email && c.email === clienteData.email)
      );

      if (clienteExistente) {
        Logger.log('🔧 Cliente encontrado:', clienteExistente);
        return clienteExistente;
      }

      // Si no existe, crear nuevo cliente
      Logger.log('🔧 Creando nuevo cliente desde cotización:', clienteData);
      const nuevoCliente = await window.electronAPI.saveCliente(clienteData);
      
      if (!nuevoCliente || !nuevoCliente.id) {
        throw new Error('No se pudo crear el cliente. La API no retornó un cliente válido.');
      }
      
      Logger.log('✅ Cliente creado exitosamente y guardado en BD:', nuevoCliente);
      
      // Actualizar el contexto con el nuevo cliente (esto refresca la lista completa)
      await addCliente(nuevoCliente);
      Logger.log('✅ Cliente agregado al contexto, debería aparecer en el módulo de Clientes');
      
      return nuevoCliente;
    } catch (error) {
      Logger.error('❌ Error en encontrarOCrearCliente:', error);
      throw error;
    }
  };

  // Función inteligente para encontrar o crear vehículo
  const encontrarOCrearVehiculo = async (vehiculoData: Vehiculo, clienteId: number): Promise<Vehiculo> => {
    try {
      // Buscar vehículo existente por patente
      let vehiculoExistente = vehiculos.find(v => 
        vehiculoData.patente && v.patente === vehiculoData.patente
      );

      if (vehiculoExistente) {
        Logger.log('🔧 Vehículo encontrado:', vehiculoExistente);
        return vehiculoExistente;
      }

      // Si no existe, crear nuevo vehículo
      Logger.log('🔧 Creando nuevo vehículo:', vehiculoData);
      const nuevoVehiculo = { ...vehiculoData, clienteId };
      const vehiculoCreado = await window.electronAPI.saveVehiculo(nuevoVehiculo);
      
      if (!vehiculoCreado || !vehiculoCreado.id) {
        throw new Error('No se pudo crear el vehículo. La API no retornó un vehículo válido.');
      }
      
      Logger.log('✅ Vehículo creado exitosamente:', vehiculoCreado);
      
      // Actualizar el contexto con el nuevo vehículo
      addVehiculo(vehiculoCreado);
      
      return vehiculoCreado;
    } catch (error) {
      Logger.error('❌ Error en encontrarOCrearVehiculo:', error);
      throw error;
    }
  };

  // Manejar guardado de cotización
  const handleSave = async () => {
    // Prevenir múltiples envíos
    if (isLoading) {
      return;
    }
    
    setIsLoading(true);
    try {
      // Validar precio final (debe ser mayor a 0)
      const precioFinalNumero = precioFinal ? Number(precioFinal.replace(/[^0-9]/g, '')) : 0;
      if (!precioFinalNumero || precioFinalNumero <= 0) {
        alert('Debes ingresar un precio final mayor a 0');
        setIsLoading(false);
        return;
      }

      // Validar cliente
      if (tipoCliente === 'existente' && !clienteSeleccionado) {
        alert('Debes seleccionar un cliente existente');
        setIsLoading(false);
        return;
      }

      if (tipoCliente === 'nuevo' && !nuevoCliente.nombre.trim()) {
        alert('Debes ingresar el nombre del cliente');
        setIsLoading(false);
        return;
      }

      // Validar vehículo: si se usa existente no pedimos datos nuevos
      if (!vehiculoSeleccionado && modoVehiculo === 'nuevo') {
        if (!nuevoVehiculo.patente.trim() || !nuevoVehiculo.marca.trim() || !nuevoVehiculo.modelo.trim()) {
          alert('Debes completar los datos del vehículo (patente, marca y modelo)');
          setIsLoading(false);
          return;
        }
      }

      let clienteFinal: Cliente;
      let vehiculoFinal: Vehiculo;

      // Lógica inteligente: usar cliente existente o crear automáticamente
      if (tipoCliente === 'existente' && clienteSeleccionado) {
        clienteFinal = clienteSeleccionado;
      } else {
        // Validar RUT si se proporciona
        if (nuevoCliente.rut && !validarRUT(nuevoCliente.rut)) {
          alert('El formato del RUT no es válido. Debe ser como: 17917404-9');
          setIsLoading(false);
          return;
        }
        
        // Buscar cliente existente o crear automáticamente
        clienteFinal = await encontrarOCrearCliente(nuevoCliente);
      }

      // Lógica inteligente: usar vehículo existente o crear automáticamente
      if (vehiculoSeleccionado) {
        vehiculoFinal = vehiculoSeleccionado;
      } else {
        // Crear vehículo automáticamente si no existe
        vehiculoFinal = await encontrarOCrearVehiculo(nuevoVehiculo, clienteFinal.id!);
      }

      // Asegurar que el precio final tenga valor válido (el precio que el dueño ingresa)
      const totalFinal = precioFinalNumero;

      Logger.log('💾 Creando cotización con precio final:', totalFinal);

      const cotizacionData: Cotizacion = {
        numero: generarNumeroCotizacion(),
        clienteId: clienteFinal.id!,
        vehiculoId: vehiculoFinal.id!,
        fecha: new Date().toISOString(),
        validaHasta: validaHasta || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 días por defecto
        estado: 'pendiente',
        descripcion: descripcionTrabajo,
        observaciones: observaciones,
        total: totalFinal // Guardar el precio final que el dueño ingresó
      };

      // Validar que tengamos IDs válidos antes de continuar
      if (!clienteFinal || !clienteFinal.id) {
        throw new Error('No se pudo crear o seleccionar el cliente');
      }
      
      if (!vehiculoFinal || !vehiculoFinal.id) {
        throw new Error('No se pudo crear o seleccionar el vehículo');
      }
      
      Logger.log('💾 Datos de cotización a guardar:', cotizacionData);
      Logger.log('💾 Cliente ID:', clienteFinal.id);
      Logger.log('💾 Vehículo ID:', vehiculoFinal.id);
      
      // Pasar también los repuestos seleccionados para que el contenedor los persista
      await onSave(cotizacionData as any, repuestosSeleccionados as any);
      
      // Resetear formulario solo si se guardó exitosamente
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
        color: '',
        kilometraje: 0,
        observaciones: '',
        activo: true
      });
      setDescripcionTrabajo('');
      setRepuestosSeleccionados([]);
      setPrecioFinal('');
      setObservaciones('');
      setValidaHasta('');
      setBusquedaRepuesto('');
      setIsLoading(false);
      onClose();
    } catch (error) {
      Logger.error('❌ Error en handleSave:', error);
      setIsLoading(false);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      Logger.error('❌ Stack trace:', error instanceof Error ? error.stack : undefined);
      notify.error('Error al guardar la cotización', errorMessage);
      // No cerrar el formulario si hay error, para que el usuario pueda corregir
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" 
      onClick={onClose}
      style={{ pointerEvents: 'auto' }}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" 
        onClick={(e) => e.stopPropagation()}
        style={{ pointerEvents: 'auto' }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <FileText className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Nueva Cotización</h2>
              <p className="text-sm text-gray-500">Paso {step} de 4</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Cerrar formulario"
          >
            <X className="h-5 w-5" />
          </button>
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
                    onClick={() => {
                      startTransition(() => {
                        setTipoCliente('existente');
                      });
                    }}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      tipoCliente === 'existente'
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    🔍 Buscar Cliente Existente
                  </button>
                  <button
                    onClick={() => {
                      startTransition(() => {
                        setTipoCliente('nuevo');
                      });
                    }}
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
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-800">
                        <strong>💡 Buscar Cliente:</strong> Selecciona un cliente existente de la lista. 
                        Si no encuentras el cliente, cambia a "Nuevo Cliente" para ingresar sus datos.
                      </p>
                    </div>
                    {/* Búsqueda de Cliente */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        ref={inputBusquedaClienteRef}
                        type="text"
                        name="busquedaCliente"
                        value={busquedaCliente}
                        onChange={(e) => {
                          // Actualización inmediata del input (sin startTransition para feedback visual instantáneo)
                          // useDeferredValue manejará la optimización del filtrado
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
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-sm text-green-800">
                        <strong>✨ Nuevo Cliente:</strong> Ingresa los datos del cliente en este formulario. 
                        El sistema verificará si el cliente ya existe (por RUT o email). Si no existe, 
                        se guardará en la base de datos para futuras gestiones. Podrás crear la cotización 
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
                          name="nombre"
                          value={nuevoCliente.nombre}
                          onChange={(e) => {
                            setNuevoCliente(prev => ({ ...prev, nombre: e.target.value }));
                          }}
                          autoFocus
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
                            startTransition(() => {
                              setNuevoCliente(prev => ({ ...prev, rut: formatted }));
                            });
                          }}
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 ${
                            nuevoCliente.rut && !validarRUT(nuevoCliente.rut) 
                              ? 'border-red-500' 
                              : 'border-gray-300'
                          }`}
                          placeholder="12.345.678-9"
                        />
                        {nuevoCliente.rut && !validarRUT(nuevoCliente.rut) && (
                          <p className="text-red-500 text-xs mt-1">
                            Formato de RUT inválido. Ejemplo: 17917404-9
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Teléfono
                        </label>
                        <input
                          type="tel"
                          value={nuevoCliente.telefono}
                          onChange={(e) => {
                            // Actualización inmediata sin startTransition para mejor feedback
                            setNuevoCliente(prev => ({ ...prev, telefono: e.target.value }));
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 pointer-events-auto"
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
                          onChange={(e) => {
                            // Actualización inmediata sin startTransition para mejor feedback
                            setNuevoCliente(prev => ({ ...prev, email: e.target.value }));
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 pointer-events-auto"
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
                          onChange={(e) => {
                            // Actualización inmediata sin startTransition para mejor feedback
                            setNuevoCliente(prev => ({ ...prev, direccion: e.target.value }));
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 pointer-events-auto"
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
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Datos del Vehículo</h3>
                {/* Selector de modo si el cliente tiene vehículos */}
                {tipoCliente === 'existente' && clienteSeleccionado && (
                  <div className="mb-4 flex gap-2">
                    <button 
                      onClick={() => {
                        startTransition(() => {
                          setModoVehiculo('existente');
                        });
                      }} 
                      className={`px-3 py-1 rounded ${modoVehiculo==='existente'?'bg-red-600 text-white':'bg-gray-100'}`}
                    >
                      Usar vehículo existente
                    </button>
                    <button 
                      onClick={() => {
                        startTransition(() => {
                          setModoVehiculo('nuevo');
                        });
                      }} 
                      className={`px-3 py-1 rounded ${modoVehiculo==='nuevo'?'bg-red-600 text-white':'bg-gray-100'}`}
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
                        <div key={v.id} onClick={() => setVehiculoSeleccionado(v)} className={`p-3 border-b cursor-pointer ${vehiculoSeleccionado?.id===v.id?'bg-red-50 border-red-200':''}`}>
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">Patente</label>
                      <input 
                        ref={inputPatenteRef}
                        type="text" 
                        name="patente"
                        value={nuevoVehiculo.patente} 
                        onChange={(e) => {
                          const value = e.target.value.toUpperCase();
                          setNuevoVehiculo(prev => ({ ...prev, patente: value }));
                        }} 
                        autoFocus
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 pointer-events-auto" 
                        placeholder="ABC123"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Marca</label>
                        <input 
                        type="text" 
                        name="marca"
                        value={nuevoVehiculo.marca} 
                        onChange={(e) => {
                          setNuevoVehiculo(prev => ({ ...prev, marca: e.target.value }));
                        }} 
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 pointer-events-auto" 
                        placeholder="Toyota"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Modelo</label>
                      <input 
                        type="text" 
                        name="modelo"
                        value={nuevoVehiculo.modelo} 
                        onChange={(e) => {
                          setNuevoVehiculo(prev => ({ ...prev, modelo: e.target.value }));
                        }} 
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 pointer-events-auto" 
                        placeholder="Corolla"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Paso 3: Trabajo y Repuestos */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Descripción del Trabajo</h3>
                <textarea
                  ref={textareaDescripcionRef}
                  value={descripcionTrabajo}
                  onChange={(e) => {
                    setDescripcionTrabajo(e.target.value);
                  }}
                  autoFocus
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 pointer-events-auto"
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
                      // Actualización inmediata del input (sin startTransition para feedback visual instantáneo)
                      // useDeferredValue manejará la optimización del filtrado
                      setBusquedaRepuesto(value);
                    }}
                    autoFocus
                    placeholder="Buscar repuestos..."
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 pointer-events-auto"
                  />
                </div>

                {/* Lista de Repuestos Disponibles */}
                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-md mb-4">
                  {repuestosFiltrados.map((repuesto) => (
                      <div
                        key={repuesto.id}
                        onClick={() => agregarRepuesto(repuesto)}
                        className="p-3 cursor-pointer hover:bg-gray-50 border-b border-gray-100 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium text-gray-900">
                            {repuesto.nombre} <span className="text-gray-500 font-normal">({repuesto.categoria})</span>
                          </p>
                          <p className="text-sm text-gray-500">
                            Código: {repuesto.codigo} | Stock: {repuesto.stock}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">${repuesto.precio?.toLocaleString('es-CL') || 0}</p>
                          <Plus className="h-4 w-4 text-green-600" />
                        </div>
                      </div>
                  ))}
                  {repuestosFiltrados.length === 0 && (
                    <div className="p-3 text-sm text-gray-500">No hay repuestos que coincidan.</div>
                  )}
                </div>

                {/* Repuestos Seleccionados */}
                <div className="space-y-2">
                  {repuestosSeleccionados.map((repuesto) => (
                    <div key={repuesto.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {repuesto.nombre} <span className="text-gray-500 font-normal">({repuesto.categoria})</span>
                        </p>
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
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-900">Subtotal Repuestos:</span>
                      <span className="font-bold text-blue-600">${subtotalRepuestos.toLocaleString('es-CL')}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Paso 4: Resumen y Precio Final */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Resumen de la Cotización</h3>
                
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
                      ? `${vehiculoSeleccionado.marca} ${vehiculoSeleccionado.modelo} (${vehiculoSeleccionado.año}) - Patente: ${vehiculoSeleccionado.patente}`
                      : `${nuevoVehiculo.marca} ${nuevoVehiculo.modelo} (${nuevoVehiculo.año}) - Patente: ${nuevoVehiculo.patente}`}
                  </p>
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
                            {repuesto.nombre} <span className="text-gray-500">({repuesto.categoria})</span> x{repuesto.cantidad}
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
                        // Actualización inmediata para feedback visual
                        setPrecioFinal(valor);
                      }}
                      onFocus={(e) => {
                        // Seleccionar todo el texto cuando se hace foco para poder escribir directamente
                        e.target.select();
                      }}
                      autoFocus
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 pointer-events-auto"
                      placeholder="0"
                    />
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Incluye mano de obra y todos los repuestos
                  </p>
                </div>

                {/* Observaciones */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Observaciones
                  </label>
                  <textarea
                    value={observaciones}
                    onChange={(e) => {
                      startTransition(() => {
                        setObservaciones(e.target.value);
                      });
                    }}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 pointer-events-auto"
                    placeholder="Observaciones adicionales..."
                  />
                </div>

                {/* Válida Hasta */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Válida Hasta
                  </label>
                  <input
                    type="date"
                    value={validaHasta}
                    onChange={(e) => {
                      startTransition(() => {
                        setValidaHasta(e.target.value);
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 pointer-events-auto"
                    title="Fecha de validez de la cotización"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t border-gray-200">
          <button
            onClick={() => {
              if (step > 1) {
                startTransition(() => {
                  setStep(step - 1);
                });
              } else {
                onClose();
              }
            }}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            {step > 1 ? 'Anterior' : 'Cancelar'}
          </button>
          
          <div className="flex gap-3">
            {step < 4 ? (
              <button
                onClick={() => {
                  startTransition(() => {
                    setStep(step + 1);
                  });
                }}
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
                    Crear Cotización
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
