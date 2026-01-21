/**
 * InvoiceParserService - Motor Híbrido de Procesamiento de Facturas
 * 
 * Estrategias:
 * - PDF Digital: Extracción directa de texto (pdf-parse) - Alta precisión
 * - Imágenes: OCR con pre-procesamiento (tesseract.js + sharp) - Caso borde
 * 
 * @author Mathias Jara
 * @version 1.1.2
 */

import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import { createWorker, Worker } from 'tesseract.js';
import pdfParse from 'pdf-parse';
import { persistentLogger } from '../logger-persistente';

export interface ScannedItem {
  rawCode: string;      // Ej: "INTERNO-STVW7180" o "5300010"
  description: string;  // Ej: "BUJE DE RESORTES TRASERO..."
  quantity: number;     // Ej: 4
  unitPrice: number;    // Ej: 8765 (Sin puntos, formato chileno)
  confidence: number;   // 1.0 para PDF, 0.x para OCR
  source: 'pdf' | 'ocr'; // Origen del dato
  lineaOriginal?: string; // Línea original para debugging
}

export interface InvoiceParseResult {
  items: ScannedItem[];
  textoCompleto: string;
  imagenProcesada?: Buffer; // Solo para OCR
  totalProcesados: number;
  totalConBajaConfianza: number;
  errores: string[];
  sourceType: 'pdf' | 'image';
}

export class InvoiceParserService {
  private ocrWorker: Worker | null = null;
  private readonly CONFIDENCE_THRESHOLD = 60;
  private readonly LOW_CONFIDENCE_THRESHOLD = 80;

  /**
   * Detecta el tipo de archivo y procesa según corresponda
   */
  async parseInvoice(filePath: string): Promise<InvoiceParseResult> {
    const errores: string[] = [];
    
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`Archivo no encontrado: ${filePath}`);
      }

      // Detectar tipo de archivo
      const extension = path.extname(filePath).toLowerCase();
      const isPdf = extension === '.pdf';
      
      persistentLogger.info('Iniciando parseo de factura', { 
        filePath, 
        tipo: isPdf ? 'PDF' : 'Imagen' 
      });

      if (isPdf) {
        // Estrategia A: PDF Digital
        return await this.parseDigitalPdf(filePath);
      } else {
        // Estrategia B: Imagen con OCR
        return await this.parseImage(filePath);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      errores.push(errorMessage);
      persistentLogger.error('Error parseando factura:', error);
      
      return {
        items: [],
        textoCompleto: '',
        totalProcesados: 0,
        totalConBajaConfianza: 0,
        errores,
        sourceType: 'image',
      };
    }
  }

  /**
   * Estrategia A: Parser de PDF Digital (Alta Precisión)
   * Extrae texto directamente sin OCR
   */
  private async parseDigitalPdf(filePath: string): Promise<InvoiceParseResult> {
    try {
      const pdfBuffer = fs.readFileSync(filePath);
      // pdf-parse es una función directa en CommonJS
      const pdfData = await (pdfParse as any)(pdfBuffer);
      const text = pdfData.text;

      persistentLogger.info('PDF parseado exitosamente', { 
        paginas: pdfData.numpages,
        textoLength: text.length 
      });

      // Parsear texto del PDF
      const items = this.parsePdfText(text);

      const totalProcesados = items.length;
      const totalConBajaConfianza = 0; // PDF siempre tiene confianza 1.0

      return {
        items,
        textoCompleto: text,
        totalProcesados,
        totalConBajaConfianza,
        errores: [],
        sourceType: 'pdf',
      };

    } catch (error) {
      persistentLogger.error('Error parseando PDF:', error);
      throw new Error(`Error parseando PDF: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Parsea el texto extraído del PDF
   * Busca tabla de items detectando cabeceras: Codigo, Descripcion, Cantidad, Precio
   */
  private parsePdfText(text: string): ScannedItem[] {
    const items: ScannedItem[] = [];
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    // Buscar línea de encabezado (anclaje)
    let headerIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toUpperCase();
      // Buscar cabeceras comunes en facturas chilenas
      if (line.includes('CODIGO') || line.includes('CÓDIGO') || 
          line.includes('DESCRIPCION') || line.includes('DESCRIPCIÓN') ||
          line.includes('CANTIDAD') || line.includes('PRECIO')) {
        headerIndex = i;
        break;
      }
    }

    if (headerIndex === -1) {
      persistentLogger.warn('No se encontró encabezado de tabla en el PDF');
      // Intentar parsear sin anclaje
      return this.parsePdfWithoutHeader(lines);
    }

    // Parsear líneas después del encabezado
    const dataLines = lines.slice(headerIndex + 1);
    
    for (const line of dataLines) {
      // Ignorar líneas de resumen (Neto, IVA, Total)
      const lineUpper = line.toUpperCase();
      if (lineUpper.includes('NETO') || 
          lineUpper.includes('IVA') || 
          lineUpper.includes('TOTAL') ||
          lineUpper.includes('SUBTOTAL') ||
          lineUpper.startsWith('---') ||
          lineUpper.startsWith('===')) {
        continue;
      }

      const item = this.parsePdfLine(line);
      if (item) {
        items.push(item);
      }
    }

    return items;
  }

  /**
   * Parsea una línea individual del PDF
   * Formato esperado: Código (Alfanumérico) + Descripción + Cantidad + Precio
   * Ejemplo: "INTERNO-STVW7180 BUJE DE RESORTES TRASERO... 4 8.765"
   */
  private parsePdfLine(line: string): ScannedItem | null {
    // Regex para PDF: código alfanumérico (puede tener guiones) + descripción + cantidad + precio
    // Patrón 1: Código alfanumérico con guiones
    const pattern1 = /^([A-Z0-9\-]+)\s+(.+?)\s+(\d+)\s+(\d+[\.,]?\d*)$/i;
    let match = line.match(pattern1);

    if (!match) {
      // Patrón 2: Código numérico simple
      const pattern2 = /^(\d{5,})\s+(.+?)\s+(\d+)\s+(\d+[\.,]?\d*)$/i;
      match = line.match(pattern2);
    }

    if (!match) {
      // Patrón 3: Sin código (solo descripción + cantidad + precio)
      const pattern3 = /^(.+?)\s+(\d+)\s+(\d+[\.,]?\d*)$/i;
      match = line.match(pattern3);
      
      if (match) {
        // Insertar código genérico
        match = [match[0], 'SIN-CODIGO', match[1], match[2], match[3]];
      }
    }

    if (!match) {
      return null;
    }

    const rawCode = match[1] || 'SIN-CODIGO';
    const description = match[2].trim();
    const quantity = parseInt(match[3], 10);
    const priceStr = match[4];

    // Validar datos
    if (description.length < 3 || quantity <= 0) {
      return null;
    }

    // Parsear precio en formato chileno (8.765 = 8765)
    const unitPrice = this.parseChileanNumber(priceStr);

    if (unitPrice <= 0) {
      return null;
    }

    return {
      rawCode,
      description,
      quantity,
      unitPrice,
      confidence: 1.0, // PDF siempre tiene confianza máxima
      source: 'pdf',
      lineaOriginal: line,
    };
  }

  /**
   * Parsear sin encabezado (fallback)
   */
  private parsePdfWithoutHeader(lines: string[]): ScannedItem[] {
    const items: ScannedItem[] = [];
    
    for (const line of lines) {
      // Ignorar líneas de resumen
      const lineUpper = line.toUpperCase();
      if (lineUpper.includes('NETO') || 
          lineUpper.includes('IVA') || 
          lineUpper.includes('TOTAL') ||
          lineUpper.includes('SUBTOTAL')) {
        continue;
      }

      const item = this.parsePdfLine(line);
      if (item) {
        items.push(item);
      }
    }

    return items;
  }

  /**
   * Estrategia B: Parser de Imágenes (OCR con Limpieza)
   * Para fotos de celular con rotación y timbres
   */
  private async parseImage(filePath: string): Promise<InvoiceParseResult> {
    try {
      // Paso 1: Normalización de orientación
      persistentLogger.info('Paso 1: Normalizando orientación de imagen...');
      const normalizedImage = await this.normalizeOrientation(filePath);

      // Paso 2: Binarización (eliminación de timbres)
      persistentLogger.info('Paso 2: Binarizando imagen (eliminando timbres)...');
      const binarizedImage = await this.binarizeImage(normalizedImage);

      // Paso 3: OCR
      persistentLogger.info('Paso 3: Realizando OCR...');
      const { text, confidence } = await this.performOCR(binarizedImage);

      if (!text || text.trim().length === 0) {
        throw new Error('No se pudo extraer texto de la imagen');
      }

      persistentLogger.info('OCR completado', { 
        textLength: text.length, 
        confidence: confidence.toFixed(2) 
      });

      // Paso 4: Parsing
      persistentLogger.info('Paso 4: Parseando texto...');
      let items = this.parseImageText(text);
      
      // Validar items
      items = this.validateItems(items);

      const totalProcesados = items.length;
      const totalConBajaConfianza = items.filter(i => i.confidence < this.LOW_CONFIDENCE_THRESHOLD).length;

      return {
        items,
        textoCompleto: text,
        imagenProcesada: binarizedImage,
        totalProcesados,
        totalConBajaConfianza,
        errores: [],
        sourceType: 'image',
      };

    } catch (error) {
      persistentLogger.error('Error parseando imagen:', error);
      throw new Error(`Error parseando imagen: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Normaliza la orientación de la imagen usando EXIF
   */
  private async normalizeOrientation(imagePath: string): Promise<Buffer> {
    try {
      const image = sharp(imagePath);
      const metadata = await image.metadata();

      // Sharp automáticamente lee y aplica la rotación EXIF
      let processed = image.rotate();

      // Verificar dimensiones para detectar si está en landscape
      if (metadata.width && metadata.height) {
        const isLandscape = metadata.width > metadata.height;
        
        // Si no hay EXIF y está en landscape, podría estar rotada
        if (isLandscape && !metadata.exif) {
          processed = image.rotate(90);
        }
      }

      return await processed.toBuffer();
    } catch (error) {
      persistentLogger.error('Error normalizando orientación:', error);
      return fs.readFileSync(imagePath);
    }
  }

  /**
   * Binariza la imagen para eliminar timbres
   */
  private async binarizeImage(imageBuffer: Buffer): Promise<Buffer> {
    try {
      return await sharp(imageBuffer)
        .grayscale()
        .threshold(180) // Umbral alto: texto negro puro, timbres → blanco
        .normalize()
        .sharpen()
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
      const worker = await this.initializeOCRWorker();
      
      const tempPath = path.join(require('os').tmpdir(), `invoice_${Date.now()}.png`);
      await fs.promises.writeFile(tempPath, imageBuffer);

      const { data } = await worker.recognize(tempPath);
      
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
   * Inicializa el worker de Tesseract
   */
  private async initializeOCRWorker(): Promise<Worker> {
    if (!this.ocrWorker) {
      this.ocrWorker = await createWorker('spa');
      await this.ocrWorker.setParameters({
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,- \n',
        tessedit_pageseg_mode: '6' as any,
      });
    }
    return this.ocrWorker;
  }

  /**
   * Parsea el texto extraído por OCR de imágenes
   * Adaptado para códigos numéricos y formato chileno
   */
  private parseImageText(text: string): ScannedItem[] {
    const items: ScannedItem[] = [];
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Buscar línea de encabezado
    let headerIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toUpperCase();
      if (line.includes('DESCRIPCION') || line.includes('CODIGO') || line.includes('CÓDIGO')) {
        headerIndex = i;
        break;
      }
    }

    if (headerIndex === -1) {
      return this.parseImageWithoutHeader(lines);
    }

    const dataLines = lines.slice(headerIndex + 1);
    
    for (const line of dataLines) {
      const item = this.parseImageLine(line);
      if (item) {
        items.push(item);
      }
    }

    return items;
  }

  /**
   * Parsea una línea individual de imagen OCR
   * Formato: código numérico + descripción + cantidad + precio
   * Ejemplo: "5300010 BUJE DE RESORTES... 4 1.100"
   */
  private parseImageLine(line: string): ScannedItem | null {
    // Regex para imagen: código numérico (5+ dígitos) + descripción + cantidad + precio
    // Patrón completo con unidad de medida
    const fullPattern = /^(\d{5,})\s+(.+?)\s+([A-Z]{1,3})\s+(\d+[\.,]?\d*)\s+(\d+[\.,]?\d*)$/i;
    let match = line.match(fullPattern);

    if (!match) {
      // Patrón sin unidad de medida
      const patternWithoutUM = /^(\d{5,})\s+(.+?)\s+(\d+[\.,]?\d*)\s+(\d+[\.,]?\d*)$/i;
      match = line.match(patternWithoutUM);
      
      if (match) {
        match = [match[0], match[1], match[2], 'UN', match[3], match[4]];
      }
    }

    if (!match) {
      // Patrón flexible: código opcional
      const flexiblePattern = /^(\d{3,})?\s*(.+?)\s+(\d+[\.,]?\d*)\s+(\d+[\.,]?\d*)$/i;
      match = line.match(flexiblePattern);
      
      if (match) {
        const codigo = match[1] || 'SIN-CODIGO';
        const descripcion = match[2].trim();
        const cantidad = this.parseChileanNumber(match[3]);
        const precio = this.parseChileanNumber(match[4]);
        
        if (descripcion.length > 0 && cantidad > 0 && precio > 0) {
          return {
            rawCode: codigo,
            description: descripcion,
            quantity: cantidad,
            unitPrice: precio,
            confidence: 0.70, // Convertir a 0-1
            source: 'ocr',
            lineaOriginal: line,
          };
        }
      }
      
      return null;
    }

    const rawCode = match[1] || 'SIN-CODIGO';
    const description = match[2].trim();
    const quantity = this.parseChileanNumber(match[3]);
    const unitPrice = this.parseChileanNumber(match[4]);

    if (description.length < 3 || quantity <= 0 || unitPrice <= 0) {
      return null;
    }

    // Calcular confianza basada en la calidad del match
    let confianza = 85;
    if (rawCode === 'SIN-CODIGO') confianza -= 10;
    if (description.length < 5) confianza -= 5;

    return {
      rawCode,
      description,
      quantity,
      unitPrice,
      confidence: confianza / 100, // Convertir a 0-1
      source: 'ocr',
      lineaOriginal: line,
    };
  }

  /**
   * Parsear sin encabezado (fallback para imágenes)
   */
  private parseImageWithoutHeader(lines: string[]): ScannedItem[] {
    const items: ScannedItem[] = [];
    
    for (const line of lines) {
      const item = this.parseImageLine(line);
      if (item) {
        items.push(item);
      }
    }

    return items;
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
   * Validar y limpiar items extraídos
   */
  private validateItems(items: ScannedItem[]): ScannedItem[] {
    return items.filter(item => {
      // Filtrar items con confianza muy baja
      if (item.confidence < this.CONFIDENCE_THRESHOLD / 100) {
        return false;
      }

      // Validar que tenga datos mínimos
      if (!item.description || item.description.length < 3) {
        return false;
      }

      if (item.quantity <= 0 || item.unitPrice <= 0) {
        return false;
      }

      return true;
    });
  }

  /**
   * Limpiar recursos
   */
  async cleanup(): Promise<void> {
    if (this.ocrWorker) {
      await this.ocrWorker.terminate();
      this.ocrWorker = null;
    }
  }
}

// Singleton instance
let invoiceParserService: InvoiceParserService | null = null;

export function getInvoiceParserService(): InvoiceParserService {
  if (!invoiceParserService) {
    invoiceParserService = new InvoiceParserService();
  }
  return invoiceParserService;
}
