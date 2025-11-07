import StatCard from '../components/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { useApp } from '../contexts/AppContext';
import { DollarSign, Wrench, Package, TrendingUp, AlertTriangle } from 'lucide-react';
import { Cliente, Vehiculo, Cotizacion, OrdenTrabajo, Repuesto } from '../types';
import { useState, useMemo, useCallback, useEffect } from 'react';
import VerOrdenModal from '../components/VerOrdenModal';
import { kpiCache, KPICache } from '../utils/kpi-cache';

export default function Dashboard() {
  // Usar el contexto para acceder a los datos
  const { clientes, vehiculos, cotizaciones, ordenes, repuestos } = useApp();
  const [ordenSeleccionada, setOrdenSeleccionada] = useState<OrdenTrabajo | null>(null);
  const [isVerModalOpen, setIsVerModalOpen] = useState(false);
  console.log('🔧 Dashboard.tsx: Renderizando dashboard', {
    totalOrdenes: ordenes.length,
    ordenesConTotal: ordenes.filter(o => o.total).length,
    sumaTotales: ordenes.reduce((sum, o) => sum + (o.total || 0), 0)
  });
  
  // Pre-calcular índices para lookup O(1) en lugar de O(n)
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

  // Obtener mes y año actual (memoizado)
  const { mesActual, añoActual } = useMemo(() => {
    const ahora = new Date();
    return {
      mesActual: ahora.getMonth(),
      añoActual: ahora.getFullYear()
    };
  }, []); // Solo calcular una vez

  // Calcular estadísticas de órdenes (memoizado)
  const { ordenesEnProgreso, ordenesPendientes, ordenesCompletadas } = useMemo(() => {
    let enProgreso = 0;
    let pendientes = 0;
    let completadas = 0;

    ordenes.forEach(o => {
      if (o.estado === 'En Progreso') enProgreso++;
      else if (o.estado === 'Pendiente') pendientes++;
      else if (o.estado === 'Completada') completadas++;
    });

    return { ordenesEnProgreso: enProgreso, ordenesPendientes: pendientes, ordenesCompletadas: completadas };
  }, [ordenes]);
  
  // Estado para ingresos del mes (incluye pagos de cuotas)
  const [ingresosMes, setIngresosMes] = useState(0);

  // Calcular ingresos del mes actual (incluyendo pagos de cuotas)
  useEffect(() => {
    const calcularIngresos = async () => {
      const cacheKey = KPICache.generateKey('ingresosMes', [ordenes, mesActual, añoActual]);
      const cached = kpiCache.get<number>(cacheKey);
      if (cached !== null) {
        setIngresosMes(cached);
        return;
      }

      let result = 0;

      // Sumar órdenes completadas con pago inmediato (Efectivo, Débito)
      const ordenesPagoInmediato = ordenes
        .filter(o => {
          if (o.estado !== 'Completada') return false;
          if (o.metodoPago === 'Crédito') return false; // Las de crédito se cuentan por cuotas
          const fechaRelevante = o.fechaPago || o.fechaIngreso;
          if (!fechaRelevante) return false;
          const fechaOrden = new Date(fechaRelevante);
          return fechaOrden.getMonth() === mesActual && 
                 fechaOrden.getFullYear() === añoActual;
        })
        .reduce((sum, o) => sum + (o.total || 0), 0);

      result += ordenesPagoInmediato;

      // Sumar pagos de cuotas realizados este mes
      try {
        const cuotas = await window.electronAPI.getAllCuotasPago();
        const pagosMes = cuotas
          .filter(c => {
            if (c.estado !== 'Pagada' || !c.fechaPago) return false;
            const fechaPago = new Date(c.fechaPago);
            return fechaPago.getMonth() === mesActual && 
                   fechaPago.getFullYear() === añoActual;
          })
          .reduce((sum, c) => sum + (c.montoPagado || c.monto), 0);
        
        result += pagosMes;
      } catch (error) {
        console.error('Error obteniendo cuotas para KPIs:', error);
      }
      
      kpiCache.set(cacheKey, result, 30000); // 30 segundos TTL
      setIngresosMes(result);
    };

    calcularIngresos();
  }, [ordenes, mesActual, añoActual]);
  
  // Estado para ingresos del mes anterior (incluye pagos de cuotas)
  const [ingresosMesAnterior, setIngresosMesAnterior] = useState(0);

  // Calcular ingresos del mes anterior (incluyendo pagos de cuotas)
  useEffect(() => {
    const calcularIngresosAnterior = async () => {
      const mesAnterior = new Date(añoActual, mesActual - 1, 1);
      const cacheKey = KPICache.generateKey('ingresosMesAnterior', [ordenes, mesAnterior.getMonth(), mesAnterior.getFullYear()]);
      const cached = kpiCache.get<number>(cacheKey);
      if (cached !== null) {
        setIngresosMesAnterior(cached);
        return;
      }

      let result = 0;

      // Sumar órdenes completadas con pago inmediato del mes anterior
      const ordenesPagoInmediato = ordenes
        .filter(o => {
          if (o.estado !== 'Completada') return false;
          if (o.metodoPago === 'Crédito') return false;
          const fechaRelevante = o.fechaPago || o.fechaIngreso;
          if (!fechaRelevante) return false;
          const fechaOrden = new Date(fechaRelevante);
          return fechaOrden.getMonth() === mesAnterior.getMonth() && 
                 fechaOrden.getFullYear() === mesAnterior.getFullYear();
        })
        .reduce((sum, o) => sum + (o.total || 0), 0);

      result += ordenesPagoInmediato;

      // Sumar pagos de cuotas del mes anterior
      try {
        const cuotas = await window.electronAPI.getAllCuotasPago();
        const pagosMes = cuotas
          .filter(c => {
            if (c.estado !== 'Pagada' || !c.fechaPago) return false;
            const fechaPago = new Date(c.fechaPago);
            return fechaPago.getMonth() === mesAnterior.getMonth() && 
                   fechaPago.getFullYear() === mesAnterior.getFullYear();
          })
          .reduce((sum, c) => sum + (c.montoPagado || c.monto), 0);
        
        result += pagosMes;
      } catch (error) {
        console.error('Error obteniendo cuotas para KPIs:', error);
      }
      
      kpiCache.set(cacheKey, result, 30000);
      setIngresosMesAnterior(result);
    };

    calcularIngresosAnterior();
  }, [ordenes, mesActual, añoActual]);
  
  // Calcular porcentaje de cambio (memoizado con caché)
  const cambioPorcentaje = useMemo(() => {
    const cacheKey = KPICache.generateKey('cambioPorcentaje', [ingresosMes, ingresosMesAnterior]);
    const cached = kpiCache.get<number>(cacheKey);
    if (cached !== null) return cached;

    const result = ingresosMesAnterior > 0 
      ? ((ingresosMes - ingresosMesAnterior) / ingresosMesAnterior) * 100 
      : ingresosMes > 0 ? 100 : 0;
    
    kpiCache.set(cacheKey, result, 30000);
    return result;
  }, [ingresosMes, ingresosMesAnterior]);
  
  // Calcular ingresos totales (memoizado con caché)
  const ingresosTotales = useMemo(() => {
    const cacheKey = KPICache.generateKey('ingresosTotales', [ordenes]);
    const cached = kpiCache.get<number>(cacheKey);
    if (cached !== null) return cached;

    const result = ordenes
      .filter(o => o.estado === 'Completada')
      .reduce((sum, o) => sum + (o.total || 0), 0);
    
    kpiCache.set(cacheKey, result, 30000);
    return result;
  }, [ordenes]);
  
  // Inventario bajo (memoizado con caché)
  const inventarioBajo = useMemo(() => {
    const cacheKey = KPICache.generateKey('inventarioBajo', [repuestos]);
    const cached = kpiCache.get<number>(cacheKey);
    if (cached !== null) return cached;

    const result = repuestos.filter(r => (r.stock || 0) < (r.stockMinimo || 0)).length;
    kpiCache.set(cacheKey, result, 30000);
    return result;
  }, [repuestos]);

  // Generar datos de ventas (memoizado)
  const salesData = useMemo(() => {
    const meses = ['May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct'];
    const datosVentas = [];
    
    for (let i = 0; i < 6; i++) {
      const mesReferencia = new Date();
      mesReferencia.setMonth(mesReferencia.getMonth() - (5 - i));
      
      const ventasMes = ordenes
        .filter(o => {
          if (!o.fechaIngreso) return false;
          const fechaOrden = new Date(o.fechaIngreso);
          return fechaOrden.getMonth() === mesReferencia.getMonth() && 
                 fechaOrden.getFullYear() === mesReferencia.getFullYear();
        })
        .reduce((sum, o) => sum + (o.total || 0), 0);
      
      datosVentas.push({
        month: meses[i],
        sales: ventasMes || 0
      });
    }
    
    return datosVentas;
  }, [ordenes]);

  // Datos de órdenes de trabajo (memoizado)
  const workOrdersData = useMemo(() => [
    { week: "Completadas", orders: ordenesCompletadas },
    { week: "En Proceso", orders: ordenesEnProgreso },
    { week: "Pendientes", orders: ordenesPendientes },
    { week: "Total", orders: ordenes.length }
  ], [ordenesCompletadas, ordenesEnProgreso, ordenesPendientes, ordenes.length]);

  // Items de inventario bajo (memoizado)
  const lowStockItems = useMemo(() => {
    return repuestos
      .filter(r => (r.stock || 0) < (r.stockMinimo || 0))
      .slice(0, 5)
      .map(r => ({
        id: r.id,
        name: r.nombre,
        stock: r.stock || 0,
        minStock: r.stockMinimo || 0,
        status: (r.stock || 0) < (r.stockMinimo || 0) / 2 ? "critical" : "warning",
      }));
  }, [repuestos]);

  // Función para obtener el orden de prioridad del estado (constante, no necesita memo)
  const getEstadoOrden = (estado: string): number => {
    switch (estado) {
      case 'Pendiente': return 1;
      case 'En Progreso': return 2;
      case 'Completada': return 3;
      case 'Cancelada': return 4;
      default: return 5;
    }
  };

  // Órdenes recientes (memoizado y optimizado para evitar O(n²))
  const recentOrders = useMemo(() => {
    return ordenes
      .sort((a, b) => {
        const ordenA = getEstadoOrden(a.estado || '');
        const ordenB = getEstadoOrden(b.estado || '');
        
        if (ordenA !== ordenB) {
          return ordenA - ordenB;
        }
        
        const fechaA = new Date(a.fechaIngreso || 0).getTime();
        const fechaB = new Date(b.fechaIngreso || 0).getTime();
        return fechaB - fechaA;
      })
      .slice(0, 4)
      .map(o => {
        const cliente = o.clienteId ? clientesById.get(o.clienteId) : null;
        const vehiculo = o.vehiculoId ? vehiculosById.get(o.vehiculoId) : null;
        
        return {
          // Mantener el objeto original completo para que el modal pueda acceder a todos los datos
          ordenOriginal: o,
          // Datos para mostrar en la lista
          id: o.numero || `OT-${o.id}`,
          client: cliente?.nombre || 'Cliente',
          vehicle: vehiculo ? `${vehiculo.marca} ${vehiculo.modelo}` : 'Vehículo',
          status: o.estado === 'Completada' ? 'Completado' : o.estado === 'En Progreso' ? 'En Progreso' : o.estado === 'Cancelada' ? 'Cancelada' : 'Pendiente',
          priority: 'medium'
        };
      });
  }, [ordenes, clientesById, vehiculosById]);

  const handleOrdenClick = useCallback((orderItem: any) => {
    // Usar la orden original completa, no el objeto transformado
    const ordenOriginal = orderItem.ordenOriginal || orderItem;
    setOrdenSeleccionada(ordenOriginal);
    setIsVerModalOpen(true);
  }, []);

  return (
    <div className="flex flex-col gap-8 p-6 lg:p-8">
      <div className="flex flex-col gap-3 pb-2 border-b border-border">
        <h1 className="text-4xl font-bold tracking-tight text-card-foreground">Dashboard</h1>
        <p className="text-base text-muted-foreground">Resumen general de tu taller mecánico - Octubre 2025</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Ganancias del Mes"
          value={`$${ingresosMes.toLocaleString()}`}
          change={`${cambioPorcentaje >= 0 ? '+' : ''}${cambioPorcentaje.toFixed(1)}% vs mes anterior`}
          changeType={cambioPorcentaje >= 0 ? "positive" : "negative"}
          icon={DollarSign}
        />
        <StatCard
          title="Órdenes Completadas"
          value={ordenesCompletadas.toString()}
          change="Trabajos finalizados"
          changeType="positive"
          icon={Wrench}
        />
        <StatCard
          title="Órdenes Pendientes"
          value={ordenesPendientes.toString()}
          change="Por iniciar"
          changeType="neutral"
          icon={TrendingUp}
        />
        <StatCard
          title="Órdenes en Proceso"
          value={ordenesEnProgreso.toString()}
          change="Trabajos activos"
          changeType="neutral"
          icon={Package}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-sm border border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold text-card-foreground">Ventas Mensuales (Mayo - Octubre 2025)</CardTitle>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="space-y-4">
              {salesData.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 text-sm font-medium text-muted-foreground">{item.month}</div>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="progress-bar-sales"
                        // eslint-disable-next-line react/forbid-dom-props
                        style={{ 
                          width: `${Math.min((item.sales / Math.max(...salesData.map(d => d.sales), 1)) * 100, 100)}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                  <div className="w-20 text-right text-sm font-semibold text-card-foreground">
                    ${item.sales.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold text-card-foreground">Estado de Órdenes de Trabajo</CardTitle>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="space-y-4">
              {workOrdersData.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-20 text-sm font-medium text-muted-foreground">{item.week}</div>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="progress-bar-orders"
                        // eslint-disable-next-line react/forbid-dom-props
                        style={{ 
                          width: `${Math.min((item.orders / Math.max(...workOrdersData.map(d => d.orders), 1)) * 100, 100)}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                  <div className="w-12 text-right text-sm font-semibold text-card-foreground">
                    {item.orders}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-sm border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-xl font-bold">
              <Package className="h-5 w-5 text-primary" />
              Alertas de Inventario
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lowStockItems.length > 0 ? (
                lowStockItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground mt-1.5">
                        Stock: {item.stock} / Mínimo: {item.minStock}
                      </p>
                    </div>
                    <Badge variant={item.status === "critical" ? "destructive" : "secondary"} className="font-semibold">
                      {item.status === "critical" ? "Crítico" : "Bajo"}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-8">No hay alertas de inventario</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-xl font-bold">
              <Wrench className="h-5 w-5 text-primary" />
              Órdenes Recientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentOrders.length > 0 ? (
                recentOrders.map((order) => (
                  <div
                    key={order.id}
                    onClick={() => handleOrdenClick(order)}
                    className="flex items-start justify-between rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md hover:cursor-pointer transition-shadow"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm text-foreground">{order.id}</p>
                        <Badge
                          variant={
                            order.status === "Completado"
                              ? "default"
                              : order.status === "En Progreso"
                                ? "secondary"
                              : order.status === "Cancelada"
                                ? "destructive"
                                : "outline"
                          }
                          className="text-xs font-semibold"
                        >
                          {order.status}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium text-foreground mt-2">{order.client}</p>
                      <p className="text-xs text-muted-foreground mt-1">{order.vehicle}</p>
                    </div>
                    {order.priority === "high" && <AlertTriangle className="h-5 w-5 text-destructive" />}
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-8">No hay órdenes recientes</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal Ver Orden */}
      <VerOrdenModal
        isOpen={isVerModalOpen}
        onClose={() => {
          setIsVerModalOpen(false);
          setOrdenSeleccionada(null);
        }}
        orden={ordenSeleccionada}
        cliente={ordenSeleccionada && ordenSeleccionada.clienteId ? clientesById.get(ordenSeleccionada.clienteId) || null : null}
        vehiculo={ordenSeleccionada && ordenSeleccionada.vehiculoId ? vehiculosById.get(ordenSeleccionada.vehiculoId) || null : null}
      />
    </div>
  );
}