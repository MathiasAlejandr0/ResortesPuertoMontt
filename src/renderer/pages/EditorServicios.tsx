import { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { notify, confirmAction } from '../utils/cn';
import { Servicio } from '../types';

export default function EditorServiciosPage() {
  const [campoFiltro, setCampoFiltro] = useState('Servicio');
  const [operadorFiltro, setOperadorFiltro] = useState('Contenga');
  const [valorFiltro, setValorFiltro] = useState('');
  const [accionMasiva, setAccionMasiva] = useState('');
  const [valorMasivo, setValorMasivo] = useState('');
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [serviciosFiltrados, setServiciosFiltrados] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadServicios();
  }, []);

  useEffect(() => {
    if (valorFiltro) {
      aplicarFiltros();
    } else {
      setServiciosFiltrados([]);
    }
  }, [servicios, campoFiltro, operadorFiltro, valorFiltro]);

  const loadServicios = async () => {
    try {
      const data = await window.electronAPI?.getAllServicios();
      setServicios(data || []);
    } catch (error: any) {
      notify.error('Error', 'No se pudieron cargar los servicios');
    }
  };

  const aplicarFiltros = () => {
    if (!valorFiltro.trim()) {
      setServiciosFiltrados([]);
      return;
    }

    let filtered = [...servicios];
    const term = valorFiltro.toLowerCase().trim();

    filtered = filtered.filter((s: Servicio) => {
      let value: any;
      
      switch (campoFiltro) {
        case 'Servicio':
          value = s.nombre?.toLowerCase() || '';
          break;
        case 'Descripción':
          value = s.descripcion?.toLowerCase() || '';
          break;
        case 'M. Obra':
          // No hay campo de mano de obra en Servicio, usar precio como aproximación
          value = s.precio || 0;
          break;
        case 'Precio Venta':
          value = s.precio || 0;
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

    setServiciosFiltrados(filtered);
  };

  const listarTodo = () => {
    setServiciosFiltrados([...servicios]);
    setValorFiltro('');
  };

  const ejecutarEdicionMasiva = async () => {
    if (!accionMasiva) {
      notify.error('Error', 'Debes seleccionar una acción');
      return;
    }

    if (serviciosFiltrados.length === 0) {
      notify.error('Error', 'No hay servicios seleccionados para editar');
      return;
    }

    if (!valorMasivo && accionMasiva !== 'Eliminar') {
      notify.error('Error', 'Debes ingresar un valor');
      return;
    }

    const confirmed = await confirmAction(
      '¿Estás seguro?',
      `Esta acción se aplicará a ${serviciosFiltrados.length} servicio(s). Esta acción no se puede deshacer.`
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      const serviciosActualizados: Servicio[] = [];

      for (const servicio of serviciosFiltrados) {
        const servicioActualizado = { ...servicio };

        switch (accionMasiva) {
          case 'Modificar precio final (%)':
            const porcentajePrecio = parseFloat(valorMasivo) || 0;
            servicioActualizado.precio = Math.round((servicio.precio || 0) * (1 + porcentajePrecio / 100));
            break;

          case 'Asignar precio final':
            servicioActualizado.precio = parseInt(valorMasivo) || 0;
            break;

          case 'Modificar duración (%)':
            const porcentajeDuracion = parseFloat(valorMasivo) || 0;
            servicioActualizado.duracionEstimada = Math.round((servicio.duracionEstimada || 60) * (1 + porcentajeDuracion / 100));
            break;

          case 'Asignar duración':
            servicioActualizado.duracionEstimada = parseInt(valorMasivo) || 60;
            break;

          case 'Eliminar':
            // Se eliminarán después
            continue;

          default:
            continue;
        }

        serviciosActualizados.push(servicioActualizado);
      }

      // Guardar servicios actualizados
      if (accionMasiva === 'Eliminar') {
        for (const servicio of serviciosFiltrados) {
          if (servicio.id) {
            await window.electronAPI?.deleteServicio(servicio.id);
          }
        }
        notify.success('Éxito', `${serviciosFiltrados.length} servicio(s) eliminado(s)`);
      } else {
        // Guardar servicios actualizados uno por uno
        for (const servicio of serviciosActualizados) {
          await window.electronAPI?.saveServicio(servicio);
        }
        notify.success('Éxito', `${serviciosActualizados.length} servicio(s) actualizado(s)`);
      }

      // Refrescar lista
      loadServicios();
      setServiciosFiltrados([]);
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
                <option>Servicio</option>
                <option>Descripción</option>
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
            {serviciosFiltrados.length > 0 && (
              <div className="mt-3 text-sm text-gray-600">
                {serviciosFiltrados.length} servicio(s) encontrado(s)
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
                <option>Modificar duración (%)</option>
                <option>Asignar duración</option>
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
                disabled={loading || serviciosFiltrados.length === 0}
                className="btn-primary text-sm px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Ejecutando...' : 'Ejecutar edición masiva'}
              </button>
            </div>
            <div className="mt-4 rounded-md bg-sky-600 text-white text-sm px-4 py-3">
              Los cambios se aplicarán a todos los servicios de la lista que ha obtenido como resultado de los filtros aplicados. Use las acciones con símbolo % para incrementar o descontar valores en porcentaje o bien las demás opciones para establecer un valor específico.
            </div>
          </div>

          <div className="border border-gray-200 rounded-md overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-gray-700">
                  <th className="px-4 py-2 text-left font-semibold">Nombre</th>
                  <th className="px-4 py-2 text-left font-semibold">Descripción</th>
                  <th className="px-4 py-2 text-left font-semibold">ID</th>
                  <th className="px-4 py-2 text-left font-semibold">Duración (min)</th>
                  <th className="px-4 py-2 text-left font-semibold">Precio venta</th>
                </tr>
              </thead>
              <tbody>
                {serviciosFiltrados.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-center" colSpan={5}>
                      {valorFiltro ? 'No hay servicios que coincidan con los filtros' : 'Aplica filtros o lista todo para ver servicios'}
                    </td>
                  </tr>
                ) : (
                  serviciosFiltrados.map((servicio) => (
                    <tr key={servicio.id} className="border-b border-border text-gray-700 hover:bg-gray-50">
                      <td className="px-4 py-2">{servicio.nombre}</td>
                      <td className="px-4 py-2">{servicio.descripcion || '-'}</td>
                      <td className="px-4 py-2">{servicio.id}</td>
                      <td className="px-4 py-2">{servicio.duracionEstimada || 60} min</td>
                      <td className="px-4 py-2">{formatPrice(servicio.precio || 0)}</td>
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
