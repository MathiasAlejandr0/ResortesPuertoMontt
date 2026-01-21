import { ChevronDown, LucideIcon } from 'lucide-react';

interface SubItem {
  label: string;
  path: string;
}

interface SidebarItemProps {
  title: string;
  icon: LucideIcon;
  subItems: SubItem[];
  currentPage: string;
  onPageChange: (page: string) => void;
  isExpanded: boolean;
  onToggle: () => void;
  defaultPath?: string;
}

export default function SidebarItem({
  title,
  icon: Icon,
  subItems,
  currentPage,
  onPageChange,
  isExpanded,
  onToggle,
  defaultPath,
}: SidebarItemProps) {
  // Verificar si algún sub-item está activo
  const hasActiveSubItem = subItems.some(item => currentPage === item.path);

  return (
    <div className="flex flex-col">
      {/* Botón principal del módulo */}
      <button
        onClick={() => {
          onToggle();
          if (defaultPath) {
            onPageChange(defaultPath);
          }
        }}
        className={`
          sidebar-item flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm font-medium 
          transition-all duration-200 w-full
          ${
            hasActiveSubItem
              ? "bg-red-600 text-white shadow-lg"
              : "bg-transparent text-white hover:bg-gray-800"
          }
        `}
      >
        <div className="flex items-center gap-3 flex-1">
          <Icon className="h-5 w-5 flex-shrink-0" />
          <span className="text-center flex-1">{title}</span>
        </div>
        <ChevronDown
          className={`h-4 w-4 flex-shrink-0 transition-transform duration-300 ease-in-out text-white ${
            isExpanded ? 'rotate-180' : 'rotate-0'
          }`}
        />
      </button>

      {/* Sub-menús desplegables */}
      <div
        className={`
          overflow-hidden transition-all duration-300 ease-in-out
          ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}
        `}
      >
        {isExpanded && (
          <div className="bg-black rounded-lg mt-1 py-1">
            <div className="flex flex-col gap-0.5">
              {subItems.map((subItem) => {
                const isActive = currentPage === subItem.path;
                return (
                  <button
                    key={subItem.path}
                    onClick={() => onPageChange(subItem.path)}
                    className={`
                      flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium 
                      transition-all duration-200 text-left w-full
                      ${
                        isActive
                          ? "bg-gray-800 text-white font-semibold"
                          : "bg-transparent text-white hover:bg-gray-800"
                      }
                    `}
                  >
                    <span className="flex-1 text-left">{subItem.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
