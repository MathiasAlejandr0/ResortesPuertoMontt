import { Card, CardContent } from '../components/ui/card';

export default function ExportarPage() {
  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8 bg-background text-foreground">
      <Card className="border border-border bg-white text-gray-900 shadow-sm">
        <CardContent className="p-6">
          <div className="max-w-xl rounded-md bg-gray-100 border border-gray-200 px-6 py-5 space-y-4">
            <div className="text-sm text-gray-700 font-medium">
              Exportá tus datos en archivo de Excel
            </div>
            <div className="h-px bg-gray-300"></div>
            <select className="h-9 w-full max-w-[260px] px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
              <option>...</option>
              <option>Productos</option>
              <option>Órdenes de trabajo</option>
              <option>Órdenes de trabajo con detalle</option>
              <option>Presupuestos</option>
              <option>Presupuestos con detalle</option>
              <option>Compras</option>
              <option>Compras con detalle</option>
              <option>Ventas</option>
              <option>Ventas con detalle</option>
              <option>CC Pagos</option>
              <option>CC Pagos con detalle</option>
              <option>Vehículos</option>
              <option>Clientes</option>
              <option>Proveedores</option>
              <option>Avisos Programados</option>
              <option>Movimientos de caja</option>
              <option>Cierres de cajas</option>
              <option>Categorías</option>
              <option>Servicios</option>
              <option>Trabajadores</option>
            </select>
            <button className="btn-primary px-4 py-2 text-sm w-fit">DESCARGAR</button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
