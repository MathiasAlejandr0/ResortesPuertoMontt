# 📄 Implementación de Escáner de Facturas con OCR

**Fecha:** 7 de enero de 2025  
**Estado:** ✅ COMPLETADA Y COMPILADA EXITOSAMENTE

---

## 🎯 Resumen Ejecutivo

Se ha implementado exitosamente la funcionalidad de **escaneo de facturas con OCR** para ingresar stock automáticamente desde imágenes de facturas físicas. El sistema procesa imágenes que pueden venir rotadas, con timbres de recepción encima, o con sombras.

---

## 📦 Dependencias Instaladas

```bash
✅ sharp@^0.33.5          # Procesamiento avanzado de imágenes
✅ tesseract.js@^5.1.0    # Motor OCR
✅ string-similarity@^4.0.4 # Coincidencia difusa (opcional, no usado actualmente)
```

---

## 🔧 Archivos Creados/Modificados

### Nuevos Archivos

1. **`src/main/services/InvoiceScannerService.ts`**
   - Servicio completo de procesamiento de facturas
   - Pipeline de limpieza de imagen
   - OCR con Tesseract
   - Parsing con Regex para facturas chilenas

2. **`src/renderer/components/InvoiceReviewModal.tsx`**
   - Modal de revisión de datos extraídos
   - Visualización de imagen original y procesada
   - Edición inline de items
   - Resaltado de items con baja confianza

### Archivos Modificados

1. **`src/main/main.ts`**
   - Agregado IPC handler `scan-invoice`
   - Integración con `InvoiceScannerService`

2. **`src/main/preload.ts`**
   - Agregado `scanInvoice()` a la API expuesta

3. **`src/renderer/pages/Inventario.tsx`**
   - Integración con modal de revisión
   - Función `handleProcessOCR` actualizada
   - Función `handleConfirmInvoiceItems` para guardar repuestos

4. **`package.json`**
   - Dependencias agregadas

---

## 🔄 Pipeline de Procesamiento

### Paso A: Normalización de Orientación (Auto-Rotate)

```typescript
// Lee metadatos EXIF y rota automáticamente
const normalizedImage = await sharp(imagePath)
  .rotate() // Auto-rotate basado en EXIF
  .toBuffer();
```

**Características:**
- ✅ Lee metadatos EXIF automáticamente
- ✅ Rota imagen a posición vertical (portrait)
- ✅ Fallback: Si no hay EXIF, detecta orientación por dimensiones

### Paso B: Binarización (Eliminación de Timbres)

```typescript
// Convierte a escala de grises y aplica umbral alto
const binarizedImage = await sharp(imageBuffer)
  .grayscale()        // Escala de grises
  .threshold(180)     // Umbral alto: texto negro puro, timbres → blanco
  .normalize()        // Normalizar contraste
  .sharpen()          // Enfocar texto
  .toBuffer();
```

**Características:**
- ✅ Convierte a escala de grises
- ✅ Aplica umbral alto (180) para eliminar timbres azules/claros
- ✅ Normaliza contraste
- ✅ Enfoca texto para mejor reconocimiento

### Paso C: OCR con Tesseract

```typescript
// Configuración optimizada para facturas
await worker.setParameters({
  tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,- \n',
  tessedit_pageseg_mode: 6, // PSM 6: Assume a single uniform block of text
});
```

**Características:**
- ✅ Whitelist de caracteres esperados
- ✅ PSM 6: Modo optimizado para bloques uniformes de texto
- ✅ Idioma: Español (spa)

### Paso D: Parsing con Regex

**Estrategia de Anclaje:**
- Busca línea que contenga "DESCRIPCION" o "CODIGO"
- Identifica inicio de tabla

**Patrón Regex:**
```typescript
// Patrón completo: código + descripción + UM + cantidad + precio
/^(\d{5,})\s+(.+?)\s+([A-Z]{1,3})\s+(\d+[\.,]?\d*)\s+(\d+[\.,]?\d*)$/i

// Patrón sin UM: código + descripción + cantidad + precio
/^(\d{5,})\s+(.+?)\s+(\d+[\.,]?\d*)\s+(\d+[\.,]?\d*)$/i

// Patrón flexible: código opcional
/^(\d{3,})?\s*(.+?)\s+(\d+[\.,]?\d*)\s+(\d+[\.,]?\d*)$/i
```

**Manejo de Formato Chileno:**
- ✅ `1.100` = 1100 (mil cien), no 1.1
- ✅ Elimina puntos (separadores de miles)
- ✅ Reemplaza coma por punto para decimales

---

## 🎨 Interfaz de Usuario

### InvoiceReviewModal

**Panel Izquierdo: Imagen**
- ✅ Visualización de imagen original o procesada
- ✅ Zoom in/out (0.5x - 3x)
- ✅ Rotación manual (90°)
- ✅ Toggle entre original y procesada

**Panel Derecho: Tabla de Items**
- ✅ Lista de items extraídos
- ✅ Resaltado amarillo para items con baja confianza
- ✅ Edición inline (click para editar)
- ✅ Indicador de confianza por item
- ✅ Botón para eliminar items
- ✅ Cálculo de subtotal automático

**Características:**
- ✅ Validación de datos antes de confirmar
- ✅ Feedback visual de confianza
- ✅ Edición completa de campos

---

## 📊 Estructura de Datos

### InvoiceItem

```typescript
interface InvoiceItem {
  codigo: string;              // Código del producto
  descripcion: string;          // Descripción/nombre
  unidadMedida: string;         // U.M (UN, KG, etc.)
  cantidad: number;             // Cantidad
  precio: number;               // Precio unitario
  confianza: number;            // 0-100
  necesitaRevision: boolean;    // true si confianza < 80
  lineaOriginal?: string;       // Línea original del OCR
}
```

### InvoiceScanResult

```typescript
interface InvoiceScanResult {
  items: InvoiceItem[];
  textoCompleto: string;
  imagenProcesada?: Buffer;     // Para visualización
  totalProcesados: number;
  totalConBajaConfianza: number;
  errores: string[];
}
```

---

## 🔌 API IPC

### Handler: `scan-invoice`

**Request:** Ninguno (abre diálogo de selección de archivo)

**Response:**
```typescript
{
  success: boolean;
  items: InvoiceItem[];
  textoCompleto: string;
  imagenOriginal: string;      // Base64
  imagenProcesada: string;      // Base64
  totalProcesados: number;
  totalConBajaConfianza: number;
  errores: string[];
}
```

**Uso en Renderer:**
```typescript
const result = await window.electronAPI.scanInvoice();
```

---

## 🎯 Flujo Completo

```
1. Usuario hace clic en "Escanear Factura"
   ↓
2. Se abre OCRModal (selección de archivo)
   ↓
3. Usuario selecciona imagen
   ↓
4. Se llama a scanInvoice() (IPC)
   ↓
5. Main process:
   - Abre diálogo de selección
   - Procesa imagen (normalización, binarización)
   - Realiza OCR
   - Parsea texto con Regex
   - Retorna resultado
   ↓
6. Se abre InvoiceReviewModal
   - Muestra imagen original y procesada
   - Muestra tabla de items extraídos
   - Permite edición
   ↓
7. Usuario revisa y confirma
   ↓
8. Se guardan repuestos en base de datos
   ↓
9. Se refresca lista de inventario
```

---

## ✅ Características Implementadas

### Procesamiento de Imagen
- ✅ Auto-rotación basada en EXIF
- ✅ Binarización con thresholding (elimina timbres)
- ✅ Normalización de contraste
- ✅ Enfoque de texto

### OCR
- ✅ Whitelist de caracteres
- ✅ PSM optimizado para tablas
- ✅ Idioma español
- ✅ Manejo de errores robusto

### Parsing
- ✅ Detección de encabezado de tabla
- ✅ Regex adaptado a formato chileno
- ✅ Manejo de formato de miles (1.100 = 1100)
- ✅ Validación de items extraídos
- ✅ Cálculo de confianza

### UI
- ✅ Visualización de imagen con zoom
- ✅ Toggle entre original y procesada
- ✅ Edición inline de items
- ✅ Resaltado de items con baja confianza
- ✅ Indicadores de confianza
- ✅ Validación antes de guardar

---

## 🚀 Próximos Pasos

1. **Probar con facturas reales:**
   - Verificar que el OCR funcione correctamente
   - Ajustar umbrales si es necesario
   - Mejorar regex si hay patrones no detectados

2. **Optimizaciones posibles:**
   - Ajustar threshold según tipo de factura
   - Mejorar detección de orientación
   - Agregar más patrones de regex

3. **Mejoras futuras:**
   - Coincidencia difusa con productos existentes
   - Sugerencias automáticas de categoría
   - Detección automática de proveedor

---

## 📚 Referencias

- **Sharp Documentation:** https://sharp.pixelplumbing.com/
- **Tesseract.js Documentation:** https://tesseract.projectnaptha.com/
- **Regex para Facturas Chilenas:** Implementado según formato común

---

**✅ Implementación completada exitosamente!**

**Última actualización:** 2025-01-07
