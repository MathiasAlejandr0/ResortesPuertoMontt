import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { notify, Logger } from '../utils/cn';
import { User, DollarSign, FileText, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ComisionTecnico {
  id?: number;
  ordenId: number;
  tecnicoId?: number;
  tecnicoNombre: string;
  monto_mano_obra: number;
  porcentaje_comision: number;
  monto_comision: number;
  fecha_calculo: string;
  mes_referencia: string;
}

interface ResumenComision {
  tecnicoId: number | null;
  tecnicoNombre: string;
  totalComisiones: number;
  cantidadOrdenes: number;
}

export default function ReporteTecnicosPage() {
  const [comisiones, setComisiones] = useState<ComisionTecnico[]>([]);
  const [resumen, setResumen] = useState<ResumenComision[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [mesSeleccionado, setMesSeleccionado] = useState(format(new Date(), 'yyyy-MM'));

  useEffect(() => {
    cargarReporte();
  }, [mesSeleccionado]);

  const cargarReporte = async () => {
    setIsLoading(true);
    try {
      if (!window.electronAPI) return;

      const [comisionesData, resumenData] = await Promise.all([
        window.electronAPI.getReporteComisiones(mesSeleccionado),
        window.electronAPI.getResumenComisionesPorTecnico(mesSeleccionado)
      ]);

      setComisiones(comisionesData || []);
      setResumen(resumenData || []);
    } catch (error: any) {
      Logger.error('Error cargando reporte de técnicos:', error);
      notify.error('Error', 'No se pudo cargar el reporte');
    } finally {
      setIsLoading(false);
    }
  };

  const formatearMonto = (monto: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(monto / 100);
  };

  const formatearMes = (mes: string) => {
    const [año, mesNum] = mes.split('-');
    const fecha = new Date(parseInt(año), parseInt(mesNum) - 1, 1);
    return format(fecha, 'MMMM yyyy', { locale: es });
  };

  const totalGeneral = resumen.reduce((sum, r) => sum + r.totalComisiones, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <User className="w-8 h-8" />
            Reporte de Técnicos y Comisiones
          </h1>
          <p className="text-muted-foreground mt-1">
            Visualiza las comisiones calculadas por técnico
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div>
            <Label htmlFor="mes">Mes</Label>
            <Input
              id="mes"
              type="month"
              value={mesSeleccionado}
              onChange={(e) => setMesSeleccionado(e.target.value)}
              className="w-48"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Cargando reporte...</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Resumen del Mes: {formatearMes(mesSeleccionado)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 p-4 bg-primary/10 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold">Total General de Comisiones:</span>
                  <span className="text-2xl font-bold text-primary">{formatearMonto(totalGeneral)}</span>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Técnico</TableHead>
                    <TableHead className="text-right">Cantidad de Órdenes</TableHead>
                    <TableHead className="text-right">Total Comisiones</TableHead>
                    <TableHead className="text-right">Promedio por Orden</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resumen.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No hay comisiones registradas para este mes
                      </TableCell>
                    </TableRow>
                  ) : (
                    resumen.map((r, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{r.tecnicoNombre}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary">{r.cantidadOrdenes}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatearMonto(r.totalComisiones)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {r.cantidadOrdenes > 0
                            ? formatearMonto(Math.round(r.totalComisiones / r.cantidadOrdenes))
                            : '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Detalle de Comisiones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Orden</TableHead>
                    <TableHead>Técnico</TableHead>
                    <TableHead className="text-right">Mano de Obra</TableHead>
                    <TableHead className="text-right">% Comisión</TableHead>
                    <TableHead className="text-right">Comisión</TableHead>
                    <TableHead>Fecha Cálculo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comisiones.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No hay comisiones registradas para este mes
                      </TableCell>
                    </TableRow>
                  ) : (
                    comisiones.map((com) => (
                      <TableRow key={com.id}>
                        <TableCell>
                          <Badge variant="outline">OT-{com.ordenId}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            {com.tecnicoNombre}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatearMonto(com.monto_mano_obra)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary">{com.porcentaje_comision}%</Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-primary">
                          {formatearMonto(com.monto_comision)}
                        </TableCell>
                        <TableCell>
                          {format(new Date(com.fecha_calculo), 'dd/MM/yyyy', { locale: es })}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
