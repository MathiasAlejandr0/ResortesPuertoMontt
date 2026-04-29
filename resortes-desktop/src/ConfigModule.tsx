import { type ChangeEvent, type Dispatch, type SetStateAction, useRef } from 'react'
import type { AppSettings, Db } from './appTypes'
import { defaultAppSettings } from './appSettings'

const TIPOS_CUENTA = ['Corriente', 'Vista', 'Cuenta RUT', 'Otro']

type Props = {
  settings: AppSettings
  setSettings: Dispatch<SetStateAction<AppSettings>>
  db: Db
  setDb: Dispatch<SetStateAction<Db>>
  emptyDb: () => Db
  showToast: (msg: string, type?: 'ok' | 'err' | 'warn') => void
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function ConfigModule({ settings, setSettings, db, setDb, emptyDb, showToast }: Props) {
  const fileLogoRef = useRef<HTMLInputElement>(null)
  const fileImportRef = useRef<HTMLInputElement>(null)

  const setEmp = (patch: Partial<AppSettings['empresa']>) => {
    setSettings((s) => ({ ...s, empresa: { ...s.empresa, ...patch } }))
  }
  const setBan = (patch: Partial<AppSettings['banco']>) => {
    setSettings((s) => ({ ...s, banco: { ...s.banco, ...patch } }))
  }
  const setPdf = (patch: Partial<AppSettings['pdf']>) => {
    setSettings((s) => ({ ...s, pdf: { ...s.pdf, ...patch } }))
  }

  const guardarEmpresa = () => {
    if (!settings.empresa.nombre.trim()) {
      showToast('El nombre del taller es obligatorio', 'err')
      return
    }
    showToast('Datos del taller guardados')
  }

  const guardarBanco = () => {
    showToast('Datos bancarios guardados')
  }

  const guardarPdf = () => {
    showToast('Opciones PDF guardadas')
  }

  const onLogo = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (!/^image\/(png|jpeg|jpg|svg\+xml|svg)$/.test(f.type) && !f.name.toLowerCase().endsWith('.svg')) {
      showToast('Usa PNG, JPG o SVG', 'err')
      return
    }
    if (f.size > 1.8 * 1024 * 1024) {
      showToast('La imagen es demasiado grande (máx. ~1,8 MB)', 'err')
      return
    }
    const r = new FileReader()
    r.onload = () => {
      const data = String(r.result || '')
      setSettings((s) => ({ ...s, logoDataUrl: data }))
      showToast('Logo actualizado')
    }
    r.readAsDataURL(f)
  }

  const quitarLogo = () => {
    setSettings((s) => ({ ...s, logoDataUrl: null }))
    showToast('Logo quitado')
  }

  const previewOT = () => {
    const w = window.open('', '_blank')
    if (!w) return
    const { empresa, pdf, logoDataUrl } = settings
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Vista previa OT</title>
    <style>body{font-family:Segoe UI,system-ui,sans-serif;padding:28px;max-width:720px;margin:0 auto;color:#111}
    .logo{max-height:72px;margin-bottom:12px} h1{font-size:20px;margin:0 0 8px} .muted{color:#555;font-size:13px}
    table{width:100%;border-collapse:collapse;margin:16px 0} th,td{border:1px solid #ccc;padding:8px;font-size:13px;text-align:left}
    .pie{margin-top:24px;font-size:12px;border-top:1px solid #ddd;padding-top:12px}</style></head><body>
    ${logoDataUrl ? `<img class="logo" src="${logoDataUrl}" alt="Logo"/>` : ''}
    <h1>${escapeHtml(empresa.nombre)}</h1>
    <p class="muted">Orden de trabajo — vista previa</p>
    <table><thead><tr><th>OT</th><th>Cliente</th><th>Patente</th><th>Total</th></tr></thead>
    <tbody><tr><td>OT-0001</td><td>Ejemplo</td><td>ABCD12</td><td>$150.000</td></tr></tbody></table>
    <div class="pie">${escapeHtml(pdf.pieOT || 'Garantía 30 días mano de obra...')}</div>
    <p class="muted" style="margin-top:16px;font-size:11px">${escapeHtml(pdf.notaLegal || '')}</p>
    </body></html>`)
    w.document.close()
  }

  const previewCot = () => {
    const w = window.open('', '_blank')
    if (!w) return
    const { empresa, pdf, logoDataUrl } = settings
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Vista previa cotización</title>
    <style>body{font-family:Segoe UI,system-ui,sans-serif;padding:28px;max-width:720px;margin:0 auto;color:#111}
    .logo{max-height:72px;margin-bottom:12px} h1{font-size:20px;margin:0 0 8px} .muted{color:#555;font-size:13px}
    .pie{margin-top:24px;font-size:12px;border-top:1px solid #ddd;padding-top:12px}</style></head><body>
    ${logoDataUrl ? `<img class="logo" src="${logoDataUrl}" alt="Logo"/>` : ''}
    <h1>${escapeHtml(empresa.nombre)}</h1>
    <p class="muted">Cotización COT-0001 — válida ${pdf.validezCotDias || 30} días</p>
    <div class="pie">${escapeHtml(pdf.pieCot || 'Precios sujetos a disponibilidad..')}</div>
    <p class="muted" style="margin-top:16px;font-size:11px">${escapeHtml(pdf.notaLegal || '')}</p>
    </body></html>`)
    w.document.close()
  }

  const exportBackup = () => {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      db,
      settings,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `resortes_backup_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
    showToast('Backup descargado')
  }

  const onImportFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    const r = new FileReader()
    r.onload = () => {
      try {
        const data = JSON.parse(String(r.result)) as { db?: Db; settings?: AppSettings }
        if (!data.db) {
          showToast('El archivo no contiene datos válidos', 'err')
          return
        }
        if (!window.confirm('Se reemplazarán todos los datos actuales. ¿Continuar?')) return
        setDb(data.db)
        if (data.settings) {
          const merged = {
            ...defaultAppSettings(),
            ...data.settings,
            empresa: { ...defaultAppSettings().empresa, ...data.settings.empresa },
            banco: { ...defaultAppSettings().banco, ...data.settings.banco },
            pdf: { ...defaultAppSettings().pdf, ...data.settings.pdf },
            logoDataUrl: data.settings.logoDataUrl ?? null,
          }
          setSettings(merged)
        }
        showToast('Backup importado (se guardará en Supabase al sincronizar)')
      } catch {
        showToast('No se pudo leer el archivo', 'err')
      }
    }
    r.readAsText(f)
  }

  const borrarDatos = () => {
    if (
      !window.confirm(
        '¿Eliminar todos los datos del taller (clientes, ventas, inventario, etc.)? La configuración se mantiene.',
      )
    )
      return
    setDb(emptyDb())
    showToast('Datos operativos borrados')
  }

  return (
    <>
      <div className="card card-config">
        <div className="card-title">
          <div className="card-title-left">
            <span className="cfg-ico">🏢</span> Datos del taller
          </div>
        </div>
        <div className="g3 cfg-grid">
          <div className="field">
            <label>Nombre del taller *</label>
            <input value={settings.empresa.nombre} onChange={(e) => setEmp({ nombre: e.target.value })} />
          </div>
          <div className="field">
            <label>RUT empresa</label>
            <input value={settings.empresa.rut} onChange={(e) => setEmp({ rut: e.target.value })} placeholder="76.123.456-7" />
          </div>
          <div className="field">
            <label>Teléfono</label>
            <input value={settings.empresa.tel} onChange={(e) => setEmp({ tel: e.target.value })} placeholder="+56 9..." />
          </div>
          <div className="field">
            <label>Email</label>
            <input type="email" value={settings.empresa.email} onChange={(e) => setEmp({ email: e.target.value })} />
          </div>
          <div className="field">
            <label>Dirección</label>
            <input value={settings.empresa.dir} onChange={(e) => setEmp({ dir: e.target.value })} placeholder="Calle, N°, Ciudad" />
          </div>
          <div className="field">
            <label>Ciudad / comuna</label>
            <input value={settings.empresa.ciudad} onChange={(e) => setEmp({ ciudad: e.target.value })} />
          </div>
          <div className="field">
            <label>Región</label>
            <input value={settings.empresa.region} onChange={(e) => setEmp({ region: e.target.value })} />
          </div>
          <div className="field">
            <label>Sitio web</label>
            <input value={settings.empresa.web} onChange={(e) => setEmp({ web: e.target.value })} placeholder="www..." />
          </div>
          <div className="field field-span-full">
            <label>Slogan</label>
            <input
              value={settings.empresa.slogan}
              onChange={(e) => setEmp({ slogan: e.target.value })}
              placeholder="Ej: Especialistas en suspensión y dirección"
            />
          </div>
        </div>
        <div className="form-row-actions">
          <button type="button" className="btn btn-primary btn-guardar" onClick={guardarEmpresa}>
            ✓ Guardar datos del taller
          </button>
        </div>
      </div>

      <div className="card card-config">
        <div className="card-title">
          <div className="card-title-left">
            <span className="cfg-ico">💳</span> Datos bancarios
          </div>
          <span className="cred-hint">— aparecen en cotizaciones y ventas para pagos por transferencia</span>
        </div>
        <div className="g3 cfg-grid">
          <div className="field">
            <label>Banco</label>
            <input
              value={settings.banco.banco}
              onChange={(e) => setBan({ banco: e.target.value })}
              placeholder="Ej: Banco Estado, Scotiabank..."
            />
          </div>
          <div className="field">
            <label>Tipo de cuenta</label>
            <select value={settings.banco.tipoCuenta} onChange={(e) => setBan({ tipoCuenta: e.target.value })}>
              <option value="">— Seleccionar —</option>
              {TIPOS_CUENTA.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>N° de cuenta</label>
            <input value={settings.banco.nCuenta} onChange={(e) => setBan({ nCuenta: e.target.value })} />
          </div>
          <div className="field">
            <label>RUT titular</label>
            <input value={settings.banco.rutTitular} onChange={(e) => setBan({ rutTitular: e.target.value })} />
          </div>
          <div className="field">
            <label>Nombre titular</label>
            <input
              value={settings.banco.nombreTitular}
              onChange={(e) => setBan({ nombreTitular: e.target.value })}
              placeholder="Juan Pérez / Empresa Ltda."
            />
          </div>
          <div className="field">
            <label>Email para confirmación</label>
            <input
              type="email"
              value={settings.banco.emailConfirmacion}
              onChange={(e) => setBan({ emailConfirmacion: e.target.value })}
            />
          </div>
        </div>
        <div className="form-row-actions">
          <button type="button" className="btn btn-primary btn-guardar" onClick={guardarBanco}>
            ✓ Guardar datos bancarios
          </button>
        </div>
      </div>

      <div className="card card-config">
        <div className="card-title card-title-row">
          <div className="card-title-left">
            <span className="cfg-ico">🖼️</span> Logo del taller
          </div>
          <span className="cred-hint">Aparece en todos los documentos PDF</span>
        </div>
        <div className="cfg-logo-row">
          <div className="cfg-logo-preview">
            {settings.logoDataUrl ? (
              <img src={settings.logoDataUrl} alt="Logo taller" className="cfg-logo-img" />
            ) : (
              <span className="cfg-sin-logo">Sin logo</span>
            )}
          </div>
          <div className="cfg-logo-upload">
            <input ref={fileLogoRef} type="file" accept="image/png,image/jpeg,image/jpg,image/svg+xml,.svg" className="inv-file-input" onChange={onLogo} />
            <p className="cfg-upload-label">Cargar imagen</p>
            <button type="button" className="btn btn-outline" onClick={() => fileLogoRef.current?.click()}>
              📁 Seleccionar imagen
            </button>
            <p className="cfg-formats">PNG, JPG o SVG — Recomendado: fondo transparente</p>
            {settings.logoDataUrl && (
              <button type="button" className="btn btn-xs btn-red cfg-quitar-logo" onClick={quitarLogo}>
                Quitar logo
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="card card-config">
        <div className="card-title">
          <div className="card-title-left">
            <span className="cfg-ico">📄</span> Documentos PDF
          </div>
        </div>
        <div className="g3 cfg-grid">
          <div className="field">
            <label>Validez cotizaciones (días)</label>
            <input
              type="number"
              min={1}
              step={1}
              value={settings.pdf.validezCotDias}
              onChange={(e) => setPdf({ validezCotDias: Math.max(1, Number(e.target.value) || 30) })}
            />
          </div>
          <div className="field field-span-full">
            <label>Texto pie de OT</label>
            <input
              value={settings.pdf.pieOT}
              onChange={(e) => setPdf({ pieOT: e.target.value })}
              placeholder="Garantía 30 días mano de obra..."
            />
          </div>
          <div className="field field-span-full">
            <label>Texto pie de cotización</label>
            <input
              value={settings.pdf.pieCot}
              onChange={(e) => setPdf({ pieCot: e.target.value })}
              placeholder="Precios sujetos a disponibilidad.."
            />
          </div>
          <div className="field field-span-full">
            <label>Nota legal (pie de todos los documentos)</label>
            <textarea
              rows={3}
              value={settings.pdf.notaLegal}
              onChange={(e) => setPdf({ notaLegal: e.target.value })}
              placeholder="Ej: Los precios incluyen IVA..."
            />
          </div>
        </div>
        <div className="form-row-actions cfg-pdf-actions">
          <button type="button" className="btn btn-primary btn-guardar" onClick={guardarPdf}>
            ✓ Guardar
          </button>
          <button type="button" className="btn btn-outline" onClick={previewOT}>
            👁 Vista previa OT
          </button>
          <button type="button" className="btn btn-outline" onClick={previewCot}>
            👁 Vista previa cotización
          </button>
        </div>
      </div>

      <div className="card card-config">
        <div className="card-title">
          <div className="card-title-left">
            <span className="cfg-ico">💾</span> Backup de datos
          </div>
        </div>
        <div className="stats stats-backup-mini">
          <div className="stat stat-sm">
            <div className="stat-lbl">Clientes</div>
            <div className="stat-val stat-val-sm">{db.clientes.length}</div>
          </div>
          <div className="stat stat-sm">
            <div className="stat-lbl">Vehículos</div>
            <div className="stat-val stat-val-sm">{db.vehiculos.length}</div>
          </div>
          <div className="stat stat-sm">
            <div className="stat-lbl">Órdenes</div>
            <div className="stat-val stat-val-sm">{db.ordenes.length}</div>
          </div>
          <div className="stat stat-sm">
            <div className="stat-lbl">Ventas</div>
            <div className="stat-val stat-val-sm">{db.ventas.length}</div>
          </div>
        </div>
        <div className="form-row-actions cfg-backup-actions">
          <button type="button" className="btn btn-excel" onClick={exportBackup}>
            ⬇ Exportar backup completo
          </button>
          <input ref={fileImportRef} type="file" accept="application/json,.json" className="inv-file-input" onChange={onImportFile} />
          <button type="button" className="btn btn-outline" onClick={() => fileImportRef.current?.click()}>
            ⬆ Importar backup
          </button>
          <button type="button" className="btn btn-danger-light" onClick={borrarDatos}>
            🗑 Borrar todos los datos
          </button>
        </div>
        <p className="cfg-backup-foot">
          El backup incluye todos los datos y configuración. Guárdalo en un lugar seguro.
        </p>
      </div>
    </>
  )
}
