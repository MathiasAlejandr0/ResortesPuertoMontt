import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { 
  X, 
  Save, 
  Package, 
  DollarSign, 
  MapPin,
  AlertCircle
} from 'lucide-react';
import { Repuesto } from '../types';

interface EditarRepuestoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (repuesto: Repuesto) => void;
  repuesto: Repuesto | null;
}

export default function EditarRepuestoModal({ 
  isOpen, 
  onClose, 
  onSave, 
  repuesto 
}: EditarRepuestoModalProps) {
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    descripcion: '',
    precio: 0,
    stock: 0,
    stockMinimo: 0,
    categoria: '',
    marca: '',
    ubicacion: ''
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (repuesto && isOpen) {
      setFormData({
        codigo: repuesto.codigo || '',
        nombre: repuesto.nombre || '',
        descripcion: repuesto.descripcion || '',
        precio: repuesto.precio || 0,
        stock: repuesto.stock || 0,
        // Si stockMinimo es 0 o null, usar 5 como valor por defecto
        stockMinimo: repuesto.stockMinimo && repuesto.stockMinimo > 0 ? repuesto.stockMinimo : 5,
        categoria: repuesto.categoria || '',
        marca: repuesto.marca || '',
        ubicacion: repuesto.ubicacion || ''
      });
    }
  }, [repuesto, isOpen]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Asegurar que stockMinimo tenga un valor válido (5 por defecto si es 0 o null)
      const stockMinimoFinal = formData.stockMinimo && formData.stockMinimo > 0 ? formData.stockMinimo : 5;
      
      const repuestoActualizado: Repuesto = {
        ...repuesto!,
        ...formData,
        stockMinimo: stockMinimoFinal
      };
      
      await onSave(repuestoActualizado);
      onClose();
    } catch (error) {
      console.error('Error guardando repuesto:', error);
      alert('Error al guardar el repuesto');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !repuesto) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            Editar Repuesto
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
          {/* Información Básica */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Información Básica
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Código/SKU
                  </label>
                  <input
                    type="text"
                    value={formData.codigo}
                    onChange={(e) => handleInputChange('codigo', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Código del repuesto"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre
                  </label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => handleInputChange('nombre', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Nombre del repuesto"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoría
                  </label>
                  <input
                    type="text"
                    value={formData.categoria}
                    onChange={(e) => handleInputChange('categoria', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Categoría del repuesto"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Marca
                  </label>
                  <input
                    type="text"
                    value={formData.marca}
                    onChange={(e) => handleInputChange('marca', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Marca del repuesto"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => handleInputChange('descripcion', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Descripción del repuesto"
                />
              </div>
            </CardContent>
          </Card>

          {/* Información de Stock y Precio */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Stock y Precio
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Precio Unitario
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.precio === 0 ? '' : formData.precio}
                    onChange={(e) => handleInputChange('precio', e.target.value === '' ? 0 : parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Precio"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stock Actual
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.stock === 0 ? '' : formData.stock}
                    onChange={(e) => handleInputChange('stock', e.target.value === '' ? 0 : parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Stock actual"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cantidad Mínima para Alerta
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.stockMinimo === 0 ? '' : formData.stockMinimo}
                    onChange={(e) => handleInputChange('stockMinimo', e.target.value === '' ? 0 : parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="5 (por defecto)"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    El sistema avisará cuando el stock esté por debajo de esta cantidad. Si no se especifica, el valor por defecto es 5.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ubicación */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Ubicación
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ubicación en Almacén
                </label>
                <input
                  type="text"
                  value={formData.ubicacion}
                  onChange={(e) => handleInputChange('ubicacion', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Ej: Estante A1, Almacén Exterior"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700"
          >
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      </div>
    </div>
  );
}
