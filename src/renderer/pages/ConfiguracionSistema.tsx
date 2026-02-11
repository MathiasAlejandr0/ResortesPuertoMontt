import { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { notify } from '../utils/cn';
import { Save } from 'lucide-react';

interface SistemaConfig {
  preferenciasIdioma: {
    nombrePlaca: string;
    queReparas: string;
    impuestoPrincipal: string;
    documento: string;
  };
  aplicacion: {
    simboloMoneda: string;
    cantidadDecimales: string;
    modoOscuro: boolean;
  };
  impuestos: Array<{ label: string; value: string }>;
}

export default function ConfiguracionSistemaPage() {
  const [config, setConfig] = useState<SistemaConfig>({
    preferenciasIdioma: {
      nombrePlaca: 'Patente',
      queReparas: 'Vehículo',
      impuestoPrincipal: 'IVA',
      documento: 'RUT'
    },
    aplicacion: {
      simboloMoneda: '$',
      cantidadDecimales: '0',
      modoOscuro: false
    },
    impuestos: [
      { label: 'Valor principal', value: '0' },
      { label: 'Valor 2', value: 'Val 2' },
      { label: 'Valor 3', value: 'Val 3' },
      { label: 'Valor 4', value: 'Val 4' }
    ]
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
      const sistemaConfig = configs?.find((c: any) => c.clave === 'sistema_config');
      if (sistemaConfig) {
        try {
          const parsed = JSON.parse(sistemaConfig.valor);
          setConfig(parsed);
        } catch (e) {
          console.error('Error parsing sistema config:', e);
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
        clave: 'sistema_config',
        valor: JSON.stringify(config),
        descripcion: 'Configuración del sistema'
      });
      notify.success('Éxito', 'Configuración guardada correctamente');
      window.dispatchEvent(new CustomEvent('config-updated', { detail: { clave: 'sistema_config' } }));
    } catch (error: any) {
      notify.error('Error', 'No se pudo guardar la configuración: ' + (error.message || 'Error desconocido'));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveField = async (section: string, field: string, value: any) => {
    try {
      const newConfig = { ...config };
      if (section === 'preferenciasIdioma') {
        (newConfig.preferenciasIdioma as any)[field] = value;
      } else if (section === 'aplicacion') {
        (newConfig.aplicacion as any)[field] = value;
      }
      setConfig(newConfig);
      await window.electronAPI?.saveConfiguracion({
        clave: 'sistema_config',
        valor: JSON.stringify(newConfig),
        descripcion: 'Configuración del sistema'
      });
      notify.success('Éxito', 'Campo guardado');
    } catch (error: any) {
      notify.error('Error', 'No se pudo guardar');
    }
  };

  const handleSaveImpuesto = async (index: number) => {
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
            <div className="text-sm font-medium text-gray-900">Preferencias de idioma</div>
            <div className="h-px bg-gray-200"></div>

            <div className="space-y-3">
              <div className="grid grid-cols-[220px_1fr_100px] gap-3 items-center">
                <div className="text-sm text-gray-700 flex items-center gap-2">
                  <span>⚠️</span>
                  <span>Nombre de la placa</span>
                </div>
                <input
                  type="text"
                  value={config.preferenciasIdioma.nombrePlaca}
                  onChange={(e) => setConfig({
                    ...config,
                    preferenciasIdioma: { ...config.preferenciasIdioma, nombrePlaca: e.target.value }
                  })}
                  className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <button
                  onClick={() => handleSaveField('preferenciasIdioma', 'nombrePlaca', config.preferenciasIdioma.nombrePlaca)}
                  className="btn-primary px-3 py-2 text-sm"
                >
                  Guardar
                </button>
              </div>

              <div className="grid grid-cols-[220px_1fr_100px] gap-3 items-center">
                <div className="text-sm text-gray-700 flex items-center gap-2">
                  <span>⚠️</span>
                  <span>¿Qué reparas?</span>
                </div>
                <input
                  type="text"
                  value={config.preferenciasIdioma.queReparas}
                  onChange={(e) => setConfig({
                    ...config,
                    preferenciasIdioma: { ...config.preferenciasIdioma, queReparas: e.target.value }
                  })}
                  className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <button
                  onClick={() => handleSaveField('preferenciasIdioma', 'queReparas', config.preferenciasIdioma.queReparas)}
                  className="btn-primary px-3 py-2 text-sm"
                >
                  Guardar
                </button>
              </div>

              <div className="grid grid-cols-[220px_1fr_100px] gap-3 items-center">
                <div className="text-sm text-gray-700">Impuesto principal</div>
                <input
                  type="text"
                  value={config.preferenciasIdioma.impuestoPrincipal}
                  onChange={(e) => setConfig({
                    ...config,
                    preferenciasIdioma: { ...config.preferenciasIdioma, impuestoPrincipal: e.target.value }
                  })}
                  className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <button
                  onClick={() => handleSaveField('preferenciasIdioma', 'impuestoPrincipal', config.preferenciasIdioma.impuestoPrincipal)}
                  className="btn-primary px-3 py-2 text-sm"
                >
                  Guardar
                </button>
              </div>

              <div className="grid grid-cols-[220px_1fr_100px] gap-3 items-center">
                <div className="text-sm text-gray-700">Documento</div>
                <input
                  type="text"
                  value={config.preferenciasIdioma.documento}
                  onChange={(e) => setConfig({
                    ...config,
                    preferenciasIdioma: { ...config.preferenciasIdioma, documento: e.target.value }
                  })}
                  className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <button
                  onClick={() => handleSaveField('preferenciasIdioma', 'documento', config.preferenciasIdioma.documento)}
                  className="btn-primary px-3 py-2 text-sm"
                >
                  Guardar
                </button>
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
                  value={config.aplicacion.simboloMoneda}
                  onChange={(e) => setConfig({
                    ...config,
                    aplicacion: { ...config.aplicacion, simboloMoneda: e.target.value }
                  })}
                  maxLength={3}
                  className="h-9 w-24 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <button
                  onClick={() => handleSaveField('aplicacion', 'simboloMoneda', config.aplicacion.simboloMoneda)}
                  className="btn-primary px-3 py-2 text-sm"
                >
                  Guardar
                </button>
              </div>

              <div className="grid grid-cols-[220px_1fr_100px] gap-3 items-center">
                <div className="text-sm text-gray-700">Cantidad de decimales</div>
                <input
                  type="text"
                  value={config.aplicacion.cantidadDecimales}
                  onChange={(e) => setConfig({
                    ...config,
                    aplicacion: { ...config.aplicacion, cantidadDecimales: e.target.value }
                  })}
                  maxLength={1}
                  className="h-9 w-24 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <button
                  onClick={() => handleSaveField('aplicacion', 'cantidadDecimales', config.aplicacion.cantidadDecimales)}
                  className="btn-primary px-3 py-2 text-sm"
                >
                  Guardar
                </button>
              </div>

              <div className="grid grid-cols-[220px_1fr] gap-3 items-center">
                <div className="text-sm text-gray-700">Modo oscuro</div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.aplicacion.modoOscuro}
                    onChange={(e) => {
                      setConfig({
                        ...config,
                        aplicacion: { ...config.aplicacion, modoOscuro: e.target.checked }
                      });
                      handleSaveField('aplicacion', 'modoOscuro', e.target.checked);
                    }}
                    className="h-4 w-4 accent-red-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-[220px_1fr_100px] gap-3 items-center">
                <div className="text-sm text-gray-700">Exportar datos registrados</div>
                <button
                  onClick={() => {
                    // Esto se implementará en el módulo Exportar
                    notify.info('Info', 'Funcionalidad de exportación disponible en el módulo Exportar');
                  }}
                  className="btn-primary px-3 py-2 text-sm"
                >
                  Exportar
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-white text-gray-900 shadow-sm xl:col-span-2">
          <CardContent className="p-6 space-y-4">
            <div className="text-sm font-medium text-gray-900">Configura tu impuesto principal (IVA)</div>
            <div className="h-px bg-gray-200"></div>
            <p className="text-sm text-gray-600">
              Define los valores del impuesto principal que deseas utilizar
            </p>
            <div className="space-y-2">
              {config.impuestos.map((row, index) => (
                <div key={index} className="grid grid-cols-[140px_1fr_100px] gap-3 items-center">
                  <span className="text-sm text-gray-600">{row.label}</span>
                  <input
                    type="text"
                    value={row.value}
                    onChange={(e) => {
                      const newImpuestos = [...config.impuestos];
                      newImpuestos[index].value = e.target.value;
                      setConfig({ ...config, impuestos: newImpuestos });
                    }}
                    className="h-9 w-28 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <button onClick={() => handleSaveImpuesto(index)} className="btn-primary px-3 py-2 text-sm">Guardar</button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
