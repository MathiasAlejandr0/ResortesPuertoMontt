import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { X, Plus, Minus, Package, AlertCircle } from 'lucide-react';
import { Repuesto } from '../types';

interface StockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  repuesto: Repuesto | null;
  action: 'aumentar' | 'reducir';
  cantidad: number;
  setCantidad: (cantidad: number) => void;
  isLoading: boolean;
}

export default function StockModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  repuesto, 
  action, 
  cantidad, 
  setCantidad, 
  isLoading 
}: StockModalProps) {
  if (!isOpen || !repuesto) return null;

  const stockActual = repuesto.stock || 0;
  const nuevoStock = action === 'aumentar' 
    ? stockActual + cantidad 
    : stockActual - cantidad;

  const handleClose = () => {
    setCantidad(1);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className={`rounded-xl p-2 ${action === 'aumentar' ? 'icon-green' : 'icon-red'}`}>
              {action === 'aumentar' ? (
                <Plus className="h-6 w-6" />
              ) : (
                <Minus className="h-6 w-6" />
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {action === 'aumentar' ? 'Aumentar Stock' : 'Reducir Stock'}
              </h2>
              <p className="text-sm text-gray-600">
                {repuesto.nombre}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Cerrar modal"
            disabled={isLoading}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Información del repuesto */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Información del Repuesto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div>
                    <span className="text-sm text-gray-500">Stock actual:</span>
                    <p className="text-lg font-semibold text-gray-900">{stockActual}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Código:</span>
                    <p className="font-medium text-gray-900">{repuesto.codigo || 'Sin código'}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm text-gray-500">Categoría:</span>
                    <p className="font-medium text-gray-900">{repuesto.categoria || 'Sin categoría'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Marca:</span>
                    <p className="font-medium text-gray-900">{repuesto.marca || 'Sin marca'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Controles de cantidad */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {action === 'aumentar' ? (
                  <Plus className="h-5 w-5 text-green-600" />
                ) : (
                  <Minus className="h-5 w-5 text-red-600" />
                )}
                Cantidad a {action === 'aumentar' ? 'agregar' : 'reducir'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center gap-4">
                <Button
                  onClick={() => setCantidad(Math.max(1, cantidad - 1))}
                  variant="outline"
                  size="sm"
                  disabled={isLoading || cantidad <= 1}
                  className="p-3"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <div className="text-center">
                  <input
                    type="number"
                    min="1"
                    value={cantidad}
                    onChange={(e) => setCantidad(Math.max(1, parseInt(e.target.value) || 1))}
                    className="text-3xl font-bold text-center border-0 bg-transparent focus:outline-none focus:ring-0 w-20"
                    disabled={isLoading}
                  />
                  <p className="text-sm text-gray-500 mt-1">unidades</p>
                </div>
                <Button
                  onClick={() => setCantidad(cantidad + 1)}
                  variant="outline"
                  size="sm"
                  disabled={isLoading}
                  className="p-3"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Vista previa del resultado */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Resumen de Cambios
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Stock actual:</span>
                  <span className="text-lg font-medium text-gray-900">{stockActual}</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm text-gray-600">
                    {action === 'aumentar' ? 'Cantidad a agregar:' : 'Cantidad a reducir:'}
                  </span>
                  <span className={`text-lg font-medium ${
                    action === 'aumentar' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {action === 'aumentar' ? '+' : '-'}{cantidad}
                  </span>
                </div>
                <div className="border-t border-gray-200 mt-3 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">Nuevo stock:</span>
                    <span className={`text-xl font-bold ${
                      action === 'aumentar' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {nuevoStock}
                    </span>
                  </div>
                </div>
                {action === 'reducir' && nuevoStock < 0 && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      ⚠️ No se puede reducir el stock por debajo de 0
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Botones */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleClose}
              variant="outline"
              className="flex-1"
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              onClick={onConfirm}
              disabled={isLoading || (action === 'reducir' && nuevoStock < 0)}
              className={`flex-1 text-white flex items-center justify-center gap-2 ${
                action === 'aumentar' 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Procesando...
                </>
              ) : (
                <>
                  {action === 'aumentar' ? (
                    <Plus className="h-4 w-4" />
                  ) : (
                    <Minus className="h-4 w-4" />
                  )}
                  Confirmar Cambio
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
