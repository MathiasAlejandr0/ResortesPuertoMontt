/**
 * Hook para obtener información del negocio desde la configuración
 * 
 * @author Mathias Jara
 * @version 1.0.0
 */

import { useState, useEffect } from 'react';

export interface NegocioInfo {
  nombreTaller: string;
  rut: string;
  direccion: string;
  telefono: string;
  email: string;
  sitioWeb: string;
}

const DEFAULT_NEGOCIO_INFO: NegocioInfo = {
  nombreTaller: 'Resortes Puerto Montt',
  rut: '12.345.678-9',
  direccion: 'Av. Principal 123, Puerto Montt',
  telefono: '+56 9 1234 5678',
  email: 'info@resortespuertomontt.cl',
  sitioWeb: 'www.resortespuertomontt.cl'
};

/**
 * Hook para obtener y usar información del negocio
 * Carga los datos desde la configuración guardada en la base de datos
 */
export function useNegocioInfo() {
  const [negocioInfo, setNegocioInfo] = useState<NegocioInfo>(DEFAULT_NEGOCIO_INFO);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cargarNegocioInfo = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Obtener todas las configuraciones
        const configs = await window.electronAPI.getAllConfiguracion();
        
        // Buscar la configuración del negocio
        const negocioConfig = configs.find((c: any) => c.clave === 'negocio_info');
        
        if (negocioConfig) {
          try {
            const info = JSON.parse(negocioConfig.valor);
            setNegocioInfo(info);
          } catch (parseError) {
            console.error('Error parseando información del negocio:', parseError);
            setError('Error al leer información del negocio');
            // Usar valores por defecto si hay error al parsear
            setNegocioInfo(DEFAULT_NEGOCIO_INFO);
          }
        } else {
          // No hay configuración guardada, usar valores por defecto
          setNegocioInfo(DEFAULT_NEGOCIO_INFO);
        }
      } catch (err) {
        console.error('Error cargando información del negocio:', err);
        setError('Error al cargar información del negocio');
        // Usar valores por defecto en caso de error
        setNegocioInfo(DEFAULT_NEGOCIO_INFO);
      } finally {
        setIsLoading(false);
      }
    };

    cargarNegocioInfo();
  }, []);

  return {
    negocioInfo,
    isLoading,
    error,
    // Helper para obtener solo el nombre del taller
    nombreTaller: negocioInfo.nombreTaller,
    // Helper para obtener solo el teléfono
    telefonoTaller: negocioInfo.telefono,
    // Helper para obtener solo el email
    emailTaller: negocioInfo.email,
    // Helper para obtener RUT
    rutTaller: negocioInfo.rut,
    // Helper para obtener dirección
    direccionTaller: negocioInfo.direccion,
    // Helper para obtener sitio web
    sitioWebTaller: negocioInfo.sitioWeb,
  };
}
