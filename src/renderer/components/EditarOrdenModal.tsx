import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { useApp } from '../contexts/AppContext';
import { 
  X, 
  Save, 
  Calendar, 
  User, 
  Car, 
  Wrench, 
  DollarSign, 
  Clock, 
  AlertCircle,
  Plus,
  Trash2,
  FileText,
  Package
} from 'lucide-react';
import { OrdenTrabajo, Cliente, Vehiculo, Servicio, Repuesto } from '../types';

interface EditarOrdenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (orden: OrdenTrabajo, detalles?: DetalleOrden[]) => void;
  orden: OrdenTrabajo | null;
}

interface DetalleOrden {
  id?: number;
  tipo: 'servicio' | 'repuesto';
  servicioId?: number;
  repuestoId?: number;
  cantidad: number;
  precio: number;
  subtotal: number;
  descripcion: string;
}

export default function EditarOrdenModal({ 
  isOpen, 
  onClose, 
  onSave, 
  orden
}: EditarOrdenModalProps) {
  // Usar el contexto para acceder a los datos
  const { clientes, vehiculos, servicios, repuestos } = useApp();
  const [formData, setFormData] = useState({
    numero: '',
    clienteId: 0,
    vehiculoId: 0,
    fechaIngreso: '',
    fechaEntrega: '',
    estado: 'Pendiente',
    descripcion: '',
    observaciones: '',
    total: 0,
    kilometrajeEntrada: 0,
    kilometrajeSalida: 0,
    prioridad: 'media',
    tecnicoAsignado: ''
  });

  const [detalles, setDetalles] = useState<DetalleOrden[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (orden && isOpen) {
      setFormData({
        numero: orden.numero || '',
        clienteId: orden.clienteId || 0,
        vehiculoId: orden.vehiculoId || 0,
        fechaIngreso: orden.fechaIngreso || '',
        fechaEntrega: orden.fechaEntrega || '',
        estado: orden.estado || 'pendiente',
        descripcion: orden.descripcion || '',
        observaciones: orden.observaciones || '',
        total: orden.total || 0,
        kilometrajeEntrada: orden.kilometrajeEntrada || 0,
        kilometrajeSalida: orden.kilometrajeSalida || 0,
        prioridad: (() => {
          // Normalizar prioridad de la BD a formato del formulario (minúsculas)
          const prioridadFromDb = orden.prioridad?.toLowerCase() || 'media';
          const prioridadMap: Record<string, 'baja' | 'media' | 'alta' | 'urgente'> = {
            'baja': 'baja',
            'normal': 'media',
            'media': 'media',
            'alta': 'alta',
            'urgente': 'urgente'
          };
          return prioridadMap[prioridadFromDb] || 'media';
        })(),
        tecnicoAsignado: orden.tecnicoAsignado || ''
      });

      (async () => {
        try {
          const detallesExistentes = orden.id ? await window.electronAPI.getDetallesOrden(orden.id) : [];
          // Asegurar que los detalles tengan los campos necesarios
          const detallesFormateados = (detallesExistentes || []).map((d: any) => ({
            id: d.id,
            tipo: d.tipo || 'repuesto',
            servicioId: d.servicioId || undefined,
            repuestoId: d.repuestoId || undefined,
            cantidad: d.cantidad || 1,
            precio: d.precio || 0,
            subtotal: d.subtotal || (d.cantidad || 1) * (d.precio || 0),
            descripcion: d.descripcion || ''
          }));
          setDetalles(detallesFormateados);
        } catch (e) {
          console.error('Error cargando detalles:', e);
          setDetalles([]);
        }
      })();
    }
  }, [orden, isOpen]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addDetalle = (tipo: 'servicio' | 'repuesto') => {
    const nuevoDetalle: DetalleOrden = {
      tipo,
      cantidad: 1,
      precio: 0,
      subtotal: 0,
      descripcion: ''
    };
    setDetalles(prev => {
      const nuevosDetalles = [...prev, nuevoDetalle];
      // Actualizar el total automáticamente cuando se agrega un detalle
      const nuevoTotal = nuevosDetalles.reduce((sum, detalle) => sum + detalle.subtotal, 0);
      setFormData(prevForm => ({ ...prevForm, total: nuevoTotal }));
      return nuevosDetalles;
    });
  };

  const updateDetalle = (index: number, field: string, value: any) => {
    setDetalles(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      
      // Recalcular subtotal
      if (field === 'cantidad' || field === 'precio') {
        updated[index].subtotal = updated[index].cantidad * updated[index].precio;
      }
      
      // Actualizar el total automáticamente cuando se modifica un detalle
      const nuevoTotal = updated.reduce((sum, detalle) => sum + detalle.subtotal, 0);
      setFormData(prevForm => ({ ...prevForm, total: nuevoTotal }));
      
      return updated;
    });
  };

  const removeDetalle = (index: number) => {
    setDetalles(prev => {
      const nuevosDetalles = prev.filter((_, i) => i !== index);
      // Actualizar el total automáticamente cuando se elimina un detalle
      const nuevoTotal = nuevosDetalles.reduce((sum, detalle) => sum + detalle.subtotal, 0);
      setFormData(prevForm => ({ ...prevForm, total: nuevoTotal }));
      return nuevosDetalles;
    });
  };

  const calcularTotal = () => {
    return detalles.reduce((sum, detalle) => sum + detalle.subtotal, 0);
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // El dueño del taller decide el total final; usamos el ingresado en el formulario
      const totalFinal = Number(formData.total) || 0;
      // Normalizar estado a valores minúsculas esperados por el esquema de validación
      const estadoMap: Record<string, 'pendiente' | 'en_proceso' | 'completada' | 'cancelada'> = {
        'pendiente': 'pendiente',
        'Pendiente': 'pendiente',
        'en_proceso': 'en_proceso',
        'En Progreso': 'en_proceso',
        'En Proceso': 'en_proceso',
        'completada': 'completada',
        'Completada': 'completada',
        'cancelada': 'cancelada',
        'Cancelada': 'cancelada'
      };
      const estadoNormalizado = estadoMap[formData.estado as string] || 'pendiente';
      
      // Normalizar prioridad a valores minúsculas esperados por el esquema de validación
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
      const prioridadNormalizada = prioridadMap[formData.prioridad as string] || 'media';
      
      const ordenActualizada: OrdenTrabajo = {
        ...orden!,
        ...formData,
        estado: estadoNormalizado,
        prioridad: prioridadNormalizada,
        total: totalFinal
      };
      
      // Pasar también los detalles modificados
      await onSave(ordenActualizada, detalles);
      onClose();
    } catch (error) {
      console.error('Error guardando orden:', error);
      alert('Error al guardar la orden');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !orden) return null;

  const vehiculosDelCliente = vehiculos.filter(v => v.clienteId === formData.clienteId);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            Editar Orden de Trabajo {orden.numero || `OT-${orden.id}`}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Cerrar modal"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Información General */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Información General
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número de Orden
                  </label>
                  <input
                    type="text"
                    value={formData.numero}
                    onChange={(e) => handleInputChange('numero', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Número de orden"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estado
                  </label>
                  <select
                    value={formData.estado}
                    onChange={(e) => handleInputChange('estado', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    title="Seleccionar estado de la orden"
                  >
                    <option value="Pendiente">Pendiente</option>
                    <option value="En Progreso">En Progreso</option>
                    <option value="Completada">Completada</option>
                    <option value="Cancelada">Cancelada</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prioridad
                  </label>
                  <select
                    value={formData.prioridad}
                    onChange={(e) => handleInputChange('prioridad', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    title="Seleccionar prioridad de la orden"
                  >
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Técnico Asignado
                  </label>
                  <input
                    type="text"
                    value={formData.tecnicoAsignado}
                    onChange={(e) => handleInputChange('tecnicoAsignado', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Nombre del técnico"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Ingreso
                  </label>
                  <input
                    type="date"
                    value={formData.fechaIngreso}
                    onChange={(e) => handleInputChange('fechaIngreso', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    title="Fecha de ingreso de la orden"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Entrega
                  </label>
                  <input
                    type="date"
                    value={formData.fechaEntrega}
                    onChange={(e) => handleInputChange('fechaEntrega', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    title="Fecha de entrega estimada"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kilometraje Entrada
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.kilometrajeEntrada}
                    onChange={(e) => handleInputChange('kilometrajeEntrada', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Kilometraje de entrada"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kilometraje Salida
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.kilometrajeSalida}
                    onChange={(e) => handleInputChange('kilometrajeSalida', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Kilometraje de salida"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cliente y Vehículo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Cliente y Vehículo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cliente
                  </label>
                  <select
                    value={formData.clienteId}
                    onChange={(e) => {
                      handleInputChange('clienteId', parseInt(e.target.value));
                      handleInputChange('vehiculoId', 0); // Reset vehículo
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    title="Seleccionar cliente"
                  >
                    <option value={0}>Seleccionar cliente</option>
                    {clientes.map(cliente => (
                      <option key={cliente.id} value={cliente.id}>
                        {cliente.nombre} - {cliente.rut}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vehículo
                  </label>
                  <select
                    value={formData.vehiculoId}
                    onChange={(e) => handleInputChange('vehiculoId', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    disabled={!formData.clienteId}
                    title="Seleccionar vehículo del cliente"
                  >
                    <option value={0}>Seleccionar vehículo</option>
                    {vehiculosDelCliente.map(vehiculo => (
                      <option key={vehiculo.id} value={vehiculo.id}>
                        {vehiculo.marca} {vehiculo.modelo} - {vehiculo.patente}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Descripción y Observaciones */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Descripción del Trabajo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => handleInputChange('descripcion', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Describe el trabajo a realizar..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observaciones
                </label>
                <textarea
                  value={formData.observaciones}
                  onChange={(e) => handleInputChange('observaciones', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Observaciones adicionales..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Servicios y Repuestos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Servicios y Repuestos
                  <span className="text-sm font-normal text-gray-500">
                    (Puedes agregar o quitar ítems)
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addDetalle('servicio')}
                    className="bg-green-50 hover:bg-green-100 border-green-300 text-green-700"
                    title="Agregar un nuevo servicio"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Agregar Servicio
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addDetalle('repuesto')}
                    className="bg-red-50 hover:bg-red-100 border-red-300 text-red-700"
                    title="Agregar un nuevo repuesto"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Agregar Repuesto
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {detalles.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-sm mb-2">No hay servicios ni repuestos agregados</p>
                  <p className="text-xs text-gray-400">Usa los botones de arriba para agregar ítems</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {detalles.map((detalle, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Tipo
                        </label>
                        <select
                          value={detalle.tipo}
                          onChange={(e) => updateDetalle(index, 'tipo', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                          title="Seleccionar tipo de detalle"
                        >
                          <option value="servicio">Servicio</option>
                          <option value="repuesto">Repuesto</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {detalle.tipo === 'servicio' ? 'Servicio' : 'Repuesto'}
                        </label>
                        <select
                          value={detalle.tipo === 'servicio' ? detalle.servicioId || 0 : detalle.repuestoId || 0}
                          onChange={(e) => {
                            const value = parseInt(e.target.value);
                            if (detalle.tipo === 'servicio') {
                              updateDetalle(index, 'servicioId', value);
                              const servicio = servicios.find(s => s.id === value);
                              updateDetalle(index, 'precio', servicio?.precio || 0);
                              updateDetalle(index, 'descripcion', servicio?.nombre || '');
                            } else {
                              updateDetalle(index, 'repuestoId', value);
                              const repuesto = repuestos.find(r => r.id === value);
                              updateDetalle(index, 'precio', repuesto?.precio || 0);
                              updateDetalle(index, 'descripcion', repuesto?.nombre || '');
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                          title={`Seleccionar ${detalle.tipo === 'servicio' ? 'servicio' : 'repuesto'}`}
                        >
                          <option value={0}>Seleccionar {detalle.tipo}</option>
                          {detalle.tipo === 'servicio' 
                            ? servicios.map(servicio => (
                                <option key={servicio.id} value={servicio.id}>
                                  {servicio.nombre} - ${servicio.precio.toLocaleString()}
                                </option>
                              ))
                            : repuestos.map(repuesto => (
                                <option key={repuesto.id} value={repuesto.id}>
                                  {repuesto.nombre} - ${repuesto.precio.toLocaleString()}
                                </option>
                              ))
                          }
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Cantidad
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={detalle.cantidad}
                          onChange={(e) => updateDetalle(index, 'cantidad', parseInt(e.target.value) || 1)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                          placeholder="Cantidad"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Precio
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={detalle.precio}
                          onChange={(e) => updateDetalle(index, 'precio', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                          placeholder="Precio"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="text-sm text-gray-500">Subtotal</p>
                          <p className="font-medium">${detalle.subtotal.toLocaleString()}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removeDetalle(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Resumen de Costos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Resumen de Costos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal (suma de ítems):</span>
                  <span className="font-medium">${calcularTotal().toLocaleString()}</span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total final (editable)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.total}
                    onChange={(e) => handleInputChange('total', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Total final decidido por el taller"
                  />
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">IVA (19% sobre el total - referencia):</span>
                    <span className="font-medium text-gray-700">${Math.round((formData.total || 0) * 0.19).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700"
          >
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      </div>
    </div>
  );
}
