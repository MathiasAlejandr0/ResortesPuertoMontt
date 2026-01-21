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
  Wrench, 
  DollarSign, 
  Clock, 
  MapPin,
  Package,
  FileText,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { OrdenTrabajo, Cliente, Vehiculo, Servicio, Repuesto } from '../types';
import { Logger } from '../utils/cn';

interface VerOrdenModalProps {
  isOpen: boolean;
  onClose: () => void;
  orden: OrdenTrabajo | null;
  cliente: Cliente | null;
  vehiculo: Vehiculo | null;
}

export default function VerOrdenModal({ 
  isOpen, 
  onClose, 
  orden, 
  cliente, 
  vehiculo
}: VerOrdenModalProps) {
  // Usar el contexto para acceder a los datos
  const { servicios, repuestos } = useApp();
  const [detallesOrden, setDetallesOrden] = useState<any[]>([]);
  const [isLoadingDetalles, setIsLoadingDetalles] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (orden && isOpen && orden.id) {
        setIsLoadingDetalles(true);
        try {
          Logger.debug('🔍 VerOrdenModal: Cargando detalles para orden ID:', orden.id, 'Número:', orden.numero);
          // Asegurarse de que el ID sea un número
          const ordenId = typeof orden.id === 'number' ? orden.id : Number(orden.id);
          if (isNaN(ordenId)) {
            Logger.error('❌ VerOrdenModal: ID de orden inválido:', orden.id);
            setDetallesOrden([]);
            setIsLoadingDetalles(false);
            return;
          }
          const detalles = await window.electronAPI.getDetallesOrden(ordenId);
          Logger.debug('✅ VerOrdenModal: Detalles cargados:', detalles?.length || 0, detalles);
          if (Array.isArray(detalles)) {
            setDetallesOrden(detalles);
            Logger.debug('📋 VerOrdenModal: Detalles establecidos:', detalles.length);
            if (detalles.length === 0) {
              Logger.warn('⚠️ VerOrdenModal: No se encontraron detalles para la orden ID:', ordenId);
            }
          } else {
            Logger.warn('⚠️ VerOrdenModal: Detalles no es un array:', detalles);
            setDetallesOrden([]);
          }
        } catch (e) {
          Logger.error('❌ VerOrdenModal: Error cargando detalles de orden', e);
          setDetallesOrden([]);
        } finally {
          setIsLoadingDetalles(false);
        }
      } else if (orden && isOpen && !orden.id) {
        Logger.warn('⚠️ VerOrdenModal: Orden sin ID, no se pueden cargar detalles');
        setDetallesOrden([]);
        setIsLoadingDetalles(false);
      } else {
        // Resetear cuando se cierra
        setDetallesOrden([]);
        setIsLoadingDetalles(false);
      }
    };
    load();
  }, [orden?.id, isOpen]);

  if (!isOpen || !orden) return null;

  const getEstadoColor = (estado: string) => {
    switch (estado.toLowerCase()) {
      case 'completada':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'en_proceso':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPrioridadColor = (prioridad: string) => {
    switch (prioridad.toLowerCase()) {
      case 'alta':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'media':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'baja':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            Orden de Trabajo {orden.numero || `OT-${orden.id}`}
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
                    <p className="text-sm text-gray-500">Fecha de Ingreso</p>
                    <p className="font-medium">{orden.fechaIngreso ? new Date(orden.fechaIngreso).toLocaleDateString('es-CL') : 'No especificada'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Fecha de Entrega</p>
                    <p className="font-medium">{orden.fechaEntrega ? new Date(orden.fechaEntrega).toLocaleDateString('es-CL') : 'Pendiente'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Estado</p>
                    <Badge className={getEstadoColor(orden.estado)}>
                      {orden.estado}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Prioridad</p>
                    <Badge className={getPrioridadColor(orden.prioridad || 'media')}>
                      {orden.prioridad || 'Media'}
                    </Badge>
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

          {/* Detalles de Trabajo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Detalles del Trabajo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Descripción</p>
                  <p className="font-medium">{orden.descripcion}</p>
                </div>
                {orden.observaciones && (
                  <div>
                    <p className="text-sm text-gray-500">Observaciones</p>
                    <p className="font-medium">{orden.observaciones}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">Técnico Asignado</p>
                  <p className="font-medium">{orden.tecnicoAsignado || 'No asignado'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Servicios y Repuestos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Servicios y Repuestos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {isLoadingDetalles ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-red-500 border-t-transparent mx-auto mb-2"></div>
                    <p className="text-gray-500">Cargando detalles...</p>
                  </div>
                ) : detallesOrden.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No hay servicios o repuestos agregados</p>
                ) : (
                  detallesOrden.map((detalle, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${detalle.tipo === 'servicio' ? 'bg-red-500' : 'bg-green-500'}`}></div>
                        <div>
                          <p className="font-medium">{detalle.descripcion || 'Sin descripción'}</p>
                          <p className="text-sm text-gray-500">
                            {detalle.tipo === 'servicio' ? 'Servicio' : 'Repuesto'} • Cantidad: {detalle.cantidad || 1}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">${(detalle.precio || 0).toLocaleString()}</p>
                        <p className="text-sm text-gray-500">Subtotal: ${(detalle.subtotal || 0).toLocaleString()}</p>
                      </div>
                    </div>
                  ))
                )}
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
                    <span>${(orden.total || 0).toLocaleString()}</span>
                  </div>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">IVA (19% sobre el total - referencia):</span>
                    <span className="font-medium text-gray-700">${Math.round((orden.total || 0) * 0.19).toLocaleString()}</span>
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
