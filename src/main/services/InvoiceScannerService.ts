/**
 * InvoiceScannerService - Servicio avanzado de OCR para facturas
 * 
 * Pipeline de procesamiento de imagen:
 * 1. Normalización de orientación (Auto-Rotate con EXIF)
 * 2. Binarización (Thresholding para eliminar timbres)
 * 3. OCR con Tesseract (Whitelist y PSM optimizado)
 * 4. Parsing con Regex para facturas chilenas
 * 
 * @author Mathias Jara
 * @version 1.1.2
 */

import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import { createWorker, Worker } from 'tesseract.js';
import { persistentLogger } from '../logger-persistente';

export interface InvoiceItem {
  codigo: string;
  descripcion: string;
  unidadMedida: string;
  cantidad: number;
  precio: number;
  confianza: number; // 0-100
  necesitaRevision: boolean;
  lineaOriginal?: string;
}

export interface InvoiceScanResult {
  items: InvoiceItem[];
  textoCompleto: string;
  imagenProcesada?: Buffer; // Para visualización
  totalProcesados: number;
  totalConBajaConfianza: number;
  errores: string[];
}

export class InvoiceScannerService {
  private worker: Worker | null = null;
  private readonly CONFIDENCE_THRESHOLD = 60; // Umbral de confianza mínimo
  private readonly LOW_CONFIDENCE_THRESHOLD = 80; // Umbral para marcar como "necesita revisión"

  /**
   * Inicializa el worker de Tesseract
   */
  private async initializeWorker(): Promise<Worker> {
    if (!this.worker) {
      this.worker = await createWorker('spa'); // Español
      await this.worker.setParameters({
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,- \n',
        tessedit_pageseg_mode: '6' as any, // PSM 6: Assume a single uniform block of text
      });
    }
    return this.worker;
  }

  /**
   * Paso A: Normalización de Orientación
   * Lee metadatos EXIF y rota la imagen automáticamente
   */
  private async normalizeOrientation(imagePath: string): Promise<Buffer> {
    try {
      const image = sharp(imagePath);
      const metadata = await image.metadata();

      // Sharp automáticamente lee y aplica la rotación EXIF
      // Si no hay EXIF, la imagen se mantiene como está
      let processed = image.rotate(); // Auto-rotate basado en EXIF

      // Verificar dimensiones para detectar si está en landscape
      if (metadata.width && metadata.height) {
        const isLandscape = metadata.width > metadata.height;
        
        // Si no hay EXIF y está en landscape, podría estar rotada
        if (isLandscape && !metadata.exif) {
          // Intentar rotar 90° si es necesario
          processed = image.rotate(90);
        }
      }

      return await processed.toBuffer();
    } catch (error) {
      persistentLogger.error('Error normalizando orientación:', error);
      // Fallback: devolver imagen original
      return fs.readFileSync(imagePath);
    }
  }

  /**
   * Paso B: Binarización (Thresholding)
   * Convierte a escala de grises y aplica umbral alto para eliminar timbres
   */
  private async binarizeImage(imageBuffer: Buffer): Promise<Buffer> {
    try {
      return await sharp(imageBuffer)
        .grayscale() // Convertir a escala de grises
        .threshold(180) // Umbral alto: texto negro puro, timbres/fondo → blanco
        .normalize() // Normalizar contraste
        .sharpen() // Enfocar texto
        .toBuffer();
    } catch (error) {
      persistentLogger.error('Error binarizando imagen:', error);
      throw new Error(`Error en binarización: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Realiza OCR en la imagen procesada
   */
  private async performOCR(imageBuffer: Buffer): Promise<{ text: string; confidence: number }> {
    try {
      const worker = await this.initializeWorker();
      
      // Guardar imagen temporal para Tesseract
      const tempPath = path.join(require('os').tmpdir(), `invoice_${Date.now()}.png`);
      await fs.promises.writeFile(tempPath, imageBuffer);

      const { data } = await worker.recognize(tempPath);
      
      // Limpiar archivo temporal
      try {
        await fs.promises.unlink(tempPath);
      } catch {
        // Ignorar errores de limpieza
      }

      const confidence = data.confidence || 0;
      const text = data.text || '';

      return { text, confidence };
    } catch (error) {
      persistentLogger.error('Error en OCR:', error);
      throw new Error(`Error en OCR: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Paso C: Parsing de texto con Regex para facturas chilenas
   * Busca la tabla de items después de encontrar "DESCRIPCION" o "CODIGO"
   */
  private parseInvoiceText(text: string): InvoiceItem[] {
    const items: InvoiceItem[] = [];
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Buscar línea de encabezado (anclaje)
    let headerIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toUpperCase();
      if (line.includes('DESCRIPCION') || line.includes('CODIGO') || line.includes('CÓDIGO')) {
        headerIndex = i;
        break;
      }
    }

    if (headerIndex === -1) {
      persistentLogger.warn('No se encontró encabezado de tabla en la factura');
      // Intentar parsear sin anclaje
      return this.parseWithoutHeader(lines);
    }

    // Parsear líneas después del encabezado
    const dataLines = lines.slice(headerIndex + 1);
    
    for (const line of dataLines) {
      const item = this.parseLine(line);
      if (item) {
        items.push(item);
      }
    }

    return items;
  }

  /**
   * Parsear línea individual de factura
   * Patrón esperado: (Código numérico) + (Texto Descripción) + (Cantidad) + (Precio)
   * Ejemplo: "12345 AMORTIGUADOR DELANTERO 2 15000"
   */
  private parseLine(line: string): InvoiceItem | null {
    // Regex mejorado para facturas chilenas
    // Patrón: código (5+ dígitos) + descripción (texto) + cantidad + precio
    // Maneja formato chileno: 1.100 = mil cien (no uno punto uno)
    
    // Primero intentar patrón completo
    const fullPattern = /^(\d{5,})\s+(.+?)\s+([A-Z]{1,3})\s+(\d+[\.,]?\d*)\s+(\d+[\.,]?\d*)$/i;
    let match = line.match(fullPattern);

    if (!match) {
      // Patrón sin unidad de medida
      const patternWithoutUM = /^(\d{5,})\s+(.+?)\s+(\d+[\.,]?\d*)\s+(\d+[\.,]?\d*)$/i;
      match = line.match(patternWithoutUM);
      
      if (match) {
        // Insertar 'UN' como unidad de medida por defecto
        match = [match[0], match[1], match[2], 'UN', match[3], match[4]];
      }
    }

    if (!match) {
      // Patrón más flexible: código opcional
      const flexiblePattern = /^(\d{3,})?\s*(.+?)\s+(\d+[\.,]?\d*)\s+(\d+[\.,]?\d*)$/i;
      match = line.match(flexiblePattern);
      
      if (match) {
        const codigo = match[1] || 'SIN-CODIGO';
        const descripcion = match[2].trim();
        const cantidad = this.parseChileanNumber(match[3]);
        const precio = this.parseChileanNumber(match[4]);
        
        if (descripcion.length > 0 && cantidad > 0 && precio > 0) {
          return {
            codigo,
            descripcion,
            unidadMedida: 'UN',
            cantidad,
            precio,
            confianza: 70, // Confianza media para patrón flexible
            necesitaRevision: true,
            lineaOriginal: line,
          };
        }
      }
      
      return null;
    }

    const codigo = match[1] || 'SIN-CODIGO';
    const descripcion = match[2].trim();
    const unidadMedida = match[3]?.toUpperCase() || 'UN';
    const cantidad = this.parseChileanNumber(match[4]);
    const precio = this.parseChileanNumber(match[5]);

    // Validar que los datos sean razonables
    if (descripcion.length < 3 || cantidad <= 0 || precio <= 0) {
      return null;
    }

    // Calcular confianza basada en la calidad del match
    let confianza = 85;
    if (codigo === 'SIN-CODIGO') confianza -= 10;
    if (unidadMedida === 'UN') confianza -= 5;
    if (descripcion.length < 5) confianza -= 5;

    return {
      codigo,
      descripcion,
      unidadMedida,
      cantidad,
      precio,
      confianza,
      necesitaRevision: confianza < this.LOW_CONFIDENCE_THRESHOLD,
      lineaOriginal: line,
    };
  }

  /**
   * Parsear número en formato chileno (1.100 = 1100, no 1.1)
   */
  private parseChileanNumber(value: string): number {
    // Remover puntos (separadores de miles) y reemplazar coma por punto
    const cleaned = value.replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Parsear sin encabezado (fallback)
   */
  private parseWithoutHeader(lines: string[]): InvoiceItem[] {
    const items: InvoiceItem[] = [];
    
    for (const line of lines) {
      const item = this.parseLine(line);
      if (item) {
        items.push(item);
      }
    }

    return items;
  }

  /**
   * Validar y limpiar items extraídos
   */
  private validateItems(items: InvoiceItem[]): InvoiceItem[] {
    return items.filter(item => {
      // Filtrar items con confianza muy baja
      if (item.confianza < this.CONFIDENCE_THRESHOLD) {
        return false;
      }

      // Validar que tenga datos mínimos
      if (!item.descripcion || item.descripcion.length < 3) {
        return false;
      }

      if (item.cantidad <= 0 || item.precio <= 0) {
        return false;
      }

      return true;
    });
  }

  /**
   * Método principal: Escanear factura desde archivo de imagen
   */
  async scanInvoice(imagePath: string): Promise<InvoiceScanResult> {
    const errores: string[] = [];
    
    try {
      // Verificar que el archivo existe
      if (!fs.existsSync(imagePath)) {
        throw new Error(`Archivo no encontrado: ${imagePath}`);
      }

      persistentLogger.info('Iniciando escaneo de factura', { imagePath });

      // Paso A: Normalización de orientación
      persistentLogger.info('Paso A: Normalizando orientación...');
      const normalizedImage = await this.normalizeOrientation(imagePath);

      // Paso B: Binarización
      persistentLogger.info('Paso B: Binarizando imagen (eliminando timbres)...');
      const binarizedImage = await this.binarizeImage(normalizedImage);

      // Paso C: OCR
      persistentLogger.info('Paso C: Realizando OCR...');
      const { text, confidence } = await this.performOCR(binarizedImage);

      if (!text || text.trim().length === 0) {
        throw new Error('No se pudo extraer texto de la imagen');
      }

      persistentLogger.info('OCR completado', { 
        textLength: text.length, 
        confidence: confidence.toFixed(2) 
      });

      // Paso D: Parsing
      persistentLogger.info('Paso D: Parseando texto...');
      let items = this.parseInvoiceText(text);
      
      // Validar items
      items = this.validateItems(items);

      // Calcular estadísticas
      const totalProcesados = items.length;
      const totalConBajaConfianza = items.filter(i => i.necesitaRevision).length;

      persistentLogger.info('Escaneo completado', {
        totalProcesados,
        totalConBajaConfianza,
      });

      return {
        items,
        textoCompleto: text,
        imagenProcesada: binarizedImage, // Para visualización en UI
        totalProcesados,
        totalConBajaConfianza,
        errores,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      errores.push(errorMessage);
      persistentLogger.error('Error escaneando factura:', error);
      
      return {
        items: [],
        textoCompleto: '',
        totalProcesados: 0,
        totalConBajaConfianza: 0,
        errores,
      };
    }
  }

  /**
   * Limpiar recursos (cerrar worker)
   */
  async cleanup(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }
}

// Singleton instance
let invoiceScannerService: InvoiceScannerService | null = null;

export function getInvoiceScannerService(): InvoiceScannerService {
  if (!invoiceScannerService) {
    invoiceScannerService = new InvoiceScannerService();
  }
  return invoiceScannerService;
}
