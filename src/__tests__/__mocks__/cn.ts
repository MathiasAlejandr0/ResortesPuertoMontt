// Mock para cn.ts que resuelve el problema de import.meta
export function cn(...inputs: any[]) {
  return inputs.join(' ');
}

export function formatearRUT(value: string): string {
  return value;
}

const isDev = true;

// Logger simplificado que llama directamente a console para que los spies funcionen
export const Logger = {
  log: (...args: any[]) => {
    if (isDev) {
      console.log(...args);
    }
  },
  error: (...args: any[]) => {
    console.error(...args);
  },
  warn: (...args: any[]) => {
    if (isDev) {
      console.warn(...args);
    }
  },
  info: (...args: any[]) => {
    if (isDev) {
      console.info(...args);
    }
  }
};

export const notify = {
  success: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warning: jest.fn(),
};

export const confirmAction = jest.fn(() => Promise.resolve(true));

export const Validation = {
  rut: (rut: string) => {
    if (!rut) return { valido: true };
    
    const rutLimpio = rut.replace(/[^0-9kK]/g, '');
    if (rutLimpio.length < 8) {
      return { valido: false, mensaje: 'El RUT debe tener al menos 8 dígitos' };
    }
    
    const cuerpo = rutLimpio.slice(0, -1);
    const dv = rutLimpio.slice(-1).toUpperCase();
    
    let suma = 0;
    let multiplicador = 2;
    
    for (let i = cuerpo.length - 1; i >= 0; i--) {
      suma += parseInt(cuerpo[i]) * multiplicador;
      multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
    }
    
    const resto = suma % 11;
    const dvCalculado = resto === 0 ? '0' : resto === 1 ? 'K' : (11 - resto).toString();
    
    if (dv !== dvCalculado) {
      return { valido: false, mensaje: 'El dígito verificador del RUT no es válido' };
    }
    
    return { valido: true };
  },
  
  email: (email: string) => {
    if (!email) return { valido: true };
    
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      return { valido: false, mensaje: 'El formato del email no es válido' };
    }
    
    return { valido: true };
  },
  
  telefono: (telefono: string) => {
    if (!telefono) return { valido: true };
    
    const telefonoLimpio = telefono.replace(/[^0-9]/g, '');
    if (telefonoLimpio.length < 8 || telefonoLimpio.length > 9) {
      return { valido: false, mensaje: 'El teléfono debe tener entre 8 y 9 dígitos' };
    }
    
    return { valido: true };
  },
  
  patente: (patente: string) => {
    if (!patente || !patente.trim()) {
      return { valido: false, mensaje: 'La patente es requerida' };
    }
    
    const patenteAntigua = /^[A-Z]{4}[0-9]{2}$/;
    const patenteNueva = /^[0-9]{4}[A-Z]{2}$/;
    
    const patenteUpper = patente.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    if (patenteAntigua.test(patenteUpper) || patenteNueva.test(patenteUpper)) {
      return { valido: true };
    }
    
    return { valido: false, mensaje: 'El formato de la patente no es válido (ej: ABCD12 o 1234AB)' };
  },
  
  precio: (precio: number | string) => {
    const precioNumero = typeof precio === 'string' 
      ? Number(precio.replace(/[^0-9.]/g, '')) 
      : precio;
    
    if (isNaN(precioNumero) || precioNumero <= 0) {
      return { valido: false, mensaje: 'El precio debe ser un número mayor a 0' };
    }
    
    return { valido: true };
  },
  
  requerido: (valor: any, nombreCampo: string) => {
    if (!valor || (typeof valor === 'string' && !valor.trim())) {
      return { valido: false, mensaje: `${nombreCampo} es requerido` };
    }
    
    return { valido: true };
  }
};

