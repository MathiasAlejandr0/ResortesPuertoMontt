const MAX_DOC_BYTES = 2 * 1024 * 1024

export function humanBytes(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0 B'
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(2)} MB`
}

function toDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const rd = new FileReader()
    rd.onload = () => resolve(String(rd.result || ''))
    rd.onerror = () => reject(new Error('No se pudo leer el archivo'))
    rd.readAsDataURL(file)
  })
}

export async function pickDocumentoAdjunto(file: File): Promise<{
  nombre: string
  mime: string
  dataUrl: string
  size: number
}> {
  const mime = (file.type || '').toLowerCase()
  const isPdf = mime === 'application/pdf' || /\.pdf$/i.test(file.name)
  const isImage = mime.startsWith('image/')
  if (!isPdf && !isImage) {
    throw new Error('Solo se permiten PDF o imágenes')
  }
  if (file.size > MAX_DOC_BYTES) {
    throw new Error(`El archivo supera 2MB (${humanBytes(file.size)})`)
  }
  const dataUrl = await toDataUrl(file)
  return { nombre: file.name, mime: file.type || (isPdf ? 'application/pdf' : 'image/*'), dataUrl, size: file.size }
}

export function openDocumentoAdjunto(dataUrl?: string) {
  if (!dataUrl) return false
  const w = window.open('', '_blank')
  if (!w) return false
  w.location.href = dataUrl
  return true
}
