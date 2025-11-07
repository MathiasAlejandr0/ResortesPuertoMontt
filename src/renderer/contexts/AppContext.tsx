import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode, startTransition } from 'react';
import { Cliente, Vehiculo, Cotizacion, OrdenTrabajo, Repuesto, Servicio } from '../types';
import { Logger } from '../utils/cn';

interface AppContextType {
  // Datos
  clientes: Cliente[];
  vehiculos: Vehiculo[];
  cotizaciones: Cotizacion[];
  ordenes: OrdenTrabajo[];
  repuestos: Repuesto[];
  servicios: Servicio[];
  
  // Métodos de actualización
  addCliente: (cliente: Cliente) => Promise<void>;
  updateCliente: (cliente: Cliente) => void;
  deleteCliente: (id: number) => void;
  refreshClientes: () => Promise<void>;
  
  addVehiculo: (vehiculo: Vehiculo) => void;
  updateVehiculo: (vehiculo: Vehiculo) => void;
  deleteVehiculo: (id: number) => void;
  refreshVehiculos: () => Promise<void>;
  
  addCotizacion: (cotizacion: Cotizacion) => void;
  updateCotizacion: (cotizacion: Cotizacion) => void;
  deleteCotizacion: (id: number) => void;
  refreshCotizaciones: () => Promise<void>;
  
  addOrden: (orden: OrdenTrabajo) => void;
  updateOrden: (orden: OrdenTrabajo) => void;
  deleteOrden: (id: number) => void;
  refreshOrdenes: () => Promise<void>;
  
  refreshRepuestos: () => Promise<void>;
  refreshServicios: () => Promise<void>;
  
  // Estado de carga
  isLoading: boolean;
  error: string | null;
  
  // Refrescar todos los datos
  refreshAll: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  Logger.log('🔧 AppContext: Inicializando provider');
  
  // Estados de datos
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [ordenes, setOrdenes] = useState<OrdenTrabajo[]>([]);
  const [repuestos, setRepuestos] = useState<Repuesto[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Función para cargar todos los datos de forma progresiva con paginación inicial
  const loadAllData = useCallback(async () => {
    try {
      Logger.log('🔧 AppContext: Cargando datos con carga progresiva optimizada...');
      
      if (!window.electronAPI) {
        throw new Error('electronAPI no está disponible');
      }
      
      // MANTENER isLoading=true hasta que los datos críticos estén listos
      
      // Cargar SOLO una página inicial de datos críticos (50 registros por defecto)
      // Esto hace que la carga sea mucho más rápida en computadoras remotas
      Logger.log('📥 Cargando datos críticos (primera página - 50 registros)...');
      const [clientesPage, vehiculosPage] = await Promise.all([
        window.electronAPI.getClientesPaginated({ limit: 50, offset: 0 }),
        window.electronAPI.getVehiculosPaginated({ limit: 50, offset: 0 })
      ]);
      
      // Establecer datos críticos INMEDIATAMENTE (solo primera página)
      setClientes(clientesPage.data);
      setVehiculos(vehiculosPage.data);
      
      Logger.log('✅ Datos críticos cargados (primera página):', {
        clientes: clientesPage.data.length,
        vehiculos: vehiculosPage.data.length,
        totalClientes: clientesPage.total,
        totalVehiculos: vehiculosPage.total
      });
      
      // Esperar tiempo mínimo para mostrar la pantalla de carga (2 segundos)
      // Esto asegura que el usuario vea la pantalla de carga y las animaciones
      const minLoadingTime = 2000; // 2 segundos mínimo para que sea visible
      const loadStartTime = Date.now();
      
      // Calcular tiempo restante para cumplir el mínimo
      const elapsedTime = Date.now() - loadStartTime;
      const remainingTime = Math.max(0, minLoadingTime - elapsedTime);
      
      Logger.log(`⏱️ Tiempo transcurrido: ${elapsedTime}ms, esperando ${remainingTime}ms más para mostrar pantalla de carga`);
      
      setTimeout(() => {
        // AHORA marcar como cargado para mostrar la UI (después del tiempo mínimo)
        Logger.log('✅ Tiempo mínimo cumplido, mostrando aplicación');
        setIsLoading(false);
      }, remainingTime);
      
      // Cargar resto de datos críticos en background si hay más páginas
      if (clientesPage.total > 50 || vehiculosPage.total > 50) {
        startTransition(() => {
          Promise.all([
            clientesPage.total > 50 ? window.electronAPI.getAllClientes() : Promise.resolve(clientesPage.data),
            vehiculosPage.total > 50 ? window.electronAPI.getAllVehiculos() : Promise.resolve(vehiculosPage.data)
          ]).then(([allClientes, allVehiculos]) => {
            startTransition(() => {
              setClientes(allClientes);
              setVehiculos(allVehiculos);
            });
            Logger.log('✅ Todos los datos críticos cargados:', {
              clientes: allClientes.length,
              vehiculos: allVehiculos.length
            });
          }).catch((err) => {
            Logger.error('❌ Error cargando datos críticos completos:', err);
          });
        });
      }
      
      // Cargar resto de datos en background (sin bloquear la UI)
      startTransition(() => {
        Promise.all([
          window.electronAPI.getCotizacionesPaginated({ limit: 50, offset: 0 }).then(r => r.data),
          window.electronAPI.getOrdenesTrabajoPaginated({ limit: 50, offset: 0 }).then(r => r.data),
          window.electronAPI.getRepuestosPaginated({ limit: 50, offset: 0 }).then(r => r.data),
          window.electronAPI.getAllServicios()
        ]).then(([cotizacionesData, ordenesData, repuestosData, serviciosData]) => {
          startTransition(() => {
            setCotizaciones(cotizacionesData);
            setOrdenes(ordenesData);
            setRepuestos(repuestosData);
            setServicios(serviciosData);
          });
          
          Logger.log('✅ Datos secundarios cargados (primera página):', {
            cotizaciones: cotizacionesData.length,
            ordenes: ordenesData.length,
            repuestos: repuestosData.length,
            servicios: serviciosData.length
          });
          
          // Cargar datos completos en background si hay más páginas
          Promise.all([
            window.electronAPI.getAllCotizaciones(),
            window.electronAPI.getAllOrdenesTrabajo(),
            window.electronAPI.getAllRepuestos()
          ]).then(([allCotizaciones, allOrdenes, allRepuestos]) => {
            startTransition(() => {
              setCotizaciones(allCotizaciones);
              setOrdenes(allOrdenes);
              setRepuestos(allRepuestos);
            });
            Logger.log('✅ Todos los datos cargados completamente');
          });
        }).catch((err) => {
          Logger.error('❌ Error cargando datos secundarios:', err);
          // No fallar completamente si solo fallan los datos secundarios
        });
      });
      
      setError(null);
    } catch (err) {
      Logger.error('❌ AppContext: Error cargando datos:', err);
      setError('Error cargando datos: ' + (err as Error).message);
      setIsLoading(false);
    }
  }, []);

  // Cargar datos al montar
  useEffect(() => {
    // Cargar datos inmediatamente (mostrará pantalla de carga hasta que estén listos)
    loadAllData();
  }, [loadAllData]);

  // Funciones para clientes
  // IMPORTANTE: refreshClientes debe definirse ANTES que addCliente
  const refreshClientes = useCallback(async () => {
    try {
      const data = await window.electronAPI.getAllClientes();
      setClientes(data);
      Logger.log('✅ AppContext: Clientes actualizados');
    } catch (err) {
      Logger.error('❌ AppContext: Error actualizando clientes:', err);
    }
  }, []);

  const addCliente = useCallback(async (cliente: Cliente) => {
    Logger.log('✅ AppContext: Agregando cliente:', cliente);
    // Refrescar la lista completa desde la BD para asegurar consistencia
    await refreshClientes();
  }, [refreshClientes]);

  const updateCliente = useCallback((cliente: Cliente) => {
    Logger.log('✅ AppContext: Actualizando cliente:', cliente);
    setClientes(prev => prev.map(c => c.id === cliente.id ? cliente : c));
  }, []);

  const deleteCliente = useCallback((id: number) => {
    Logger.log('✅ AppContext: Eliminando cliente:', id);
    setClientes(prev => prev.filter(c => c.id !== id));
  }, []);

  // Funciones para vehículos
  const addVehiculo = useCallback((vehiculo: Vehiculo) => {
    Logger.log('✅ AppContext: Agregando vehículo:', vehiculo);
    setVehiculos(prev => [...prev, vehiculo]);
  }, []);

  const updateVehiculo = useCallback((vehiculo: Vehiculo) => {
    Logger.log('✅ AppContext: Actualizando vehículo:', vehiculo);
    setVehiculos(prev => prev.map(v => v.id === vehiculo.id ? vehiculo : v));
  }, []);

  const deleteVehiculo = useCallback((id: number) => {
    Logger.log('✅ AppContext: Eliminando vehículo:', id);
    setVehiculos(prev => prev.filter(v => v.id !== id));
  }, []);

  const refreshVehiculos = useCallback(async () => {
    try {
      const data = await window.electronAPI.getAllVehiculos();
      setVehiculos(data);
      Logger.log('✅ AppContext: Vehículos actualizados');
    } catch (err) {
      Logger.error('❌ AppContext: Error actualizando vehículos:', err);
    }
  }, []);

  // Funciones para cotizaciones
  const addCotizacion = useCallback((cotizacion: Cotizacion) => {
    Logger.log('✅ AppContext: Agregando cotización:', cotizacion);
    setCotizaciones(prev => [...prev, cotizacion]);
  }, []);

  const updateCotizacion = useCallback((cotizacion: Cotizacion) => {
    Logger.log('✅ AppContext: Actualizando cotización:', cotizacion);
    setCotizaciones(prev => prev.map(c => c.id === cotizacion.id ? cotizacion : c));
  }, []);

  const deleteCotizacion = useCallback((id: number) => {
    Logger.log('✅ AppContext: Eliminando cotización:', id);
    setCotizaciones(prev => prev.filter(c => c.id !== id));
  }, []);

  const refreshCotizaciones = useCallback(async () => {
    try {
      const data = await window.electronAPI.getAllCotizaciones();
      setCotizaciones(data);
      Logger.log('✅ AppContext: Cotizaciones actualizadas');
    } catch (err) {
      Logger.error('❌ AppContext: Error actualizando cotizaciones:', err);
    }
  }, []);

  // Funciones para órdenes
  const addOrden = useCallback((orden: OrdenTrabajo) => {
    Logger.log('✅ AppContext: Agregando orden:', orden);
    setOrdenes(prev => [...prev, orden]);
  }, []);

  const updateOrden = useCallback((orden: OrdenTrabajo) => {
    Logger.log('✅ AppContext: Actualizando orden:', orden);
    setOrdenes(prev => prev.map(o => o.id === orden.id ? orden : o));
  }, []);

  const deleteOrden = useCallback((id: number) => {
    Logger.log('✅ AppContext: Eliminando orden:', id);
    setOrdenes(prev => prev.filter(o => o.id !== id));
  }, []);

  const refreshOrdenes = useCallback(async () => {
    try {
      const data = await window.electronAPI.getAllOrdenesTrabajo();
      setOrdenes(data);
      Logger.log('✅ AppContext: Órdenes actualizadas');
    } catch (err) {
      Logger.error('❌ AppContext: Error actualizando órdenes:', err);
    }
  }, []);

  // Funciones para repuestos y servicios
  const refreshRepuestos = useCallback(async () => {
    try {
      const data = await window.electronAPI.getAllRepuestos();
      setRepuestos(data);
      Logger.log('✅ AppContext: Repuestos actualizados');
    } catch (err) {
      Logger.error('❌ AppContext: Error actualizando repuestos:', err);
    }
  }, []);

  const refreshServicios = useCallback(async () => {
    try {
      const data = await window.electronAPI.getAllServicios();
      setServicios(data);
      Logger.log('✅ AppContext: Servicios actualizados');
    } catch (err) {
      Logger.error('❌ AppContext: Error actualizando servicios:', err);
    }
  }, []);

  // Refrescar todos los datos
  const refreshAll = useCallback(async () => {
    await loadAllData();
  }, [loadAllData]);

  // Pre-calcular índices de relaciones para lookup O(1) en lugar de O(n)
  const clientesById = useMemo(() => {
    const map = new Map<number, Cliente>();
    clientes.forEach(cliente => {
      if (cliente.id) map.set(cliente.id, cliente);
    });
    return map;
  }, [clientes]);

  const vehiculosById = useMemo(() => {
    const map = new Map<number, Vehiculo>();
    vehiculos.forEach(vehiculo => {
      if (vehiculo.id) map.set(vehiculo.id, vehiculo);
    });
    return map;
  }, [vehiculos]);

  const vehiculosByClienteId = useMemo(() => {
    const map = new Map<number, Vehiculo[]>();
    vehiculos.forEach(vehiculo => {
      if (vehiculo.clienteId) {
        const existing = map.get(vehiculo.clienteId) || [];
        map.set(vehiculo.clienteId, [...existing, vehiculo]);
      }
    });
    return map;
  }, [vehiculos]);

  // Memoizar valor del Context para evitar re-renders masivos
  // Solo se recrea cuando cambian los datos o funciones realmente necesarias
  const value: AppContextType = useMemo(() => ({
    clientes,
    vehiculos,
    cotizaciones,
    ordenes,
    repuestos,
    servicios,
    addCliente,
    updateCliente,
    deleteCliente,
    refreshClientes,
    addVehiculo,
    updateVehiculo,
    deleteVehiculo,
    refreshVehiculos,
    addCotizacion,
    updateCotizacion,
    deleteCotizacion,
    refreshCotizaciones,
    addOrden,
    updateOrden,
    deleteOrden,
    refreshOrdenes,
    refreshRepuestos,
    refreshServicios,
    isLoading,
    error,
    refreshAll,
  }), [
    clientes,
    vehiculos,
    cotizaciones,
    ordenes,
    repuestos,
    servicios,
    addCliente,
    updateCliente,
    deleteCliente,
    refreshClientes,
    addVehiculo,
    updateVehiculo,
    deleteVehiculo,
    refreshVehiculos,
    addCotizacion,
    updateCotizacion,
    deleteCotizacion,
    refreshCotizaciones,
    addOrden,
    updateOrden,
    deleteOrden,
    refreshOrdenes,
    refreshRepuestos,
    refreshServicios,
    isLoading,
    error,
    refreshAll,
  ]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp debe ser usado dentro de un AppProvider');
  }
  return context;
}

