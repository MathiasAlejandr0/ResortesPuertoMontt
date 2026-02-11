/**
 * ExcelExportService - Servicio para exportar datos a Excel
 * 
 * Usa exceljs para crear archivos Excel con los datos del sistema
 * 
 * @author Mathias Jara
 * @version 1.1.2
 */

import * as fs from 'fs';
import * as path from 'path';
import { Workbook, Worksheet } from 'exceljs';
import { dialog } from 'electron';
import { BrowserWindow } from 'electron';

export class ExcelExportService {
  /**
   * Exporta datos a un archivo Excel
   */
  async exportToExcel(
    mainWindow: BrowserWindow | null,
    data: any[],
    headers: string[],
    fileName: string
  ): Promise<{ success: boolean; filePath?: string; error?: string }> {
    try {
      if (!mainWindow) {
        throw new Error('Ventana principal no disponible');
      }

      // Abrir diálogo para guardar archivo
      const result = await dialog.showSaveDialog(mainWindow, {
        title: 'Guardar archivo Excel',
        defaultPath: `${fileName}.xlsx`,
        filters: [
          { name: 'Archivos Excel', extensions: ['xlsx'] },
          { name: 'Todos los archivos', extensions: ['*'] }
        ]
      });

      if (result.canceled || !result.filePath) {
        return { success: false, error: 'Operación cancelada' };
      }

      const filePath = result.filePath.endsWith('.xlsx') 
        ? result.filePath 
        : `${result.filePath}.xlsx`;

      // Crear workbook
      const workbook = new Workbook();
      const worksheet = workbook.addWorksheet('Datos');

      // Agregar headers
      worksheet.addRow(headers);

      // Estilizar headers
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };

      // Agregar datos
      data.forEach((row) => {
        const values = headers.map(header => {
          // Obtener valor del objeto según el header
          const key = header.toLowerCase().replace(/\s+/g, '');
          return row[key] || row[header] || '';
        });
        worksheet.addRow(values);
      });

      // Auto-ajustar columnas
      worksheet.columns.forEach((column) => {
        if (column.header) {
          column.width = 15;
        }
      });

      // Guardar archivo
      await workbook.xlsx.writeFile(filePath);

      return { success: true, filePath };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.message || 'Error al exportar archivo' 
      };
    }
  }

  /**
   * Exporta productos a Excel
   */
  async exportProductos(
    mainWindow: BrowserWindow | null,
    productos: any[]
  ): Promise<{ success: boolean; filePath?: string; error?: string }> {
    const headers = [
      'ID',
      'Código',
      'Nombre',
      'Descripción',
      'Precio',
      'Precio Costo',
      'Stock',
      'Stock Mínimo',
      'Categoría',
      'Marca',
      'Ubicación'
    ];

    const data = productos.map(p => ({
      id: p.id,
      codigo: p.codigo,
      nombre: p.nombre,
      descripcion: p.descripcion || '',
      precio: p.precio || 0,
      preciocosto: p.precioCosto || 0,
      stock: p.stock || 0,
      stockminimo: p.stockMinimo || 0,
      categoria: p.categoria || '',
      marca: p.marca || '',
      ubicacion: p.ubicacion || ''
    }));

    return this.exportToExcel(mainWindow, data, headers, 'productos');
  }

  /**
   * Exporta órdenes de trabajo a Excel
   */
  async exportOrdenes(
    mainWindow: BrowserWindow | null,
    ordenes: any[]
  ): Promise<{ success: boolean; filePath?: string; error?: string }> {
    const headers = [
      'ID',
      'Número',
      'Cliente ID',
      'Vehículo ID',
      'Fecha Ingreso',
      'Fecha Entrega',
      'Estado',
      'Total',
      'Descripción'
    ];

    const data = ordenes.map(o => ({
      id: o.id,
      numero: o.numero,
      clienteid: o.clienteId,
      vehiculoid: o.vehiculoId,
      fechaingreso: o.fechaIngreso || '',
      fechaentrega: o.fechaEntrega || '',
      estado: o.estado,
      total: o.total || 0,
      descripcion: o.descripcion || ''
    }));

    return this.exportToExcel(mainWindow, data, headers, 'ordenes_trabajo');
  }

  /**
   * Exporta clientes a Excel
   */
  async exportClientes(
    mainWindow: BrowserWindow | null,
    clientes: any[]
  ): Promise<{ success: boolean; filePath?: string; error?: string }> {
    const headers = [
      'ID',
      'Nombre',
      'RUT',
      'Teléfono',
      'Email',
      'Dirección',
      'Fecha Registro'
    ];

    const data = clientes.map(c => ({
      id: c.id,
      nombre: c.nombre,
      rut: c.rut,
      telefono: c.telefono || '',
      email: c.email || '',
      direccion: c.direccion || '',
      fecharegistro: c.fechaRegistro || ''
    }));

    return this.exportToExcel(mainWindow, data, headers, 'clientes');
  }

  /**
   * Exporta ventas a Excel
   */
  async exportVentas(
    mainWindow: BrowserWindow | null,
    ventas: any[]
  ): Promise<{ success: boolean; filePath?: string; error?: string }> {
    const headers = [
      'ID',
      'Número',
      'Cliente',
      'Fecha',
      'Total',
      'Método Pago'
    ];

    const data = ventas.map(v => ({
      id: v.id,
      numero: v.numero,
      cliente: v.clienteNombre || '',
      fecha: v.fecha || '',
      total: v.total || 0,
      metodopago: v.metodoPago || ''
    }));

    return this.exportToExcel(mainWindow, data, headers, 'ventas');
  }

  /**
   * Exporta proveedores a Excel
   */
  async exportProveedores(
    mainWindow: BrowserWindow | null,
    proveedores: any[]
  ): Promise<{ success: boolean; filePath?: string; error?: string }> {
    const headers = [
      'ID',
      'Nombre',
      'Tipo Contribuyente',
      'Identificación Tributaria',
      'Teléfono',
      'Email',
      'Dirección',
      'Ciudad'
    ];

    const data = proveedores.map(p => ({
      id: p.id,
      nombre: p.nombre,
      tipocontribuyente: p.tipoContribuyente || '',
      identificaciontributaria: p.identificacionTributaria || '',
      telefono: p.telefono || '',
      email: p.email || '',
      direccion: p.direccionFiscal || '',
      ciudad: p.ciudadFiscal || ''
    }));

    return this.exportToExcel(mainWindow, data, headers, 'proveedores');
  }

  /**
   * Exporta servicios a Excel
   */
  async exportServicios(
    mainWindow: BrowserWindow | null,
    servicios: any[]
  ): Promise<{ success: boolean; filePath?: string; error?: string }> {
    const headers = [
      'ID',
      'Nombre',
      'Descripción',
      'Precio',
      'Duración Estimada (min)'
    ];

    const data = servicios.map(s => ({
      id: s.id,
      nombre: s.nombre,
      descripcion: s.descripcion || '',
      precio: s.precio || 0,
      duracionestimada: s.duracionEstimada || 60
    }));

    return this.exportToExcel(mainWindow, data, headers, 'servicios');
  }

  /**
   * Exporta trabajadores a Excel
   */
  async exportTrabajadores(
    mainWindow: BrowserWindow | null,
    trabajadores: any[]
  ): Promise<{ success: boolean; filePath?: string; error?: string }> {
    const headers = [
      'ID',
      'Nombre',
      'Email',
      'Rol',
      'Comisión %'
    ];

    const data = trabajadores.map(t => ({
      id: t.id,
      nombre: t.nombre,
      email: t.email,
      rol: t.rol,
      comision: t.porcentaje_comision || 0
    }));

    return this.exportToExcel(mainWindow, data, headers, 'trabajadores');
  }

  /**
   * Exporta categorías a Excel
   */
  async exportCategorias(
    mainWindow: BrowserWindow | null,
    categorias: any[]
  ): Promise<{ success: boolean; filePath?: string; error?: string }> {
    const headers = ['ID', 'Nombre'];

    const data = categorias.map(c => ({
      id: c.id,
      nombre: c.nombre
    }));

    return this.exportToExcel(mainWindow, data, headers, 'categorias');
  }

  /**
   * Exporta recordatorios a Excel
   */
  async exportRecordatorios(
    mainWindow: BrowserWindow | null,
    recordatorios: any[]
  ): Promise<{ success: boolean; filePath?: string; error?: string }> {
    const headers = [
      'ID',
      'Tipo',
      'Fecha Aviso',
      'Estado',
      'Observaciones'
    ];

    const data = recordatorios.map(r => ({
      id: r.id,
      tipo: r.tipo || '',
      fechaaviso: r.fechaAviso || '',
      estado: r.estado || '',
      observaciones: r.observaciones || ''
    }));

    return this.exportToExcel(mainWindow, data, headers, 'recordatorios');
  }

  /**
   * Exporta movimientos de caja a Excel
   */
  async exportMovimientosCaja(
    mainWindow: BrowserWindow | null,
    movimientos: any[]
  ): Promise<{ success: boolean; filePath?: string; error?: string }> {
    const headers = [
      'ID',
      'Tipo',
      'Monto',
      'Descripción',
      'Fecha',
      'Método Pago'
    ];

    const data = movimientos.map(m => ({
      id: m.id,
      tipo: m.tipo || '',
      monto: m.monto || 0,
      descripcion: m.descripcion || '',
      fecha: m.fecha || '',
      metodopago: m.metodo_pago || ''
    }));

    return this.exportToExcel(mainWindow, data, headers, 'movimientos_caja');
  }

  /**
   * Exporta cierres de caja a Excel
   */
  async exportCierresCaja(
    mainWindow: BrowserWindow | null,
    cierres: any[]
  ): Promise<{ success: boolean; filePath?: string; error?: string }> {
    const headers = [
      'ID',
      'Fecha Apertura',
      'Fecha Cierre',
      'Monto Inicial',
      'Monto Final',
      'Estado'
    ];

    const data = cierres.map(c => ({
      id: c.id,
      fechaapertura: c.fecha_apertura || '',
      fechacierre: c.fecha_cierre || '',
      montoinicial: c.monto_inicial || 0,
      montofinal: c.monto_final || 0,
      estado: c.estado || ''
    }));

    return this.exportToExcel(mainWindow, data, headers, 'cierres_caja');
  }
}
