import { Card, CardContent } from '../components/ui/card';

const impuestos = [
  { label: 'Valor principal', value: '0' },
  { label: 'Valor 2', value: 'Val 2' },
  { label: 'Valor 3', value: 'Val 3' },
  { label: 'Valor 4', value: 'Val 4' },
];

export default function ConfiguracionSistemaPage() {
  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8 bg-background text-foreground">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="border border-border bg-white text-gray-900 shadow-sm">
          <CardContent className="p-6 space-y-4">
            <div className="text-sm font-medium text-gray-900">Preferencias de idioma</div>
            <div className="h-px bg-gray-200"></div>

            <div className="space-y-3">
              <div className="grid grid-cols-[220px_1fr_100px] gap-3 items-center">
                <div className="text-sm text-gray-700 flex items-center gap-2">
                  <span>⚠️</span>
                  <span>Nombre de la chapa</span>
                </div>
                <input
                  type="text"
                  defaultValue="Patente"
                  className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <button className="btn-primary px-3 py-2 text-sm">Guardar</button>
              </div>

              <div className="grid grid-cols-[220px_1fr_100px] gap-3 items-center">
                <div className="text-sm text-gray-700 flex items-center gap-2">
                  <span>⚠️</span>
                  <span>¿Que reparas?</span>
                </div>
                <input
                  type="text"
                  defaultValue="Vehículo"
                  className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <button className="btn-primary px-3 py-2 text-sm">Guardar</button>
              </div>

              <div className="grid grid-cols-[220px_1fr_100px] gap-3 items-center">
                <div className="text-sm text-gray-700">Impuesto país</div>
                <input
                  type="text"
                  defaultValue="IVA"
                  className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <button className="btn-primary px-3 py-2 text-sm">Guardar</button>
              </div>

              <div className="grid grid-cols-[220px_1fr_100px] gap-3 items-center">
                <div className="text-sm text-gray-700">Documento</div>
                <input
                  type="text"
                  defaultValue="RUT"
                  className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <button className="btn-primary px-3 py-2 text-sm">Guardar</button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-white text-gray-900 shadow-sm">
          <CardContent className="p-6 space-y-4">
            <div className="text-sm font-medium text-gray-900">Aplicación</div>
            <div className="h-px bg-gray-200"></div>

            <div className="space-y-3">
              <div className="grid grid-cols-[220px_1fr_100px] gap-3 items-center">
                <div className="text-sm text-gray-700">Símbolo de moneda</div>
                <input
                  type="text"
                  defaultValue="$"
                  className="h-9 w-24 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <button className="btn-primary px-3 py-2 text-sm">Guardar</button>
              </div>

              <div className="grid grid-cols-[220px_1fr_100px] gap-3 items-center">
                <div className="text-sm text-gray-700">Cantidad de decimales</div>
                <input
                  type="text"
                  defaultValue="0"
                  className="h-9 w-24 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <button className="btn-primary px-3 py-2 text-sm">Guardar</button>
              </div>

              <div className="grid grid-cols-[220px_1fr] gap-3 items-center">
                <div className="text-sm text-gray-700">Modo oscuro</div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" className="h-4 w-4 accent-red-600" />
                </div>
              </div>

              <div className="grid grid-cols-[220px_1fr_100px] gap-3 items-center">
                <div className="text-sm text-gray-700">Exportar datos registrados</div>
                <button className="btn-primary px-3 py-2 text-sm">Exportar</button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-white text-gray-900 shadow-sm xl:col-span-2">
          <CardContent className="p-6 space-y-4">
            <div className="text-sm font-medium text-gray-900">Configurá tu impuesto país (IVA)</div>
            <div className="h-px bg-gray-200"></div>
            <p className="text-sm text-gray-600">
              Definí los valores de impuesto país que quieras utilizar
            </p>
            <div className="space-y-2">
              {impuestos.map((row) => (
                <div key={row.label} className="grid grid-cols-[140px_1fr_100px] gap-3 items-center">
                  <span className="text-sm text-gray-600">{row.label}</span>
                  <input
                    type="text"
                    defaultValue={row.value}
                    className="h-9 w-28 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <button className="btn-primary px-3 py-2 text-sm">Guardar</button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
