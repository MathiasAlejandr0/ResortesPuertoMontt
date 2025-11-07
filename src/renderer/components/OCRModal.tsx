import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { X, Upload, Camera, FileText, AlertCircle } from 'lucide-react';

interface OCRModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProcessOCR: (file: File) => void;
}

export default function OCRModal({ isOpen, onClose, onProcessOCR }: OCRModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleProcessOCR = async () => {
    if (!selectedFile) return;
    
    setIsProcessing(true);
    try {
      await onProcessOCR(selectedFile);
      onClose();
      setSelectedFile(null);
    } catch (error) {
      console.error('Error procesando OCR:', error);
      alert('Error al procesar la imagen. Por favor, inténtalo de nuevo.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="icon-blue rounded-xl p-2">
              <Camera className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Escanear Factura</h2>
              <p className="text-sm text-gray-600">Sube una imagen de la factura para extraer los repuestos</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Cerrar modal"
            disabled={isProcessing}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Área de subida de archivo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Seleccionar Imagen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="ocr-file-input"
                  disabled={isProcessing}
                />
                <label
                  htmlFor="ocr-file-input"
                  className="cursor-pointer flex flex-col items-center gap-3"
                >
                  {selectedFile ? (
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="h-12 w-12 text-blue-600" />
                      <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                      <p className="text-xs text-gray-500">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <Upload className="h-12 w-12 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Haz clic para seleccionar una imagen
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Formatos soportados: JPG, PNG, PDF
                        </p>
                      </div>
                    </div>
                  )}
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Información sobre el OCR */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                ¿Cómo funciona?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span>Sube una imagen clara de la factura</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span>El sistema extraerá automáticamente los repuestos</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span>Los items se agregarán al inventario</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span>Puedes revisar y editar los datos antes de guardar</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Botones */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleClose}
              variant="outline"
              className="flex-1"
              disabled={isProcessing}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleProcessOCR}
              disabled={!selectedFile || isProcessing}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Procesando...
                </>
              ) : (
                <>
                  <Camera className="h-4 w-4" />
                  Procesar Imagen
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
