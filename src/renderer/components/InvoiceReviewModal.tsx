/**
 * InvoiceReviewModal - Modal de revisión de factura escaneada
 * 
 * Muestra:
 * - Imagen original a la izquierda (con zoom)
 * - Tabla de datos extraídos a la derecha
 * - Resaltado amarillo para filas con baja confianza
 * 
 * @author Mathias Jara
 * @version 1.1.2
 */

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { X, ZoomIn, ZoomOut, RotateCw, Check, AlertTriangle, Edit2 } from 'lucide-react';
import { ScannedItem } from '../../main/services/InvoiceParserService';

interface InvoiceReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (items: ScannedItem[]) => void;
  items: ScannedItem[];
  imagenOriginal?: string; // Base64 o URL
  imagenProcesada?: string; // Base64 o URL
  isLoading?: boolean;
  sourceType?: 'pdf' | 'image'; // Tipo de origen
}

export default function InvoiceReviewModal({
  isOpen,
  onClose,
  onConfirm,
  items,
  imagenOriginal,
  imagenProcesada,
  isLoading = false,
  sourceType = 'image',
}: InvoiceReviewModalProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [editingItem, setEditingItem] = useState<number | null>(null);
  const [editedItems, setEditedItems] = useState<InvoiceItem[]>(items);
  const [showProcessed, setShowProcessed] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);

  // Sincronizar items editados cuando cambian los items originales
  React.useEffect(() => {
    setEditedItems(items);
  }, [items]);

  if (!isOpen) return null;

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.5));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  const handleEditItem = (index: number) => {
    setEditingItem(index);
  };

  const handleSaveEdit = (index: number, field: keyof ScannedItem, value: string | number) => {
    const updated = [...editedItems];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setEditedItems(updated);
    setEditingItem(null);
  };

  const handleRemoveItem = (index: number) => {
    setEditedItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleConfirm = () => {
    onConfirm(editedItems);
  };

  const imagenActual = showProcessed && imagenProcesada ? imagenProcesada : imagenOriginal;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="icon-blue rounded-xl p-2">
              <Edit2 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Revisar Factura Escaneada</h2>
              <p className="text-sm text-gray-600">
                {editedItems.length} items extraídos • {editedItems.filter(i => i.confidence < 0.8).length} requieren revisión
                {sourceType === 'pdf' && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                    Lectura Digital (100% Precisión)
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Cerrar modal"
            disabled={isLoading}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Panel Izquierdo: Imagen (solo para imágenes, no PDFs) */}
          {sourceType === 'image' && imagenActual && (
            <div className="w-1/2 border-r border-gray-200 flex flex-col bg-gray-50">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowProcessed(!showProcessed)}
                  className="text-xs"
                >
                  {showProcessed ? 'Ver Original' : 'Ver Procesada'}
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleZoomOut}
                  disabled={zoom <= 0.5}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm text-gray-600 min-w-[60px] text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleZoomIn}
                  disabled={zoom >= 3}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRotate}
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
              {imagenActual ? (
                <img
                  ref={imageRef}
                  src={imagenActual}
                  alt="Factura escaneada"
                  className="max-w-full max-h-full object-contain transition-transform"
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    transformOrigin: 'center',
                  }}
                />
              ) : (
                <div className="text-center text-gray-500">
                  <p>No hay imagen disponible</p>
                </div>
              )}
            </div>
          </div>
          )}

          {/* Panel Derecho: Tabla de Items */}
          <div className={`${sourceType === 'image' && imagenActual ? 'w-1/2' : 'w-full'} flex flex-col overflow-hidden`}>
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Items Extraídos</h3>
              <p className="text-xs text-gray-600 mt-1">
                Revisa y edita los datos antes de confirmar
              </p>
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="p-4 space-y-2">
                {editedItems.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <AlertTriangle className="h-12 w-12 mx-auto mb-2 text-yellow-500" />
                    <p>No se encontraron items en la factura</p>
                  </div>
                ) : (
                  editedItems.map((item, index) => (
                    <Card
                      key={index}
                      className={`${
                        item.confidence < 0.8
                          ? 'bg-yellow-50 border-yellow-300'
                          : 'bg-white'
                      } transition-colors`}
                    >
                      <CardContent className="p-4">
                        <div className="grid grid-cols-12 gap-2 items-start">
                          {/* Código */}
                          <div className="col-span-2">
                            <label className="text-xs text-gray-600 mb-1 block">Código</label>
                            {editingItem === index ? (
                              <Input
                                value={item.rawCode}
                                onChange={(e) => handleSaveEdit(index, 'rawCode', e.target.value)}
                                className="h-8 text-xs"
                                onBlur={() => setEditingItem(null)}
                                autoFocus
                              />
                            ) : (
                              <div
                                className="text-sm font-mono cursor-pointer hover:bg-gray-100 p-1 rounded"
                                onClick={() => handleEditItem(index)}
                              >
                                {item.rawCode}
                              </div>
                            )}
                          </div>

                          {/* Descripción */}
                          <div className="col-span-5">
                            <label className="text-xs text-gray-600 mb-1 block">Descripción</label>
                            {editingItem === index ? (
                              <Input
                                value={item.description}
                                onChange={(e) => handleSaveEdit(index, 'description', e.target.value)}
                                className="h-8 text-xs"
                                onBlur={() => setEditingItem(null)}
                              />
                            ) : (
                              <div
                                className="text-sm cursor-pointer hover:bg-gray-100 p-1 rounded"
                                onClick={() => handleEditItem(index)}
                              >
                                {item.description}
                              </div>
                            )}
                          </div>

                          {/* Cantidad */}
                          <div className="col-span-1">
                            <label className="text-xs text-gray-600 mb-1 block">Cant.</label>
                            {editingItem === index ? (
                              <Input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => handleSaveEdit(index, 'quantity', parseFloat(e.target.value) || 0)}
                                className="h-8 text-xs"
                                onBlur={() => setEditingItem(null)}
                              />
                            ) : (
                              <div
                                className="text-sm cursor-pointer hover:bg-gray-100 p-1 rounded"
                                onClick={() => handleEditItem(index)}
                              >
                                {item.quantity}
                              </div>
                            )}
                          </div>

                          {/* Precio */}
                          <div className="col-span-2">
                            <label className="text-xs text-gray-600 mb-1 block">Precio</label>
                            {editingItem === index ? (
                              <Input
                                type="number"
                                value={item.unitPrice}
                                onChange={(e) => handleSaveEdit(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                className="h-8 text-xs"
                                onBlur={() => setEditingItem(null)}
                              />
                            ) : (
                              <div
                                className="text-sm cursor-pointer hover:bg-gray-100 p-1 rounded"
                                onClick={() => handleEditItem(index)}
                              >
                                ${item.unitPrice.toLocaleString('es-CL')}
                              </div>
                            )}
                          </div>

                          {/* Confianza */}
                          <div className="col-span-1">
                            <label className="text-xs text-gray-600 mb-1 block">Conf.</label>
                            <div className="text-xs">
                              <div
                                className={`inline-block px-1 rounded ${
                                  item.confidence >= 0.8
                                    ? 'bg-green-100 text-green-800'
                                    : item.confidence >= 0.6
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {Math.round(item.confidence * 100)}%
                              </div>
                            </div>
                          </div>

                          {/* Acciones */}
                          <div className="col-span-1 flex items-center justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveItem(index)}
                              className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {item.confidence < 0.8 && (
                          <div className="mt-2 flex items-center gap-2 text-xs text-yellow-700">
                            <AlertTriangle className="h-3 w-3" />
                            <span>Revisión recomendada - Baja confianza</span>
                          </div>
                        )}
                        {item.source === 'pdf' && (
                          <div className="mt-1 flex items-center gap-2 text-xs text-green-700">
                            <Check className="h-3 w-3" />
                            <span>Lectura Digital (100% Precisión)</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Total: {editedItems.length} items • 
            Subtotal: ${editedItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0).toLocaleString('es-CL')}
          </div>
          <div className="flex gap-3">
            <Button
              onClick={onClose}
              variant="outline"
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isLoading || editedItems.length === 0}
              className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Procesando...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Confirmar ({editedItems.length} items)
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
