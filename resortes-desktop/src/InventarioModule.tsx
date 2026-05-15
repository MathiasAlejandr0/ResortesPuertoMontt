import {
  type ChangeEvent,
  type Dispatch,
  type DragEvent,
  type FormEvent,
  type SetStateAction,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import * as XLSX from 'xlsx'
import type { Db, Producto } from './appTypes'

type Props = {
  db: Db
  setDb: Dispatch<SetStateAction<Db>>
  showToast: (msg: string, type?: 'ok' | 'err' | 'warn') => void
}

type InvTab = 'manual' | 'excel' | 'categorias'

const UNIDADES = ['Unidad', 'Litro', 'Kg', 'Par', 'Metro', 'Caja', 'Horas', 'Galón']

const CAT_BADGE_CLASSES = ['b-blue', 'b-green', 'b-orange', 'b-amber', 'b-teal', 'b-purple', 'b-gray'] as const

type CatBadgeClass = (typeof CAT_BADGE_CLASSES)[number]

function normalizeCatLabel(cat: string): string {
  return cat
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ')
}

/** Nombres habituales del taller / TallerSys: color fijo por etiqueta. */
const CAT_BADGE_BY_NAME: Record<string, CatBadgeClass> = {
  'pre-templado': 'b-purple',
  'paquetes terminados': 'b-green',
  'componentes per-buj': 'b-teal',
  'componentes per buj': 'b-teal',
  'repuestos': 'b-gray',
  'accesorios': 'b-orange',
  'herramientas': 'b-amber',
  'servicios': 'b-blue',
}

/** Orden histórico del HTML monolito (CATS_DEFAULT) → mismo color que antes si el nombre coincide. */
const LEGACY_DEFAULT_ORDER = [
  'lubricantes',
  'filtros',
  'frenos',
  'suspension',
  'electricidad',
  'neumaticos',
  'mano de obra',
  'refrigeracion',
  'transmision',
  'otros',
] as const

function catBadgeClass(cat: string): CatBadgeClass {
  const n = normalizeCatLabel(cat)
  const preset = CAT_BADGE_BY_NAME[n]
  if (preset) return preset
  const legacyIdx = (LEGACY_DEFAULT_ORDER as readonly string[]).indexOf(n)
  if (legacyIdx >= 0) return CAT_BADGE_CLASSES[legacyIdx % CAT_BADGE_CLASSES.length]
  let h = 0
  for (let i = 0; i < n.length; i++) h = (Math.imul(31, h) + n.charCodeAt(i)) | 0
  return CAT_BADGE_CLASSES[Math.abs(h) % CAT_BADGE_CLASSES.length]
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

function fmtInv(n: number) {
  return '$' + Number(n || 0).toLocaleString('es-CL')
}

type StockFiltro = 'todos' | 'bajo' | 'sin'

type ExcField = 'nombre' | 'codigo' | 'categoria' | 'unidad' | 'stock' | 'smin' | 'costo' | 'precio'

const EXC_CAMPO_LABELS: { k: ExcField; l: string }[] = [
  { k: 'nombre', l: 'Nombre *' },
  { k: 'codigo', l: 'Código' },
  { k: 'categoria', l: 'Categoría' },
  { k: 'unidad', l: 'Unidad' },
  { k: 'stock', l: 'Stock' },
  { k: 'smin', l: 'Stock mínimo' },
  { k: 'costo', l: 'Precio costo' },
  { k: 'precio', l: 'Precio venta' },
]

type ImportDraft = {
  headers: string[]
  dataRows: unknown[][]
  cols: Partial<Record<ExcField, number>>
}

type InvBulkChange = {
  id: string
  nombre: string
  despues: Partial<Pick<Producto, 'nombre' | 'codigo' | 'categoria' | 'unidad' | 'stock' | 'smin' | 'costo' | 'precio'>>
}

function todayIsoFile() {
  return new Date().toISOString().slice(0, 10)
}

function safeFileSegment(s: string) {
  return s.replace(/[/\\?%*:|"<>]/g, '_').slice(0, 80)
}

function guessExcCols(hdrs: string[]): Partial<Record<ExcField, number>> {
  const excCols: Partial<Record<ExcField, number>> = {}
  hdrs.forEach((h, i) => {
    const hl = String(h).trim().toLowerCase()
    if (/nombre|desc|producto|repuesto/.test(hl)) excCols.nombre = i
    else if (/cod|sku|ref/.test(hl)) excCols.codigo = i
    else if (/categ|tipo/.test(hl)) excCols.categoria = i
    else if (/unid|medid/.test(hl)) excCols.unidad = i
    else if (/stock|cant|existencia/.test(hl)) excCols.stock = i
    else if (/min|mínimo/.test(hl)) excCols.smin = i
    else if (/costo|cost/.test(hl)) excCols.costo = i
    else if (/precio|venta|valor|price/.test(hl) && !/costo/.test(hl)) excCols.precio = i
  })
  return excCols
}

function parseMoneyLikeHtml(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  const s = String(v ?? '').trim()
  if (!s) return 0
  const asNum = Number(s.replace(',', '.'))
  if (!Number.isNaN(asNum)) return asNum
  return parseFloat(s.replace(/\$/g, '').replace(/\./g, '').replace(',', '.')) || 0
}

function parseStockLikeHtml(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  const n = parseFloat(String(v ?? '').replace(',', '.'))
  return Number.isNaN(n) ? 0 : n
}

const BULK_COL_TO_KEY: Record<string, keyof Pick<Producto, 'nombre' | 'codigo' | 'categoria' | 'unidad' | 'stock' | 'smin' | 'costo' | 'precio'>> = {
  Nombre: 'nombre',
  'Código': 'codigo',
  'Categoría': 'categoria',
  Categoria: 'categoria',
  Unidad: 'unidad',
  'Stock actual': 'stock',
  'Stock mínimo': 'smin',
  'Stock minimo': 'smin',
  'Costo ($)': 'costo',
  'Precio ($)': 'precio',
}

function bulkDespuesFromRow(row: Record<string, unknown>, prod: Producto): InvBulkChange['despues'] | null {
  const despues: InvBulkChange['despues'] = {}
  for (const [colLabel, key] of Object.entries(BULK_COL_TO_KEY)) {
    if (!Object.prototype.hasOwnProperty.call(row, colLabel)) continue
    const raw = row[colLabel]
    if (raw === undefined || raw === null) continue
    const nuevoVal =
      key === 'nombre' || key === 'codigo' || key === 'categoria' || key === 'unidad'
        ? String(raw).trim()
        : parseFloat(String(raw).replace(',', '.')) || 0
    if (String(nuevoVal) !== String((prod[key] as string | number) ?? '')) despues[key] = nuevoVal as never
  }
  return Object.keys(despues).length ? despues : null
}

export function InventarioModule({ db, setDb, showToast }: Props) {
  const [tab, setTab] = useState<InvTab>('manual')
  const [formKey, setFormKey] = useState(0)
  const [buscar, setBuscar] = useState('')
  const [catFiltro, setCatFiltro] = useState('')
  const [stockFiltro, setStockFiltro] = useState<StockFiltro>('todos')
  const [nuevaCat, setNuevaCat] = useState('')
  const [editProd, setEditProd] = useState<Producto | null>(null)
  const [exportCat, setExportCat] = useState('')
  const [importDraft, setImportDraft] = useState<ImportDraft | null>(null)
  const [importDrag, setImportDrag] = useState(false)
  const [bulkPending, setBulkPending] = useState<InvBulkChange[]>([])
  const importFileRef = useRef<HTMLInputElement>(null)
  const bulkUpdateRef = useRef<HTMLInputElement>(null)

  const categorias = db.categorias.length ? db.categorias : ['Repuestos']

  useEffect(() => {
    if (tab !== 'excel') {
      setImportDraft(null)
      setImportDrag(false)
    }
  }, [tab])

  const lista = useMemo(() => {
    const q = buscar.toLowerCase().trim()
    let rows = db.inventario
    if (q) {
      rows = rows.filter(
        (p) =>
          p.nombre.toLowerCase().includes(q) ||
          (p.codigo || '').toLowerCase().includes(q) ||
          p.categoria.toLowerCase().includes(q),
      )
    }
    if (catFiltro) {
      rows = rows.filter((p) => p.categoria === catFiltro)
    }
    const mo = 'Mano de obra'
    if (stockFiltro === 'bajo') {
      rows = rows.filter(
        (p) => p.categoria !== mo && (p.stock === 0 || (p.smin > 0 && p.stock <= p.smin)),
      )
    } else if (stockFiltro === 'sin') {
      rows = rows.filter((p) => p.stock === 0 && p.categoria !== mo)
    }
    return rows
  }, [db.inventario, buscar, catFiltro, stockFiltro])

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const nombre = String(fd.get('inv_nom') || '').trim()
    const precioVenta = Number(fd.get('inv_pv') ?? 0)
    if (!nombre) {
      showToast('El nombre es obligatorio', 'err')
      return
    }
    if (Number.isNaN(precioVenta) || precioVenta < 0) {
      showToast('Precio de venta inválido', 'err')
      return
    }
    const codigo = String(fd.get('inv_cod') || '').trim()
    if (codigo && db.inventario.some((p) => (p.codigo || '').toLowerCase() === codigo.toLowerCase())) {
      showToast('Ya existe un producto con ese código', 'err')
      return
    }
    const nuevo: Producto = {
      id: uid(),
      nombre,
      codigo,
      categoria: String(fd.get('inv_cat') || categorias[0] || 'Repuestos'),
      unidad: String(fd.get('inv_uni') || 'Unidad'),
      stock: Number(fd.get('inv_st')) || 0,
      smin: Number(fd.get('inv_smin')) || 0,
      costo: Number(fd.get('inv_costo')) || 0,
      precio: precioVenta,
    }
    setDb((d) => ({ ...d, inventario: [nuevo, ...d.inventario] }))
    showToast('Producto agregado')
    setFormKey((k) => k + 1)
  }

  const limpiar = () => setFormKey((k) => k + 1)

  const eliminar = (id: string) => {
    if (!window.confirm('¿Eliminar este producto del inventario?')) return
    setDb((d) => ({ ...d, inventario: d.inventario.filter((p) => p.id !== id) }))
    showToast('Producto eliminado')
  }

  const agregarCategoria = () => {
    const t = nuevaCat.trim()
    if (!t) {
      showToast('Escribe un nombre de categoría', 'warn')
      return
    }
    if (db.categorias.some((c) => c.toLowerCase() === t.toLowerCase())) {
      showToast('Esa categoría ya existe', 'warn')
      return
    }
    setDb((d) => ({ ...d, categorias: [...d.categorias, t] }))
    setNuevaCat('')
    showToast('Categoría agregada')
  }

  const quitarCategoria = (cat: string) => {
    const rest = db.categorias.filter((c) => c !== cat)
    if (!rest.length) {
      showToast('Debe existir al menos una categoría', 'warn')
      return
    }
    const fallback = rest[0]
    setDb((d) => ({
      ...d,
      categorias: rest,
      inventario: d.inventario.map((p) => (p.categoria === cat ? { ...p, categoria: fallback } : p)),
    }))
    showToast('Categoría eliminada; productos reasignados')
  }

  const processImportPreviewFile = (file: File) => {
    const isCsv = file.name.toLowerCase().endsWith('.csv')
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const wb = isCsv
          ? XLSX.read(reader.result as string, { type: 'string' })
          : XLSX.read(new Uint8Array(reader.result as ArrayBuffer), { type: 'array' })
        const sheet = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as unknown[][]
        if (rows.length < 2) {
          showToast('Archivo sin datos suficientes', 'err')
          return
        }
        const hdrs = (rows[0] as unknown[]).map((h) => String(h).trim())
        const dataRows = rows
          .slice(1)
          .filter((r) => Array.isArray(r) && (r as unknown[]).some((c) => String(c ?? '').trim() !== ''))
        if (!dataRows.length) {
          showToast('No hay filas de datos', 'err')
          return
        }
        setImportDraft({ headers: hdrs, dataRows: dataRows as unknown[][], cols: guessExcCols(hdrs) })
      } catch {
        showToast('Error al leer el archivo', 'err')
      }
    }
    if (isCsv) reader.readAsText(file, 'UTF-8')
    else reader.readAsArrayBuffer(file)
  }

  const cancelImportDraft = () => setImportDraft(null)

  const onPickImportPreview = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    processImportPreviewFile(file)
  }

  const confirmImportDraft = () => {
    if (!importDraft) return
    if (importDraft.cols.nombre === undefined) {
      showToast('Mapea la columna Nombre', 'err')
      return
    }
    const catList = categorias
    const resolveCat = (raw: string) => {
      const t = raw.trim()
      if (!t) return catList[0] || 'Repuestos'
      const hit = catList.find((c) => c.toLowerCase() === t.toLowerCase())
      return hit || t
    }
    let ok = 0
    let skip = 0
    const nuevos: Producto[] = []
    for (const row of importDraft.dataRows) {
      const ni = importDraft.cols.nombre!
      const nom = String(row[ni] ?? '').trim()
      if (!nom) {
        skip++
        continue
      }
      const pickI = (k: ExcField) => {
        const i = importDraft.cols[k]
        return i === undefined ? undefined : row[i]
      }
      const catRaw = pickI('categoria') !== undefined ? String(pickI('categoria')).trim() : ''
      const categoria = resolveCat(catRaw)
      const pv = pickI('precio') !== undefined ? parseMoneyLikeHtml(pickI('precio')) : 0
      const pc = pickI('costo') !== undefined ? parseMoneyLikeHtml(pickI('costo')) : 0
      nuevos.push({
        id: uid(),
        nombre: nom,
        codigo: pickI('codigo') !== undefined ? String(pickI('codigo')).trim() : '',
        categoria,
        unidad:
          pickI('unidad') !== undefined ? String(pickI('unidad')).trim() || 'Unidad' : 'Unidad',
        stock: pickI('stock') !== undefined ? parseStockLikeHtml(pickI('stock')) : 0,
        smin: pickI('smin') !== undefined ? parseStockLikeHtml(pickI('smin')) : 0,
        costo: pc,
        precio: pv,
      })
      ok++
    }
    if (!ok) {
      showToast('No hay filas válidas para importar', 'err')
      return
    }
    setDb((d) => {
      const cats = new Set(d.categorias.length ? d.categorias : catList)
      nuevos.forEach((p) => cats.add(p.categoria))
      return { ...d, inventario: [...nuevos, ...d.inventario], categorias: Array.from(cats) }
    })
    cancelImportDraft()
    showToast(`${ok} productos importados${skip ? ` (${skip} omitidos)` : ''}`, ok ? 'ok' : 'warn')
  }

  const exportarInventarioExcel = () => {
    const cat = exportCat
    let lista = db.inventario
    if (cat) lista = lista.filter((p) => p.categoria === cat)
    if (!lista.length) {
      showToast('No hay productos para exportar', 'warn')
      return
    }
    const wb = XLSX.utils.book_new()
    const rows = lista.map((p) => ({
      'ID (no editar)': p.id,
      Nombre: p.nombre,
      Código: p.codigo || '',
      'Categoría': p.categoria || '',
      Unidad: p.unidad || 'Unidad',
      'Stock actual': p.stock || 0,
      'Stock mínimo': p.smin || 0,
      'Costo ($)': p.costo || 0,
      'Precio ($)': p.precio || 0,
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [{ wch: 24 }, { wch: 30 }, { wch: 14 }, { wch: 18 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }]
    XLSX.utils.book_append_sheet(wb, ws, cat ? safeFileSegment(cat).slice(0, 31) : 'Inventario')
    const suffix = cat ? `_${safeFileSegment(cat)}` : ''
    XLSX.writeFile(wb, `Inventario${suffix}_${todayIsoFile()}.xlsx`)
    showToast(`Excel exportado con ${lista.length} productos`)
  }

  const onBulkUpdateFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const isCsv = file.name.toLowerCase().endsWith('.csv')
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const wb = isCsv
          ? XLSX.read(reader.result as string, { type: 'string' })
          : XLSX.read(new Uint8Array(reader.result as ArrayBuffer), { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws)
        if (!rows.length) {
          showToast('El archivo está vacío', 'err')
          return
        }
        const cambios: InvBulkChange[] = []
        for (const row of rows) {
          const id = row['ID (no editar)'] ?? row.ID ?? row.id
          if (id === undefined || id === null || id === '') continue
          const prod = db.inventario.find((p) => p.id === String(id))
          if (!prod) continue
          const despues = bulkDespuesFromRow(row, prod)
          if (!despues) continue
          cambios.push({ id: prod.id, nombre: prod.nombre, despues })
        }
        if (!cambios.length) {
          showToast('No se detectaron cambios respecto al inventario actual', 'warn')
          return
        }
        setBulkPending(cambios)
      } catch (err) {
        showToast(`Error leyendo el archivo: ${err instanceof Error ? err.message : 'desconocido'}`, 'err')
      }
    }
    if (isCsv) reader.readAsText(file, 'UTF-8')
    else reader.readAsArrayBuffer(file)
  }

  const aplicarBulkUpdate = () => {
    if (!bulkPending.length) return
    setDb((d) => {
      const inv = d.inventario.map((p) => {
        const ch = bulkPending.find((c) => c.id === p.id)
        return ch ? { ...p, ...ch.despues } : p
      })
      let categoriasNext = [...(d.categorias.length ? d.categorias : categorias)]
      inv.forEach((p) => {
        if (!categoriasNext.some((c) => c.toLowerCase() === p.categoria.toLowerCase())) categoriasNext.push(p.categoria)
      })
      return { ...d, inventario: inv, categorias: categoriasNext }
    })
    const n = bulkPending.length
    setBulkPending([])
    showToast(`✅ ${n} producto${n !== 1 ? 's' : ''} actualizados correctamente`)
  }

  const cancelarBulkUpdate = () => setBulkPending([])

  const onImportDrop = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setImportDrag(false)
    const f = e.dataTransfer.files?.[0]
    if (f) processImportPreviewFile(f)
  }

  const onImportDragOver = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setImportDrag(true)
  }

  const onImportDragLeave = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setImportDrag(false)
  }

  return (
    <div className="inv-mod">
      <div className="tabs agenda-html-tabs inv-html-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'manual'}
          className={tab === 'manual' ? 'tab active' : 'tab'}
          onClick={() => setTab('manual')}
        >
          Agregar manual
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'excel'}
          className={tab === 'excel' ? 'tab active' : 'tab'}
          onClick={() => setTab('excel')}
        >
          Importar Excel
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'categorias'}
          className={tab === 'categorias' ? 'tab active' : 'tab'}
          onClick={() => setTab('categorias')}
        >
          Categorías
        </button>
      </div>

      {tab === 'manual' && (
        <div className="card card-inv">
          <div className="card-title">
            <div className="card-title-left">Nuevo producto</div>
          </div>
          <form key={formKey} className="g3 form-inventario" onSubmit={onSubmit}>
            <div className="field">
              <label>Nombre *</label>
              <input name="inv_nom" required placeholder="Aceite motor 5W30" autoComplete="off" />
            </div>
            <div className="field">
              <label>Código</label>
              <input name="inv_cod" placeholder="LUB-001" autoComplete="off" />
            </div>
            <div className="field">
              <label>Categoría</label>
              <select name="inv_cat" defaultValue={categorias.includes('Lubricantes') ? 'Lubricantes' : categorias[0]}>
                {categorias.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Unidad</label>
              <select name="inv_uni" defaultValue="Unidad">
                {UNIDADES.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Stock actual</label>
              <input name="inv_st" type="number" min={0} step={1} defaultValue={0} />
            </div>
            <div className="field">
              <label>Stock mínimo</label>
              <input name="inv_smin" type="number" min={0} step={1} defaultValue={0} />
            </div>
            <div className="field">
              <label>Precio costo ($)</label>
              <input name="inv_costo" type="number" min={0} step={1} defaultValue={0} />
            </div>
            <div className="field">
              <label>Precio venta ($) *</label>
              <input name="inv_pv" type="number" min={0} step={1} defaultValue={0} required />
            </div>
            <div className="form-row-actions">
              <button type="submit" className="btn btn-primary btn-guardar">
                ✓ Agregar
              </button>
              <button type="button" className="btn btn-outline" onClick={limpiar}>
                ↺ Limpiar
              </button>
            </div>
          </form>
        </div>
      )}

      {tab === 'excel' && (
        <div className="card card-inv">
          <div className="card-title">
            <div className="card-title-left">Importar desde Excel / CSV</div>
          </div>
          <div
            role="button"
            tabIndex={0}
            className={`inv-upzone ${importDrag ? 'drag' : ''}`}
            onClick={() => importFileRef.current?.click()}
            onKeyDown={(e) => e.key === 'Enter' && importFileRef.current?.click()}
            onDragOver={onImportDragOver}
            onDragLeave={onImportDragLeave}
            onDrop={onImportDrop}
          >
            <div className="inv-upzone-icon" aria-hidden>
              📊
            </div>
            <p className="inv-upzone-title">Haz clic o arrastra tu archivo</p>
            <small className="inv-upzone-sub">
              .xlsx · .xls · .csv — Primera fila con cabeceras; columna <strong>Nombre</strong> obligatoria al importar.
            </small>
          </div>
          <input
            ref={importFileRef}
            type="file"
            accept=".xlsx,.xls,.csv,text/csv"
            className="inv-hidden-input"
            onChange={onPickImportPreview}
          />
          {importDraft ? (
            <div className="inv-exc-preview">
              <div className="inv-exc-preview-head">
                <span className="inv-exc-info">
                  {importDraft.dataRows.length} productos · {importDraft.headers.length} columnas
                </span>
                <div className="inv-exc-actions">
                  <button type="button" className="btn btn-sm" onClick={cancelImportDraft}>
                    ✕ Cancelar
                  </button>
                  <button type="button" className="btn btn-sm btn-primary" onClick={confirmImportDraft}>
                    ✓ Importar
                  </button>
                </div>
              </div>
              <div className="inv-exc-map">
                {EXC_CAMPO_LABELS.map(({ k, l }) => (
                  <div key={k} className="field">
                    <label>{l}</label>
                    <select
                      className="inv-exc-map-select"
                      value={importDraft.cols[k] ?? ''}
                      onChange={(e) => {
                        const v = e.target.value
                        setImportDraft((prev) => {
                          if (!prev) return prev
                          const cols = { ...prev.cols }
                          if (v === '') delete cols[k]
                          else cols[k] = parseInt(v, 10)
                          return { ...prev, cols }
                        })
                      }}
                    >
                      <option value="">— No incluir —</option>
                      {importDraft.headers.map((h, i) => (
                        <option key={`${k}-${i}`} value={i}>
                          {h || `Col ${i + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              <pre className="inv-prevbox">
                {`Vista previa (${importDraft.dataRows.length} filas):\n${importDraft.dataRows
                  .slice(0, 4)
                  .map((r) => {
                    const slice = (Array.isArray(r) ? r : []).slice(0, 6).map((c) => String(c ?? '').slice(0, 18))
                    return `[${slice.join(' | ')}]`
                  })
                  .join('\n')}`}
              </pre>
            </div>
          ) : null}
        </div>
      )}

      {tab === 'categorias' && (
        <div className="card card-inv">
          <div className="card-title">
            <div className="card-title-left">Gestionar categorías</div>
          </div>
          <p className="inv-cat-intro">
            Las categorías se usan para clasificar los productos del inventario. Puedes agregar las tuyas y eliminar las que
            no uses (los productos de esa categoría se reasignan a otra).
          </p>
          <div className="inv-cat-row">
            <input
              className="input-buscar-clientes"
              style={{ maxWidth: 320 }}
              placeholder="Nueva categoría"
              value={nuevaCat}
              onChange={(e) => setNuevaCat(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), agregarCategoria())}
            />
            <button type="button" className="btn btn-primary" onClick={agregarCategoria}>
              + Agregar
            </button>
          </div>
          <ul className="inv-cat-list">
            {categorias.map((c) => (
              <li key={c}>
                <span>{c}</span>
                <button type="button" className="btn btn-xs btn-red" onClick={() => quitarCategoria(c)}>
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card card-inv">
        <div className="card-title card-title-row">
          <div className="card-title-left">Inventario</div>
          <span className="card-count">
            {lista.length} producto{lista.length !== 1 ? 's' : ''}
          </span>
          <div className="inv-card-toolbar">
            <select
              className="inv-exp-cat-select"
              value={exportCat}
              onChange={(e) => setExportCat(e.target.value)}
              aria-label="Categoría a exportar"
            >
              <option value="">Exportar: Todo</option>
              {categorias.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <button type="button" className="btn btn-xs btn-teal" onClick={exportarInventarioExcel}>
              ⬇ Exportar
            </button>
            <label
              className="btn btn-xs inv-bulk-file-label"
              title="Importar cambios masivos desde Excel o CSV (mismas columnas que exportar)"
            >
              ⬆ Actualizar masivo
              <input
                ref={bulkUpdateRef}
                type="file"
                accept=".xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                className="inv-hidden-input"
                onChange={onBulkUpdateFile}
              />
            </label>
          </div>
        </div>
        {bulkPending.length > 0 ? (
          <div className="inv-update-preview">
            <div className="inv-update-preview-title">
              ⚠️ Se detectaron <strong>{bulkPending.length}</strong> producto{bulkPending.length !== 1 ? 's' : ''} con
              cambios.
            </div>
            <p className="inv-update-hint">
              Revisa los cambios antes de aplicar. Solo se actualizan los campos que vienen en el archivo (Excel o CSV)
              respecto al inventario actual.
            </p>
            <div className="inv-update-list">
              {bulkPending.slice(0, 8).map((c) => (
                <div key={c.id} className="inv-update-line">
                  <strong>{c.nombre}</strong>:{' '}
                  {Object.entries(c.despues)
                    .map(([k, v]) => `${k} → ${String(v)}`)
                    .join(', ')}
                </div>
              ))}
              {bulkPending.length > 8 ? (
                <div className="inv-update-more">… y {bulkPending.length - 8} más</div>
              ) : null}
            </div>
            <div className="inv-update-actions">
              <button type="button" className="btn btn-primary btn-sm" onClick={aplicarBulkUpdate}>
                ✓ Aplicar cambios
              </button>
              <button type="button" className="btn btn-sm" onClick={cancelarBulkUpdate}>
                ✕ Cancelar
              </button>
            </div>
          </div>
        ) : null}
        <div className="inv-filters">
          <input
            className="input-buscar-clientes inv-filter-grow"
            placeholder="Buscar nombre, código..."
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
          />
          <select className="inv-filter-select" value={catFiltro} onChange={(e) => setCatFiltro(e.target.value)}>
            <option value="">Todas las categorías</option>
            {categorias.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            className="inv-filter-select"
            value={stockFiltro}
            onChange={(e) => setStockFiltro(e.target.value as StockFiltro)}
          >
            <option value="todos">Todo el stock</option>
            <option value="bajo">⚠ Stock bajo</option>
            <option value="sin">🔴 Sin stock</option>
          </select>
        </div>
        {!lista.length ? (
          <div className="empty empty-inv">
            <div className="empty-icon" aria-hidden>
              📦
            </div>
            <div>No hay productos</div>
          </div>
        ) : (
          <div className="tw tw-inv-products">
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Código</th>
                  <th>Categoría</th>
                  <th>Unidad</th>
                  <th>Stock</th>
                  <th>Stock mín.</th>
                  <th className="tr">P. Costo</th>
                  <th className="tr">P. Venta</th>
                  <th className="tr">Margen</th>
                  <th className="th-actions">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((p) => {
                  const margen = p.costo > 0 ? Math.round(((p.precio - p.costo) / p.costo) * 100) : null
                  const mo = p.categoria === 'Mano de obra'
                  const stockCls = mo ? '' : p.stock === 0 ? 'inv-stock-crit' : p.smin > 0 && p.stock <= p.smin ? 'inv-stock-warn' : 'inv-stock-ok'
                  return (
                    <tr key={p.id}>
                      <td className="inv-prod-nom">{p.nombre}</td>
                      <td className="inv-prod-cod">{p.codigo || '—'}</td>
                      <td>
                        <span className={`badge ${catBadgeClass(p.categoria)}`}>{p.categoria}</span>
                      </td>
                      <td className="inv-prod-uni">{p.unidad}</td>
                      <td className={`td-mono inv-stock-cell ${stockCls}`}>{p.stock}</td>
                      <td className="td-mono">{p.smin || '—'}</td>
                      <td className="tr td-mono inv-precio-muted">{p.costo ? fmtInv(p.costo) : '—'}</td>
                      <td className="tr td-mono inv-precio-venta">{fmtInv(p.precio)}</td>
                      <td
                        className={`tr td-mono inv-margen ${margen != null ? (margen >= 0 ? 'inv-margin-pos' : 'inv-margin-neg') : ''}`}
                      >
                        {margen != null ? `${margen}%` : '—'}
                      </td>
                      <td>
                        <div className="row-acts">
                          <button type="button" className="btn btn-xs" onClick={() => setEditProd(p)}>
                            ✏ Editar
                          </button>
                          <button type="button" className="btn btn-xs btn-red" onClick={() => eliminar(p.id)}>
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editProd ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setEditProd(null)}>
          <div className="modal-box inv-edit-modal" role="dialog" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-h3">Editar producto</h3>
            <InvProdEditForm
              key={editProd.id}
              producto={editProd}
              categorias={categorias}
              unidades={UNIDADES}
              onCancel={() => setEditProd(null)}
              onSave={(next) => {
                setDb((d) => ({
                  ...d,
                  inventario: d.inventario.map((x) => (x.id === next.id ? next : x)),
                }))
                showToast('Producto actualizado')
                setEditProd(null)
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}

function InvProdEditForm({
  producto,
  categorias,
  unidades,
  onCancel,
  onSave,
}: {
  producto: Producto
  categorias: string[]
  unidades: string[]
  onCancel: () => void
  onSave: (p: Producto) => void
}) {
  const [draft, setDraft] = useState<Producto>({ ...producto })
  const margen =
    draft.costo > 0 && draft.precio > 0 ? (((draft.precio - draft.costo) / draft.costo) * 100).toFixed(1) : ''

  return (
    <div className="g3 form-inventario" style={{ marginTop: 12 }}>
      <div className="field field-span-full">
        <label>Nombre *</label>
        <input value={draft.nombre} onChange={(e) => setDraft((d) => ({ ...d, nombre: e.target.value }))} />
      </div>
      <div className="field">
        <label>Código</label>
        <input value={draft.codigo} onChange={(e) => setDraft((d) => ({ ...d, codigo: e.target.value }))} />
      </div>
      <div className="field">
        <label>Categoría</label>
        <select value={draft.categoria} onChange={(e) => setDraft((d) => ({ ...d, categoria: e.target.value }))}>
          {categorias.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>Unidad</label>
        <select value={draft.unidad} onChange={(e) => setDraft((d) => ({ ...d, unidad: e.target.value }))}>
          {unidades.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>Stock</label>
        <input
          type="number"
          min={0}
          step={1}
          value={draft.stock}
          onChange={(e) => setDraft((d) => ({ ...d, stock: Number(e.target.value) || 0 }))}
        />
      </div>
      <div className="field">
        <label>Stock mínimo</label>
        <input
          type="number"
          min={0}
          step={1}
          value={draft.smin}
          onChange={(e) => setDraft((d) => ({ ...d, smin: Number(e.target.value) || 0 }))}
        />
      </div>
      <div className="field">
        <label>Precio costo</label>
        <input
          type="number"
          min={0}
          step={1}
          value={draft.costo}
          onChange={(e) => setDraft((d) => ({ ...d, costo: Number(e.target.value) || 0 }))}
        />
      </div>
      <div className="field">
        <label>Precio venta</label>
        <input
          type="number"
          min={0}
          step={1}
          value={draft.precio}
          onChange={(e) => setDraft((d) => ({ ...d, precio: Number(e.target.value) || 0 }))}
        />
      </div>
      {margen ? (
        <div className="field field-span-full inv-edit-margen">
          Margen:{' '}
          <strong style={{ color: Number(margen) >= 0 ? 'var(--green)' : 'var(--red)' }}>{margen}%</strong>
          {' · '}
          Ganancia/unidad:{' '}
          <strong>{fmtInv(Math.max(0, draft.precio - draft.costo))}</strong>
        </div>
      ) : null}
      <div className="modal-actions field-span-full">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            const nom = draft.nombre.trim()
            if (!nom) return
            onSave({ ...draft, nombre: nom })
          }}
        >
          ✓ Guardar
        </button>
        <button type="button" className="btn btn-outline" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </div>
  )
}
