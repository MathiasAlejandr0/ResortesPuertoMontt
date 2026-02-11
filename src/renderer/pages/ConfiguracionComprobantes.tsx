import { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { notify } from '../utils/cn';
import { Save } from 'lucide-react';

interface ComprobantesConfig {
  membrete: {
    nombreTaller: string;
    email: string;
    infoAdicional: string;
    horarioAtencion: string;
    telefonoFijo: string;
    ciudad: string;
    whatsapp: string;
    direccion: string;
  };
  camposPersonalizados: {
    kilometraje: boolean;
    nombreInspector: boolean;
    numeroSiniestro: boolean;
    franquicia: boolean;
  };
  detalleProductosServicios: string;
  otros: {
    mostrarDetallePago: boolean;
    mostrarPanelFirma: boolean;
    mostrarNivelCombustible: boolean;
    ocultarDetalleManoObra: boolean;
  };
  informacionAdicional: string;
}

export default function ConfiguracionComprobantesPage() {
  const [config, setConfig] = useState<ComprobantesConfig>({
    membrete: {
      nombreTaller: 'resortes puerto montt',
      email: '',
      infoAdicional: '',
      horarioAtencion: '',
      telefonoFijo: '',
      ciudad: '',
      whatsapp: '',
      direccion: ''
    },
    camposPersonalizados: {
      kilometraje: false,
      nombreInspector: false,
      numeroSiniestro: false,
      franquicia: false
    },
    detalleProductosServicios: 'Mostrar todos los datos',
    otros: {
      mostrarDetallePago: false,
      mostrarPanelFirma: false,
      mostrarNivelCombustible: false,
      ocultarDetalleManoObra: false
    },
    informacionAdicional: ''
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
      const comprobantesConfig = configs?.find((c: any) => c.clave === 'comprobantes_config');
      if (comprobantesConfig) {
        try {
          const parsed = JSON.parse(comprobantesConfig.valor);
          setConfig(parsed);
        } catch (e) {
          console.error('Error parsing comprobantes config:', e);
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
        clave: 'comprobantes_config',
        valor: JSON.stringify(config),
        descripcion: 'Configuración de comprobantes'
      });
      notify.success('Éxito', 'Configuración guardada correctamente');
      window.dispatchEvent(new CustomEvent('config-updated', { detail: { clave: 'comprobantes_config' } }));
    } catch (error: any) {
      notify.error('Error', 'No se pudo guardar la configuración: ' + (error.message || 'Error desconocido'));
    } finally {
      setSaving(false);
    }
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
      <div className="flex items-center justify-between">
        <div className="rounded-md bg-gray-100 text-gray-700 text-sm px-4 py-3">
          Al finalizar la configuración te recomendamos actualizar{' '}
          <button className="text-red-600 hover:underline">DESDE AQUÍ</button> para aplicar
          los cambios en todas las funciones del sistema.
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Guardando...' : 'Guardar Configuración'}
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="border border-border bg-white text-gray-900 shadow-sm">
          <CardContent className="p-6 space-y-6">
            <div>
              <div className="text-sm font-medium text-gray-900">Membrete</div>
              <div className="h-px bg-gray-200 mt-2"></div>
              <p className="text-sm text-gray-600 mt-3">
                Configura tu membrete para que los comprobantes impresos y los mensajes de
                WhatsApp incluyan la información de tu taller.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700 mb-2">Nombre del taller</label>
                <input
                  type="text"
                  value={config.membrete.nombreTaller}
                  onChange={(e) => setConfig({
                    ...config,
                    membrete: { ...config.membrete, nombreTaller: e.target.value }
                  })}
                  className="h-9 w-full px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-2">Correo electrónico</label>
                <input
                  type="text"
                  value={config.membrete.email}
                  onChange={(e) => setConfig({
                    ...config,
                    membrete: { ...config.membrete, email: e.target.value }
                  })}
                  placeholder="Ej: info@dirup.net"
                  className="h-9 w-full px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-2">Info adicional</label>
                <input
                  type="text"
                  value={config.membrete.infoAdicional}
                  onChange={(e) => setConfig({
                    ...config,
                    membrete: { ...config.membrete, infoAdicional: e.target.value }
                  })}
                  placeholder="Tu nombre"
                  className="h-9 w-full px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-2">Horario de atención</label>
                <input
                  type="text"
                  value={config.membrete.horarioAtencion}
                  onChange={(e) => setConfig({
                    ...config,
                    membrete: { ...config.membrete, horarioAtencion: e.target.value }
                  })}
                  placeholder="Ej: 8:00 a 13:00 | 15:00 a 18:00"
                  className="h-9 w-full px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-2">Teléfono fijo o Fax</label>
                <input
                  type="text"
                  value={config.membrete.telefonoFijo}
                  onChange={(e) => setConfig({
                    ...config,
                    membrete: { ...config.membrete, telefonoFijo: e.target.value }
                  })}
                  placeholder="Ej: 475-9538"
                  className="h-9 w-full px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-2">Ciudad</label>
                <input
                  type="text"
                  value={config.membrete.ciudad}
                  onChange={(e) => setConfig({
                    ...config,
                    membrete: { ...config.membrete, ciudad: e.target.value }
                  })}
                  placeholder="Tu ciudad"
                  className="h-9 w-full px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-2">WhatsApp</label>
                <input
                  type="text"
                  value={config.membrete.whatsapp}
                  onChange={(e) => setConfig({
                    ...config,
                    membrete: { ...config.membrete, whatsapp: e.target.value }
                  })}
                  className="h-9 w-full px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-2">Dirección</label>
                <input
                  type="text"
                  value={config.membrete.direccion}
                  onChange={(e) => setConfig({
                    ...config,
                    membrete: { ...config.membrete, direccion: e.target.value }
                  })}
                  placeholder="Dirección del taller"
                  className="h-9 w-full px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-white text-gray-900 shadow-sm">
          <CardContent className="p-6 space-y-6">
            <div>
              <div className="text-sm font-medium text-gray-900">Detalle</div>
              <div className="h-px bg-gray-200 mt-2"></div>
              <p className="text-sm text-gray-600 mt-3">
                Activa los valores que quieras que se muestren en tus comprobantes.
              </p>
            </div>

            <div>
              <div className="text-sm font-medium text-red-600">Campos personalizados</div>
              <div className="h-px bg-gray-200 mt-2"></div>
              {[
                { key: 'kilometraje', label: 'Kilometraje' },
                { key: 'nombreInspector', label: 'Nombre Inspector' },
                { key: 'numeroSiniestro', label: 'Número Siniestro' },
                { key: 'franquicia', label: 'Franquicia' }
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between py-2 border-b border-gray-200 text-sm">
                  <span>- {label}</span>
                  <input
                    type="checkbox"
                    checked={config.camposPersonalizados[key as keyof typeof config.camposPersonalizados]}
                    onChange={(e) => setConfig({
                      ...config,
                      camposPersonalizados: {
                        ...config.camposPersonalizados,
                        [key]: e.target.checked
                      }
                    })}
                    className="h-4 w-4 accent-red-600"
                  />
                </div>
              ))}
            </div>

            <div>
              <div className="text-sm font-medium text-red-600">Detalle de productos y servicios</div>
              <div className="h-px bg-gray-200 mt-2"></div>
              <select
                value={config.detalleProductosServicios}
                onChange={(e) => setConfig({ ...config, detalleProductosServicios: e.target.value })}
                className="mt-3 h-9 w-full max-w-xs px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option>Mostrar todos los datos</option>
                <option>Mostrar solo resumen</option>
                <option>Ocultar detalles</option>
              </select>
            </div>

            <div>
              <div className="text-sm font-medium text-red-600">Otros</div>
              <div className="h-px bg-gray-200 mt-2"></div>
              {[
                { key: 'mostrarDetallePago', label: 'Mostrar detalle de pago' },
                { key: 'mostrarPanelFirma', label: 'Mostrar panel de firma' },
                { key: 'mostrarNivelCombustible', label: 'Mostrar nivel de combustible' },
                { key: 'ocultarDetalleManoObra', label: 'Ocultar detalle de mano de obra y repuestos' }
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between py-2 border-b border-gray-200 text-sm">
                  <span>- {label}</span>
                  <input
                    type="checkbox"
                    checked={config.otros[key as keyof typeof config.otros]}
                    onChange={(e) => setConfig({
                      ...config,
                      otros: {
                        ...config.otros,
                        [key]: e.target.checked
                      }
                    })}
                    className="h-4 w-4 accent-red-600"
                  />
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
                value={config.informacionAdicional}
                onChange={(e) => setConfig({ ...config, informacionAdicional: e.target.value.slice(0, 800) })}
                placeholder="..."
                maxLength={800}
                className="mt-3 w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                {config.informacionAdicional.length}/800 caracteres
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
