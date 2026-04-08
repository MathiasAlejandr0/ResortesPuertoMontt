import { type Dispatch, type FormEvent, type SetStateAction, useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import type {
  AnticipoRegistro,
  AppSettings,
  Cliente,
  Cotizacion,
  Credito,
  Db,
  Gasto,
  Mecanico,
  Orden,
  Producto,
  Vehiculo,
  Venta,
} from './appTypes'
import { ConfigModule } from './ConfigModule'
import { LS_SETTINGS, loadAppSettings } from './appSettings'
import { AnticiposModule } from './AnticiposModule'
import { CreditosModule } from './CreditosModule'
import { GastosModule } from './GastosModule'
import { ReportesModule } from './ReportesModule'
import { ClientesModule } from './ClientesModule'
import { CotizacionesModule } from './CotizacionesModule'
import { InformesModule } from './InformesModule'
import { InventarioModule } from './InventarioModule'
import { MecanicosModule } from './MecanicosModule'
import { OrdenesModule } from './OrdenesModule'
import { normalizeCotizacion, normalizeOrden, normalizeVenta } from './opsHelpers'
import { VentasModule } from './VentasModule'
import './App.css'

const LS_KEY = 'rpm_ts3_db_v1'
const LS_CFG = 'rpm_cfg_empresa'
const LS_THEME = 'rpm_theme'

const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function fmt(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Math.round(n))
}
function today() {
  return new Date().toISOString().slice(0, 10)
}
function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

const defaultCats = ['Lubricantes', 'Repuestos', 'Fluidos', 'Herramientas', 'Mano de obra', 'Otros']

function estadoCredito(cr: Credito): string {
  const hoy = today()
  if (cr.saldo <= 0) return 'Pagado'
  if (cr.saldo < cr.monto) return 'Pagado parcial'
  if (cr.vcto && cr.vcto < hoy) return 'Vencido'
  return 'Pendiente'
}

function emptyDb(): Db {
  return {
    clientes: [],
    vehiculos: [],
    inventario: [],
    mecanicos: [],
    cotizaciones: [],
    ordenes: [],
    ventas: [],
    gastos: [],
    categorias: [...defaultCats],
    creditos: [],
    anticipos: [],
  }
}

function normalizeProducto(p: Partial<Producto> & { id: string }): Producto {
  return {
    id: p.id,
    nombre: p.nombre || '',
    codigo: p.codigo || '',
    categoria: p.categoria || 'Repuestos',
    unidad: p.unidad || 'Unidad',
    precio: Number(p.precio) || 0,
    costo: Number(p.costo) || 0,
    stock: Number(p.stock) || 0,
    smin: Number(p.smin) || 0,
  }
}

function normalizeMecanico(m: Partial<Mecanico> & { id: string; creado: string }): Mecanico {
  return {
    id: m.id,
    nombre: m.nombre || '',
    especialidad: m.especialidad ?? '',
    tel: m.tel ?? '',
    email: m.email ?? '',
    activo: m.activo !== false,
    creado: m.creado,
  }
}

function normalizeCliente(c: Partial<Cliente> & { id: string; creado: string }): Cliente {
  return {
    id: c.id,
    nombre: c.nombre || '',
    rut: c.rut || '',
    tel: c.tel || '',
    email: c.email || '',
    dir: c.dir ?? '',
    origen: c.origen ?? 'Recomendación',
    obs: c.obs ?? '',
    creado: c.creado,
  }
}

function normalizeCredito(c: Partial<Credito> & { id: string; creado: string }): Credito {
  const abonos = (c.abonos || []).map((a) => ({
    monto: Number(a.monto) || 0,
    fecha: a.fecha || today(),
    obs: a.obs || '',
    creado: a.creado || new Date().toISOString(),
  }))
  const monto = Number(c.monto) || 0
  const abonado = abonos.reduce((s, a) => s + a.monto, 0)
  const saldo = Math.max(0, monto - abonado)
  const base: Credito = {
    id: c.id,
    clienteId: c.clienteId ?? null,
    clienteNombre: c.clienteNombre || '',
    clienteRut: c.clienteRut || '',
    monto,
    saldo,
    abonos,
    fecha: c.fecha || today(),
    vcto: c.vcto || '',
    desc: c.desc || '',
    ventaFolio: c.ventaFolio,
    estado: '',
    creado: c.creado,
  }
  base.estado = estadoCredito(base)
  return base
}

function normalizeGasto(g: Partial<Gasto> & { id: string; creado: string }): Gasto {
  return {
    id: g.id,
    desc: g.desc || '',
    categoria: g.categoria || 'Otros',
    monto: Number(g.monto) || 0,
    fecha: g.fecha || today(),
    proveedor: g.proveedor ?? '',
    creado: g.creado,
  }
}

function normalizeAnticipo(a: Partial<AnticipoRegistro> & { id: string; creado: string }): AnticipoRegistro {
  const mes = Number(a.mesDescuento)
  return {
    id: a.id,
    trabajadorId: a.trabajadorId || '',
    trabajadorNombre: a.trabajadorNombre || '',
    tipo: a.tipo || 'Anticipo de sueldo',
    monto: Number(a.monto) || 0,
    fecha: a.fecha || today(),
    mesDescuento: mes >= 0 && mes <= 11 ? mes : new Date().getMonth(),
    anioDescuento: Number(a.anioDescuento) || new Date().getFullYear(),
    desc: a.desc || '',
    estado: a.estado === 'Pagado' || a.estado === 'Anulado' ? a.estado : 'Activo',
    creado: a.creado,
  }
}

function loadDb(): Db {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return emptyDb()
    const p = JSON.parse(raw) as Db
    const merged: Db = { ...emptyDb(), ...p, categorias: p.categorias?.length ? p.categorias : [...defaultCats] }
    merged.clientes = (merged.clientes || []).map((c) => normalizeCliente(c as Cliente))
    merged.inventario = (merged.inventario || []).map((p) => normalizeProducto(p as Producto))
    merged.mecanicos = (merged.mecanicos || []).map((m) => normalizeMecanico(m as Mecanico))
    merged.cotizaciones = (merged.cotizaciones || []).map((c) => normalizeCotizacion(c as Cotizacion))
    merged.ordenes = (merged.ordenes || []).map((o) => normalizeOrden(o as Orden))
    merged.ventas = (merged.ventas || []).map((v) => normalizeVenta(v as Venta))
    merged.gastos = (merged.gastos || []).map((g) => normalizeGasto(g as Gasto))
    merged.creditos = (merged.creditos || []).map((c) => normalizeCredito(c as Credito))
    merged.anticipos = (merged.anticipos || []).map((a) => normalizeAnticipo(a as AnticipoRegistro))
    return merged
  } catch {
    return emptyDb()
  }
}

function ultimos6mesesVentas(ventas: Venta[]) {
  const map: Record<string, number> = {}
  ventas.forEach((v) => {
    if (v.fecha) map[v.fecha.slice(0, 7)] = (map[v.fecha.slice(0, 7)] || 0) + v.total
  })
  const res: { label: string; value: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const k = d.toISOString().slice(0, 7)
    res.push({ label: meses[d.getMonth()], value: map[k] || 0 })
  }
  return res
}

function ultimos6mesesGastos(gastos: Gasto[]) {
  const map: Record<string, number> = {}
  for (const g of gastos) {
    if (g.fecha) map[g.fecha.slice(0, 7)] = (map[g.fecha.slice(0, 7)] || 0) + g.monto
  }
  const res: { label: string; value: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const k = d.toISOString().slice(0, 7)
    res.push({ label: meses[d.getMonth()], value: map[k] || 0 })
  }
  return res
}

type Section =
  | 'dashboard'
  | 'clientes'
  | 'vehiculos'
  | 'inventario'
  | 'mecanicos'
  | 'cotizaciones'
  | 'ordenes'
  | 'ventas'
  | 'informes'
  | 'creditos'
  | 'gastos'
  | 'reportes'
  | 'anticipos'
  | 'config'

function VehiculosPane({
  db,
  setDb,
  showToast,
  vehClientePref,
  setVehClientePref,
}: {
  db: Db
  setDb: Dispatch<SetStateAction<Db>>
  showToast: (m: string, t?: 'ok' | 'err' | 'warn') => void
  vehClientePref: string
  setVehClientePref: (s: string) => void
}) {
  const [q, setQ] = useState('')
  const [formKey, setFormKey] = useState(0)

  const lista = useMemo(() => {
    const qq = q.toLowerCase().trim()
    if (!qq) return db.vehiculos
    return db.vehiculos.filter(
      (v) =>
        v.patente.toLowerCase().includes(qq) ||
        v.clienteNombre.toLowerCase().includes(qq) ||
        (v.marca || '').toLowerCase().includes(qq) ||
        (v.modelo || '').toLowerCase().includes(qq),
    )
  }, [db.vehiculos, q])

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const cid = String(fd.get('vh_cli') || '')
    const pat = String(fd.get('vh_pat') || '').trim().toUpperCase()
    if (!cid || !pat) {
      showToast('Propietario y patente son obligatorios', 'err')
      return
    }
    if (db.vehiculos.some((v) => v.patente === pat)) {
      showToast('Ya existe un vehículo con esa patente', 'err')
      return
    }
    const c = db.clientes.find((x) => x.id === cid)
    if (!c) return
    const v: Vehiculo = {
      id: uid(),
      clienteId: cid,
      clienteNombre: c.nombre,
      patente: pat,
      marca: String(fd.get('vh_marca') || '').trim(),
      modelo: String(fd.get('vh_mod') || '').trim(),
      anio: String(fd.get('vh_anio') || '').trim(),
      color: String(fd.get('vh_col') || '').trim(),
      combustible: String(fd.get('vh_comb') || '').trim(),
      vin: String(fd.get('vh_vin') || '').trim(),
      km: Number(fd.get('vh_km')) || 0,
      creado: new Date().toISOString(),
    }
    setDb((d) => ({ ...d, vehiculos: [v, ...d.vehiculos] }))
    showToast(`Vehículo ${pat} registrado`)
    setFormKey((k) => k + 1)
  }

  return (
    <>
      <div className="card">
        <div className="card-title">
          <div className="card-title-left">Registrar vehículo</div>
        </div>
        <form key={formKey} className="g3" onSubmit={onSubmit}>
          <div className="field">
            <label>Propietario *</label>
            <select name="vh_cli" required value={vehClientePref} onChange={(e) => setVehClientePref(e.target.value)}>
              <option value="">— Seleccionar —</option>
              {db.clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Patente *</label>
            <input name="vh_pat" required placeholder="ABCD12" style={{ textTransform: 'uppercase' }} />
          </div>
          <div className="field">
            <label>Marca</label>
            <input name="vh_marca" placeholder="Toyota" />
          </div>
          <div className="field">
            <label>Modelo</label>
            <input name="vh_mod" placeholder="Corolla" />
          </div>
          <div className="field">
            <label>Año</label>
            <input name="vh_anio" type="number" placeholder="2020" />
          </div>
          <div className="field">
            <label>Color</label>
            <input name="vh_col" />
          </div>
          <div className="field">
            <label>Combustible</label>
            <input name="vh_comb" placeholder="Bencina / Diésel..." />
          </div>
          <div className="field">
            <label>Km</label>
            <input name="vh_km" type="number" min={0} step={1} />
          </div>
          <div className="field">
            <label>VIN</label>
            <input name="vh_vin" />
          </div>
          <div className="form-row-actions">
            <button type="submit" className="btn btn-primary btn-guardar">
              ✓ Guardar
            </button>
          </div>
        </form>
      </div>
      <div className="card">
        <div className="card-title">
          <div className="card-title-left">Vehículos registrados</div>
          <span className="card-count">
            {lista.length} vehículo{lista.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="sbar sbar-full">
          <input
            className="input-buscar-clientes"
            placeholder="Buscar patente, cliente, marca..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        {!lista.length ? (
          <div className="empty">
            <div className="empty-icon">🚗</div>
            <div>No hay vehículos</div>
          </div>
        ) : (
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>Patente</th>
                  <th>Cliente</th>
                  <th>Marca / Modelo</th>
                  <th>Km</th>
                  <th className="th-actions">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((v) => (
                  <tr key={v.id}>
                    <td>
                      <strong>{v.patente}</strong>
                    </td>
                    <td>{v.clienteNombre}</td>
                    <td>
                      {v.marca} {v.modelo}
                    </td>
                    <td>{v.km || '—'}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-xs btn-red"
                        onClick={() => {
                          if (!window.confirm('¿Eliminar vehículo?')) return
                          setDb((d) => ({ ...d, vehiculos: d.vehiculos.filter((x) => x.id !== v.id) }))
                          showToast('Vehículo eliminado')
                        }}
                      >
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
    </>
  )
}

const titles: Record<Section, [string, string]> = {
  dashboard: ['Dashboard', 'Resumen general del taller'],
  clientes: ['Clientes', 'Gestión de clientes'],
  vehiculos: ['Vehículos', 'Maestro de vehículos'],
  inventario: ['Inventario', 'Productos, repuestos y servicios'],
  mecanicos: ['Mecánicos', 'Equipo de trabajo'],
  cotizaciones: ['Cotizaciones', 'Presupuestos y propuestas'],
  ordenes: ['Órdenes de Trabajo', 'Gestión de servicios en curso'],
  ventas: ['Ventas', 'Historial de órdenes facturadas'],
  informes: ['Informes — Trazabilidad', 'Historial completo por cliente y vehículo'],
  creditos: ['Cuentas por Cobrar', 'Gestión de créditos y deudas de clientes'],
  gastos: ['Gastos', 'Control de egresos del taller'],
  reportes: ['Reportes', 'Análisis financiero y estadísticas'],
  anticipos: ['Anticipos / Préstamos / Descuentos', 'Gestión de haberes y descuentos de trabajadores'],
  config: ['Configuración', 'Datos del taller, documentos y backup'],
}

export default function App() {
  const [db, setDb] = useState<Db>(() => loadDb())
  const [settings, setSettings] = useState<AppSettings>(() => loadAppSettings())
  const [section, setSection] = useState<Section>('dashboard')
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' | 'warn' } | null>(null)
  const [globalQ, setGlobalQ] = useState('')
  const [dark, setDark] = useState(() => localStorage.getItem(LS_THEME) === 'dark')
  const [vehClientePref, setVehClientePref] = useState('')

  const showToast = (msg: string, type: 'ok' | 'err' | 'warn' = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3200)
  }

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(db))
  }, [db])
  useEffect(() => {
    localStorage.setItem(LS_SETTINGS, JSON.stringify(settings))
    localStorage.setItem(LS_CFG, settings.empresa.nombre)
  }, [settings])
  useEffect(() => {
    localStorage.setItem(LS_THEME, dark ? 'dark' : 'light')
    document.documentElement.classList.toggle('theme-dark', dark)
  }, [dark])

  const badgeCred = db.creditos.filter((c) => c.estado !== 'Pagado').length
  const badgeCot = db.cotizaciones.filter((c) => c.estado === 'Pendiente').length

  const ingTotal = useMemo(() => db.ventas.reduce((s, v) => s + v.total, 0), [db.ventas])
  const gasTotal = useMemo(() => db.gastos.reduce((s, g) => s + g.monto, 0), [db.gastos])
  const porCobrar = useMemo(
    () => db.creditos.filter((c) => c.estado !== 'Pagado').reduce((s, c) => s + c.saldo, 0),
    [db.creditos],
  )
  const ing6 = useMemo(() => ultimos6mesesVentas(db.ventas), [db.ventas])
  const gas6 = useMemo(() => ultimos6mesesGastos(db.gastos), [db.gastos])
  const maxBar = Math.max(...ing6.map((x) => x.value), ...gas6.map((x) => x.value), 1)
  const activasOT = useMemo(() => db.ordenes.filter((o) => o.estado !== 'Entregado').slice(0, 8), [db.ordenes])

  const exportClientesExcel = () => {
    const rows = [['Nombre', 'RUT', 'Teléfono', 'Email', 'Dirección', 'Origen', 'Observaciones']]
    db.clientes.forEach((c) => rows.push([c.nombre, c.rut, c.tel, c.email, c.dir, c.origen, c.obs]))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Clientes')
    XLSX.writeFile(wb, `Clientes_${today()}.xlsx`)
    showToast('Excel exportado')
  }

  const exportInventarioExcel = () => {
    const rows: (string | number)[][] = [
      ['Nombre', 'Código', 'Categoría', 'Unidad', 'Stock', 'Stock mín.', 'Precio costo', 'Precio venta'],
    ]
    db.inventario.forEach((p) =>
      rows.push([p.nombre, p.codigo, p.categoria, p.unidad, p.stock, p.smin, p.costo, p.precio]),
    )
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Inventario')
    XLSX.writeFile(wb, `Inventario_${today()}.xlsx`)
    showToast('Excel exportado')
  }

  const exportMecanicosExcel = () => {
    const rows: (string | number)[][] = [['Nombre', 'Especialidad', 'Teléfono', 'Email', 'Estado']]
    db.mecanicos.forEach((m) =>
      rows.push([m.nombre, m.especialidad, m.tel, m.email, m.activo ? 'Activo' : 'Inactivo']),
    )
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Mecánicos')
    XLSX.writeFile(wb, `Mecanicos_${today()}.xlsx`)
    showToast('Excel exportado')
  }

  const exportCotizacionesExcel = () => {
    const rows: (string | number)[][] = [['Folio', 'Fecha', 'Cliente', 'Patente', 'Total', 'Estado']]
    db.cotizaciones.forEach((c) =>
      rows.push([c.folio, c.fecha, c.clienteNombre, c.patente, c.total, c.estado]),
    )
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Cotizaciones')
    XLSX.writeFile(wb, `Cotizaciones_${today()}.xlsx`)
    showToast('Excel exportado')
  }

  const exportOrdenesExcel = () => {
    const rows: (string | number)[][] = [['Folio', 'Fecha ingreso', 'Cliente', 'Patente', 'Mecánico', 'Total', 'Estado']]
    db.ordenes.forEach((o) =>
      rows.push([o.folio, o.fechaIn, o.clienteNombre, o.patente, o.mecanico, o.total, o.estado]),
    )
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Ordenes')
    XLSX.writeFile(wb, `Ordenes_${today()}.xlsx`)
    showToast('Excel exportado')
  }

  const exportVentasExcel = () => {
    const rows: (string | number)[][] = [['Folio', 'Fecha', 'Cliente', 'Patente', 'Total', 'Forma pago']]
    db.ventas.forEach((v) => rows.push([v.folio, v.fecha, v.clienteNombre, v.patente, v.total, v.fpago]))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Ventas')
    XLSX.writeFile(wb, `Ventas_${today()}.xlsx`)
    showToast('Excel exportado')
  }

  const exportInformesResumen = () => {
    const rows: (string | number)[][] = [
      ['Tipo', 'Folio', 'Fecha', 'Cliente', 'Patente', 'Total / Estado'],
    ]
    db.cotizaciones.forEach((c) =>
      rows.push(['Cotización', c.folio, c.fecha, c.clienteNombre, c.patente, c.total]),
    )
    db.ordenes.forEach((o) =>
      rows.push(['Orden', o.folio, o.fechaIn, o.clienteNombre, o.patente, o.estado]),
    )
    db.ventas.forEach((v) => rows.push(['Venta', v.folio, v.fecha, v.clienteNombre, v.patente, v.total]))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Trazabilidad')
    XLSX.writeFile(wb, `Trazabilidad_${today()}.xlsx`)
    showToast('Excel exportado')
  }

  const exportCreditosExcel = () => {
    const rows: (string | number)[][] = [['Cliente', 'RUT', 'Monto', 'Saldo', 'Otorg.', 'Vcto.', 'Estado', 'Descripción']]
    db.creditos.forEach((c) =>
      rows.push([c.clienteNombre, c.clienteRut, c.monto, c.saldo, c.fecha, c.vcto, c.estado, c.desc]),
    )
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Creditos')
    XLSX.writeFile(wb, `Creditos_${today()}.xlsx`)
    showToast('Excel exportado')
  }

  const exportGastosExcel = () => {
    const rows: (string | number)[][] = [['Fecha', 'Descripción', 'Categoría', 'Monto', 'Proveedor']]
    db.gastos.forEach((g) => rows.push([g.fecha, g.desc, g.categoria, g.monto, g.proveedor]))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Gastos')
    XLSX.writeFile(wb, `Gastos_${today()}.xlsx`)
    showToast('Excel exportado')
  }

  const exportReportesExcel = () => {
    const ing = db.ventas.reduce((a, v) => a + v.total, 0)
    const gas = db.gastos.reduce((a, g) => a + g.monto, 0)
    const rows: (string | number)[][] = [
      ['Concepto', 'Valor'],
      ['Ingresos totales', ing],
      ['Gastos totales', gas],
      ['Utilidad neta', ing - gas],
      ['Margen %', ing > 0 ? ((ing - gas) / ing) * 100 : 0],
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Resumen')
    XLSX.writeFile(wb, `Reportes_${today()}.xlsx`)
    showToast('Excel exportado')
  }

  const exportAnticiposExcel = () => {
    const rows: (string | number)[][] = [['Fecha', 'Trabajador', 'Tipo', 'Monto', 'Mes desc.', 'Año', 'Estado', 'Descripción']]
    db.anticipos.forEach((a) =>
      rows.push([a.fecha, a.trabajadorNombre, a.tipo, a.monto, a.mesDescuento + 1, a.anioDescuento, a.estado, a.desc]),
    )
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Anticipos')
    XLSX.writeFile(wb, `Anticipos_${today()}.xlsx`)
    showToast('Excel exportado')
  }

  const exportConfigExcel = () => {
    const e = settings.empresa
    const b = settings.banco
    const p = settings.pdf
    const rows: (string | number)[][] = [
      ['Campo', 'Valor'],
      ['Nombre taller', e.nombre],
      ['RUT', e.rut],
      ['Teléfono', e.tel],
      ['Email', e.email],
      ['Dirección', e.dir],
      ['Ciudad', e.ciudad],
      ['Región', e.region],
      ['Web', e.web],
      ['Slogan', e.slogan],
      ['Banco', b.banco],
      ['Tipo cuenta', b.tipoCuenta],
      ['N° cuenta', b.nCuenta],
      ['RUT titular', b.rutTitular],
      ['Titular', b.nombreTitular],
      ['Email pagos', b.emailConfirmacion],
      ['Validez cot. días', p.validezCotDias],
      ['Pie OT', p.pieOT],
      ['Pie cotización', p.pieCot],
      ['Nota legal', p.notaLegal],
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Configuración')
    XLSX.writeFile(wb, `Configuracion_${today()}.xlsx`)
    showToast('Excel exportado')
  }

  const globalSearch = (q: string) => {
    setGlobalQ(q)
    const s = q.trim().toLowerCase()
    if (!s) return
    if (db.clientes.some((c) => c.nombre.toLowerCase().includes(s) || c.rut.toLowerCase().includes(s))) setSection('clientes')
    else if (db.vehiculos.some((v) => v.patente.toLowerCase().includes(s))) setSection('vehiculos')
    else if (
      db.inventario.some(
        (p) => p.nombre.toLowerCase().includes(s) || (p.codigo || '').toLowerCase().includes(s),
      )
    )
      setSection('inventario')
    else if (db.mecanicos.some((m) => m.nombre.toLowerCase().includes(s))) setSection('mecanicos')
    else if (
      db.cotizaciones.some(
        (c) =>
          c.folio.toLowerCase().includes(s) ||
          c.clienteNombre.toLowerCase().includes(s) ||
          (c.patente || '').toLowerCase().includes(s),
      )
    )
      setSection('cotizaciones')
    else if (
      db.ordenes.some(
        (o) =>
          o.folio.toLowerCase().includes(s) ||
          o.clienteNombre.toLowerCase().includes(s) ||
          (o.patente || '').toLowerCase().includes(s),
      )
    )
      setSection('ordenes')
    else if (
      db.ventas.some(
        (v) =>
          v.folio.toLowerCase().includes(s) ||
          v.clienteNombre.toLowerCase().includes(s) ||
          (v.patente || '').toLowerCase().includes(s),
      )
    )
      setSection('ventas')
    else if (
      db.creditos.some(
        (c) =>
          c.clienteNombre.toLowerCase().includes(s) || (c.desc || '').toLowerCase().includes(s),
      )
    )
      setSection('creditos')
    else if (db.gastos.some((g) => g.desc.toLowerCase().includes(s) || g.categoria.toLowerCase().includes(s)))
      setSection('gastos')
  }

  return (
    <div className="layout">
      {toast && <div className={`toast-float toast-${toast.type}`}>{toast.msg}</div>}

      <nav className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-mark">🔧</div>
          <div className="logo-title">{settings.empresa.nombre}</div>
          <div className="logo-sub">Sistema de gestión</div>
        </div>
        <div className="sidebar-nav">
          <div className="nav-group">General</div>
          <button type="button" className={section === 'dashboard' ? 'nav-item active' : 'nav-item'} onClick={() => setSection('dashboard')}>
            <span className="ni">📊</span>
            <span>Dashboard</span>
          </button>
          <div className="nav-group">Maestros</div>
          <button type="button" className={section === 'clientes' ? 'nav-item active' : 'nav-item'} onClick={() => setSection('clientes')}>
            <span className="ni">👤</span>
            <span>Clientes</span>
          </button>
          <button type="button" className={section === 'vehiculos' ? 'nav-item active' : 'nav-item'} onClick={() => setSection('vehiculos')}>
            <span className="ni">🚗</span>
            <span>Vehículos</span>
          </button>
          <button type="button" className={section === 'inventario' ? 'nav-item active' : 'nav-item'} onClick={() => setSection('inventario')}>
            <span className="ni">📦</span>
            <span>Inventario</span>
          </button>
          <button type="button" className={section === 'mecanicos' ? 'nav-item active' : 'nav-item'} onClick={() => setSection('mecanicos')}>
            <span className="ni">👷</span>
            <span>Mecánicos</span>
          </button>
          <div className="nav-group">Operaciones</div>
          <button type="button" className={section === 'cotizaciones' ? 'nav-item active' : 'nav-item'} onClick={() => setSection('cotizaciones')}>
            <span className="ni">📝</span>
            <span>Cotizaciones</span>
            {badgeCot > 0 && <span className="nav-badge">{badgeCot}</span>}
          </button>
          <button type="button" className={section === 'ordenes' ? 'nav-item active' : 'nav-item'} onClick={() => setSection('ordenes')}>
            <span className="ni">🔧</span>
            <span>Órdenes de Trabajo</span>
          </button>
          <button type="button" className={section === 'ventas' ? 'nav-item active' : 'nav-item'} onClick={() => setSection('ventas')}>
            <span className="ni">🧾</span>
            <span>Ventas</span>
          </button>
          <div className="nav-group">Informes</div>
          <button type="button" className={section === 'informes' ? 'nav-item active' : 'nav-item'} onClick={() => setSection('informes')}>
            <span className="ni">🔍</span>
            <span>Historial Cli./Veh.</span>
          </button>
          <div className="nav-group">Finanzas</div>
          <button type="button" className={section === 'creditos' ? 'nav-item active' : 'nav-item'} onClick={() => setSection('creditos')}>
            <span className="ni">💳</span>
            <span>Cuentas por Cobrar</span>
            {badgeCred > 0 && <span className="nav-badge">{badgeCred}</span>}
          </button>
          <button type="button" className={section === 'gastos' ? 'nav-item active' : 'nav-item'} onClick={() => setSection('gastos')}>
            <span className="ni">💸</span>
            <span>Gastos</span>
          </button>
          <button type="button" className={section === 'reportes' ? 'nav-item active' : 'nav-item'} onClick={() => setSection('reportes')}>
            <span className="ni">📈</span>
            <span>Reportes</span>
          </button>
          <button type="button" className={section === 'anticipos' ? 'nav-item active' : 'nav-item'} onClick={() => setSection('anticipos')}>
            <span className="ni">📋</span>
            <span>Anticipos / Préstamos</span>
          </button>
          <div className="nav-group">Sistema</div>
          <button type="button" className={section === 'config' ? 'nav-item active' : 'nav-item'} onClick={() => setSection('config')}>
            <span className="ni">⚙️</span>
            <span>Configuración</span>
          </button>
        </div>
        <div className="sidebar-footer">Resortes PM</div>
      </nav>

      <div className="main">
        <header className="topbar">
          <div className="topbar-left">
            <div className="tb-title">{titles[section][0]}</div>
            <div className="tb-sub">{titles[section][1]}</div>
          </div>
          <div className="topbar-right no-print">
            <input
              className="global-search"
              placeholder="🔍 Búsqueda global..."
              value={globalQ}
              onChange={(e) => setGlobalQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && globalSearch(globalQ)}
            />
            <button type="button" className="btn btn-ghost btn-sm btn-icon" title="Modo oscuro" onClick={() => setDark((d) => !d)}>
              {dark ? '☀️' : '🌙'}
            </button>
            {section === 'clientes' && (
              <button type="button" className="btn btn-sm btn-excel" onClick={exportClientesExcel}>
                ⬇ Excel
              </button>
            )}
            {section === 'inventario' && (
              <button type="button" className="btn btn-sm btn-excel" onClick={exportInventarioExcel}>
                ⬇ Excel
              </button>
            )}
            {section === 'mecanicos' && (
              <button type="button" className="btn btn-sm btn-excel" onClick={exportMecanicosExcel}>
                ⬇ Excel
              </button>
            )}
            {section === 'cotizaciones' && (
              <button type="button" className="btn btn-sm btn-excel" onClick={exportCotizacionesExcel}>
                ⬇ Excel
              </button>
            )}
            {section === 'ordenes' && (
              <button type="button" className="btn btn-sm btn-excel" onClick={exportOrdenesExcel}>
                ⬇ Excel
              </button>
            )}
            {section === 'ventas' && (
              <button type="button" className="btn btn-sm btn-excel" onClick={exportVentasExcel}>
                ⬇ Excel
              </button>
            )}
            {section === 'informes' && (
              <button type="button" className="btn btn-sm btn-excel" onClick={exportInformesResumen}>
                ⬇ Excel
              </button>
            )}
            {section === 'creditos' && (
              <button type="button" className="btn btn-sm btn-excel" onClick={exportCreditosExcel}>
                ⬇ Excel
              </button>
            )}
            {section === 'gastos' && (
              <button type="button" className="btn btn-sm btn-excel" onClick={exportGastosExcel}>
                ⬇ Excel
              </button>
            )}
            {section === 'reportes' && (
              <button type="button" className="btn btn-sm btn-excel" onClick={exportReportesExcel}>
                ⬇ Excel
              </button>
            )}
            {section === 'anticipos' && (
              <button type="button" className="btn btn-sm btn-excel" onClick={exportAnticiposExcel}>
                ⬇ Excel
              </button>
            )}
            {section === 'config' && (
              <button type="button" className="btn btn-sm btn-excel" onClick={exportConfigExcel}>
                ⬇ Excel
              </button>
            )}
          </div>
        </header>

        <div className="content">
          {section === 'dashboard' && (
            <>
              <div className="stats">
                <div className="stat">
                  <div className="stat-lbl">Ingresos totales</div>
                  <div className="stat-val">{fmt(ingTotal)}</div>
                  <div className="stat-sub">acumulado ventas</div>
                </div>
                <div className="stat">
                  <div className="stat-lbl">Utilidad</div>
                  <div className="stat-val" style={{ color: ingTotal - gasTotal >= 0 ? 'var(--green)' : 'var(--red)' }}>
                    {fmt(ingTotal - gasTotal)}
                  </div>
                </div>
                <button type="button" className="stat stat-click" onClick={() => setSection('creditos')}>
                  <div className="stat-lbl">Por cobrar</div>
                  <div className="stat-val" style={{ color: 'var(--red)' }}>
                    {fmt(porCobrar)}
                  </div>
                </button>
                <div className="stat">
                  <div className="stat-lbl">Órdenes activas</div>
                  <div className="stat-val">{db.ordenes.filter((o) => o.estado !== 'Entregado').length}</div>
                </div>
                <div className="stat">
                  <div className="stat-lbl">Clientes</div>
                  <div className="stat-val">{db.clientes.length}</div>
                  <div className="stat-sub">{db.vehiculos.length} vehículos</div>
                </div>
              </div>
              <div className="grid-2">
                <div className="card">
                  <div className="card-title">
                    <div className="card-title-left">Ingresos por mes</div>
                  </div>
                  <div className="chart-bars">
                    {ing6.map((d) => (
                      <div key={d.label} className="chart-bar-wrap">
                        <div className="chart-val">{d.value ? fmt(d.value) : ''}</div>
                        <div className="chart-bar" style={{ height: `${Math.round((d.value / maxBar) * 160) || 2}px` }} />
                        <div className="chart-lbl">{d.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="card">
                  <div className="card-title">
                    <div className="card-title-left">Órdenes activas</div>
                  </div>
                  {activasOT.length ? (
                    <div className="tw">
                      <table>
                        <thead>
                          <tr>
                            <th>OT</th>
                            <th>Cliente</th>
                            <th>Estado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activasOT.map((o) => (
                            <tr key={o.folio}>
                              <td>{o.folio}</td>
                              <td>{o.clienteNombre}</td>
                              <td>{o.estado}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="empty">Sin órdenes activas</div>
                  )}
                </div>
              </div>
            </>
          )}
          {section === 'clientes' && (
            <ClientesModule
              db={db}
              setDb={setDb}
              showToast={showToast}
              onIrVehiculo={(id) => {
                setVehClientePref(id)
                setSection('vehiculos')
              }}
            />
          )}
          {section === 'vehiculos' && (
            <VehiculosPane
              db={db}
              setDb={setDb}
              showToast={showToast}
              vehClientePref={vehClientePref}
              setVehClientePref={setVehClientePref}
            />
          )}
          {section === 'inventario' && <InventarioModule db={db} setDb={setDb} showToast={showToast} />}
          {section === 'mecanicos' && <MecanicosModule db={db} setDb={setDb} showToast={showToast} />}
          {section === 'cotizaciones' && <CotizacionesModule db={db} setDb={setDb} showToast={showToast} />}
          {section === 'ordenes' && <OrdenesModule db={db} setDb={setDb} showToast={showToast} />}
          {section === 'ventas' && <VentasModule db={db} setDb={setDb} showToast={showToast} />}
          {section === 'informes' && <InformesModule db={db} showToast={showToast} />}
          {section === 'creditos' && <CreditosModule db={db} setDb={setDb} showToast={showToast} />}
          {section === 'gastos' && <GastosModule db={db} setDb={setDb} showToast={showToast} />}
          {section === 'reportes' && <ReportesModule db={db} />}
          {section === 'anticipos' && <AnticiposModule db={db} setDb={setDb} showToast={showToast} />}
          {section === 'config' && (
            <ConfigModule
              settings={settings}
              setSettings={setSettings}
              db={db}
              setDb={setDb}
              emptyDb={emptyDb}
              showToast={showToast}
            />
          )}
          {section !== 'dashboard' &&
            section !== 'clientes' &&
            section !== 'vehiculos' &&
            section !== 'inventario' &&
            section !== 'mecanicos' &&
            section !== 'cotizaciones' &&
            section !== 'ordenes' &&
            section !== 'ventas' &&
            section !== 'informes' &&
            section !== 'creditos' &&
            section !== 'gastos' &&
            section !== 'reportes' &&
            section !== 'anticipos' &&
            section !== 'config' && (
            <div className="card">
              <p>
                Módulo <strong>{titles[section][0]}</strong> — próximamente.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
