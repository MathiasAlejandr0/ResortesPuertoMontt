import { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { notify } from '../utils/cn';
import { Save } from 'lucide-react';

interface FormulariosConfig {
  puntoVenta: string;
  camposOrdenes: Array<{ nombre: string; simbolo: string }>;
  estadosOrden: Array<{ label: string; value: string }>;
  camposVehiculo: string[];
  controlPago: 'Activado' | 'Desactivado';
}

export default function ConfiguracionFormulariosPage() {
  const [config, setConfig] = useState<FormulariosConfig>({
    puntoVenta: '0001',
    camposOrdenes: [
      { nombre: 'Kilometraje', simbolo: 'KM' },
      { nombre: 'Nombre Inspector', simbolo: '' },
      { nombre: 'Número Siniestro', simbolo: '' },
      { nombre: 'Franquicia', simbolo: '$' },
      { nombre: '', simbolo: '' }
    ],
    estadosOrden: [
      { label: 'Valor principal', value: 'Ingresado' },
      { label: 'Valor 2', value: 'Revisado' },
      { label: 'Valor 3', value: 'Esperando repuesto' },
      { label: 'Valor 4', value: 'Reparado' }
    ],
    camposVehiculo: ['Año', 'N° Chasis', 'CC', 'Seguro'],
    controlPago: 'Activado'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const configs = await window.electronAPI?.getAllConfiguracion();
      const formulariosConfig = configs?.find((c: any) => c.clave === 'formularios_config');
      if (formulariosConfig) {
        try {
          const parsed = JSON.parse(formulariosConfig.valor);
          setConfig(parsed);
        } catch (e) {
          console.error('Error parsing formularios config:', e);
        }
      }
    } catch (error: any) {
      notify.error('Error', 'No se pudo cargar la configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await window.electronAPI?.saveConfiguracion({
        clave: 'formularios_config',
        valor: JSON.stringify(config),
        descripcion: 'Configuración de formularios'
      });
      notify.success('Éxito', 'Configuración guardada correctamente');
      window.dispatchEvent(new CustomEvent('config-updated', { detail: { clave: 'formularios_config' } }));
    } catch (error: any) {
      notify.error('Error', 'No se pudo guardar la configuración: ' + (error.message || 'Error desconocido'));
    } finally {
      setSaving(false);
    }
  };

  const handleSavePuntoVenta = async () => {
    try {
      await window.electronAPI?.saveConfiguracion({
        clave: 'formularios_config',
        valor: JSON.stringify(config),
        descripcion: 'Configuración de formularios'
      });
      notify.success('Éxito', 'Punto de venta guardado');
    } catch (error: any) {
      notify.error('Error', 'No se pudo guardar');
    }
  };

  const handleSaveCampoOrden = (index: number) => {
    handleSave();
  };

  const handleSaveEstadoOrden = (index: number) => {
    handleSave();
  };

  const handleSaveCampoVehiculo = (index: number) => {
    handleSave();
  };

  const handleSaveControlPago = async () => {
    handleSave();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">Cargando configuración...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8 bg-background text-foreground">
      <div className="flex items-center justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Guardando...' : 'Guardar Todo'}
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="border border-border bg-white text-gray-900 shadow-sm">
          <CardContent className="p-6 space-y-4">
            <div className="text-sm font-medium text-gray-900">Punto de venta</div>
            <div className="h-px bg-gray-200"></div>
            <p className="text-sm text-gray-600">
              Configura tu punto de venta para los comprobantes. El formato admitido es de 4 números.
              Ejemplo: 0001 (para sucursal 1), 0002 (para sucursal 2)
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={config.puntoVenta}
                onChange={(e) => setConfig({ ...config, puntoVenta: e.target.value })}
                maxLength={4}
                className="h-9 w-28 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <button onClick={handleSavePuntoVenta} className="btn-primary px-4 py-2 text-sm">Guardar</button>
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
              Configura los campos que quieras agregar en el formulario de tus órdenes de reparación y
              presupuestos. Si no quieres que el campo aparezca en el formulario deja el valor
              "nombre" en blanco, opcionalmente puedes agregar un símbolo para identificar el tipo de
              dato.
            </p>
            <div className="grid grid-cols-[1fr_180px_100px] gap-3 text-xs font-semibold text-gray-600 uppercase">
              <span>Nombre</span>
              <span>Símbolo/Unidad</span>
              <span></span>
            </div>
            <div className="space-y-2">
              {config.camposOrdenes.map((row, index) => (
                <div key={index} className="grid grid-cols-[1fr_180px_100px] gap-3 items-center">
                  <input
                    type="text"
                    value={row.nombre}
                    onChange={(e) => {
                      const newCampos = [...config.camposOrdenes];
                      newCampos[index].nombre = e.target.value;
                      setConfig({ ...config, camposOrdenes: newCampos });
                    }}
                    className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <input
                    type="text"
                    value={row.simbolo}
                    onChange={(e) => {
                      const newCampos = [...config.camposOrdenes];
                      newCampos[index].simbolo = e.target.value;
                      setConfig({ ...config, camposOrdenes: newCampos });
                    }}
                    className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <button onClick={() => handleSaveCampoOrden(index)} className="btn-primary px-3 py-2 text-sm">Guardar</button>
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
              Cuando el control de pago se encuentra activo este impide ingresar una orden de
              servicio, venta o compra cuando el importe del pago es distinto al importe total.
            </p>
            <div className="flex items-center gap-2">
              <select
                value={config.controlPago}
                onChange={(e) => setConfig({ ...config, controlPago: e.target.value as 'Activado' | 'Desactivado' })}
                className="h-9 w-48 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option>Activado</option>
                <option>Desactivado</option>
              </select>
              <button onClick={handleSaveControlPago} className="btn-primary px-4 py-2 text-sm">Guardar</button>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-white text-gray-900 shadow-sm">
          <CardContent className="p-6 space-y-4">
            <div className="text-sm font-medium text-gray-900">Estado de órdenes</div>
            <div className="h-px bg-gray-200"></div>
            <p className="text-sm text-gray-600">
              Define los estados de órdenes que quieras utilizar
            </p>
            <div className="space-y-2">
              {config.estadosOrden.map((row, index) => (
                <div key={index} className="grid grid-cols-[140px_1fr_100px] gap-3 items-center">
                  <span className="text-sm text-gray-600">{row.label}</span>
                  <input
                    type="text"
                    value={row.value}
                    onChange={(e) => {
                      const newEstados = [...config.estadosOrden];
                      newEstados[index].value = e.target.value;
                      setConfig({ ...config, estadosOrden: newEstados });
                    }}
                    className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <button onClick={() => handleSaveEstadoOrden(index)} className="btn-primary px-3 py-2 text-sm">Guardar</button>
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
              Configura los datos que quieras almacenar cuando registres un vehículo.
            </p>
            <div className="grid grid-cols-[1fr_100px] gap-3 text-xs font-semibold text-gray-600 uppercase">
              <span>Nombre</span>
              <span></span>
            </div>
            <div className="space-y-2">
              {config.camposVehiculo.map((label, index) => (
                <div key={index} className="grid grid-cols-[1fr_100px] gap-3 items-center">
                  <input
                    type="text"
                    value={label}
                    onChange={(e) => {
                      const newCampos = [...config.camposVehiculo];
                      newCampos[index] = e.target.value;
                      setConfig({ ...config, camposVehiculo: newCampos });
                    }}
                    className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <button onClick={() => handleSaveCampoVehiculo(index)} className="btn-primary px-3 py-2 text-sm">Guardar</button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-border bg-white text-gray-900 shadow-sm">
        <CardContent className="p-6 space-y-4">
          <div className="text-sm font-medium text-gray-900">Checklist</div>
          <div className="h-px bg-gray-200"></div>
          <p className="text-sm text-gray-600">
            Crea un listado de servicios que realices con frecuencia para luego agregarlo a la orden
            de trabajo o presupuesto con tan solo un clic. Para crear tu checklist haz{' '}
            <button className="text-red-600 hover:underline">CLIC AQUÍ</button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
