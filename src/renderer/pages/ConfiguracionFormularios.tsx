import { Card, CardContent } from '../components/ui/card';

const camposOrdenes = [
  { nombre: 'Kilometraje', simbolo: 'KM' },
  { nombre: 'Nombre Inspector', simbolo: '' },
  { nombre: 'Número Siniestro', simbolo: '' },
  { nombre: 'Franquicia', simbolo: '$' },
  { nombre: '', simbolo: '' },
];

const estadosOrden = [
  { label: 'Valor principal', value: 'Ingresado' },
  { label: 'Valor 2', value: 'Revisado' },
  { label: 'Valor 3', value: 'Esperando repuesto' },
  { label: 'Valor 4', value: 'Reparado' },
];

const camposVehiculo = ['Año', 'N° Chasis', 'CC', 'Seguro'];

export default function ConfiguracionFormulariosPage() {
  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8 bg-background text-foreground">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="border border-border bg-white text-gray-900 shadow-sm">
          <CardContent className="p-6 space-y-4">
            <div className="text-sm font-medium text-gray-900">Punto de venta</div>
            <div className="h-px bg-gray-200"></div>
            <p className="text-sm text-gray-600">
              Configurá tu punto de venta para los comprobantes.El formato admitido es de 4 números.
              Ejemplo: 0001 (para sucursal 1), 0002 (para sucursal 2)
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                defaultValue="0001"
                className="h-9 w-28 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <button className="btn-primary px-4 py-2 text-sm">Guardar</button>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-white text-gray-900 shadow-sm">
          <CardContent className="p-6 space-y-4">
            <div className="text-sm font-medium text-gray-900">Numeración de órdenes</div>
            <div className="h-px bg-gray-200"></div>
            <p className="text-sm text-gray-600">
              Esta acción cambiará el número de tu última orden de servicio para que puedas comenzar
              con la numeración que desees. La numeración tiene que tener 8 caracteres numéricos (por
              ejemplo: "00000010") y ser mayor al número actual.
            </p>
            <p className="text-sm text-gray-600">
              ⚠️ Para establecer un número de orden inicial tiene que tener al menos una orden de
              servicio ingresada.
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border bg-white text-gray-900 shadow-sm">
          <CardContent className="p-6 space-y-4">
            <div className="text-sm font-medium text-gray-900">Campos personalizados de las órdenes</div>
            <div className="h-px bg-gray-200"></div>
            <p className="text-sm text-gray-600">
              Configurá los campos que quieras agregar en el formulario de tus órdenes de reparación y
              presupuestos. Si no querés que el campo aparezca en el formulario dejá el valor
              "nombre" en blanco, opcionalmente podés agregar un símbolo para identificar el tipo de
              dato.
            </p>
            <div className="grid grid-cols-[1fr_180px_100px] gap-3 text-xs font-semibold text-gray-600 uppercase">
              <span>Nombre</span>
              <span>Símbolo/Unidad</span>
              <span></span>
            </div>
            <div className="space-y-2">
              {camposOrdenes.map((row, index) => (
                <div key={index} className="grid grid-cols-[1fr_180px_100px] gap-3 items-center">
                  <input
                    type="text"
                    defaultValue={row.nombre}
                    className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <input
                    type="text"
                    defaultValue={row.simbolo}
                    className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <button className="btn-primary px-3 py-2 text-sm">Guardar</button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-white text-gray-900 shadow-sm">
          <CardContent className="p-6 space-y-4">
            <div className="text-sm font-medium text-gray-900">Control de pago</div>
            <div className="h-px bg-gray-200"></div>
            <p className="text-sm text-gray-600">
              Cuando el control de pago se encuentra activo éste impide ingresar una orden de
              servicio, venta o compra cuando el importe del pago es distinto al importe total. Este
              control es muy importante que se encuentre activo si llevás el control de caja con
              Dirup. Desactivar esta opción es útil si no deseas usar cuentas corrientes para los
              pagos parciales, de esta manera podrás editar libremente el importe saldado de la orden
              cada vez que el cliente te dé dinero, hasta completar el pago.
            </p>
            <p className="text-sm text-gray-600">
              NO se recomienda desactivar esta opción si usas el control de caja o si necesitás tener
              un histórico de pagos parciales, en este caso es necesario usar el sistema de cuentas
              corrientes. Si desactivas esta opción es importante saber que el pago en la orden no se
              reflejará en la caja, ni la orden se verá afectada por el cierre de caja, hasta que el
              pago esté completo. Lo mismo aplica para las compras y ventas.
            </p>
            <div className="flex items-center gap-2">
              <select className="h-9 w-48 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                <option>Activado</option>
              </select>
              <button className="btn-primary px-4 py-2 text-sm">Guardar</button>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-white text-gray-900 shadow-sm">
          <CardContent className="p-6 space-y-4">
            <div className="text-sm font-medium text-gray-900">Estado de órdenes</div>
            <div className="h-px bg-gray-200"></div>
            <p className="text-sm text-gray-600">
              Definí los estados de órdenes que quieras utilizar
            </p>
            <div className="space-y-2">
              {estadosOrden.map((row) => (
                <div key={row.label} className="grid grid-cols-[140px_1fr_100px] gap-3 items-center">
                  <span className="text-sm text-gray-600">{row.label}</span>
                  <input
                    type="text"
                    defaultValue={row.value}
                    className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <button className="btn-primary px-3 py-2 text-sm">Guardar</button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-white text-gray-900 shadow-sm">
          <CardContent className="p-6 space-y-4">
            <div className="text-sm font-medium text-gray-900">Campos personalizados del Vehículo</div>
            <div className="h-px bg-gray-200"></div>
            <p className="text-sm text-gray-600">
              Configurá los datos que quieras almacenar cuando registres un .
            </p>
            <div className="grid grid-cols-[1fr_100px] gap-3 text-xs font-semibold text-gray-600 uppercase">
              <span>Nombre</span>
              <span></span>
            </div>
            <div className="space-y-2">
              {camposVehiculo.map((label) => (
                <div key={label} className="grid grid-cols-[1fr_100px] gap-3 items-center">
                  <input
                    type="text"
                    defaultValue={label}
                    className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <button className="btn-primary px-3 py-2 text-sm">Guardar</button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-border bg-white text-gray-900 shadow-sm">
        <CardContent className="p-6 space-y-4">
          <div className="text-sm font-medium text-gray-900">Check list</div>
          <div className="h-px bg-gray-200"></div>
          <p className="text-sm text-gray-600">
            Creá un listado de servicios que realices con frecuencia para luego agregarlo a la orden
            de trabajo o presupuesto con tan sólo un click. Para crear tu check list hacé{' '}
            <button className="text-red-600 hover:underline">CLICK AQUÍ</button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
