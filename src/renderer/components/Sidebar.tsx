import {
  LayoutDashboard,
  Users,
  Wrench,
  FileText,
  Package,
  Settings,
  CreditCard,
} from "lucide-react";

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
      <div className="flex items-center gap-3 px-2 pb-2 border-b border-sidebar-border">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20">
          <Wrench className="h-7 w-7 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-sidebar-foreground">Resortes Puerto Montt</h1>
          <p className="text-xs text-muted-foreground">Gestión de Taller</p>
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