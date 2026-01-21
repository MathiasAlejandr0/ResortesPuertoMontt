/**
 * ExcelImportService - Servicio seguro para importación de archivos Excel
 * 
 * Reemplaza xlsx (SheetJS) por exceljs con validaciones de seguridad:
 * - Validación de firma de archivo (Magic Numbers)
 * - Validación de esquema con Zod
 * - Lectura por streams para prevenir DoS
 * - Sanitización de datos
 * 
 * @author Mathias Jara
 * @version 1.1.2
 */

import * as fs from 'fs';
import * as path from 'path';
import { Workbook, Worksheet, Row, Cell } from 'exceljs';
import { z } from 'zod';
import { Repuesto } from '../../database/database';
import { persistentLogger } from '../logger-persistente';

/**
 * Esquema Zod estricto para validación de Repuesto
 * Basado en la estructura de la tabla de base de datos
 */
const RepuestoSchema = z.object({
  codigo: z.string()
    .min(1, 'El código es requerido')
    .max(50, 'El código no puede exceder 50 caracteres')
    .transform((val) => val.trim()),
  nombre: z.string()
    .min(1, 'El nombre es requerido')
    .max(200, 'El nombre no puede exceder 200 caracteres')
    .transform((val) => val.trim()),
  descripcion: z.string()
    .max(1000, 'La descripción no puede exceder 1000 caracteres')
    .optional()
    .default('')
    .transform((val) => (val || '').trim()),
  precio: z.number()
    .nonnegative('El precio no puede ser negativo')
    .finite('El precio debe ser un número válido'),
  precioCosto: z.number()
    .nonnegative('El precio de costo no puede ser negativo')
    .finite('El precio de costo debe ser un número válido')
    .optional()
    .default(0),
  stock: z.number()
    .int('El stock debe ser un número entero')
    .nonnegative('El stock no puede ser negativo')
    .default(0),
  stockMinimo: z.number()
    .int('El stock mínimo debe ser un número entero')
    .nonnegative('El stock mínimo no puede ser negativo')
    .default(0),
  categoria: z.string()
    .min(1, 'La categoría es requerida')
    .max(100, 'La categoría no puede exceder 100 caracteres')
    .transform((val) => val.trim() || 'General'),
  marca: z.string()
    .max(100, 'La marca no puede exceder 100 caracteres')
    .optional()
    .default('')
    .transform((val) => (val || '').trim()),
  ubicacion: z.string()
    .max(100, 'La ubicación no puede exceder 100 caracteres')
    .optional()
    .default('Almacén')
    .transform((val) => (val || '').trim()),
  activo: z.boolean()
    .optional()
    .default(true),
});

/**
 * Tipo TypeScript derivado del schema Zod
 */
type RepuestoValidado = z.infer<typeof RepuestoSchema>;

/**
 * Esquema Zod para importación de Servicios
 */
const ServicioImportSchema = z.object({
  nombre: z.string()
    .min(1, 'El nombre es requerido')
    .max(200, 'El nombre no puede exceder 200 caracteres')
    .transform((val) => val.trim()),
  descripcion: z.string()
    .max(1000, 'La descripción no puede exceder 1000 caracteres')
    .optional()
    .default('')
    .transform((val) => (val || '').trim()),
  precio: z.number()
    .nonnegative('El precio no puede ser negativo')
    .finite('El precio debe ser un número válido'),
  duracionEstimada: z.number()
    .int('La duración debe ser un número entero')
    .positive('La duración debe ser positiva')
    .default(60),
  activo: z.boolean().optional().default(true),
});

/**
 * Esquema Zod para importación de Clientes
 */
const ClienteImportSchema = z.object({
  nombre: z.string()
    .min(1, 'El nombre es requerido')
    .max(200, 'El nombre no puede exceder 200 caracteres')
    .transform((val) => val.trim()),
  rut: z.string()
    .min(1, 'El RUT es requerido')
    .max(20, 'El RUT no puede exceder 20 caracteres')
    .transform((val) => val.trim()),
  telefono: z.string()
    .max(20, 'El teléfono no puede exceder 20 caracteres')
    .optional()
    .default('')
    .transform((val) => (val || '').trim()),
  email: z.string()
    .email('Email inválido')
    .optional()
    .or(z.literal(''))
    .default(''),
  direccion: z.string()
    .max(500, 'La dirección no puede exceder 500 caracteres')
    .optional()
    .default('')
    .transform((val) => (val || '').trim()),
  activo: z.boolean().optional().default(true),
});

type ServicioValidado = z.infer<typeof ServicioImportSchema>;
type ClienteValidado = z.infer<typeof ClienteImportSchema>;

/**
 * Resultado de la importación
 */
export interface ImportResult {
  totalProcesados: number;
  totalErrores: number;
  datosValidos: RepuestoValidado[];
  erroresDetallados: Array<{
    fila: number;
    error: string;
    datos?: Partial<RepuestoValidado>;
  }>;
}

export interface ImportResultServicios {
  totalProcesados: number;
  totalErrores: number;
  datosValidos: ServicioValidado[];
  erroresDetallados: Array<{
    fila: number;
    error: string;
    datos?: Partial<ServicioValidado>;
  }>;
}

export interface ImportResultClientes {
  totalProcesados: number;
  totalErrores: number;
  datosValidos: ClienteValidado[];
  erroresDetallados: Array<{
    fila: number;
    error: string;
    datos?: Partial<ClienteValidado>;
  }>;
}

/**
 * Configuración de límites de seguridad
 */
const SECURITY_LIMITS = {
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50 MB
  MAX_SHEETS: 10,
  MAX_ROWS: 10000,
  MAX_COLUMNS: 100,
  MAX_SHEET_NAME_LENGTH: 100,
  READ_TIMEOUT_MS: 30000, // 30 segundos
} as const;

/**
 * Magic Numbers para validación de firma de archivo
 * ZIP/XLSX: 50 4B 03 04 (PK..)
 */
const ZIP_SIGNATURE = Buffer.from([0x50, 0x4B, 0x03, 0x04]);
const ZIP_EMPTY_ARCHIVE = Buffer.from([0x50, 0x4B, 0x05, 0x06]);
const ZIP_SPANNED = Buffer.from([0x50, 0x4B, 0x07, 0x08]);

/**
 * ExcelImportService - Servicio seguro para importación de Excel
 */
export class ExcelImportService {
  private readonly logger = persistentLogger;

  /**
   * Valida la firma del archivo (Magic Numbers)
   * Previene ejecutables renombrados como .xlsx
   */
  private validateFileSignature(filePath: string): void {
    const fd = fs.openSync(filePath, 'r');
    try {
      const buffer = Buffer.alloc(4);
      fs.readSync(fd, buffer, 0, 4, 0);
      
      const isValidZip = 
        buffer.equals(ZIP_SIGNATURE) ||
        buffer.equals(ZIP_EMPTY_ARCHIVE) ||
        buffer.equals(ZIP_SPANNED);
      
      if (!isValidZip) {
        throw new Error(
          'El archivo no es un archivo Excel válido. ' +
          'La firma del archivo no coincide con el formato ZIP/XLSX esperado.'
        );
      }
    } finally {
      fs.closeSync(fd);
    }
  }

  /**
   * Sanitiza un string eliminando caracteres peligrosos
   * Previene Prototype Pollution y XSS
   */
  private sanitizeString(value: unknown, maxLength: number = 500): string {
    if (value === null || value === undefined) {
      return '';
    }
    
    const str = String(value)
      .trim()
      .replace(/[<>\"'`]/g, '') // Eliminar caracteres peligrosos
      .substring(0, maxLength);
    
    return str;
  }

  /**
   * Convierte un valor a número de forma segura
   */
  private parseNumber(value: unknown): number | null {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') return isFinite(value) ? value : null;
    const raw = String(value).trim();
    if (!raw) return null;
    const cleaned = raw.replace(/[^\d.,-]/g, '');
    if (!cleaned) return null;
    let normalized = cleaned;
    if (cleaned.includes(',') && cleaned.includes('.')) {
      normalized = cleaned.replace(/\./g, '').replace(',', '.');
    } else if (cleaned.includes(',')) {
      normalized = cleaned.replace(',', '.');
    }
    const parsed = parseFloat(normalized);
    return isFinite(parsed) ? parsed : null;
  }

  /**
   * Prepara y valida la hoja a procesar
   */
  private async prepareWorksheet(filePath: string): Promise<Worksheet> {
    if (!fs.existsSync(filePath)) {
      throw new Error('El archivo no existe');
    }

    const stats = fs.statSync(filePath);
    if (stats.size > SECURITY_LIMITS.MAX_FILE_SIZE) {
      throw new Error(
        `El archivo es demasiado grande (${(stats.size / 1024 / 1024).toFixed(2)} MB). ` +
        `Tamaño máximo permitido: ${SECURITY_LIMITS.MAX_FILE_SIZE / 1024 / 1024} MB`
      );
    }

    if (stats.size === 0) {
      throw new Error('El archivo está vacío');
    }

    this.validateFileSignature(filePath);

    const workbook = new Workbook();
    const readPromise = workbook.xlsx.readFile(filePath);
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Timeout: El archivo tardó más de ${SECURITY_LIMITS.READ_TIMEOUT_MS / 1000} segundos en procesarse`));
      }, SECURITY_LIMITS.READ_TIMEOUT_MS);
    });

    await Promise.race([readPromise, timeoutPromise]);

    if (workbook.worksheets.length > SECURITY_LIMITS.MAX_SHEETS) {
      throw new Error(
        `El archivo contiene demasiadas hojas (${workbook.worksheets.length}). ` +
        `Máximo permitido: ${SECURITY_LIMITS.MAX_SHEETS} hojas`
      );
    }

    if (workbook.worksheets.length === 0) {
      throw new Error('El archivo no contiene hojas');
    }

    for (const sheet of workbook.worksheets) {
      if (sheet.name.length > SECURITY_LIMITS.MAX_SHEET_NAME_LENGTH) {
        throw new Error(
          `El nombre de la hoja "${sheet.name.substring(0, 50)}..." es demasiado largo. ` +
          `Máximo permitido: ${SECURITY_LIMITS.MAX_SHEET_NAME_LENGTH} caracteres`
        );
      }
    }

    const worksheet = workbook.worksheets[0];
    if (worksheet.rowCount > SECURITY_LIMITS.MAX_ROWS) {
      throw new Error(
        `La hoja contiene demasiadas filas (${worksheet.rowCount}). ` +
        `Máximo permitido: ${SECURITY_LIMITS.MAX_ROWS} filas`
      );
    }

    if (worksheet.columnCount > SECURITY_LIMITS.MAX_COLUMNS) {
      throw new Error(
        `La hoja contiene demasiadas columnas (${worksheet.columnCount}). ` +
        `Máximo permitido: ${SECURITY_LIMITS.MAX_COLUMNS} columnas`
      );
    }

    return worksheet;
  }

  private detectHeadersServicios(row: Row): Map<string, number> {
    const headers = new Map<string, number>();
    if (!row || !row.hasValues) {
      return headers;
    }

    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const headerValue = this.extractCellValue(cell);
      if (headerValue === null || typeof headerValue !== 'string') {
        return;
      }
      const headerLower = headerValue.toLowerCase().trim();
      if (headerLower === 'nombre' || headerLower === 'servicio') {
        if (!headers.has('nombre')) headers.set('nombre', colNumber);
      } else if (headerLower.includes('descripcion')) {
        if (!headers.has('descripcion')) headers.set('descripcion', colNumber);
      } else if (headerLower.includes('precio con')) {
        headers.set('precio', colNumber);
      } else if (!headers.has('precio') && headerLower.includes('precio')) {
        headers.set('precio', colNumber);
      } else if (!headers.has('precio') && headerLower.includes('costo mano')) {
        headers.set('precio', colNumber);
      }
    });

    return headers;
  }

  private detectHeadersClientes(row: Row): Map<string, number> {
    const headers = new Map<string, number>();
    if (!row || !row.hasValues) {
      return headers;
    }

    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const headerValue = this.extractCellValue(cell);
      if (headerValue === null || typeof headerValue !== 'string') {
        return;
      }
      const headerLower = headerValue.toLowerCase().trim();
      if (headerLower === 'nombre') {
        if (!headers.has('nombre')) headers.set('nombre', colNumber);
      } else if (headerLower === 'rut' || headerLower.includes('dni') || headerLower.includes('n°') || headerLower.includes('nº') || headerLower.includes('numero')) {
        if (!headers.has('rut')) headers.set('rut', colNumber);
      } else if (headerLower.includes('telefono') || headerLower.includes('teléfono')) {
        if (!headers.has('telefono')) headers.set('telefono', colNumber);
      } else if (headerLower.includes('email') || headerLower.includes('correo')) {
        if (!headers.has('email')) headers.set('email', colNumber);
      } else if (headerLower.includes('domicilio') || headerLower.includes('direccion') || headerLower.includes('dirección')) {
        if (!headers.has('direccion')) headers.set('direccion', colNumber);
      }
    });

    return headers;
  }

  private rowToServicio(row: Row, headers: Map<string, number>): Partial<ServicioValidado> | null {
    const servicio: Partial<ServicioValidado> = {};

    const nombreCol = headers.get('nombre');
    if (nombreCol !== undefined) {
      const nombreValue = this.extractCellValue(row.getCell(nombreCol));
      if (nombreValue !== null && typeof nombreValue === 'string' && nombreValue.trim()) {
        servicio.nombre = nombreValue.trim();
      }
    }

    if (!servicio.nombre) {
      return null;
    }

    const descripcionCol = headers.get('descripcion');
    if (descripcionCol !== undefined) {
      const descripcionValue = this.extractCellValue(row.getCell(descripcionCol));
      if (descripcionValue !== null && typeof descripcionValue === 'string') {
        servicio.descripcion = descripcionValue.trim();
      }
    }

    const precioCol = headers.get('precio');
    if (precioCol !== undefined) {
      const precioValue = this.extractCellValue(row.getCell(precioCol));
      const precioNumero = this.parseNumber(precioValue);
      if (precioNumero !== null) {
        servicio.precio = precioNumero;
      }
    }

    servicio.duracionEstimada = 60;
    servicio.activo = true;

    return servicio;
  }

  private rowToCliente(row: Row, headers: Map<string, number>): Partial<ClienteValidado> | null {
    const cliente: Partial<ClienteValidado> = {};

    const nombreCol = headers.get('nombre');
    if (nombreCol !== undefined) {
      const nombreValue = this.extractCellValue(row.getCell(nombreCol));
      if (nombreValue !== null && typeof nombreValue === 'string' && nombreValue.trim()) {
        cliente.nombre = nombreValue.trim();
      }
    }

    const rutCol = headers.get('rut');
    if (rutCol !== undefined) {
      const rutValue = this.extractCellValue(row.getCell(rutCol));
      if (rutValue !== null && typeof rutValue === 'string' && rutValue.trim()) {
        cliente.rut = rutValue.trim();
      }
    }

    if (!cliente.nombre || !cliente.rut) {
      return null;
    }

    const telefonoCol = headers.get('telefono');
    if (telefonoCol !== undefined) {
      const telefonoValue = this.extractCellValue(row.getCell(telefonoCol));
      if (telefonoValue !== null && typeof telefonoValue === 'string') {
        cliente.telefono = telefonoValue.trim();
      }
    }

    const emailCol = headers.get('email');
    if (emailCol !== undefined) {
      const emailValue = this.extractCellValue(row.getCell(emailCol));
      if (emailValue !== null && typeof emailValue === 'string') {
        cliente.email = emailValue.trim();
      }
    }

    const direccionCol = headers.get('direccion');
    if (direccionCol !== undefined) {
      const direccionValue = this.extractCellValue(row.getCell(direccionCol));
      if (direccionValue !== null && typeof direccionValue === 'string') {
        cliente.direccion = direccionValue.trim();
      }
    }

    cliente.activo = true;

    return cliente;
  }

  async processServiciosFile(filePath: string): Promise<ImportResultServicios> {
    const startTime = Date.now();
    this.logger.info(`[ExcelImportService] Iniciando importación de servicios: ${filePath}`);

    const result: ImportResultServicios = {
      totalProcesados: 0,
      totalErrores: 0,
      datosValidos: [],
      erroresDetallados: [],
    };

    try {
      const worksheet = await this.prepareWorksheet(filePath);

      const headerRow = worksheet.getRow(1);
      if (!headerRow || !headerRow.hasValues) {
        throw new Error('La primera fila está vacía o no contiene headers válidos');
      }

      const headers = this.detectHeadersServicios(headerRow);
      if (!headers.has('nombre')) {
        throw new Error('No se encontró la columna de nombre para servicios.');
      }

      for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
        const row = worksheet.getRow(rowNumber);
        if (!row || !row.hasValues) {
          continue;
        }

        result.totalProcesados++;
        let servicioPartial: Partial<ServicioValidado> | null = null;

        try {
          servicioPartial = this.rowToServicio(row, headers);
          if (!servicioPartial) {
            result.totalErrores++;
            result.erroresDetallados.push({ fila: rowNumber, error: 'Fila vacía o sin nombre válido' });
            continue;
          }

          const servicioValidado = ServicioImportSchema.parse(servicioPartial);
          result.datosValidos.push(servicioValidado);
        } catch (error) {
          result.totalErrores++;
          const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
          result.erroresDetallados.push({ fila: rowNumber, error: errorMessage, datos: servicioPartial || undefined });
          this.logger.warn(`[ExcelImportService] Error en fila ${rowNumber}: ${errorMessage}`);
        }
      }

      const elapsedTime = Date.now() - startTime;
      this.logger.info(
        `[ExcelImportService] Importación de servicios completada en ${elapsedTime}ms. ` +
        `Procesados: ${result.totalProcesados}, Válidos: ${result.datosValidos.length}, Errores: ${result.totalErrores}`
      );
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`[ExcelImportService] Error crítico importando servicios: ${errorMessage}`);
      throw error;
    }
  }

  async processClientesFile(filePath: string): Promise<ImportResultClientes> {
    const startTime = Date.now();
    this.logger.info(`[ExcelImportService] Iniciando importación de clientes: ${filePath}`);

    const result: ImportResultClientes = {
      totalProcesados: 0,
      totalErrores: 0,
      datosValidos: [],
      erroresDetallados: [],
    };

    try {
      const worksheet = await this.prepareWorksheet(filePath);

      const headerRow = worksheet.getRow(1);
      if (!headerRow || !headerRow.hasValues) {
        throw new Error('La primera fila está vacía o no contiene headers válidos');
      }

      const headers = this.detectHeadersClientes(headerRow);
      if (!headers.has('nombre') || !headers.has('rut')) {
        throw new Error('No se encontraron las columnas de nombre y RUT para clientes.');
      }

      for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
        const row = worksheet.getRow(rowNumber);
        if (!row || !row.hasValues) {
          continue;
        }

        result.totalProcesados++;
        let clientePartial: Partial<ClienteValidado> | null = null;

        try {
          clientePartial = this.rowToCliente(row, headers);
          if (!clientePartial) {
            result.totalErrores++;
            result.erroresDetallados.push({ fila: rowNumber, error: 'Fila vacía o sin nombre/RUT válido' });
            continue;
          }

          const clienteValidado = ClienteImportSchema.parse(clientePartial);
          result.datosValidos.push(clienteValidado);
        } catch (error) {
          result.totalErrores++;
          const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
          result.erroresDetallados.push({ fila: rowNumber, error: errorMessage, datos: clientePartial || undefined });
          this.logger.warn(`[ExcelImportService] Error en fila ${rowNumber}: ${errorMessage}`);
        }
      }

      const elapsedTime = Date.now() - startTime;
      this.logger.info(
        `[ExcelImportService] Importación de clientes completada en ${elapsedTime}ms. ` +
        `Procesados: ${result.totalProcesados}, Válidos: ${result.datosValidos.length}, Errores: ${result.totalErrores}`
      );
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`[ExcelImportService] Error crítico importando clientes: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Extrae y sanitiza el valor de una celda
   */
  private extractCellValue(cell: Cell | null | undefined): string | number | null {
    if (!cell || cell.value === null || cell.value === undefined) {
      return null;
    }

    // Si es un objeto con texto (rich text)
    if (typeof cell.value === 'object' && 'text' in cell.value) {
      return this.sanitizeString((cell.value as { text: string }).text);
    }

    // Si es un número
    if (typeof cell.value === 'number') {
      return isFinite(cell.value) ? cell.value : null;
    }

    // Si es una fecha
    if (cell.value instanceof Date) {
      return cell.value.getTime();
    }

    // String
    return this.sanitizeString(String(cell.value));
  }

  /**
   * Detecta y mapea headers de la primera fila
   */
  private detectHeaders(row: Row): Map<string, number> {
    const headers = new Map<string, number>();
    
    if (!row || !row.hasValues) {
      return headers;
    }

    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const headerValue = this.extractCellValue(cell);
      if (headerValue === null || typeof headerValue !== 'string') {
        return;
      }

      const headerLower = headerValue.toLowerCase().trim();
      
      // Mapeo de headers conocidos
      if (headerLower === 'sku' || headerLower === 'codigo' || headerLower === 'código' || headerLower === 'cod man') {
        if (!headers.has('codigo')) headers.set('codigo', colNumber);
      } else if (headerLower === 'nombre' || headerLower === 'name') {
        if (!headers.has('nombre')) headers.set('nombre', colNumber);
      } else if (headerLower === 'descripcion' || headerLower === 'descripción' || headerLower === 'description') {
        if (!headers.has('descripcion')) headers.set('descripcion', colNumber);
      } else if (headerLower === 'categoria' || headerLower === 'categoría' || headerLower === 'category') {
        if (!headers.has('categoria')) headers.set('categoria', colNumber);
      } else if (headerLower === 'precio uni' || headerLower === 'precio unitario' || headerLower === 'precio venta' || headerLower === 'precio') {
        if (!headers.has('precio') && !headers.has('precioCosto')) {
          headers.set('precio', colNumber);
        }
      } else if (headerLower === 'precio costo' || headerLower === 'precio de costo' || headerLower === 'costo') {
        if (!headers.has('precioCosto')) {
          headers.set('precioCosto', colNumber);
        }
      } else if (headerLower.includes('stock') && !headerLower.includes('minimo') && !headerLower.includes('mínimo')) {
        if (!headers.has('stock')) headers.set('stock', colNumber);
      } else if (headerLower.includes('stock') && (headerLower.includes('minimo') || headerLower.includes('mínimo'))) {
        if (!headers.has('stockMinimo')) headers.set('stockMinimo', colNumber);
      } else if (headerLower === 'marca' || headerLower === 'brand') {
        if (!headers.has('marca')) headers.set('marca', colNumber);
      } else if (headerLower === 'ubicacion' || headerLower === 'ubicación' || headerLower === 'location') {
        if (!headers.has('ubicacion')) headers.set('ubicacion', colNumber);
      }
    });

    return headers;
  }

  /**
   * Convierte una fila de Excel a objeto Repuesto
   */
  private rowToRepuesto(row: Row, headers: Map<string, number>, rowNumber: number): Partial<RepuestoValidado> | null {
    const repuesto: Partial<RepuestoValidado> = {};

    // Extraer código
    const codigoCol = headers.get('codigo');
    if (codigoCol !== undefined) {
      const codigoValue = this.extractCellValue(row.getCell(codigoCol));
      if (codigoValue !== null && typeof codigoValue === 'string' && codigoValue.trim()) {
        repuesto.codigo = codigoValue.trim();
      }
    }

    // Extraer nombre
    const nombreCol = headers.get('nombre');
    if (nombreCol !== undefined) {
      const nombreValue = this.extractCellValue(row.getCell(nombreCol));
      if (nombreValue !== null && typeof nombreValue === 'string' && nombreValue.trim()) {
        repuesto.nombre = nombreValue.trim();
      }
    }

    // Si no hay código ni nombre, saltar esta fila
    if (!repuesto.codigo && !repuesto.nombre) {
      return null;
    }

    // Generar código si no existe
    if (!repuesto.codigo && repuesto.nombre) {
      repuesto.codigo = `SKU-${repuesto.nombre.substring(0, 15)}`;
    }

    // Generar nombre si no existe
    if (!repuesto.nombre && repuesto.codigo) {
      repuesto.nombre = repuesto.codigo;
    }

    // Extraer descripción
    const descripcionCol = headers.get('descripcion');
    if (descripcionCol !== undefined) {
      const descripcionValue = this.extractCellValue(row.getCell(descripcionCol));
      if (descripcionValue !== null && typeof descripcionValue === 'string') {
        repuesto.descripcion = descripcionValue.trim() || repuesto.nombre;
      } else {
        repuesto.descripcion = repuesto.nombre || '';
      }
    } else {
      repuesto.descripcion = repuesto.nombre || '';
    }

    // Extraer categoría
    const categoriaCol = headers.get('categoria');
    if (categoriaCol !== undefined) {
      const categoriaValue = this.extractCellValue(row.getCell(categoriaCol));
      if (categoriaValue !== null && typeof categoriaValue === 'string' && categoriaValue.trim()) {
        repuesto.categoria = categoriaValue.trim();
      } else {
        repuesto.categoria = 'General';
      }
    } else {
      repuesto.categoria = 'General';
    }

    // Extraer precio
    const precioCol = headers.get('precio');
    if (precioCol !== undefined) {
      const precioValue = this.extractCellValue(row.getCell(precioCol));
      if (precioValue !== null) {
        if (typeof precioValue === 'number') {
          repuesto.precio = precioValue >= 0 ? precioValue : 0;
        } else if (typeof precioValue === 'string') {
          const parsed = parseFloat(precioValue.replace(/[^0-9.,-]/g, '').replace(',', '.'));
          repuesto.precio = isFinite(parsed) && parsed >= 0 ? parsed : 0;
        }
      } else {
        repuesto.precio = 0;
      }
    } else {
      repuesto.precio = 0;
    }

    // Extraer precio de costo
    const precioCostoCol = headers.get('precioCosto');
    if (precioCostoCol !== undefined) {
      const precioCostoValue = this.extractCellValue(row.getCell(precioCostoCol));
      if (precioCostoValue !== null) {
        if (typeof precioCostoValue === 'number') {
          repuesto.precioCosto = precioCostoValue >= 0 ? precioCostoValue : 0;
        } else if (typeof precioCostoValue === 'string') {
          const parsed = parseFloat(precioCostoValue.replace(/[^0-9.,-]/g, '').replace(',', '.'));
          repuesto.precioCosto = isFinite(parsed) && parsed >= 0 ? parsed : 0;
        }
      } else {
        repuesto.precioCosto = 0;
      }
    } else {
      repuesto.precioCosto = 0;
    }

    // Extraer stock
    const stockCol = headers.get('stock');
    if (stockCol !== undefined) {
      const stockValue = this.extractCellValue(row.getCell(stockCol));
      if (stockValue !== null) {
        if (typeof stockValue === 'number') {
          repuesto.stock = Math.max(0, Math.floor(stockValue));
        } else if (typeof stockValue === 'string') {
          const parsed = parseInt(stockValue, 10);
          repuesto.stock = isFinite(parsed) && parsed >= 0 ? parsed : 0;
        }
      } else {
        repuesto.stock = 0;
      }
    } else {
      repuesto.stock = 0;
    }

    // Extraer stock mínimo
    const stockMinimoCol = headers.get('stockMinimo');
    if (stockMinimoCol !== undefined) {
      const stockMinimoValue = this.extractCellValue(row.getCell(stockMinimoCol));
      if (stockMinimoValue !== null) {
        if (typeof stockMinimoValue === 'number') {
          repuesto.stockMinimo = Math.max(0, Math.floor(stockMinimoValue));
        } else if (typeof stockMinimoValue === 'string') {
          const parsed = parseInt(stockMinimoValue, 10);
          repuesto.stockMinimo = isFinite(parsed) && parsed >= 0 ? parsed : 0;
        }
      } else {
        repuesto.stockMinimo = 0;
      }
    } else {
      repuesto.stockMinimo = 0;
    }

    // Extraer marca
    const marcaCol = headers.get('marca');
    if (marcaCol !== undefined) {
      const marcaValue = this.extractCellValue(row.getCell(marcaCol));
      if (marcaValue !== null && typeof marcaValue === 'string') {
        repuesto.marca = marcaValue.trim();
      } else {
        repuesto.marca = '';
      }
    } else {
      repuesto.marca = '';
    }

    // Extraer ubicación
    const ubicacionCol = headers.get('ubicacion');
    if (ubicacionCol !== undefined) {
      const ubicacionValue = this.extractCellValue(row.getCell(ubicacionCol));
      if (ubicacionValue !== null && typeof ubicacionValue === 'string') {
        repuesto.ubicacion = ubicacionValue.trim() || 'Almacén';
      } else {
        repuesto.ubicacion = 'Almacén';
      }
    } else {
      repuesto.ubicacion = 'Almacén';
    }

    repuesto.activo = true;

    return repuesto;
  }

  /**
   * Procesa un archivo Excel de forma segura
   */
  async processExcelFile(filePath: string): Promise<ImportResult> {
    const startTime = Date.now();
    this.logger.info(`[ExcelImportService] Iniciando procesamiento de archivo: ${filePath}`);

    const result: ImportResult = {
      totalProcesados: 0,
      totalErrores: 0,
      datosValidos: [],
      erroresDetallados: [],
    };

    try {
      // 1. Validar existencia del archivo
      if (!fs.existsSync(filePath)) {
        throw new Error('El archivo no existe');
      }

      // 2. Validar tamaño del archivo
      const stats = fs.statSync(filePath);
      if (stats.size > SECURITY_LIMITS.MAX_FILE_SIZE) {
        throw new Error(
          `El archivo es demasiado grande (${(stats.size / 1024 / 1024).toFixed(2)} MB). ` +
          `Tamaño máximo permitido: ${SECURITY_LIMITS.MAX_FILE_SIZE / 1024 / 1024} MB`
        );
      }

      if (stats.size === 0) {
        throw new Error('El archivo está vacío');
      }

      // 3. Validar firma del archivo (Magic Numbers)
      this.validateFileSignature(filePath);

      // 4. Leer archivo Excel con exceljs usando streams
      const workbook = new Workbook();
      
      // Timeout para prevenir DoS
      // exceljs lee por streams automáticamente, no necesita opciones adicionales
      const readPromise = workbook.xlsx.readFile(filePath);

      // Aplicar timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Timeout: El archivo tardó más de ${SECURITY_LIMITS.READ_TIMEOUT_MS / 1000} segundos en procesarse`));
        }, SECURITY_LIMITS.READ_TIMEOUT_MS);
      });

      await Promise.race([readPromise, timeoutPromise]);

      // 5. Validar número de hojas
      if (workbook.worksheets.length > SECURITY_LIMITS.MAX_SHEETS) {
        throw new Error(
          `El archivo contiene demasiadas hojas (${workbook.worksheets.length}). ` +
          `Máximo permitido: ${SECURITY_LIMITS.MAX_SHEETS} hojas`
        );
      }

      // 6. Validar nombres de hojas
      for (const sheet of workbook.worksheets) {
        if (sheet.name.length > SECURITY_LIMITS.MAX_SHEET_NAME_LENGTH) {
          throw new Error(
            `El nombre de la hoja "${sheet.name.substring(0, 50)}..." es demasiado largo. ` +
            `Máximo permitido: ${SECURITY_LIMITS.MAX_SHEET_NAME_LENGTH} caracteres`
          );
        }
      }

      // 7. Detectar hoja a procesar
      let worksheet: Worksheet | null = null;
      
      if (workbook.worksheets.length === 0) {
        throw new Error('El archivo no contiene hojas');
      }

      // Buscar hoja "Repuestos" o "COD SAP MANG "
      const repuestosSheet = workbook.worksheets.find(s => s.name === 'Repuestos');
      const inventarioSheet = workbook.worksheets.find(s => s.name === 'COD SAP MANG ');
      
      worksheet = repuestosSheet || inventarioSheet || workbook.worksheets[0];

      if (!worksheet) {
        throw new Error('No se encontró una hoja válida para procesar');
      }

      // 8. Validar tamaño de la hoja
      const rowCount = worksheet.rowCount;
      if (rowCount > SECURITY_LIMITS.MAX_ROWS) {
        throw new Error(
          `La hoja contiene demasiadas filas (${rowCount}). ` +
          `Máximo permitido: ${SECURITY_LIMITS.MAX_ROWS} filas`
        );
      }

      const columnCount = worksheet.columnCount;
      if (columnCount > SECURITY_LIMITS.MAX_COLUMNS) {
        throw new Error(
          `La hoja contiene demasiadas columnas (${columnCount}). ` +
          `Máximo permitido: ${SECURITY_LIMITS.MAX_COLUMNS} columnas`
        );
      }

      // 9. Detectar headers (primera fila)
      const headerRow = worksheet.getRow(1);
      if (!headerRow || !headerRow.hasValues) {
        throw new Error('La primera fila está vacía o no contiene headers válidos');
      }

      const headers = this.detectHeaders(headerRow);
      
      // Validar que tenemos al menos código o nombre
      if (!headers.has('codigo') && !headers.has('nombre')) {
        throw new Error(
          'No se encontraron columnas de código o nombre. ' +
          'El archivo debe contener al menos una columna con nombre "SKU", "Código", "Nombre" o similar.'
        );
      }

      this.logger.info(`[ExcelImportService] Headers detectados: ${Array.from(headers.keys()).join(', ')}`);

      // 10. Procesar filas (empezar desde la fila 2, saltando headers)
      let processedRows = 0;
      
      for (let rowNumber = 2; rowNumber <= rowCount; rowNumber++) {
        const row = worksheet.getRow(rowNumber);
        
        if (!row || !row.hasValues) {
          continue; // Saltar filas vacías
        }

        processedRows++;
        result.totalProcesados++;

        let repuestoPartial: Partial<RepuestoValidado> | null = null;

        try {
          // Convertir fila a objeto
          repuestoPartial = this.rowToRepuesto(row, headers, rowNumber);
          
          if (!repuestoPartial) {
            result.totalErrores++;
            result.erroresDetallados.push({
              fila: rowNumber,
              error: 'Fila vacía o sin código/nombre válido',
            });
            continue;
          }

          // Validar con Zod
          const repuestoValidado = RepuestoSchema.parse(repuestoPartial);
          result.datosValidos.push(repuestoValidado);

        } catch (error) {
          result.totalErrores++;
          const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
          result.erroresDetallados.push({
            fila: rowNumber,
            error: errorMessage,
            datos: repuestoPartial || undefined,
          });
          
          this.logger.warn(`[ExcelImportService] Error en fila ${rowNumber}: ${errorMessage}`);
        }
      }

      const elapsedTime = Date.now() - startTime;
      this.logger.info(
        `[ExcelImportService] Procesamiento completado en ${elapsedTime}ms. ` +
        `Procesados: ${result.totalProcesados}, Válidos: ${result.datosValidos.length}, Errores: ${result.totalErrores}`
      );

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`[ExcelImportService] Error crítico: ${errorMessage}`, error);
      
      // Retornar error amigable
      throw new Error(
        `Error al procesar el archivo Excel: ${errorMessage}. ` +
        `Por favor, verifica que el archivo sea un Excel válido y no esté corrupto.`
      );
    }
  }
}

