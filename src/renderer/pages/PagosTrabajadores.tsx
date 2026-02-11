import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { notify } from '../utils/cn';
import { Usuario } from '../types';

export default function PagosTrabajadoresPage() {
  const [filterBy, setFilterBy] = useState('Fecha');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchBy, setSearchBy] = useState('Nom, dni');
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [fechaDesde, setFechaDesde] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [descontarCaja, setDescontarCaja] = useState(false);
  const [metodoPago, setMetodoPago] = useState('');
  const [montoEfectivo, setMontoEfectivo] = useState('');
  const [montoOtros, setMontoOtros] = useState('');
  const [comentario, setComentario] = useState('');
  const [trabajadorId, setTrabajadorId] = useState('');
  const [concepto, setConcepto] = useState('');
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [pagos, setPagos] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        if (!window.electronAPI) return;
        const [usuariosData, pagosData] = await Promise.all([
          window.electronAPI.getAllUsuarios(),
          window.electronAPI.getAllPagosTrabajadores()
        ]);
        setUsuarios(Array.isArray(usuariosData) ? usuariosData : []);
        setPagos(Array.isArray(pagosData) ? pagosData : []);
      } catch (error: any) {
        notify.error('Error', error?.message || 'No se pudieron cargar los datos');
      }
    };
    cargarDatos();
  }, []);

  const totalPago = useMemo(() => {
    return (Number(montoEfectivo || 0) || 0) + (Number(montoOtros || 0) || 0);
  }, [montoEfectivo, montoOtros]);

  const mapMetodoPago = (value: string) => {
    const lower = value.toLowerCase();
    if (lower.includes('crédito')) return 'Crédito';
    if (lower.includes('débito')) return 'Débito';
    if (lower.includes('transferencia')) return 'Transferencia';
    if (lower.includes('cheque')) return 'Cheque';
    return 'Otro';
  };

  const resetForm = () => {
    setTrabajadorId('');
    setConcepto('');
    setDescontarCaja(false);
    setMetodoPago('');
    setMontoEfectivo('');
    setMontoOtros('');
    setComentario('');
  };

  const handleConfirm = async () => {
    if (!window.electronAPI) return;
    if (!trabajadorId) {
      notify.error('Validación', 'Selecciona un trabajador.');
      return;
    }
    if (!concepto) {
      notify.error('Validación', 'Selecciona un concepto.');
      return;
    }
    if (totalPago <= 0) {
      notify.error('Validación', 'Ingresa un monto válido.');
      return;
    }
    if (Number(montoOtros || 0) > 0 && !metodoPago) {
      notify.error('Validación', 'Selecciona el método de pago para otros.');
      return;
    }

    setIsSaving(true);
    try {
      const usuario = usuarios.find((u) => String(u.id) === trabajadorId);
      let cajaId: number | null = null;
      if (descontarCaja) {
        const estadoCaja = await window.electronAPI.getEstadoCaja();
        if (!estadoCaja || estadoCaja.estado !== 'abierta') {
          notify.error('Caja', 'No hay caja abierta para descontar el pago.');
          setIsSaving(false);
          return;
        }
        cajaId = estadoCaja.id;
      }

      if (descontarCaja) {
        const efectivo = Number(montoEfectivo || 0) || 0;
        const otros = Number(montoOtros || 0) || 0;
        if (efectivo > 0) {
          await window.electronAPI.registrarMovimientoCaja({
            tipo: 'egreso',
            monto: efectivo,
            descripcion: `Pago trabajador: ${usuario?.nombre || ''} - ${concepto}`,
            metodo_pago: 'Efectivo',
            fecha: new Date().toISOString(),
            caja_abierta: 1
          });
        }
        if (otros > 0) {
          await window.electronAPI.registrarMovimientoCaja({
            tipo: 'egreso',
            monto: otros,
            descripcion: `Pago trabajador: ${usuario?.nombre || ''} - ${concepto}`,
            metodo_pago: mapMetodoPago(metodoPago),
            fecha: new Date().toISOString(),
            caja_abierta: 1
          });
        }
      }

      const payload = {
        trabajadorId: usuario?.id,
        trabajadorNombre: usuario?.nombre || 'Sin nombre',
        trabajadorRut: '',
        concepto,
        monto_efectivo: Number(montoEfectivo || 0) || 0,
        monto_otros: Number(montoOtros || 0) || 0,
        metodo_pago: metodoPago || null,
        comentario,
        fecha: new Date().toISOString(),
        descontar_caja: descontarCaja,
        caja_id: cajaId
      };

      const result = await window.electronAPI.savePagoTrabajador(payload);
      if (!result?.success) {
        throw new Error(result?.error || 'No se pudo guardar el pago');
      }

      const pagosData = await window.electronAPI.getAllPagosTrabajadores();
      setPagos(Array.isArray(pagosData) ? pagosData : []);
      notify.success('Pago registrado');
      resetForm();
      setIsFormOpen(false);
    } catch (error: any) {
      notify.error('Error', error?.message || 'No se pudo registrar el pago');
    } finally {
      setIsSaving(false);
    }
  };

  const pagosFiltrados = useMemo(() => {
    let data = pagos;
    if (fechaDesde) {
      data = data.filter((pago) => (pago.fecha || '').includes(fechaDesde));
    }
    if (filterStatus === 'Pagados') {
      data = data.filter(() => true);
    } else if (filterStatus === 'Pendientes') {
      data = [];
    }
    const term = searchTerm.trim().toLowerCase();
    if (term) {
      data = data.filter((pago) => {
        const nombre = (pago.trabajadorNombre || '').toLowerCase();
        const conceptoText = (pago.concepto || '').toLowerCase();
        if (searchBy === 'Nombre') return nombre.includes(term);
        if (searchBy === 'RUT') return (pago.trabajadorRut || '').toLowerCase().includes(term);
        return nombre.includes(term) || conceptoText.includes(term);
      });
    }
    if (filterBy === 'Trabajador') {
      data = [...data].sort((a, b) => (a.trabajadorNombre || '').localeCompare(b.trabajadorNombre || ''));
    } else if (filterBy === 'Concepto') {
      data = [...data].sort((a, b) => (a.concepto || '').localeCompare(b.concepto || ''));
    } else {
      data = [...data].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
    }
    return data;
  }, [pagos, fechaDesde, filterStatus, searchTerm, searchBy, filterBy]);

  if (isFormOpen) {
    return (
      <div className="flex flex-col h-full bg-background text-foreground">
        <div className="flex items-center justify-end px-6 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <button onClick={() => { resetForm(); setIsFormOpen(false); }} className="px-4 py-2 text-sm font-medium rounded border border-border text-gray-700 hover:bg-gray-50 transition-colors">
              Volver
            </button>
            <button onClick={() => { resetForm(); setIsFormOpen(false); }} className="px-4 py-2 text-sm font-medium rounded border border-border text-gray-700 hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button className="btn-primary text-sm px-4 py-2 rounded-md" onClick={handleConfirm} disabled={isSaving}>
              Confirmar
            </button>
          </div>
        </div>

        <div className="p-6">
          <Card className="border border-border shadow-sm">
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Trabajador:</label>
                    <select
                      value={trabajadorId}
                      onChange={(e) => setTrabajadorId(e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="">Seleccionar...</option>
                      {usuarios.map((usuario) => (
                        <option key={usuario.id} value={usuario.id}>
                          {usuario.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Concepto:</label>
                    <select
                      value={concepto}
                      onChange={(e) => setConcepto(e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="">Seleccionar...</option>
                      <option>Sueldo</option>
                      <option>Comisión</option>
                      <option>Bono</option>
                      <option>Anticipo</option>
                      <option>Otro</option>
                    </select>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-md">
                  <div className="px-3 py-2 border-b border-gray-200 text-sm font-medium text-gray-700 flex items-center justify-between">
                    <span>Pago</span>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      Descontar de caja:
                      <input
                        type="checkbox"
                        checked={descontarCaja}
                        onChange={(e) => setDescontarCaja(e.target.checked)}
                      />
                    </label>
                  </div>
                  <table className="w-full text-sm">
                    <tbody>
                      <tr className="border-b border-gray-200">
                        <td className="px-3 py-2">Efectivo</td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-gray-500">$</span>
                            <input
                              type="number"
                              value={montoEfectivo}
                              onChange={(e) => setMontoEfectivo(e.target.value)}
                              className="w-24 px-2 py-1 border border-gray-300 rounded-md text-right"
                            />
                          </div>
                        </td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="px-3 py-2">
                          <select
                            value={metodoPago}
                            onChange={(e) => setMetodoPago(e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded-md"
                          >
                            <option value="">Seleccionar</option>
                            <option>Tarjeta de crédito</option>
                            <option>Tarjeta de débito</option>
                            <option>Transferencia bancaria</option>
                            <option>Cheque</option>
                            <option>Otro</option>
                          </select>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-gray-500">$</span>
                            <input
                              type="number"
                              value={montoOtros}
                              onChange={(e) => setMontoOtros(e.target.value)}
                              className="w-24 px-2 py-1 border border-gray-300 rounded-md text-right"
                            />
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 font-medium">Total pago</td>
                        <td className="px-3 py-2 text-right text-green-600">
                          ${totalPago.toLocaleString('es-CL')}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Comentario:</label>
                <textarea
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8 bg-background text-foreground">
      <div className="flex items-center justify-end gap-2">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          <option>Todos</option>
          <option>Pagados</option>
          <option>Pendientes</option>
        </select>
        <input
          type="date"
          value={fechaDesde}
          onChange={(e) => setFechaDesde(e.target.value)}
          className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
        />
        <button onClick={() => setIsFormOpen(true)} className="btn-primary">Nuevo</button>
      </div>

      <Card className="border border-border shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <select
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value)}
                className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option>Fecha</option>
                <option>Trabajador</option>
                <option>Concepto</option>
              </select>
              <button className="h-9 w-9 rounded-md border border-gray-300 bg-white text-gray-700">
                ▼
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar"
                className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <select
                value={searchBy}
                onChange={(e) => setSearchBy(e.target.value)}
                className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option>Nom, dni</option>
                <option>Nombre</option>
                <option>RUT</option>
              </select>
              <button className="h-9 w-9 rounded-md bg-red-600 text-white flex items-center justify-center hover:bg-red-700 transition-colors">
                <Search className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-gray-700">
                  <th className="px-4 py-2 text-left font-semibold">Trabajador</th>
                  <th className="px-4 py-2 text-left font-semibold">Fecha</th>
                  <th className="px-4 py-2 text-left font-semibold">Concepto</th>
                  <th className="px-4 py-2 text-left font-semibold">Efectivo</th>
                  <th className="px-4 py-2 text-left font-semibold">Otros</th>
                  <th className="px-4 py-2 text-left font-semibold">Total</th>
                  <th className="px-4 py-2 text-left font-semibold">Comentario</th>
                  <th className="px-4 py-2 text-left font-semibold">ID Caja</th>
                </tr>
              </thead>
              <tbody>
                {pagosFiltrados.length === 0 ? (
                  <tr className="border-b border-border text-gray-500">
                    <td className="px-4 py-6 text-center" colSpan={8}>
                      No hay pagos registrados
                    </td>
                  </tr>
                ) : (
                  pagosFiltrados.map((pago) => (
                    <tr key={pago.id} className="border-b border-border text-gray-700">
                      <td className="px-4 py-2">{pago.trabajadorNombre}</td>
                      <td className="px-4 py-2">
                        {pago.fecha ? new Date(pago.fecha).toLocaleDateString('es-CL') : '-'}
                      </td>
                      <td className="px-4 py-2">{pago.concepto}</td>
                      <td className="px-4 py-2 text-right">
                        ${Number(pago.monto_efectivo || 0).toLocaleString('es-CL')}
                      </td>
                      <td className="px-4 py-2 text-right">
                        ${Number(pago.monto_otros || 0).toLocaleString('es-CL')}
                      </td>
                      <td className="px-4 py-2 text-right">
                        ${Number((pago.monto_efectivo || 0) + (pago.monto_otros || 0)).toLocaleString('es-CL')}
                      </td>
                      <td className="px-4 py-2">{pago.comentario || '-'}</td>
                      <td className="px-4 py-2">{pago.caja_id ?? '-'}</td>
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
