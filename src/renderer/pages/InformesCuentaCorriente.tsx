import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { useApp } from '../contexts/AppContext';
import { notify, Logger } from '../utils/cn';
import { FileText, Search, Download, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Cliente, OrdenTrabajo, Venta, CuotaPago } from '../types';

interface MovimientoCuenta {
  fecha: string;
  tipo: 'cargo' | 'abono';
  descripcion: string;
  monto: number;
  saldo: number;
  referencia?: string;
}

export default function InformesCuentaCorrientePage() {
  const { clientes, ordenes } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [cuotas, setCuotas] = useState<CuotaPago[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoCuenta[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [saldoActual, setSaldoActual] = useState(0);

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    if (selectedCliente) {
      calcularEstadoCuenta();
    } else {
      setMovimientos([]);
      setSaldoActual(0);
    }
  }, [selectedCliente, ordenes, ventas, cuotas]);

  const cargarDatos = async () => {
    try {
      const [ventasData, cuotasData] = await Promise.all([
        window.electronAPI?.getAllVentas() || Promise.resolve([]),
        window.electronAPI?.getAllCuotasPago() || Promise.resolve([]),
      ]);

      setVentas(Array.isArray(ventasData) ? ventasData : []);
      setCuotas(Array.isArray(cuotasData) ? cuotasData : []);
    } catch (error: any) {
      Logger.error('Error cargando datos:', error);
      notify.error('Error', 'No se pudieron cargar los datos');
    }
  };

  const clientesFiltrados = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return [];
    return clientes.filter((cliente) => {
      return (
        cliente.nombre?.toLowerCase().includes(term) ||
        cliente.rut?.toLowerCase().includes(term) ||
        cliente.telefono?.toLowerCase().includes(term)
      );
    }).slice(0, 8);
  }, [clientes, searchTerm]);

  const calcularEstadoCuenta = () => {
    if (!selectedCliente?.id) return;

    setIsLoading(true);
    try {
      const clienteId = selectedCliente.id;
      const movimientosList: MovimientoCuenta[] = [];
      let saldo = 0;

      // Obtener órdenes del cliente
      const ordenesCliente = ordenes.filter(o => o.clienteId === clienteId);

      // Agregar cargos por órdenes
      ordenesCliente.forEach(orden => {
        // Solo agregar si tiene cuotas o es crédito
        const cuotasOrden = cuotas.filter(c => c.ordenId === orden.id);
        
        if (cuotasOrden.length > 0 || orden.metodoPago === 'Crédito') {
          movimientosList.push({
            fecha: orden.fechaIngreso,
            tipo: 'cargo',
            descripcion: `Orden de trabajo ${orden.numero}`,
            monto: orden.total || 0,
            saldo: 0, // Se calculará después
            referencia: orden.numero,
          });
          saldo += orden.total || 0;
        }
      });

      // Agregar cargos por ventas a crédito
      const ventasCliente = ventas.filter(v => v.clienteId === clienteId && v.metodoPago === 'Crédito');
      ventasCliente.forEach(venta => {
        movimientosList.push({
          fecha: venta.fecha,
          tipo: 'cargo',
          descripcion: `Venta rápida ${venta.numero}`,
          monto: venta.total || 0,
          saldo: 0,
          referencia: venta.numero,
        });
        saldo += venta.total || 0;
      });

      // Agregar abonos por cuotas pagadas
      const cuotasCliente = cuotas.filter(c => {
        const orden = ordenesCliente.find(o => o.id === c.ordenId);
        return orden && c.estado === 'Pagada' && c.montoPagado && c.montoPagado > 0;
      });

      cuotasCliente.forEach(cuota => {
        movimientosList.push({
          fecha: cuota.fechaPago || cuota.fechaVencimiento,
          tipo: 'abono',
          descripcion: `Pago cuota ${cuota.numeroCuota} - Orden ${cuota.ordenId}`,
          monto: cuota.montoPagado || 0,
          saldo: 0,
          referencia: `Cuota ${cuota.numeroCuota}`,
        });
        saldo -= cuota.montoPagado || 0;
      });

      // Ordenar por fecha
      movimientosList.sort((a, b) => {
        return new Date(a.fecha).getTime() - new Date(b.fecha).getTime();
      });

      // Calcular saldos acumulados
      let saldoAcumulado = 0;
      movimientosList.forEach(mov => {
        if (mov.tipo === 'cargo') {
          saldoAcumulado += mov.monto;
        } else {
          saldoAcumulado -= mov.monto;
        }
        mov.saldo = saldoAcumulado;
      });

      setMovimientos(movimientosList);
      setSaldoActual(saldoAcumulado);
    } catch (error: any) {
      Logger.error('Error calculando estado de cuenta:', error);
      notify.error('Error', 'No se pudo calcular el estado de cuenta');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectCliente = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setSearchTerm('');
  };

  const handleGenerarInforme = () => {
    if (!selectedCliente) {
      notify.error('Error', 'Debe seleccionar un cliente');
      return;
    }
    calcularEstadoCuenta();
  };

  const handleImprimir = () => {
    window.print();
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
            <FileText className="w-8 h-8" />
            Informes de Cuenta Corriente
          </h1>
          <p className="text-muted-foreground mt-1">
            Genera estados de cuenta detallados por cliente
          </p>
        </div>
      </div>

      <Card className="border border-border bg-white text-gray-900 shadow-sm">
        <CardHeader>
          <CardTitle>Parámetros del Informe</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-4 items-center">
            <div className="text-sm text-gray-700 font-medium">Cliente:</div>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar cliente por nombre, RUT o teléfono..."
                className="h-9 w-full px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              {clientesFiltrados.length > 0 && searchTerm && (
                <div className="absolute top-12 left-0 right-0 z-10 rounded-md border border-gray-200 bg-white shadow-md max-h-60 overflow-y-auto">
                  {clientesFiltrados.map((cliente) => (
                    <button
                      key={cliente.id}
                      onClick={() => handleSelectCliente(cliente)}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      {cliente.nombre} {cliente.rut ? `(${cliente.rut})` : ''}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {selectedCliente && (
            <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
              <p className="text-sm font-medium text-blue-900">
                Cliente seleccionado: <span className="font-bold">{selectedCliente.nombre}</span>
                {selectedCliente.rut && <span className="ml-2">({selectedCliente.rut})</span>}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-4 items-center">
            <div className="text-sm text-gray-700 font-medium">Tipo Informe:</div>
            <select className="h-9 max-w-[220px] px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
              <option>Estado de cuenta</option>
            </select>
          </div>

          <div className="flex gap-3">
            <Button onClick={handleGenerarInforme} disabled={!selectedCliente || isLoading}>
              <FileText className="h-4 w-4 mr-2" />
              Generar Informe
            </Button>
            {selectedCliente && movimientos.length > 0 && (
              <>
                <Button variant="outline" onClick={handleImprimir}>
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimir
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedCliente && movimientos.length > 0 && (
        <Card className="border border-border shadow-sm print:shadow-none">
          <CardHeader>
            <CardTitle>Estado de Cuenta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-6 space-y-2">
              <h2 className="text-2xl font-bold">{selectedCliente.nombre}</h2>
              <div className="text-sm text-gray-600 space-y-1">
                {selectedCliente.rut && <p>RUT: {selectedCliente.rut}</p>}
                {selectedCliente.telefono && <p>Teléfono: {selectedCliente.telefono}</p>}
                {selectedCliente.direccion && <p>Dirección: {selectedCliente.direccion}</p>}
              </div>
              <div className="mt-4 p-3 bg-gray-100 rounded-md">
                <p className="text-sm font-medium">Saldo Actual:</p>
                <p className={`text-2xl font-bold ${saldoActual >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatearMonto(saldoActual)}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-gray-700">
                    <th className="px-4 py-2 text-left font-semibold">Fecha</th>
                    <th className="px-4 py-2 text-left font-semibold">Tipo</th>
                    <th className="px-4 py-2 text-left font-semibold">Descripción</th>
                    <th className="px-4 py-2 text-left font-semibold">Referencia</th>
                    <th className="px-4 py-2 text-right font-semibold">Cargo</th>
                    <th className="px-4 py-2 text-right font-semibold">Abono</th>
                    <th className="px-4 py-2 text-right font-semibold">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {movimientos.map((mov, index) => (
                    <tr key={index} className="border-b border-border hover:bg-muted/50">
                      <td className="px-4 py-2">
                        {format(new Date(mov.fecha), 'dd/MM/yyyy', { locale: es })}
                      </td>
                      <td className="px-4 py-2">
                        <Badge className={mov.tipo === 'cargo' ? 'bg-red-500' : 'bg-green-500'}>
                          {mov.tipo === 'cargo' ? 'Cargo' : 'Abono'}
                        </Badge>
                      </td>
                      <td className="px-4 py-2">{mov.descripcion}</td>
                      <td className="px-4 py-2 text-gray-600">{mov.referencia || '-'}</td>
                      <td className="px-4 py-2 text-right">
                        {mov.tipo === 'cargo' ? formatearMonto(mov.monto) : '-'}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {mov.tipo === 'abono' ? formatearMonto(mov.monto) : '-'}
                      </td>
                      <td className={`px-4 py-2 text-right font-semibold ${mov.saldo >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatearMonto(mov.saldo)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 p-4 bg-gray-50 rounded-md border border-gray-200">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Saldo Final:</span>
                <span className={`text-xl font-bold ${saldoActual >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatearMonto(saldoActual)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedCliente && movimientos.length === 0 && !isLoading && (
        <Card className="border border-border shadow-sm">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">
              No hay movimientos registrados para este cliente
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
