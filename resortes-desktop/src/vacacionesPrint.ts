import {
  PRINT_FONT_IMPORT_CSS,
  PRINT_FONT_MONO_STACK,
  PRINT_FONT_SANS_STACK,
} from './anticiposComprobantePrint'
import type { AppSettings, Db, Vacacion } from './appTypes'
import { isoDateToDdMmYyyy } from './dateFormat'
import { DIAS_VAC_ANUALES, diasVacUsados, effectiveVacDias, getVacAnio, todayIso } from './vacacionesHelpers'

function cfgFromSettings(settings: AppSettings) {
  const e = settings.empresa
  return {
    nombre: e.nombre || 'Taller Mecánico',
    rut: e.rut || '',
    fono: e.tel || '',
    dir: e.dir || '',
    ciudad: e.ciudad || '',
    logo: settings.logoDataUrl || '',
  }
}

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function buildVacacionesComprobanteHtml(
  settings: AppSettings,
  db: Db,
  todasVacaciones: Vacacion[],
  v: Vacacion,
  forPrint: boolean,
): string {
  const cfg = cfgFromSettings(settings)
  const mid = v.mecanicoId
  const m = db.mecanicos.find((x) => x.id === mid)
  const anio = getVacAnio(v)
  const dias = effectiveVacDias(v)
  const usados = diasVacUsados(mid, anio, todasVacaciones)
  const saldoDespues = DIAS_VAC_ANUALES - usados
  const saldoAntes = saldoDespues + dias

  const fmtF = (d: string) => (d ? isoDateToDdMmYyyy(d) : '—')
  const emitido = fmtF(todayIso())
  const fechaContrato = m?.fechaContrato

  const noPrint = forPrint ? '' : 'no-print'

  return `
<style>
  ${PRINT_FONT_IMPORT_CSS}
  *{box-sizing:border-box;margin:0;padding:0;font-family:${PRINT_FONT_SANS_STACK}}
  body{font-size:12px;color:#111}
  .doc{max-width:700px;margin:0 auto;padding:28px}
  .hdr{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:14px;border-bottom:2.5px solid #1a3a5c;margin-bottom:20px}
  .co-name{font-size:17px;font-weight:700;color:#1a3a5c}
  .co-info{font-size:10px;color:#666;margin-top:2px}
  .doc-title{text-align:right}
  .doc-title .tipo{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#888}
  .doc-title .num{font-size:20px;font-weight:700;color:#1a5a5a}
  .section-hdr{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#888;border-bottom:1px solid #e0e0e0;padding-bottom:4px;margin:16px 0 10px}
  .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px 24px}
  .info-row{display:flex;gap:8px;font-size:11.5px;padding:2px 0}
  .info-lbl{color:#888;min-width:110px;flex-shrink:0}
  .info-val{font-weight:500}
  .dias-box{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:16px 0}
  .dia-stat{background:#f5f5f5;border-radius:8px;padding:12px;text-align:center;border:1px solid #e0e0e0}
  .dia-stat .lbl{font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#888;margin-bottom:4px}
  .dia-stat .val{font-size:22px;font-weight:700;font-family:${PRINT_FONT_MONO_STACK}}
  .aviso{background:#e8f5ed;border:1px solid #90c090;border-radius:6px;padding:10px 14px;font-size:11px;color:#2a5a2a;margin:14px 0}
  .firma-grid{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:36px}
  .firma-block .lbl{font-size:10px;color:#888;margin-bottom:4px}
  .firma-line{border-top:1px solid #333;padding-top:8px;font-size:11px;color:#555}
  .footer{margin-top:20px;padding-top:10px;border-top:1px solid #ddd;font-size:9px;color:#aaa;text-align:center}
  @media print{body{padding:0}.no-print{display:none}}
</style>
<div class="doc ${noPrint}">
  <div class="hdr">
    <div>
      ${cfg.logo ? `<img src="${esc(cfg.logo)}" style="height:44px;max-width:100px;object-fit:contain;display:block;margin-bottom:6px" alt="">` : ''}
      <div class="co-name">${esc(cfg.nombre)}</div>
      ${cfg.rut ? `<div class="co-info">RUT: ${esc(cfg.rut)}</div>` : ''}
      ${cfg.dir ? `<div class="co-info">📍 ${esc(cfg.dir)}${cfg.ciudad ? ', ' + esc(cfg.ciudad) : ''}</div>` : ''}
      ${cfg.fono ? `<div class="co-info">📞 ${esc(cfg.fono)}</div>` : ''}
    </div>
    <div class="doc-title">
      <div class="tipo">Comprobante de Vacaciones</div>
      <div class="num">🏖️ ${anio}</div>
      <div style="font-size:10px;color:#888;margin-top:6px">Emitido: ${emitido}</div>
    </div>
  </div>

  <div class="section-hdr">Datos del trabajador</div>
  <div class="info-grid">
    <div class="info-row"><span class="info-lbl">Nombre:</span><span class="info-val">${esc(m?.nombre || v.mecanicoNombre)}</span></div>
    <div class="info-row"><span class="info-lbl">RUT:</span><span class="info-val" style="font-weight:700">${esc(m?.rut || '—')}</span></div>
    <div class="info-row"><span class="info-lbl">Especialidad:</span><span class="info-val">${esc(m?.especialidad || '—')}</span></div>
    <div class="info-row"><span class="info-lbl">Fecha contrato:</span><span class="info-val">${fechaContrato ? fmtF(fechaContrato) : '—'}</span></div>
    <div class="info-row"><span class="info-lbl">Año vacaciones:</span><span class="info-val">${anio}</span></div>
  </div>

  <div class="section-hdr">Período de vacaciones</div>
  <div class="info-grid">
    <div class="info-row"><span class="info-lbl">Fecha inicio:</span><span class="info-val" style="font-weight:700">${fmtF(v.desde)}</span></div>
    <div class="info-row"><span class="info-lbl">Fecha fin:</span><span class="info-val" style="font-weight:700">${fmtF(v.hasta)}</span></div>
  </div>
  ${v.obs ? `<div style="margin-top:8px;font-size:11px;color:#666"><strong>Observación:</strong> ${esc(v.obs)}</div>` : ''}

  <div class="dias-box">
    <div class="dia-stat">
      <div class="lbl">Días tomados</div>
      <div class="val" style="color:#1a5a5a">${dias}</div>
      <div style="font-size:10px;color:#888;margin-top:2px">días hábiles</div>
    </div>
    <div class="dia-stat">
      <div class="lbl">Saldo anterior</div>
      <div class="val">${saldoAntes}</div>
      <div style="font-size:10px;color:#888;margin-top:2px">de ${DIAS_VAC_ANUALES} anuales</div>
    </div>
    <div class="dia-stat" style="background:${saldoDespues > 0 ? '#e8f5ed' : '#fdf0f0'};border-color:${saldoDespues > 0 ? '#90c090' : '#e09090'}">
      <div class="lbl">Saldo restante</div>
      <div class="val" style="color:${saldoDespues > 0 ? '#2a5a2a' : '#8b1a1a'}">${saldoDespues}</div>
      <div style="font-size:10px;color:#888;margin-top:2px">días disponibles</div>
    </div>
  </div>

  <div class="aviso">
    ✅ El trabajador acepta hacer uso de sus vacaciones anuales durante el período indicado, conforme a lo establecido en el Código del Trabajo.
  </div>

  <div class="firma-grid">
    <div class="firma-block">
      <div class="lbl">Firma del trabajador</div>
      <div style="height:40px"></div>
      <div class="firma-line">${esc(m?.nombre || v.mecanicoNombre)}<br>RUT: ${esc(m?.rut || '___________________')}</div>
    </div>
    <div class="firma-block">
      <div class="lbl">Firma empleador / representante legal</div>
      <div style="height:40px"></div>
      <div class="firma-line">${esc(cfg.nombre)}<br>${cfg.rut ? 'RUT: ' + esc(cfg.rut) : ''}</div>
    </div>
  </div>

  <div class="footer">
    ${esc(cfg.nombre)} — Comprobante generado el ${emitido} — Documento de respaldo laboral
  </div>
</div>`
}

export function imprimirVacacionesComprobante(settings: AppSettings, db: Db, todasVacaciones: Vacacion[], v: Vacacion, showToast: (msg: string, type?: 'ok' | 'err' | 'warn') => void) {
  const w = window.open('', '_blank', 'width=820,height=1100')
  if (!w) {
    showToast('Permite ventanas emergentes para imprimir', 'err')
    return
  }
  const html = buildVacacionesComprobanteHtml(settings, db, todasVacaciones, v, true)
  const safeTitle = `Comprobante Vacaciones — ${v.mecanicoNombre}`.replace(/</g, '')
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${safeTitle}</title></head><body>${html}</body></html>`)
  w.document.close()
  w.focus()
  setTimeout(() => w.print(), 400)
}
