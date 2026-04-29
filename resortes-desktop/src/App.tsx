import {
  type Dispatch,
  type FormEvent,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import * as XLSX from 'xlsx'
import type { AppSettings, Db, Gasto, Vehiculo, Venta } from './appTypes'
import { ConfigModule } from './ConfigModule'
import { defaultAppSettings } from './appSettings'
import { AnticiposModule } from './AnticiposModule'
import { CreditosModule } from './CreditosModule'
import { GastosModule } from './GastosModule'
import { AgendaModule } from './AgendaModule'
import { ReportesModule } from './ReportesModule'
import { ClientesModule } from './ClientesModule'
import { CotizacionesModule } from './CotizacionesModule'
import { InformesModule } from './InformesModule'
import { InventarioModule } from './InventarioModule'
import { MecanicosModule } from './MecanicosModule'
import { OrdenesModule } from './OrdenesModule'
import { VentasModule } from './VentasModule'
import { VacacionesModule } from './VacacionesModule'
import { ProveedoresModule } from './ProveedoresModule'
import { isSupabaseConfigured, loadOnlineDb, loadOnlineSettings, saveOnlineAll } from './supabaseOnline'
import './App.css'

const LS_THEME = 'rpm_theme'
const LS_PIN_ADMIN = 'rpm_pin_admin'
const LS_PIN_VENDEDOR = 'rpm_pin_vendedor'

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
  | 'agenda'
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
  | 'vacaciones'
  | 'proveedores'
  | 'config'

type UserRole = 'admin' | 'vendedor'

function getPinAdmin() {
  return localStorage.getItem(LS_PIN_ADMIN) || '1749'
}

function getPinVendedor() {
  return localStorage.getItem(LS_PIN_VENDEDOR) || '1120'
}

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
  agenda: ['Agenda', 'Notas, recordatorios y reservas'],
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
  vacaciones: ['Vacaciones', 'Control de períodos de descanso'],
  proveedores: ['Proveedores', 'Gestión de proveedores y compras'],
  config: ['Configuración', 'Datos del taller, documentos y backup'],
}

export default function App() {
  const hasSupabase = isSupabaseConfigured()
  const [db, setDb] = useState<Db>(() => emptyDb())
  const [settings, setSettings] = useState<AppSettings>(() => defaultAppSettings())
  const [cloudReady, setCloudReady] = useState(false)
  const [cloudBusy, setCloudBusy] = useState(hasSupabase)
  const [section, setSection] = useState<Section>('dashboard')
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' | 'warn' } | null>(null)
  const [globalQ, setGlobalQ] = useState('')
  const [dark, setDark] = useState(() => localStorage.getItem(LS_THEME) === 'dark')
  const [vehClientePref, setVehClientePref] = useState('')
  const [role, setRole] = useState<UserRole>('admin')
  const [pin, setPin] = useState('')
  const [pinErr, setPinErr] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const dbRef = useRef(db)
  const settingsRef = useRef(settings)
  const restrictedForSeller = useMemo<Section[]>(() => ['anticipos', 'vacaciones', 'gastos', 'reportes', 'config'], [])

  const showToast = (msg: string, type: 'ok' | 'err' | 'warn' = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3200)
  }

  useEffect(() => {
    dbRef.current = db
  }, [db])
  useEffect(() => {
    settingsRef.current = settings
  }, [settings])

  const purgeLegacyLocalDb = () => {
    try {
      localStorage.removeItem('rpm_ts3_db_v1')
      localStorage.removeItem('rpm_app_settings_v1')
      localStorage.removeItem('rpm_cfg_empresa')
    } catch {
      /* ignore */
    }
  }

  const pullFromSupabase = useCallback(async (): Promise<boolean> => {
    if (!hasSupabase) return false
    setCloudBusy(true)
    const remote = await loadOnlineDb()
    const remoteSettings = await loadOnlineSettings()
    setCloudBusy(false)
    if (remote) {
      setDb(remote)
      purgeLegacyLocalDb()
      setCloudReady(true)
      if (remoteSettings) {
        setSettings({
          ...defaultAppSettings(),
          ...remoteSettings,
          empresa: { ...defaultAppSettings().empresa, ...(remoteSettings.empresa ?? {}) },
          banco: { ...defaultAppSettings().banco, ...(remoteSettings.banco ?? {}) },
          pdf: { ...defaultAppSettings().pdf, ...(remoteSettings.pdf ?? {}) },
          logoDataUrl: remoteSettings.logoDataUrl ?? null,
          extras: {
            ...defaultAppSettings().extras,
            ...(remoteSettings.extras ?? {}),
            agendaNotas: remoteSettings.extras?.agendaNotas ?? defaultAppSettings().extras.agendaNotas,
            agendaRecordatorios:
              remoteSettings.extras?.agendaRecordatorios ?? defaultAppSettings().extras.agendaRecordatorios,
            agendaReservas: remoteSettings.extras?.agendaReservas ?? defaultAppSettings().extras.agendaReservas,
            vacaciones: remoteSettings.extras?.vacaciones ?? defaultAppSettings().extras.vacaciones,
            proveedores: remoteSettings.extras?.proveedores ?? defaultAppSettings().extras.proveedores,
            compras: remoteSettings.extras?.compras ?? defaultAppSettings().extras.compras,
          },
        })
      }
      return true
    }
    setCloudReady(false)
    setDb(emptyDb())
    return false
  }, [hasSupabase])

  useEffect(() => {
    if (!hasSupabase) return
    let cancelled = false
    void (async () => {
      const ok = await pullFromSupabase()
      if (cancelled) return
      if (!ok) {
        setToast({
          msg: 'No se pudo cargar desde Supabase. Revisa red, URL, clave y tablas.',
          type: 'err',
        })
        setTimeout(() => setToast(null), 5200)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [hasSupabase, pullFromSupabase])

  useEffect(() => {
    if (!hasSupabase || !cloudReady) return
    const flush = () => void saveOnlineAll(dbRef.current, settingsRef.current)
    window.addEventListener('pagehide', flush)
    return () => window.removeEventListener('pagehide', flush)
  }, [hasSupabase, cloudReady])

  useEffect(() => {
    if (!hasSupabase || !cloudReady) return
    const t = window.setTimeout(() => {
      void (async () => {
        const ok = await saveOnlineAll(db, settings)
        if (!ok) showToast('Error al guardar en Supabase', 'err')
      })()
    }, 200)
    return () => window.clearTimeout(t)
  }, [db, settings, hasSupabase, cloudReady])

  useEffect(() => {
    localStorage.setItem(LS_THEME, dark ? 'dark' : 'light')
    document.documentElement.classList.toggle('theme-dark', dark)
  }, [dark])

  useEffect(() => {
    if (role !== 'vendedor') return
    if (restrictedForSeller.includes(section)) setSection('dashboard')
  }, [role, restrictedForSeller, section])

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

  const appBlocked = !hasSupabase || !cloudReady
  const roleBlocked = (s: Section) => role === 'vendedor' && restrictedForSeller.includes(s)

  const onUnlock = (e: FormEvent) => {
    e.preventDefault()
    const ok = role === 'admin' ? pin === getPinAdmin() : pin === getPinVendedor()
    if (!ok) {
      setPinErr('PIN incorrecto')
      return
    }
    setPinErr('')
    setUnlocked(true)
    setPin('')
  }

  return (
    <div className="layout">
      {!unlocked && (
        <div className="cloud-offline-overlay" role="dialog" aria-modal>
          <p className="cloud-offline-title">Bienvenido</p>
          <p className="cloud-offline-hint">Ingresa tu PIN para continuar</p>
          <form className="pin-login-card" onSubmit={onUnlock}>
            <div className="pin-role-switch">
              <button
                type="button"
                className={role === 'admin' ? 'pin-role-btn active' : 'pin-role-btn'}
                onClick={() => {
                  setRole('admin')
                  setPinErr('')
                }}
              >
                Administrador
              </button>
              <button
                type="button"
                className={role === 'vendedor' ? 'pin-role-btn active' : 'pin-role-btn'}
                onClick={() => {
                  setRole('vendedor')
                  setPinErr('')
                }}
              >
                Vendedor
              </button>
            </div>
            <div className="field">
              <label>PIN de acceso</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value)
                  setPinErr('')
                }}
                placeholder="••••"
                autoFocus
              />
            </div>
            {pinErr && <div className="pin-error">{pinErr}</div>}
            <button type="submit" className="btn btn-primary">
              Ingresar
            </button>
          </form>
        </div>
      )}
      {appBlocked && (
        <div className="cloud-offline-overlay" role="alertdialog" aria-live="assertive" aria-busy={cloudBusy}>
          {!hasSupabase ? (
            <>
              <p className="cloud-offline-title">Esta aplicación usa solo Supabase</p>
              <p className="cloud-offline-hint">
                Crea el archivo <code>.env</code> en la carpeta <code>resortes-desktop</code> con{' '}
                <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code>, luego reinicia la app
                (por ejemplo <code>npm run tauri:dev</code>).
              </p>
            </>
          ) : (
            <>
              <p className="cloud-offline-title">
                {cloudBusy ? 'Cargando datos desde Supabase…' : 'No se pudo conectar a Supabase.'}
              </p>
              <p className="cloud-offline-hint">
                Clientes, ventas, inventario y configuración del taller están únicamente en la nube.
              </p>
              {!cloudBusy && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    void pullFromSupabase().then((ok) => {
                      if (!ok) showToast('Sigue sin haber conexión con Supabase', 'err')
                    })
                  }}
                >
                  Reintentar
                </button>
              )}
            </>
          )}
        </div>
      )}
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
          <button type="button" className={section === 'agenda' ? 'nav-item active' : 'nav-item'} onClick={() => setSection('agenda')}>
            <span className="ni">📅</span>
            <span>Agenda</span>
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
          <button
            type="button"
            className={section === 'gastos' ? 'nav-item active' : 'nav-item'}
            onClick={() => !roleBlocked('gastos') && setSection('gastos')}
            disabled={roleBlocked('gastos')}
          >
            <span className="ni">💸</span>
            <span>Gastos</span>
          </button>
          <button
            type="button"
            className={section === 'reportes' ? 'nav-item active' : 'nav-item'}
            onClick={() => !roleBlocked('reportes') && setSection('reportes')}
            disabled={roleBlocked('reportes')}
          >
            <span className="ni">📈</span>
            <span>Reportes</span>
          </button>
          <button
            type="button"
            className={section === 'anticipos' ? 'nav-item active' : 'nav-item'}
            onClick={() => !roleBlocked('anticipos') && setSection('anticipos')}
            disabled={roleBlocked('anticipos')}
          >
            <span className="ni">📋</span>
            <span>Anticipos / Préstamos</span>
          </button>
          <button
            type="button"
            className={section === 'vacaciones' ? 'nav-item active' : 'nav-item'}
            onClick={() => !roleBlocked('vacaciones') && setSection('vacaciones')}
            disabled={roleBlocked('vacaciones')}
          >
            <span className="ni">🏖️</span>
            <span>Vacaciones</span>
          </button>
          <div className="nav-group">Sistema</div>
          <button type="button" className={section === 'proveedores' ? 'nav-item active' : 'nav-item'} onClick={() => setSection('proveedores')}>
            <span className="ni">🏭</span>
            <span>Proveedores</span>
          </button>
          <button
            type="button"
            className={section === 'config' ? 'nav-item active' : 'nav-item'}
            onClick={() => !roleBlocked('config') && setSection('config')}
            disabled={roleBlocked('config')}
          >
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
            {hasSupabase && cloudReady && (
              <span className="cloud-badge" title="Solo Supabase: datos y configuración del taller en la nube">
                Solo Supabase
              </span>
            )}
            <button type="button" className="btn btn-ghost btn-sm btn-icon" title="Modo oscuro" onClick={() => setDark((d) => !d)}>
              {dark ? '☀️' : '🌙'}
            </button>
            <button type="button" className="btn btn-sm" onClick={() => setUnlocked(false)}>
              Cerrar sesión
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
          {section === 'agenda' && <AgendaModule settings={settings} setSettings={setSettings} showToast={showToast} />}
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
          {section === 'vacaciones' && (
            <VacacionesModule db={db} settings={settings} setSettings={setSettings} showToast={showToast} />
          )}
          {section === 'proveedores' && (
            <ProveedoresModule settings={settings} setSettings={setSettings} showToast={showToast} />
          )}
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
            section !== 'agenda' &&
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
            section !== 'vacaciones' &&
            section !== 'proveedores' &&
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
