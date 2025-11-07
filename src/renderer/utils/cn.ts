import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { toast as sonnerToast } from 'sonner'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ==========================================
// SISTEMA DE LOGGING CENTRALIZADO
// ==========================================
const isDev = import.meta.env.DEV || process.env.NODE_ENV === 'development';
const isProduction = !isDev;

// Niveles de log ordenados por prioridad
type LogLevel = 'debug' | 'info' | 'warn' | 'error';
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Obtener nivel mínimo de log desde variables de entorno
function getMinLogLevel(): LogLevel {
  // En el renderer, solo usar import.meta.env (Vite)
  // process.env no está disponible en el navegador
  const envLevel = (import.meta.env.VITE_LOG_LEVEL || '').toLowerCase() as LogLevel;
  if (envLevel && LOG_LEVELS.hasOwnProperty(envLevel)) {
    return envLevel;
  }
  // En producción: solo info, warn, error (no debug)
  // En desarrollo: todos los niveles
  return isProduction ? 'info' : 'debug';
}

const minLogLevel = getMinLogLevel();

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[minLogLevel];
}

export const Logger = {
  debug: (...args: any[]) => {
    if (shouldLog('debug')) {
      if (isDev) {
        console.debug('[DEBUG]', ...args);
      }
    }
  },
  log: (...args: any[]) => {
    // Alias para info para compatibilidad
    Logger.info(...args);
  },
  info: (...args: any[]) => {
    if (shouldLog('info')) {
      if (isDev || import.meta.env.VITE_LOG_CONSOLE === 'true') {
        console.info('[INFO]', ...args);
      }
    }
  },
  warn: (...args: any[]) => {
    if (shouldLog('warn')) {
      // Warnings siempre se muestran (son importantes)
      console.warn('[WARN]', ...args);
    }
  },
  error: (...args: any[]) => {
    // Errores siempre se registran (son críticos)
    console.error('[ERROR]', ...args);
    // En producción, aquí se podría enviar a un servicio de tracking
  }
};

// ==========================================
// UTILIDADES DE RUT CHILENO
// ==========================================

/**
 * Formatea un RUT chileno automáticamente mientras el usuario escribe
 * Formato: XX.XXX.XXX-X
 * @param value - El valor del input (puede tener o no formato)
 * @returns El RUT formateado con puntos y guión
 */
export function formatearRUT(value: string): string {
  // Remover todo excepto números y la letra K (para RUTs que terminan en K)
  let rut = value.replace(/[^0-9kK]/g, '').toUpperCase();
  
  // Si está vacío, retornar vacío
  if (!rut) return '';
  
  // Si tiene menos de 2 caracteres, retornar sin formato
  if (rut.length < 2) return rut;
  
  // Separar el dígito verificador (último carácter)
  let cuerpo = rut.slice(0, -1);
  let dv = rut.slice(-1);
  
  // Si el cuerpo está vacío, solo retornar el dígito verificador
  if (!cuerpo) return dv;
  
  // Formatear el cuerpo con puntos cada 3 dígitos desde la derecha
  // Ejemplo: 12345678 -> 12.345.678
  let cuerpoFormateado = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  
  // Retornar cuerpo formateado + guión + dígito verificador
  return `${cuerpoFormateado}-${dv}`;
}

/**
 * Limpia el formato de un RUT (remueve puntos y guión)
 * @param rut - RUT formateado o sin formato
 * @returns RUT sin formato (solo números y dígito verificador)
 */
export function limpiarRUT(rut: string): string {
  return rut.replace(/[^0-9kK]/g, '').toUpperCase();
}

/**
 * Valida si un RUT tiene el formato correcto
 * @param rut - RUT a validar (puede estar formateado o no)
 * @returns true si el formato es válido
 */
export function validarFormatoRUT(rut: string): boolean {
  if (!rut) return false;
  
  // Limpiar el RUT
  const rutLimpio = limpiarRUT(rut);
  
  // Debe tener al menos 8 caracteres (7 dígitos + 1 dígito verificador)
  // y máximo 9 caracteres (8 dígitos + 1 dígito verificador)
  if (rutLimpio.length < 8 || rutLimpio.length > 9) return false;
  
  // El último carácter debe ser un número o K
  const dv = rutLimpio.slice(-1);
  if (!/^[0-9K]$/.test(dv)) return false;
  
  // El resto debe ser solo números
  const cuerpo = rutLimpio.slice(0, -1);
  if (!/^\d+$/.test(cuerpo)) return false;
  
  return true;
}

// ==========================================
// SISTEMA DE NOTIFICACIONES (Toast)
// ==========================================
export const notify = {
  success: (message: string, description?: string) => {
    sonnerToast.success(message, {
      description,
      duration: 3000,
    });
  },
  error: (message: string, description?: string) => {
    sonnerToast.error(message, {
      description,
      duration: 5000,
    });
  },
  info: (message: string, description?: string) => {
    sonnerToast.info(message, {
      description,
      duration: 3000,
    });
  },
  warning: (message: string, description?: string) => {
    sonnerToast.warning(message, {
      description,
      duration: 4000,
    });
  }
};

// ==========================================
// CONFIRMACIÓN MEJORADA
// ==========================================
export const confirmAction = async (message: string, description?: string): Promise<boolean> => {
  return new Promise((resolve) => {
    // Usar el toast para mostrar un mensaje y luego usar confirm nativo
    // (En una versión futura se podría usar un modal personalizado)
    const result = window.confirm(description ? `${message}\n\n${description}` : message);
    resolve(result);
  });
};

// ==========================================
// VALIDACIÓN CENTRALIZADA
// ==========================================
export const Validation = {
  // Validar RUT chileno
  rut: (rut: string): { valido: boolean; mensaje?: string } => {
    if (!rut || !rut.trim()) return { valido: true }; // Permitir RUT vacío
    
    const rutLimpio = rut.replace(/[^0-9kK]/g, '');
    
    // Validar longitud mínima
    if (rutLimpio.length < 8) {
      return { valido: false, mensaje: 'El RUT debe tener al menos 8 dígitos (ej: 12.345.678-9)' };
    }
    
    // Validar longitud máxima (9 dígitos: 8 números + 1 dígito verificador)
    if (rutLimpio.length > 9) {
      return { valido: false, mensaje: 'El RUT no puede tener más de 9 dígitos' };
    }
    
    const cuerpo = rutLimpio.slice(0, -1);
    const dv = rutLimpio.slice(-1).toUpperCase();
    
    // Validar que el cuerpo sea solo números
    if (!/^\d+$/.test(cuerpo)) {
      return { valido: false, mensaje: 'El RUT solo puede contener números y un dígito verificador (0-9 o K)' };
    }
    
    // Validar que el dígito verificador sea válido
    if (!/^[0-9K]$/.test(dv)) {
      return { valido: false, mensaje: 'El dígito verificador debe ser un número (0-9) o la letra K' };
    }
    
    // Calcular dígito verificador
    let suma = 0;
    let multiplicador = 2;
    
    for (let i = cuerpo.length - 1; i >= 0; i--) {
      suma += parseInt(cuerpo[i]) * multiplicador;
      multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
    }
    
    const resto = suma % 11;
    const dvCalculado = resto === 0 ? '0' : resto === 1 ? 'K' : (11 - resto).toString();
    
    if (dv !== dvCalculado) {
      return { 
        valido: false, 
        mensaje: `El dígito verificador no es válido. Debería ser ${dvCalculado}, pero ingresaste ${dv}. Verifica el RUT.` 
      };
    }
    
    return { valido: true };
  },
  
  // Validar email
  email: (email: string): { valido: boolean; mensaje?: string } => {
    if (!email) return { valido: true }; // Permitir email vacío
    
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      return { valido: false, mensaje: 'El formato del email no es válido' };
    }
    
    return { valido: true };
  },
  
  // Validar teléfono chileno
  telefono: (telefono: string): { valido: boolean; mensaje?: string } => {
    if (!telefono) return { valido: true }; // Permitir teléfono vacío
    
    const telefonoLimpio = telefono.replace(/[^0-9]/g, '');
    if (telefonoLimpio.length < 8 || telefonoLimpio.length > 9) {
      return { valido: false, mensaje: 'El teléfono debe tener entre 8 y 9 dígitos' };
    }
    
    return { valido: true };
  },
  
  // Validar patente chilena
  patente: (patente: string): { valido: boolean; mensaje?: string } => {
    if (!patente || !patente.trim()) {
      return { valido: false, mensaje: 'La patente es requerida' };
    }
    
    // Patente antigua: 4 letras + 2 números (ej: ABCD12)
    // Patente nueva: 4 números + 2 letras (ej: 1234AB)
    const patenteAntigua = /^[A-Z]{4}[0-9]{2}$/;
    const patenteNueva = /^[0-9]{4}[A-Z]{2}$/;
    
    const patenteUpper = patente.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    if (patenteAntigua.test(patenteUpper) || patenteNueva.test(patenteUpper)) {
      return { valido: true };
    }
    
    return { valido: false, mensaje: 'El formato de la patente no es válido (ej: ABCD12 o 1234AB)' };
  },
  
  // Validar precio (número positivo)
  precio: (precio: number | string): { valido: boolean; mensaje?: string } => {
    const precioNumero = typeof precio === 'string' 
      ? Number(precio.replace(/[^0-9.]/g, '')) 
      : precio;
    
    if (isNaN(precioNumero) || precioNumero <= 0) {
      return { valido: false, mensaje: 'El precio debe ser un número mayor a 0' };
    }
    
    return { valido: true };
  },
  
  // Validar campo requerido
  requerido: (valor: any, nombreCampo: string): { valido: boolean; mensaje?: string } => {
    if (!valor || (typeof valor === 'string' && !valor.trim())) {
      return { valido: false, mensaje: `${nombreCampo} es requerido` };
    }
    
    return { valido: true };
  }
};