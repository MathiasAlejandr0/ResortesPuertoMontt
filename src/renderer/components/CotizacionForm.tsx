import React, { useState, useEffect } from 'react';
import { Cliente, Vehiculo, Servicio, Repuesto, CotizacionFormData, CotizacionItem } from '../types';

interface CotizacionFormProps {
  cotizacion?: any;
  onSave: (cotizacion: any) => void;
  onCancel: () => void;
}

export default function CotizacionForm({ cotizacion, onSave, onCancel }: CotizacionFormProps) {
  const [formData, setFormData] = useState<CotizacionFormData>({
    cliente: null,
    vehiculo: null,
    descripcion: '',
    observaciones: '',
    validaHasta: '',
    items: []
  });

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [repuestos, setRepuestos] = useState<Repuesto[]>([]);
  
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [busquedaVehiculo, setBusquedaVehiculo] = useState('');
  const [busquedaRepuesto, setBusquedaRepuesto] = useState('');
  
  const [mostrarBusquedaCliente, setMostrarBusquedaCliente] = useState(false);
  const [mostrarBusquedaVehiculo, setMostrarBusquedaVehiculo] = useState(false);
  const [mostrarBusquedaRepuesto, setMostrarBusquedaRepuesto] = useState(false);
  const [mostrarNuevoCliente, setMostrarNuevoCliente] = useState(false);
  const [mostrarNuevoVehiculo, setMostrarNuevoVehiculo] = useState(false);

  useEffect(() => {
    loadData();
    if (cotizacion) {
      setFormData({
        cliente: cotizacion.cliente,
        vehiculo: cotizacion.vehiculo,
        descripcion: cotizacion.descripcion,
        observaciones: cotizacion.observaciones,
        validaHasta: cotizacion.validaHasta,
        items: cotizacion.items || []
      });
    } else {
      // Generar número de cotización automático
      const numero = `COT-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
      setFormData(prev => ({ ...prev, numero }));
    }
  }, [cotizacion]);

  const loadData = async () => {
    try {
      const [clientesData, vehiculosData, serviciosData, repuestosData] = await Promise.all([
        window.electronAPI.getAllClientes(),
        window.electronAPI.getAllVehiculos(),
        window.electronAPI.getAllServicios(),
        window.electronAPI.getAllRepuestos()
      ]);
      
      setClientes(clientesData);
      setVehiculos(vehiculosData);
      setServicios(serviciosData);
      setRepuestos(repuestosData);
    } catch (error) {
      console.error('Error cargando datos:', error);
    }
  };

  const clientesFiltrados = clientes.filter(cliente =>
    cliente.nombre.toLowerCase().includes(busquedaCliente.toLowerCase()) ||
    cliente.rut.includes(busquedaCliente)
  );

  const vehiculosFiltrados = vehiculos.filter(vehiculo =>
    vehiculo.patente.toLowerCase().includes(busquedaVehiculo.toLowerCase()) ||
    vehiculo.marca.toLowerCase().includes(busquedaVehiculo.toLowerCase()) ||
    vehiculo.modelo.toLowerCase().includes(busquedaVehiculo.toLowerCase())
  );

  const repuestosFiltrados = repuestos.filter(repuesto =>
    repuesto.nombre.toLowerCase().includes(busquedaRepuesto.toLowerCase()) ||
    repuesto.codigo.toLowerCase().includes(busquedaRepuesto.toLowerCase())
  );

  const handleClienteSelect = (cliente: Cliente) => {
    setFormData(prev => ({ ...prev, cliente }));
    setBusquedaCliente('');
    setMostrarBusquedaCliente(false);
    
    // Filtrar vehículos del cliente seleccionado
    const vehiculosCliente = vehiculos.filter(v => v.clienteId === cliente.id);
    setVehiculos(vehiculosCliente);
  };

  const handleVehiculoSelect = (vehiculo: Vehiculo) => {
    setFormData(prev => ({ ...prev, vehiculo }));
    setBusquedaVehiculo('');
    setMostrarBusquedaVehiculo(false);
  };

  const handleAddServicio = (servicio: Servicio) => {
    const nuevoItem: CotizacionItem = {
      tipo: 'servicio',
      servicioId: servicio.id,
      descripcion: servicio.nombre,
      cantidad: 1,
      precio: servicio.precio,
      subtotal: servicio.precio
    };
    
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, nuevoItem]
    }));
  };

  const handleAddRepuesto = (repuesto: Repuesto) => {
    const nuevoItem: CotizacionItem = {
      tipo: 'repuesto',
      repuestoId: repuesto.id,
      descripcion: repuesto.nombre,
      cantidad: 1,
      precio: repuesto.precio,
      subtotal: repuesto.precio
    };
    
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, nuevoItem]
    }));
    
    setBusquedaRepuesto('');
    setMostrarBusquedaRepuesto(false);
  };

  const handleItemChange = (index: number, field: keyof CotizacionItem, value: any) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      
      if (field === 'cantidad' || field === 'precio') {
        newItems[index].subtotal = newItems[index].cantidad * newItems[index].precio;
      }
      
      return { ...prev, items: newItems };
    });
  };

  const handleRemoveItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const calcularTotal = () => {
    return formData.items.reduce((total, item) => total + item.subtotal, 0);
  };

  const handleSave = () => {
    if (!formData.cliente || !formData.vehiculo || formData.items.length === 0) {
      alert('Por favor complete todos los campos requeridos');
      return;
    }

    const cotizacionData = {
      numero: cotizacion?.numero || `COT-${Date.now()}`,
      clienteId: formData.cliente.id,
      vehiculoId: formData.vehiculo.id,
      fecha: new Date().toISOString(),
      validaHasta: formData.validaHasta,
      estado: 'pendiente',
      descripcion: formData.descripcion,
      observaciones: formData.observaciones,
      total: calcularTotal()
    };

    onSave(cotizacionData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-black rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">
            {cotizacion ? 'Editar Cotización' : 'Nueva Cotización'}
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Información del Cliente */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Información del Cliente</h3>
            
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar cliente por nombre o RUT..."
                value={busquedaCliente}
                onChange={(e) => {
                  setBusquedaCliente(e.target.value);
                  setMostrarBusquedaCliente(true);
                }}
                className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:border-red-500 focus:outline-none"
              />
              
              {mostrarBusquedaCliente && busquedaCliente && (
                <div className="absolute z-10 w-full bg-gray-800 border border-gray-700 rounded mt-1 max-h-40 overflow-y-auto">
                  {clientesFiltrados.map(cliente => (
                    <div
                      key={cliente.id}
                      onClick={() => handleClienteSelect(cliente)}
                      className="px-3 py-2 hover:bg-gray-700 cursor-pointer text-white"
                    >
                      <div className="font-medium">{cliente.nombre}</div>
                      <div className="text-sm text-gray-300">RUT: {cliente.rut}</div>
                    </div>
                  ))}
                  <div
                    onClick={() => setMostrarNuevoCliente(true)}
                    className="px-3 py-2 hover:bg-gray-700 cursor-pointer text-red-400 border-t border-gray-700"
                  >
                    + Crear nuevo cliente
                  </div>
                </div>
              )}
            </div>

            {formData.cliente && (
              <div className="bg-gray-800 p-3 rounded">
                <div className="text-white font-medium">{formData.cliente.nombre}</div>
                <div className="text-gray-300 text-sm">RUT: {formData.cliente.rut}</div>
                <div className="text-gray-300 text-sm">Tel: {formData.cliente.telefono}</div>
              </div>
            )}
          </div>

          {/* Información del Vehículo */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Información del Vehículo</h3>
            
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar vehículo por patente, marca o modelo..."
                value={busquedaVehiculo}
                onChange={(e) => {
                  setBusquedaVehiculo(e.target.value);
                  setMostrarBusquedaVehiculo(true);
                }}
                className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:border-red-500 focus:outline-none"
              />
              
              {mostrarBusquedaVehiculo && busquedaVehiculo && (
                <div className="absolute z-10 w-full bg-gray-800 border border-gray-700 rounded mt-1 max-h-40 overflow-y-auto">
                  {vehiculosFiltrados.map(vehiculo => (
                    <div
                      key={vehiculo.id}
                      onClick={() => handleVehiculoSelect(vehiculo)}
                      className="px-3 py-2 hover:bg-gray-700 cursor-pointer text-white"
                    >
                      <div className="font-medium">{vehiculo.marca} {vehiculo.modelo}</div>
                      <div className="text-sm text-gray-300">Patente: {vehiculo.patente}</div>
                    </div>
                  ))}
                  <div
                    onClick={() => setMostrarNuevoVehiculo(true)}
                    className="px-3 py-2 hover:bg-gray-700 cursor-pointer text-red-400 border-t border-gray-700"
                  >
                    + Crear nuevo vehículo
                  </div>
                </div>
              )}
            </div>

            {formData.vehiculo && (
              <div className="bg-gray-800 p-3 rounded">
                <div className="text-white font-medium">{formData.vehiculo.marca} {formData.vehiculo.modelo}</div>
                <div className="text-gray-300 text-sm">Patente: {formData.vehiculo.patente}</div>
                <div className="text-gray-300 text-sm">Año: {formData.vehiculo.año}</div>
                {formData.vehiculo.color && (
                  <div className="text-gray-300 text-sm">Color: {formData.vehiculo.color}</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Descripción y Observaciones */}
        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Descripción del Trabajo</label>
            <textarea
              value={formData.descripcion}
              onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:border-red-500 focus:outline-none"
              rows={3}
              placeholder="Describe el trabajo a realizar..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Observaciones</label>
            <textarea
              value={formData.observaciones}
              onChange={(e) => setFormData(prev => ({ ...prev, observaciones: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:border-red-500 focus:outline-none"
              rows={2}
              placeholder="Observaciones adicionales..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Válida Hasta</label>
            <input
              type="date"
              value={formData.validaHasta}
              onChange={(e) => setFormData(prev => ({ ...prev, validaHasta: e.target.value }))}
              className="px-3 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:border-red-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Servicios Disponibles */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-white mb-4">Servicios Disponibles</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {servicios.map(servicio => (
              <div
                key={servicio.id}
                onClick={() => handleAddServicio(servicio)}
                className="bg-gray-800 p-3 rounded cursor-pointer hover:bg-gray-700"
              >
                <div className="text-white font-medium">{servicio.nombre}</div>
                <div className="text-gray-300 text-sm">${servicio.precio.toLocaleString()}</div>
                <div className="text-gray-400 text-xs">{servicio.duracionEstimada} min</div>
              </div>
            ))}
          </div>
        </div>

        {/* Búsqueda de Repuestos */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-white mb-4">Agregar Repuestos</h3>
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar repuesto por nombre o código..."
              value={busquedaRepuesto}
              onChange={(e) => {
                setBusquedaRepuesto(e.target.value);
                setMostrarBusquedaRepuesto(true);
              }}
              className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700 focus:border-red-500 focus:outline-none"
            />
            
            {mostrarBusquedaRepuesto && busquedaRepuesto && (
              <div className="absolute z-10 w-full bg-gray-800 border border-gray-700 rounded mt-1 max-h-40 overflow-y-auto">
                {repuestosFiltrados.slice(0, 10).map(repuesto => (
                  <div
                    key={repuesto.id}
                    onClick={() => handleAddRepuesto(repuesto)}
                    className="px-3 py-2 hover:bg-gray-700 cursor-pointer text-white"
                  >
                    <div className="font-medium">{repuesto.nombre}</div>
                    <div className="text-sm text-gray-300">Código: {repuesto.codigo}</div>
                    <div className="text-sm text-gray-300">${repuesto.precio.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Items de la Cotización */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-white mb-4">Items de la Cotización</h3>
          <div className="bg-gray-800 rounded overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-4 py-2 text-left text-white">Descripción</th>
                  <th className="px-4 py-2 text-left text-white">Cantidad</th>
                  <th className="px-4 py-2 text-left text-white">Precio</th>
                  <th className="px-4 py-2 text-left text-white">Subtotal</th>
                  <th className="px-4 py-2 text-left text-white">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {formData.items.map((item, index) => (
                  <tr key={index} className="border-t border-gray-700">
                    <td className="px-4 py-2 text-white">{item.descripcion}</td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min="1"
                        value={item.cantidad}
                        onChange={(e) => handleItemChange(index, 'cantidad', parseInt(e.target.value))}
                        className="w-20 px-2 py-1 bg-gray-700 text-white rounded border border-gray-600 focus:border-red-500 focus:outline-none"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.precio}
                        onChange={(e) => handleItemChange(index, 'precio', parseFloat(e.target.value))}
                        className="w-24 px-2 py-1 bg-gray-700 text-white rounded border border-gray-600 focus:border-red-500 focus:outline-none"
                      />
                    </td>
                    <td className="px-4 py-2 text-white">${item.subtotal.toLocaleString()}</td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => handleRemoveItem(index)}
                        className="text-red-400 hover:text-red-300"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="mt-4 flex justify-end">
            <div className="text-xl font-bold text-white">
              Total: ${calcularTotal().toLocaleString()}
            </div>
          </div>
        </div>

        {/* Botones */}
        <div className="mt-6 flex justify-end space-x-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-800"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            {cotizacion ? 'Actualizar' : 'Crear'} Cotización
          </button>
        </div>
      </div>
    </div>
  );
}