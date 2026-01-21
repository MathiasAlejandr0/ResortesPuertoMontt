import { useState } from 'react';
import { Search } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import OCRModal from '../components/OCRModal';
import InvoiceReviewModal from '../components/InvoiceReviewModal';
import { useApp } from '../contexts/AppContext';
import { notify, confirmAction } from '../utils/cn';

export default function ProductosPage() {
  const { refreshRepuestos } = useApp();
  const [filterBy, setFilterBy] = useState('Nombre');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchBy, setSearchBy] = useState('Nom,ID,Cod');
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isUploadingExcel, setIsUploadingExcel] = useState(false);
  const [isOCRModalOpen, setIsOCRModalOpen] = useState(false);
  const [isInvoiceReviewModalOpen, setIsInvoiceReviewModalOpen] = useState(false);
  const [invoiceScanResult, setInvoiceScanResult] = useState<any>(null);

  if (isFormOpen) {
    return (
      <div className="flex flex-col h-full bg-background text-foreground">
        <div className="flex items-center justify-end px-6 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <button onClick={() => setIsFormOpen(false)} className="px-4 py-2 text-sm font-medium rounded border border-border text-gray-700 hover:bg-gray-50 transition-colors">
              Volver
            </button>
            <button onClick={() => setIsFormOpen(false)} className="px-4 py-2 text-sm font-medium rounded border border-border text-gray-700 hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button className="btn-primary text-sm px-4 py-2 rounded-md">
              Confirmar
            </button>
          </div>
        </div>

        <div className="p-6">
          <Card className="border border-border shadow-sm">
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Código:</label>
                    <input
                      type="text"
                      placeholder="Código adicional"
                      className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre<span className="text-red-600">*</span>:
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Marca:</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Modelo:</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Categoría:</label>
                    <select className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                      <option>Seleccionar...</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Unidad medida:</label>
                    <select className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                      <option>UNIDAD</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Stock<span className="text-red-600">*</span>:
                    </label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Stock mínimo:</label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Proveedor:</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Costo compra:</label>
                    <input
                      type="text"
                      placeholder="$0.00"
                      className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Recargo (%):</label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Precio Venta<span className="text-red-600">*</span>:
                    </label>
                    <input
                      type="text"
                      placeholder="$0.00"
                      className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Impuesto<span className="text-red-600">*</span>:
                    </label>
                    <select className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                      <option>0</option>
                      <option>19</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Precio Bruto:</label>
                    <input
                      type="text"
                      placeholder="$0.00"
                      className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Descripción:</label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const handleExcelUpload = async () => {
    setIsUploadingExcel(true);
    try {
      const result = await window.electronAPI.procesarExcelRepuestos();
      if (result?.success) {
        await refreshRepuestos();
        notify.success(
          'Importación exitosa',
          `${result.cantidad || 0} repuestos importados correctamente.`
        );
        const confirmed = await confirmAction(
          'Importación exitosa',
          'Se cargaron nuevos items al inventario.'
        );
        if (confirmed) {
          setIsUploadOpen(false);
        }
      } else if (result?.error && !result.error.includes('No se seleccionó')) {
        notify.error('Error', result.error);
      }
    } catch (error) {
      notify.error('Error', 'Error al procesar el archivo Excel.');
    } finally {
      setIsUploadingExcel(false);
    }
  };

  const handleProcessOCR = async () => {
    try {
      const result = await window.electronAPI.scanInvoice();
      if (!result?.success) {
        notify.error('Error', result?.error || 'Error al escanear la factura');
        return;
      }
      if (!result.items || result.items.length === 0) {
        notify.warning('Sin resultados', 'No se encontraron items en la factura.');
        return;
      }
      setInvoiceScanResult(result);
      setIsOCRModalOpen(false);
      setIsInvoiceReviewModalOpen(true);
    } catch {
      notify.error('Error', 'Error al procesar la imagen.');
    }
  };

  const handleConfirmInvoiceItems = async (items: any[]) => {
    try {
      const repuestosParaGuardar = items.map(item => ({
        codigo: item.rawCode || `FAC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        nombre: item.description,
        descripcion: item.description,
        precio: item.unitPrice,
        precioCosto: item.unitPrice,
        stock: item.quantity,
        stockMinimo: 5,
        categoria: 'General',
        marca: 'Genérico',
        ubicacion: 'Estante A1',
        activo: true
      }));
      for (const repuesto of repuestosParaGuardar) {
        await window.electronAPI.saveRepuesto(repuesto);
      }
      await refreshRepuestos();
      notify.success('Éxito', `Se importaron ${repuestosParaGuardar.length} repuestos.`);
      const confirmed = await confirmAction(
        'Importación exitosa',
        'Se cargaron nuevos items al inventario.'
      );
      if (confirmed) {
        setIsInvoiceReviewModalOpen(false);
        setInvoiceScanResult(null);
        setIsUploadOpen(false);
      }
    } catch {
      notify.error('Error', 'Error al guardar los repuestos.');
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8 bg-background text-foreground">
      <div className="flex items-center justify-end gap-2">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          <option>Todos</option>
          <option>Activos</option>
          <option>Inactivos</option>
        </select>
        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogTrigger asChild>
            <button className="btn-primary">
              Cargar
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cargar Excel / PDF / Foto</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Selecciona el tipo de archivo para agregar nuevos items al inventario.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  onClick={handleExcelUpload}
                  disabled={isUploadingExcel}
                  className="btn-primary w-full"
                >
                  {isUploadingExcel ? 'Procesando...' : 'Importar Excel'}
                </button>
                <button
                  onClick={() => setIsOCRModalOpen(true)}
                  className="px-4 py-2 rounded-md border border-gray-300 bg-white text-gray-700 text-sm hover:bg-gray-50 transition-colors w-full"
                >
                  Escanear PDF / Foto
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        <button onClick={() => setIsFormOpen(true)} className="btn-primary">
          Nuevo
        </button>
      </div>

      <Card className="border border-border shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <select
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value)}
                className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option>Nombre</option>
                <option>ID</option>
                <option>Código</option>
              </select>
              <button className="h-9 w-9 rounded-md border border-gray-300 bg-white text-gray-700">
                ▲
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar"
                className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <select
                value={searchBy}
                onChange={(e) => setSearchBy(e.target.value)}
                className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option>Nom,ID,Cod</option>
                <option>Nombre</option>
                <option>ID</option>
                <option>Código</option>
              </select>
              <button className="h-9 w-9 rounded-md bg-red-600 text-white flex items-center justify-center hover:bg-red-700 transition-colors">
                <Search className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-gray-700">
                  <th className="px-4 py-2 text-left font-semibold">Nombre</th>
                  <th className="px-4 py-2 text-left font-semibold">ID</th>
                  <th className="px-4 py-2 text-left font-semibold">Código</th>
                  <th className="px-4 py-2 text-left font-semibold">Marca</th>
                  <th className="px-4 py-2 text-left font-semibold">Modelo</th>
                  <th className="px-4 py-2 text-left font-semibold">Proveedor</th>
                  <th className="px-4 py-2 text-left font-semibold">Stock</th>
                  <th className="px-4 py-2 text-left font-semibold">Precio</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border text-gray-500">
                  <td className="px-4 py-6 text-center" colSpan={8}>
                    No hay productos registrados
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <OCRModal
        isOpen={isOCRModalOpen}
        onClose={() => setIsOCRModalOpen(false)}
        onProcessOCR={handleProcessOCR}
      />

      {invoiceScanResult && (
        <InvoiceReviewModal
          isOpen={isInvoiceReviewModalOpen}
          onClose={() => {
            setIsInvoiceReviewModalOpen(false);
            setInvoiceScanResult(null);
          }}
          items={invoiceScanResult.items}
          provider={invoiceScanResult.provider}
          invoiceNumber={invoiceScanResult.invoiceNumber}
          onConfirm={handleConfirmInvoiceItems}
          isLoading={false}
          sourceType={invoiceScanResult.sourceType || 'image'}
        />
      )}
    </div>
  );
}
