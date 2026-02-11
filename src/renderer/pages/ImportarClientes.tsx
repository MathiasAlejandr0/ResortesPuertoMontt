import { useState } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { useApp } from '../contexts/AppContext';
import { notify } from '../utils/cn';

export default function ImportarClientesPage() {
  const { refreshClientes } = useApp();
  const [clearExisting, setClearExisting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async () => {
    if (isUploading) return;
    setIsUploading(true);

    try {
      if (clearExisting) {
        await window.electronAPI.limpiarClientes();
      }

      const result = await window.electronAPI.procesarExcelClientes();
      if (result?.success) {
        await refreshClientes();
        notify.success(
          'Importación exitosa',
          `${result.cantidad || 0} clientes importados correctamente.`
        );
        if (result?.errores) {
          notify.warning('Alerta', `Hubo ${result.errores} filas con error.`);
        }
      } else if (result?.error && !result.error.includes('No se seleccionó')) {
        notify.error('Error', result.error);
      }
    } catch (error) {
      notify.error('Error', 'Error al procesar el archivo Excel.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8 bg-background text-foreground">
      <Card className="border border-border bg-white text-gray-900 shadow-sm">
        <CardContent className="p-6 space-y-6">
          <div className="rounded-md bg-red-50 border border-red-200 text-gray-700 text-sm px-4 py-3 space-y-2">
            <div className="font-semibold text-red-700">Cómo importar los datos correctamente</div>
            <div>
              + Para importar archivos a su base de datos de clientes debe tener un Excel con la cantidad de columnas y en el orden mencionado en el diagrama. Los campos obligatorios se encuentran identificados en color rojo. Los campos no obligatorios pueden estar vacíos pero tiene que existir la columna en el orden indicado.
            </div>
            <div>
              + Si la primer fila contiene los nombres de la columna, elimínela. Deje solo los datos a cargar.
            </div>
            <div>
              + Condición tributaria puede tener uno de los siguientes valores: General, Exento, Consumidor final, Pequeño contribuyente, No categorizado, Exterior.
            </div>
          </div>

          <div className="rounded-md border border-red-200 bg-red-50 text-sm text-gray-700 px-4 py-3 text-center">
            <span className="text-red-600">Nombre</span> | N° de | Email | Teléfono | Condición tributaria | Dirección
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border bg-white text-gray-900 shadow-sm">
        <CardContent className="p-6 space-y-6">
          <div className="text-sm text-gray-700">
            Seleccione el archivo de Excel a importar extensiones, admitidas xlsx, xlx, csv
          </div>

          <div className="w-28 h-28 border border-gray-200 rounded-md flex items-center justify-center bg-gray-50 text-gray-400">
            <span className="text-4xl">+</span>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={clearExisting}
              onChange={(e) => setClearExisting(e.target.checked)}
              className="h-4 w-4 accent-red-600"
            />
            Eliminar datos existentes
          </label>

          <button
            className="btn-primary px-4 py-2 text-sm w-fit"
            onClick={handleUpload}
            disabled={isUploading}
          >
            {isUploading ? 'Cargando...' : 'Cargar'}
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
