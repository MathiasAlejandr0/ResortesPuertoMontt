import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { notify, Logger } from '../utils/cn';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface MovimientoCaja {
  id?: number;
  tipo: 'ingreso' | 'egreso';
  monto: number;
  descripcion: string;
  metodo_pago?: 'Efectivo' | 'Débito' | 'Crédito' | 'Transferencia';
  fecha: string;
  ordenId?: number;
}

interface EstadoCaja {
  id?: number;
  fecha_apertura: string;
  fecha_cierre?: string;
  monto_inicial: number;
  monto_final?: number;
  estado: 'abierta' | 'cerrada';
  observaciones?: string;
}

interface ArqueoCaja {
  totalEfectivo: number;
  totalTarjeta: number;
  totalTransferencia: number;
  totalIngresos: number;
  totalEgresos: number;
}

export default function CajaDiariaPage() {
  const [estadoCaja, setEstadoCaja] = useState<EstadoCaja | null>(null);
  const [movimientos, setMovimientos] = useState<MovimientoCaja[]>([]);
  const [arqueo, setArqueo] = useState<ArqueoCaja | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAbrirDialogOpen, setIsAbrirDialogOpen] = useState(false);
  const [isCerrarDialogOpen, setIsCerrarDialogOpen] = useState(false);
  const [montoInicial, setMontoInicial] = useState('');
  const [montoFinal, setMontoFinal] = useState('');
  const [observacionesApertura, setObservacionesApertura] = useState('');
  const [observacionesCierre, setObservacionesCierre] = useState('');
  const [fechaSeleccionada, setFechaSeleccionada] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    cargarEstadoCaja();
    cargarMovimientos();
    cargarArqueo();
  }, [fechaSeleccionada]);

  const cargarEstadoCaja = async () => {
    try {
      if (!window.electronAPI) return;
      const estado = await window.electronAPI.getEstadoCaja();
      setEstadoCaja(estado);
    } catch (error: any) {
      Logger.error('Error cargando estado de caja:', error);
    }
  };

  const cargarMovimientos = async () => {
    try {
      if (!window.electronAPI) return;
      const movs = await window.electronAPI.getMovimientosCajaPorFecha(fechaSeleccionada);
      setMovimientos(movs || []);
    } catch (error: any) {
      Logger.error('Error cargando movimientos:', error);
    }
  };

  const cargarArqueo = async () => {
    try {
      if (!window.electronAPI) return;
      const arq = await window.electronAPI.getArqueoCaja(fechaSeleccionada);
      setArqueo(arq);
    } catch (error: any) {
      Logger.error('Error cargando arqueo:', error);
    }
  };

  const handleAbrirCaja = async () => {
    if (!montoInicial || parseFloat(montoInicial) < 0) {
      notify.error('Error', 'Ingrese un monto inicial válido');
      return;
    }

    setIsLoading(true);
    try {
      if (!window.electronAPI) {
        throw new Error('electronAPI no está disponible');
      }

      const estado = await window.electronAPI.abrirCaja(
        Math.round(parseFloat(montoInicial) * 100),
        observacionesApertura
      );

      setEstadoCaja(estado);
      setIsAbrirDialogOpen(false);
      setMontoInicial('');
      setObservacionesApertura('');
      notify.success('Éxito', 'Caja abierta correctamente');
    } catch (error: any) {
      Logger.error('Error abriendo caja:', error);
      notify.error('Error', error.message || 'No se pudo abrir la caja');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCerrarCaja = async () => {
    if (!montoFinal || parseFloat(montoFinal) < 0) {
      notify.error('Error', 'Ingrese un monto final válido');
      return;
    }

    setIsLoading(true);
    try {
      if (!window.electronAPI) {
        throw new Error('electronAPI no está disponible');
      }

      const estado = await window.electronAPI.cerrarCaja(
        Math.round(parseFloat(montoFinal) * 100),
        observacionesCierre
      );

      setEstadoCaja(estado);
      setIsCerrarDialogOpen(false);
      setMontoFinal('');
      setObservacionesCierre('');
      notify.success('Éxito', 'Caja cerrada correctamente');
      cargarArqueo();
    } catch (error: any) {
      Logger.error('Error cerrando caja:', error);
      notify.error('Error', error.message || 'No se pudo cerrar la caja');
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

  const totalEfectivo = arqueo?.totalEfectivo ?? 0;
  const totalOtros = (arqueo?.totalTarjeta ?? 0) + (arqueo?.totalTransferencia ?? 0);
  const totalGeneral = totalEfectivo + totalOtros;

  const operaciones = [
    { label: 'Órdenes de reparación', efectivo: 0, otros: 0, total: 0 },
    { label: 'Ventas', efectivo: 0, otros: 0, total: 0 },
    { label: 'Compras', efectivo: 0, otros: 0, total: 0 },
    { label: 'Movimientos de caja', efectivo: 0, otros: 0, total: 0 },
    { label: 'Cobros de cuentas corrientes', efectivo: 0, otros: 0, total: 0 },
    { label: 'Pagos a trabajadores', efectivo: 0, otros: 0, total: 0 },
  ];

  return (
    <div className="p-6">
      <Card className="border border-border shadow-sm">
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center justify-center rounded-md border border-gray-200 bg-muted/40 p-4">
            {!estadoCaja || estadoCaja.estado === 'cerrada' ? (
              <Dialog open={isAbrirDialogOpen} onOpenChange={setIsAbrirDialogOpen}>
                <DialogTrigger asChild>
                  <button className="px-4 py-2 rounded-md bg-success text-white text-sm font-medium">
                    CERRAR CAJA
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-md bg-white text-gray-900">
                  <DialogHeader>
                    <DialogTitle>Cerrar Caja</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="montoInicial">Monto Inicial (CLP)</Label>
                      <Input
                        id="montoInicial"
                        type="number"
                        value={montoInicial}
                        onChange={(e) => setMontoInicial(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="observacionesApertura">Observaciones</Label>
                      <Textarea
                        id="observacionesApertura"
                        value={observacionesApertura}
                        onChange={(e) => setObservacionesApertura(e.target.value)}
                        placeholder="Observaciones opcionales..."
                      />
                    </div>
                    <button onClick={handleCerrarCaja} disabled={isLoading} className="btn-primary w-full">
                      Cerrar Caja
                    </button>
                  </div>
                </DialogContent>
              </Dialog>
            ) : (
              <Dialog open={isCerrarDialogOpen} onOpenChange={setIsCerrarDialogOpen}>
                <DialogTrigger asChild>
                  <button className="px-4 py-2 rounded-md bg-success text-white text-sm font-medium">
                    CERRAR CAJA
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-md bg-white text-gray-900">
                  <DialogHeader>
                    <DialogTitle>Cerrar Caja</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="montoFinal">Monto Final (CLP)</Label>
                      <Input
                        id="montoFinal"
                        type="number"
                        value={montoFinal}
                        onChange={(e) => setMontoFinal(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="observacionesCierre">Observaciones</Label>
                      <Textarea
                        id="observacionesCierre"
                        value={observacionesCierre}
                        onChange={(e) => setObservacionesCierre(e.target.value)}
                        placeholder="Observaciones opcionales..."
                      />
                    </div>
                    <button onClick={handleCerrarCaja} disabled={isLoading} className="btn-primary w-full">
                      Cerrar Caja
                    </button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>

          <div className="border border-gray-200 rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-700">
                  <th className="px-4 py-3 text-left font-semibold">Operación</th>
                  <th className="px-4 py-3 text-right font-semibold">Efectivo</th>
                  <th className="px-4 py-3 text-right font-semibold">Otros</th>
                  <th className="px-4 py-3 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {operaciones.map((op) => (
                  <tr key={op.label} className="border-b border-gray-200 text-gray-700">
                    <td className="px-4 py-3">{op.label}</td>
                    <td className="px-4 py-3 text-right">{formatearMonto(op.efectivo)}</td>
                    <td className="px-4 py-3 text-right">{formatearMonto(op.otros)}</td>
                    <td className="px-4 py-3 text-right">{formatearMonto(op.total)}</td>
                  </tr>
                ))}
                <tr className="border-t border-gray-200">
                  <td className="px-4 py-3 font-semibold">Totales:</td>
                  <td className="px-4 py-3 text-right font-semibold text-success">{formatearMonto(totalEfectivo)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-success">{formatearMonto(totalOtros)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-success">{formatearMonto(totalGeneral)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="rounded-md border border-gray-200 bg-muted/40 p-4 text-sm text-gray-700">
            <p className="font-medium mb-2">Información</p>
            <p>
              Para una correcta y sencilla administración de caja, solo se verán reflejados los
              movimientos que representan un ingreso o egreso de capital, sea en "efectivo" u "otros".
              Los cobros realizados en las ventas y órdenes de servicios que sean a cuenta corriente
              quedarán asignados a la cuenta corriente correspondiente como deuda y recién se verán
              reflejados en la caja al momento de realizar un cobro parcial o total de dicha deuda.
              Dicho cobro se verá reflejado bajo el ítem "Cobros de cuentas corrientes".
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
