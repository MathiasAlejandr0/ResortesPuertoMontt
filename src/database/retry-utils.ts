/**
 * Utilidades para retry logic en operaciones de base de datos
 * Implementa exponential backoff para operaciones que pueden fallar transitoriamente
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryableErrors?: string[];
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 100, // 100ms
  maxDelay: 5000, // 5 segundos
  backoffMultiplier: 2,
  retryableErrors: [
    'SQLITE_BUSY',
    'SQLITE_LOCKED',
    'ETIMEDOUT',
    'ECONNRESET',
    'ENOTFOUND',
  ],
};

/**
 * Retorna true si el error es retryable
 */
function isRetryableError(error: any, retryableErrors: string[]): boolean {
  if (!error) return false;
  
  const errorMessage = error.message || error.toString() || '';
  const errorCode = error.code || '';
  
  return retryableErrors.some(retryable => 
    errorMessage.includes(retryable) || 
    errorCode.includes(retryable) ||
    errorMessage.toLowerCase().includes('timeout') ||
    errorMessage.toLowerCase().includes('busy') ||
    errorMessage.toLowerCase().includes('locked')
  );
}

/**
 * Calcula el delay para el siguiente intento usando exponential backoff
 */
function calculateDelay(attempt: number, initialDelay: number, maxDelay: number, multiplier: number): number {
  const delay = initialDelay * Math.pow(multiplier, attempt);
  return Math.min(delay, maxDelay);
}

/**
 * Ejecuta una función con retry logic y exponential backoff
 * 
 * @param fn - Función a ejecutar (debe retornar una Promise)
 * @param options - Opciones de retry
 * @returns Promise con el resultado de la función
 * 
 * @example
 * ```typescript
 * const result = await retryWithBackoff(
 *   () => dbService.saveCliente(cliente),
 *   { maxRetries: 3, initialDelay: 100 }
 * );
 * ```
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: any;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Si no es el último intento y el error es retryable, intentar de nuevo
      if (attempt < opts.maxRetries && isRetryableError(error, opts.retryableErrors)) {
        const delay = calculateDelay(attempt, opts.initialDelay, opts.maxDelay, opts.backoffMultiplier);
        
        console.warn(
          `[Retry] Intento ${attempt + 1}/${opts.maxRetries + 1} falló. Reintentando en ${delay}ms...`,
          error.message || error
        );
        
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // Si no es retryable o es el último intento, lanzar el error
      throw error;
    }
  }

  // Esto no debería ejecutarse nunca, pero TypeScript lo requiere
  throw lastError;
}

/**
 * Wrapper para operaciones de base de datos con retry automático
 * 
 * @param operation - Nombre de la operación (para logging)
 * @param fn - Función a ejecutar
 * @param options - Opciones de retry
 */
export async function dbOperationWithRetry<T>(
  operation: string,
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  try {
    return await retryWithBackoff(fn, options);
  } catch (error: any) {
    console.error(`[DB Operation Failed] ${operation} falló después de todos los reintentos:`, error);
    throw error;
  }
}

