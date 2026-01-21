import { useState } from 'react';
import { Card, CardContent } from '../components/ui/card';

export default function EditorServiciosPage() {
  const [campoFiltro, setCampoFiltro] = useState('Servicio');
  const [operadorFiltro, setOperadorFiltro] = useState('Sea igual');
  const [valorFiltro, setValorFiltro] = useState('');
  const [accionMasiva, setAccionMasiva] = useState('');
  const [valorMasivo, setValorMasivo] = useState('');

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8 bg-background text-foreground">
      <Card className="border border-border shadow-sm">
        <CardContent className="p-4 space-y-6">
          <div className="border border-gray-200 rounded-md p-4">
            <div className="text-sm font-medium text-gray-700 mb-3">Filtros:</div>
            <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center">
              <select
                value={campoFiltro}
                onChange={(e) => setCampoFiltro(e.target.value)}
                className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option>Servicio</option>
                <option>Descripción</option>
                <option>Categoria</option>
                <option>M. Obra</option>
                <option>Precio Venta</option>
              </select>
              <select
                value={operadorFiltro}
                onChange={(e) => setOperadorFiltro(e.target.value)}
                className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option>Sea igual</option>
                <option>Sea distinto</option>
                <option>Contenga</option>
                <option>Sea mayor</option>
                <option>Sea menor</option>
                <option>Sea Mayor o igual</option>
                <option>Sea menor o igual</option>
              </select>
              <input
                type="text"
                value={valorFiltro}
                onChange={(e) => setValorFiltro(e.target.value)}
                className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 flex-1 min-w-[200px]"
              />
              <button className="btn-primary text-sm px-4 py-2 rounded-md">
                Buscar
              </button>
              <button className="px-4 py-2 rounded-md border border-gray-300 bg-white text-gray-700 text-sm hover:bg-gray-50 transition-colors">
                Listar todo
              </button>
            </div>
          </div>

          <div className="border border-gray-200 rounded-md p-4">
            <div className="text-sm font-medium text-gray-700 mb-3">Edición masiva:</div>
            <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center">
              <select
                value={accionMasiva}
                onChange={(e) => setAccionMasiva(e.target.value)}
                className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="">Seleccionar acción</option>
                <option>Modificar precio final (%)</option>
                <option>Asignar precio final</option>
                <option>Asignar valor de impuesto</option>
                <option>Modificar precio de compra (%)</option>
                <option>Asignar precio de compra</option>
                <option>Modificar stock</option>
                <option>Asignar stock en un valor</option>
                <option>Asignar stock mínimo</option>
                <option>Eliminar</option>
              </select>
              <input
                type="text"
                value={valorMasivo}
                onChange={(e) => setValorMasivo(e.target.value)}
                placeholder="Ingresar valor"
                className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 flex-1 min-w-[200px]"
              />
              <button className="btn-primary text-sm px-4 py-2 rounded-md">
                Ejecutar edición masiva
              </button>
            </div>
            <div className="mt-4 rounded-md bg-sky-600 text-white text-sm px-4 py-3">
              Los cambios se aplicarán a todos los productos de la lista que ha obtenido como resultado de los filtros aplicados. Use las acciones con símbolo % para incrementar o descontar valores en porcentaje o bien las demás opciones para incrementar, descontar o establecer un valor específico. Puede usar valores negativos o positivos, por ejemplo, 30 o -30 para incrementar o descontar un 30% el valor de venta.
            </div>
          </div>

          <div className="border border-gray-200 rounded-md overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-gray-700">
                  <th className="px-4 py-2 text-left font-semibold">Nombre</th>
                  <th className="px-4 py-2 text-left font-semibold">Descripcion</th>
                  <th className="px-4 py-2 text-left font-semibold">ID</th>
                  <th className="px-4 py-2 text-left font-semibold">ID categoría</th>
                  <th className="px-4 py-2 text-left font-semibold">M. Obra</th>
                  <th className="px-4 py-2 text-left font-semibold">Precio venta</th>
                  <th className="px-4 py-2 text-left font-semibold">Impuesto</th>
                  <th className="px-4 py-2 text-left font-semibold">Precio Bruto</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border text-gray-500">
                  <td className="px-4 py-6 text-center" colSpan={8}>
                    No hay servicios para mostrar
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
