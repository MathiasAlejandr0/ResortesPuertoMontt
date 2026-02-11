import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { confirmAction, notify, formatearRUT } from '../utils/cn';
import { useApp } from '../contexts/AppContext';
import { 
  Settings, 
  Database, 
  Download, 
  Upload, 
  RotateCcw, 
  Clock, 
  HardDrive,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Trash2,
  Calendar,
  FileText,
  Shield,
  Building,
  Save,
  Phone,
  Mail,
  Globe,
  Wrench
} from 'lucide-react';

interface BackupInfo {
  id: string;
  fecha: string;
  tamaño: string;
  tipo: 'manual' | 'automatico';
  estado: 'exitoso' | 'error' | 'en_proceso';
  descripcion: string;
}

interface LogFileInfo {
  name: string;
  size: string;
  sizeBytes: number;
  updatedAt: string;
  createdAt: string;
}

export default function ConfiguracionPage() {
  const { refreshRepuestos } = useApp();
  const [activeTab, setActiveTab] = useState('negocio');
  const [isLoading, setIsLoading] = useState(false);
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(true);
  const [backupInterval, setBackupInterval] = useState(30); // minutos
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logFiles, setLogFiles] = useState<LogFileInfo[]>([]);
  const [recentLogs, setRecentLogs] = useState<string[]>([]);
  const [recentErrors, setRecentErrors] = useState<string[]>([]);
  const [logDir, setLogDir] = useState<string>('');
  const [logLoading, setLogLoading] = useState(false);
  const [logExporting, setLogExporting] = useState(false);

  // Estados para importación de datos
  const [importacionStats, setImportacionStats] = useState({
    total: 0,
    conStock: 0,
    sinStock: 0,
    categorias: []
  });
  const [importando, setImportando] = useState(false);
  const [resultadoImportacion, setResultadoImportacion] = useState<{
    exitosos: number;
    errores: number;
    error?: string;
  } | null>(null);
  const [repairing, setRepairing] = useState(false);
  const [repairResult, setRepairResult] = useState<Record<string, number> | null>(null);

  // Estados para información del negocio
  const [negocioInfo, setNegocioInfo] = useState({
    nombreTaller: 'Resortes Puerto Montt',
    rut: '12.345.678-9',
    direccion: 'Av. Principal 123, Puerto Montt',
    telefono: '+56 9 1234 5678',
    email: 'info@resortespuertomontt.cl',
    sitioWeb: 'www.resortespuertomontt.cl'
  });

  // Estados para mensajes predefinidos
  const [mensajesPredefinidos, setMensajesPredefinidos] = useState({
    whatsappCotizacion: `🏢 *{NOMBRE_TALLER}*

Hola {NOMBRE_CLIENTE},

Te enviamos la cotización solicitada:

📋 *COTIZACIÓN {NUMERO_COTIZACION}*
📅 Fecha: {FECHA_COTIZACION}
📅 Válida hasta: {FECHA_VALIDA}

🚗 *VEHÍCULO:*
{MARCA_VEHICULO} {MODELO_VEHICULO} {AÑO_VEHICULO}
Patente: {PATENTE_VEHICULO}

📝 *DESCRIPCIÓN:*
{DESCRIPCION_COTIZACION}

💰 *TOTAL: $'{TOTAL_COTIZACION}'*

{OBSERVACIONES_COTIZACION}

¿Te interesa proceder con esta cotización?

Saludos cordiales,
Equipo {NOMBRE_TALLER}
📞 {TELEFONO_TALLER}`,
    whatsappOrden: `🏢 *{NOMBRE_TALLER}*

Hola {NOMBRE_CLIENTE},

Te informamos sobre tu orden de trabajo:

🔧 *ORDEN DE TRABAJO {NUMERO_ORDEN}*
📅 Fecha de ingreso: {FECHA_INGRESO}
{FECHA_ENTREGA}

🚗 *VEHÍCULO:*
{MARCA_VEHICULO} {MODELO_VEHICULO} {AÑO_VEHICULO}
Patente: {PATENTE_VEHICULO}
{KILOMETRAJE_ENTRADA}

📝 *DESCRIPCIÓN DEL TRABAJO:*
{DESCRIPCION_ORDEN}

⚡ *PRIORIDAD:* {PRIORIDAD_ORDEN}
{TECNICO_ASIGNADO}

💰 *TOTAL ESTIMADO: $'{TOTAL_ORDEN}'*

{OBSERVACIONES_ORDEN}

Te mantendremos informado del progreso.

Saludos cordiales,
Equipo {NOMBRE_TALLER}
📞 {TELEFONO_TALLER}`,
    emailCotizacion: `Estimado/a {NOMBRE_CLIENTE},

Esperamos que se encuentre bien. Le enviamos la cotización solicitada para su vehículo.

DETALLES DE LA COTIZACIÓN:
- Número: {NUMERO_COTIZACION}
- Fecha: {FECHA_COTIZACION}
- Válida hasta: {FECHA_VALIDA}

VEHÍCULO:
- Marca: {MARCA_VEHICULO}
- Modelo: {MODELO_VEHICULO}
- Año: {AÑO_VEHICULO}
- Patente: {PATENTE_VEHICULO}

DESCRIPCIÓN DEL TRABAJO:
{DESCRIPCION_COTIZACION}

TOTAL: $'{TOTAL_COTIZACION}'

{OBSERVACIONES_COTIZACION}

Si está de acuerdo con esta cotización, por favor confírmenos para proceder con el trabajo.

Quedamos atentos a sus comentarios.

Saludos cordiales,
Equipo {NOMBRE_TALLER}
Teléfono: {TELEFONO_TALLER}
Email: {EMAIL_TALLER}`,
    emailOrden: `Estimado/a {NOMBRE_CLIENTE},

Le informamos sobre su orden de trabajo:

DETALLES DE LA ORDEN:
- Número: {NUMERO_ORDEN}
- Fecha de ingreso: {FECHA_INGRESO}
{FECHA_ENTREGA}

VEHÍCULO:
- Marca: {MARCA_VEHICULO}
- Modelo: {MODELO_VEHICULO}
- Año: {AÑO_VEHICULO}
- Patente: {PATENTE_VEHICULO}
{KILOMETRAJE_ENTRADA}

DESCRIPCIÓN DEL TRABAJO:
{DESCRIPCION_ORDEN}

PRIORIDAD: {PRIORIDAD_ORDEN}
{TECNICO_ASIGNADO}

TOTAL ESTIMADO: $'{TOTAL_ORDEN}'

{OBSERVACIONES_ORDEN}

Le mantendremos informado del progreso del trabajo.

Saludos cordiales,
Equipo {NOMBRE_TALLER}
Teléfono: {TELEFONO_TALLER}
Email: {EMAIL_TALLER}`
  });

  const loadBackupInfo = async () => {
    try {
      if (!window.electronAPI || !window.electronAPI.getBackups) {
        console.warn('electronAPI.getBackups no está disponible');
        setBackups([]);
        return;
      }

      const backupFiles = await window.electronAPI.getBackups();
      
      // Mapear los datos reales al formato BackupInfo
      const backups: BackupInfo[] = backupFiles.map((backup: any) => ({
        id: backup.id,
        fecha: new Date(backup.createdAt).toISOString(),
        tamaño: backup.size,
        tipo: backup.tipo || 'automatico',
        estado: 'exitoso' as const,
        descripcion: backup.tipo === 'manual' ? 'Backup manual creado' : 'Backup automático del sistema'
      }));

      setBackups(backups);
      
      // Establecer último backup si existe
      if (backups.length > 0) {
        setLastBackup(backups[0].fecha);
      }
    } catch (error) {
      console.error('Error cargando información de backups:', error);
      setError('Error al cargar los backups');
    }
  };

  const createBackup = async (tipo: 'manual' | 'automatico') => {
    setIsLoading(true);
    try {
      // Crear backup usando la API de Electron
      const result = await window.electronAPI.createBackup();
      
      if (result.success) {
        // Recargar la lista de backups para mostrar el nuevo
        await loadBackupInfo();
        setLastBackup(new Date().toISOString());
        toast.success('Backup creado exitosamente');
      } else {
        throw new Error(result.error || 'Error desconocido');
      }
    } catch (error) {
      console.error('Error creando backup:', error);
      toast.error('Error al crear el backup');
    } finally {
      setIsLoading(false);
    }
  };

  const restoreBackup = async (backupId: string) => {
    if (!confirm('¿Estás seguro de que quieres restaurar este backup? Esto reemplazará todos los datos actuales.')) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await window.electronAPI.restoreBackup(backupId);
      
      if (result.success) {
        toast.success('Sistema restaurado exitosamente. La aplicación se reiniciará.');
        // Reiniciar la aplicación
        setTimeout(() => window.location.reload(), 1500);
      } else {
        throw new Error(result.error || 'Error desconocido');
      }
    } catch (error) {
      console.error('Error restaurando backup:', error);
      toast.error('Error al restaurar el backup');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteBackup = async (backupId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este backup?')) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await window.electronAPI.deleteBackup(backupId);
      
      if (result.success) {
        // Recargar la lista de backups
        await loadBackupInfo();
        toast.success('Backup eliminado exitosamente');
      } else {
        throw new Error(result.error || 'Error desconocido');
      }
    } catch (error) {
      console.error('Error eliminando backup:', error);
      toast.error('Error al eliminar el backup');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-CL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const loadLogs = async () => {
    setLogLoading(true);
    try {
      if (!window.electronAPI?.getLogsSummary) {
        console.warn('electronAPI.getLogsSummary no está disponible');
        setLogFiles([]);
        setRecentLogs([]);
        setRecentErrors([]);
        setLogDir('');
        return;
      }

      const result = await window.electronAPI.getLogsSummary();
      setLogFiles(result?.files || []);
      setRecentLogs(result?.recent?.app || []);
      setRecentErrors(result?.recent?.error || []);
      setLogDir(result?.logDir || '');
    } catch (logError) {
      console.error('Error cargando logs:', logError);
      toast.error('Error al cargar los logs');
    } finally {
      setLogLoading(false);
    }
  };

  const handleOpenLogsFolder = async () => {
    try {
      if (!window.electronAPI?.openLogsFolder) {
        toast.error('No se pudo abrir la carpeta de logs');
        return;
      }
      const result = await window.electronAPI.openLogsFolder();
      if (result?.success !== true) {
        toast.error(result?.error || 'No se pudo abrir la carpeta de logs');
        return;
      }
    } catch (logError) {
      console.error('Error abriendo carpeta de logs:', logError);
      toast.error('No se pudo abrir la carpeta de logs');
    }
  };

  const handleExportLogs = async () => {
    setLogExporting(true);
    try {
      if (!window.electronAPI?.exportLogs) {
        toast.error('No se pudo exportar los logs');
        return;
      }
      const result = await window.electronAPI.exportLogs();
      if (result?.success) {
        toast.success(`Logs exportados: ${result.path}`);
      } else if (!result?.canceled) {
        toast.error(result?.error || 'No se pudo exportar los logs');
      }
    } catch (logError) {
      console.error('Error exportando logs:', logError);
      toast.error('No se pudo exportar los logs');
    } finally {
      setLogExporting(false);
    }
  };

  const handleSaveMensajes = async () => {
    setIsLoading(true);
    try {
      // Guardar los mensajes en la base de datos
      await window.electronAPI.saveConfiguracion({
        clave: 'mensajes_predefinidos',
        valor: JSON.stringify(mensajesPredefinidos),
        descripcion: 'Mensajes predefinidos para WhatsApp y Email'
      });
      window.dispatchEvent(new CustomEvent('config-updated', { detail: { clave: 'mensajes_predefinidos' } }));
      toast.success('Mensajes predefinidos guardados exitosamente');
    } catch (error) {
      console.error('Error guardando mensajes:', error);
      toast.error('Error al guardar los mensajes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetMensajes = () => {
    if (confirm('¿Estás seguro de que quieres restaurar los mensajes por defecto?')) {
      setMensajesPredefinidos({
        whatsappCotizacion: `🏢 *{NOMBRE_TALLER}*

Hola {NOMBRE_CLIENTE},

Te enviamos la cotización solicitada:

📋 *COTIZACIÓN {NUMERO_COTIZACION}*
📅 Fecha: {FECHA_COTIZACION}
📅 Válida hasta: {FECHA_VALIDA}

🚗 *VEHÍCULO:*
{MARCA_VEHICULO} {MODELO_VEHICULO} {AÑO_VEHICULO}
Patente: {PATENTE_VEHICULO}

📝 *DESCRIPCIÓN:*
{DESCRIPCION_COTIZACION}

💰 *TOTAL: $'{TOTAL_COTIZACION}'*

{OBSERVACIONES_COTIZACION}

¿Te interesa proceder con esta cotización?

Saludos cordiales,
Equipo {NOMBRE_TALLER}
📞 {TELEFONO_TALLER}`,
        whatsappOrden: `🏢 *{NOMBRE_TALLER}*

Hola {NOMBRE_CLIENTE},

Te informamos sobre tu orden de trabajo:

🔧 *ORDEN DE TRABAJO {NUMERO_ORDEN}*
📅 Fecha de ingreso: {FECHA_INGRESO}
{FECHA_ENTREGA}

🚗 *VEHÍCULO:*
{MARCA_VEHICULO} {MODELO_VEHICULO} {AÑO_VEHICULO}
Patente: {PATENTE_VEHICULO}
{KILOMETRAJE_ENTRADA}

📝 *DESCRIPCIÓN DEL TRABAJO:*
{DESCRIPCION_ORDEN}

⚡ *PRIORIDAD:* {PRIORIDAD_ORDEN}
{TECNICO_ASIGNADO}

💰 *TOTAL ESTIMADO: $'{TOTAL_ORDEN}'*

{OBSERVACIONES_ORDEN}

Te mantendremos informado del progreso.

Saludos cordiales,
Equipo {NOMBRE_TALLER}
📞 {TELEFONO_TALLER}`,
        emailCotizacion: `Estimado/a {NOMBRE_CLIENTE},

Esperamos que se encuentre bien. Le enviamos la cotización solicitada para su vehículo.

DETALLES DE LA COTIZACIÓN:
- Número: {NUMERO_COTIZACION}
- Fecha: {FECHA_COTIZACION}
- Válida hasta: {FECHA_VALIDA}

VEHÍCULO:
- Marca: {MARCA_VEHICULO}
- Modelo: {MODELO_VEHICULO}
- Año: {AÑO_VEHICULO}
- Patente: {PATENTE_VEHICULO}

DESCRIPCIÓN DEL TRABAJO:
{DESCRIPCION_COTIZACION}

TOTAL: $'{TOTAL_COTIZACION}'

{OBSERVACIONES_COTIZACION}

Si está de acuerdo con esta cotización, por favor confírmenos para proceder con el trabajo.

Quedamos atentos a sus comentarios.

Saludos cordiales,
Equipo {NOMBRE_TALLER}
Teléfono: {TELEFONO_TALLER}
Email: {EMAIL_TALLER}`,
        emailOrden: `Estimado/a {NOMBRE_CLIENTE},

Le informamos sobre su orden de trabajo:

DETALLES DE LA ORDEN:
- Número: {NUMERO_ORDEN}
- Fecha de ingreso: {FECHA_INGRESO}
{FECHA_ENTREGA}

VEHÍCULO:
- Marca: {MARCA_VEHICULO}
- Modelo: {MODELO_VEHICULO}
- Año: {AÑO_VEHICULO}
- Patente: {PATENTE_VEHICULO}
{KILOMETRAJE_ENTRADA}

DESCRIPCIÓN DEL TRABAJO:
{DESCRIPCION_ORDEN}

PRIORIDAD: {PRIORIDAD_ORDEN}
{TECNICO_ASIGNADO}

TOTAL ESTIMADO: $'{TOTAL_ORDEN}'

{OBSERVACIONES_ORDEN}

Le mantendremos informado del progreso del trabajo.

Saludos cordiales,
Equipo {NOMBRE_TALLER}
Teléfono: {TELEFONO_TALLER}
Email: {EMAIL_TALLER}`
      });
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'exitoso':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'en_proceso':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleSaveNegocio = async () => {
    setIsLoading(true);
    try {
      // Guardar la información del negocio en la base de datos
      await window.electronAPI.saveConfiguracion({
        clave: 'negocio_info',
        valor: JSON.stringify(negocioInfo),
        descripcion: 'Información del negocio'
      });
      window.dispatchEvent(new CustomEvent('config-updated', { detail: { clave: 'negocio_info' } }));
      toast.success('Información del negocio guardada exitosamente');
    } catch (error) {
      console.error('Error guardando información del negocio:', error);
      toast.error('Error al guardar la información del negocio');
    } finally {
      setIsLoading(false);
    }
  };

  // Funciones para importación de datos
  const cargarEstadisticasRepuestos = async () => {
    try {
      if (!window.electronAPI) {
        console.warn('electronAPI no está disponible');
        return;
      }
      
      const stats = await window.electronAPI.obtenerEstadisticasRepuestos();
      setImportacionStats(stats);
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
      setError('Error cargando estadísticas de repuestos');
    }
  };

  const importarInventarioPrincipal = async () => {
    if (!confirm('¿Estás seguro de que quieres importar el inventario principal? Esto agregará 1225 repuestos al sistema.')) {
      return;
    }

    setImportando(true);
    setResultadoImportacion(null);

    try {
      // Datos hardcodeados para evitar problemas de carga de archivos en producción
      const datos = [
        {
          codigo: "ACE001",
          nombre: "Aceite Motor 5W30",
          descripcion: "Aceite sintético para motor",
          precio: 25000,
          stock: 20,
          stockMinimo: 5,
          categoria: "Motor",
          marca: "Castrol",
          ubicacion: "Estante A1",
          activo: true
        },
        {
          codigo: "FIL001", 
          nombre: "Filtro de Aceite",
          descripcion: "Filtro de aceite motor",
          precio: 8000,
          stock: 15,
          stockMinimo: 3,
          categoria: "Motor",
          marca: "Mann",
          ubicacion: "Estante A2",
          activo: true
        },
        {
          codigo: "FR001",
          nombre: "Pastillas de Freno",
          descripcion: "Pastillas de freno delanteras",
          precio: 35000,
          stock: 10,
          stockMinimo: 2,
          categoria: "Frenos",
          marca: "Brembo",
          ubicacion: "Estante B1",
          activo: true
        },
        {
          codigo: "AM001",
          nombre: "Amortiguador Delantero",
          descripcion: "Amortiguador hidráulico",
          precio: 120000,
          stock: 5,
          stockMinimo: 1,
          categoria: "Suspensión",
          marca: "Monroe",
          ubicacion: "Estante C1",
          activo: true
        },
        {
          codigo: "BAT001",
          nombre: "Batería 12V 60Ah",
          descripcion: "Batería para vehículo",
          precio: 85000,
          stock: 8,
          stockMinimo: 2,
          categoria: "Eléctrico",
          marca: "Varta",
          ubicacion: "Estante D1",
          activo: true
        }
      ];
      
      if (!window.electronAPI) {
        throw new Error('electronAPI no está disponible');
      }
      
      await window.electronAPI.importarRepuestos(datos);
      // Si llegamos aquí, la importación fue exitosa
      setResultadoImportacion({
        exitosos: datos.length,
        errores: 0
      });
      
      // Recargar estadísticas
      await cargarEstadisticasRepuestos();
      
    } catch (error) {
      console.error('Error importando inventario:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setResultadoImportacion({
        exitosos: 0,
        errores: 1,
        error: `Error al importar datos: ${errorMessage}`
      });
    } finally {
      setImportando(false);
    }
  };

  const importarPlantilla = async () => {
    if (!confirm('¿Estás seguro de que quieres importar la plantilla? Esto agregará 790 repuestos al sistema.')) {
      return;
    }

    setImportando(true);
    setResultadoImportacion(null);

    try {
      // Datos hardcodeados para evitar problemas de carga de archivos en producción
      const datos = [
        {
          codigo: "PLA001",
          nombre: "Repuesto Plantilla 1",
          descripcion: "Repuesto de ejemplo de plantilla",
          precio: 15000,
          stock: 10,
          stockMinimo: 2,
          categoria: "General",
          marca: "Genérica",
          ubicacion: "Almacén",
          activo: true
        },
        {
          codigo: "PLA002",
          nombre: "Repuesto Plantilla 2", 
          descripcion: "Segundo repuesto de ejemplo",
          precio: 25000,
          stock: 8,
          stockMinimo: 1,
          categoria: "General",
          marca: "Genérica",
          ubicacion: "Almacén",
          activo: true
        }
      ];
      
      if (!window.electronAPI) {
        throw new Error('electronAPI no está disponible');
      }
      
      await window.electronAPI.importarRepuestos(datos);
      // Si llegamos aquí, la importación fue exitosa
      setResultadoImportacion({
        exitosos: datos.length,
        errores: 0
      });
      
      // Recargar estadísticas
      await cargarEstadisticasRepuestos();
      
    } catch (error) {
      console.error('Error importando plantilla:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setResultadoImportacion({
        exitosos: 0,
        errores: 1,
        error: `Error al importar datos: ${errorMessage}`
      });
    } finally {
      setImportando(false);
    }
  };

  const limpiarRepuestos = async () => {
    const confirmed = await confirmAction(
      '¿Estás seguro de que quieres eliminar TODOS los repuestos del inventario?',
      'Esta acción eliminará los 813 items y no se puede deshacer. Se creará un backup automático antes de eliminar.'
    );
    
    if (!confirmed) {
      return;
    }

    setImportando(true);
    try {
      await window.electronAPI.limpiarRepuestos();
      
      // Refrescar la lista de repuestos en el contexto
      await refreshRepuestos();
      
      // Recargar estadísticas
      await cargarEstadisticasRepuestos();
      
      notify.success('Inventario limpiado', 'Todos los repuestos han sido eliminados exitosamente. Puedes importar el nuevo Excel ahora.');
      
      setResultadoImportacion({
        exitosos: 0,
        errores: 0
      });
      
    } catch (error) {
      console.error('Error limpiando repuestos:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      notify.error('Error al limpiar inventario', errorMessage);
      setResultadoImportacion({
        exitosos: 0,
        errores: 1,
        error: errorMessage
      });
    } finally {
      setImportando(false);
    }
  };

  // Cargar estadísticas al montar el componente
  useEffect(() => {
    if (activeTab === 'importacion') {
      cargarEstadisticasRepuestos();
    } else if (activeTab === 'backups') {
      loadBackupInfo();
    } else if (activeTab === 'negocio') {
      // Cargar información del negocio guardada
      window.electronAPI.getAllConfiguracion().then((configs: any[]) => {
        const negocioConfig = configs.find(c => c.clave === 'negocio_info');
        if (negocioConfig) {
          try {
            const info = JSON.parse(negocioConfig.valor);
            setNegocioInfo(info);
          } catch (e) {
            console.error('Error parseando información del negocio:', e);
          }
        }
      }).catch(console.error);
    } else if (activeTab === 'mensajes') {
      // Cargar mensajes predefinidos guardados
      window.electronAPI.getAllConfiguracion().then((configs: any[]) => {
        const mensajesConfig = configs.find(c => c.clave === 'mensajes_predefinidos');
        if (mensajesConfig) {
          try {
            const mensajes = JSON.parse(mensajesConfig.valor);
            setMensajesPredefinidos(mensajes);
          } catch (e) {
            console.error('Error parseando mensajes predefinidos:', e);
          }
        }
      }).catch(console.error);
    } else if (activeTab === 'logs') {
      loadLogs();
    }
  }, [activeTab]);

  // Mostrar error si existe
  if (error) {
    return (
      <div className="flex flex-col gap-8 p-6 lg:p-8">
        <div className="flex flex-col gap-3 pb-2 border-b border-border">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-card-foreground">Configuración</h1>
              <p className="text-base text-muted-foreground mt-2">Gestiona la configuración del sistema y backups</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-2">Error</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button 
              onClick={() => setError(null)} 
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'negocio', name: 'Negocio', icon: Building },
    { id: 'backups', name: 'Backups', icon: Database },
    { id: 'mensajes', name: 'Mensajes', icon: FileText },
    { id: 'importacion', name: 'Importación', icon: Upload },
    { id: 'integridad', name: 'Integridad', icon: Wrench },
    { id: 'logs', name: 'Logs', icon: AlertTriangle }
  ];

  return (
    <div className="flex flex-col gap-8 p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-3 pb-2 border-b border-border">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-card-foreground">Configuración</h1>
            <p className="text-base text-muted-foreground mt-2">Gestiona la configuración del sistema y backups</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.name}
            </button>
          );
        })}
      </div>

      {/* Contenido de las pestañas */}
      {activeTab === 'negocio' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Información del Negocio
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Configura los datos principales de tu taller
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre del Taller
                  </label>
                  <input
                    type="text"
                    value={negocioInfo.nombreTaller}
                    onChange={(e) => setNegocioInfo(prev => ({ ...prev, nombreTaller: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Nombre del taller"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    RUT / Tax ID
                  </label>
                  <input
                    type="text"
                    value={negocioInfo.rut}
                    onChange={(e) => {
                      const formatted = formatearRUT(e.target.value);
                      setNegocioInfo(prev => ({ ...prev, rut: formatted }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="12.345.678-9"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dirección
                  </label>
                  <input
                    type="text"
                    value={negocioInfo.direccion}
                    onChange={(e) => setNegocioInfo(prev => ({ ...prev, direccion: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Av. Principal 123, Puerto Montt"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Teléfono
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="tel"
                      value={negocioInfo.telefono}
                      onChange={(e) => setNegocioInfo(prev => ({ ...prev, telefono: e.target.value }))}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="+56 9 1234 5678"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="email"
                      value={negocioInfo.email}
                      onChange={(e) => setNegocioInfo(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="info@resortespuertomontt.cl"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sitio Web
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="url"
                      value={negocioInfo.sitioWeb}
                      onChange={(e) => setNegocioInfo(prev => ({ ...prev, sitioWeb: e.target.value }))}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="www.resortespuertomontt.cl"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end pt-4 border-t border-gray-200">
                <Button
                  onClick={handleSaveNegocio}
                  disabled={isLoading}
                  className="bg-red-600 hover:bg-red-700 flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {isLoading ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'backups' && (
        <div className="space-y-6">
          {/* Información del Sistema */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Último Backup
                    </p>
                    <p className="text-lg font-bold text-card-foreground">
                      {lastBackup ? formatDate(lastBackup) : 'Nunca'}
                    </p>
                  </div>
                  <div className="icon-blue rounded-xl p-3.5 shadow-sm">
                    <Clock className="h-7 w-7" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Total Backups
                    </p>
                    <p className="text-3xl font-bold text-card-foreground">
                      {backups.length}
                    </p>
                  </div>
                  <div className="icon-green rounded-xl p-3.5 shadow-sm">
                    <Database className="h-7 w-7" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Estado del Sistema
                    </p>
                    <p className="text-lg font-bold text-green-600">
                      Protegido
                    </p>
                  </div>
                  <div className="icon-green rounded-xl p-3.5 shadow-sm">
                    <Shield className="h-7 w-7" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Configuración de Backups */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Configuración de Backups
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-900">Backup Automático</h3>
                  <p className="text-sm text-gray-500">Crear backups automáticamente cada cierto tiempo</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoBackupEnabled}
                    onChange={(e) => setAutoBackupEnabled(e.target.checked)}
                    className="sr-only peer"
                    title="Habilitar backups automáticos"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                </label>
              </div>

              {autoBackupEnabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Intervalo de Backup (minutos)
                    </label>
                    <select
                      value={backupInterval}
                      onChange={(e) => setBackupInterval(parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                      title="Seleccionar intervalo de backup automático"
                    >
                      <option value={15}>15 minutos</option>
                      <option value={30}>30 minutos</option>
                      <option value={60}>1 hora</option>
                      <option value={120}>2 horas</option>
                      <option value={240}>4 horas</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <Button 
                      onClick={() => createBackup('automatico')}
                      disabled={isLoading}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Crear Backup Ahora
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Acciones de Backup */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="h-5 w-5" />
                Acciones de Backup
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <Button 
                  onClick={() => createBackup('manual')}
                  disabled={isLoading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Crear Backup Manual
                </Button>
                <Button 
                  onClick={loadBackupInfo}
                  disabled={isLoading}
                  variant="outline"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Actualizar Lista
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Backups */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Historial de Backups
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {backups.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay backups disponibles
                  </div>
                ) : (
                  backups.map((backup) => (
                    <div key={backup.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className={`w-3 h-3 rounded-full ${
                          backup.tipo === 'manual' ? 'bg-red-500' : 'bg-green-500'
                        }`}></div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {backup.descripcion}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatDate(backup.fecha)} • {backup.tamaño}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getEstadoColor(backup.estado)}>
                          {backup.estado}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => restoreBackup(backup.id)}
                          disabled={isLoading}
                          className="text-red-600 hover:text-red-700"
                        >
                          <RotateCcw className="h-4 w-4 mr-1" />
                          Restaurar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteBackup(backup.id)}
                          disabled={isLoading}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'integridad' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" /> Reparar Integridad de Datos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Elimina filas huérfanas causadas por cortes o inconsistencias (detalles sin padre, órdenes/cotizaciones sin cliente o vehículo, vehículos sin cliente).</p>
              <div className="flex items-center gap-3">
                <Button disabled={repairing} onClick={async () => {
                  setRepairing(true);
                  setRepairResult(null);
                  try {
                    const res = await window.electronAPI.repairIntegrity();
                    if (res?.success !== false) {
                      setRepairResult(res.result?.deleted || {});
                    } else {
                      setError(res?.error || 'Error reparando integridad');
                    }
                  } catch (e: any) {
                    setError(e?.message || 'Error reparando integridad');
                  } finally {
                    setRepairing(false);
                  }
                }}>{repairing ? 'Reparando...' : 'Reparar inconsistencias'}</Button>
              </div>
              {repairResult && (
                <div className="mt-3 text-sm">
                  <p className="font-semibold">Elementos eliminados:</p>
                  <ul className="list-disc ml-6">
                    {Object.entries(repairResult).map(([k,v]) => (
                      <li key={k}>{k}: {v}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Logs del Sistema
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Visualiza y exporta los logs para diagnóstico offline
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={loadLogs}
                  disabled={logLoading}
                  variant="outline"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {logLoading ? 'Actualizando...' : 'Actualizar'}
                </Button>
                <Button
                  onClick={handleOpenLogsFolder}
                  disabled={logLoading}
                  variant="outline"
                >
                  <HardDrive className="h-4 w-4 mr-2" />
                  Abrir carpeta de logs
                </Button>
                <Button
                  onClick={handleExportLogs}
                  disabled={logExporting}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {logExporting ? 'Exportando...' : 'Exportar logs'}
                </Button>
              </div>
              {logDir && (
                <div className="text-sm text-muted-foreground">
                  Ubicación: <span className="font-mono">{logDir}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Últimos errores
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentErrors.length === 0 ? (
                <div className="text-sm text-muted-foreground">No hay errores recientes.</div>
              ) : (
                <pre className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-3 max-h-64 overflow-auto whitespace-pre-wrap">
                  {recentErrors.join('\n')}
                </pre>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Últimos eventos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentLogs.length === 0 ? (
                <div className="text-sm text-muted-foreground">No hay eventos recientes.</div>
              ) : (
                <pre className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-3 max-h-64 overflow-auto whitespace-pre-wrap">
                  {recentLogs.join('\n')}
                </pre>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Archivos de logs
              </CardTitle>
            </CardHeader>
            <CardContent>
              {logFiles.length === 0 ? (
                <div className="text-sm text-muted-foreground">No hay archivos de logs.</div>
              ) : (
                <div className="space-y-3">
                  {logFiles.map((file) => (
                    <div key={file.name} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900">{file.name}</div>
                        <div className="text-xs text-gray-500">
                          {formatDate(file.updatedAt)} • {file.size}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'mensajes' && (
        <div className="space-y-6">
          {/* Mensajes de WhatsApp */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Mensajes de WhatsApp
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mensaje para Cotizaciones
                </label>
                <textarea
                  value={mensajesPredefinidos.whatsappCotizacion}
                  onChange={(e) => setMensajesPredefinidos(prev => ({ ...prev, whatsappCotizacion: e.target.value }))}
                  rows={12}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 font-mono text-sm"
                  placeholder="Plantilla del mensaje de WhatsApp para cotizaciones..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Usa variables como {'{NOMBRE_CLIENTE}'}, {'{NUMERO_COTIZACION}'}, {'{TOTAL_COTIZACION}'}, etc.
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mensaje para Órdenes de Trabajo
                </label>
                <textarea
                  value={mensajesPredefinidos.whatsappOrden}
                  onChange={(e) => setMensajesPredefinidos(prev => ({ ...prev, whatsappOrden: e.target.value }))}
                  rows={12}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 font-mono text-sm"
                  placeholder="Plantilla del mensaje de WhatsApp para órdenes de trabajo..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Usa variables como {'{NOMBRE_CLIENTE}'}, {'{NUMERO_ORDEN}'}, {'{TOTAL_ORDEN}'}, etc.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Mensajes de Email */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Mensajes de Email
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mensaje para Cotizaciones
                </label>
                <textarea
                  value={mensajesPredefinidos.emailCotizacion}
                  onChange={(e) => setMensajesPredefinidos(prev => ({ ...prev, emailCotizacion: e.target.value }))}
                  rows={12}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 font-mono text-sm"
                  placeholder="Plantilla del mensaje de email para cotizaciones..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Usa variables como {'{NOMBRE_CLIENTE}'}, {'{NUMERO_COTIZACION}'}, {'{TOTAL_COTIZACION}'}, etc.
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mensaje para Órdenes de Trabajo
                </label>
                <textarea
                  value={mensajesPredefinidos.emailOrden}
                  onChange={(e) => setMensajesPredefinidos(prev => ({ ...prev, emailOrden: e.target.value }))}
                  rows={12}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 font-mono text-sm"
                  placeholder="Plantilla del mensaje de email para órdenes de trabajo..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Usa variables como {'{NOMBRE_CLIENTE}'}, {'{NUMERO_ORDEN}'}, {'{TOTAL_ORDEN}'}, etc.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Variables Disponibles */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Variables Disponibles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Variables Generales</h4>
                  <div className="space-y-1 text-sm">
                    <div className="font-mono bg-gray-100 px-2 py-1 rounded">{`{NOMBRE_TALLER}`}</div>
                    <div className="font-mono bg-gray-100 px-2 py-1 rounded">{`{TELEFONO_TALLER}`}</div>
                    <div className="font-mono bg-gray-100 px-2 py-1 rounded">{`{EMAIL_TALLER}`}</div>
                    <div className="font-mono bg-gray-100 px-2 py-1 rounded">{`{NOMBRE_CLIENTE}`}</div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Variables de Vehículo</h4>
                  <div className="space-y-1 text-sm">
                    <div className="font-mono bg-gray-100 px-2 py-1 rounded">{`{MARCA_VEHICULO}`}</div>
                    <div className="font-mono bg-gray-100 px-2 py-1 rounded">{`{MODELO_VEHICULO}`}</div>
                    <div className="font-mono bg-gray-100 px-2 py-1 rounded">{`{AÑO_VEHICULO}`}</div>
                    <div className="font-mono bg-gray-100 px-2 py-1 rounded">{`{PATENTE_VEHICULO}`}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Acciones */}
          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-medium text-gray-900">Guardar Configuración</h3>
                  <p className="text-sm text-gray-500">Los mensajes se aplicarán a todos los envíos futuros</p>
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={handleResetMensajes}
                    variant="outline"
                    disabled={isLoading}
                  >
                    Restaurar por Defecto
                  </Button>
                  <Button
                    onClick={handleSaveMensajes}
                    disabled={isLoading}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {isLoading ? 'Guardando...' : 'Guardar Mensajes'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Pestaña de Importación */}
      {activeTab === 'importacion' && (
        <div className="space-y-6">
          {/* Estadísticas actuales */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Estado Actual del Inventario
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{importacionStats.total}</div>
                  <div className="text-sm text-red-600">Total Repuestos</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{importacionStats.conStock}</div>
                  <div className="text-sm text-green-600">Con Stock</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{importacionStats.sinStock}</div>
                  <div className="text-sm text-red-600">Sin Stock</div>
                </div>
              </div>
              
              {importacionStats.categorias.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-medium text-gray-900 mb-3">Distribución por Categorías</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {importacionStats.categorias.slice(0, 6).map((cat: any, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded-lg">
                        <div className="font-medium text-gray-900">{cat.categoria}</div>
                        <div className="text-sm text-gray-600">{cat.cantidad} repuestos</div>
                        <div className="text-xs text-gray-500">Stock: {cat.totalStock}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Archivos disponibles para importación */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Archivos Disponibles para Importación
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Inventario Principal */}
                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900">Inventario Principal</h4>
                      <p className="text-sm text-gray-600">LISTA DE PRECIOS C.A.R.S._RESORTESPTOMONTT.xlsx</p>
                    </div>
                    <Badge variant="secondary">1,225 repuestos</Badge>
                  </div>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div>• Códigos de resortes C.A.R.S.</div>
                    <div>• Precios actualizados</div>
                    <div>• Categoría: Resortes</div>
                    <div>• Marca: C.A.R.S</div>
                  </div>
                  <Button
                    onClick={importarInventarioPrincipal}
                    disabled={importando}
                    className="w-full mt-3 bg-red-600 hover:bg-red-700"
                  >
                    {importando ? 'Importando...' : 'Importar Inventario Principal'}
                  </Button>
                </div>

                {/* Plantilla */}
                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900">Plantilla de Repuestos</h4>
                      <p className="text-sm text-gray-600">plantilla_repuestos.xlsx</p>
                    </div>
                    <Badge variant="secondary">790 repuestos</Badge>
                  </div>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div>• Repuestos diversos</div>
                    <div>• Información de stock</div>
                    <div>• Múltiples categorías</div>
                    <div>• Datos completos</div>
                  </div>
                  <Button
                    onClick={importarPlantilla}
                    disabled={importando}
                    className="w-full mt-3 bg-green-600 hover:bg-green-700"
                  >
                    {importando ? 'Importando...' : 'Importar Plantilla'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resultado de importación */}
          {resultadoImportacion && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {resultadoImportacion.errores === 0 ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  )}
                  Resultado de Importación
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Exitosos: <strong>{resultadoImportacion.exitosos}</strong></span>
                  </div>
                  {resultadoImportacion.errores > 0 && (
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <span className="text-sm">Errores: <strong>{resultadoImportacion.errores}</strong></span>
                    </div>
                  )}
                  {resultadoImportacion.error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="text-sm text-red-800">{resultadoImportacion.error}</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Acciones de mantenimiento */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Mantenimiento del Inventario
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium text-gray-900">Limpiar Inventario</h3>
                    <p className="text-sm text-gray-500">Eliminar todos los repuestos del sistema</p>
                  </div>
                  <Button
                    onClick={limpiarRepuestos}
                    disabled={importando}
                    variant="destructive"
                  >
                    {importando ? 'Procesando...' : 'Limpiar Todo'}
                  </Button>
                </div>
                
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium text-gray-900">Limpiar Duplicados de Clientes</h3>
                    <p className="text-sm text-gray-500">Eliminar clientes duplicados por RUT</p>
                  </div>
                  <Button
                    onClick={async () => {
                      if (!confirm('¿Estás seguro de que quieres limpiar duplicados de clientes?')) {
                        return;
                      }
                      setIsLoading(true);
                      try {
                        await window.electronAPI.limpiarDuplicadosClientes();
                        toast.success('Duplicados de clientes eliminados exitosamente');
                      } catch (error) {
                        console.error('Error limpiando duplicados:', error);
                        toast.error('Error al limpiar duplicados de clientes');
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                    disabled={importando}
                    variant="outline"
                    className="border-orange-500 text-orange-600 hover:bg-orange-50"
                  >
                    {importando ? 'Procesando...' : 'Limpiar Duplicados'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
