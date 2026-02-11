import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useApp } from '../contexts/AppContext';
import { notify, Logger } from '../utils/cn';
import { User, TrendingUp, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

interface ScoreTrabajador {
  nombre: string;
  rut?: string;
  ventasCantidad: number;
  ventasTotal: number;
  ordenesCantidad: number;
  ordenesTotal: number;
  total: number;
  porcentajeComision: number;
  totalComision: number;
}

export default function ScoreTrabajadoresPage() {
  const { ordenes } = useApp();
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [ventas, setVentas] = useState<any[]>([]);
  const [detallesOrden, setDetallesOrden] = useState<any[]>([]);
  const [comisiones, setComisiones] = useState<any[]>([]);
  const [scores, setScores] = useState<ScoreTrabajador[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fechaDesde, setFechaDesde] = useState('');
  const [sumarPor, setSumarPor] = useState('Sumar total con impuestos');
  const [filtrarPor, setFiltrarPor] = useState('Filtrar solo mano de obra');
  const [ordenesPor, setOrdenesPor] = useState('Todas las órdenes');

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    calcularScores();
  }, [ordenes, ventas, detallesOrden, comisiones, usuarios, fechaDesde, sumarPor, filtrarPor, ordenesPor]);

  const cargarDatos = async () => {
    setIsLoading(true);
    try {
      const [usuariosData, ventasData, detallesData, comisionesData] = await Promise.all([
        window.electronAPI?.getAllUsuarios() || Promise.resolve([]),
        window.electronAPI?.getAllVentas() || Promise.resolve([]),
        window.electronAPI?.getAllDetallesOrden() || Promise.resolve([]),
        window.electronAPI?.getReporteComisiones(format(new Date(), 'yyyy-MM')) || Promise.resolve([]),
      ]);

      setUsuarios(usuariosData || []);
      setVentas(ventasData || []);
      setDetallesOrden(detallesData || []);
      setComisiones(comisionesData || []);
    } catch (error: any) {
      Logger.error('Error cargando datos:', error);
      notify.error('Error', 'No se pudieron cargar los datos');
    } finally {
      setIsLoading(false);
    }
  };

  const calcularScores = () => {
    try {
      // Filtrar órdenes por fecha
      let ordenesFiltradas = ordenes;
      if (fechaDesde) {
        const fechaDesdeDate = new Date(fechaDesde);
        ordenesFiltradas = ordenes.filter(o => {
          if (!o.fechaIngreso) return false;
          return new Date(o.fechaIngreso) >= fechaDesdeDate;
        });
      }

      // Filtrar por estado (todas o solo cobradas)
      if (ordenesPor === 'Solo cobradas') {
        ordenesFiltradas = ordenesFiltradas.filter(o => 
          o.estado === 'Completada' || o.estado === 'Pagada'
        );
      }

      // Agrupar por técnico
      const trabajadoresMap = new Map<string, ScoreTrabajador>();

      // Inicializar trabajadores desde usuarios
      usuarios.forEach(usuario => {
        if (usuario.nombre) {
          trabajadoresMap.set(usuario.nombre, {
            nombre: usuario.nombre,
            rut: usuario.rut,
            ventasCantidad: 0,
            ventasTotal: 0,
            ordenesCantidad: 0,
            ordenesTotal: 0,
            total: 0,
            porcentajeComision: usuario.porcentaje_comision || 0,
            totalComision: 0,
          });
        }
      });

      // Procesar órdenes
      ordenesFiltradas.forEach(orden => {
        if (!orden.tecnicoAsignado) return;

        const tecnico = orden.tecnicoAsignado;
        if (!trabajadoresMap.has(tecnico)) {
          trabajadoresMap.set(tecnico, {
            nombre: tecnico,
            rut: undefined,
            ventasCantidad: 0,
            ventasTotal: 0,
            ordenesCantidad: 0,
            ordenesTotal: 0,
            total: 0,
            porcentajeComision: 0,
            totalComision: 0,
          });
        }

        const trabajador = trabajadoresMap.get(tecnico)!;
        
        // Calcular total según filtro
        let totalOrden = 0;
        if (filtrarPor === 'Filtrar solo mano de obra') {
          // Solo servicios
          const detallesOrdenTecnico = detallesOrden.filter(d => d.ordenId === orden.id && d.tipo === 'servicio');
          totalOrden = detallesOrdenTecnico.reduce((sum, d) => sum + (d.subtotal || 0), 0);
        } else if (filtrarPor === 'Filtrar solo productos') {
          // Solo repuestos
          const detallesOrdenTecnico = detallesOrden.filter(d => d.ordenId === orden.id && d.tipo === 'repuesto');
          totalOrden = detallesOrdenTecnico.reduce((sum, d) => sum + (d.subtotal || 0), 0);
        } else {
          // Todo
          totalOrden = orden.total || 0;
        }

        // Aplicar impuestos según configuración
        if (sumarPor === 'Sumar total sin impuestos') {
          totalOrden = totalOrden / 1.19; // Quitar IVA
        } else if (sumarPor === 'Sumar solo ganancia (Precio venta - costo)') {
          // Calcular ganancia (precio venta - costo)
          const detallesOrdenTecnico = detallesOrden.filter(d => d.ordenId === orden.id);
          const costoTotal = detallesOrdenTecnico.reduce((sum, d) => {
            // Por ahora no tenemos costo en detalles, usar 0
            return sum + 0;
          }, 0);
          totalOrden = totalOrden - costoTotal;
        }

        trabajador.ordenesCantidad += 1;
        trabajador.ordenesTotal += totalOrden;
        trabajador.total += totalOrden;
      });

      // Procesar ventas rápidas (si tienen técnico asignado)
      // Por ahora las ventas no tienen técnico asignado, pero dejamos el código por si se agrega

      // Calcular comisiones
      trabajadoresMap.forEach((trabajador, nombre) => {
        // Buscar comisiones del trabajador
        const comisionesTrabajador = comisiones.filter(c => c.tecnicoNombre === nombre);
        trabajador.totalComision = comisionesTrabajador.reduce((sum, c) => sum + (c.monto_comision || 0), 0);

        // Si no hay comisiones calculadas, calcular basado en porcentaje
        if (trabajador.totalComision === 0 && trabajador.porcentajeComision > 0) {
          // Calcular comisión basada en mano de obra
          const ordenesTrabajador = ordenesFiltradas.filter(o => o.tecnicoAsignado === nombre);
          let montoManoObra = 0;
          
          ordenesTrabajador.forEach(orden => {
            const detallesOrdenTecnico = detallesOrden.filter(d => d.ordenId === orden.id && d.tipo === 'servicio');
            montoManoObra += detallesOrdenTecnico.reduce((sum, d) => sum + (d.subtotal || 0), 0);
          });

          trabajador.totalComision = Math.round(montoManoObra * (trabajador.porcentajeComision / 100));
        }
      });

      // Convertir a array y ordenar por total descendente
      const scoresArray = Array.from(trabajadoresMap.values())
        .filter(t => t.ordenesCantidad > 0 || t.ventasCantidad > 0)
        .sort((a, b) => b.total - a.total);

      setScores(scoresArray);
    } catch (error: any) {
      Logger.error('Error calculando scores:', error);
    }
  };

  const formatearMonto = (monto: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(monto);
  };

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8 bg-background text-foreground">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <TrendingUp className="w-8 h-8" />
            Score de Trabajadores
          </h1>
          <p className="text-muted-foreground mt-1">
            Rendimiento y comisiones de trabajadores
          </p>
        </div>
        <Button
          onClick={cargarDatos}
          variant="outline"
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      <Card className="border border-border shadow-sm">
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Desde:</label>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center">
            <select
              value={sumarPor}
              onChange={(e) => setSumarPor(e.target.value)}
              className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option>Sumar total con impuestos</option>
              <option>Sumar total sin impuestos</option>
              <option>Sumar solo ganancia (Precio venta - costo)</option>
            </select>
            <select
              value={filtrarPor}
              onChange={(e) => setFiltrarPor(e.target.value)}
              className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option>Filtrar solo mano de obra</option>
              <option>Filtrar solo productos</option>
              <option>Todo (Mano de obra + productos)</option>
            </select>
            <select
              value={ordenesPor}
              onChange={(e) => setOrdenesPor(e.target.value)}
              className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option>Todas las órdenes</option>
              <option>Solo cobradas</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Resultados
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando datos...</div>
          ) : scores.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay resultados para mostrar
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-gray-700">
                    <th className="px-4 py-2 text-left font-semibold">Nombre</th>
                    <th className="px-4 py-2 text-left font-semibold">RUT</th>
                    <th className="px-4 py-2 text-left font-semibold">Ventas CANT</th>
                    <th className="px-4 py-2 text-left font-semibold">Ventas TOTAL</th>
                    <th className="px-4 py-2 text-left font-semibold">Órdenes CANT</th>
                    <th className="px-4 py-2 text-left font-semibold">Órdenes TOTAL</th>
                    <th className="px-4 py-2 text-left font-semibold">Total</th>
                    <th className="px-4 py-2 text-left font-semibold">Comisión %</th>
                    <th className="px-4 py-2 text-left font-semibold">Total Comisión</th>
                  </tr>
                </thead>
                <tbody>
                  {scores.map((trabajador, index) => (
                    <tr key={index} className="border-b border-border hover:bg-muted/50">
                      <td className="px-4 py-2 font-medium">{trabajador.nombre}</td>
                      <td className="px-4 py-2 text-gray-600">{trabajador.rut || '-'}</td>
                      <td className="px-4 py-2">{trabajador.ventasCantidad}</td>
                      <td className="px-4 py-2">{formatearMonto(trabajador.ventasTotal)}</td>
                      <td className="px-4 py-2">{trabajador.ordenesCantidad}</td>
                      <td className="px-4 py-2">{formatearMonto(trabajador.ordenesTotal)}</td>
                      <td className="px-4 py-2 font-semibold">{formatearMonto(trabajador.total)}</td>
                      <td className="px-4 py-2">{trabajador.porcentajeComision > 0 ? `${trabajador.porcentajeComision}%` : '-'}</td>
                      <td className="px-4 py-2 font-semibold text-primary">
                        {formatearMonto(trabajador.totalComision)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
