import { useEffect, useRef, useCallback } from 'react';
import { Logger } from '../utils/cn';

interface UseAutoSaveOptions {
  key: string;
  data: any;
  enabled?: boolean;
  debounceMs?: number;
  onRestore?: (data: any) => void;
}

/**
 * Hook para auto-guardar el estado de formularios en localStorage
 * Restaura automáticamente los datos cuando se vuelve a abrir el formulario
 */
export function useAutoSave({ 
  key, 
  data, 
  enabled = true,
  debounceMs = 500,
  onRestore 
}: UseAutoSaveOptions) {
  const storageKey = `autosave_${key}`;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRestoredRef = useRef(false);

  // Función para guardar datos
  const save = useCallback((dataToSave: any) => {
    if (!enabled) return;
    
    try {
      const serialized = JSON.stringify(dataToSave);
      localStorage.setItem(storageKey, serialized);
      Logger.log(`💾 Auto-guardado: ${key}`);
    } catch (error) {
      Logger.error(`Error guardando auto-save para ${key}:`, error);
    }
  }, [enabled, storageKey, key]);

  // Función para restaurar datos
  const restore = useCallback(() => {
    if (!enabled || isRestoredRef.current) return null;
    
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        isRestoredRef.current = true;
        Logger.log(`📂 Restaurando auto-guardado: ${key}`);
        if (onRestore) {
          onRestore(parsed);
        }
        return parsed;
      }
    } catch (error) {
      Logger.error(`Error restaurando auto-save para ${key}:`, error);
    }
    return null;
  }, [enabled, storageKey, key, onRestore]);

  // Función para limpiar datos guardados
  const clear = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      isRestoredRef.current = false;
      Logger.log(`🗑️ Limpiando auto-guardado: ${key}`);
    } catch (error) {
      Logger.error(`Error limpiando auto-save para ${key}:`, error);
    }
  }, [storageKey, key]);

  // Restaurar automáticamente cuando se habilita (formulario se abre)
  useEffect(() => {
    if (enabled && !isRestoredRef.current) {
      restore();
    }
  }, [enabled, restore]);

  // Auto-guardar con debounce cuando cambian los datos
  useEffect(() => {
    if (!enabled) return;

    // Limpiar timeout anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Guardar después del debounce
    timeoutRef.current = setTimeout(() => {
      save(data);
    }, debounceMs);

    // Limpiar timeout al desmontar
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, enabled, save, debounceMs]);

  // Guardar antes de que la página se cierre o se suspenda
  useEffect(() => {
    if (!enabled) return;

    const handleBeforeUnload = () => {
      save(data);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        save(data);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [data, enabled, save]);

  return { restore, clear, save };
}
