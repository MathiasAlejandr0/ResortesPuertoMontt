/**
 * Tests para KPICache - Sistema de caché de KPIs
 */

import { KPICache, kpiCache } from '../../renderer/utils/kpi-cache';

describe('KPICache', () => {
  let cache: KPICache;

  beforeEach(() => {
    cache = new KPICache();
    cache.clear();
  });

  it('debería guardar y recuperar valores', () => {
    cache.set('test-key', { value: 100 }, 10000);
    const result = cache.get('test-key');
    
    expect(result).toEqual({ value: 100 });
  });

  it('debería retornar null para claves inexistentes', () => {
    const result = cache.get('non-existent');
    expect(result).toBeNull();
  });

  it('debería retornar null para valores expirados', (done) => {
    cache.set('expired-key', { value: 50 }, 100); // 100ms TTL
    
    setTimeout(() => {
      const result = cache.get('expired-key');
      expect(result).toBeNull();
      done();
    }, 150);
  });

  it('debería mantener valores válidos dentro del TTL', (done) => {
    cache.set('valid-key', { value: 75 }, 500); // 500ms TTL
    
    setTimeout(() => {
      const result = cache.get('valid-key');
      expect(result).toEqual({ value: 75 });
      done();
    }, 200);
  });

  it('debería limpiar el caché completamente', () => {
    cache.set('key1', { value: 1 });
    cache.set('key2', { value: 2 });
    
    cache.clear();
    
    expect(cache.get('key1')).toBeNull();
    expect(cache.get('key2')).toBeNull();
  });

  it('debería limpiar solo entradas expiradas en cleanup', (done) => {
    cache.set('expired', { value: 1 }, 100);
    cache.set('valid', { value: 2 }, 500);
    
    setTimeout(() => {
      cache.cleanup();
      
      expect(cache.get('expired')).toBeNull();
      expect(cache.get('valid')).toEqual({ value: 2 });
      done();
    }, 150);
  });

  it('generateKey debería generar claves únicas', () => {
    const key1 = KPICache.generateKey('test', [1, 2, 3]);
    const key2 = KPICache.generateKey('test', [1, 2, 3]);
    const key3 = KPICache.generateKey('test', [4, 5, 6]);
    
    expect(key1).toBe(key2); // Mismas dependencias
    expect(key1).not.toBe(key3); // Diferentes dependencias
  });

  it('generateKey debería manejar arrays', () => {
    const key1 = KPICache.generateKey('test', [[1, 2, 3]]);
    const key2 = KPICache.generateKey('test', [[1, 2, 3]]);
    
    expect(key1).toBe(key2);
  });

  it('debería usar TTL por defecto cuando no se especifica', (done) => {
    cache.set('default-ttl', { value: 100 });
    
    // El TTL por defecto es 60000ms, así que debería estar disponible
    setTimeout(() => {
      const result = cache.get('default-ttl');
      expect(result).toEqual({ value: 100 });
      done();
    }, 100);
  });

  it('kpiCache singleton debería estar disponible', () => {
    expect(kpiCache).toBeInstanceOf(KPICache);
  });
});

