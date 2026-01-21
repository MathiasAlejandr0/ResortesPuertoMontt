import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { useApp } from '../contexts/AppContext';
import { 
  X, 
  Calendar, 
  User, 
  Car, 
  DollarSign, 
  Clock, 
  FileText,
  CheckCircle,
  AlertCircle,
  Package
} from 'lucide-react';
import { Cotizacion, Cliente, Vehiculo, Servicio, Repuesto } from '../types';

interface VerCotizacionModalProps {
  isOpen: boolean;
  onClose: () => void;
  cotizacion: Cotizacion | null;
  cliente: Cliente | null;
  vehiculo: Vehiculo | null;
}

export default function VerCotizacionModal({ 
  isOpen, 
  onClose, 
  cotizacion, 
  cliente, 
  vehiculo
}: VerCotizacionModalProps) {
  // Usar el contexto para acceder a los datos
  const { servicios, repuestos } = useApp();
  const [detallesCotizacion, setDetallesCotizacion] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      if (cotizacion && isOpen) {
        try {
          const detalles = await window.electronAPI.getDetallesCotizacion(cotizacion.id!);
          setDetallesCotizacion(detalles || []);
        } catch (e) {
          console.error('Error cargando detalles de cotización', e);
          setDetallesCotizacion([]);
        }
      }
    };
    load();
  }, [cotizacion, isOpen]);

  if (!isOpen || !cotizacion) return null;

  const getEstadoColor = (estado: string) => {
    switch (estado.toLowerCase()) {
      case 'aprobada':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'vencida':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const isVencida = (fechaVencimiento: string) => {
    return new Date(fechaVencimiento) < new Date();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            Cotización {cotizacion.numero || `COT-${cotizacion.id}`}
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
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Fecha de Emisión</p>
                    <p className="font-medium">{cotizacion.fecha ? new Date(cotizacion.fecha).toLocaleDateString('es-CL') : 'No especificada'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Válida Hasta</p>
                    <p className="font-medium">{cotizacion.validaHasta ? new Date(cotizacion.validaHasta).toLocaleDateString('es-CL') : 'No especificada'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Estado</p>
                    <Badge className={getEstadoColor(cotizacion.estado)}>
                      {cotizacion.estado}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {cotizacion.validaHasta && isVencida(cotizacion.validaHasta) ? (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                  <div>
                    <p className="text-sm text-gray-500">Validez</p>
                    <p className={`font-medium ${cotizacion.validaHasta && isVencida(cotizacion.validaHasta) ? 'text-red-600' : 'text-green-600'}`}>
                      {cotizacion.validaHasta && isVencida(cotizacion.validaHasta) ? 'Vencida' : 'Vigente'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Información del Cliente */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Información del Cliente
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cliente ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Nombre</p>
                    <p className="font-medium">{cliente.nombre}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">RUT</p>
                    <p className="font-medium">{cliente.rut}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Teléfono</p>
                    <p className="font-medium">{cliente.telefono}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{cliente.email}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-500">Dirección</p>
                    <p className="font-medium">{cliente.direccion}</p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">Cliente no encontrado</p>
              )}
            </CardContent>
          </Card>

          {/* Información del Vehículo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                Información del Vehículo
              </CardTitle>
            </CardHeader>
            <CardContent>
              {vehiculo ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Marca</p>
                    <p className="font-medium">{vehiculo.marca}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Modelo</p>
                    <p className="font-medium">{vehiculo.modelo}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Año</p>
                    <p className="font-medium">{vehiculo.año}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Patente</p>
                    <p className="font-medium">{vehiculo.patente}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Color</p>
                    <p className="font-medium">{vehiculo.color}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Kilometraje</p>
                    <p className="font-medium">{vehiculo.kilometraje?.toLocaleString()} km</p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">Vehículo no encontrado</p>
              )}
            </CardContent>
          </Card>

          {/* Descripción de la Cotización */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Descripción de la Cotización
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Descripción</p>
                  <p className="font-medium">{cotizacion.descripcion}</p>
                </div>
                {cotizacion.observaciones && (
                  <div>
                    <p className="text-sm text-gray-500">Observaciones</p>
                    <p className="font-medium">{cotizacion.observaciones}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Servicios y Repuestos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Servicios y Repuestos Cotizados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {detallesCotizacion.length === 0 && (
                  <p className="text-sm text-gray-500">No hay ítems asociados a esta cotización.</p>
                )}
                {detallesCotizacion.map((detalle, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${detalle.tipo === 'servicio' ? 'bg-red-500' : 'bg-green-500'}`}></div>
                      <div>
                        <p className="font-medium">{detalle.nombre}</p>
                        <p className="text-sm text-gray-500">
                          {detalle.tipo === 'servicio' ? 'Servicio' : 'Repuesto'} • Cantidad: {detalle.cantidad}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${detalle.precio.toLocaleString()}</p>
                      <p className="text-sm text-gray-500">Subtotal: ${detalle.subtotal.toLocaleString()}</p>
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
                <div className="border-b pb-3">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span>${(cotizacion.total || 0).toLocaleString()}</span>
                  </div>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">IVA (19% sobre el total - referencia):</span>
                    <span className="font-medium text-gray-700">${Math.round((cotizacion.total || 0) * 0.19).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
}
