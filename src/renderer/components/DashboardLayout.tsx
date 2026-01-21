import { useState } from 'react'
import { Menu, X, ChevronDown } from 'lucide-react'
import SidebarComponent from './Sidebar'
import GlobalSearch from './GlobalSearch'
import NotificationsPanel from './NotificationsPanel'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Button } from './ui/button'
import { Sheet, SheetContent } from './ui/sheet'
import { useIsMobile } from '../hooks/use-mobile'
import { cn } from '../utils/cn'
import logoResortes from '../../../assets/logo-resortes.png'
import { SearchResult } from '../services/GlobalSearchService'
import { GlobalSearchService } from '../services/GlobalSearchService'

interface DashboardLayoutProps {
  currentPage: string
  onPageChange: (page: string) => void
  children: React.ReactNode
}

// Mapeo de páginas a títulos
const pageTitles: Record<string, string> = {
  dashboard: 'Dashboard',
  ordenes: 'Órdenes',
  cotizaciones: 'Presupuestos',
  calendario: 'Calendario',
  historico: 'Histórico',
  'vehiculos-registrados': 'Vehículos',
  'avisos-programados': 'Recordatorios',
  tienda: 'Ventas',
  compras: 'Compras',
  ventas: 'Ventas',
  'estado-caja': 'Estado de caja',
  cierres: 'Cierres de caja',
  movimientos: 'Movimientos',
  'cuentas-corrientes': 'Cuentas corrientes',
  saldos: 'Saldos',
  'movimientos-cuentas': 'Movimientos de cuentas',
  inventario: 'Productos',
  servicios: 'Servicios',
  categorias: 'Categorías',
  'editor-productos': 'Editor de productos',
  'editor-servicios': 'Editor de servicios',
  trabajadores: 'Trabajadores',
  comisiones: 'Comisiones',
  'pagos-trabajadores': 'Pagos',
  'score-trabajadores': 'Score',
  clientes: 'Clientes',
  proveedores: 'Proveedores',
  graficas: 'Gráficas',
  'graficas-productos': 'Gráficas de productos',
  'graficas-servicios': 'Gráficas de servicios',
  'informes-cliente': 'Histórico por cliente',
  'informes-vehiculo': 'Histórico por Vehículo',
  'informes-vehiculo-detallado': 'Histórico detallado por Vehículo',
  'informes-cuenta-corriente': 'Estado de cuenta corriente',
  'importar-productos': 'Importar productos',
  'importar-servicios': 'Importar servicios',
  'importar-clientes': 'Importar clientes',
  exportar: 'Exportar',
  tutoriales: 'Tutoriales',
  configuracion: 'Configuraciones',
  'configuracion-comprobantes': 'Comprobantes',
  'configuracion-formularios': 'Formularios',
  'configuracion-sistema': 'Sistema',
  perfil: 'Mi Perfil',
}

export default function DashboardLayout({
  currentPage,
  onPageChange,
  children,
}: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const isMobile = useIsMobile()

  const pageTitle = pageTitles[currentPage] || 'Resortes Puerto Montt'

  const handleSearchResultClick = (result: SearchResult) => {
    const page = GlobalSearchService.getPageForType(result.type)
    onPageChange(page)
    
    // Cerrar drawer móvil si está abierto
    if (isMobile) {
      setMobileMenuOpen(false)
    }
    
    // Disparar evento para que la página pueda abrir el item específico
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('app:search-result', {
        detail: result
      }))
    }, 100)
  }

  const handlePageChange = (page: string) => {
    onPageChange(page)
    // Cerrar drawer móvil al cambiar de página
    if (isMobile) {
      setMobileMenuOpen(false)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar Desktop */}
      <aside
        className={cn(
          "hidden lg:flex flex-col border-r border-gray-800 bg-black transition-all duration-300 ease-in-out",
          sidebarCollapsed ? "w-20" : "w-64"
        )}
      >
        {/* Logo Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-800">
          {!sidebarCollapsed && (
            <div className="flex items-center justify-center w-full">
              <img
                src={logoResortes}
                alt="Resortes Puerto Montt"
                className="h-12 w-auto object-contain"
                loading="eager"
              />
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="h-8 w-8"
          >
            {sidebarCollapsed ? (
              <Menu className="h-4 w-4" />
            ) : (
              <X className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Sidebar Navigation */}
        <div className="flex-1 overflow-y-auto">
          <SidebarComponent
            currentPage={currentPage}
            onPageChange={onPageChange}
          />
        </div>
      </aside>

      {/* Sidebar Mobile - Drawer */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-64 p-0 bg-sidebar border-sidebar-border">
          <div className="flex flex-col h-full">
            {/* Logo Header */}
            <div className="flex items-center justify-center px-4 py-4 border-b border-sidebar-border">
              <img
                src={logoResortes}
                alt="Resortes Puerto Montt"
                className="h-12 w-auto object-contain"
                loading="eager"
              />
            </div>

            {/* Sidebar Navigation */}
            <div className="flex-1 overflow-y-auto">
              <SidebarComponent
                currentPage={currentPage}
                onPageChange={handlePageChange}
              />
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 border-b border-border bg-white shadow-sm flex items-center justify-between px-4 md:px-6 sticky top-0 z-40">
          {/* Left: Mobile Menu Button + Page Title */}
          <div className="flex items-center gap-4 flex-1">
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden h-9 w-9"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-lg md:text-xl font-semibold text-foreground">
              {pageTitle}
            </h1>
          </div>

          {/* Right: Search, Notifications, User Menu */}
          <div className="flex items-center gap-4">
            {/* Global Search */}
            <div className="hidden md:block">
              <GlobalSearch onResultClick={handleSearchResultClick} />
            </div>

            {/* Notifications */}
            <NotificationsPanel
              notifications={[]}
              onMarkAsRead={(id) => {
                // TODO: Implementar lógica para marcar como leída
                console.log('Marcar notificación como leída:', id);
              }}
              onMarkAllAsRead={() => {
                // TODO: Implementar lógica para marcar todas como leídas
                console.log('Marcar todas las notificaciones como leídas');
              }}
              onClearAll={() => {
                // TODO: Implementar lógica para limpiar todas
                console.log('Limpiar todas las notificaciones');
              }}
            />

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 h-auto py-1.5 px-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="" alt="Usuario" />
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                      RM
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden md:block text-sm font-medium">Usuario</span>
                  <ChevronDown className="h-4 w-4 hidden md:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-white border border-gray-200 shadow-lg">
                <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onPageChange('perfil')}>
                  Perfil
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onPageChange('configuracion')}>
                  Configuración
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-destructive"
                  onClick={() => {
                    if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
                      // TODO: Implementar lógica de cierre de sesión
                      console.log('Cerrando sesión...');
                    }
                  }}
                >
                  Cerrar Sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50">
          <div className="h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
