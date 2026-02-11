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
  DollarSign, 
  Clock, 
  AlertCircle,
  Plus,
  Trash2,
  FileText,
  Package
} from 'lucide-react';
import { Cotizacion, Cliente, Vehiculo, Servicio, Repuesto } from '../types';
import { notify } from '../utils/cn';

interface EditarCotizacionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (cotizacion: Cotizacion, detalles?: DetalleCotizacion[]) => void;
  cotizacion: Cotizacion | null;
}

interface DetalleCotizacion {
  tipo: 'servicio' | 'repuesto';
  servicioId?: number;
  repuestoId?: number;
  cantidad: number;
  precio: number;
  subtotal: number;
  descripcion: string;
}

export default function EditarCotizacionModal({ 
  isOpen, 
  onClose, 
  onSave, 
  cotizacion
}: EditarCotizacionModalProps) {
  // Usar el contexto para acceder a los datos
  const { clientes, vehiculos, servicios, repuestos } = useApp();
  const [formData, setFormData] = useState({
    numero: '',
    clienteId: 0,
    vehiculoId: 0,
    fecha: '',
    validaHasta: '',
    estado: 'Pendiente',
    descripcion: '',
    observaciones: '',
    total: 0
  });

  const [detalles, setDetalles] = useState<DetalleCotizacion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function loadDetalles() {
      if (cotizacion && isOpen) {
        setFormData({
          numero: cotizacion.numero || '',
          clienteId: cotizacion.clienteId || 0,
          vehiculoId: cotizacion.vehiculoId || 0,
          fecha: cotizacion.fecha || '',
          validaHasta: cotizacion.validaHasta || '',
          estado: cotizacion.estado || 'Pendiente',
          descripcion: cotizacion.descripcion || '',
          observaciones: cotizacion.observaciones || '',
          total: cotizacion.total || 0
        });

        // Cargar detalles reales desde la base de datos
        try {
          if (cotizacion.id) {
            const detallesReales = await window.electronAPI.getDetallesCotizacion(cotizacion.id);
            setDetalles(Array.isArray(detallesReales) ? detallesReales : []);
          }
        } catch (error) {
          console.error('Error al cargar detalles de cotización:', error);
          // Si hay error, dejar la lista vacía
          setDetalles([]);
        }
      }
    }

    loadDetalles();
  }, [cotizacion, isOpen]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addDetalle = (tipo: 'servicio' | 'repuesto') => {
    const nuevoDetalle: DetalleCotizacion = {
      tipo,
      cantidad: 1,
      precio: 0,
      subtotal: 0,
      descripcion: ''
    };
    setDetalles(prev => [...prev, nuevoDetalle]);
  };

  const updateDetalle = (index: number, field: string, value: any) => {
    setDetalles(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      
      // Recalcular subtotal
      if (field === 'cantidad' || field === 'precio') {
        updated[index].subtotal = updated[index].cantidad * updated[index].precio;
      }
      
      return updated;
    });
  };

  const removeDetalle = (index: number) => {
    setDetalles(prev => prev.filter((_, i) => i !== index));
  };

  const getDetallesList = () => (Array.isArray(detalles) ? detalles : []);

  const calcularTotal = () => {
    return getDetallesList().reduce((sum, detalle) => sum + detalle.subtotal, 0);
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const subtotal = calcularTotal();
      // El dueño del taller decide el total final; usamos el ingresado en el formulario
      const totalFinal = Number(formData.total) || 0;
      // Normalizar estado a valores minúsculas esperados por el esquema de validación
      const estadoMap: Record<string, 'pendiente' | 'aprobada' | 'rechazada' | 'vencida' | 'convertida'> = {
        'pendiente': 'pendiente',
        'Pendiente': 'pendiente',
        'aprobada': 'aprobada',
        'Aprobada': 'aprobada',
        'rechazada': 'rechazada',
        'Rechazada': 'rechazada',
        'vencida': 'vencida',
        'Vencida': 'vencida',
        'convertida': 'convertida',
        'Convertida': 'convertida'
      };
      const estadoNormalizado = estadoMap[formData.estado as string] || 'pendiente';
      
      const cotizacionActualizada: Cotizacion = {
        ...cotizacion!,
        ...formData,
        estado: estadoNormalizado,
        total: totalFinal
      };
      
      // Pasar también los detalles para usar transacción atómica
      await onSave(cotizacionActualizada, detalles);
      onClose();
    } catch (error) {
      console.error('Error guardando cotización:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      notify.error('Error al guardar la cotización', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !cotizacion) return null;

  const vehiculosDelCliente = vehiculos.filter(v => v.clienteId === formData.clienteId);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            Editar Cotización {cotizacion.numero || `COT-${cotizacion.id}`}
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
                    Número de Cotización
                  </label>
                  <input
                    type="text"
                    value={formData.numero}
                    onChange={(e) => handleInputChange('numero', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Número de cotización"
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
                    title="Seleccionar estado de la cotización"
                  >
                    <option value="Pendiente">Pendiente</option>
                    <option value="Aprobada">Aprobada</option>
                    <option value="Rechazada">Rechazada</option>
                    <option value="Vencida">Vencida</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Emisión
                  </label>
                  <input
                    type="date"
                    value={formData.fecha}
                    onChange={(e) => handleInputChange('fecha', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Fecha de emisión"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Válida Hasta
                  </label>
                  <input
                    type="date"
                    value={formData.validaHasta}
                    onChange={(e) => handleInputChange('validaHasta', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Fecha de vencimiento"
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
                    title="Seleccionar vehículo"
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
                <FileText className="h-5 w-5" />
                Descripción de la Cotización
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
                  placeholder="Describe el trabajo a cotizar..."
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
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addDetalle('servicio')}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Servicio
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addDetalle('repuesto')}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Repuesto
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {getDetallesList().map((detalle, index) => (
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
                          title={`Seleccionar ${detalle.tipo}`}
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
                          value={detalle.cantidad === 0 ? '' : detalle.cantidad}
                          onChange={(e) => updateDetalle(index, 'cantidad', e.target.value === '' ? 0 : parseInt(e.target.value))}
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
                          value={detalle.precio === 0 ? '' : detalle.precio}
                          onChange={(e) => updateDetalle(index, 'precio', e.target.value === '' ? 0 : parseInt(e.target.value))}
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
                    value={formData.total === 0 ? '' : formData.total}
                    onChange={(e) => handleInputChange('total', e.target.value === '' ? 0 : parseInt(e.target.value))}
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
