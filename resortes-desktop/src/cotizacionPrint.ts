import type { AppSettings, Cotizacion, Vehiculo } from './appTypes'
import {
  fmtMoney,
  PRINT_FONT_IMPORT_CSS,
  PRINT_FONT_MONO_STACK,
  PRINT_FONT_SANS_STACK,
  RPM_BRAND_PRINT,
} from './anticiposComprobantePrint'
import { fmtIsoDate } from './dateFormat'
import { lineIvaAmt, lineSubNeto } from './opsHelpers'

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function dosCopiasHtml(inner: string): string {
  return `<style>
    ${PRINT_FONT_IMPORT_CSS}
    @page{margin:10mm;size:auto}
    .copia-sep{page-break-after:always;break-after:page}
    .copia-label{font-size:9px;color:#aaa;text-align:right;padding:3px 0 0;font-family:${PRINT_FONT_SANS_STACK}}
  </style>
  <div class="copia-sep">
    <div class="copia-label">Copia 1 de 2</div>
    ${inner}
  </div>
  <div>
    <div class="copia-label">Copia 2 de 2</div>
    ${inner}
  </div>`
}

export function buildCotPrintInnerHtml(settings: AppSettings, cot: Cotizacion, vehiculo: Vehiculo | null): string {
  const e = settings.empresa
  const b = settings.banco
  const pdf = settings.pdf
  const validez = pdf.validezCotDias || 30
  const B = RPM_BRAND_PRINT
  const accentCot = '#5a2a7a'

  const logo = settings.logoDataUrl || ''
  const dirLine = [e.dir, e.ciudad, e.region].filter(Boolean).join(', ')

  const neto = cot.items.reduce((s, it) => s + lineSubNeto(it), 0)
  const ivaTot = cot.items.reduce((s, it) => s + lineIvaAmt(it), 0)

  const bancoBlock =
    !b.banco && !b.nCuenta
      ? ''
      : `<div style="background:#e8f4e8;border:1px solid #90c090;border-radius:6px;padding:12px 16px;margin-top:12px">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#2a5a2a;margin-bottom:6px">Datos para transferencia</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 16px;font-size:11px">
      ${b.banco ? `<div><span style="color:#555">Banco:</span> <strong>${escapeHtml(b.banco)}</strong></div>` : ''}
      ${b.tipoCuenta ? `<div><span style="color:#555">Tipo cuenta:</span> <strong>${escapeHtml(b.tipoCuenta)}</strong></div>` : ''}
      ${b.nCuenta ? `<div><span style="color:#555">N° cuenta:</span> <strong>${escapeHtml(b.nCuenta)}</strong></div>` : ''}
      ${b.rutTitular ? `<div><span style="color:#555">RUT titular:</span> <strong>${escapeHtml(b.rutTitular)}</strong></div>` : ''}
      ${b.nombreTitular ? `<div><span style="color:#555">Titular:</span> <strong>${escapeHtml(b.nombreTitular)}</strong></div>` : ''}
      ${b.emailConfirmacion ? `<div style="grid-column:1/-1"><span style="color:#555">Email:</span> <strong>${escapeHtml(b.emailConfirmacion)}</strong></div>` : ''}
    </div>
  </div>`

  const rows = cot.items
    .map((it, i) => {
      const iv = lineIvaAmt(it)
      return `<tr>
      <td style="color:#aaa;width:28px">${i + 1}</td>
      <td style="font-weight:500">${escapeHtml(it.nombre)}</td>
      <td>${it.qty}</td>
      <td>${escapeHtml(it.unidad)}</td>
      <td class="tr" style="font-size:10px;color:${it.iva ? '#2a5a2a' : '#aaa'}">${it.iva ? '+' + fmtMoney(iv) : '—'}</td>
    </tr>`
    })
    .join('')

  const ivaSummary =
    ivaTot > 0
      ? `<div style="display:flex;justify-content:flex-end;gap:16px;margin-top:8px;font-size:11px;color:#666">
      <span>Neto: <strong style="font-family:${PRINT_FONT_MONO_STACK}">${fmtMoney(neto)}</strong></span>
      <span style="color:#2a5a2a">IVA: <strong style="font-family:${PRINT_FONT_MONO_STACK}">+${fmtMoney(ivaTot)}</strong></span>
    </div>`
      : ''

  const dtoGlob = Math.max(0, Number(cot.descuento) || 0)
  const dtoLine =
    dtoGlob > 0
      ? `<div style="display:flex;justify-content:flex-end;margin-top:10px;font-size:12px;color:#8a3030;font-weight:600">
      Descuento: <span style="font-family:${PRINT_FONT_MONO_STACK};margin-left:8px">−${fmtMoney(dtoGlob)}</span>
    </div>`
      : ''
  const totalLbl =
    (dtoGlob > 0 ? 'Total cotización — descuento aplicado' : 'Total cotización') +
    (cot.items.some((i) => i.iva) ? ' (IVA incluido)' : '')

  const obsHtml = cot.obs
    ? `<div style="background:#f5f4f0;border-radius:5px;padding:10px 14px;font-size:11px;color:#555;margin-top:10px"><strong>Notas:</strong> ${escapeHtml(cot.obs)}</div>`
    : ''

  return `<style>
    ${PRINT_FONT_IMPORT_CSS}
    *{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    body,div,p,td,th,span{font-family:${PRINT_FONT_SANS_STACK};font-size:12px;color:${B.text};line-height:1.5}
    .doc{max-width:700px;margin:0 auto}
    .hdr{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:14px;border-bottom:2.5px solid ${B.accentDark};margin-bottom:18px}
    .co-logo{height:52px;max-width:110px;object-fit:contain;display:block;margin-bottom:6px}
    .co-name{font-size:17px;font-weight:700;color:${B.accentDark}}
    .co-info{font-size:10px;color:${B.muted};margin-top:2px}
    .doc-folio{text-align:right}
    .doc-folio .tipo{font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#888}
    .doc-folio .num{font-size:22px;font-weight:700;color:${accentCot};font-family:${PRINT_FONT_MONO_STACK}}
    .doc-folio .meta{font-size:10px;color:${B.muted};margin-top:3px}
    .sec-hdr{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#888;margin:16px 0 6px;padding-bottom:3px;border-bottom:1px solid #ddd}
    .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:3px 24px}
    .info-row{display:flex;gap:6px;font-size:11.5px;margin-bottom:1px}
    .info-lbl{color:#888;min-width:80px;flex-shrink:0}
    .info-val{font-weight:500}
    table{width:100%;border-collapse:collapse;font-size:11px;margin-top:8px}
    thead tr{background:${B.accentDark}}
    th{color:#fff;padding:7px 10px;text-align:left;font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.04em}
    td{padding:8px 10px;border-bottom:1px solid #e8e8e8;vertical-align:top}
    .tr{text-align:right}
    tr:nth-child(even) td{background:#f9f9f9}
    .total-box{background:${accentCot};color:#fff;border-radius:8px;padding:14px 18px;display:flex;justify-content:space-between;align-items:center;margin-top:14px}
    .total-box .lbl{font-size:11px;opacity:.7}
    .total-box .amt{font-size:22px;font-weight:700;font-family:${PRINT_FONT_MONO_STACK}}
    .pie-txt{font-size:10px;color:#888;background:#f0ede8;border-radius:5px;padding:8px 12px;margin-top:10px}
    .firma-grid{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-top:30px}
    .firma-line{border-top:1px solid #222;padding-top:6px;font-size:9.5px;color:#888;text-align:center}
    .badge-est{display:inline-block;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700;border:1px solid currentColor}
    .footer{margin-top:18px;padding-top:10px;border-top:1px solid #ddd;font-size:9px;color:#aaa;text-align:center}
    @media print{@page{margin:15mm}}
  </style>
  <div class="doc">
  <div class="hdr">
    <div>
      ${logo ? `<img src="${logo}" class="co-logo" alt="">` : ''}
      <div class="co-name">${escapeHtml(e.nombre || 'Taller')}</div>
      ${e.slogan ? `<div class="co-info" style="font-style:italic">${escapeHtml(e.slogan)}</div>` : ''}
      ${dirLine ? `<div class="co-info">📍 ${escapeHtml(dirLine)}</div>` : ''}
      ${e.tel ? `<div class="co-info">📞 ${escapeHtml(e.tel)}</div>` : ''}
      ${e.email ? `<div class="co-info">✉ ${escapeHtml(e.email)}</div>` : ''}
      ${e.web ? `<div class="co-info">🌐 ${escapeHtml(e.web)}</div>` : ''}
      ${e.rut ? `<div class="co-info">RUT: ${escapeHtml(e.rut)}</div>` : ''}
    </div>
    <div class="doc-folio">
      <div class="tipo">Cotización</div>
      <div class="num">${escapeHtml(cot.folio)}</div>
      <div class="meta">Fecha: ${escapeHtml(fmtIsoDate(cot.fecha))}</div>
      <div class="meta">Válida ${validez} días</div>
      <div style="margin-top:6px"><span class="badge-est" style="color:${accentCot}">${escapeHtml(cot.estado)}</span></div>
    </div>
  </div>
  <div class="info-grid">
    <div>
      <div class="sec-hdr">Cliente</div>
      <div class="info-row"><span class="info-lbl">Nombre:</span><span class="info-val">${escapeHtml(cot.clienteNombre)}</span></div>
      ${cot.clienteRut ? `<div class="info-row"><span class="info-lbl">RUT:</span><span class="info-val">${escapeHtml(cot.clienteRut)}</span></div>` : ''}
      ${cot.tel ? `<div class="info-row"><span class="info-lbl">Teléfono:</span><span class="info-val">${escapeHtml(cot.tel)}</span></div>` : ''}
    </div>
    <div>
      <div class="sec-hdr">Vehículo</div>
      ${cot.patente ? `<div class="info-row"><span class="info-lbl">Patente:</span><span class="info-val" style="font-weight:700">${escapeHtml(cot.patente)}</span></div>` : ''}
      ${cot.marca || cot.modelo ? `<div class="info-row"><span class="info-lbl">Vehículo:</span><span class="info-val">${escapeHtml([cot.marca, cot.modelo].filter(Boolean).join(' '))}</span></div>` : ''}
      ${vehiculo?.anio ? `<div class="info-row"><span class="info-lbl">Año:</span><span class="info-val">${escapeHtml(String(vehiculo.anio))}</span></div>` : ''}
    </div>
  </div>
  <div class="sec-hdr">Servicios y repuestos cotizados</div>
  <table><thead><tr><th>#</th><th>Descripción</th><th>Cantidad</th><th>Unidad</th><th class="tr">IVA</th></tr></thead><tbody>${rows}</tbody></table>
  ${ivaSummary}
  ${dtoLine}
  <div class="total-box"><div><div class="lbl">${totalLbl}</div></div><div class="amt">${fmtMoney(cot.total)}</div></div>
  ${obsHtml}
  ${bancoBlock}
  ${pdf.pieCot ? `<div class="pie-txt">${escapeHtml(pdf.pieCot)}</div>` : ''}
  <div style="background:#fff3cd;border:1px solid #e0a800;border-radius:5px;padding:10px 13px;font-size:10px;color:#7a5f10;margin-top:10px">
    <strong>Aviso:</strong> Los precios son referenciales y pueden variar según diagnóstico. Cualquier cambio será informado y aprobado antes de proceder.
  </div>
  <div style="background:#fdf3e0;border-radius:5px;padding:9px 13px;font-size:10px;color:#7a4f10;margin-top:6px">Validez de ${validez} días desde la emisión.</div>
  <div class="firma-grid" style="margin-top:24px"><div class="firma-line">Aceptación del cliente</div><div class="firma-line">Firma / sello taller</div></div>
  ${pdf.notaLegal ? `<div class="footer">${escapeHtml(pdf.notaLegal)}</div>` : ''}
  <div class="footer">Documento generado el ${escapeHtml(fmtIsoDate(new Date().toISOString()))} — ${escapeHtml(e.nombre || 'Taller')}</div>
  </div>`
}

/** Paridad HTML: dos copias y cuadro de impresión. Devuelve false si el navegador bloqueó la ventana. */
export function printCotizacion(settings: AppSettings, cot: Cotizacion, vehiculo: Vehiculo | null): boolean {
  const inner = buildCotPrintInnerHtml(settings, cot, vehiculo)
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>COT ${escapeHtml(cot.folio)}</title></head><body>${dosCopiasHtml(inner)}</body></html>`
  const win = window.open('', '_blank', 'width=860,height=1100')
  if (!win) return false
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => {
    win.print()
  }, 400)
  return true
}
