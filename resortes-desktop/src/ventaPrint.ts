import type { AppSettings, Venta, Vehiculo } from './appTypes'
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

function bancoBlock(settings: AppSettings): string {
  const b = settings.banco
  if (!b.banco && !b.nCuenta) return ''
  return `<div style="background:#e8f4e8;border:1px solid #90c090;border-radius:6px;padding:12px 16px;margin-top:12px;font-size:11px">
    <div style="font-weight:700;text-transform:uppercase;color:#2a5a2a;margin-bottom:6px">Datos para transferencia</div>
    ${b.banco ? `<div><span style="color:#555">Banco:</span> <strong>${escapeHtml(b.banco)}</strong></div>` : ''}
    ${b.tipoCuenta ? `<div><span style="color:#555">Tipo:</span> <strong>${escapeHtml(b.tipoCuenta)}</strong></div>` : ''}
    ${b.nCuenta ? `<div><span style="color:#555">N° cuenta:</span> <strong>${escapeHtml(b.nCuenta)}</strong></div>` : ''}
    ${b.rutTitular ? `<div><span style="color:#555">RUT titular:</span> <strong>${escapeHtml(b.rutTitular)}</strong></div>` : ''}
    ${b.nombreTitular ? `<div><span style="color:#555">Titular:</span> <strong>${escapeHtml(b.nombreTitular)}</strong></div>` : ''}
    ${b.emailConfirmacion ? `<div><span style="color:#555">Email:</span> <strong>${escapeHtml(b.emailConfirmacion)}</strong></div>` : ''}
  </div>`
}

export function buildVentaPrintInnerHtml(settings: AppSettings, v: Venta, vehiculo: Vehiculo | null): string {
  const e = settings.empresa
  const pdf = settings.pdf
  const B = RPM_BRAND_PRINT
  const accentVt = '#1a6b3a'
  const fpago = v.fpago || 'Contado'
  const logo = settings.logoDataUrl || ''
  const dirLine = [e.dir, e.ciudad, e.region].filter(Boolean).join(', ')

  const netoItems = v.items.reduce((s, it) => s + lineSubNeto(it), 0)
  const ivaTot = v.items.reduce((s, it) => s + lineIvaAmt(it), 0)
  const desc = Number(v.descuento) || 0

  const rows = v.items
    .map((it, i) => {
      const net = lineSubNeto(it)
      const iv = lineIvaAmt(it)
      const tln = net + iv
      return `<tr>
      <td style="color:#aaa;width:24px">${i + 1}</td>
      <td style="font-weight:500">${escapeHtml(it.nombre)}</td>
      <td>${it.qty}</td>
      <td>${escapeHtml(it.unidad)}</td>
      <td class="tr" style="font-family:${PRINT_FONT_MONO_STACK}">${fmtMoney(it.pu)}</td>
      <td class="tr" style="font-family:${PRINT_FONT_MONO_STACK}">${fmtMoney(net)}</td>
      <td class="tr" style="font-family:${PRINT_FONT_MONO_STACK};color:${it.iva ? '#2a5a2a' : '#ccc'}">${it.iva ? '+' + fmtMoney(iv) : '—'}</td>
      <td class="tr" style="font-family:${PRINT_FONT_MONO_STACK};font-weight:600">${fmtMoney(tln)}</td>
    </tr>`
    })
    .join('')

  const sumLine =
    ivaTot > 0 || desc > 0
      ? `<div style="display:flex;justify-content:flex-end;gap:16px;margin-top:8px;font-size:11px;color:#666;flex-wrap:wrap">
      <span>Neto: <strong style="font-family:${PRINT_FONT_MONO_STACK}">${fmtMoney(netoItems)}</strong></span>
      ${ivaTot > 0 ? `<span style="color:#2a5a2a">IVA: <strong style="font-family:${PRINT_FONT_MONO_STACK}">+${fmtMoney(ivaTot)}</strong></span>` : ''}
      ${desc > 0 ? `<span style="color:#8b1a1a">Descuento: <strong style="font-family:${PRINT_FONT_MONO_STACK}">−${fmtMoney(desc)}</strong></span>` : ''}
    </div>`
      : ''

  const obsHtml = v.obs ? `<div class="obs-box">${escapeHtml(v.obs)}</div>` : ''

  const docHtml = v.docTipo
    ? `<div style="background:#e8f5f5;border:1px solid #90c0c0;border-radius:6px;padding:10px 14px;margin-top:10px;font-size:11px;color:#1a5a5a">
    <strong>Documento tributario:</strong> ${escapeHtml(v.docTipo)}
    ${v.docFolio ? ` · N° <strong>${escapeHtml(v.docFolio)}</strong>` : ''}
    ${v.docFecha ? ` · Emitido: <strong>${escapeHtml(fmtIsoDate(v.docFecha))}</strong>` : ''}
    ${v.docMonto != null ? ` · Monto: <strong style="font-family:${PRINT_FONT_MONO_STACK}">${fmtMoney(v.docMonto)}</strong>` : ''}
  </div>`
    : ''

  const col2: string[] = []
  if (v.patente || v.marca || v.modelo) {
    col2.push('<div class="sec-hdr">Vehículo</div>')
    if (v.patente) {
      col2.push(
        `<div class="info-row"><span class="info-lbl">Patente:</span><span class="info-val" style="font-weight:700">${escapeHtml(v.patente)}</span></div>`,
      )
    }
    if (v.marca || v.modelo) {
      col2.push(
        `<div class="info-row"><span class="info-lbl">Vehículo:</span><span class="info-val">${escapeHtml([v.marca, v.modelo].filter(Boolean).join(' '))}</span></div>`,
      )
    }
    if (vehiculo?.anio) {
      col2.push(
        `<div class="info-row"><span class="info-lbl">Año:</span><span class="info-val">${escapeHtml(String(vehiculo.anio))}</span></div>`,
      )
    }
  }
  if (v.mecanico) {
    col2.push(
      `<div class="info-row"><span class="info-lbl">Mecánico:</span><span class="info-val">${escapeHtml(v.mecanico)}</span></div>`,
    )
  }
  if (v.otOrigen) {
    col2.push(`<div class="info-row"><span class="info-lbl">OT origen:</span><span class="info-val">${escapeHtml(v.otOrigen)}</span></div>`)
  }
  if (v.cotOrigen) {
    col2.push(`<div class="info-row"><span class="info-lbl">COT origen:</span><span class="info-val">${escapeHtml(v.cotOrigen)}</span></div>`)
  }
  const col2Html = col2.length ? `<div>${col2.join('')}</div>` : '<div></div>'

  return `<style>
    ${PRINT_FONT_IMPORT_CSS}
    *{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    body,div,p,td,th,span{font-family:${PRINT_FONT_SANS_STACK};font-size:12px;color:${B.text};line-height:1.5}
    .doc{max-width:720px;margin:0 auto}
    .hdr{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:14px;border-bottom:2.5px solid ${B.accentDark};margin-bottom:18px}
    .co-logo{height:52px;max-width:110px;object-fit:contain;display:block;margin-bottom:6px}
    .co-name{font-size:17px;font-weight:700;color:${B.accentDark}}
    .co-info{font-size:10px;color:${B.muted};margin-top:2px}
    .doc-folio{text-align:right}
    .doc-folio .tipo{font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#888}
    .doc-folio .num{font-size:22px;font-weight:700;color:${accentVt};font-family:${PRINT_FONT_MONO_STACK}}
    .doc-folio .meta{font-size:10px;color:${B.muted};margin-top:3px}
    .sec-hdr{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#888;margin:14px 0 6px;padding-bottom:3px;border-bottom:1px solid #ddd}
    .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:3px 24px}
    .info-row{display:flex;gap:6px;font-size:11.5px;margin-bottom:1px}
    .info-lbl{color:#888;min-width:86px;flex-shrink:0}
    .info-val{font-weight:500}
    table{width:100%;border-collapse:collapse;font-size:11px;margin-top:8px}
    thead tr{background:${accentVt}}
    th{color:#fff;padding:7px 8px;text-align:left;font-size:9px;font-weight:700;text-transform:uppercase}
    td{padding:8px;border-bottom:1px solid #e8e8e8}
    .tr{text-align:right}
    .total-box{background:${accentVt};color:#fff;border-radius:8px;padding:14px 18px;display:flex;justify-content:space-between;align-items:center;margin-top:14px}
    .total-box .lbl{font-size:11px;opacity:.85}
    .total-box .amt{font-size:22px;font-weight:700;font-family:${PRINT_FONT_MONO_STACK}}
    .obs-box{background:#f5f4f0;border-radius:5px;padding:10px 14px;font-size:11px;color:#555;margin-top:10px}
    .footer{margin-top:18px;padding-top:10px;border-top:1px solid #ddd;font-size:9px;color:#aaa;text-align:center}
    @media print{@page{margin:15mm}}
  </style>
  <div class="doc">
  <div class="hdr">
    <div>
      ${logo ? `<img src="${logo}" class="co-logo" alt="">` : ''}
      <div class="co-name">${escapeHtml(e.nombre || 'Taller')}</div>
      ${dirLine ? `<div class="co-info">📍 ${escapeHtml(dirLine)}</div>` : ''}
      ${e.tel ? `<div class="co-info">📞 ${escapeHtml(e.tel)}</div>` : ''}
      ${e.rut ? `<div class="co-info">RUT: ${escapeHtml(e.rut)}</div>` : ''}
    </div>
    <div class="doc-folio">
      <div class="tipo">Comprobante de venta</div>
      <div class="num">${escapeHtml(v.folio)}</div>
      <div class="meta">Fecha: ${escapeHtml(fmtIsoDate(v.fecha))}</div>
      <div class="meta">Pago: <strong>${escapeHtml(fpago)}</strong></div>
    </div>
  </div>
  <div class="info-grid">
    <div>
      <div class="sec-hdr">Cliente</div>
      <div class="info-row"><span class="info-lbl">Nombre:</span><span class="info-val">${escapeHtml(v.clienteNombre)}</span></div>
      ${v.clienteRut ? `<div class="info-row"><span class="info-lbl">RUT:</span><span class="info-val">${escapeHtml(v.clienteRut)}</span></div>` : ''}
      ${v.tel ? `<div class="info-row"><span class="info-lbl">Teléfono:</span><span class="info-val">${escapeHtml(v.tel)}</span></div>` : ''}
    </div>
    ${col2Html}
  </div>
  <div class="sec-hdr">Detalle</div>
  <table><thead><tr><th>#</th><th>Producto / servicio</th><th>Cant.</th><th>Unidad</th><th class="tr">P.Unit.</th><th class="tr">Neto</th><th class="tr">IVA</th><th class="tr">Total</th></tr></thead><tbody>${rows}</tbody></table>
  ${sumLine}
  <div class="total-box"><div><div class="lbl">Total pagado (${escapeHtml(fpago)})${v.items.some((i) => i.iva) ? ' — IVA incluido donde aplica' : ''}</div></div><div class="amt">${fmtMoney(v.total)}</div></div>
  ${obsHtml}
  ${docHtml}
  ${fpago === 'Transferencia' || fpago === 'Crédito' ? bancoBlock(settings) : ''}
  ${pdf.notaLegal ? `<div class="footer">${escapeHtml(pdf.notaLegal)}</div>` : ''}
  <div class="footer">Documento generado el ${escapeHtml(fmtIsoDate(new Date().toISOString()))} — ${escapeHtml(e.nombre || 'Taller')}</div>
  </div>`
}

export function printVenta(settings: AppSettings, venta: Venta, vehiculo: Vehiculo | null): boolean {
  const inner = buildVentaPrintInnerHtml(settings, venta, vehiculo)
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>VT ${escapeHtml(venta.folio)}</title></head><body>${dosCopiasHtml(inner)}</body></html>`
  const win = window.open('', '_blank', 'width=860,height=1100')
  if (!win) return false
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 400)
  return true
}
