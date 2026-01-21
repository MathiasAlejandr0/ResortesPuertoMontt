import React from 'react';
import { Eye, DollarSign, Calculator, FileText, User, Car } from 'lucide-react';
import { Cliente, Vehiculo, Cotizacion } from '../types';

interface RepuestoCotizacion {
  id: number;
  nombre: string;
  precio: number;
  cantidad: number;
  subtotal: number;
}

interface CotizacionInternaProps {
  cotizacion: Cotizacion;
  cliente: Cliente;
  vehiculo: Vehiculo;
  repuestos: RepuestoCotizacion[];
  descripcionTrabajo: string;
  observaciones?: string;
  nombreTaller: string;
  telefonoTaller: string;
  emailTaller: string;
}

export default function CotizacionInterna({ 
  cotizacion,
  cliente,
  vehiculo,
  repuestos,
  descripcionTrabajo,
  observaciones,
  nombreTaller,
  telefonoTaller,
  emailTaller
}: CotizacionInternaProps) {
  
  const subtotalRepuestos = repuestos.reduce((total, repuesto) => total + repuesto.subtotal, 0);
  const manoDeObra = (cotizacion.total || 0) - subtotalRepuestos;

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

      {/* Información de la Cotización */}
      <div className="bg-gray-50 p-6 rounded-lg mb-6">
        <h2 className="text-2xl font-bold text-red-600 mb-4">COTIZACIÓN INTERNA</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="text-lg font-semibold text-red-600 mb-3 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Información de la Cotización
            </h3>
            <div className="space-y-2">
              <p><strong>Número:</strong> {cotizacion.numero}</p>
              <p><strong>Fecha:</strong> {cotizacion.fecha ? new Date(cotizacion.fecha).toLocaleDateString('es-CL') : 'No especificada'}</p>
              <p><strong>Estado:</strong> {cotizacion.estado}</p>
              <p><strong>Válida hasta:</strong> {cotizacion.validaHasta ? new Date(cotizacion.validaHasta).toLocaleDateString('es-CL') : 'No especificada'}</p>
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
        </div>
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

      {/* Repuestos con Precios Detallados */}
      {repuestos.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-red-600 mb-3 flex items-center gap-2">
            🔩 Repuestos - Precios Detallados
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-4 py-2 text-left font-semibold text-red-600">Repuesto</th>
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
                  <td colSpan={3} className="border border-gray-300 px-4 py-2 text-right">Subtotal Repuestos:</td>
                  <td className="border border-gray-300 px-4 py-2 text-right text-red-600">${subtotalRepuestos.toLocaleString('es-CL')}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Desglose de Costos */}
      <div className="bg-red-50 p-6 rounded-lg mb-6">
        <h3 className="text-lg font-semibold text-red-600 mb-4 flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Desglose de Costos
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-700">Subtotal Repuestos:</span>
            <span className="font-medium">${subtotalRepuestos.toLocaleString('es-CL')}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-700">Mano de Obra:</span>
            <span className="font-medium">${manoDeObra.toLocaleString('es-CL')}</span>
          </div>
          <div className="border-t pt-3 flex justify-between items-center">
            <span className="text-lg font-semibold text-gray-900">TOTAL:</span>
            <span className="text-xl font-bold text-red-600">${cotizacion.total?.toLocaleString('es-CL') || '0'}</span>
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

      {/* Footer */}
      <div className="text-center border-t-2 border-red-600 pt-6 mt-8">
        <p className="font-semibold text-gray-900">{nombreTaller}</p>
        <p className="text-gray-600">Teléfono: {telefonoTaller} | Email: {emailTaller}</p>
        <p className="text-gray-500 text-sm mt-2">Documento interno - No enviar al cliente</p>
      </div>
    </div>
  );
}
