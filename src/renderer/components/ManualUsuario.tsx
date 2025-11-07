import React, { useState } from 'react';
import { X, BookOpen, Rocket, Settings, ShieldCheck, Wrench, Users, FileText, Phone, MessageSquare, Search, BarChart3, Package, DollarSign, Download, Database, HelpCircle, ChevronRight, ChevronDown } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function Section({ title, icon, children, defaultOpen = false }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          {icon}
          <h4 className="font-semibold text-gray-800">{title}</h4>
        </div>
        {isOpen ? (
          <ChevronDown className="h-5 w-5 text-gray-600" />
        ) : (
          <ChevronRight className="h-5 w-5 text-gray-600" />
        )}
      </button>
      {isOpen && (
        <div className="p-4 bg-white">
          {children}
        </div>
      )}
    </div>
  );
}

export default function ManualUsuario({ isOpen, onClose }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-red-600 to-rose-500 flex-shrink-0">
          <div className="flex items-center gap-3 text-white">
            <BookOpen className="h-6 w-6" />
            <div>
              <h2 className="text-lg font-bold leading-none">Manual de Usuario</h2>
              <p className="text-xs opacity-90">Resortes Puerto Montt v1.1.2 - Sistema de Gestión</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/90 hover:text-white transition-colors" title="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Introducción */}
          <section className="bg-gradient-to-r from-red-50 to-rose-50 rounded-lg p-6 border border-red-200">
            <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-3">
              <Rocket className="h-6 w-6 text-red-600" />
              Bienvenido al Sistema de Gestión
            </h3>
            <p className="text-gray-700 mb-4">
              Este manual te guía por todas las funcionalidades del sistema: gestión de clientes, vehículos, cotizaciones, órdenes de trabajo, inventario y más.
            </p>
            <div className="grid md:grid-cols-2 gap-3 mt-4">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Gestión completa de clientes y vehículos</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Cotizaciones y órdenes profesionales</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Control de inventario con alertas</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Dashboard con KPIs en tiempo real</span>
              </div>
            </div>
          </section>

          {/* Navegación Rápida */}
          <section>
            <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Settings className="h-5 w-5 text-red-600" />
              Navegación Rápida
            </h3>
            <div className="grid md:grid-cols-3 gap-3">
              <div className="border rounded-lg p-3 hover:bg-gray-50 transition-colors">
                <div className="font-semibold text-gray-800 mb-1">🏠 Dashboard</div>
                <p className="text-xs text-gray-600">Vista general con KPIs y estadísticas</p>
              </div>
              <div className="border rounded-lg p-3 hover:bg-gray-50 transition-colors">
                <div className="font-semibold text-gray-800 mb-1">👥 Clientes</div>
                <p className="text-xs text-gray-600">Gestión de clientes y vehículos</p>
              </div>
              <div className="border rounded-lg p-3 hover:bg-gray-50 transition-colors">
                <div className="font-semibold text-gray-800 mb-1">📄 Cotizaciones</div>
                <p className="text-xs text-gray-600">Crear y gestionar cotizaciones</p>
              </div>
              <div className="border rounded-lg p-3 hover:bg-gray-50 transition-colors">
                <div className="font-semibold text-gray-800 mb-1">🔧 Órdenes</div>
                <p className="text-xs text-gray-600">Órdenes de trabajo</p>
              </div>
              <div className="border rounded-lg p-3 hover:bg-gray-50 transition-colors">
                <div className="font-semibold text-gray-800 mb-1">📦 Inventario</div>
                <p className="text-xs text-gray-600">Repuestos y servicios</p>
              </div>
              <div className="border rounded-lg p-3 hover:bg-gray-50 transition-colors">
                <div className="font-semibold text-gray-800 mb-1">⚙️ Configuración</div>
                <p className="text-xs text-gray-600">Ajustes y backups</p>
              </div>
            </div>
          </section>

          {/* Secciones Expandibles */}
          <div className="space-y-3">
            <Section
              title="Clientes y Vehículos"
              icon={<Users className="h-5 w-5 text-red-600" />}
              defaultOpen={true}
            >
              <div className="space-y-3">
                <div>
                  <h5 className="font-semibold text-gray-800 mb-2">Crear Nuevo Cliente</h5>
                  <ol className="list-decimal ml-5 space-y-1 text-sm text-gray-700">
                    <li>Ir a <b>Clientes</b> y presionar <b>Nuevo Cliente</b> (o <b>Archivo → Nuevo Cliente</b> / <b>Ctrl+N</b>)</li>
                    <li>Completar: Nombre, RUT, Teléfono, Email (opcional), Dirección (opcional)</li>
                    <li>Hacer clic en <b>Siguiente</b> para agregar vehículos</li>
                    <li>Agregar vehículo: Marca, Modelo, Año, Patente, Color, Kilometraje</li>
                    <li>Hacer clic en <b>Crear</b> para guardar</li>
                  </ol>
                </div>
                <div>
                  <h5 className="font-semibold text-gray-800 mb-2">Editar Cliente</h5>
                  <p className="text-sm text-gray-700">Hacer clic en el botón de editar (✏️) en la lista de clientes</p>
                </div>
                <div>
                  <h5 className="font-semibold text-gray-800 mb-2">Buscar Cliente</h5>
                  <p className="text-sm text-gray-700">Usar la barra de búsqueda superior. Busca por nombre, RUT, teléfono o email.</p>
                </div>
              </div>
            </Section>

            <Section
              title="Cotizaciones"
              icon={<FileText className="h-5 w-5 text-red-600" />}
            >
              <div className="space-y-3">
                <div>
                  <h5 className="font-semibold text-gray-800 mb-2">Crear Cotización</h5>
                  <ol className="list-decimal ml-5 space-y-1 text-sm text-gray-700">
                    <li>Ir a <b>Cotizaciones</b> y presionar <b>Nueva Cotización</b></li>
                    <li><b>Paso 1:</b> Seleccionar cliente y vehículo (o crear nuevos)</li>
                    <li><b>Paso 2:</b> Describir el trabajo a realizar</li>
                    <li><b>Paso 3:</b> Agregar servicios y repuestos (los repuestos muestran <b>Nombre (Categoría)</b>)</li>
                    <li><b>Paso 4:</b> Revisar resumen, ajustar precio final y crear</li>
                  </ol>
                </div>
                <div>
                  <h5 className="font-semibold text-gray-800 mb-2">Ver Cotización</h5>
                  <p className="text-sm text-gray-700 mb-2">Hacer clic en el botón de ver (👁️). Puedes ver:</p>
                  <ul className="list-disc ml-5 space-y-1 text-sm text-gray-700">
                    <li><b>Versión Interna:</b> Muestra todos los precios detallados</li>
                    <li><b>Versión Cliente:</b> Muestra solo trabajo y precio final (sin precios individuales)</li>
                  </ul>
                </div>
                <div>
                  <h5 className="font-semibold text-gray-800 mb-2">Convertir a Orden</h5>
                  <p className="text-sm text-gray-700">Desde la vista de cotización, hacer clic en <b>Crear Orden desde Cotización</b>. Los datos se importan automáticamente.</p>
                </div>
              </div>
            </Section>

            <Section
              title="Órdenes de Trabajo"
              icon={<Wrench className="h-5 w-5 text-red-600" />}
            >
              <div className="space-y-3">
                <div>
                  <h5 className="font-semibold text-gray-800 mb-2">Crear Orden</h5>
                  <ol className="list-decimal ml-5 space-y-1 text-sm text-gray-700">
                    <li>Ir a <b>Órdenes de Trabajo</b> y presionar <b>Nueva Orden</b></li>
                    <li><b>Paso 1:</b> Seleccionar cliente y vehículo</li>
                    <li><b>Paso 2:</b> Describir trabajo, kilometraje, prioridad, técnico asignado</li>
                    <li><b>Paso 3:</b> Agregar servicios y repuestos</li>
                    <li><b>Paso 4:</b> Revisar resumen y crear</li>
                  </ol>
                </div>
                <div>
                  <h5 className="font-semibold text-gray-800 mb-2">Importar desde Cotización</h5>
                  <p className="text-sm text-gray-700">Los datos se importan automáticamente: cliente, vehículo, servicios, repuestos y precio total.</p>
                </div>
                <div>
                  <h5 className="font-semibold text-gray-800 mb-2">Estados</h5>
                  <ul className="list-disc ml-5 space-y-1 text-sm text-gray-700">
                    <li><b>Pendiente:</b> Orden recién creada</li>
                    <li><b>En Proceso:</b> Trabajo en ejecución</li>
                    <li><b>Completada:</b> Trabajo finalizado</li>
                    <li><b>Cancelada:</b> Orden cancelada</li>
                  </ul>
                </div>
              </div>
            </Section>

            <Section
              title="Inventario"
              icon={<Package className="h-5 w-5 text-red-600" />}
            >
              <div className="space-y-3">
                <div>
                  <h5 className="font-semibold text-gray-800 mb-2">Agregar Repuesto</h5>
                  <ol className="list-decimal ml-5 space-y-1 text-sm text-gray-700">
                    <li>Ir a <b>Inventario</b> y presionar <b>Nuevo Repuesto</b></li>
                    <li>Completar: Código (único), Nombre, Descripción, Precio, Stock, Stock Mínimo, Categoría, Marca, Ubicación</li>
                    <li>Hacer clic en <b>Guardar</b></li>
                  </ol>
                </div>
                <div>
                  <h5 className="font-semibold text-gray-800 mb-2">Actualizar Stock</h5>
                  <p className="text-sm text-gray-700">Hacer clic en el botón de stock (📊) en la lista de repuestos. Ingresar cantidad a agregar o quitar.</p>
                </div>
                <div>
                  <h5 className="font-semibold text-gray-800 mb-2">Búsqueda Avanzada</h5>
                  <ul className="list-disc ml-5 space-y-1 text-sm text-gray-700">
                    <li>Busca por: nombre, código, descripción, categoría</li>
                    <li><b>Soporta múltiples términos:</b> Ej: "filtro aceite motor"</li>
                    <li>Los resultados se <b>resaltan en amarillo</b></li>
                    <li>Muestra coincidencias en código, nombre y descripción</li>
                  </ul>
                </div>
                <div>
                  <h5 className="font-semibold text-gray-800 mb-2">Importar desde Excel</h5>
                  <p className="text-sm text-gray-700">Hacer clic en <b>Importar Excel</b> para cargar múltiples repuestos desde un archivo Excel.</p>
                </div>
              </div>
            </Section>

            <Section
              title="Dashboard"
              icon={<BarChart3 className="h-5 w-5 text-red-600" />}
            >
              <div className="space-y-3">
                <div>
                  <h5 className="font-semibold text-gray-800 mb-2">KPIs Principales</h5>
                  <ul className="list-disc ml-5 space-y-1 text-sm text-gray-700">
                    <li><b>💰 Ingresos del Mes:</b> Total de órdenes completadas este mes</li>
                    <li><b>📋 Órdenes Pendientes:</b> Órdenes en estado pendiente o en progreso</li>
                    <li><b>👥 Clientes Activos:</b> Total de clientes activos</li>
                    <li><b>📦 Stock Bajo:</b> Repuestos con stock por debajo del mínimo</li>
                  </ul>
                </div>
                <div>
                  <h5 className="font-semibold text-gray-800 mb-2">Gráfico de Ventas</h5>
                  <p className="text-sm text-gray-700">Muestra ingresos por mes. Gráfico interactivo con hover para ver detalles.</p>
                </div>
                <div>
                  <h5 className="font-semibold text-gray-800 mb-2">Órdenes Recientes</h5>
                  <p className="text-sm text-gray-700">Muestra las últimas 5 órdenes creadas. Clic en orden para ver detalles completos.</p>
                </div>
              </div>
            </Section>

            <Section
              title="Búsqueda Avanzada"
              icon={<Search className="h-5 w-5 text-red-600" />}
            >
              <div className="space-y-3">
                <div>
                  <h5 className="font-semibold text-gray-800 mb-2">Búsqueda en Clientes</h5>
                  <p className="text-sm text-gray-700">Barra de búsqueda superior. Busca en: nombre, RUT, teléfono, email. Resultados en tiempo real.</p>
                </div>
                <div>
                  <h5 className="font-semibold text-gray-800 mb-2">Búsqueda en Inventario</h5>
                  <ul className="list-disc ml-5 space-y-1 text-sm text-gray-700">
                    <li>Búsqueda full-text avanzada (FTS5)</li>
                    <li>Busca en: nombre, código, descripción, categoría</li>
                    <li><b>Soporta múltiples términos:</b> "filtro aceite motor"</li>
                    <li><b>Resaltado de coincidencias</b> en amarillo</li>
                    <li>Paginación: carga 100 resultados inicialmente</li>
                  </ul>
                </div>
              </div>
            </Section>

            <Section
              title="Exportación de Documentos"
              icon={<Download className="h-5 w-5 text-red-600" />}
            >
              <div className="space-y-3">
                <div>
                  <h5 className="font-semibold text-gray-800 mb-2">Versión Interna</h5>
                  <p className="text-sm text-gray-700">Muestra todos los precios detallados, desglose de servicios y repuestos, precios unitarios y subtotales.</p>
                </div>
                <div>
                  <h5 className="font-semibold text-gray-800 mb-2">Versión Cliente</h5>
                  <p className="text-sm text-gray-700">Muestra descripción del trabajo, repuestos necesarios (sin precios), y <b>solo precio final total</b>.</p>
                </div>
                <div>
                  <h5 className="font-semibold text-gray-800 mb-2">Enviar por WhatsApp</h5>
                  <ol className="list-decimal ml-5 space-y-1 text-sm text-gray-700">
                    <li>Ver cotización u orden (botón 👁️)</li>
                    <li>Hacer clic en <b>Enviar por WhatsApp</b> (botón 📱)</li>
                    <li>Ingresar número de teléfono del cliente</li>
                    <li>Se abrirá WhatsApp Web con el mensaje preformateado</li>
                  </ol>
                </div>
              </div>
            </Section>

            <Section
              title="Backups y Seguridad"
              icon={<Database className="h-5 w-5 text-red-600" />}
            >
              <div className="space-y-3">
                <div>
                  <h5 className="font-semibold text-gray-800 mb-2">Backups Automáticos</h5>
                  <p className="text-sm text-gray-700">El sistema crea backups automáticos cada 24 horas. Se guardan en la carpeta de backups del sistema.</p>
                </div>
                <div>
                  <h5 className="font-semibold text-gray-800 mb-2">Backup Manual</h5>
                  <p className="text-sm text-gray-700 mb-2">Opciones para crear backup:</p>
                  <ul className="list-disc ml-5 space-y-1 text-sm text-gray-700">
                    <li><b>Archivo → Crear Backup</b> (o <b>Ctrl+B</b>)</li>
                    <li>Ir a <b>Configuración → Backups</b> y hacer clic en "Crear Backup"</li>
                  </ul>
                </div>
                <div>
                  <h5 className="font-semibold text-gray-800 mb-2">Restaurar Backup</h5>
                  <p className="text-sm text-gray-700">Ir a <b>Configuración → Backups</b>, seleccionar backup y hacer clic en "Restaurar". ⚠️ Se reemplazará la base de datos actual.</p>
                </div>
                <div>
                  <h5 className="font-semibold text-gray-800 mb-2">Desinstalación</h5>
                  <p className="text-sm text-gray-700">Al desinstalar, puedes elegir <b>conservar datos</b> (mantiene BD y backups) o <b>eliminar datos</b> (borra todo).</p>
                </div>
              </div>
            </Section>

            <Section
              title="Atajos de Teclado"
              icon={<Settings className="h-5 w-5 text-red-600" />}
            >
              <div className="space-y-2">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm font-medium text-gray-700">Nuevo Cliente</span>
                  <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">Ctrl+N</kbd>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm font-medium text-gray-700">Crear Backup</span>
                  <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">Ctrl+B</kbd>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm font-medium text-gray-700">Manual de Usuario</span>
                  <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">F1</kbd>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm font-medium text-gray-700">Recargar</span>
                  <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">F5</kbd>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm font-medium text-gray-700">Pantalla Completa</span>
                  <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">F11</kbd>
                </div>
              </div>
            </Section>

            <Section
              title="Solución de Problemas"
              icon={<HelpCircle className="h-5 w-5 text-red-600" />}
            >
              <div className="space-y-3">
                <div>
                  <h5 className="font-semibold text-gray-800 mb-2">Los formularios no responden</h5>
                  <p className="text-sm text-gray-700">Cerrar y volver a abrir el formulario. Si persiste, reiniciar la aplicación.</p>
                </div>
                <div>
                  <h5 className="font-semibold text-gray-800 mb-2">La búsqueda es lenta</h5>
                  <p className="text-sm text-gray-700">Usar búsqueda específica con múltiples términos. Esperar 200ms después de escribir.</p>
                </div>
                <div>
                  <h5 className="font-semibold text-gray-800 mb-2">Error al guardar</h5>
                  <p className="text-sm text-gray-700">Verificar que todos los campos requeridos estén completos. Revisar formato de datos (RUT, teléfono). Verificar que no haya duplicados.</p>
                </div>
                <div>
                  <h5 className="font-semibold text-gray-800 mb-2">Backup no se crea</h5>
                  <p className="text-sm text-gray-700">Verificar espacio en disco y permisos de escritura. Crear backup manual desde Configuración.</p>
                </div>
              </div>
            </Section>
          </div>

          {/* Soporte */}
          <section className="bg-blue-50 rounded-lg p-6 border border-blue-200 mt-6">
            <h4 className="font-semibold text-gray-800 flex items-center gap-2 mb-3">
              <Phone className="h-5 w-5 text-blue-600" />
              Soporte Técnico
            </h4>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-700 mb-1"><b>Email:</b> mathias.jara@hotmail.com</p>
                <p className="text-gray-700"><b>Desarrollador:</b> Mathias Jara</p>
              </div>
              <div>
                <p className="text-gray-700 mb-1"><b>Versión:</b> 1.1.2</p>
                <p className="text-gray-700"><b>Base de datos:</b> SQLite</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
