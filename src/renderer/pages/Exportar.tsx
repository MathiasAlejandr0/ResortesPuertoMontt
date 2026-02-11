import { useState } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { notify } from '../utils/cn';
import { Download, Loader2 } from 'lucide-react';

export default function ExportarPage() {
  const [tipoExportacion, setTipoExportacion] = useState('');
  const [exportando, setExportando] = useState(false);

  const tiposExportacion = [
    'Productos',
    'Órdenes de trabajo',
    'Clientes',
    'Ventas',
    'Proveedores',
    'Servicios',
    'Trabajadores',
    'Categorías',
    'Recordatorios',
    'Movimientos de caja',
    'Cierres de cajas'
  ];

  const handleExportar = async () => {
    if (!tipoExportacion || tipoExportacion === '...') {
      notify.error('Error', 'Debes seleccionar un tipo de exportación');
      return;
    }

    try {
      setExportando(true);
      const result = await window.electronAPI?.exportData(tipoExportacion);
      
      if (result?.success) {
        notify.success('Éxito', `Datos exportados correctamente a: ${result.filePath}`);
      } else {
        notify.error('Error', result?.error || 'No se pudo exportar los datos');
      }
    } catch (error: any) {
      notify.error('Error', 'Error al exportar: ' + (error.message || 'Error desconocido'));
    } finally {
      setExportando(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8 bg-background text-foreground">
      <Card className="border border-border bg-white text-gray-900 shadow-sm">
        <CardContent className="p-6">
          <div className="max-w-xl rounded-md bg-gray-100 border border-gray-200 px-6 py-5 space-y-4">
            <div className="text-sm text-gray-700 font-medium">
              Exportá tus datos en archivo de Excel
            </div>
            <div className="h-px bg-gray-300"></div>
            <select
              value={tipoExportacion}
              onChange={(e) => setTipoExportacion(e.target.value)}
              disabled={exportando}
              className="h-9 w-full max-w-[260px] px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Seleccionar tipo...</option>
              {tiposExportacion.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
            </select>
            <button
              onClick={handleExportar}
              disabled={exportando || !tipoExportacion || tipoExportacion === '...'}
              className="btn-primary px-4 py-2 text-sm w-fit flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exportando ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Exportando...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  DESCARGAR
                </>
              )}
            </button>
            {tipoExportacion && (
              <p className="text-xs text-gray-600 mt-2">
                Se exportarán todos los registros de {tipoExportacion.toLowerCase()} a un archivo Excel.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
