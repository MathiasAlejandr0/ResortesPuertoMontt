/**
 * Sistema de caché para KPIs del Dashboard
 * Evita recalcular constantemente los mismos valores
 */

interface KPICacheEntry {
  data: any;
  timestamp: number;
  ttl: number; // Time to live en milisegundos
}

export class KPICache {
  private cache = new Map<string, KPICacheEntry>();
  private defaultTTL = 60000; // 60 segundos por defecto

  /**
   * Obtiene un valor del caché si aún es válido
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      // Expiró, eliminar
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Guarda un valor en el caché
   */
  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    });
  }

  /**
   * Limpia el caché
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Limpia entradas expiradas
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Genera una clave de caché basada en dependencias
   */
  static generateKey(prefix: string, dependencies: any[]): string {
    const depsHash = dependencies
      .map(dep => {
        if (Array.isArray(dep)) {
          return `${dep.length}-${dep.slice(0, 3).map((item: any) => item?.id || item).join(',')}`;
        }
        return dep?.id || dep?.length || dep || '';
      })
      .join('|');
    return `${prefix}:${depsHash}`;
  }
}

// Instancia singleton
export const kpiCache = new KPICache();

// Limpiar caché cada 5 minutos
if (typeof window !== 'undefined') {
  setInterval(() => {
    kpiCache.cleanup();
  }, 5 * 60 * 1000);
}

