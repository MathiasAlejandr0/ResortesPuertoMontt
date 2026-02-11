import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, Plus, Search, ShoppingCart, CreditCard, DollarSign } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { notify, Logger, formatearRUT, Validation } from '../utils/cn';
import { Repuesto, Cliente, OrdenTrabajo, Vehiculo } from '../types';
import { useAutoSave } from '../hooks/useAutoSave';

interface RepuestoVenta {
  id: number;
  nombre: string;
  precio: number;
  cantidad: number;
  subtotal: number;
}

interface VentaFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (orden: OrdenTrabajo, detalles: Array<{ tipo: 'servicio' | 'repuesto'; servicioId?: number; repuestoId?: number; cantidad: number; precio: number; subtotal: number; descripcion: string }>, metodoPago: 'Efectivo' | 'Débito' | 'Crédito', numeroCuotas?: number, fechaPago?: string, fechasCuotas?: string[]) => Promise<void>;
}

export default function VentaForm({ isOpen, onClose, onSave }: VentaFormProps) {
  const { repuestos, clientes, addCliente, addVehiculo } = useApp();
  const [busquedaRepuesto, setBusquedaRepuesto] = useState('');
  const [repuestosSeleccionados, setRepuestosSeleccionados] = useState<RepuestoVenta[]>([]);
  const [precioFinal, setPrecioFinal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Datos del cliente (opcionales)
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteRut, setClienteRut] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [clienteEmail, setClienteEmail] = useState('');
  const [buscarClienteExistente, setBuscarClienteExistente] = useState('');
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);

  // Método de pago
  const [metodoPago, setMetodoPago] = useState<'Efectivo' | 'Débito' | 'Crédito'>('Efectivo');
  const [numeroCuotas, setNumeroCuotas] = useState<number>(1);
  const [fechasPago, setFechasPago] = useState<string[]>([]);

  const inputBusquedaRepuestoRef = useRef<HTMLInputElement>(null);
  const inputPrecioFinalRef = useRef<HTMLInputElement>(null);

  // Objeto con todos los datos del formulario para auto-guardar
  const formData = useMemo(() => ({
    busquedaRepuesto,
    repuestosSeleccionados,
    precioFinal,
    clienteNombre,
    clienteRut,
    clienteTelefono,
    clienteEmail,
    buscarClienteExistente,
    clienteSeleccionado: clienteSeleccionado ? { id: clienteSeleccionado.id, nombre: clienteSeleccionado.nombre } : null,
    metodoPago,
    numeroCuotas,
    fechasPago
  }), [
    busquedaRepuesto, repuestosSeleccionados, precioFinal,
    clienteNombre, clienteRut, clienteTelefono, clienteEmail,
    buscarClienteExistente, clienteSeleccionado, metodoPago,
    numeroCuotas, fechasPago
  ]);

  // Hook de auto-guardado
  const { restore, clear } = useAutoSave({
    key: 'venta',
    data: formData,
    enabled: isOpen,
    onRestore: (restored: any) => {
      if (restored) {
        Logger.log('📂 Restaurando datos del formulario de venta:', restored);
        if (restored.busquedaRepuesto) setBusquedaRepuesto(restored.busquedaRepuesto);
        if (restored.repuestosSeleccionados) setRepuestosSeleccionados(restored.repuestosSeleccionados);
        if (restored.precioFinal) setPrecioFinal(restored.precioFinal);
        if (restored.clienteNombre) setClienteNombre(restored.clienteNombre);
        if (restored.clienteRut) setClienteRut(restored.clienteRut);
        if (restored.clienteTelefono) setClienteTelefono(restored.clienteTelefono);
        if (restored.clienteEmail) setClienteEmail(restored.clienteEmail);
        if (restored.buscarClienteExistente) setBuscarClienteExistente(restored.buscarClienteExistente);
        if (restored.metodoPago) setMetodoPago(restored.metodoPago);
        if (restored.numeroCuotas !== undefined) setNumeroCuotas(restored.numeroCuotas);
        if (restored.fechasPago) setFechasPago(restored.fechasPago);
        
        // Restaurar cliente seleccionado si existe
        if (restored.clienteSeleccionado?.id) {
          const cliente = clientes.find(c => c.id === restored.clienteSeleccionado.id);
          if (cliente) setClienteSeleccionado(cliente);
        }
        
        notify.success('Datos restaurados', 'Se han restaurado los datos del formulario anterior');
      }
    }
  });

  // Generar número de venta (VT- en lugar de OT-)
  const generarNumeroVenta = () => {
    const fecha = new Date();
    const año = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    const numero = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `VT-${año}-${mes}${dia}-${numero}`;
  };

  // Filtrar repuestos
  const repuestosFiltrados = useMemo(() => {
    if (!repuestos || repuestos.length === 0) {
      return [];
    }
    
    const termino = busquedaRepuesto.toLowerCase().trim();
    if (termino) {
      return repuestos.filter((repuesto) =>
        repuesto.nombre.toLowerCase().includes(termino) ||
        repuesto.codigo?.toLowerCase().includes(termino) ||
        repuesto.categoria?.toLowerCase().includes(termino)
      );
    }
    return repuestos.slice(0, 10);
  }, [repuestos, busquedaRepuesto]);

  // Filtrar clientes para búsqueda
  const clientesFiltrados = useMemo(() => {
    if (!buscarClienteExistente.trim()) return [];
    const termino = buscarClienteExistente.toLowerCase();
    return clientes.filter(c =>
      c.nombre.toLowerCase().includes(termino) ||
      c.rut.toLowerCase().includes(termino) ||
      c.telefono?.toLowerCase().includes(termino)
    ).slice(0, 5);
  }, [clientes, buscarClienteExistente]);

  // Resetear formulario cuando se abre (pero primero intentar restaurar)
  useEffect(() => {
    if (isOpen) {
      // El hook de auto-guardado restaurará automáticamente si hay datos guardados
      // Si no hay datos guardados, resetear normalmente
      setIsLoading(false);
      const restored = restore();
      if (!restored) {
        setBusquedaRepuesto('');
        setRepuestosSeleccionados([]);
        setPrecioFinal('');
        setClienteNombre('');
        setClienteRut('');
        setClienteTelefono('');
        setClienteEmail('');
        setBuscarClienteExistente('');
        setClienteSeleccionado(null);
        setMetodoPago('Efectivo');
        setNumeroCuotas(1);
        setFechasPago([]);
      }
    }
  }, [isOpen, restore]);

  // Enfocar input cuando se abre
  useEffect(() => {
    if (isOpen) {
      let timeoutId: NodeJS.Timeout;
      let rafId2: number;
      const rafId1 = requestAnimationFrame(() => {
        rafId2 = requestAnimationFrame(() => {
          timeoutId = setTimeout(() => {
            inputBusquedaRepuestoRef.current?.focus();
          }, 100);
        });
      });
      
      return () => {
        cancelAnimationFrame(rafId1);
        if (rafId2) cancelAnimationFrame(rafId2);
        if (timeoutId) clearTimeout(timeoutId);
      };
    }
  }, [isOpen]);

  // Calcular subtotal de repuestos
  const subtotalRepuestos = repuestosSeleccionados.reduce((total, repuesto) => total + repuesto.subtotal, 0);

  // Agregar repuesto
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
      const nuevoRepuesto: RepuestoVenta = {
        id: repuesto.id || 0,
        nombre: repuesto.nombre,
        precio: repuesto.precio || 0,
        cantidad: 1,
        subtotal: repuesto.precio || 0
      };
      setRepuestosSeleccionados(prev => [...prev, nuevoRepuesto]);
    }
    setBusquedaRepuesto('');
    // Actualizar precio final automáticamente
    const nuevoSubtotal = repuestoExistente 
      ? subtotalRepuestos + repuesto.precio
      : subtotalRepuestos + repuesto.precio;
    setPrecioFinal(nuevoSubtotal.toLocaleString('es-CL'));
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
    // Recalcular subtotal y actualizar precio final
    const nuevoSubtotal = repuestosSeleccionados
      .filter(r => r.id !== id)
      .reduce((total, r) => total + r.subtotal, 0) +
      (cantidad > 0 ? cantidad * (repuestosSeleccionados.find(r => r.id === id)?.precio || 0) : 0);
    setPrecioFinal(nuevoSubtotal.toLocaleString('es-CL'));
  };

  // Seleccionar cliente existente
  const seleccionarCliente = (cliente: Cliente) => {
    setClienteSeleccionado(cliente);
    setClienteNombre(cliente.nombre);
    setClienteRut(cliente.rut);
    setClienteTelefono(cliente.telefono || '');
    setClienteEmail(cliente.email || '');
    setBuscarClienteExistente('');
  };

  // Manejar cambio de método de pago
  const handleMetodoPagoChange = (metodo: 'Efectivo' | 'Débito' | 'Crédito') => {
    setMetodoPago(metodo);
    if (metodo !== 'Crédito') {
      setFechasPago([]);
      setNumeroCuotas(1);
    }
  };

  // Manejar cambio de número de cuotas
  const handleNumeroCuotasChange = (cuotas: number) => {
    setNumeroCuotas(cuotas);
    // Generar fechas de pago automáticamente (una por mes)
    const fechas: string[] = [];
    const hoy = new Date();
    for (let i = 0; i < cuotas; i++) {
      const fecha = new Date(hoy);
      fecha.setMonth(hoy.getMonth() + i);
      fechas.push(fecha.toISOString().split('T')[0]);
    }
    setFechasPago(fechas);
  };

  // Manejar cambio de fecha de pago
  const handleFechaPagoChange = (index: number, fecha: string) => {
    const nuevasFechas = [...fechasPago];
    nuevasFechas[index] = fecha;
    setFechasPago(nuevasFechas);
  };

  // Función para encontrar o crear cliente (con datos mínimos válidos para ventas)
  const encontrarOCrearCliente = async (clienteData: Cliente): Promise<Cliente> => {
    // Si hay RUT válido (no genérico), buscar por RUT
    if (clienteData.rut && clienteData.rut !== '0-0') {
      const rutLimpio = clienteData.rut.replace(/[^0-9kK]/g, '');
      const clienteExistente = clientes.find(c => {
        const rutCliente = c.rut.replace(/[^0-9kK]/g, '');
        return rutCliente === rutLimpio && rutLimpio !== '00';
      });
      
      if (clienteExistente) {
        Logger.log('✅ Cliente encontrado por RUT:', clienteExistente);
        return clienteExistente;
      }
    }

    // Si hay email, buscar por email
    if (clienteData.email && clienteData.email.trim()) {
      const clienteExistente = clientes.find(c => 
        c.email && c.email.toLowerCase() === clienteData.email?.toLowerCase()
      );
      
      if (clienteExistente) {
        Logger.log('✅ Cliente encontrado por email:', clienteExistente);
        return clienteExistente;
      }
    }

    // Si no hay datos mínimos o son genéricos, buscar/crear cliente genérico
    if (!clienteData.nombre || !clienteData.rut || clienteData.rut === '0-0' || clienteData.nombre === 'Cliente Genérico') {
      // PASO 1: Buscar en el contexto (rápido)
      let clienteGenericoExistente = clientes.find(c => 
        c.nombre === 'Cliente Genérico' && c.rut === '0-0'
      );

      if (clienteGenericoExistente) {
        Logger.log('✅ Cliente genérico encontrado en contexto:', clienteGenericoExistente);
        return clienteGenericoExistente;
      }

      // PASO 2: Buscar en la base de datos (más confiable, evita race conditions)
      try {
        const todosLosClientes = await window.electronAPI.getAllClientes();
        clienteGenericoExistente = todosLosClientes.find(c => 
          c.nombre === 'Cliente Genérico' && c.rut === '0-0'
        );

        if (clienteGenericoExistente) {
          Logger.log('✅ Cliente genérico encontrado en BD:', clienteGenericoExistente);
          // Actualizar contexto si no estaba
          if (!clientes.find(c => c.id === clienteGenericoExistente!.id)) {
            await addCliente(clienteGenericoExistente);
          }
          return clienteGenericoExistente;
        }
      } catch (error) {
        Logger.warn('⚠️ Error buscando cliente genérico en BD, intentando crear:', error);
      }

      // PASO 3: Si no existe, intentar crear (con manejo de race condition)
      const clienteGenerico: Cliente = {
        nombre: 'Cliente Genérico',
        rut: '0-0',
        telefono: '000000000', // Teléfono mínimo válido para pasar validación
        email: '',
        direccion: '',
        activo: true
      };
      
      try {
        const nuevoCliente = await window.electronAPI.saveCliente(clienteGenerico);
        await addCliente(nuevoCliente);
        Logger.log('✅ Cliente genérico creado exitosamente:', nuevoCliente);
        return nuevoCliente;
      } catch (error) {
        // Si falla por duplicado (race condition), buscar nuevamente en BD
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('Ya existe un cliente') || errorMessage.includes('UNIQUE constraint')) {
          Logger.log('⚠️ Cliente genérico ya existe (race condition), buscando nuevamente...');
          try {
            const todosLosClientes = await window.electronAPI.getAllClientes();
            const clienteExistente = todosLosClientes.find(c => 
              c.nombre === 'Cliente Genérico' && c.rut === '0-0'
            );
            if (clienteExistente) {
              Logger.log('✅ Cliente genérico encontrado después de race condition:', clienteExistente);
              if (!clientes.find(c => c.id === clienteExistente.id)) {
                await addCliente(clienteExistente);
              }
              return clienteExistente;
            }
          } catch (searchError) {
            Logger.error('❌ Error buscando cliente genérico después de race condition:', searchError);
          }
        }
        // Si es otro tipo de error, lanzarlo
        throw error;
      }
    }

    // Si hay datos válidos, crear nuevo cliente con datos proporcionados
    // Asegurar que tenga teléfono mínimo para pasar validación
    const clienteConTelefono: Cliente = {
      ...clienteData,
      telefono: clienteData.telefono || '000000000' // Teléfono mínimo si no se proporciona
    };

    Logger.log('🔧 Creando nuevo cliente desde venta:', clienteConTelefono);
    const nuevoCliente = await window.electronAPI.saveCliente(clienteConTelefono);
    await addCliente(nuevoCliente);
    Logger.log('✅ Cliente creado exitosamente:', nuevoCliente);
    return nuevoCliente;
  };

  // Función para encontrar o crear vehículo genérico
  const encontrarOCrearVehiculo = async (clienteId: number): Promise<Vehiculo> => {
    // Buscar vehículo genérico del cliente
    const vehiculosCliente = await window.electronAPI.getAllVehiculos();
    const vehiculoGenerico = vehiculosCliente.find((v: Vehiculo) => 
      v.clienteId === clienteId && (v.marca === 'Genérico' || v.modelo === 'Venta Rápida')
    );

    if (vehiculoGenerico) {
      return vehiculoGenerico;
    }

    // Generar patente única y corta (máximo 10 caracteres)
    // Formato: GEN + últimos 6 dígitos del timestamp
    const timestamp = Date.now().toString();
    const ultimosDigitos = timestamp.slice(-6);
    const patenteGenerica = `GEN${ultimosDigitos}`;

    // Crear vehículo genérico
    const nuevoVehiculo: Vehiculo = {
      clienteId,
      marca: 'Genérico',
      modelo: 'Venta Rápida',
      año: new Date().getFullYear(),
      patente: patenteGenerica, // Máximo 9 caracteres (GEN + 6 dígitos)
      color: '',
      kilometraje: 0,
      observaciones: 'Vehículo genérico para ventas rápidas',
      activo: true
    };

    const vehiculoCreado = await window.electronAPI.saveVehiculo(nuevoVehiculo);
    await addVehiculo(vehiculoCreado);
    return vehiculoCreado;
  };

  // Guardar venta como orden de trabajo
  const handleSave = async () => {
    if (isLoading) return;

    // Validar que haya repuestos
    if (repuestosSeleccionados.length === 0) {
      notify.error('Error', 'Debes agregar al menos un repuesto a la venta');
      return;
    }

    // Validar precio final
    const precioFinalStr = typeof precioFinal === 'number' ? String(precioFinal) : (precioFinal || '');
    const precioFinalNumero = Number(precioFinalStr.replace(/[^0-9]/g, ''));
    
    if (precioFinalNumero <= 0) {
      notify.error('Error', 'El precio final debe ser mayor a 0');
      return;
    }

    // Validar método de pago crédito
    if (metodoPago === 'Crédito') {
      if (numeroCuotas < 1) {
        notify.error('Error', 'El número de cuotas debe ser al menos 1');
        return;
      }
      if (fechasPago.length !== numeroCuotas || fechasPago.some(f => !f)) {
        notify.error('Error', 'Debe completar todas las fechas de pago');
        return;
      }
    }

    setIsLoading(true);
    try {
      // Encontrar o crear cliente (los datos son opcionales)
      let clienteFinal: Cliente;
      if (clienteSeleccionado) {
        clienteFinal = clienteSeleccionado;
      } else if (clienteNombre || clienteRut) {
        // Si hay algún dato, intentar crear/buscar cliente
        const clienteData: Cliente = {
          nombre: clienteNombre.trim() || 'Cliente Genérico',
          rut: clienteRut.trim() || '0-0',
          telefono: clienteTelefono.trim() || '000000000', // Teléfono mínimo para validación
          email: clienteEmail.trim() || '',
          direccion: '',
          activo: true
        };
        clienteFinal = await encontrarOCrearCliente(clienteData);
      } else {
        // Si no hay datos del cliente, usar cliente genérico (sin crear uno nuevo si ya existe)
        const clienteGenerico: Cliente = {
          nombre: 'Cliente Genérico',
          rut: '0-0',
          telefono: '000000000', // Teléfono mínimo para validación
          email: '',
          direccion: '',
          activo: true
        };
        clienteFinal = await encontrarOCrearCliente(clienteGenerico);
      }

      // Encontrar o crear vehículo genérico
      const vehiculoFinal = await encontrarOCrearVehiculo(clienteFinal.id!);

      // Crear orden de trabajo (con código VT- para ventas)
      const ordenData: OrdenTrabajo = {
        numero: generarNumeroVenta(),
        clienteId: clienteFinal.id!,
        vehiculoId: vehiculoFinal.id!,
        fechaIngreso: new Date().toISOString(),
        fechaEntrega: new Date().toISOString(), // Venta rápida, se entrega inmediatamente
        estado: 'Completada', // Las ventas se marcan como completadas inmediatamente
        descripcion: 'Venta rápida de repuestos',
        observaciones: `Venta rápida${clienteFinal.nombre !== 'Cliente Genérico' ? ` - Cliente: ${clienteFinal.nombre}` : ''}`,
        total: precioFinalNumero,
        kilometrajeEntrada: 0,
        prioridad: 'Normal',
        metodoPago: metodoPago,
        numeroCuotas: metodoPago === 'Crédito' ? numeroCuotas : undefined,
        fechaPago: metodoPago === 'Crédito' ? fechasPago[0] : new Date().toISOString().split('T')[0]
      };

      // Convertir repuestos a detalles
      const detallesParaGuardar = repuestosSeleccionados.map(r => ({
        tipo: 'repuesto' as const,
        repuestoId: r.id,
        cantidad: r.cantidad,
        precio: r.precio,
        subtotal: r.subtotal,
        descripcion: r.nombre
      }));

      // Para crédito, usar las fechas de cuotas
      const fechasCuotasParaEnviar = metodoPago === 'Crédito' ? fechasPago : undefined;
      const fechaPagoPrincipal = metodoPago === 'Crédito' ? fechasPago[0] : new Date().toISOString().split('T')[0];

      // Limpiar auto-guardado antes de guardar
      clear();
      
      await onSave(
        ordenData,
        detallesParaGuardar,
        metodoPago,
        metodoPago === 'Crédito' ? numeroCuotas : undefined,
        fechaPagoPrincipal,
        fechasCuotasParaEnviar
      );
      
      // Resetear formulario
      setRepuestosSeleccionados([]);
      setPrecioFinal('');
      setClienteNombre('');
      setClienteRut('');
      setClienteTelefono('');
      setClienteEmail('');
      setClienteSeleccionado(null);
      setBuscarClienteExistente('');
      setMetodoPago('Efectivo');
      setNumeroCuotas(1);
      setFechasPago([]);
      
      setIsLoading(false);
      onClose();
      notify.success('Venta registrada exitosamente');
    } catch (error) {
      Logger.error('Error guardando venta:', error);
      setIsLoading(false);
      notify.error('Error al guardar la venta', error instanceof Error ? error.message : 'Error desconocido');
    }
  };

  if (!isOpen) return null;

  // Handler para prevenir cierre automático cuando se hace clic fuera
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Solo cerrar si se hace clic directamente en el backdrop, no en el contenido
    if (e.target === e.currentTarget) {
      // Verificar si hay datos antes de permitir cerrar
      const hasData = repuestosSeleccionados.length > 0 || 
                     precioFinal || 
                     clienteNombre || 
                     clienteRut;
      if (!hasData) {
        onClose();
      }
      // Si hay datos, no cerrar automáticamente (los datos ya están guardados)
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" 
      onClick={handleBackdropClick}
      style={{ pointerEvents: 'auto' }}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" 
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        style={{ pointerEvents: 'auto' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <ShoppingCart className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Nueva Venta</h2>
              <p className="text-sm text-gray-500">Venta rápida de repuestos</p>
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

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Datos del Cliente (Opcional) */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Datos del Cliente <span className="text-sm text-gray-500 font-normal">(Opcional)</span>
            </h3>
            
            {/* Buscar cliente existente */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buscar Cliente Existente
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={buscarClienteExistente}
                  onChange={(e) => setBuscarClienteExistente(e.target.value)}
                  placeholder="Buscar por nombre, RUT o teléfono..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              {clientesFiltrados.length > 0 && (
                <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200 rounded-md">
                  {clientesFiltrados.map((cliente) => (
                    <div
                      key={cliente.id}
                      onClick={() => seleccionarCliente(cliente)}
                      className="p-3 cursor-pointer hover:bg-gray-50 border-b border-gray-100"
                    >
                      <p className="font-medium text-gray-900">{cliente.nombre}</p>
                      <p className="text-sm text-gray-500">{cliente.rut} | {cliente.telefono}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* O ingresar datos manualmente */}
            {!clienteSeleccionado && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre
                  </label>
                  <input
                    type="text"
                    value={clienteNombre}
                    onChange={(e) => setClienteNombre(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Nombre del cliente"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    RUT
                  </label>
                  <input
                    type="text"
                    value={clienteRut}
                    onChange={(e) => {
                      const formatted = formatearRUT(e.target.value);
                      setClienteRut(formatted);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="12.345.678-9"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={clienteTelefono}
                    onChange={(e) => setClienteTelefono(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="+56 9 1234 5678"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={clienteEmail}
                    onChange={(e) => setClienteEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="cliente@email.com"
                  />
                </div>
              </div>
            )}

            {/* Mostrar cliente seleccionado */}
            {clienteSeleccionado && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{clienteSeleccionado.nombre}</p>
                    <p className="text-sm text-gray-500">{clienteSeleccionado.rut} | {clienteSeleccionado.telefono}</p>
                  </div>
                  <button
                    onClick={() => {
                      setClienteSeleccionado(null);
                      setClienteNombre('');
                      setClienteRut('');
                      setClienteTelefono('');
                      setClienteEmail('');
                    }}
                    className="text-red-600 hover:text-red-800"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Repuestos */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Repuestos <span className="text-sm text-red-500 font-normal">*</span>
            </h3>
            
            {/* Búsqueda de Repuestos */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                ref={inputBusquedaRepuestoRef}
                type="text"
                value={busquedaRepuesto}
                onChange={(e) => setBusquedaRepuesto(e.target.value)}
                placeholder="Buscar repuestos..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
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

            {/* Subtotal Repuestos */}
            {repuestosSeleccionados.length > 0 && (
              <div className="mt-4 p-4 bg-red-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-900">Subtotal Repuestos:</span>
                      <span className="font-bold text-red-600">${subtotalRepuestos.toLocaleString('es-CL')}</span>
                </div>
              </div>
            )}
          </div>

          {/* Precio Final */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Precio Final <span className="text-red-500">*</span>
            </label>
            <input
              ref={inputPrecioFinalRef}
              type="text"
              value={precioFinal}
              onChange={(e) => {
                const valor = e.target.value.replace(/[^0-9]/g, '');
                if (valor) {
                  const numero = Number(valor);
                  setPrecioFinal(numero.toLocaleString('es-CL'));
                } else {
                  setPrecioFinal('');
                }
              }}
              onFocus={(e) => {
                if (precioFinal) {
                  const numero = Number(precioFinal.replace(/[^0-9]/g, ''));
                  e.target.value = numero.toString();
                }
              }}
              onBlur={(e) => {
                const valor = e.target.value.replace(/[^0-9]/g, '');
                if (valor) {
                  const numero = Number(valor);
                  setPrecioFinal(numero.toLocaleString('es-CL'));
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="0"
            />
            {repuestosSeleccionados.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                Sugerencia: ${subtotalRepuestos.toLocaleString('es-CL')} (subtotal de repuestos)
              </p>
            )}
          </div>

          {/* Método de Pago */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Método de Pago <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => handleMetodoPagoChange('Efectivo')}
                className={`flex flex-col items-center justify-center p-4 border-2 rounded-lg transition-all ${
                  metodoPago === 'Efectivo'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <DollarSign className={`h-8 w-8 mb-2 ${metodoPago === 'Efectivo' ? 'text-green-500' : 'text-gray-400'}`} />
                <span className="font-medium">Efectivo</span>
              </button>
              <button
                type="button"
                onClick={() => handleMetodoPagoChange('Débito')}
                className={`flex flex-col items-center justify-center p-4 border-2 rounded-lg transition-all ${
                  metodoPago === 'Débito'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <CreditCard className={`h-8 w-8 mb-2 ${metodoPago === 'Débito' ? 'text-green-500' : 'text-gray-400'}`} />
                <span className="font-medium">Débito</span>
              </button>
              <button
                type="button"
                onClick={() => handleMetodoPagoChange('Crédito')}
                className={`flex flex-col items-center justify-center p-4 border-2 rounded-lg transition-all ${
                  metodoPago === 'Crédito'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <CreditCard className={`h-8 w-8 mb-2 ${metodoPago === 'Crédito' ? 'text-green-500' : 'text-gray-400'}`} />
                <span className="font-medium">Crédito</span>
              </button>
            </div>
          </div>

          {/* Campos adicionales para crédito */}
          {metodoPago === 'Crédito' && (
            <div className="space-y-4 border-t pt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número de Cuotas <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={numeroCuotas}
                  onChange={(e) => handleNumeroCuotasChange(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fechas de Pago <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  {fechasPago.map((fecha, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 w-20">Cuota {index + 1}:</span>
                      <input
                        type="date"
                        value={fecha}
                        onChange={(e) => handleFechaPagoChange(index, e.target.value)}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading || repuestosSeleccionados.length === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading ? 'Guardando...' : (
              <>
                <ShoppingCart className="h-4 w-4" />
                Guardar Venta
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
