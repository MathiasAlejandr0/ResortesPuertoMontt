import type { Vacacion } from './appTypes'

export const DIAS_VAC_ANUALES = 15

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export function diasHabiles(desde: string, hasta: string): number {
  let count = 0
  const d = new Date(`${desde}T12:00:00`)
  const end = new Date(`${hasta}T12:00:00`)
  const cur = new Date(d)
  while (cur <= end) {
    const dow = cur.getDay()
    if (dow !== 0 && dow !== 6) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

export function getVacEstado(v: Vacacion): 'Activo' | 'Anulado' {
  return v.estado ?? 'Activo'
}

/** Días hábiles del registro (compat registros antiguos sin dias o con 0). */
export function effectiveVacDias(v: Vacacion): number {
  const stored = v.dias ?? v.diasHabiles
  if (stored != null && stored > 0) return stored
  if (v.desde && v.hasta) return diasHabiles(v.desde, v.hasta)
  return 0
}

export function getVacAnio(v: Vacacion): number {
  if (v.anio != null && !Number.isNaN(v.anio)) return v.anio
  return parseInt(v.desde.slice(0, 10).split('-')[0]!, 10)
}

export function diasVacUsados(mecId: string, anio: number, vacaciones: Vacacion[]): number {
  return vacaciones
    .filter((v) => v.mecanicoId === mecId && getVacAnio(v) === anio && getVacEstado(v) !== 'Anulado')
    .reduce((s, v) => s + effectiveVacDias(v), 0)
}

export function diasVacSaldo(mecId: string, anio: number, vacaciones: Vacacion[]): number {
  return DIAS_VAC_ANUALES - diasVacUsados(mecId, anio, vacaciones)
}

export function countEnVacacionesHoy(vacaciones: Vacacion[]): number {
  const t = todayIso()
  return vacaciones.filter((v) => getVacEstado(v) === 'Activo' && v.desde <= t && v.hasta >= t).length
}

export function countProximasVacaciones(vacaciones: Vacacion[]): number {
  const t = todayIso()
  const en7 = new Date()
  en7.setDate(en7.getDate() + 7)
  const en7iso = en7.toISOString().slice(0, 10)
  return vacaciones.filter(
    (v) => getVacEstado(v) === 'Activo' && v.desde > t && v.desde <= en7iso,
  ).length
}

export function antiguedadAnios(fechaContrato: string | undefined): number {
  if (!fechaContrato) return 0
  const contrato = new Date(`${fechaContrato}T12:00:00`)
  const ms = Date.now() - contrato.getTime()
  return Math.max(0, Math.floor(ms / (365.25 * 24 * 3600 * 1000)))
}
