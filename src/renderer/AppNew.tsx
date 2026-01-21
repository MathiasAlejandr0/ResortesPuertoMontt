import { useState, useEffect, ReactNode } from 'react';
import './index.css';
import DashboardLayout from './components/DashboardLayout';
import Dashboard from './pages/Dashboard';
import ClientesListadoPage from './pages/ClientesListado';
import CotizacionesPage from './pages/Cotizaciones';
import InventarioPage from './pages/Inventario';
import OrdenesPage from './pages/Ordenes';
import AgendaPage from './pages/Agenda';
import RecordatoriosPage from './pages/Recordatorios';
import VehiculosPage from './pages/Vehiculos';
import HistoricoPage from './pages/Historico';
import TiendaPage from './pages/Tienda';
import CierresCajaPage from './pages/CierresCaja';
import MovimientosCajaPage from './pages/MovimientosCaja';
import SaldosCuentasPage from './pages/SaldosCuentas';
import MovimientosCuentasPage from './pages/MovimientosCuentas';
import ProductosPage from './pages/Productos';
import EditorProductosPage from './pages/EditorProductos';
import EditorServiciosPage from './pages/EditorServicios';
import ServiciosListadoPage from './pages/ServiciosListado';
import CategoriasListadoPage from './pages/CategoriasListado';
import ProveedoresListadoPage from './pages/ProveedoresListado';
import GraficasGeneralPage from './pages/GraficasGeneral';
import GraficasProductosPage from './pages/GraficasProductos';
import GraficasServiciosPage from './pages/GraficasServicios';
import InformesClientePage from './pages/InformesCliente';
import InformesVehiculoPage from './pages/InformesVehiculo';
import InformesVehiculoDetalladoPage from './pages/InformesVehiculoDetallado';
import InformesCuentaCorrientePage from './pages/InformesCuentaCorriente';
import ImportarProductosPage from './pages/ImportarProductos';
import ImportarServiciosPage from './pages/ImportarServicios';
import ImportarClientesPage from './pages/ImportarClientes';
import ExportarPage from './pages/Exportar';
import ConfiguracionComprobantesPage from './pages/ConfiguracionComprobantes';
import ConfiguracionFormulariosPage from './pages/ConfiguracionFormularios';
import ConfiguracionSistemaPage from './pages/ConfiguracionSistema';
import TrabajadoresListadoPage from './pages/TrabajadoresListado';
import PagosTrabajadoresPage from './pages/PagosTrabajadores';
import ScoreTrabajadoresPage from './pages/ScoreTrabajadores';
import PagosPage from './pages/Pagos';
import ConfiguracionPage from './pages/Configuracion';
import CajaDiariaPage from './pages/CajaDiaria';
import ReporteTecnicosPage from './pages/ReporteTecnicos';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';
import ManualUsuario from './components/ManualUsuario';
import { AppProvider, useApp } from './contexts/AppContext';
import { Toaster } from 'sonner';
import { Logger, notify } from './utils/cn';
import { 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  Eye as ViewIcon
} from 'lucide-react';

// Manejo global de errores de JavaScript
window.addEventListener('error', (event) => {
  Logger.error('❌ Error global capturado:', event.error);
  Logger.error('❌ Error en archivo:', event.filename);
  Logger.error('❌ Error en línea:', event.lineno);
  Logger.error('❌ Error en columna:', event.colno);
  
  // Mostrar mensaje de error al usuario si es crítico
  if (event.error && event.error.message && event.error.message.includes('Cannot read properties')) {
    Logger.warn('⚠️ Error de propiedades no crítico, continuando...');
  } else {
    // Mostrar notificación al usuario para errores críticos
    notify.error('Error inesperado', 'Ha ocurrido un error. Por favor, revisa la consola para más detalles.');
  }
  
  // Prevenir que el error crashee la aplicación
  event.preventDefault();
});

window.addEventListener('unhandledrejection', (event) => {
  Logger.error('❌ Promise rejection no manejada:', event.reason);
  Logger.error('❌ Promise rejection stack:', event.reason?.stack);
  
  // Mostrar mensaje de error al usuario si es crítico
  if (event.reason && event.reason.message && event.reason.message.includes('Cannot read properties')) {
    Logger.warn('⚠️ Promise rejection no crítica, continuando...');
  } else {
    notify.error('Error en operación asíncrona', 'Ha ocurrido un error. Por favor, intenta nuevamente.');
  }
  
  // Prevenir que el error crashee la aplicación
  event.preventDefault();
});

// Función para limpiar estados de formularios globalmente
window.resetAllForms = () => {
  Logger.log('🔄 Reseteando todos los formularios...');
  // Esta función puede ser llamada desde la consola del desarrollador
  window.location.reload();
};

Logger.log('🔧 AppNew.tsx: Iniciando componente AppNew');

// Componente interno que usa el contexto
function AppContent() {
  Logger.log('🔧 AppContent: Iniciando componente interno');
  
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [retryCount, setRetryCount] = useState(0);
  const [pageRenderTimeout, setPageRenderTimeout] = useState<NodeJS.Timeout | null>(null);
  const [showManual, setShowManual] = useState(false);
  
  // Usar el contexto para acceder a los datos
  const { 
    clientes, 
    vehiculos, 
    cotizaciones, 
    ordenes, 
    repuestos, 
    servicios, 
    isLoading, 
    error 
  } = useApp();
  
  // Función helper para renderizar páginas placeholder
  const renderPlaceholderPage = (title: string, description: string, action?: ReactNode) => {
    return (
      <div className="p-6 bg-background text-foreground">
        <h1 className="text-4xl font-bold mb-6 text-center">{title}</h1>
        <div className="card-professional">
          <div className="p-6">
            <p className="text-muted-foreground text-center mb-4">{description}</p>
            {action && <div className="flex justify-center">{action}</div>}
          </div>
        </div>
      </div>
    );
  };

  // Funciones de navegación
  const handlePageChange = (page: string) => {
    try {
      Logger.log('🔧 AppNew.tsx: Cambiando a página:', page);
      Logger.log('🔧 AppNew.tsx: Intento número:', retryCount + 1);
      
      // Limpiar timeout anterior si existe
      if (pageRenderTimeout) {
        clearTimeout(pageRenderTimeout);
      }
      
      setCurrentPage(page);
      setRetryCount(0); // Resetear contador de reintentos
      
    } catch (error) {
      Logger.error('❌ Error cambiando página:', error);
      const errorMsg = `Error al cambiar a la página ${page}: ${error instanceof Error ? error.message : 'Error desconocido'}`;
      notify.error('Error de navegación', errorMsg);
      // Si hay muchos errores, volver al dashboard
      if (retryCount > 3) {
        Logger.log('🔧 AppNew.tsx: Demasiados errores, volviendo al dashboard');
        setCurrentPage('dashboard');
        setRetryCount(0);
      } else {
        setRetryCount(prev => prev + 1);
      }
    }
  };
  
  // Ya no necesitamos inicialización local, el contexto se encarga

  // Limpiar timeout al desmontar
  useEffect(() => {
    return () => {
      if (pageRenderTimeout) {
        clearTimeout(pageRenderTimeout);
      }
    };
  }, [pageRenderTimeout]);

  // Menú: listeners desde proceso principal
  useEffect(() => {
    if (!window.electronAPI?.on) return;
    const openNuevo = () => {
      setCurrentPage('clientes');
      // Notificar a la página de clientes que abra el formulario
      window.dispatchEvent(new CustomEvent('app:nuevo-cliente'));
    };
    const crearBackup = async () => {
      try {
        const res = await window.electronAPI.createBackup();
        if (res?.success !== false) {
          notify.success('Backup creado', 'Se generó un respaldo de la base de datos');
        } else {
          notify.error('Error creando backup', res?.error || 'Desconocido');
        }
      } catch (e: any) {
        notify.error('Error creando backup', e?.message || 'Desconocido');
      }
    };
    const acercaDe = () => {
      // El handler ahora está en main.ts y muestra un diálogo nativo
      // Este listener ya no es necesario, pero se mantiene por compatibilidad
    };
    const irConfiguracion = () => {
      setCurrentPage('configuracion');
    };
    window.electronAPI.on('menu:nuevo-cliente', openNuevo);
    window.electronAPI.on('menu:crear-backup', crearBackup);
    window.electronAPI.on('menu:acerca-de', acercaDe);
    window.electronAPI.on('menu:manual-usuario', () => setShowManual(true));
    window.electronAPI.on('menu:ir-configuracion', irConfiguracion);
  }, []);

  const renderPage = () => {
    try {
      Logger.log('🔧 AppNew.tsx: Renderizando página:', currentPage);
      Logger.log('🔧 AppNew.tsx: Datos disponibles:', {
        clientes: clientes.length,
        vehiculos: vehiculos.length,
        cotizaciones: cotizaciones.length,
        ordenes: ordenes.length,
        repuestos: repuestos.length
      });
      
      // Limpiar timeout ya que la página se está renderizando
      if (pageRenderTimeout) {
        clearTimeout(pageRenderTimeout);
        setPageRenderTimeout(null);
      }
      
      switch (currentPage) {
        case 'dashboard':
          Logger.log('🔧 AppContent: Renderizando Dashboard');
          return <Dashboard />;
        case 'metricas':
          Logger.log('🔧 AppContent: Renderizando MetricasPage');
          return renderPlaceholderPage(
            'Métricas',
            'Panel de métricas y análisis del taller.'
          );
        case 'ordenes':
          Logger.log('🔧 AppContent: Renderizando OrdenesPage');
          return <OrdenesPage />;
        case 'cotizaciones':
          Logger.log('🔧 AppContent: Renderizando CotizacionesPage');
          return <CotizacionesPage />;
        case 'calendario':
          Logger.log('🔧 AppContent: Renderizando CalendarioPage');
          return <AgendaPage />;
        case 'historico':
          Logger.log('🔧 AppContent: Renderizando HistoricoPage');
          return <HistoricoPage />;
        case 'vehiculos-registrados':
          Logger.log('🔧 AppContent: Renderizando VehiculosPage');
          return <VehiculosPage />;
        case 'avisos-programados':
          Logger.log('🔧 AppContent: Renderizando RecordatoriosPage');
          return <RecordatoriosPage />;
        case 'tienda':
          Logger.log('🔧 AppContent: Renderizando TiendaPage');
          return <TiendaPage />;
        case 'compras':
          Logger.log('🔧 AppContent: Renderizando ComprasPage');
          return renderPlaceholderPage(
            'Compras',
            'Gestión de compras y proveedores.'
          );
        case 'ventas':
          Logger.log('🔧 AppContent: Renderizando VentasPage');
          return renderPlaceholderPage(
            'Ventas',
            'Gestión de ventas del taller.'
          );
        case 'saldos':
          Logger.log('🔧 AppContent: Renderizando SaldosCuentasPage');
          return <SaldosCuentasPage />;
        case 'movimientos-cuentas':
          Logger.log('🔧 AppContent: Renderizando MovimientosCuentasPage');
          return <MovimientosCuentasPage />;
        case 'trabajadores':
          Logger.log('🔧 AppContent: Renderizando TrabajadoresPage');
          return <TrabajadoresListadoPage />;
        case 'comisiones':
          Logger.log('🔧 AppContent: Renderizando ComisionesPage');
          return renderPlaceholderPage(
            'Comisiones',
            'Gestión de comisiones de trabajadores.'
          );
        case 'pagos-trabajadores':
          Logger.log('🔧 AppContent: Renderizando PagosTrabajadoresPage');
          return <PagosTrabajadoresPage />;
        case 'score-trabajadores':
          Logger.log('🔧 AppContent: Renderizando ScoreTrabajadoresPage');
          return <ScoreTrabajadoresPage />;
        case 'graficas':
          Logger.log('🔧 AppContent: Renderizando GraficasPage');
          return <GraficasGeneralPage />;
        case 'graficas-productos':
          Logger.log('🔧 AppContent: Renderizando GraficasProductosPage');
          return <GraficasProductosPage />;
        case 'graficas-servicios':
          Logger.log('🔧 AppContent: Renderizando GraficasServiciosPage');
          return <GraficasServiciosPage />;
        case 'tutoriales':
          Logger.log('🔧 AppContent: Renderizando TutorialesPage');
          return renderPlaceholderPage(
            'Tutoriales',
            'Tutoriales y guías del sistema.'
          );
        case 'estado-caja':
          Logger.log('🔧 AppContent: Renderizando EstadoCajaPage');
          return <CajaDiariaPage />;
        case 'cierres':
          Logger.log('🔧 AppContent: Renderizando CierresCajaPage');
          return <CierresCajaPage />;
        case 'movimientos':
          Logger.log('🔧 AppContent: Renderizando MovimientosCajaPage');
          return <MovimientosCajaPage />;
        case 'cuentas-corrientes':
          Logger.log('🔧 AppContent: Renderizando CuentasCorrientesPage');
          return renderPlaceholderPage(
            'Cuentas corrientes',
            'Cuentas corrientes y saldos.'
          );
        case 'inventario':
          Logger.log('🔧 AppContent: Renderizando ProductosPage');
          return <ProductosPage />;
        case 'editor-productos':
          Logger.log('🔧 AppContent: Renderizando EditorProductosPage');
          return <EditorProductosPage />;
        case 'servicios':
          Logger.log('🔧 AppContent: Renderizando ServiciosPage');
          return <ServiciosListadoPage />;
        case 'editor-servicios':
          Logger.log('🔧 AppContent: Renderizando EditorServiciosPage');
          return <EditorServiciosPage />;
        case 'categorias':
          Logger.log('🔧 AppContent: Renderizando CategoriasPage');
          return <CategoriasListadoPage />;
        case 'clientes':
          Logger.log('🔧 AppContent: Renderizando ClientesListadoPage');
          return <ClientesListadoPage />;
        case 'proveedores':
          Logger.log('🔧 AppContent: Renderizando ProveedoresListadoPage');
          return <ProveedoresListadoPage />;
        case 'informes-cliente':
          Logger.log('🔧 AppContent: Renderizando InformesClientePage');
          return <InformesClientePage />;
        case 'informes-vehiculo':
          Logger.log('🔧 AppContent: Renderizando InformesVehiculoPage');
          return <InformesVehiculoPage />;
        case 'informes-vehiculo-detallado':
          Logger.log('🔧 AppContent: Renderizando InformesVehiculoDetalladoPage');
          return <InformesVehiculoDetalladoPage />;
        case 'informes-cuenta-corriente':
          Logger.log('🔧 AppContent: Renderizando InformesCuentaCorrientePage');
          return <InformesCuentaCorrientePage />;
        case 'importar-productos':
          Logger.log('🔧 AppContent: Renderizando ImportarProductosPage');
          return <ImportarProductosPage />;
        case 'importar-servicios':
          Logger.log('🔧 AppContent: Renderizando ImportarServiciosPage');
          return <ImportarServiciosPage />;
        case 'importar-clientes':
          Logger.log('🔧 AppContent: Renderizando ImportarClientesPage');
          return <ImportarClientesPage />;
        case 'exportar':
          Logger.log('🔧 AppContent: Renderizando ExportarPage');
          return <ExportarPage />;
        case 'configuracion':
          Logger.log('🔧 AppContent: Renderizando ConfiguracionPage');
          return <ConfiguracionPage />;
        case 'configuracion-comprobantes':
          Logger.log('🔧 AppContent: Renderizando ConfiguracionComprobantesPage');
          return <ConfiguracionComprobantesPage />;
        case 'configuracion-formularios':
          Logger.log('🔧 AppContent: Renderizando ConfiguracionFormulariosPage');
          return <ConfiguracionFormulariosPage />;
        case 'configuracion-sistema':
          Logger.log('🔧 AppContent: Renderizando ConfiguracionSistemaPage');
          return <ConfiguracionSistemaPage />;
        case 'pagos':
          Logger.log('🔧 AppContent: Renderizando PagosPage');
          return <PagosPage />;
        default:
          Logger.warn('⚠️ Página no encontrada:', currentPage);
          return <Dashboard />;
      }
    } catch (error) {
      Logger.error('❌ Error renderizando página:', error);
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-2">Error</h2>
            <p className="text-gray-600">Error al cargar la página: {error instanceof Error ? error.message : 'Error desconocido'}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Recargar página
            </button>
          </div>
        </div>
      );
    }
  };

  Logger.log('🔧 AppContent: Verificando estado, isLoading:', isLoading);
  
  // Mostrar error si existe
  if (error) {
    Logger.log('🔧 AppContent: Mostrando pantalla de error:', error);
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-destructive mb-4">Error en la Aplicación</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            Recargar Aplicación
          </button>
        </div>
      </div>
    );
  }
  
  Logger.log('🔧 AppContent: Renderizando aplicación principal');

  // Mostrar pantalla de carga completa mientras se cargan los datos críticos
  if (isLoading) {
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-white flex items-center justify-center p-4" style={{ animation: 'fadeIn 0.3s ease-in' }}>
          <div className="text-center max-w-md w-full px-6">
            {/* Logo y título principal */}
            <div className="mb-8 animate-fade-in">
              <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-red-600 to-red-700 rounded-full flex items-center justify-center shadow-lg">
                <svg className="w-14 h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ animation: 'rotateClockwise 2s linear infinite' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h1 className="text-4xl font-bold text-red-700 mb-3 tracking-tight">Resortes Puerto Montt</h1>
              <p className="text-red-600 text-lg font-medium">Cargando datos del sistema...</p>
            </div>
            
            {/* Spinner de carga */}
            <div className="mb-6">
              <LoadingSpinner size="large" text="Inicializando aplicación" />
            </div>
            
            {/* Barra de progreso visual animada */}
            <div className="w-full bg-red-200 rounded-full h-2 mb-4 overflow-hidden relative">
              <div 
                className="bg-gradient-to-r from-red-500 via-red-600 to-red-500 h-2 rounded-full" 
                style={{ 
                  width: '60%',
                  animation: 'progressSlide 2s ease-in-out infinite',
                  backgroundSize: '200% 100%',
                  backgroundPosition: '0% 0%'
                }}
              ></div>
            </div>
            
            {/* Mensaje informativo */}
            <p className="mt-4 text-sm text-red-600 font-medium">
              Por favor espera mientras se cargan los datos esenciales
            </p>
            <p className="mt-2 text-xs text-red-500 opacity-75">
              Esto solo toma unos segundos...
            </p>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <Toaster position="top-right" richColors closeButton />
      <ManualUsuario isOpen={showManual} onClose={() => setShowManual(false)} />
      <DashboardLayout currentPage={currentPage} onPageChange={handlePageChange}>
        {renderPage()}
      </DashboardLayout>
    </ErrorBoundary>
  );
}

// Componente principal que envuelve con el Provider
function AppNew() {
  Logger.log('🔧 AppNew: Iniciando aplicación');
  
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default AppNew;