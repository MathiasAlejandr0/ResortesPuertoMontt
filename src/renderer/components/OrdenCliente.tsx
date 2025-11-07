import React from 'react';
import { Download, Wrench, User, Car, Calendar, DollarSign } from 'lucide-react';
import { Cliente, Vehiculo, OrdenTrabajo } from '../types';

interface RepuestoOrden {
  id: number;
  nombre: string;
  cantidad: number;
}

interface OrdenClienteProps {
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

export default function OrdenCliente({ 
  orden,
  cliente,
  vehiculo,
  repuestos,
  descripcionTrabajo,
  observaciones,
  nombreTaller,
  telefonoTaller,
  emailTaller
}: OrdenClienteProps) {
  
  const generarPDF = () => {
    // Crear contenido HTML para el PDF
    const contenidoHTML = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Orden de Trabajo ${orden.numero}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            color: #333;
            line-height: 1.6;
          }
          .header {
            text-align: center;
            border-bottom: 3px solid #dc2626;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 24px;
            font-weight: bold;
            color: #dc2626;
            margin-bottom: 10px;
          }
          .orden-info {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
          }
          .info-section h3 {
            color: #dc2626;
            margin-bottom: 10px;
            font-size: 16px;
          }
          .info-section p {
            margin: 5px 0;
            font-size: 14px;
          }
          .trabajo-section {
            margin-bottom: 30px;
          }
          .trabajo-section h3 {
            color: #dc2626;
            border-bottom: 2px solid #dc2626;
            padding-bottom: 5px;
            margin-bottom: 15px;
          }
          .repuestos-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          .repuestos-table th,
          .repuestos-table td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
          }
          .repuestos-table th {
            background-color: #f8f9fa;
            font-weight: bold;
            color: #dc2626;
          }
          .total-section {
            background-color: white;
            color: #dc2626;
            border: 4px solid #dc2626;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            margin-bottom: 30px;
          }
          .total-section h2 {
            margin: 0;
            font-size: 24px;
            color: #dc2626;
          }
          .observaciones {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 30px;
          }
          .footer {
            text-align: center;
            border-top: 2px solid #dc2626;
            padding-top: 20px;
            margin-top: 30px;
            font-size: 12px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">${nombreTaller}</div>
          <p>Servicios de Reparación Automotriz</p>
          <p>Tel: ${telefonoTaller} | Email: ${emailTaller}</p>
        </div>

        <div class="orden-info">
          <h2 style="color: #dc2626; margin-top: 0;">ORDEN DE TRABAJO</h2>
          <div class="info-grid">
            <div class="info-section">
              <h3>📋 Información de la Orden</h3>
              <p><strong>Número:</strong> ${orden.numero}</p>
              <p><strong>Fecha de Ingreso:</strong> ${orden.fechaIngreso ? new Date(orden.fechaIngreso).toLocaleDateString('es-CL') : 'No especificada'}</p>
              ${orden.fechaEntrega ? `<p><strong>Fecha Estimada:</strong> ${new Date(orden.fechaEntrega).toLocaleDateString('es-CL')}</p>` : ''}
              <p><strong>Estado:</strong> ${orden.estado?.toUpperCase()}</p>
            </div>
            <div class="info-section">
              <h3>👤 Datos del Cliente</h3>
              <p><strong>Nombre:</strong> ${cliente.nombre}</p>
              <p><strong>RUT:</strong> ${cliente.rut}</p>
              <p><strong>Teléfono:</strong> ${cliente.telefono}</p>
              ${cliente.email ? `<p><strong>Email:</strong> ${cliente.email}</p>` : ''}
            </div>
          </div>
          
          <div class="info-section">
            <h3>🚗 Datos del Vehículo</h3>
            <p><strong>Marca:</strong> ${vehiculo.marca}</p>
            <p><strong>Modelo:</strong> ${vehiculo.modelo}</p>
            <p><strong>Patente:</strong> ${vehiculo.patente}</p>
            ${vehiculo.año ? `<p><strong>Año:</strong> ${vehiculo.año}</p>` : ''}
            ${orden.kilometrajeEntrada ? `<p><strong>Kilometraje:</strong> ${orden.kilometrajeEntrada.toLocaleString('es-CL')} km</p>` : ''}
          </div>
        </div>

        <div class="trabajo-section">
          <h3>🔧 Trabajo a Realizar</h3>
          <p>${descripcionTrabajo}</p>
        </div>

        ${repuestos.length > 0 ? `
        <div class="trabajo-section">
          <h3>🔩 Repuestos a Utilizar</h3>
          <table class="repuestos-table">
            <thead>
              <tr>
                <th>Repuesto</th>
                <th>Cantidad</th>
              </tr>
            </thead>
            <tbody>
              ${repuestos.map(repuesto => `
                <tr>
                  <td>${repuesto.nombre}</td>
                  <td>${repuesto.cantidad}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        <div class="total-section">
          <h2>💰 TOTAL DEL TRABAJO</h2>
          <h2>$${orden.total?.toLocaleString('es-CL') || '0'}</h2>
          <p style="margin: 10px 0 0 0; font-size: 14px; color: #dc2626;">
            Incluye mano de obra y todos los repuestos necesarios
          </p>
        </div>

        ${observaciones ? `
        <div class="observaciones">
          <h3>📝 Observaciones</h3>
          <p>${observaciones}</p>
        </div>
        ` : ''}

        ${orden.tecnicoAsignado ? `
        <div class="info-section">
          <h3>👨‍🔧 Técnico Asignado</h3>
          <p><strong>${orden.tecnicoAsignado}</strong></p>
        </div>
        ` : ''}

        <div class="footer">
          <p><strong>${nombreTaller}</strong></p>
          <p>Teléfono: ${telefonoTaller} | Email: ${emailTaller}</p>
          <p>Gracias por confiar en nuestros servicios</p>
        </div>
      </body>
      </html>
    `;

    // Crear ventana nueva para imprimir
    const ventanaImpresion = window.open('', '_blank');
    if (ventanaImpresion) {
      ventanaImpresion.document.write(contenidoHTML);
      ventanaImpresion.document.close();
      
      // Esperar a que se cargue el contenido y luego imprimir
      ventanaImpresion.onload = () => {
        ventanaImpresion.print();
      };
    }
  };

  const getPrioridadColor = (prioridad?: string) => {
    switch (prioridad?.toLowerCase()) {
      case 'urgente': return 'text-red-600 bg-red-100';
      case 'alta': return 'text-orange-600 bg-orange-100';
      case 'normal': return 'text-blue-600 bg-blue-100';
      case 'baja': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getEstadoColor = (estado?: string) => {
    switch (estado?.toLowerCase()) {
      case 'completada': return 'text-green-600 bg-green-100';
      case 'en_proceso': return 'text-blue-600 bg-blue-100';
      case 'pendiente': return 'text-yellow-600 bg-yellow-100';
      case 'cancelada': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
      {/* Header del PDF */}
      <div className="text-center border-b-4 border-red-600 pb-6 mb-8">
        <h1 className="text-3xl font-bold text-red-600 mb-2">{nombreTaller}</h1>
        <p className="text-gray-600">Servicios de Reparación Automotriz</p>
        <p className="text-sm text-gray-500">Tel: {telefonoTaller} | Email: {emailTaller}</p>
      </div>

      {/* Información de la Orden */}
      <div className="bg-gray-50 p-6 rounded-lg mb-6">
        <h2 className="text-2xl font-bold text-red-600 mb-4">ORDEN DE TRABAJO</h2>
        
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
              <p><strong>Kilometraje:</strong> {orden.kilometrajeEntrada.toLocaleString('es-CL')} km</p>
            </div>
          )}
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

      {/* Repuestos */}
      {repuestos.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-red-600 mb-3 flex items-center gap-2">
            🔩 Repuestos a Utilizar
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-4 py-2 text-left font-semibold text-red-600">Repuesto</th>
                  <th className="border border-gray-300 px-4 py-2 text-center font-semibold text-red-600">Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {repuestos.map((repuesto) => (
                  <tr key={repuesto.id}>
                    <td className="border border-gray-300 px-4 py-2">{repuesto.nombre}</td>
                    <td className="border border-gray-300 px-4 py-2 text-center">{repuesto.cantidad}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Total */}
      <div className="bg-white border-4 border-red-600 text-red-600 p-6 rounded-lg text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">💰 TOTAL DEL TRABAJO</h2>
        <h2 className="text-4xl font-bold">${orden.total?.toLocaleString('es-CL') || '0'}</h2>
        <p className="text-red-600 mt-2">
          Incluye mano de obra y todos los repuestos necesarios
        </p>
      </div>

      {/* Técnico Asignado */}
      {orden.tecnicoAsignado && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-red-600 mb-3 flex items-center gap-2">
            👨‍🔧 Técnico Asignado
          </h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-gray-700 font-medium">{orden.tecnicoAsignado}</p>
          </div>
        </div>
      )}

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

      {/* Footer */}
      <div className="text-center border-t-2 border-red-600 pt-6 mt-8">
        <p className="font-semibold text-gray-900">{nombreTaller}</p>
        <p className="text-gray-600">Teléfono: {telefonoTaller} | Email: {emailTaller}</p>
        <p className="text-gray-500 text-sm mt-2">Gracias por confiar en nuestros servicios</p>
      </div>

      {/* Botón de Descarga */}
      <div className="mt-6 text-center">
        <button
          onClick={generarPDF}
          className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 mx-auto transition-colors"
        >
          <Download className="h-5 w-5" />
          Generar PDF para Cliente
        </button>
      </div>
    </div>
  );
}
