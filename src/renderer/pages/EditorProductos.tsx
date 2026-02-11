import { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { notify, confirmAction } from '../utils/cn';
import { Repuesto } from '../types';
import { useApp } from '../contexts/AppContext';

export default function EditorProductosPage() {
  const { repuestos, refreshRepuestos } = useApp();
  const [campoFiltro, setCampoFiltro] = useState('Nombre');
  const [operadorFiltro, setOperadorFiltro] = useState('Contenga');
  const [valorFiltro, setValorFiltro] = useState('');
  const [accionMasiva, setAccionMasiva] = useState('');
  const [valorMasivo, setValorMasivo] = useState('');
  const [productosFiltrados, setProductosFiltrados] = useState<Repuesto[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (valorFiltro) {
      aplicarFiltros();
    } else {
      setProductosFiltrados([]);
    }
  }, [repuestos, campoFiltro, operadorFiltro, valorFiltro]);

  const aplicarFiltros = () => {
    if (!valorFiltro.trim()) {
      setProductosFiltrados([]);
      return;
    }

    let filtered = [...repuestos];
    const term = valorFiltro.toLowerCase().trim();

    filtered = filtered.filter((p: Repuesto) => {
      let value: any;
      
      switch (campoFiltro) {
        case 'Nombre':
          value = p.nombre?.toLowerCase() || '';
          break;
        case 'Modelo':
          value = p.descripcion?.toLowerCase() || '';
          break;
        case 'Marca':
          value = p.marca?.toLowerCase() || '';
          break;
        case 'Stock':
          value = p.stock || 0;
          break;
        case 'Precio Venta':
          value = p.precio || 0;
          break;
        case 'Categoría':
          value = p.categoria?.toLowerCase() || '';
          break;
        default:
          return true;
      }

      switch (operadorFiltro) {
        case 'Sea igual':
          return String(value).toLowerCase() === term;
        case 'Sea distinto':
          return String(value).toLowerCase() !== term;
        case 'Contenga':
          return String(value).includes(term);
        case 'Sea mayor':
          return Number(value) > Number(term);
        case 'Sea menor':
          return Number(value) < Number(term);
        case 'Sea Mayor o igual':
          return Number(value) >= Number(term);
        case 'Sea menor o igual':
          return Number(value) <= Number(term);
        default:
          return true;
      }
    });

    setProductosFiltrados(filtered);
  };

  const listarTodo = () => {
    setProductosFiltrados([...repuestos]);
    setValorFiltro('');
  };

  const ejecutarEdicionMasiva = async () => {
    if (!accionMasiva) {
      notify.error('Error', 'Debes seleccionar una acción');
      return;
    }

    if (productosFiltrados.length === 0) {
      notify.error('Error', 'No hay productos seleccionados para editar');
      return;
    }

    if (!valorMasivo && accionMasiva !== 'Eliminar') {
      notify.error('Error', 'Debes ingresar un valor');
      return;
    }

    const confirmed = await confirmAction(
      '¿Estás seguro?',
      `Esta acción se aplicará a ${productosFiltrados.length} producto(s). Esta acción no se puede deshacer.`
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      const productosActualizados: Repuesto[] = [];

      for (const producto of productosFiltrados) {
        const productoActualizado = { ...producto };

        switch (accionMasiva) {
          case 'Modificar precio final (%)':
            const porcentajePrecio = parseFloat(valorMasivo) || 0;
            productoActualizado.precio = Math.round((producto.precio || 0) * (1 + porcentajePrecio / 100));
            break;

          case 'Asignar precio final':
            productoActualizado.precio = parseInt(valorMasivo) || 0;
            break;

          case 'Modificar precio de compra (%)':
            const porcentajeCompra = parseFloat(valorMasivo) || 0;
            productoActualizado.precioCosto = Math.round((producto.precioCosto || 0) * (1 + porcentajeCompra / 100));
            break;

          case 'Asignar precio de compra':
            productoActualizado.precioCosto = parseInt(valorMasivo) || 0;
            break;

          case 'Modificar stock':
            const modificacionStock = parseInt(valorMasivo) || 0;
            productoActualizado.stock = Math.max(0, (producto.stock || 0) + modificacionStock);
            break;

          case 'Asignar stock en un valor':
            productoActualizado.stock = parseInt(valorMasivo) || 0;
            break;

          case 'Asignar stock mínimo':
            productoActualizado.stockMinimo = parseInt(valorMasivo) || 0;
            break;

          case 'Eliminar':
            // Se eliminarán después
            continue;

          default:
            continue;
        }

        productosActualizados.push(productoActualizado);
      }

      // Guardar productos actualizados
      if (accionMasiva === 'Eliminar') {
        const idsAEliminar = productosFiltrados.map(p => p.id).filter((id): id is number => id !== undefined);
        if (idsAEliminar.length > 0) {
          await window.electronAPI?.deleteRepuestosBatch(idsAEliminar);
          notify.success('Éxito', `${idsAEliminar.length} producto(s) eliminado(s)`);
        }
      } else {
        // Guardar productos actualizados en batch
        await window.electronAPI?.saveRepuestosBatch(productosActualizados);
        notify.success('Éxito', `${productosActualizados.length} producto(s) actualizado(s)`);
      }

      // Refrescar lista
      refreshRepuestos();
      setProductosFiltrados([]);
      setAccionMasiva('');
      setValorMasivo('');
      setValorFiltro('');

    } catch (error: any) {
      notify.error('Error', 'No se pudo ejecutar la edición masiva: ' + (error.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(price);
  };

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
                <option>Nombre</option>
                <option>Modelo</option>
                <option>Marca</option>
                <option>Stock</option>
                <option>Precio Venta</option>
                <option>Categoría</option>
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
                onKeyPress={(e) => e.key === 'Enter' && aplicarFiltros()}
                className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 flex-1 min-w-[200px]"
              />
              <button onClick={aplicarFiltros} className="btn-primary text-sm px-4 py-2 rounded-md">
                Buscar
              </button>
              <button onClick={listarTodo} className="px-4 py-2 rounded-md border border-gray-300 bg-white text-gray-700 text-sm hover:bg-gray-50 transition-colors">
                Listar todo
              </button>
            </div>
            {productosFiltrados.length > 0 && (
              <div className="mt-3 text-sm text-gray-600">
                {productosFiltrados.length} producto(s) encontrado(s)
              </div>
            )}
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
                <option>Modificar precio de compra (%)</option>
                <option>Asignar precio de compra</option>
                <option>Modificar stock</option>
                <option>Asignar stock en un valor</option>
                <option>Asignar stock mínimo</option>
                <option>Eliminar</option>
              </select>
              {accionMasiva !== 'Eliminar' && (
                <input
                  type="text"
                  value={valorMasivo}
                  onChange={(e) => setValorMasivo(e.target.value)}
                  placeholder="Ingresar valor"
                  className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 flex-1 min-w-[200px]"
                />
              )}
              <button
                onClick={ejecutarEdicionMasiva}
                disabled={loading || productosFiltrados.length === 0}
                className="btn-primary text-sm px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Ejecutando...' : 'Ejecutar edición masiva'}
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
                  <th className="px-4 py-2 text-left font-semibold">Marca</th>
                  <th className="px-4 py-2 text-left font-semibold">Código</th>
                  <th className="px-4 py-2 text-left font-semibold">Stock mínimo</th>
                  <th className="px-4 py-2 text-left font-semibold">Stock</th>
                  <th className="px-4 py-2 text-left font-semibold">Categoría</th>
                  <th className="px-4 py-2 text-left font-semibold">Precio compra</th>
                  <th className="px-4 py-2 text-left font-semibold">Precio venta</th>
                </tr>
              </thead>
              <tbody>
                {productosFiltrados.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-center" colSpan={8}>
                      {valorFiltro ? 'No hay productos que coincidan con los filtros' : 'Aplica filtros o lista todo para ver productos'}
                    </td>
                  </tr>
                ) : (
                  productosFiltrados.map((producto) => (
                    <tr key={producto.id} className="border-b border-border text-gray-700 hover:bg-gray-50">
                      <td className="px-4 py-2">{producto.nombre}</td>
                      <td className="px-4 py-2">{producto.marca || '-'}</td>
                      <td className="px-4 py-2">{producto.codigo}</td>
                      <td className="px-4 py-2">{producto.stockMinimo || 0}</td>
                      <td className="px-4 py-2">{producto.stock || 0}</td>
                      <td className="px-4 py-2">{producto.categoria}</td>
                      <td className="px-4 py-2">{formatPrice(producto.precioCosto || 0)}</td>
                      <td className="px-4 py-2">{formatPrice(producto.precio || 0)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
