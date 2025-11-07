import { useState } from 'react';
import { X, CreditCard, DollarSign, Calendar } from 'lucide-react';
import { OrdenTrabajo } from '../types';
import { Button } from './ui/button';
import { notify, Logger } from '../utils/cn';

interface FinalizarOrdenModalProps {
  isOpen: boolean;
  onClose: () => void;
  orden: OrdenTrabajo | null;
  onFinalizar: (orden: OrdenTrabajo, metodoPago: 'Efectivo' | 'Débito' | 'Crédito', numeroCuotas?: number, fechaPago?: string, fechasCuotas?: string[]) => Promise<void>;
}

export default function FinalizarOrdenModal({
  isOpen,
  onClose,
  orden,
  onFinalizar
}: FinalizarOrdenModalProps) {
  const [metodoPago, setMetodoPago] = useState<'Efectivo' | 'Débito' | 'Crédito'>('Efectivo');
  const [numeroCuotas, setNumeroCuotas] = useState<number>(1);
  const [fechasPago, setFechasPago] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen || !orden) return null;

  const handleMetodoPagoChange = (metodo: 'Efectivo' | 'Débito' | 'Crédito') => {
    setMetodoPago(metodo);
    if (metodo !== 'Crédito') {
      setFechasPago([]);
      setNumeroCuotas(1);
    }
  };

  const handleNumeroCuotasChange = (cuotas: number) => {
    Logger.debug('📅 FinalizarOrdenModal: Cambiando número de cuotas a:', cuotas);
    setNumeroCuotas(cuotas);
    // Generar fechas de pago automáticamente (una por mes)
    const fechas: string[] = [];
    const hoy = new Date();
    for (let i = 0; i < cuotas; i++) {
      const fecha = new Date(hoy);
      fecha.setMonth(hoy.getMonth() + i);
      fechas.push(fecha.toISOString().split('T')[0]);
    }
    Logger.debug('📅 FinalizarOrdenModal: Fechas generadas:', fechas);
    setFechasPago(fechas);
  };

  const handleFechaPagoChange = (index: number, fecha: string) => {
    Logger.debug(`📅 FinalizarOrdenModal: Cambiando fecha de cuota ${index + 1} a:`, fecha);
    const nuevasFechas = [...fechasPago];
    nuevasFechas[index] = fecha;
    Logger.debug('📅 FinalizarOrdenModal: Nuevas fechas:', nuevasFechas);
    setFechasPago(nuevasFechas);
  };

  const handleSubmit = async () => {
    if (metodoPago === 'Crédito') {
      if (numeroCuotas < 1) {
        notify.error('Error', 'El número de cuotas debe ser al menos 1');
        return;
      }
      if (fechasPago.length !== numeroCuotas || fechasPago.some(f => !f)) {
        Logger.error('❌ FinalizarOrdenModal: Error de validación de fechas:', {
          numeroCuotas,
          fechasPagoLength: fechasPago.length,
          fechasPago,
          todasCompletas: fechasPago.every(f => !!f)
        });
        notify.error('Error', 'Debe completar todas las fechas de pago');
        return;
      }
    }

    Logger.debug('💾 FinalizarOrdenModal: Enviando datos de finalización:', {
      metodoPago,
      numeroCuotas,
      fechasPagoLength: fechasPago.length,
      fechasPago,
      ordenId: orden?.id,
      ordenNumero: orden?.numero
    });

    setIsLoading(true);
    try {
      // Para crédito, usar la primera fecha de pago como fecha principal
      const fechaPagoPrincipal = metodoPago === 'Crédito' ? fechasPago[0] : new Date().toISOString().split('T')[0];
      const fechasCuotasParaEnviar = metodoPago === 'Crédito' ? fechasPago : undefined;
      
      Logger.debug('💾 FinalizarOrdenModal: Llamando a onFinalizar con:', {
        metodoPago,
        numeroCuotas: metodoPago === 'Crédito' ? numeroCuotas : undefined,
        fechaPagoPrincipal,
        fechasCuotas: fechasCuotasParaEnviar
      });
      
      await onFinalizar(
        orden, 
        metodoPago, 
        metodoPago === 'Crédito' ? numeroCuotas : undefined, 
        fechaPagoPrincipal,
        fechasCuotasParaEnviar
      );
      // Resetear formulario
      setMetodoPago('Efectivo');
      setNumeroCuotas(1);
      setFechasPago([]);
      onClose();
    } catch (error) {
      console.error('Error finalizando orden:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            Finalizar Orden de Trabajo {orden.numero}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Cerrar modal"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Información de la orden */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Total a pagar</p>
            <p className="text-2xl font-bold text-gray-900">
              ${(orden.total || 0).toLocaleString('es-CL')}
            </p>
          </div>

          {/* Método de pago */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Método de Pago *
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => handleMetodoPagoChange('Efectivo')}
                className={`flex flex-col items-center justify-center p-4 border-2 rounded-lg transition-all ${
                  metodoPago === 'Efectivo'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <DollarSign className={`h-8 w-8 mb-2 ${metodoPago === 'Efectivo' ? 'text-blue-500' : 'text-gray-400'}`} />
                <span className="font-medium">Efectivo</span>
              </button>
              <button
                type="button"
                onClick={() => handleMetodoPagoChange('Débito')}
                className={`flex flex-col items-center justify-center p-4 border-2 rounded-lg transition-all ${
                  metodoPago === 'Débito'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <CreditCard className={`h-8 w-8 mb-2 ${metodoPago === 'Débito' ? 'text-blue-500' : 'text-gray-400'}`} />
                <span className="font-medium">Débito</span>
              </button>
              <button
                type="button"
                onClick={() => handleMetodoPagoChange('Crédito')}
                className={`flex flex-col items-center justify-center p-4 border-2 rounded-lg transition-all ${
                  metodoPago === 'Crédito'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <CreditCard className={`h-8 w-8 mb-2 ${metodoPago === 'Crédito' ? 'text-blue-500' : 'text-gray-400'}`} />
                <span className="font-medium">Crédito</span>
              </button>
            </div>
          </div>

          {/* Campos adicionales para crédito */}
          {metodoPago === 'Crédito' && (
            <div className="space-y-4 border-t pt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número de Cuotas *
                </label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={numeroCuotas}
                  onChange={(e) => handleNumeroCuotasChange(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fechas de Pago *
                </label>
                <div className="space-y-2">
                  {fechasPago.map((fecha, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 w-20">Cuota {index + 1}:</span>
                      <input
                        type="date"
                        value={fecha}
                        onChange={(e) => handleFechaPagoChange(index, e.target.value)}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? 'Finalizando...' : 'Finalizar Orden'}
          </Button>
        </div>
      </div>
    </div>
  );
}

