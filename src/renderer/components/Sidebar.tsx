import {
  LayoutDashboard,
  Users,
  Wrench,
  FileText,
  Package,
  Settings,
  CreditCard,
} from "lucide-react";
import iconLogo from '../../../assets/icon.png';

interface SidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

const navigation = [
  { name: "Dashboard", href: "dashboard", icon: LayoutDashboard },
  { name: "Clientes", href: "clientes", icon: Users },
  { name: "Cotizaciones", href: "cotizaciones", icon: FileText },
  { name: "Órdenes de Trabajo", href: "ordenes", icon: Wrench },
  { name: "Pagos", href: "pagos", icon: CreditCard },
  { name: "Inventario", href: "inventario", icon: Package },
  { name: "Configuración", href: "configuracion", icon: Settings },
];

export default function SidebarComponent({ currentPage, onPageChange }: SidebarProps) {
  console.log('🔧 Sidebar.tsx: Renderizando sidebar, página actual:', currentPage);

  return (
    <div className="flex h-full flex-col gap-6 bg-sidebar px-4 py-6">
      <div className="flex items-center justify-center px-3 pb-5 border-b border-sidebar-border">
        <div className="flex h-24 w-full max-w-[200px] items-center justify-center rounded-2xl bg-white shadow-xl shadow-primary/25 overflow-hidden px-4 py-3">
          <img 
            src={iconLogo} 
            alt="Resortes Puerto Montt" 
            className="h-auto w-full max-h-full object-contain"
            style={{ 
              imageRendering: 'auto',
              WebkitImageRendering: 'optimizeQuality',
              objectFit: 'contain'
            }}
            loading="eager"
          />
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1.5">
        {navigation.map((item) => {
          const isActive = currentPage === item.href;
          return (
            <button
              key={item.name}
              onClick={() => onPageChange(item.href)}
              className={`sidebar-item flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "active bg-sidebar-accent text-sidebar-accent-foreground shadow-lg shadow-primary/10"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground hover:shadow-md hover:shadow-primary/5"
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </button>
          );
        })}
      </nav>
    </div>
  );
}