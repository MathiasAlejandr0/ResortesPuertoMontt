import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { useApp } from '../contexts/AppContext';
import { notify, Logger, confirmAction } from '../utils/cn';
import { 
  DollarSign, 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Search,
  X,
  CreditCard,
  RefreshCw
} from 'lucide-react';
import { CuotaPago, OrdenTrabajo, Cliente, Vehiculo } from '../types';

interface CuotaConOrden extends CuotaPago {
  orden?: OrdenTrabajo;
  cliente?: Cliente;
  vehiculo?: Vehiculo;
}

export default function PagosPage() {
  const { ordenes, clientes, vehiculos, refreshOrdenes } = useApp();
  const [cuotas, setCuotas] = useState<CuotaPago[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState<'todos' | 'Pendiente' | 'Pagada' | 'Vencida'>('todos');
  const [tabActiva, setTabActiva] = useState<'disponibles' | 'completados'>('disponibles');
  const [cuotaSeleccionada, setCuotaSeleccionada] = useState<CuotaPago | null>(null);
  const [isModalPagoOpen, setIsModalPagoOpen] = useState(false);
  const [montoPago, setMontoPago] = useState<number>(0);
  const [fechaPago, setFechaPago] = useState<string>(new Date().toISOString().split('T')[0]);
  const [observacionesPago, setObservacionesPago] = useState<string>('');

  // Índices para lookup rápido
  const ordenesById = useMemo(() => {
    const map = new Map<number, OrdenTrabajo>();
    ordenes.forEach(o => { if (o.id) map.set(o.id, o); });
    return map;
  }, [ordenes]);

  const clientesById = useMemo(() => {
    const map = new Map<number, Cliente>();
    clientes.forEach(c => { if (c.id) map.set(c.id, c); });
    return map;
  }, [clientes]);

  const vehiculosById = useMemo(() => {
    const map = new Map<number, Vehiculo>();
    vehiculos.forEach(v => { if (v.id) map.set(v.id, v); });
    return map;
  }, [vehiculos]);

  // Cargar cuotas
  useEffect(() => {
    loadCuotas();
    // Actualizar estados de cuotas vencidas al cargar
    window.electronAPI?.actualizarEstadosCuotasVencidas();
  }, []);

  const loadCuotas = async () => {
    setIsLoading(true);
    try {
      const cuotasData = await window.electronAPI.getAllCuotasPago();
      const cuotasArray = Array.isArray(cuotasData) ? cuotasData : [];
      Logger.debug('📋 Pagos: Cuotas cargadas:', cuotasArray.length);
      if (cuotasArray.length > 0 && Logger.debug) {
        // Agrupar por ordenId para verificar (solo en desarrollo)
        const porOrden = new Map<number, typeof cuotasArray>();
        cuotasArray.forEach(cuota => {
          const ordenId = cuota.ordenId;
          if (!porOrden.has(ordenId)) {
            porOrden.set(ordenId, []);
          }
          porOrden.get(ordenId)!.push(cuota);
        });
        porOrden.forEach((cuotas, ordenId) => {
          Logger.debug(`  Orden ${ordenId}: ${cuotas.length} cuotas - números: ${cuotas.map(c => c.numeroCuota).join(', ')}`);
        });
      }
      setCuotas(cuotasArray);
    } catch (error) {
      Logger.error('Error cargando cuotas:', error);
      notify.error('Error', 'No se pudieron cargar las cuotas de pago');
    } finally {
      setIsLoading(false);
    }
  };

  // Combinar cuotas con información de órdenes
  const cuotasConInfo = useMemo(() => {
    const resultado = cuotas.map(cuota => {
      const orden = cuota.ordenId ? ordenesById.get(cuota.ordenId) : undefined;
      const cliente = orden?.clienteId ? clientesById.get(orden.clienteId) : undefined;
      const vehiculo = orden?.vehiculoId ? vehiculosById.get(orden.vehiculoId) : undefined;
      
      return {
        ...cuota,
        orden,
        cliente,
        vehiculo
      } as CuotaConOrden;
    });
    
    // Log para debugging (solo en desarrollo)
    if (cuotas.length > 0) {
      Logger.debug('📋 Pagos: Cuotas con info combinada:', {
        totalCuotas: cuotas.length,
        cuotasConInfo: resultado.length,
        porOrden: resultado.reduce((acc, c) => {
          const ordenId = c.ordenId;
          if (!acc[ordenId]) acc[ordenId] = [];
          acc[ordenId].push(c.numeroCuota);
          return acc;
        }, {} as Record<number, number[]>)
      });
    }
    
    return resultado;
  }, [cuotas, ordenesById, clientesById, vehiculosById]);

  // Filtrar cuotas según la pestaña activa
  const cuotasFiltradas = useMemo(() => {
    let filtered = cuotasConInfo;

    // Filtrar por pestaña activa
    if (tabActiva === 'disponibles') {
      // Mostrar solo pendientes y vencidas
      filtered = filtered.filter(cuota => 
        cuota.estado === 'Pendiente' || cuota.estado === 'Vencida'
      );
    } else if (tabActiva === 'completados') {
      // Mostrar solo pagadas
      filtered = filtered.filter(cuota => cuota.estado === 'Pagada');
    }

    // Filtrar por búsqueda
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(cuota => 
        cuota.orden?.numero?.toLowerCase().includes(searchLower) ||
        cuota.cliente?.nombre?.toLowerCase().includes(searchLower) ||
        cuota.vehiculo?.marca?.toLowerCase().includes(searchLower) ||
        cuota.vehiculo?.modelo?.toLowerCase().includes(searchLower)
      );
    }

    // Filtrar por estado (solo si no está en modo pestaña)
    if (filterEstado !== 'todos' && tabActiva === 'disponibles') {
      // En disponibles, permitir filtrar entre Pendiente y Vencida
      if (filterEstado === 'Pendiente' || filterEstado === 'Vencida') {
        filtered = filtered.filter(cuota => cuota.estado === filterEstado);
      }
    }

    // Ordenar por número de cuota para asegurar que se muestren todas
    const sorted = filtered.sort((a, b) => {
      if (a.ordenId !== b.ordenId) {
        return a.ordenId - b.ordenId;
      }
      return a.numeroCuota - b.numeroCuota;
    });
    
    // Log para debugging (solo en desarrollo)
    if (sorted.length > 0) {
      Logger.debug('📋 Pagos: Cuotas filtradas y ordenadas:', {
        tabActiva,
        totalFiltradas: sorted.length,
        porOrden: sorted.reduce((acc, c) => {
          const ordenId = c.ordenId;
          if (!acc[ordenId]) acc[ordenId] = [];
          acc[ordenId].push({ numero: c.numeroCuota, id: c.id });
          return acc;
        }, {} as Record<number, Array<{ numero: number; id?: number }>>)
      });
    }
    
    return sorted;
  }, [cuotasConInfo, searchTerm, filterEstado, tabActiva]);

  // Calcular estadísticas
  const estadisticas = useMemo(() => {
    const pendientes = cuotas.filter(c => c.estado === 'Pendiente').length;
    const vencidas = cuotas.filter(c => c.estado === 'Vencida').length;
    const pagadas = cuotas.filter(c => c.estado === 'Pagada').length;
    const totalPendiente = cuotas
      .filter(c => c.estado === 'Pendiente' || c.estado === 'Vencida')
      .reduce((sum, c) => sum + (c.monto - (c.montoPagado || 0)), 0);
    const totalPagado = cuotas
      .filter(c => c.estado === 'Pagada')
      .reduce((sum, c) => sum + (c.montoPagado || c.monto), 0);

    return { pendientes, vencidas, pagadas, totalPendiente, totalPagado };
  }, [cuotas]);

  // Obtener alertas de cuotas
  const alertas = useMemo(() => {
    const hoy = new Date();
    const dosDiasDespues = new Date(hoy);
    dosDiasDespues.setDate(hoy.getDate() + 2);
    const hoyStr = hoy.toISOString().split('T')[0];
    const dosDiasStr = dosDiasDespues.toISOString().split('T')[0];

    const alertasList: Array<{ cuota: CuotaConOrden; tipo: 'proxima' | 'vencida' | 'vencida_repetida'; dias: number }> = [];

    cuotasConInfo.forEach(cuota => {
      if (cuota.estado === 'Pendiente' || cuota.estado === 'Vencida') {
        const fechaVenc = new Date(cuota.fechaVencimiento);
        const diffDias = Math.floor((fechaVenc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

        // Alerta 2 días antes
        if (diffDias === 2) {
          alertasList.push({ cuota, tipo: 'proxima', dias: 2 });
        }
        // Alerta el día de pago
        else if (diffDias === 0) {
          alertasList.push({ cuota, tipo: 'proxima', dias: 0 });
        }
        // Alerta vencida (cada 3 días después de vencimiento)
        else if (diffDias < 0 && Math.abs(diffDias) % 3 === 0) {
          alertasList.push({ cuota, tipo: 'vencida_repetida', dias: Math.abs(diffDias) });
        }
        // Alerta vencida (primera vez)
        else if (diffDias === -1) {
          alertasList.push({ cuota, tipo: 'vencida', dias: 1 });
        }
      }
    });

    return alertasList;
  }, [cuotasConInfo]);

  const handleConfirmarPago = async () => {
    if (!cuotaSeleccionada) return;

    if (montoPago <= 0) {
      notify.error('Error', 'El monto debe ser mayor a 0');
      return;
    }

    const montoRestante = cuotaSeleccionada.monto - (cuotaSeleccionada.montoPagado || 0);
    if (montoPago > montoRestante) {
      notify.error('Error', `El monto no puede ser mayor al restante ($${montoRestante.toLocaleString()})`);
      return;
    }

    setIsLoading(true);
    try {
      const resp = await window.electronAPI.confirmarPagoCuota({
        cuotaId: cuotaSeleccionada.id!,
        montoPagado: montoPago,
        fechaPago,
        observaciones: observacionesPago || undefined
      });

      if (resp?.success) {
        notify.success('Pago confirmado', 'El pago se ha registrado correctamente');
        await loadCuotas();
        await refreshOrdenes(); // Refrescar órdenes para actualizar KPIs
        setIsModalPagoOpen(false);
        setCuotaSeleccionada(null);
        setMontoPago(0);
        setFechaPago(new Date().toISOString().split('T')[0]);
        setObservacionesPago('');
      } else {
        throw new Error(resp?.error || 'Error al confirmar el pago');
      }
    } catch (error) {
      Logger.error('Error confirmando pago:', error);
      notify.error('Error', error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAbrirModalPago = (cuota: CuotaPago) => {
    const montoRestante = cuota.monto - (cuota.montoPagado || 0);
    setCuotaSeleccionada(cuota);
    setMontoPago(montoRestante);
    setFechaPago(new Date().toISOString().split('T')[0]);
    setObservacionesPago('');
    setIsModalPagoOpen(true);
  };

  const getEstadoBadge = (estado: string, fechaVencimiento: string) => {
    const hoy = new Date();
    const fechaVenc = new Date(fechaVencimiento);
    const diffDias = Math.floor((fechaVenc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

    switch (estado) {
      case 'Pagada':
        return <Badge className="bg-green-500 text-white">Pagada</Badge>;
      case 'Vencida':
        return <Badge className="bg-red-500 text-white">Vencida</Badge>;
      case 'Pendiente':
        if (diffDias < 0) {
          return <Badge className="bg-red-500 text-white">Vencida</Badge>;
        } else if (diffDias <= 2) {
          return <Badge className="bg-yellow-500 text-white">Próxima</Badge>;
        } else {
          return <Badge className="bg-red-500 text-white">Pendiente</Badge>;
        }
      default:
        return <Badge className="bg-gray-500 text-white">{estado}</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-8 p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-3 pb-2 border-b border-border">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-card-foreground">Pagos</h1>
            <p className="text-base text-muted-foreground mt-2">Gestiona los pagos de órdenes con crédito</p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="stat-card-animated fade-in-up">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Cuotas Pendientes
                </p>
                <p className="text-3xl font-bold text-card-foreground tracking-tight">
                  {estadisticas.pendientes}
                </p>
              </div>
              <div className="icon-blue rounded-xl p-3.5 shadow-sm">
                <Clock className="h-7 w-7" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card-animated fade-in-up">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Cuotas Vencidas
                </p>
                <p className="text-3xl font-bold text-card-foreground tracking-tight">
                  {estadisticas.vencidas}
                </p>
              </div>
              <div className="icon-red rounded-xl p-3.5 shadow-sm">
                <AlertTriangle className="h-7 w-7" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card-animated fade-in-up">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Total Pendiente
                </p>
                <p className="text-3xl font-bold text-card-foreground tracking-tight">
                  ${Math.round(estadisticas.totalPendiente).toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                </p>
              </div>
              <div className="icon-yellow rounded-xl p-3.5 shadow-sm">
                <DollarSign className="h-7 w-7" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card-animated fade-in-up">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Total Pagado
                </p>
                <p className="text-3xl font-bold text-card-foreground tracking-tight">
                  ${Math.round(estadisticas.totalPagado).toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                </p>
              </div>
              <div className="icon-green rounded-xl p-3.5 shadow-sm">
                <CheckCircle className="h-7 w-7" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertas */}
      {alertas.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800">
              <AlertTriangle className="h-5 w-5" />
              Alertas de Pagos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alertas.map((alerta, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <div className="flex-1">
                    <p className="font-semibold text-sm">
                      {alerta.cuota.orden?.numero || `Orden ${alerta.cuota.ordenId}`} - Cuota {alerta.cuota.numeroCuota}
                    </p>
                    <p className="text-xs text-gray-600">
                      {alerta.cuota.cliente?.nombre} - {alerta.cuota.vehiculo?.marca} {alerta.cuota.vehiculo?.modelo}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {alerta.tipo === 'proxima' && alerta.dias === 2 && '⚠️ Vence en 2 días'}
                      {alerta.tipo === 'proxima' && alerta.dias === 0 && '⚠️ Vence hoy'}
                      {alerta.tipo === 'vencida' && '🔴 Vencida hace 1 día'}
                      {alerta.tipo === 'vencida_repetida' && `🔴 Vencida hace ${alerta.dias} días`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">${alerta.cuota.monto.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">
                      Vence: {new Date(alerta.cuota.fechaVencimiento).toLocaleDateString('es-CL')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de Cuotas */}
      <Card className="shadow-sm border border-border">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-center mb-4">
            <CardTitle className="text-xl font-bold text-card-foreground">Lista de Cuotas</CardTitle>
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  loadCuotas();
                  window.electronAPI?.actualizarEstadosCuotasVencidas();
                }}
                className="px-3 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
                title="Refrescar lista de cuotas"
              >
                <RefreshCw className="h-4 w-4" />
                Refrescar
              </button>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar por orden, cliente o vehículo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 w-80"
                />
              </div>
              {tabActiva === 'disponibles' && (
                <select
                  value={filterEstado}
                  onChange={(e) => setFilterEstado(e.target.value as any)}
                  className="px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
                >
                  <option value="todos">Todos</option>
                  <option value="Pendiente">Pendientes</option>
                  <option value="Vencida">Vencidas</option>
                </select>
              )}
            </div>
          </div>
          
          {/* Pestañas */}
          <div className="flex gap-2 border-b border-border">
            <button
              onClick={() => {
                setTabActiva('disponibles');
                setFilterEstado('todos');
              }}
              className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${
                tabActiva === 'disponibles'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-card-foreground'
              }`}
            >
              Pagos Disponibles ({cuotas.filter(c => c.estado === 'Pendiente' || c.estado === 'Vencida').length})
            </button>
            <button
              onClick={() => {
                setTabActiva('completados');
                setFilterEstado('todos');
              }}
              className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${
                tabActiva === 'completados'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-card-foreground'
              }`}
            >
              Pagos Completados ({cuotas.filter(c => c.estado === 'Pagada').length})
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Orden</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Cliente / Vehículo</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Cuota</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Fecha Vencimiento</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Monto</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Pagado</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Estado</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-muted-foreground">Cargando...</td>
                  </tr>
                ) : cuotasFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-muted-foreground">
                      No hay cuotas con los filtros aplicados
                    </td>
                  </tr>
                ) : (
                  cuotasFiltradas.map((cuota) => {
                    const montoRestante = cuota.monto - (cuota.montoPagado || 0);
                    const hoy = new Date();
                    const fechaVenc = new Date(cuota.fechaVencimiento);
                    const diffDias = Math.floor((fechaVenc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
                    const estaVencida = diffDias < 0 && cuota.estado !== 'Pagada';

                    return (
                      <tr key={`${cuota.ordenId}-${cuota.numeroCuota}-${cuota.id}`} className="border-b border-border hover:bg-muted/50 transition-colors">
                        <td className="py-4 px-4">
                          <span className="font-semibold text-card-foreground">
                            {cuota.orden?.numero || `OT-${cuota.ordenId}`}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div>
                            <div className="font-semibold text-card-foreground">
                              {cuota.cliente?.nombre || 'Cliente no encontrado'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {cuota.vehiculo ? `${cuota.vehiculo.marca} ${cuota.vehiculo.modelo}` : 'Vehículo no encontrado'}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm text-card-foreground">
                            Cuota {cuota.numeroCuota}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-card-foreground">
                              {new Date(cuota.fechaVencimiento).toLocaleDateString('es-CL')}
                            </span>
                            {estaVencida && (
                              <AlertTriangle className="h-4 w-4 text-red-500" title={`Vencida hace ${Math.abs(diffDias)} días`} />
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="font-semibold text-card-foreground">
                            ${cuota.monto.toLocaleString()}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm text-card-foreground">
                            ${(cuota.montoPagado || 0).toLocaleString()} / ${cuota.monto.toLocaleString()}
                          </span>
                          {montoRestante > 0 && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Restante: ${montoRestante.toLocaleString()}
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          {getEstadoBadge(cuota.estado, cuota.fechaVencimiento)}
                        </td>
                        <td className="py-4 px-4">
                          {cuota.estado !== 'Pagada' && montoRestante > 0 && (
                            <Button
                              onClick={() => handleAbrirModalPago(cuota)}
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Confirmar Pago
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal Confirmar Pago */}
      {isModalPagoOpen && cuotaSeleccionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Confirmar Pago</h2>
              <button
                onClick={() => {
                  setIsModalPagoOpen(false);
                  setCuotaSeleccionada(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Orden</p>
                <p className="font-semibold">{cuotaSeleccionada.orden?.numero || `OT-${cuotaSeleccionada.ordenId}`}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Cuota</p>
                <p className="font-semibold">Cuota {cuotaSeleccionada.numeroCuota} de ${cuotaSeleccionada.monto.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Monto Restante</p>
                <p className="font-semibold text-lg">
                  ${(cuotaSeleccionada.monto - (cuotaSeleccionada.montoPagado || 0)).toLocaleString()}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Monto a Pagar *
                </label>
                <input
                  type="number"
                  min="1"
                  max={cuotaSeleccionada.monto - (cuotaSeleccionada.montoPagado || 0)}
                  value={montoPago}
                  onChange={(e) => setMontoPago(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha de Pago *
                </label>
                <input
                  type="date"
                  value={fechaPago}
                  onChange={(e) => setFechaPago(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observaciones
                </label>
                <textarea
                  value={observacionesPago}
                  onChange={(e) => setObservacionesPago(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Notas adicionales sobre el pago..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <Button variant="outline" onClick={() => setIsModalPagoOpen(false)} disabled={isLoading}>
                Cancelar
              </Button>
              <Button onClick={handleConfirmarPago} disabled={isLoading}>
                {isLoading ? 'Confirmando...' : 'Confirmar Pago'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

