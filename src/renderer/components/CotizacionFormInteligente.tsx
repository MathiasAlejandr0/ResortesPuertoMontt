import React, { useState, useEffect } from 'react';
import { X, User, Car, Calendar, DollarSign, Plus, Search, FileText, Send } from 'lucide-react';
import { Cliente, Vehiculo, Cotizacion, Servicio, Repuesto } from '../types';
import { formatearRUT } from '../utils/cn';

interface CotizacionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (cotizacion: Cotizacion) => void;
  clientes: Cliente[];
  vehiculos: Vehiculo[];
  servicios: Servicio[];
  repuestos: Repuesto[];
}

export default function CotizacionForm({ 
  isOpen, 
  onClose, 
  onSave, 
  clientes, 
  vehiculos, 
  servicios, 
  repuestos 
}: CotizacionFormProps) {
  const [step, setStep] = useState(1); // 1: Tipo cliente, 2: Datos cliente, 3: Datos cotización
  const [tipoCliente, setTipoCliente] = useState<'nuevo' | 'existente'>('existente');
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
    color: '',
    kilometraje: 0,
    observaciones: '',
    activo: true
  });
  const [cotizacion, setCotizacion] = useState<Cotizacion>({
    numero: '',
    clienteId: 0,
    vehiculoId: 0,
    fecha: new Date().toISOString().split('T')[0],
    validaHasta: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    estado: 'pendiente',
    descripcion: '',
    observaciones: '',
    total: 0
  });
  const [serviciosSeleccionados, setServiciosSeleccionados] = useState<{servicio: Servicio, cantidad: number}[]>([]);
  const [repuestosSeleccionados, setRepuestosSeleccionados] = useState<{repuesto: Repuesto, cantidad: number}[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  useEffect(() => {
    if (isOpen) {
      // Resetear formulario cuando se abre
      setStep(1);
      setTipoCliente('existente');
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
      setCotizacion({
        numero: '',
        clienteId: 0,
        vehiculoId: 0,
        fecha: new Date().toISOString().split('T')[0],
        validaHasta: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        estado: 'pendiente',
        descripcion: '',
        observaciones: '',
        total: 0
      });
      setServiciosSeleccionados([]);
      setRepuestosSeleccionados([]);
      setErrors({});
    }
  }, [isOpen]);

  const handleNext = () => {
    if (step === 1) {
      if (tipoCliente === 'existente' && !clienteSeleccionado) {
        setErrors({ cliente: 'Debe seleccionar un cliente' });
        return;
      }
      if (tipoCliente === 'nuevo') {
        // Validar datos del cliente nuevo
        const newErrors: {[key: string]: string} = {};
        if (!nuevoCliente.nombre.trim()) newErrors.nombre = 'El nombre es requerido';
        if (!nuevoCliente.rut.trim()) newErrors.rut = 'El RUT es requerido';
        if (!nuevoCliente.telefono.trim()) newErrors.telefono = 'El teléfono es requerido';
        if (Object.keys(newErrors).length > 0) {
          setErrors(newErrors);
          return;
        }
      }
    }
    if (step === 2) {
      // Validar vehículo
      if (!vehiculoSeleccionado && !nuevoVehiculo.marca.trim()) {
        setErrors({ vehiculo: 'Debe seleccionar o crear un vehículo' });
        return;
      }
    }
    setStep(step + 1);
    setErrors({});
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setErrors({});
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      let clienteFinal: Cliente;
      let vehiculoFinal: Vehiculo;

      // Crear o usar cliente
      if (tipoCliente === 'nuevo') {
        clienteFinal = await window.electronAPI.saveCliente(nuevoCliente);
      } else {
        clienteFinal = clienteSeleccionado!;
      }

      // Crear o usar vehículo
      if (vehiculoSeleccionado) {
        vehiculoFinal = vehiculoSeleccionado;
      } else {
        vehiculoFinal = { ...nuevoVehiculo, clienteId: clienteFinal.id! };
        vehiculoFinal = await window.electronAPI.saveVehiculo(vehiculoFinal);
      }

      // Generar número de cotización
      const numeroCotizacion = `COT-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

      // Crear cotización
      const cotizacionFinal: Cotizacion = {
        ...cotizacion,
        numero: numeroCotizacion,
        clienteId: clienteFinal.id!,
        vehiculoId: vehiculoFinal.id!,
        total: calcularTotal()
      };

      await onSave(cotizacionFinal);
      onClose();
    } catch (error) {
      console.error('Error guardando cotización:', error);
      alert('Error al guardar la cotización');
    } finally {
      setIsLoading(false);
    }
  };

  const calcularTotal = () => {
    let total = 0;
    serviciosSeleccionados.forEach(item => {
      total += item.servicio.precio * item.cantidad;
    });
    repuestosSeleccionados.forEach(item => {
      total += item.repuesto.precio * item.cantidad;
    });
    return total;
  };

  const agregarServicio = (servicio: Servicio) => {
    const existente = serviciosSeleccionados.find(s => s.servicio.id === servicio.id);
    if (existente) {
      setServiciosSeleccionados(prev => 
        prev.map(s => s.servicio.id === servicio.id 
          ? { ...s, cantidad: s.cantidad + 1 } 
          : s
        )
      );
    } else {
      setServiciosSeleccionados(prev => [...prev, { servicio, cantidad: 1 }]);
    }
  };

  const agregarRepuesto = (repuesto: Repuesto) => {
    const existente = repuestosSeleccionados.find(r => r.repuesto.id === repuesto.id);
    if (existente) {
      setRepuestosSeleccionados(prev => 
        prev.map(r => r.repuesto.id === repuesto.id 
          ? { ...r, cantidad: r.cantidad + 1 } 
          : r
        )
      );
    } else {
      setRepuestosSeleccionados(prev => [...prev, { repuesto, cantidad: 1 }]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-start p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Nueva Cotización</h2>
            <p className="text-sm text-gray-600 mt-1">
              Paso {step} de 3: {
                step === 1 ? 'Seleccionar Cliente' :
                step === 2 ? 'Seleccionar Vehículo' :
                'Detalles de Cotización'
              }
            </p>
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
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center">
            {[1, 2, 3].map((stepNum) => (
              <div key={stepNum} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= stepNum 
                    ? 'bg-red-600 text-white' 
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {stepNum}
                </div>
                {stepNum < 3 && (
                  <div className={`w-16 h-1 mx-2 ${
                    step > stepNum ? 'bg-red-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <div className="p-6">
          {/* Paso 1: Seleccionar Cliente */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Seleccionar Cliente</h3>
                
                {/* Opciones de Cliente */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <button
                    onClick={() => setTipoCliente('existente')}
                    className={`p-4 border-2 rounded-lg text-center transition-colors ${
                      tipoCliente === 'existente'
                        ? 'border-red-600 bg-red-50 text-red-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <User className="h-8 w-8 mx-auto mb-2" />
                    <div className="font-medium">Cliente Existente</div>
                    <div className="text-sm text-gray-600">Seleccionar de la lista</div>
                  </button>
                  
                  <button
                    onClick={() => setTipoCliente('nuevo')}
                    className={`p-4 border-2 rounded-lg text-center transition-colors ${
                      tipoCliente === 'nuevo'
                        ? 'border-red-600 bg-red-50 text-red-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <Plus className="h-8 w-8 mx-auto mb-2" />
                    <div className="font-medium">Cliente Nuevo</div>
                    <div className="text-sm text-gray-600">Crear nuevo cliente</div>
                  </button>
                </div>

                {/* Cliente Existente */}
                {tipoCliente === 'existente' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Seleccionar Cliente
                    </label>
                    <select
                      value={clienteSeleccionado?.id || ''}
                      onChange={(e) => {
                        const cliente = clientes.find(c => c.id === parseInt(e.target.value));
                        setClienteSeleccionado(cliente || null);
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      title="Seleccionar cliente existente"
                    >
                      <option value="">Seleccione un cliente...</option>
                      {clientes.map(cliente => (
                        <option key={cliente.id} value={cliente.id}>
                          {cliente.nombre} - {cliente.rut}
                        </option>
                      ))}
                    </select>
                    {errors.cliente && (
                      <p className="text-red-500 text-xs mt-1">{errors.cliente}</p>
                    )}
                  </div>
                )}

                {/* Cliente Nuevo */}
                {tipoCliente === 'nuevo' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Nombre Completo *
                        </label>
                        <input
                          type="text"
                          value={nuevoCliente.nombre}
                          onChange={(e) => setNuevoCliente(prev => ({ ...prev, nombre: e.target.value }))}
                          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                            errors.nombre ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="Juan Pérez"
                        />
                        {errors.nombre && (
                          <p className="text-red-500 text-xs mt-1">{errors.nombre}</p>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          RUT *
                        </label>
                        <input
                          type="text"
                          value={nuevoCliente.rut}
                          onChange={(e) => {
                            const formatted = formatearRUT(e.target.value);
                            setNuevoCliente(prev => ({ ...prev, rut: formatted }));
                          }}
                          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                            errors.rut ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="12.345.678-9"
                        />
                        {errors.rut && (
                          <p className="text-red-500 text-xs mt-1">{errors.rut}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Teléfono *
                        </label>
                        <input
                          type="tel"
                          value={nuevoCliente.telefono}
                          onChange={(e) => setNuevoCliente(prev => ({ ...prev, telefono: e.target.value }))}
                          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                            errors.telefono ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="+56 9 1234 5678"
                        />
                        {errors.telefono && (
                          <p className="text-red-500 text-xs mt-1">{errors.telefono}</p>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email
                        </label>
                        <input
                          type="email"
                          value={nuevoCliente.email || ''}
                          onChange={(e) => setNuevoCliente(prev => ({ ...prev, email: e.target.value }))}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                          placeholder="juan.perez@email.com"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Dirección
                      </label>
                      <input
                        type="text"
                        value={nuevoCliente.direccion || ''}
                        onChange={(e) => setNuevoCliente(prev => ({ ...prev, direccion: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        placeholder="Calle Principal 123, Ciudad"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Paso 2: Seleccionar Vehículo */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Seleccionar Vehículo</h3>
                
                {/* Vehículos del cliente seleccionado */}
                {tipoCliente === 'existente' && clienteSeleccionado && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Vehículos de {clienteSeleccionado.nombre}
                    </label>
                    <select
                      value={vehiculoSeleccionado?.id || ''}
                      onChange={(e) => {
                        const vehiculo = vehiculos.find(v => v.id === parseInt(e.target.value));
                        setVehiculoSeleccionado(vehiculo || null);
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      title="Seleccionar vehículo del cliente"
                    >
                      <option value="">Seleccione un vehículo...</option>
                      {vehiculos
                        .filter(v => v.clienteId === clienteSeleccionado.id)
                        .map(vehiculo => (
                          <option key={vehiculo.id} value={vehiculo.id}>
                            {vehiculo.marca} {vehiculo.modelo} - {vehiculo.patente}
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                {/* Crear nuevo vehículo */}
                <div className="mt-6">
                  <h4 className="text-md font-medium text-gray-900 mb-4">
                    {tipoCliente === 'existente' ? 'O crear nuevo vehículo:' : 'Datos del vehículo:'}
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Marca *
                      </label>
                      <input
                        type="text"
                        value={nuevoVehiculo.marca}
                        onChange={(e) => setNuevoVehiculo(prev => ({ ...prev, marca: e.target.value }))}
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                          errors.vehiculo ? 'border-red-500' : 'border-gray-300'
                        }`}
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
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                          errors.vehiculo ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Corolla"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Año *
                      </label>
                      <input
                        type="number"
                        value={nuevoVehiculo.año}
                        onChange={(e) => setNuevoVehiculo(prev => ({ ...prev, año: parseInt(e.target.value) }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        min="1900"
                        max={new Date().getFullYear() + 1}
                        placeholder="Año del vehículo"
                        title="Año del vehículo"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Patente *
                      </label>
                      <input
                        type="text"
                        value={nuevoVehiculo.patente}
                        onChange={(e) => setNuevoVehiculo(prev => ({ ...prev, patente: e.target.value.toUpperCase() }))}
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                          errors.vehiculo ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="ABC123"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Color
                      </label>
                      <input
                        type="text"
                        value={nuevoVehiculo.color || ''}
                        onChange={(e) => setNuevoVehiculo(prev => ({ ...prev, color: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        placeholder="Blanco"
                      />
                    </div>
                  </div>
                  
                  {errors.vehiculo && (
                    <p className="text-red-500 text-xs mt-1">{errors.vehiculo}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Paso 3: Detalles de Cotización */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Detalles de Cotización</h3>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fecha
                    </label>
                    <input
                      type="date"
                      value={cotizacion.fecha}
                      onChange={(e) => setCotizacion(prev => ({ ...prev, fecha: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      title="Fecha de la cotización"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Válida Hasta
                    </label>
                    <input
                      type="date"
                      value={cotizacion.validaHasta}
                      onChange={(e) => setCotizacion(prev => ({ ...prev, validaHasta: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      title="Fecha de validez de la cotización"
                    />
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descripción
                  </label>
                  <textarea
                    value={cotizacion.descripcion}
                    onChange={(e) => setCotizacion(prev => ({ ...prev, descripcion: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    rows={3}
                    placeholder="Descripción del trabajo a realizar..."
                  />
                </div>

                {/* Servicios */}
                <div className="mb-6">
                  <h4 className="text-md font-medium text-gray-900 mb-4">Servicios</h4>
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                    {servicios.map(servicio => (
                      <button
                        key={servicio.id}
                        onClick={() => agregarServicio(servicio)}
                        className="p-3 text-left border border-gray-300 rounded-lg hover:border-red-500 hover:bg-red-50 transition-colors"
                      >
                        <div className="font-medium">{servicio.nombre}</div>
                        <div className="text-sm text-gray-600">${servicio.precio.toLocaleString()}</div>
                      </button>
                    ))}
                  </div>
                  
                  {serviciosSeleccionados.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <h5 className="font-medium text-gray-900">Servicios Seleccionados:</h5>
                      {serviciosSeleccionados.map((item, index) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span>{item.servicio.nombre} x {item.cantidad}</span>
                          <span className="font-medium">${(item.servicio.precio * item.cantidad).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Repuestos */}
                <div className="mb-6">
                  <h4 className="text-md font-medium text-gray-900 mb-4">Repuestos</h4>
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                    {repuestos.map(repuesto => (
                      <button
                        key={repuesto.id}
                        onClick={() => agregarRepuesto(repuesto)}
                        className="p-3 text-left border border-gray-300 rounded-lg hover:border-red-500 hover:bg-red-50 transition-colors"
                      >
                        <div className="font-medium">{repuesto.nombre}</div>
                        <div className="text-sm text-gray-600">${repuesto.precio.toLocaleString()} - Stock: {repuesto.stock}</div>
                      </button>
                    ))}
                  </div>
                  
                  {repuestosSeleccionados.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <h5 className="font-medium text-gray-900">Repuestos Seleccionados:</h5>
                      {repuestosSeleccionados.map((item, index) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span>{item.repuesto.nombre} x {item.cantidad}</span>
                          <span className="font-medium">${(item.repuesto.precio * item.cantidad).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Total */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total:</span>
                    <span>${calcularTotal().toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t border-gray-200">
          <button
            onClick={handleBack}
            disabled={step === 1}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Anterior
          </button>
          
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            
            {step < 3 ? (
              <button
                onClick={handleNext}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Siguiente
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Guardando...' : 'Crear Cotización'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
