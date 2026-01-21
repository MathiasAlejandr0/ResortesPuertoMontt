import React from 'react';
import { Eye, DollarSign, Calculator, Wrench, User, Car, Clock, AlertTriangle } from 'lucide-react';
import { Cliente, Vehiculo, OrdenTrabajo } from '../types';

interface RepuestoOrden {
  id: number;
  nombre: string;
  precio: number;
  cantidad: number;
  subtotal: number;
}

interface OrdenInternaProps {
  orden: OrdenTrabajo;
  cliente: Cliente;
  vehiculo: Vehiculo;
  repuestos: RepuestoOrden[];
  descripcionTrabajo: string;
  observaciones?: string;
  nombreTaller: string;
  telefonoTaller: string;
  emailTaller: string;
}

export default function OrdenInterna({ 
  orden,
  cliente,
  vehiculo,
  repuestos,
  descripcionTrabajo,
  observaciones,
  nombreTaller,
  telefonoTaller,
  emailTaller
}: OrdenInternaProps) {
  
  const subtotalRepuestos = repuestos.reduce((total, repuesto) => total + repuesto.subtotal, 0);
  const manoDeObra = (orden.total || 0) - subtotalRepuestos;

  const getPrioridadColor = (prioridad?: string) => {
    switch (prioridad?.toLowerCase()) {
      case 'urgente': return 'text-red-600 bg-red-100';
      case 'alta': return 'text-orange-600 bg-orange-100';
      case 'normal': return 'text-red-600 bg-red-100';
      case 'baja': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getEstadoColor = (estado?: string) => {
    switch (estado?.toLowerCase()) {
      case 'completada': return 'text-green-600 bg-green-100';
      case 'en_proceso': return 'text-red-600 bg-red-100';
      case 'pendiente': return 'text-yellow-600 bg-yellow-100';
      case 'cancelada': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center border-b-4 border-red-600 pb-6 mb-8">
        <h1 className="text-3xl font-bold text-red-600 mb-2">{nombreTaller}</h1>
        <p className="text-gray-600">Servicios de Reparación Automotriz</p>
        <p className="text-sm text-gray-500">Tel: {telefonoTaller} | Email: {emailTaller}</p>
        <div className="mt-4 bg-yellow-100 border border-yellow-300 rounded-lg p-3">
          <p className="text-yellow-800 font-semibold flex items-center justify-center gap-2">
            <Eye className="h-4 w-4" />
            VERSIÓN INTERNA - CON PRECIOS DETALLADOS
          </p>
        </div>
      </div>

      {/* Información de la Orden */}
      <div className="bg-gray-50 p-6 rounded-lg mb-6">
        <h2 className="text-2xl font-bold text-red-600 mb-4">ORDEN DE TRABAJO INTERNA</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="text-lg font-semibold text-red-600 mb-3 flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Información de la Orden
            </h3>
            <div className="space-y-2">
              <p><strong>Número:</strong> {orden.numero}</p>
              <p><strong>Fecha de Ingreso:</strong> {orden.fechaIngreso ? new Date(orden.fechaIngreso).toLocaleDateString('es-CL') : 'No especificada'}</p>
              {orden.fechaEntrega && (
                <p><strong>Fecha Estimada:</strong> {new Date(orden.fechaEntrega).toLocaleDateString('es-CL')}</p>
              )}
              <p><strong>Estado:</strong> 
                <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getEstadoColor(orden.estado)}`}>
                  {orden.estado?.toUpperCase()}
                </span>
              </p>
              {orden.prioridad && (
                <p><strong>Prioridad:</strong> 
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getPrioridadColor(orden.prioridad)}`}>
                    {orden.prioridad.toUpperCase()}
                  </span>
                </p>
              )}
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-red-600 mb-3 flex items-center gap-2">
              <User className="h-5 w-5" />
              Datos del Cliente
            </h3>
            <div className="space-y-2">
              <p><strong>Nombre:</strong> {cliente.nombre}</p>
              <p><strong>RUT:</strong> {cliente.rut}</p>
              <p><strong>Teléfono:</strong> {cliente.telefono}</p>
              {cliente.email && <p><strong>Email:</strong> {cliente.email}</p>}
              {cliente.direccion && <p><strong>Dirección:</strong> {cliente.direccion}</p>}
            </div>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold text-red-600 mb-3 flex items-center gap-2">
            <Car className="h-5 w-5" />
            Datos del Vehículo
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <p><strong>Marca:</strong> {vehiculo.marca}</p>
            <p><strong>Modelo:</strong> {vehiculo.modelo}</p>
            <p><strong>Patente:</strong> {vehiculo.patente}</p>
            {vehiculo.año && <p><strong>Año:</strong> {vehiculo.año}</p>}
          </div>
          {orden.kilometrajeEntrada && (
            <div className="mt-2">
              <p><strong>Kilometraje de Entrada:</strong> {orden.kilometrajeEntrada.toLocaleString('es-CL')} km</p>
            </div>
          )}
          {orden.kilometrajeSalida && (
            <div className="mt-2">
              <p><strong>Kilometraje de Salida:</strong> {orden.kilometrajeSalida.toLocaleString('es-CL')} km</p>
            </div>
          )}
        </div>

        {orden.tecnicoAsignado && (
          <div className="mt-4">
            <h3 className="text-lg font-semibold text-red-600 mb-3 flex items-center gap-2">
              <User className="h-5 w-5" />
              Técnico Asignado
            </h3>
            <p className="text-gray-700">{orden.tecnicoAsignado}</p>
          </div>
        )}
      </div>

      {/* Trabajo a Realizar */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-red-600 mb-3 flex items-center gap-2">
          🔧 Trabajo a Realizar
        </h3>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-gray-700">{descripcionTrabajo}</p>
        </div>
      </div>

      {/* Items a Utilizar (Servicios y Repuestos) con Precios Detallados */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-red-600 mb-3 flex items-center gap-2">
          🔩 Items a Utilizar - Precios Detallados
        </h3>
        {repuestos.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-4 py-2 text-left font-semibold text-red-600">Item</th>
                  <th className="border border-gray-300 px-4 py-2 text-center font-semibold text-red-600">Precio Unit.</th>
                  <th className="border border-gray-300 px-4 py-2 text-center font-semibold text-red-600">Cantidad</th>
                  <th className="border border-gray-300 px-4 py-2 text-right font-semibold text-red-600">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {repuestos.map((repuesto) => (
                  <tr key={repuesto.id}>
                    <td className="border border-gray-300 px-4 py-2">{repuesto.nombre}</td>
                    <td className="border border-gray-300 px-4 py-2 text-center">${repuesto.precio.toLocaleString('es-CL')}</td>
                    <td className="border border-gray-300 px-4 py-2 text-center">{repuesto.cantidad}</td>
                    <td className="border border-gray-300 px-4 py-2 text-right font-medium">${repuesto.subtotal.toLocaleString('es-CL')}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 font-semibold">
                  <td colSpan={3} className="border border-gray-300 px-4 py-2 text-right">Subtotal Items:</td>
                  <td className="border border-gray-300 px-4 py-2 text-right text-red-600">${subtotalRepuestos.toLocaleString('es-CL')}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg text-center">
            <p className="text-yellow-800">No hay items agregados a esta orden</p>
          </div>
        )}
      </div>

      {/* Desglose de Costos */}
      <div className="bg-red-50 p-6 rounded-lg mb-6">
        <h3 className="text-lg font-semibold text-red-600 mb-4 flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Desglose de Costos
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-700">Subtotal Items (Servicios y Repuestos):</span>
            <span className="font-medium">${subtotalRepuestos.toLocaleString('es-CL')}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-700">Mano de Obra:</span>
            <span className="font-medium">${manoDeObra.toLocaleString('es-CL')}</span>
          </div>
          <div className="border-t pt-3 flex justify-between items-center">
            <span className="text-lg font-semibold text-gray-900">TOTAL:</span>
            <span className="text-xl font-bold text-red-600">${orden.total?.toLocaleString('es-CL') || '0'}</span>
          </div>
        </div>
      </div>

      {/* Observaciones */}
      {observaciones && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-red-600 mb-3 flex items-center gap-2">
            📝 Observaciones
          </h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-gray-700">{observaciones}</p>
          </div>
        </div>
      )}

      {/* Información para el Cliente — removida en versión interna */}

      {/* Estado de la Orden */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Estado Actual
        </h3>
        <div className="flex items-center gap-4">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getEstadoColor(orden.estado)}`}>
            {orden.estado?.toUpperCase() || 'PENDIENTE'}
          </span>
          {orden.prioridad && (
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPrioridadColor(orden.prioridad)}`}>
              PRIORIDAD: {orden.prioridad.toUpperCase()}
            </span>
          )}
        </div>
        {orden.tecnicoAsignado && (
          <p className="mt-2 text-gray-700">
            <strong>Técnico:</strong> {orden.tecnicoAsignado}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="text-center border-t-2 border-red-600 pt-6 mt-8">
        <p className="font-semibold text-gray-900">{nombreTaller}</p>
        <p className="text-gray-600">Teléfono: {telefonoTaller} | Email: {emailTaller}</p>
        <p className="text-gray-500 text-sm mt-2">Documento interno - No enviar al cliente</p>
      </div>
    </div>
  );
}
