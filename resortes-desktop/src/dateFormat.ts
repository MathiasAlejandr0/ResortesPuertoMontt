/** Locale estándar Chile para textos relativos a fecha (inputs nativos + Intl). */
export const APP_DATE_LOCALE = 'es-CL' as const

/**
 * Convierte fecha calendario ISO `YYYY-MM-DD` a `DD/MM/YYYY` sin usar zona horaria.
 * Otros formatos devuelven el placeholder.
 */
export function isoDateToDdMmYyyy(iso: string | undefined | null, empty = '—'): string {
  if (!iso || String(iso).trim().length < 10) return empty
  const raw = String(iso).trim().slice(0, 10)
  const [y, m, d] = raw.split('-')
  if (!y || !m || !d || y.length !== 4) return empty === '—' ? raw : empty
  return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`
}

/** Igual que `isoDateToDdMmYyyy`, pero cadena vacía si no hay fecha (PDF / plantillas). */
export function fmtIsoDate(iso: string | undefined | null): string {
  return isoDateToDdMmYyyy(iso, '')
}
