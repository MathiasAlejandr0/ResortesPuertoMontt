import type { AppSettings, CreditoMecCuota, Db, Orden } from './appTypes'
import { ordenRefsForPersist } from './opsHelpers'

/** Mismos nombres cortos que AnticiposModule / HTML */
export const MESES_REM = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'] as const

export type DetalleComision = {
  folio: string
  clienteNombre: string
  total: number
  nMec: number
  comision: number
}

export function ymDesdeMesAnio(mesNombre: string, anio: number): string | null {
  const idx = MESES_REM.indexOf(mesNombre as (typeof MESES_REM)[number])
  if (idx < 0) return null
  return `${anio}-${String(idx + 1).padStart(2, '0')}`
}

export function ordenEnMesYm(o: Orden, ym: string): boolean {
  const fin = (o.fechaIn || o.creado || '').slice(0, 7)
  return fin === ym
}

export function ordenInvolucraMec(o: Orden, mecId: string): boolean {
  return ordenRefsForPersist(o).some((r) => r.id === mecId)
}

export function nMecsOrden(o: Orden): number {
  return Math.max(1, ordenRefsForPersist(o).length)
}

export function calcComisionEstimadaMec(db: Db, mecId: string, mesNombre: string, anio: number) {
  const ym = ymDesdeMesAnio(mesNombre, anio)
  if (!ym) return { estimado: 0, detalle: [] as DetalleComision[], otsMes: [] as Orden[] }
  const otsMes = db.ordenes.filter((o) => ordenEnMesYm(o, ym) && ordenInvolucraMec(o, mecId))
  const detalle: DetalleComision[] = otsMes.map((o) => {
    const nMec = nMecsOrden(o)
    const comision = Math.round((o.total * 0.05) / nMec)
    return { folio: o.folio, clienteNombre: o.clienteNombre, total: o.total, nMec, comision }
  })
  const estimado = detalle.reduce((s, d) => s + d.comision, 0)
  return { estimado, detalle, otsMes }
}

export function claveComision(mecId: string, mes: string, anio: number) {
  return `${mecId}_${mes}_${anio}`
}

export function getComisionFinal(
  ajustes: Record<string, number>,
  db: Db,
  mecId: string,
  mes: string,
  anio: number,
): number {
  const k = claveComision(mecId, mes, anio)
  if (ajustes[k] !== undefined && !Number.isNaN(ajustes[k])) return ajustes[k]
  return calcComisionEstimadaMec(db, mecId, mes, anio).estimado
}

/** Igual que HTML `calcAnticiposMes`: suma por mes/año/mecánico salvo Pagado y Anulado. */
export function anticipoDescuentaLiquidacion(estado: string): boolean {
  return estado !== 'Pagado' && estado !== 'Anulado'
}

/** Anticipos que descuentan en ese mes-año (índice mes = MESES_REM) */
export function calcAnticiposMesDb(db: Db, mecId: string, mesNombre: string, anio: number): number {
  const mesIdx = MESES_REM.indexOf(mesNombre as (typeof MESES_REM)[number])
  if (mesIdx < 0) return 0
  return db.anticipos
    .filter(
      (a) =>
        a.trabajadorId === mecId &&
        a.mesDescuento === mesIdx &&
        a.anioDescuento === anio &&
        anticipoDescuentaLiquidacion(a.estado),
    )
    .reduce((s, a) => s + a.monto, 0)
}

export function calcCuotaCreditoMec(settings: AppSettings, mecId: string, mesNombre: string, anio: number): number {
  let total = 0
  for (const c of settings.extras.creditosMec) {
    if (c.mecanicoId !== mecId || c.estado === 'Pagado') continue
    for (const cu of c.cuotasPlan || []) {
      if (String(cu.mes).trim() === String(mesNombre).trim() && cu.anio === anio && !cu.pagado) {
        total += cu.monto
      }
    }
  }
  return total
}

export type FilaCreditoMes = {
  creditoId: string
  desc: string
  cuotaIdx: number
  cuota: CreditoMecCuota
  ncuotas: number
  saldoCredito: number
  pagadasCount: number
  creditEstado: 'Activo' | 'Pagado'
}

export function creditosMesPorMec(settings: AppSettings, mecId: string, mesNombre: string, anio: number): FilaCreditoMes[] {
  const rows: FilaCreditoMes[] = []
  for (const c of settings.extras.creditosMec) {
    if (c.mecanicoId !== mecId) continue
    const plan = c.cuotasPlan ?? []
    const pagadasCount = plan.filter((x) => x.pagado).length
    plan.forEach((cu, idx) => {
      if (String(cu.mes).trim() === String(mesNombre).trim() && cu.anio === anio) {
        rows.push({
          creditoId: c.id,
          desc: c.desc,
          cuotaIdx: idx,
          cuota: cu,
          ncuotas: c.ncuotas || plan.length,
          saldoCredito: c.saldo,
          pagadasCount,
          creditEstado: c.estado,
        })
      }
    })
  }
  return rows
}

export function creditosTodosPorMec(settings: AppSettings, mecId: string) {
  return settings.extras.creditosMec.filter((c) => c.mecanicoId === mecId)
}
