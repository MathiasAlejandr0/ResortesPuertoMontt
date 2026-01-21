/**
 * Servicio de búsqueda global que busca en todas las entidades del sistema
 */

export interface SearchResult {
  type: 'cliente' | 'orden' | 'repuesto' | 'vehiculo' | 'cotizacion';
  id: number | string;
  title: string;
  subtitle?: string;
  description?: string;
  metadata?: Record<string, any>;
}

export class GlobalSearchService {
  /**
   * Busca en todas las entidades del sistema
   */
  static async searchAll(searchTerm: string): Promise<SearchResult[]> {
    if (!searchTerm || searchTerm.trim().length < 2) {
      return [];
    }

    const term = searchTerm.trim().toLowerCase();
    const results: SearchResult[] = [];

    try {
      // Buscar clientes
      if (window.electronAPI?.searchClientes) {
        const clientes = await window.electronAPI.searchClientes(term);
        clientes.forEach((cliente: any) => {
          results.push({
            type: 'cliente',
            id: cliente.id,
            title: cliente.nombre || 'Sin nombre',
            subtitle: cliente.rut || cliente.telefono || '',
            description: cliente.direccion || cliente.email || '',
            metadata: { cliente },
          });
        });
      }

      // Buscar repuestos
      if (window.electronAPI?.searchRepuestos) {
        const repuestos = await window.electronAPI.searchRepuestos(term);
        repuestos.forEach((repuesto: any) => {
          results.push({
            type: 'repuesto',
            id: repuesto.id,
            title: repuesto.nombre || 'Sin nombre',
            subtitle: repuesto.codigo || `SKU-${repuesto.id}`,
            description: repuesto.descripcion || repuesto.categoria || '',
            metadata: { repuesto },
          });
        });
      }

      // Buscar órdenes (búsqueda local en memoria)
      // Nota: Si hay muchas órdenes, podría ser mejor hacer búsqueda en BD
      if (window.electronAPI?.getOrdenesTrabajo) {
        const ordenes = await window.electronAPI.getOrdenesTrabajo();
        const filtered = ordenes.filter((orden: any) => {
          const searchFields = [
            orden.numero,
            orden.descripcion,
            orden.tecnicoAsignado,
          ].filter(Boolean).map((f: string) => f.toLowerCase());
          
          return searchFields.some(field => field.includes(term));
        });

        filtered.forEach((orden: any) => {
          results.push({
            type: 'orden',
            id: orden.id,
            title: orden.numero || `OT-${orden.id}`,
            subtitle: orden.estado || 'Pendiente',
            description: orden.descripcion || '',
            metadata: { orden },
          });
        });
      }

      // Ordenar resultados por relevancia (título primero, luego subtítulo)
      results.sort((a, b) => {
        const aTitleMatch = a.title.toLowerCase().includes(term);
        const bTitleMatch = b.title.toLowerCase().includes(term);
        
        if (aTitleMatch && !bTitleMatch) return -1;
        if (!aTitleMatch && bTitleMatch) return 1;
        
        return a.title.localeCompare(b.title);
      });

      // Limitar a 20 resultados
      return results.slice(0, 20);
    } catch (error) {
      console.error('Error en búsqueda global:', error);
      return [];
    }
  }

  /**
   * Obtiene el icono para cada tipo de resultado
   */
  static getIconForType(type: SearchResult['type']): string {
    switch (type) {
      case 'cliente':
        return '👤';
      case 'orden':
        return '🔧';
      case 'repuesto':
        return '📦';
      case 'vehiculo':
        return '🚗';
      case 'cotizacion':
        return '📄';
      default:
        return '🔍';
    }
  }

  /**
   * Obtiene el color para cada tipo de resultado
   */
  static getColorForType(type: SearchResult['type']): string {
    switch (type) {
      case 'cliente':
        return 'text-red-600';
      case 'orden':
        return 'text-orange-600';
      case 'repuesto':
        return 'text-green-600';
      case 'vehiculo':
        return 'text-purple-600';
      case 'cotizacion':
        return 'text-indigo-600';
      default:
        return 'text-gray-600';
    }
  }

  /**
   * Obtiene la página a la que navegar según el tipo de resultado
   */
  static getPageForType(type: SearchResult['type']): string {
    switch (type) {
      case 'cliente':
        return 'clientes';
      case 'orden':
        return 'ordenes';
      case 'repuesto':
        return 'inventario';
      case 'vehiculo':
        return 'clientes'; // Los vehículos se muestran en la página de clientes
      case 'cotizacion':
        return 'cotizaciones';
      default:
        return 'dashboard';
    }
  }
}
