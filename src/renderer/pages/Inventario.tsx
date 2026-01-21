import { useState, useEffect, useMemo, useDeferredValue, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { RichTable, Column } from '../components/RichTable';
import EditarRepuestoModal from '../components/EditarRepuestoModal';
import OCRModal from '../components/OCRModal';
import InvoiceReviewModal from '../components/InvoiceReviewModal';
import StockModal from '../components/StockModal';
import { useApp } from '../contexts/AppContext';
import { notify, Logger, confirmAction } from '../utils/cn';
import { 
  Package, 
  TrendingUp, 
  AlertTriangle, 
  DollarSign, 
  Plus, 
  Search, 
  Camera,
  Edit,
  Plus as PlusIcon,
  Minus as MinusIcon,
  MapPin,
  FileSpreadsheet,
  Upload,
  Trash2
} from 'lucide-react';
import { Repuesto } from '../types';

export default function InventarioPage() {
  // Usar el contexto para acceder a los datos
  const { repuestos: initialRepuestos, refreshRepuestos } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('todas');
  const [filterEstado, setFilterEstado] = useState('todos');
  const [isUploadingExcel, setIsUploadingExcel] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Repuesto[] | null>(null);
  const [pageSize, setPageSize] = useState(100);
  
  // Usar repuestos directamente del contexto
  const repuestos = initialRepuestos;
  
  // Usar deferred value para búsqueda (no bloquea la UI)
  const deferredSearchTerm = useDeferredValue(searchTerm);

  // Realizar búsqueda en BD (FTS) con debounce cuando hay término
  useEffect(() => {
    let timeoutId: any;
    let cancelled = false;
    async function run() {
      if (!deferredSearchTerm || deferredSearchTerm.trim().length === 0) {
        setSearchResults(null);
        setIsSearching(false);
        return;
      }
      setIsSearching(true);
      try {
        const term = deferredSearchTerm.trim();
        const results = await window.electronAPI.searchRepuestos(term);
        if (!cancelled) {
          setSearchResults(Array.isArray(results) ? results : []);
          setPageSize(100);
        }
      } catch (err) {
        if (!cancelled) {
          setSearchResults([]);
        }
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    }
    timeoutId = setTimeout(run, 200);
    return () => { cancelled = true; clearTimeout(timeoutId); };
  }, [deferredSearchTerm]);
  
  // Filtrar repuestos con useMemo para evitar re-renders innecesarios
  const filteredRepuestos = useMemo(() => {
    // Base: si hay búsqueda, usar resultados del servidor; si no, usar lista del contexto
    let filtered = (searchResults && deferredSearchTerm) ? searchResults : repuestos;

    // Filtrar por búsqueda (usar deferred value)
    if (deferredSearchTerm) {
      const searchLower = deferredSearchTerm.toLowerCase();
      filtered = filtered.filter(repuesto => 
        repuesto.nombre.toLowerCase().includes(searchLower) ||
        repuesto.codigo?.toLowerCase().includes(searchLower)
      );
    }

    // Filtrar por categoría
    if (filterCategoria !== 'todas') {
      filtered = filtered.filter(repuesto => repuesto.categoria === filterCategoria);
    }

    // Filtrar por estado
    if (filterEstado !== 'todos') {
      filtered = filtered.filter(repuesto => {
        const stock = repuesto.stock || 0;
        // Usar stockMinimo personalizado o 5 por defecto
        const stockMinimo = (repuesto.stockMinimo && repuesto.stockMinimo > 0) ? repuesto.stockMinimo : 5;
        
        if (filterEstado === 'critico') {
          return stock < stockMinimo / 2;
        } else if (filterEstado === 'bajo') {
          return stock < stockMinimo && stock >= stockMinimo / 2;
        } else if (filterEstado === 'normal') {
          return stock >= stockMinimo;
        }
        return true;
      });
    }

    return filtered;
  }, [deferredSearchTerm, filterCategoria, filterEstado, repuestos, searchResults]);

  // Limitar visualización a 5 elementos por defecto (solo si no hay búsqueda activa)
  const displayedRepuestos = useMemo(() => {
    // Si hay búsqueda activa, mostrar por páginas
    if (deferredSearchTerm) {
      return filteredRepuestos.slice(0, pageSize);
    }
    // Si hay filtros sin término de búsqueda, mostrar todos los filtrados
    if (filterCategoria !== 'todas' || filterEstado !== 'todos') {
      return filteredRepuestos;
    }
    // Sin búsqueda ni filtros: mostrar solo 5 para UI limpia
    return filteredRepuestos.slice(0, 5);
  }, [filteredRepuestos, deferredSearchTerm, filterCategoria, filterEstado, pageSize]);

  const loadMore = useCallback(() => {
    setPageSize((s) => s + 100);
  }, []);

  // Función para extraer términos de búsqueda (soporta múltiples términos)
  const extractSearchTerms = useCallback((searchText: string): string[] => {
    return searchText
      .trim()
      .split(/\s+/)
      .filter(term => term.length > 0)
      .map(term => term.toLowerCase());
  }, []);

  // Función para resaltar múltiples términos
  const highlight = useCallback((text: string, field: 'nombre' | 'codigo' | 'descripcion' = 'nombre') => {
    const term = deferredSearchTerm?.trim();
    if (!term || !text) return text;
    
    try {
      const terms = extractSearchTerms(term);
      if (terms.length === 0) return text;
      
      // Crear expresión regular para todos los términos (OR)
      const pattern = terms
        .map(t => t.replace(/[.*+?^${}()|[\]\\/\\-]/g, '\\$&'))
        .join('|');
      
      const re = new RegExp(`(${pattern})`, 'ig');
      const parts = text.split(re);
      
      return parts.map((part, i) => {
        const lowerPart = part.toLowerCase();
        const isMatch = terms.some(t => lowerPart.includes(t));
        return isMatch ? (
          <mark key={i} className="bg-yellow-200 text-black rounded px-0.5 font-semibold">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        );
      });
    } catch {
      return text;
    }
  }, [deferredSearchTerm, extractSearchTerms]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingRepuesto, setEditingRepuesto] = useState<Repuesto | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isOCRModalOpen, setIsOCRModalOpen] = useState(false);
  const [isInvoiceReviewModalOpen, setIsInvoiceReviewModalOpen] = useState(false);
  const [invoiceScanResult, setInvoiceScanResult] = useState<any>(null);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [stockAction, setStockAction] = useState<'aumentar' | 'reducir'>('aumentar');
  const [repuestoParaStock, setRepuestoParaStock] = useState<Repuesto | null>(null);
  const [cantidadStock, setCantidadStock] = useState(1);

  // Calcular estadísticas (memoizadas para mejor rendimiento)
  const totalItems = useMemo(() => repuestos.length, [repuestos.length]);
  
  const stockBajo = useMemo(() => {
    return repuestos.filter(r => {
      const stock = Number(r.stock) || 0;
      // Usar stockMinimo personalizado o 5 por defecto
      const stockMinimo = (r.stockMinimo && r.stockMinimo > 0) ? Number(r.stockMinimo) : 5;
      return stock < stockMinimo && stock >= stockMinimo / 2;
    }).length;
  }, [repuestos]);
  
  const stockCritico = useMemo(() => {
    return repuestos.filter(r => {
      const stock = Number(r.stock) || 0;
      // Usar stockMinimo personalizado o 5 por defecto
      const stockMinimo = (r.stockMinimo && r.stockMinimo > 0) ? Number(r.stockMinimo) : 5;
      return stock < stockMinimo / 2;
    }).length;
  }, [repuestos]);
  
  // Calcular Total Precio Costo (suma de precioCosto de todos los items)
  const valorTotalCosto = useMemo(() => {
    if (!repuestos || repuestos.length === 0) {
      return 0;
    }

    let total = 0;
    repuestos.forEach((r) => {
      const precioCosto = r.precioCosto !== null && r.precioCosto !== undefined && r.precioCosto !== ''
        ? (typeof r.precioCosto === 'string' 
            ? parseFloat(r.precioCosto.replace(/[^0-9.-]/g, '')) || 0
            : Number(r.precioCosto) || 0)
        : 0;
      
      if (!isNaN(precioCosto) && precioCosto > 0) {
        total += precioCosto;
      }
    });

    return total;
  }, [repuestos]);

  // Calcular Total Precio Venta (suma de precio de todos los items)
  const valorTotalVenta = useMemo(() => {
    if (!repuestos || repuestos.length === 0) {
      return 0;
    }

    let total = 0;
    repuestos.forEach((r) => {
      const precio = r.precio !== null && r.precio !== undefined && r.precio !== ''
        ? (typeof r.precio === 'string' 
            ? parseFloat(r.precio.replace(/[^0-9.-]/g, '')) || 0
            : Number(r.precio) || 0)
        : 0;
      
      if (!isNaN(precio) && precio > 0) {
        total += precio;
      }
    });

    return total;
  }, [repuestos]);

  // Efecto para verificar que los valores totales se actualicen cuando cambien los repuestos
  useEffect(() => {
    console.log('🔄 Repuestos actualizados, recalculando valores totales...', {
      cantidad: repuestos.length,
      valorTotalCosto: valorTotalCosto,
      valorTotalVenta: valorTotalVenta
    });
  }, [repuestos, valorTotalCosto, valorTotalVenta]);

  // Obtener categorías únicas
  const categorias = [...new Set(repuestos.map(r => r.categoria).filter(Boolean))];

  // Funciones para manejar el stock
  const handleAumentarStock = (repuesto: Repuesto) => {
    setRepuestoParaStock(repuesto);
    setStockAction('aumentar');
    setCantidadStock(1);
    setIsStockModalOpen(true);
  };

  const handleReducirStock = (repuesto: Repuesto) => {
    setRepuestoParaStock(repuesto);
    setStockAction('reducir');
    setCantidadStock(1);
    setIsStockModalOpen(true);
  };

  const handleConfirmarStock = async () => {
    if (!repuestoParaStock) {
      notify.error('Error', 'No se seleccionó ningún repuesto');
      return;
    }

    setIsLoading(true);
    try {
      let nuevoStock: number;
      
      if (stockAction === 'aumentar') {
        nuevoStock = (repuestoParaStock.stock || 0) + cantidadStock;
      } else {
        nuevoStock = (repuestoParaStock.stock || 0) - cantidadStock;
        if (nuevoStock < 0) {
          notify.error('Error', 'No se puede reducir el stock por debajo de 0');
          setIsLoading(false);
          return;
        }
      }

      // Asegurar que el repuesto tenga todos los campos necesarios
      const repuestoActualizado: Repuesto = {
        ...repuestoParaStock,
        stock: nuevoStock,
        // Asegurar campos requeridos
        id: repuestoParaStock.id || 0,
        nombre: repuestoParaStock.nombre || '',
        precio: repuestoParaStock.precio || 0,
        categoria: repuestoParaStock.categoria || 'General',
        activo: repuestoParaStock.activo !== undefined ? repuestoParaStock.activo : true
      };

      Logger.log('📦 Actualizando stock:', {
        repuestoId: repuestoActualizado.id,
        stockAnterior: repuestoParaStock.stock,
        cantidad: cantidadStock,
        nuevoStock,
        accion: stockAction
      });

      const savedRepuesto = await window.electronAPI.saveRepuesto(repuestoActualizado);
      
      if (!savedRepuesto) {
        throw new Error('No se recibió respuesta del servidor al guardar el repuesto');
      }

      // El contexto se actualiza automáticamente
      await refreshRepuestos();
      
      const accion = stockAction === 'aumentar' ? 'aumentado' : 'reducido';
      notify.success('Stock actualizado', `Stock ${accion} exitosamente. Nuevo stock: ${nuevoStock}`);
      
      // Cerrar modal
      setIsStockModalOpen(false);
      setRepuestoParaStock(null);
      setCantidadStock(1);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido al actualizar el stock';
      Logger.error('❌ Error actualizando stock:', error);
      console.error('Detalles del error:', error);
      notify.error('Error al actualizar el stock', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditarRepuesto = (repuesto: Repuesto) => {
    setEditingRepuesto(repuesto);
    setIsEditModalOpen(true);
  };

  const handleEliminarRepuesto = async (repuesto: Repuesto) => {
    const confirmed = await confirmAction(
      `¿Estás seguro de que quieres eliminar el item "${repuesto.nombre}"?`,
      'Esta acción no se puede deshacer.'
    );
    
    if (!confirmed) {
      return;
    }

    setIsLoading(true);
    try {
      if (repuesto.id) {
        const result = await window.electronAPI.deleteRepuesto(repuesto.id);
        if (result) {
          await refreshRepuestos();
          notify.success('Item eliminado exitosamente');
        } else {
          notify.error('No se pudo eliminar el item');
        }
      }
    } catch (error) {
      Logger.error('Error eliminando repuesto:', error);
      notify.error('Error al eliminar el item', error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveRepuesto = async (repuestoActualizado: Repuesto) => {
    setIsLoading(true);
    try {
      const savedRepuesto = await window.electronAPI.saveRepuesto(repuestoActualizado);
      if (savedRepuesto) {
        // El contexto se actualiza automáticamente
        await refreshRepuestos();
        
        alert(repuestoActualizado.id === 0 ? 'Repuesto creado exitosamente' : 'Repuesto actualizado exitosamente');
        setIsEditModalOpen(false);
        setEditingRepuesto(null);
      }
    } catch (error) {
      console.error('Error guardando repuesto:', error);
      alert('Error al guardar el repuesto');
    } finally {
      setIsLoading(false);
    }
  };

  // Función para obtener estado del stock
  const getStockEstado = (repuesto: Repuesto) => {
    const stock = repuesto.stock || 0;
    // Usar stockMinimo personalizado o 5 por defecto
    const stockMinimo = (repuesto.stockMinimo && repuesto.stockMinimo > 0) ? repuesto.stockMinimo : 5;
    
    if (stock < stockMinimo / 2) {
      return { estado: 'Crítico', color: 'destructive' };
    } else if (stock < stockMinimo) {
      return { estado: 'Bajo', color: 'secondary' };
    } else {
      return { estado: 'Normal', color: 'default' };
    }
  };

  // Función para abrir modal de nuevo repuesto
  const handleNuevoRepuesto = () => {
    const nuevoRepuesto: Repuesto = {
      id: 0,
      codigo: '',
      nombre: '',
      descripcion: '',
      precio: 0,
      stock: 0,
      stockMinimo: 0,
      categoria: '',
      marca: '',
      ubicacion: '',
      activo: true
    };
    setEditingRepuesto(nuevoRepuesto);
    setIsEditModalOpen(true);
  };

  // Función para abrir modal OCR
  const handleAbrirOCR = () => {
    setIsOCRModalOpen(true);
  };

  // Función para procesar OCR
  const handleProcessOCR = async (file: File) => {
    setIsLoading(true);
    try {
      // Llamar al servicio de escaneo de facturas
      const result = await window.electronAPI.scanInvoice();
      
      if (!result.success) {
        notify.error('Error', result.error || 'Error al escanear la factura');
        return;
      }

      if (result.items.length === 0) {
        notify.warning('Sin resultados', 'No se encontraron items en la factura. Verifica que la imagen sea clara y legible.');
        return;
      }

      // Mostrar modal de revisión
      setInvoiceScanResult(result);
      setIsOCRModalOpen(false);
      setIsInvoiceReviewModalOpen(true);
    } catch (error) {
      console.error('Error procesando OCR:', error);
      notify.error('Error', 'Error al procesar la imagen. Por favor, inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmInvoiceItems = async (items: any[]) => {
    setIsLoading(true);
    try {
      // Convertir items de factura a formato de repuesto
      const repuestosParaGuardar = items.map(item => ({
        codigo: item.rawCode || `FAC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        nombre: item.description,
        descripcion: item.description,
        precio: item.unitPrice,
        precioCosto: item.unitPrice, // Usar precio como costo inicial
        stock: item.quantity,
        stockMinimo: 5,
        categoria: 'General',
        marca: 'Genérico',
        ubicacion: 'Estante A1',
        activo: true
      }));

      // Guardar repuestos en la base de datos
      for (const repuesto of repuestosParaGuardar) {
        await window.electronAPI.saveRepuesto(repuesto);
      }

      notify.success('Éxito', `Se importaron ${repuestosParaGuardar.length} repuestos desde la factura`);
      
      // Refrescar lista
      await refreshRepuestos();
      
      // Cerrar modales
      setIsInvoiceReviewModalOpen(false);
      setInvoiceScanResult(null);
    } catch (error) {
      console.error('Error guardando repuestos:', error);
      notify.error('Error', 'Error al guardar los repuestos. Por favor, inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  // Función para calcular porcentaje de stock
  const getStockPercentage = (repuesto: Repuesto) => {
    const stock = repuesto.stock || 0;
    // Usar stockMinimo personalizado o 5 por defecto
    const stockMinimo = (repuesto.stockMinimo && repuesto.stockMinimo > 0) ? repuesto.stockMinimo : 5;
    const stockMaximo = stockMinimo * 2; // Asumiendo que el máximo es el doble del mínimo
    
    return Math.min((stock / stockMaximo) * 100, 100);
  };

  // Función para obtener clase de ancho de progreso
  const getProgressWidthClass = (percentage: number) => {
    const rounded = Math.round(percentage / 10) * 10;
    return `progress-${Math.min(rounded, 100)}`;
  };

  // Preparar datos para RichTable
  const inventarioTableData = useMemo(() => {
    return displayedRepuestos.map(repuesto => ({
      ...repuesto,
      stockEstado: getStockEstado(repuesto),
      stockPercentage: getStockPercentage(repuesto),
    }));
  }, [displayedRepuestos]);

  // Columnas para RichTable
  const columns: Column<typeof inventarioTableData[0]>[] = useMemo(() => [
    {
      key: 'codigo',
      header: 'SKU',
      sortable: true,
      accessor: (row) => (
        <span className="font-semibold text-foreground">
          {row.codigo || `SKU-${row.id}`}
        </span>
      ),
    },
    {
      key: 'nombre',
      header: 'Nombre',
      sortable: true,
      accessor: (row) => (
        <div>
          <span className="text-foreground">{row.nombre || ''}</span>
          {row.descripcion && (
            <div className="text-xs text-muted-foreground mt-1">
              {row.descripcion}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'categoria',
      header: 'Categoría',
      sortable: true,
      accessor: (row) => (
        <span className="text-foreground">{row.categoria || 'Sin categoría'}</span>
      ),
    },
    {
      key: 'stock',
      header: 'Stock',
      sortable: true,
      accessor: (row) => {
        const stock = row.stock || 0;
        const stockMinimo = (row.stockMinimo && row.stockMinimo > 0) ? row.stockMinimo : 5;
        const percentage = row.stockPercentage;
        const progressBarClass = `stock-progress-bar ${row.stockEstado.estado.toLowerCase()}`;
        const progressWidthClass = getProgressWidthClass(percentage);
        
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">
                {stock} / {stockMinimo}
              </span>
              {stock < stockMinimo && (
                <AlertTriangle className="h-4 w-4 text-yellow-500" title="Stock bajo del mínimo" />
              )}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${progressBarClass} ${progressWidthClass}`}
                style={{ width: `${Math.min(percentage, 100)}%` }}
              ></div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'estado',
      header: 'Estado',
      sortable: true,
      accessor: (row) => (
        <Badge variant={row.stockEstado.color as any} className="text-xs">
          {row.stockEstado.estado}
        </Badge>
      ),
    },
    {
      key: 'precio',
      header: 'Precio Venta',
      sortable: true,
      accessor: (row) => (
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold text-foreground">
            ${(row.precio || 0).toLocaleString()}
          </span>
        </div>
      ),
    },
    {
      key: 'ubicacion',
      header: 'Ubicación',
      sortable: true,
      accessor: (row) => (
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-foreground">
            {row.ubicacion || 'Sin ubicación'}
          </span>
        </div>
      ),
    },
  ], []);

  // Función para manejar la importación de archivo Excel
  const handleExcelUpload = async () => {
    // Verificar que electronAPI esté disponible
    if (!window.electronAPI) {
      alert('❌ Error: La API de Electron no está disponible. Por favor, reinicia la aplicación.');
      return;
    }

    // Verificar que la función esté disponible
    if (typeof window.electronAPI.procesarExcelRepuestos !== 'function') {
      alert('❌ Error: La función de importar Excel no está disponible. Por favor, reinicia la aplicación para aplicar los cambios.');
      console.error('window.electronAPI.procesarExcelRepuestos no está disponible');
      console.log('Funciones disponibles:', Object.keys(window.electronAPI));
      return;
    }

    setIsUploadingExcel(true);
    
    try {
      console.log('Solicitando procesamiento de archivo Excel...');
      
      // Llamar al main process para que abra el diálogo y procese el archivo
      const result = await window.electronAPI.procesarExcelRepuestos();
      
      if (result?.success) {
        // Refrescar la lista de repuestos ANTES de mostrar el mensaje
        await refreshRepuestos();
        
        // Mostrar notificación de éxito
        notify.success(
          'Importación exitosa', 
          `${result.cantidad || 0} repuestos importados correctamente. El inventario se ha actualizado.`
        );
      } else {
        // Solo mostrar error si el usuario no canceló la selección
        if (result?.error && !result.error.includes('No se seleccionó')) {
          alert(`❌ Error: ${result.error}`);
        }
      }
      
    } catch (error) {
      console.error('Error procesando archivo Excel:', error);
      alert(`❌ Error al procesar el archivo Excel: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setIsUploadingExcel(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Acciones rápidas */}
      <div className="flex items-center justify-end gap-3">
        <button
          onClick={handleExcelUpload}
          disabled={isUploadingExcel}
          className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <FileSpreadsheet className="h-5 w-5" />
          {isUploadingExcel ? 'Procesando...' : 'Importar Excel'}
        </button>
        <button 
          onClick={handleAbrirOCR}
          className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
        >
          <Camera className="h-5 w-5" />
          Escanear Factura
        </button>
        <button 
          onClick={handleNuevoRepuesto}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Nuevo Item
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="stat-card-animated fade-in-up">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Total Items
                </p>
                <p className="text-3xl font-bold text-card-foreground tracking-tight">
                  {totalItems}
                </p>
              </div>
              <div className="icon-red rounded-xl p-3.5 shadow-sm">
                <Package className="h-7 w-7" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card-animated fade-in-up">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Stock Bajo
                </p>
                <p className="text-3xl font-bold text-card-foreground tracking-tight">
                  {stockBajo}
                </p>
              </div>
              <div className="icon-yellow rounded-xl p-3.5 shadow-sm">
                <TrendingUp className="h-7 w-7" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card-animated fade-in-up">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Total Precio Costo
                </p>
                <p className="text-3xl font-bold text-card-foreground tracking-tight">
                  ${typeof valorTotalCosto === 'number' ? Math.round(valorTotalCosto).toLocaleString('es-CL', { maximumFractionDigits: 0 }) : '0'}
                </p>
              </div>
              <div className="icon-red rounded-xl p-3.5 shadow-sm">
                <DollarSign className="h-7 w-7" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card-animated fade-in-up">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Total Precio Venta
                </p>
                <p className="text-3xl font-bold text-card-foreground tracking-tight">
                  ${typeof valorTotalVenta === 'number' ? Math.round(valorTotalVenta).toLocaleString('es-CL', { maximumFractionDigits: 0 }) : '0'}
                </p>
              </div>
              <div className="icon-red rounded-xl p-3.5 shadow-sm">
                <DollarSign className="h-7 w-7" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Inventario */}
      <div className="space-y-4">
        {/* Filtros adicionales */}
        <div className="flex items-center gap-4">
          <select
            value={filterCategoria}
            onChange={(e) => setFilterCategoria(e.target.value)}
            title="Filtrar por categoría"
            aria-label="Filtrar por categoría"
            className="px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
          >
            <option value="todas">Todas las categorías</option>
            {categorias.map(categoria => (
              <option key={categoria} value={categoria}>{categoria}</option>
            ))}
          </select>
          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
            title="Filtrar por estado"
            aria-label="Filtrar por estado"
            className="px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
          >
            <option value="todos">Todos los estados</option>
            <option value="critico">Crítico</option>
            <option value="bajo">Bajo</option>
            <option value="normal">Normal</option>
          </select>
        </div>

        {isSearching ? (
          <div className="text-center py-8 text-muted-foreground">Buscando...</div>
        ) : (
          <RichTable
            data={inventarioTableData}
            columns={columns}
            searchable={true}
            searchPlaceholder="Buscar por nombre, código, descripción..."
            onEdit={(row) => handleEditarRepuesto(row)}
            onDelete={(row) => handleEliminarRepuesto(row)}
            customActions={(row) => (
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => handleAumentarStock(row)}
                  className="p-1.5 hover:bg-muted rounded transition-colors" 
                  title="Agregar stock"
                  disabled={isLoading}
                >
                  <PlusIcon className="h-4 w-4 text-green-600" />
                </button>
                <button 
                  onClick={() => handleReducirStock(row)}
                  className="p-1.5 hover:bg-muted rounded transition-colors" 
                  title="Reducir stock"
                  disabled={isLoading}
                >
                  <MinusIcon className="h-4 w-4 text-red-600" />
                </button>
              </div>
            )}
            emptyMessage={
              deferredSearchTerm || filterCategoria !== 'todas' || filterEstado !== 'todos' ? 
                'No se encontraron items con ese criterio' : 
                filteredRepuestos.length === 0 ? 'No hay items en el inventario' :
                `Mostrando ${displayedRepuestos.length} de ${filteredRepuestos.length} items. Usa la barra de búsqueda para encontrar más.`
            }
          />
        )}
        
        {/* Botón cargar más */}
        {!isSearching && displayedRepuestos.length > 0 && displayedRepuestos.length < filteredRepuestos.length && (
          <div className="text-center py-4">
            <button
              onClick={loadMore}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Cargar más items ({filteredRepuestos.length - displayedRepuestos.length} restantes)
            </button>
          </div>
        )}
      </div>

      {/* Modal Editar Repuesto */}
      <EditarRepuestoModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingRepuesto(null);
        }}
        onSave={handleSaveRepuesto}
        repuesto={editingRepuesto}
      />

      {/* Modal OCR */}
      <OCRModal
        isOpen={isOCRModalOpen}
        onClose={() => setIsOCRModalOpen(false)}
        onProcessOCR={handleProcessOCR}
      />

      {/* Modal Revisión de Factura */}
      {invoiceScanResult && (
        <InvoiceReviewModal
          isOpen={isInvoiceReviewModalOpen}
          onClose={() => {
            setIsInvoiceReviewModalOpen(false);
            setInvoiceScanResult(null);
          }}
          onConfirm={handleConfirmInvoiceItems}
          items={invoiceScanResult.items || []}
          imagenOriginal={invoiceScanResult.imagenOriginal}
          imagenProcesada={invoiceScanResult.imagenProcesada}
          isLoading={isLoading}
          sourceType={invoiceScanResult.sourceType || 'image'}
        />
      )}

      {/* Modal Stock */}
      <StockModal
        isOpen={isStockModalOpen}
        onClose={() => {
          setIsStockModalOpen(false);
          setRepuestoParaStock(null);
        }}
        onConfirm={handleConfirmarStock}
        repuesto={repuestoParaStock}
        action={stockAction}
        cantidad={cantidadStock}
        setCantidad={setCantidadStock}
        isLoading={isLoading}
      />
    </div>
  );
}
