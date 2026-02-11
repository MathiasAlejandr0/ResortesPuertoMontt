import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { useApp } from '../contexts/AppContext';
import { notify, Logger } from '../utils/cn';
import { FileText, Search, Printer, Car } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Vehiculo, OrdenTrabajo, Cliente } from '../types';

interface OrdenConDetalles extends OrdenTrabajo {
  cliente?: Cliente;
  detalles?: any[];
}

export default function InformesVehiculoDetalladoPage() {
  const { vehiculos, ordenes, clientes } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVehiculo, setSelectedVehiculo] = useState<Vehiculo | null>(null);
  const [fechaDesde, setFechaDesde] = useState('');
  const [ordenesVehiculo, setOrdenesVehiculo] = useState<OrdenConDetalles[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [imprimir, setImprimir] = useState(false);

  const clientesById = useMemo(() => {
    const map = new Map<number, Cliente>();
    clientes.forEach(c => { if (c.id) map.set(c.id, c); });
    return map;
  }, [clientes]);

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

  useEffect(() => {
    if (selectedVehiculo?.id) {
      cargarOrdenesVehiculo();
    } else {
      setOrdenesVehiculo([]);
    }
  }, [selectedVehiculo, ordenes, fechaDesde]);

  const cargarOrdenesVehiculo = async () => {
    if (!selectedVehiculo?.id) return;

    setIsLoading(true);
    try {
      // Filtrar órdenes del vehículo
      let ordenesFiltradas = ordenes.filter(o => o.vehiculoId === selectedVehiculo.id);

      // Filtrar por fecha si está especificada
      if (fechaDesde) {
        const fechaDesdeDate = new Date(fechaDesde);
        ordenesFiltradas = ordenesFiltradas.filter(o => {
          if (!o.fechaIngreso) return false;
          return new Date(o.fechaIngreso) >= fechaDesdeDate;
        });
      }

      // Obtener detalles de cada orden
      const ordenesConDetalles = await Promise.all(
        ordenesFiltradas.map(async (orden) => {
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
      Logger.error('Error cargando órdenes:', error);
      notify.error('Error', 'No se pudieron cargar las órdenes del vehículo');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectVehiculo = (vehiculo: Vehiculo) => {
    setSelectedVehiculo(vehiculo);
    setSearchTerm('');
  };

  const handleGenerarInforme = () => {
    if (!selectedVehiculo) {
      notify.error('Error', 'Debe seleccionar un vehículo');
      return;
    }
    cargarOrdenesVehiculo();
  };

  const handleImprimir = () => {
    setImprimir(true);
    setTimeout(() => {
      window.print();
      setImprimir(false);
    }, 100);
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

  const estadisticas = useMemo(() => {
    const totalOrdenes = ordenesVehiculo.length;
    const totalMonto = ordenesVehiculo.reduce((sum, o) => sum + (o.total || 0), 0);
    const ordenesCompletadas = ordenesVehiculo.filter(o => o.estado === 'Completada' || o.estado === 'Pagada').length;
    const totalServicios = ordenesVehiculo.reduce((sum, o) => {
      const servicios = o.detalles?.filter(d => d.tipo === 'servicio') || [];
      return sum + servicios.reduce((s, d) => s + (d.subtotal || 0), 0);
    }, 0);
    const totalRepuestos = ordenesVehiculo.reduce((sum, o) => {
      const repuestos = o.detalles?.filter(d => d.tipo === 'repuesto') || [];
      return sum + repuestos.reduce((s, d) => s + (d.subtotal || 0), 0);
    }, 0);

    return {
      totalOrdenes,
      totalMonto,
      ordenesCompletadas,
      totalServicios,
      totalRepuestos,
    };
  }, [ordenesVehiculo]);

  const formatearMonto = (monto: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(monto);
  };

  return (
    <div className={`flex flex-col gap-6 p-6 lg:p-8 bg-background text-foreground ${imprimir ? 'print:p-4' : ''}`}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="w-8 h-8" />
            Informe Detallado de Vehículo
          </h1>
          <p className="text-muted-foreground mt-1">
            Genera informes detallados de servicios y reparaciones por vehículo
          </p>
        </div>
      </div>

      <Card className="border border-border bg-white text-gray-900 shadow-sm">
        <CardHeader>
          <CardTitle>Parámetros del Informe</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-4 items-center">
            <div className="text-sm text-gray-700 font-medium">Periodo:</div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-4 items-center">
            <div className="text-sm text-gray-700 font-medium">Patente:</div>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar Vehículo por patente, marca o modelo..."
                className="h-9 w-full max-w-xs px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              {vehiculosFiltrados.length > 0 && searchTerm && (
                <div className="absolute top-12 left-0 right-0 z-10 rounded-md border border-gray-200 bg-white shadow-md max-h-60 overflow-y-auto">
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
          </div>

          {selectedVehiculo && (
            <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
              <p className="text-sm font-medium text-blue-900">
                Vehículo seleccionado: <span className="font-bold">{selectedVehiculo.patente}</span>
                <span className="ml-2">- {selectedVehiculo.marca} {selectedVehiculo.modelo}</span>
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-4 items-center">
            <div className="text-sm text-gray-700 font-medium">Tipo Informe:</div>
            <select className="h-9 max-w-[200px] px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
              <option>Órdenes</option>
            </select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-4 items-center">
            <div className="text-sm text-gray-700 font-medium">Imprimir:</div>
            <input
              type="checkbox"
              checked={imprimir}
              onChange={(e) => setImprimir(e.target.checked)}
              className="h-4 w-4 accent-red-600"
            />
          </div>

          <div className="flex gap-3">
            <Button onClick={handleGenerarInforme} disabled={!selectedVehiculo || isLoading}>
              <FileText className="h-4 w-4 mr-2" />
              Generar Informe
            </Button>
            {selectedVehiculo && ordenesVehiculo.length > 0 && (
              <Button variant="outline" onClick={handleImprimir}>
                <Printer className="h-4 w-4 mr-2" />
                Imprimir
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedVehiculo && ordenesVehiculo.length > 0 && (
        <Card className="border border-border shadow-sm print:shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              Informe Detallado
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Información del Vehículo */}
            <div className="mb-6 p-4 bg-gray-50 rounded-md border border-gray-200">
              <h2 className="text-xl font-bold mb-3">Información del Vehículo</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium">Patente:</span> {selectedVehiculo.patente}
                </div>
                <div>
                  <span className="font-medium">Marca:</span> {selectedVehiculo.marca}
                </div>
                <div>
                  <span className="font-medium">Modelo:</span> {selectedVehiculo.modelo}
                </div>
                <div>
                  <span className="font-medium">Año:</span> {selectedVehiculo.año || '-'}
                </div>
                <div>
                  <span className="font-medium">Color:</span> {selectedVehiculo.color || '-'}
                </div>
                <div>
                  <span className="font-medium">N° Chasis:</span> {selectedVehiculo.numeroChasis || '-'}
                </div>
                {selectedVehiculo.clienteId && clientesById.get(selectedVehiculo.clienteId) && (
                  <div className="col-span-2">
                    <span className="font-medium">Cliente:</span>{' '}
                    {clientesById.get(selectedVehiculo.clienteId)?.nombre}
                  </div>
                )}
              </div>
            </div>

            {/* Estadísticas */}
            <div className="mb-6 grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
                <p className="text-xs text-gray-600">Total Órdenes</p>
                <p className="text-xl font-bold">{estadisticas.totalOrdenes}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-md border border-green-200">
                <p className="text-xs text-gray-600">Completadas</p>
                <p className="text-xl font-bold">{estadisticas.ordenesCompletadas}</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-md border border-purple-200">
                <p className="text-xs text-gray-600">Total Servicios</p>
                <p className="text-lg font-bold">{formatearMonto(estadisticas.totalServicios)}</p>
              </div>
              <div className="p-3 bg-orange-50 rounded-md border border-orange-200">
                <p className="text-xs text-gray-600">Total Repuestos</p>
                <p className="text-lg font-bold">{formatearMonto(estadisticas.totalRepuestos)}</p>
              </div>
              <div className="p-3 bg-red-50 rounded-md border border-red-200">
                <p className="text-xs text-gray-600">Total General</p>
                <p className="text-lg font-bold">{formatearMonto(estadisticas.totalMonto)}</p>
              </div>
            </div>

            {/* Detalle de Órdenes */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Historial de Órdenes de Trabajo</h2>
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
                        <div>
                          Ingreso: {format(new Date(orden.fechaIngreso), 'dd/MM/yyyy', { locale: es })}
                          {orden.fechaEntrega && (
                            <> • Entrega: {format(new Date(orden.fechaEntrega), 'dd/MM/yyyy', { locale: es })}</>
                          )}
                        </div>
                        {orden.cliente && (
                          <div>Cliente: {orden.cliente.nombre}</div>
                        )}
                        {orden.tecnicoAsignado && (
                          <div>Técnico: {orden.tecnicoAsignado}</div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">
                        {formatearMonto(orden.total || 0)}
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
                              {formatearMonto(detalle.subtotal || 0)}
                            </span>
                          </div>
                        ))}
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
          </CardContent>
        </Card>
      )}

      {selectedVehiculo && ordenesVehiculo.length === 0 && !isLoading && (
        <Card className="border border-border shadow-sm">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">
              No hay órdenes registradas para este vehículo en el período seleccionado
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
