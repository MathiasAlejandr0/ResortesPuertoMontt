import type { Db } from './appTypes'

/** Opciones válidas alineadas al HTML (`g-cat`) */
export const CANONICAL_GASTO_CATEGORIAS = [
  'Arriendo',
  'Servicios básicos',
  'Herramientas',
  'Repuestos propios',
  'Remuneraciones',
  'Publicidad',
  'Seguros',
  'Impuestos',
  'Otros',
] as const

function fold(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

const CANONICAL_BY_FOLD = new Map<string, string>()
for (const c of CANONICAL_GASTO_CATEGORIAS) {
  CANONICAL_BY_FOLD.set(fold(c), c)
}

/** Categorías antiguas de la app desktop antes de alinear el listado al HTML */
const LEGACY_FOLD_TO_CANONICAL: Record<string, string> = {
  [fold('Marketing')]: 'Publicidad',
  [fold('Repuestos')]: 'Repuestos propios',
}

/**
 * Devuelve una categoría del listado canónico; corrige valores legacy (p. ej. Marketing → Publicidad).
 * Valores personalizados no reconocidos se mantienen (solo trim).
 */
export function normalizeGastoCategoria(raw: string): string {
  const t = raw.trim()
  if (!t) return 'Otros'
  const f = fold(t)
  const canon = CANONICAL_BY_FOLD.get(f)
  if (canon) return canon
  const legacy = LEGACY_FOLD_TO_CANONICAL[f]
  if (legacy) return legacy
  return t
}

/** Normaliza categorías en todos los gastos (útil tras import / lectura remota). */
export function normalizeDbGastos(db: Db): Db {
  let changed = false
  const gastos = db.gastos.map((g) => {
    const categoria = normalizeGastoCategoria(g.categoria)
    if (categoria !== g.categoria) changed = true
    return { ...g, categoria }
  })
  return changed ? { ...db, gastos } : db
}
