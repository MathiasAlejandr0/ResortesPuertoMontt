import type { AnticipoRegistro, AppSettings, Db } from './appTypes'

/** Paleta alineada con `:root` en App.css (impresión no hereda CSS del shell). */
export const RPM_BRAND_PRINT = {
  accent: '#c41e1e',
  accentDark: '#9a1818',
  green: '#1a6b3a',
  text: '#111111',
  muted: '#666666',
  softBg: '#f5f5f5',
  warnBg: '#fff8e8',
  warnBorder: '#e0c060',
} as const

export function fmtMoney(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Math.round(n))
}

export function fmtIsoDate(iso: string) {
  if (!iso || iso.length < 10) return ''
  const [y, m, dd] = iso.slice(0, 10).split('-')
  return `${dd}/${m}/${y}`
}

function tipoBadgeClass(tipo: string): string {
  if (tipo.includes('Anticipo')) return 'ta'
  if (tipo.includes('Préstamo')) return 'tp'
  if (tipo.includes('Descuento')) return 'td'
  return 'to'
}

function cfgFromSettings(settings: AppSettings) {
  const e = settings.empresa
  return {
    nombre: e.nombre || 'Taller',
    rut: e.rut || '',
    fono: e.tel || '',
    dir: e.dir || '',
    ciudad: e.ciudad || '',
    logo: settings.logoDataUrl || '',
  }
}

export function buildComprobanteAnticipoIndividual(
  settings: AppSettings,
  db: Db,
  lista: AnticipoRegistro[],
  desde: string,
  hasta: string,
  forPrint: boolean,
): string {
  const cfg = cfgFromSettings(settings)
  const mid = lista[0]?.trabajadorId
  const mec = db.mecanicos.find((x) => x.id === mid)
  const nombre = mec?.nombre || lista[0]?.trabajadorNombre || ''
  const rut = mec?.rut || ''
  const esp = mec?.especialidad || ''
  const total = lista.reduce((s, a) => s + a.monto, 0)
  const periodo =
    desde && hasta ? `${fmtIsoDate(desde)} al ${fmtIsoDate(hasta)}` : fmtIsoDate(desde) || fmtIsoDate(hasta) || 'Período'
  const B = RPM_BRAND_PRINT
  const pad = forPrint ? '10px' : '22px'

  const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

  return `<style>
    *{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    body,div,td,th,p,span{font-family:Segoe UI,Arial,sans-serif;font-size:12px;color:${B.text}}
    .doc{max-width:740px;margin:0 auto;padding:${pad}}
    .header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:12px;border-bottom:2.5px solid ${B.accentDark};margin-bottom:16px}
    .co-name{font-size:15px;font-weight:700;color:${B.accentDark}}
    .co-info{font-size:10px;color:${B.muted};margin-top:2px}
    .doc-title{text-align:right}
    .doc-title .tipo{font-size:10px;text-transform:uppercase;letter-spacing:.07em;color:#888}
    .doc-title .nom{font-size:16px;font-weight:700;color:${B.accent}}
    .worker-box{background:${B.softBg};border-radius:8px;padding:12px 16px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center}
    .worker-name{font-size:16px;font-weight:700}
    .worker-rut{font-size:11px;color:${B.muted};margin-top:2px}
    .section-lbl{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#888;border-bottom:1px solid #e0e0e0;padding-bottom:4px;margin:14px 0 8px}
    table{width:100%;border-collapse:collapse}
    th{background:${B.accentDark};color:#fff;padding:7px 10px;text-align:left;font-size:11px}
    td{padding:7px 10px;border-bottom:1px solid #eee;font-size:11px}
    tr:nth-child(even) td{background:#fafafa}
    .total-row td{background:${B.green};color:#fff;font-weight:700;font-size:13px}
    .total-row .monto{font-size:16px;text-align:right;font-family:monospace}
    .firma-section{margin-top:28px;display:grid;grid-template-columns:1fr 1fr;gap:40px}
    .firma-block .lbl{font-size:10px;color:#888;margin-bottom:4px}
    .firma-line{border-top:1px solid #333;padding-top:7px;font-size:11px;color:#555}
    .aviso{background:${B.warnBg};border:1px solid ${B.warnBorder};border-radius:6px;padding:9px 13px;font-size:10px;color:#7a5f10;margin:14px 0}
    .footer{margin-top:16px;padding-top:8px;border-top:1px solid #ddd;font-size:9px;color:#aaa;text-align:center}
  </style>
  <div class="doc">
    <div class="header">
      <div>
        ${cfg.logo ? `<img src="${cfg.logo}" style="height:40px;max-width:90px;object-fit:contain;display:block;margin-bottom:5px" alt="">` : ''}
        <div class="co-name">${escapeHtml(cfg.nombre)}</div>
        ${cfg.rut ? `<div class="co-info">RUT: ${escapeHtml(cfg.rut)}</div>` : ''}
        ${cfg.dir ? `<div class="co-info">📍 ${escapeHtml(cfg.dir)}${cfg.ciudad ? ', ' + escapeHtml(cfg.ciudad) : ''}</div>` : ''}
        ${cfg.fono ? `<div class="co-info">📞 ${escapeHtml(cfg.fono)}</div>` : ''}
      </div>
      <div class="doc-title">
        <div class="tipo">Comprobante de anticipos</div>
        <div class="nom">💵 ${escapeHtml(periodo)}</div>
        <div style="font-size:10px;color:#888;margin-top:6px">Emitido: ${fmtIsoDate(new Date().toISOString())}</div>
      </div>
    </div>
    <div class="worker-box">
      <div>
        <div class="worker-name">👷 ${escapeHtml(nombre)}</div>
        ${rut ? `<div class="worker-rut">RUT: ${escapeHtml(rut)}</div>` : ''}
        ${esp ? `<div class="worker-rut">${escapeHtml(esp)}</div>` : ''}
      </div>
      <div style="text-align:right">
        <div style="font-size:10px;color:#888">Total anticipos</div>
        <div style="font-size:22px;font-weight:700;font-family:monospace;color:${B.accent}">${fmtMoney(total)}</div>
      </div>
    </div>
    <div class="section-lbl">Detalle — ${escapeHtml(periodo)}</div>
    <table>
      <thead><tr><th>#</th><th>Fecha</th><th>Mes descuento</th><th>Descripción</th><th style="text-align:right">Monto</th></tr></thead>
      <tbody>
        ${lista
          .map(
            (a, i) => `<tr>
          <td style="color:#888">${i + 1}</td>
          <td>${fmtIsoDate(a.fecha) || '—'}</td>
          <td>${MESES[a.mesDescuento] ?? '—'} ${a.anioDescuento}</td>
          <td>${escapeHtml(a.desc || a.tipo)}</td>
          <td style="text-align:right;font-family:monospace;font-weight:600">${fmtMoney(a.monto)}</td>
        </tr>`,
          )
          .join('')}
        <tr class="total-row"><td colspan="4">TOTAL RECIBIDO</td><td class="monto">${fmtMoney(total)}</td></tr>
      </tbody>
    </table>
    <div class="aviso">⚠ El trabajador declara haber recibido los montos indicados como anticipos durante el período señalado. Documento de respaldo para ambas partes.</div>
    <div class="firma-section">
      <div class="firma-block">
        <div class="lbl">Firma del trabajador</div>
        <div style="height:36px"></div>
        <div class="firma-line">${escapeHtml(nombre)}<br>RUT: ${escapeHtml(rut || '___________________')}</div>
      </div>
      <div class="firma-block">
        <div class="lbl">Firma empleador / Administrador</div>
        <div style="height:36px"></div>
        <div class="firma-line">${escapeHtml(cfg.nombre)}<br>${cfg.rut ? 'RUT: ' + escapeHtml(cfg.rut) : ''}</div>
      </div>
    </div>
    <div class="footer">${escapeHtml(cfg.nombre)} · Comprobante emitido el ${fmtIsoDate(new Date().toISOString())}</div>
  </div>`
}

export function buildComprobanteAnticiposConsolidado(
  settings: AppSettings,
  lista: AnticipoRegistro[],
  db: Db,
  desde: string,
  hasta: string,
  forPrint: boolean,
): string {
  const cfg = cfgFromSettings(settings)
  const totalGeneral = lista.reduce((s, a) => s + a.monto, 0)
  const semana =
    desde && hasta ? `${fmtIsoDate(desde)} al ${fmtIsoDate(hasta)}` : fmtIsoDate(desde) || fmtIsoDate(hasta) || 'Período seleccionado'
  const B = RPM_BRAND_PRINT
  const pad = forPrint ? '0' : '22px'

  const rutOf = (a: AnticipoRegistro) => db.mecanicos.find((m) => m.id === a.trabajadorId)?.rut || ''

  return `<style>
    *{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    body,div,td,th,p,span{font-family:Segoe UI,Arial,sans-serif;font-size:12px;color:${B.text}}
    .doc{max-width:780px;margin:0 auto;padding:${pad}}
    .header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:12px;border-bottom:2px solid ${B.accentDark};margin-bottom:16px}
    .co-name{font-size:16px;font-weight:700;color:${B.accentDark}}
    .co-info{font-size:10px;color:${B.muted};margin-top:2px}
    .doc-title .main{font-size:14px;font-weight:700;color:${B.accent};text-transform:uppercase;text-align:right}
    .doc-title .sub{font-size:11px;color:${B.muted};text-align:right;margin-top:3px}
    table{width:100%;border-collapse:collapse;font-size:11px}
    thead tr{background:${B.accentDark}}
    th{color:#fff;padding:8px 10px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.04em}
    td{border-bottom:1px solid #e0e0e0;vertical-align:top;padding:0}
    .rt{padding:10px 10px 4px}
    .rb{padding:2px 10px 14px;display:flex;align-items:center;gap:12px}
    tr:nth-child(even) .rt,tr:nth-child(even) .rb{background:#f8f8f8}
    .tipo{display:inline-block;padding:1px 7px;border-radius:10px;font-size:10px;font-weight:700;border:1px solid currentColor}
    .ta{color:${B.accent}}
    .tp{color:${B.accentDark}}
    .td{color:#555}
    .to{color:#777}
    .monto{font-size:14px;font-weight:700;color:${B.accentDark};font-family:monospace;white-space:nowrap}
    .fl{flex:1}.firma-lbl{font-size:9px;color:#888;margin-bottom:3px}
    .firma-line{border-bottom:1px solid #333;height:24px;min-width:160px}
    .rut-line{border-bottom:1px solid #999;height:24px;width:110px}
    .total-row td .rt{background:${B.green};color:#fff;display:flex;justify-content:space-between;align-items:center;padding:10px}
    .aviso{background:${B.warnBg};border:1px solid ${B.warnBorder};border-radius:6px;padding:9px 13px;font-size:10px;color:#7a4f10;margin-bottom:14px}
    .footer{margin-top:20px;padding-top:10px;border-top:1px solid #ddd;font-size:9px;color:#999;text-align:center}
    @media print{body{padding:0}}
  </style>
  <div class="doc">
    <div class="header">
      <div>
        ${cfg.logo ? `<img src="${cfg.logo}" style="height:44px;max-width:90px;object-fit:contain;display:block;margin-bottom:6px" alt="">` : ''}
        <div class="co-name">${escapeHtml(cfg.nombre)}</div>
        ${cfg.rut ? `<div class="co-info">RUT: ${escapeHtml(cfg.rut)}</div>` : ''}
        ${cfg.dir ? `<div class="co-info">${escapeHtml(cfg.dir)}${cfg.ciudad ? ', ' + escapeHtml(cfg.ciudad) : ''}</div>` : ''}
        ${cfg.fono ? `<div class="co-info">Tel: ${escapeHtml(cfg.fono)}</div>` : ''}
      </div>
      <div class="doc-title">
        <div class="main">Comprobante de pago</div>
        <div class="sub">Anticipos y préstamos internos</div>
        <div class="sub" style="font-weight:700;margin-top:6px">${escapeHtml(semana)}</div>
        <div class="sub">Emitido: ${fmtIsoDate(new Date().toISOString().slice(0, 10))}</div>
      </div>
    </div>
    <div class="aviso">⚠ Cada trabajador debe firmar confirmando haber recibido el monto indicado.</div>
    <table>
      <thead><tr><th>Trabajador — Tipo — Detalle</th></tr></thead>
      <tbody>
        ${lista
          .map((a) => {
            const rr = rutOf(a)
            const tc = tipoBadgeClass(a.tipo)
            return `<tr>
          <td>
            <div class="rt">
              <strong>${escapeHtml(a.trabajadorNombre)}</strong>
              ${rr ? `<span style="font-size:10px;color:#555;margin-left:6px">RUT: ${escapeHtml(rr)}</span>` : ''}
              &nbsp;<span class="tipo ${tc}">${escapeHtml(a.tipo)}</span>
              &nbsp;<span style="font-size:10px;color:#888">${fmtIsoDate(a.fecha)}</span>
              ${a.desc ? `<br><span style="font-size:10px;color:#666">${escapeHtml(a.desc)}</span>` : ''}
            </div>
            <div class="rb">
              <div class="fl">
                <div class="firma-lbl">Firma — Declaro haber recibido el monto</div>
                <div class="firma-line"></div>
              </div>
              <div style="margin-left:10px">
                <div class="firma-lbl">RUT</div>
                <div class="rut-line" style="display:flex;align-items:flex-end;padding-bottom:2px;font-size:11px;font-weight:600;color:#333;min-width:110px">${escapeHtml(rr)}</div>
              </div>
              <div style="margin-left:16px;text-align:right">
                <div class="firma-lbl">Monto recibido</div>
                <div class="monto">${fmtMoney(a.monto)}</div>
              </div>
            </div>
          </td>
        </tr>`
          })
          .join('')}
        <tr class="total-row"><td><div class="rt"><span style="font-weight:700;font-size:12px;color:#fff">${lista.length} registro${lista.length !== 1 ? 's' : ''} · TOTAL ENTREGADO</span><span style="font-size:16px;font-weight:700;font-family:monospace;color:#fff">${fmtMoney(totalGeneral)}</span></div></td></tr>
      </tbody>
    </table>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-top:24px">
      <div><div class="firma-lbl">Firma responsable del pago</div><div style="border-bottom:1px solid #333;height:28px;margin-top:4px"></div><div style="font-size:9px;color:#888;margin-top:4px">${escapeHtml(cfg.nombre)} — Administración</div></div>
      <div><div class="firma-lbl">Fecha y lugar</div><div style="border-bottom:1px solid #333;height:28px;margin-top:4px"></div><div style="font-size:9px;color:#888;margin-top:4px">${escapeHtml(cfg.ciudad)}</div></div>
    </div>
    <div class="footer">${escapeHtml(cfg.nombre)} — ${fmtIsoDate(new Date().toISOString().slice(0, 10))}</div>
  </div>`
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
