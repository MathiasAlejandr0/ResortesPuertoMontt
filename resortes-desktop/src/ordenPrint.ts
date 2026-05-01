import type { AppSettings, Orden, Vehiculo } from './appTypes'
import { fmtIsoDate, fmtMoney, RPM_BRAND_PRINT } from './anticiposComprobantePrint'
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
    @page{margin:10mm;size:auto}
    .copia-sep{page-break-after:always;break-after:page}
    .copia-label{font-size:9px;color:#aaa;text-align:right;padding:3px 0 0;font-family:Segoe UI,Arial,sans-serif}
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

function estadoOtColor(estado: string): string {
  if (estado === 'Entregado') return '#2a5c3a'
  if (estado === 'Listo') return '#1a5a5a'
  if (estado === 'En proceso') return '#b85c1a'
  return '#1a3a5c'
}

export function buildOrdenPrintInnerHtml(settings: AppSettings, o: Orden, vehiculo: Vehiculo | null): string {
  const e = settings.empresa
  const pdf = settings.pdf
  const B = RPM_BRAND_PRINT
  const accentOt = '#1a3a5c'

  const logo = settings.logoDataUrl || ''
  const dirLine = [e.dir, e.ciudad, e.region].filter(Boolean).join(', ')

  const neto = o.items.reduce((s, it) => s + lineSubNeto(it), 0)
  const ivaTot = o.items.reduce((s, it) => s + lineIvaAmt(it), 0)

  const rows = o.items
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
      <span>Neto: <strong style="font-family:monospace">${fmtMoney(neto)}</strong></span>
      <span style="color:#2a5a2a">IVA: <strong style="font-family:monospace">+${fmtMoney(ivaTot)}</strong></span>
    </div>`
      : ''

  const diagHtml = o.diag
    ? `<div class="sec-hdr">Diagnóstico / trabajo solicitado</div><div class="obs-box">${escapeHtml(o.diag)}</div>`
    : ''

  const obsHtml = o.obs
    ? `<div class="obs-box"><strong>Observaciones:</strong> ${escapeHtml(o.obs)}</div>`
    : ''

  const kmFmt =
    o.km != null && Number(o.km) > 0
      ? new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 }).format(Number(o.km))
      : ''

  return `<style>
    *{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    body,div,p,td,th,span{font-family:Segoe UI,Arial,sans-serif;font-size:12px;color:${B.text};line-height:1.5}
    .doc{max-width:700px;margin:0 auto}
    .hdr{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:14px;border-bottom:2.5px solid ${B.accentDark};margin-bottom:18px}
    .co-logo{height:52px;max-width:110px;object-fit:contain;display:block;margin-bottom:6px}
    .co-name{font-size:17px;font-weight:700;color:${B.accentDark}}
    .co-info{font-size:10px;color:${B.muted};margin-top:2px}
    .doc-folio{text-align:right}
    .doc-folio .tipo{font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#888}
    .doc-folio .num{font-size:22px;font-weight:700;color:${accentOt};font-family:monospace}
    .doc-folio .meta{font-size:10px;color:${B.muted};margin-top:3px}
    .sec-hdr{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#888;margin:16px 0 6px;padding-bottom:3px;border-bottom:1px solid #ddd}
    .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:3px 24px}
    .info-row{display:flex;gap:6px;font-size:11.5px;margin-bottom:1px}
    .info-lbl{color:#888;min-width:80px;flex-shrink:0}
    .info-val{font-weight:500}
    table{width:100%;border-collapse:collapse;font-size:11px;margin-top:8px}
    thead tr{background:${accentOt}}
    th{color:#fff;padding:7px 10px;text-align:left;font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.04em}
    td{padding:8px 10px;border-bottom:1px solid #e8e8e8;vertical-align:top}
    .tr{text-align:right}
    tr:nth-child(even) td{background:#f9f9f9}
    .total-box{background:${accentOt};color:#fff;border-radius:8px;padding:14px 18px;display:flex;justify-content:space-between;align-items:center;margin-top:14px}
    .total-box .lbl{font-size:11px;opacity:.7}
    .total-box .amt{font-size:22px;font-weight:700;font-family:monospace}
    .obs-box{background:#f5f4f0;border-radius:5px;padding:10px 14px;font-size:11px;color:#555;margin-top:10px}
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
      <div class="tipo">Orden de Trabajo</div>
      <div class="num">${escapeHtml(o.folio)}</div>
      <div class="meta">Ingreso: ${escapeHtml(fmtIsoDate(o.fechaIn))}</div>
      ${o.fechaEst ? `<div class="meta">Entrega est.: ${escapeHtml(fmtIsoDate(o.fechaEst))}</div>` : ''}
      <div style="margin-top:6px"><span class="badge-est" style="color:${estadoOtColor(o.estado)}">${escapeHtml(o.estado)}</span></div>
    </div>
  </div>
  <div class="info-grid">
    <div>
      <div class="sec-hdr">Cliente</div>
      <div class="info-row"><span class="info-lbl">Nombre:</span><span class="info-val">${escapeHtml(o.clienteNombre)}</span></div>
      ${o.clienteRut ? `<div class="info-row"><span class="info-lbl">RUT:</span><span class="info-val">${escapeHtml(o.clienteRut)}</span></div>` : ''}
      ${o.tel ? `<div class="info-row"><span class="info-lbl">Teléfono:</span><span class="info-val">${escapeHtml(o.tel)}</span></div>` : ''}
    </div>
    <div>
      <div class="sec-hdr">Vehículo</div>
      ${o.patente ? `<div class="info-row"><span class="info-lbl">Patente:</span><span class="info-val" style="font-weight:700">${escapeHtml(o.patente)}</span></div>` : ''}
      ${o.marca || o.modelo ? `<div class="info-row"><span class="info-lbl">Vehículo:</span><span class="info-val">${escapeHtml([o.marca, o.modelo].filter(Boolean).join(' '))}</span></div>` : ''}
      ${vehiculo?.anio ? `<div class="info-row"><span class="info-lbl">Año:</span><span class="info-val">${escapeHtml(String(vehiculo.anio))}</span></div>` : ''}
      ${kmFmt ? `<div class="info-row"><span class="info-lbl">Km ingreso:</span><span class="info-val">${escapeHtml(kmFmt)} km</span></div>` : ''}
      ${o.mecanico ? `<div class="info-row"><span class="info-lbl">Mecánico:</span><span class="info-val">${escapeHtml(o.mecanico)}</span></div>` : ''}
    </div>
  </div>
  ${diagHtml}
  <div class="sec-hdr">Detalle de servicios y repuestos</div>
  <table><thead><tr><th>#</th><th>Descripción</th><th>Cantidad</th><th>Unidad</th><th class="tr">IVA</th></tr></thead><tbody>${rows}</tbody></table>
  ${ivaSummary}
  <div class="total-box"><div><div class="lbl">Total de la orden${o.items.some((i) => i.iva) ? ' (IVA incluido)' : ''}</div></div><div class="amt">${fmtMoney(o.total)}</div></div>
  ${obsHtml}
  <div style="background:#FDF3E0;border:1px solid #E0C070;border-radius:6px;padding:10px 14px;margin-top:10px;font-size:10px;color:#7A4F10">
    <strong>Aviso:</strong> Los precios son referenciales y pueden variar durante el diagnóstico. Cualquier cambio será informado antes de proceder.
  </div>
  ${pdf.pieOT ? `<div class="pie-txt">${escapeHtml(pdf.pieOT)}</div>` : ''}
  <div class="firma-grid"><div class="firma-line">Firma del cliente</div><div class="firma-line">Firma / sello taller</div></div>
  ${pdf.notaLegal ? `<div class="footer">${escapeHtml(pdf.notaLegal)}</div>` : ''}
  <div class="footer">Documento generado el ${escapeHtml(fmtIsoDate(new Date().toISOString()))} — ${escapeHtml(e.nombre || 'Taller')}</div>
  </div>`
}

export function printOrden(settings: AppSettings, orden: Orden, vehiculo: Vehiculo | null): boolean {
  const inner = buildOrdenPrintInnerHtml(settings, orden, vehiculo)
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>OT ${escapeHtml(orden.folio)}</title></head><body>${dosCopiasHtml(inner)}</body></html>`
  const win = window.open('', '_blank', 'width=860,height=1100')
  if (!win) return false
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 400)
  return true
}
