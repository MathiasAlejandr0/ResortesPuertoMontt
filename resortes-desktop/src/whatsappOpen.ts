/** Solo dígitos, código país Chile típico si falta */
export function normalizeTelWa(raw: string): string {
  const d = raw.replace(/\D/g, '')
  if (!d) return ''
  if (d.length === 9 && d.startsWith('9')) return `56${d}`
  return d
}

export function openWhatsAppUrl(tel: string, message: string): boolean {
  const n = normalizeTelWa(tel)
  if (!n) return false
  window.open(`https://wa.me/${n}?text=${encodeURIComponent(message)}`, '_blank')
  return true
}
