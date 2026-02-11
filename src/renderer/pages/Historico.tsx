import { useMemo, useState, useEffect } from 'react';
import { Search, Car, Calendar, Wrench, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { useApp } from '../contexts/AppContext';
import { Vehiculo, OrdenTrabajo, Cliente } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { notify, Logger } from '../utils/cn';

interface OrdenConDetalles extends OrdenTrabajo {
  cliente?: Cliente;
  detalles?: any[];
}

export default function HistoricoPage() {
  const { vehiculos, ordenes, clientes } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVehiculo, setSelectedVehiculo] = useState<Vehiculo | null>(null);
  const [ordenesVehiculo, setOrdenesVehiculo] = useState<OrdenConDetalles[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const vehiculosFiltrados = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return [];
    return vehiculos.filter((vehiculo) => {
      return (
        vehiculo.patente?.toLowerCase().includes(term) ||
        vehiculo.marca?.toLowerCase().includes(term) ||
        vehiculo.modelo?.toLowerCase().includes(term)
      );
    }).slice(0, 8);
  }, [vehiculos, searchTerm]);

  const clientesById = useMemo(() => {
    const map = new Map<number, Cliente>();
    clientes.forEach(c => { if (c.id) map.set(c.id, c); });
    return map;
  }, [clientes]);

  useEffect(() => {
    if (selectedVehiculo?.id) {
      cargarHistorialVehiculo();
    } else {
      setOrdenesVehiculo([]);
    }
  }, [selectedVehiculo, ordenes]);

  const cargarHistorialVehiculo = async () => {
    if (!selectedVehiculo?.id) return;

    setIsLoading(true);
    try {
      // Filtrar órdenes del vehículo seleccionado
      const ordenesDelVehiculo = ordenes.filter(o => o.vehiculoId === selectedVehiculo.id);

      // Obtener detalles de cada orden
      const ordenesConDetalles = await Promise.all(
        ordenesDelVehiculo.map(async (orden) => {
          const cliente = orden.clienteId ? clientesById.get(orden.clienteId) : undefined;
          
          let detalles: any[] = [];
          try {
            if (orden.id && window.electronAPI) {
              detalles = await window.electronAPI.getDetallesOrden(orden.id) || [];
            }
          } catch (error) {
            Logger.error('Error cargando detalles de orden:', error);
          }

          return {
            ...orden,
            cliente,
            detalles
          } as OrdenConDetalles;
        })
      );

      // Ordenar por fecha de ingreso (más recientes primero)
      ordenesConDetalles.sort((a, b) => {
        const fechaA = new Date(a.fechaIngreso).getTime();
        const fechaB = new Date(b.fechaIngreso).getTime();
        return fechaB - fechaA;
      });

      setOrdenesVehiculo(ordenesConDetalles);
    } catch (error: any) {
      Logger.error('Error cargando historial:', error);
      notify.error('Error', 'No se pudo cargar el historial del vehículo');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectVehiculo = (vehiculo: Vehiculo) => {
    setSelectedVehiculo(vehiculo);
    setSearchTerm('');
  };

  const getEstadoBadge = (estado: string) => {
    const estados: Record<string, string> = {
      'Pendiente': 'bg-yellow-500',
      'En Proceso': 'bg-blue-500',
      'En Progreso': 'bg-blue-500',
      'Completada': 'bg-green-500',
      'Pagada': 'bg-green-600',
      'Cancelada': 'bg-red-500',
    };
    return estados[estado] || 'bg-gray-500';
  };

  const calcularTotalServicios = (detalles: any[]) => {
    return detalles
      .filter(d => d.tipo === 'servicio')
      .reduce((sum, d) => sum + (d.subtotal || 0), 0);
  };

  const calcularTotalRepuestos = (detalles: any[]) => {
    return detalles
      .filter(d => d.tipo === 'repuesto')
      .reduce((sum, d) => sum + (d.subtotal || 0), 0);
  };

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8 bg-background text-foreground">
      <div>
        <h1 className="text-3xl font-bold">Historial de Vehículos</h1>
        <p className="text-muted-foreground mt-1">
          Consulta el historial completo de servicios y reparaciones de un vehículo
        </p>
      </div>

      <div className="relative flex items-center gap-2">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar Vehículo por patente, marca o modelo..."
          className="flex-1 h-10 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
        />
        <button
          onClick={() => {
            if (vehiculosFiltrados.length > 0) {
              handleSelectVehiculo(vehiculosFiltrados[0]);
            }
          }}
          className="h-10 w-10 rounded-md bg-red-600 text-white flex items-center justify-center hover:bg-red-700 transition-colors"
        >
          <Search className="h-4 w-4" />
        </button>
        {vehiculosFiltrados.length > 0 && searchTerm && (
          <div className="absolute top-12 left-0 right-12 z-10 rounded-md border border-gray-200 bg-white shadow-md max-h-60 overflow-y-auto">
            {vehiculosFiltrados.map((vehiculo) => (
              <button
                key={vehiculo.id}
                onClick={() => handleSelectVehiculo(vehiculo)}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                {vehiculo.patente} - {vehiculo.marca} {vehiculo.modelo}
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedVehiculo && (
        <>
          <Card className="border border-border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                Información del Vehículo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex items-center justify-center md:w-40">
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                    <Car className="h-8 w-8 text-gray-500" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2 text-sm text-gray-700 flex-1">
                  <div>
                    <span className="font-medium">Patente:</span>{' '}
                    <span className="text-gray-600">{selectedVehiculo.patente || '-'}</span>
                  </div>
                  <div>
                    <span className="font-medium">Tipo:</span>{' '}
                    <span className="text-gray-600">
                      {selectedVehiculo.marca} {selectedVehiculo.modelo}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Año:</span>{' '}
                    <span className="text-gray-600">{selectedVehiculo.año || '-'}</span>
                  </div>
                  <div>
                    <span className="font-medium">N° Chasis:</span>{' '}
                    <span className="text-gray-600">{selectedVehiculo.numeroChasis || '-'}</span>
                  </div>
                  <div>
                    <span className="font-medium">Color:</span>{' '}
                    <span className="text-gray-600">{selectedVehiculo.color || '-'}</span>
                  </div>
                  <div>
                    <span className="font-medium">Cliente:</span>{' '}
                    <span className="text-gray-600">
                      {selectedVehiculo.clienteId ? clientesById.get(selectedVehiculo.clienteId)?.nombre || '-' : '-'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Historial de Órdenes de Trabajo
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Cargando historial...</div>
              ) : ordenesVehiculo.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No hay órdenes de trabajo registradas para este vehículo
                </div>
              ) : (
                <div className="space-y-4">
                  {ordenesVehiculo.map((orden) => (
                    <div
                      key={orden.id}
                      className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-bold text-lg">{orden.numero}</span>
                            <Badge className={`${getEstadoBadge(orden.estado)} text-white`}>
                              {orden.estado}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <span>
                                Ingreso: {format(new Date(orden.fechaIngreso), 'dd/MM/yyyy', { locale: es })}
                              </span>
                              {orden.fechaEntrega && (
                                <>
                                  <span className="mx-2">•</span>
                                  <span>
                                    Entrega: {format(new Date(orden.fechaEntrega), 'dd/MM/yyyy', { locale: es })}
                                  </span>
                                </>
                              )}
                            </div>
                            {orden.cliente && (
                              <div>
                                Cliente: {orden.cliente.nombre} {orden.cliente.rut ? `(${orden.cliente.rut})` : ''}
                              </div>
                            )}
                            {orden.tecnicoAsignado && (
                              <div>
                                Técnico: {orden.tecnicoAsignado}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold">
                            ${(orden.total || 0).toLocaleString('es-CL')}
                          </div>
                        </div>
                      </div>

                      {orden.descripcion && (
                        <div className="mb-3 text-sm text-gray-700">
                          <span className="font-medium">Descripción:</span> {orden.descripcion}
                        </div>
                      )}

                      {orden.detalles && orden.detalles.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-border">
                          <div className="text-sm font-medium mb-2">Detalles:</div>
                          <div className="space-y-1 text-sm">
                            {orden.detalles.map((detalle, idx) => (
                              <div key={idx} className="flex justify-between text-gray-700">
                                <span>
                                  {detalle.cantidad}x {detalle.descripcion}
                                  {detalle.tipo && (
                                    <Badge variant="outline" className="ml-2 text-xs">
                                      {detalle.tipo}
                                    </Badge>
                                  )}
                                </span>
                                <span className="font-medium">
                                  ${(detalle.subtotal || 0).toLocaleString('es-CL')}
                                </span>
                              </div>
                            ))}
                            <div className="flex justify-between font-semibold pt-2 border-t border-border mt-2">
                              <div className="flex gap-4">
                                <span>
                                  Servicios: ${calcularTotalServicios(orden.detalles).toLocaleString('es-CL')}
                                </span>
                                <span>
                                  Repuestos: ${calcularTotalRepuestos(orden.detalles).toLocaleString('es-CL')}
                                </span>
                              </div>
                              <span>
                                Total: ${orden.total.toLocaleString('es-CL')}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {orden.observaciones && (
                        <div className="mt-3 pt-3 border-t border-border text-sm text-gray-600">
                          <span className="font-medium">Observaciones:</span> {orden.observaciones}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {!selectedVehiculo && (
        <Card className="border border-border shadow-sm">
          <CardContent className="p-8 text-center">
            <Car className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-muted-foreground">
              Busca un vehículo para ver su historial completo
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
