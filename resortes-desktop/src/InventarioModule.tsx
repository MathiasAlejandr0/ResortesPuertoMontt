import {
  type ChangeEvent,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
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

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

function fmtMoney(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(
    Math.round(n),
  )
}

type StockFiltro = 'todos' | 'bajo' | 'sin' | 'ok'

export function InventarioModule({ db, setDb, showToast }: Props) {
  const [tab, setTab] = useState<InvTab>('manual')
  const [formKey, setFormKey] = useState(0)
  const [buscar, setBuscar] = useState('')
  const [catFiltro, setCatFiltro] = useState('')
  const [stockFiltro, setStockFiltro] = useState<StockFiltro>('todos')
  const [nuevaCat, setNuevaCat] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const categorias = db.categorias.length ? db.categorias : ['Repuestos']

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
    if (stockFiltro === 'bajo') {
      rows = rows.filter((p) => p.smin > 0 && p.stock <= p.smin)
    } else if (stockFiltro === 'sin') {
      rows = rows.filter((p) => p.stock <= 0)
    } else if (stockFiltro === 'ok') {
      rows = rows.filter((p) => p.stock > p.smin || p.smin === 0)
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

  const onImportExcel = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = new Uint8Array(reader.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })
        const sheet = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
        if (!rows.length) {
          showToast('El archivo no tiene filas', 'err')
          return
        }
        const normKey = (k: string) =>
          String(k)
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim()
        const pick = (row: Record<string, unknown>, ...aliases: string[]) => {
          const keys = Object.keys(row)
          for (const a of aliases) {
            const na = normKey(a)
            const found = keys.find((k) => normKey(k) === na || normKey(k).includes(na))
            if (found !== undefined) {
              const v = row[found]
              return v === null || v === undefined ? '' : String(v).trim()
            }
          }
          return ''
        }
        let added = 0
        const nuevos: Producto[] = []
        for (const row of rows) {
          const nombre = pick(row, 'nombre', 'descripcion', 'producto')
          if (!nombre) continue
          const codigo = pick(row, 'codigo', 'sku', 'code')
          const categoria = pick(row, 'categoria', 'categoría', 'cat') || categorias[0] || 'Repuestos'
          const unidad = pick(row, 'unidad', 'um') || 'Unidad'
          const stock = Number(String(pick(row, 'stock', 'stock actual', 'cantidad')).replace(',', '.')) || 0
          const smin = Number(String(pick(row, 'min', 'stock min', 'stock minimo', 'mínimo')).replace(',', '.')) || 0
          const costo = Number(String(pick(row, 'costo', 'precio costo', 'p costo')).replace(',', '.')) || 0
          const precio = Number(String(pick(row, 'venta', 'precio venta', 'p venta', 'precio')).replace(',', '.')) || 0
          nuevos.push({
            id: uid(),
            nombre,
            codigo,
            categoria,
            unidad,
            stock,
            smin,
            costo,
            precio,
          })
          added++
        }
        if (!added) {
          showToast('No se encontraron filas con columna Nombre', 'err')
          return
        }
        setDb((d) => {
          const cats = new Set(d.categorias)
          nuevos.forEach((p) => cats.add(p.categoria))
          return { ...d, inventario: [...nuevos, ...d.inventario], categorias: Array.from(cats) }
        })
        showToast(`${added} producto(s) importado(s)`)
      } catch {
        showToast('No se pudo leer el Excel', 'err')
      }
    }
    reader.readAsArrayBuffer(file)
  }

  return (
    <div className="inv-mod">
      <div className="inv-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'manual'}
          className={tab === 'manual' ? 'inv-tab active' : 'inv-tab'}
          onClick={() => setTab('manual')}
        >
          Agregar manual
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'excel'}
          className={tab === 'excel' ? 'inv-tab active' : 'inv-tab'}
          onClick={() => setTab('excel')}
        >
          Importar Excel
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'categorias'}
          className={tab === 'categorias' ? 'inv-tab active' : 'inv-tab'}
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
            <div className="card-title-left">Importar desde Excel</div>
          </div>
          <p className="inv-hint">
            Primera hoja: columnas sugeridas <strong>Nombre</strong>, Código, Categoría, Unidad, Stock, Stock mín., Precio
            costo, Precio venta. La columna <strong>Nombre</strong> es obligatoria por fila.
          </p>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="inv-file-input" onChange={onImportExcel} />
          <button type="button" className="btn btn-primary" onClick={() => fileRef.current?.click()}>
            Elegir archivo…
          </button>
        </div>
      )}

      {tab === 'categorias' && (
        <div className="card card-inv">
          <div className="card-title">
            <div className="card-title-left">Categorías de producto</div>
          </div>
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
              Agregar
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
        <div className="card-title">
          <div className="card-title-left">Inventario</div>
          <span className="card-count">
            {lista.length} producto{lista.length !== 1 ? 's' : ''}
          </span>
        </div>
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
            <option value="bajo">Bajo mínimo</option>
            <option value="sin">Sin stock</option>
            <option value="ok">Por encima del mínimo</option>
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
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Código</th>
                  <th>Categoría</th>
                  <th>Unidad</th>
                  <th>Stock</th>
                  <th>Mín.</th>
                  <th>Costo</th>
                  <th>Venta</th>
                  <th className="th-actions">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((p) => (
                  <tr key={p.id}>
                    <td className="td-nombre">{p.nombre}</td>
                    <td className="td-mono">{p.codigo || '—'}</td>
                    <td>{p.categoria}</td>
                    <td>{p.unidad}</td>
                    <td>{p.stock}</td>
                    <td>{p.smin}</td>
                    <td>{fmtMoney(p.costo)}</td>
                    <td>{fmtMoney(p.precio)}</td>
                    <td>
                      <button type="button" className="btn btn-xs btn-red" onClick={() => eliminar(p.id)}>
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
