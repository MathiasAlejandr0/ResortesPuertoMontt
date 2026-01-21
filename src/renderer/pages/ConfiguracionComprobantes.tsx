import { Card, CardContent } from '../components/ui/card';

export default function ConfiguracionComprobantesPage() {
  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8 bg-background text-foreground">
      <div className="rounded-md bg-gray-100 text-gray-700 text-sm px-4 py-3">
        Al finalizar la configuración te recomendamos actualizar{' '}
        <button className="text-red-600 hover:underline">DESDE AQUÍ</button> para aplicar
        los cambios en todas las funciones del sistema.
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="border border-border bg-white text-gray-900 shadow-sm">
          <CardContent className="p-6 space-y-6">
            <div>
              <div className="text-sm font-medium text-gray-900">Membrete</div>
              <div className="h-px bg-gray-200 mt-2"></div>
              <p className="text-sm text-gray-600 mt-3">
                Configurá tu membrete para que los comprobantes impresos y los mensajes de
                WhatsApp incluyan la información de tu taller.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700 mb-2">Nombre del taller</label>
                <input
                  type="text"
                  defaultValue="resortes puerto montt"
                  className="h-9 w-full px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-2">Correo electrónico</label>
                <input
                  type="text"
                  placeholder="Ej: info@dirup.net"
                  className="h-9 w-full px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-2">Info adicional</label>
                <input
                  type="text"
                  placeholder="Tu nombre"
                  className="h-9 w-full px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-2">Horario de atención</label>
                <input
                  type="text"
                  placeholder="Ej: 8:00 a 13:00 | 15:00 a 18:00"
                  className="h-9 w-full px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-2">Teléfono fijo o Fax</label>
                <input
                  type="text"
                  placeholder="Ej: 475-9538"
                  className="h-9 w-full px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-2">Ciudad</label>
                <input
                  type="text"
                  placeholder="Tu ciudad"
                  className="h-9 w-full px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-2">WhatsApp</label>
                <input
                  type="text"
                  className="h-9 w-full px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-2">Dirección</label>
                <input
                  type="text"
                  placeholder="Dirección del taller"
                  className="h-9 w-full px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-gray-900">Logo</div>
              <div className="h-px bg-gray-200 mt-2"></div>
              <p className="text-sm text-gray-600 mt-3">
                Subí el logo de tu taller para que aparezca en los comprobantes.
              </p>
              <div className="flex items-center gap-3 mt-3">
                <div className="w-20 h-20 border border-gray-200 rounded-md bg-gray-50"></div>
                <div className="w-20 h-20 border border-gray-200 rounded-md bg-gray-50 flex items-center justify-center text-gray-400">
                  <span className="text-3xl">+</span>
                </div>
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-gray-900">Auto partes</div>
              <div className="h-px bg-gray-200 mt-2"></div>
              <div className="flex items-center justify-between mt-3">
                <span className="text-sm text-gray-700"></span>
                <select className="h-8 w-40 px-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                  <option></option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700 mt-4">
                <input type="checkbox" className="h-4 w-4 accent-red-600" />
                Activá esta opción si querés que al imprimir el comprobante de una orden de
                trabajo o presupuesto se muestre la siguiente imagen:
              </label>
              <div className="mt-3 w-full max-w-sm h-44 border border-gray-200 rounded-md bg-gray-50"></div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-white text-gray-900 shadow-sm">
          <CardContent className="p-6 space-y-6">
            <div>
              <div className="text-sm font-medium text-gray-900">Detalle</div>
              <div className="h-px bg-gray-200 mt-2"></div>
              <p className="text-sm text-gray-600 mt-3">
                Activá los valores que quieras que se muestren en tus comprobantes.
              </p>
            </div>

            <div>
              <div className="text-sm font-medium text-red-600">Campos personalizados</div>
              <div className="h-px bg-gray-200 mt-2"></div>
              {['Kilometraje', 'Nombre Inspector', 'Número Siniestro', 'Franquicia'].map((label) => (
                <div key={label} className="flex items-center justify-between py-2 border-b border-gray-200 text-sm">
                  <span>- {label}</span>
                  <input type="checkbox" className="h-4 w-4 accent-red-600" />
                </div>
              ))}
            </div>

            <div>
              <div className="text-sm font-medium text-red-600">Detalle de productos y servicios</div>
              <div className="h-px bg-gray-200 mt-2"></div>
              <select className="mt-3 h-9 w-full max-w-xs px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                <option>Mostrar todos los datos</option>
              </select>
            </div>

            <div>
              <div className="text-sm font-medium text-red-600">Otros</div>
              <div className="h-px bg-gray-200 mt-2"></div>
              {[
                'Mostrar detalle de pago',
                'Mostrar panel de firma',
                'Mostrar nivel de combustible',
                'Ocultar detalle de mano de obra y repuestos',
              ].map((label) => (
                <div key={label} className="flex items-center justify-between py-2 border-b border-gray-200 text-sm">
                  <span>- {label}</span>
                  <input type="checkbox" className="h-4 w-4 accent-red-600" />
                </div>
              ))}
            </div>

            <div>
              <div className="text-sm font-medium text-gray-900">Información adicional</div>
              <div className="h-px bg-gray-200 mt-2"></div>
              <p className="text-sm text-gray-600 mt-3">
                En esta sección podrás agregar un texto al final del comprobante (Máximo 800 caracteres).
              </p>
              <textarea
                rows={4}
                placeholder="..."
                className="mt-3 w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
