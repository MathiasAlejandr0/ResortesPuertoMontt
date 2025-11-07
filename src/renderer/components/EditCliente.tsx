import React, { useState, useEffect } from 'react';
import { Cliente, Vehiculo } from '../types';
import { formatearRUT } from '../utils/cn';

interface EditClienteProps {
  cliente?: Cliente;
  onSave: (cliente: Cliente) => void;
  onCancel: () => void;
}

export default function EditCliente({ cliente, onSave, onCancel }: EditClienteProps) {
  const [formData, setFormData] = useState<Cliente>({
    nombre: '',
    rut: '',
    telefono: '',
    email: '',
    direccion: '',
    activo: true
  });

  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [mostrarNuevoVehiculo, setMostrarNuevoVehiculo] = useState(false);
  const [vehiculoEditando, setVehiculoEditando] = useState<Vehiculo | undefined>();

  useEffect(() => {
    if (cliente) {
      setFormData(cliente);
      if (cliente.id) {
        loadVehiculos(cliente.id);
      }
    }
  }, [cliente]);

  const loadVehiculos = async (clienteId: number) => {
    try {
      const vehiculosData = await window.electronAPI.getAllVehiculos();
      const vehiculosCliente = vehiculosData.filter((v: Vehiculo) => v.clienteId === clienteId);
      setVehiculos(vehiculosCliente);
    } catch (error) {
      console.error('Error cargando vehículos:', error);
    }
  };

  const handleInputChange = (field: keyof Cliente, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!formData.nombre || !formData.rut || !formData.telefono) {
      alert('Por favor complete los campos requeridos');
      return;
    }

    onSave(formData);
  };

  const handleSaveVehiculo = async (vehiculo: Vehiculo) => {
    try {
      await window.electronAPI.saveVehiculo(vehiculo);
      await loadVehiculos(formData.id!);
      setMostrarNuevoVehiculo(false);
      setVehiculoEditando(undefined);
    } catch (error) {
      console.error('Error guardando vehículo:', error);
      const msg = error instanceof Error ? error.message : 'Error guardando vehículo';
      alert(msg.includes('UNIQUE constraint failed: vehiculos.patente')
        ? 'Ya existe un vehículo con esa patente. Debe ser única.'
        : msg);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">
            {cliente ? 'Editar Cliente' : 'Nuevo Cliente'}
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
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Nombre *</label>
              <input
                type="text"
                value={formData.nombre}
                onChange={(e) => handleInputChange('nombre', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-red-500 focus:outline-none"
                placeholder="Nombre completo del cliente"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">RUT *</label>
              <input
                type="text"
                value={formData.rut}
                onChange={(e) => {
                  const formatted = formatearRUT(e.target.value);
                  handleInputChange('rut', formatted);
                }}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-red-500 focus:outline-none"
                placeholder="12.345.678-9"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Teléfono *</label>
              <input
                type="text"
                value={formData.telefono}
                onChange={(e) => handleInputChange('telefono', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-red-500 focus:outline-none"
                placeholder="+56 9 1234 5678"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-red-500 focus:outline-none"
                placeholder="cliente@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Dirección</label>
              <textarea
                value={formData.direccion || ''}
                onChange={(e) => handleInputChange('direccion', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-red-500 focus:outline-none"
                rows={3}
                placeholder="Dirección completa"
              />
            </div>
          </div>

          {/* Vehículos del Cliente */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">Vehículos</h3>
              <button
                onClick={() => setMostrarNuevoVehiculo(true)}
                className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
              >
                + Nuevo Vehículo
              </button>
            </div>

            {vehiculos.length === 0 ? (
              <div className="text-gray-400 text-center py-8">
                No hay vehículos registrados
              </div>
            ) : (
              <div className="space-y-3">
                {vehiculos.map(vehiculo => (
                  <div key={vehiculo.id} className="bg-gray-700 p-3 rounded">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-white font-medium">
                          {vehiculo.marca} {vehiculo.modelo}
                        </div>
                        <div className="text-gray-300 text-sm">
                          Patente: {vehiculo.patente}
                        </div>
                        <div className="text-gray-300 text-sm">
                          Año: {vehiculo.año}
                        </div>
                        {vehiculo.color && (
                          <div className="text-gray-300 text-sm">
                            Color: {vehiculo.color}
                          </div>
                        )}
                        {vehiculo.kilometraje && (
                          <div className="text-gray-300 text-sm">
                            Kilometraje: {vehiculo.kilometraje.toLocaleString()} km
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => setVehiculoEditando(vehiculo)}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        Editar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Botones */}
        <div className="mt-6 flex justify-end space-x-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            {cliente ? 'Actualizar' : 'Crear'} Cliente
          </button>
        </div>

        {/* Modal para nuevo/editar vehículo */}
        {mostrarNuevoVehiculo && (
          <VehiculoForm
            vehiculo={vehiculoEditando}
            clienteId={formData.id!}
            onSave={handleSaveVehiculo}
            onCancel={() => {
              setMostrarNuevoVehiculo(false);
              setVehiculoEditando(undefined);
            }}
          />
        )}
      </div>
    </div>
  );
}

// Componente para el formulario de vehículo
interface VehiculoFormProps {
  vehiculo?: Vehiculo;
  clienteId: number;
  onSave: (vehiculo: Vehiculo) => void;
  onCancel: () => void;
}

function VehiculoForm({ vehiculo, clienteId, onSave, onCancel }: VehiculoFormProps) {
  const [formData, setFormData] = useState<Vehiculo>({
    clienteId,
    marca: '',
    modelo: '',
    año: new Date().getFullYear(),
    patente: '',
    color: '',
    kilometraje: 0,
    observaciones: '',
    activo: true
  });

  useEffect(() => {
    if (vehiculo) {
      setFormData(vehiculo);
    }
  }, [vehiculo]);

  const handleInputChange = (field: keyof Vehiculo, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!formData.marca || !formData.modelo || !formData.patente) {
      alert('Por favor complete los campos requeridos');
      return;
    }

    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">
            {vehiculo ? 'Editar Vehículo' : 'Nuevo Vehículo'}
          </h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Marca *</label>
            <input
              type="text"
              value={formData.marca}
              onChange={(e) => handleInputChange('marca', e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-red-500 focus:outline-none"
              placeholder="Toyota"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Modelo *</label>
            <input
              type="text"
              value={formData.modelo}
              onChange={(e) => handleInputChange('modelo', e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-red-500 focus:outline-none"
              placeholder="Corolla"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Año</label>
            <input
              type="number"
              value={formData.año}
              onChange={(e) => handleInputChange('año', parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-red-500 focus:outline-none"
              min="1900"
              max={new Date().getFullYear() + 1}
              title="Año del vehículo"
              placeholder="Ej: 2020"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Patente *</label>
            <input
              type="text"
              value={formData.patente}
              onChange={(e) => handleInputChange('patente', e.target.value.toUpperCase())}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-red-500 focus:outline-none"
              placeholder="ABC123"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Color</label>
            <input
              type="text"
              value={formData.color || ''}
              onChange={(e) => handleInputChange('color', e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-red-500 focus:outline-none"
              placeholder="Blanco"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Kilometraje</label>
            <input
              type="number"
              value={formData.kilometraje || ''}
              onChange={(e) => handleInputChange('kilometraje', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-red-500 focus:outline-none"
              placeholder="50000"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">Observaciones</label>
          <textarea
            value={formData.observaciones || ''}
            onChange={(e) => handleInputChange('observaciones', e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-red-500 focus:outline-none"
            rows={3}
            placeholder="Observaciones adicionales..."
          />
        </div>

        <div className="mt-6 flex justify-end space-x-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            {vehiculo ? 'Actualizar' : 'Crear'} Vehículo
          </button>
        </div>
      </div>
    </div>
  );
}