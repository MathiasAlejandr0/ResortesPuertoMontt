import { useState } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { useApp } from '../contexts/AppContext';
import { notify } from '../utils/cn';

export default function ImportarServiciosPage() {
  const { refreshServicios } = useApp();
  const [clearExisting, setClearExisting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async () => {
    if (isUploading) return;
    setIsUploading(true);

    try {
      if (clearExisting) {
        await window.electronAPI.limpiarServicios();
      }

      const result = await window.electronAPI.procesarExcelServicios();
      if (result?.success) {
        await refreshServicios();
        notify.success(
          'Importación exitosa',
          `${result.cantidad || 0} servicios importados correctamente.`
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
          <div className="rounded-md bg-gray-100 text-gray-700 text-sm px-4 py-3">
            Puede descargar un ejemplo haciendo{' '}
            <button className="text-red-600 hover:underline">click aquí</button>
          </div>

          <div className="rounded-md bg-red-50 border border-red-200 text-gray-700 text-sm px-4 py-3 space-y-2">
            <div className="font-semibold text-red-700">Cómo importar los datos correctamente</div>
            <div>
              + Para importar archivos a su base de datos de productos debe tener un Excel con la cantidad de columnas y en el orden mencionado en el diagrama. Los campos obligatorios se encuentran identificados en color rojo. Los campos no obligatorios pueden estar vacíos pero tiene que existir la columna en el orden indicado.
            </div>
            <div>
              + Si no desea discriminar el impuesto, en la columna "Impuesto en %" ingrese el numero 0 y en las columnas "precio sin impuesto y precio con impuesto" debe ingresar el mismo valor.
            </div>
            <div>
              + Impuesto en %: Tener en cuenta que el valor numérico que ingrese en esta columna, tendrá que estar cargado en el listado de impuestos (Menú: "Configuraciones &gt; Formularios &gt; Configura tu impuesto país")
            </div>
            <div>
              + Recargo: es un valor expresado en porcentaje de la ganancia según la columna "costo". El sistema no realiza cálculo automático del precio final, tiene que cargar el precio en la columna correspondiente.
            </div>
            <div>
              + ID Categoría: Si ya creó categorías en Dirup, puede ver los números de ID en el listado de categorías y asignarlos en esta columna.
            </div>
            <div>
              + Checklist: Puede establecer el valor "1" para que aparezca en el listado dentro del Checklist de las ordenes o en valor "0" para el caso contrario.
            </div>
            <div>
              + Si la primer fila contiene los nombres de la columna, elimínela. Deje sólo los datos a cargar.
            </div>
          </div>

          <div className="rounded-md border border-red-200 bg-red-50 text-sm text-gray-700 px-4 py-3 text-center">
            <span className="text-red-600">Nombre</span> | Precio sin impuestos | Impuesto en % | Precio con impuestos | Costo mano de obra | Descripción | Recargo en % | ID Categoría | Checklist
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
