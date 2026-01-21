import { useState, useEffect } from 'react';
import {
  Home,
  Wrench,
  ShoppingCart,
  DollarSign,
  Package,
  Users,
  FileBarChart,
  Code,
  Settings,
  TrendingUp,
  UserCog,
  CreditCard,
} from "lucide-react";
import SidebarItem from './SidebarItem';

interface SidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

interface MenuItem {
  title: string;
  icon: typeof Wrench;
  subItems: {
    label: string;
    path: string;
  }[];
  defaultPath?: string;
}

interface SingleItem {
  title: string;
  icon: typeof Home;
  path: string;
}

const singleItems: SingleItem[] = [
  { title: "Inicio", icon: Home, path: "dashboard" },
  { title: "Tienda", icon: ShoppingCart, path: "tienda" },
];


const menuItems: MenuItem[] = [
  {
    title: "Taller",
    icon: Wrench,
    subItems: [
      { label: "Órdenes", path: "ordenes" },
      { label: "Presupuestos", path: "cotizaciones" },
      { label: "Calendario", path: "calendario" },
      { label: "Recordatorios", path: "avisos-programados" },
      { label: "Vehículos", path: "vehiculos-registrados" },
      { label: "Histórico", path: "historico" },
    ]
  },
  {
    title: "Caja",
    icon: DollarSign,
    subItems: [
      { label: "Estado de caja", path: "estado-caja" },
      { label: "Cierres", path: "cierres" },
      { label: "Movimientos", path: "movimientos" },
    ]
  },
  {
    title: "Cuentas corrientes",
    icon: CreditCard,
    subItems: [
      { label: "Saldos", path: "saldos" },
      { label: "Movimientos", path: "movimientos-cuentas" },
    ]
  },
  {
    title: "Inventario",
    icon: Package,
    subItems: [
      { label: "Productos", path: "inventario" },
      { label: "Editor de productos", path: "editor-productos" },
      { label: "Servicios", path: "servicios" },
      { label: "Editor de servicios", path: "editor-servicios" },
      { label: "Categorías", path: "categorias" },
    ]
  },
  {
    title: "Trabajadores",
    icon: UserCog,
    subItems: [
      { label: "Trabajadores", path: "trabajadores" },
      { label: "Pagos", path: "pagos-trabajadores" },
      { label: "Score", path: "score-trabajadores" },
    ]
  },
  {
    title: "Contactos",
    icon: Users,
    subItems: [
      { label: "Clientes", path: "clientes" },
      { label: "Proveedores", path: "proveedores" },
    ]
  },
  {
    title: "Gráficas",
    icon: TrendingUp,
    subItems: [
      { label: "General", path: "graficas" },
      { label: "Productos", path: "graficas-productos" },
      { label: "Servicios", path: "graficas-servicios" },
    ]
  },
  {
    title: "Informes",
    icon: FileBarChart,
    subItems: [
      { label: "Histórico por cliente", path: "informes-cliente" },
      { label: "Histórico por Vehículo", path: "informes-vehiculo" },
      { label: "Histórico detallado por Vehículo", path: "informes-vehiculo-detallado" },
      { label: "Estado de cuenta corriente", path: "informes-cuenta-corriente" },
    ]
  },
  {
    title: "Herramientas",
    icon: Code,
    subItems: [
      { label: "Importar productos", path: "importar-productos" },
      { label: "Importar servicios", path: "importar-servicios" },
      { label: "Importar clientes", path: "importar-clientes" },
      { label: "Exportar", path: "exportar" },
    ]
  },
  {
    title: "Configuraciones",
    icon: Settings,
    subItems: [
      { label: "Comprobantes", path: "configuracion-comprobantes" },
      { label: "Formularios", path: "configuracion-formularios" },
      { label: "Sistema", path: "configuracion-sistema" },
    ]
  }
];

export default function SidebarComponent({ currentPage, onPageChange }: SidebarProps) {
  console.log('🔧 Sidebar.tsx: Renderizando sidebar, página actual:', currentPage);

  // Estado para controlar qué módulo está expandido (solo uno a la vez)
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);

  // Auto-expandir el módulo que contiene la página actual
  useEffect(() => {
    const activeModule = menuItems.find(module =>
      module.subItems.some(subItem => subItem.path === currentPage)
    );
    
    if (activeModule) {
      setExpandedMenu(activeModule.title);
    }
  }, [currentPage]);

  // Manejar el toggle de expansión (solo un módulo abierto a la vez)
  const handleToggle = (title: string) => {
    setExpandedMenu(prev => prev === title ? null : title);
  };

  // Manejar cambio de página con lógica especial para "ordenes-nueva"
  const handlePageChange = (path: string) => {
    if (path === "ordenes-nueva") {
      // Redirigir a órdenes y disparar evento para abrir modal
      onPageChange("ordenes");
      // Disparar evento personalizado para abrir el modal de nueva orden
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('app:nueva-orden'));
      }, 100);
    } else {
      onPageChange(path);
    }
  };

  return (
    <div className="flex h-full flex-col gap-4 bg-black px-4 py-4">
      <nav className="flex flex-1 flex-col gap-1.5">
        {/* Items individuales sin submenús */}
        {singleItems.map((item) => (
          <button
            key={item.path}
            onClick={() => handlePageChange(item.path)}
            className={`
              sidebar-item flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium 
              transition-all duration-200
              ${
                currentPage === item.path
                  ? "bg-red-600 text-white shadow-lg"
                  : "bg-transparent text-white hover:bg-gray-800"
              }
            `}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-center flex-1">{item.title}</span>
          </button>
        ))}

        {/* Módulos con sub-menús */}
        {menuItems.map((item) => (
          <SidebarItem
            key={item.title}
            title={item.title}
            icon={item.icon}
            subItems={item.subItems}
            currentPage={currentPage}
            onPageChange={handlePageChange}
            isExpanded={expandedMenu === item.title}
            onToggle={() => handleToggle(item.title)}
            defaultPath={item.defaultPath || item.subItems[0]?.path}
          />
        ))}


      </nav>
    </div>
  );
}