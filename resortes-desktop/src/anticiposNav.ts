const KEY = 'rpm_nav_anticipos_v1'

export type AnticiposTab = 'nuevo' | 'resumen' | 'historial' | 'credMec' | 'pdf'

export type AnticiposJumpTarget = {
  tab: AnticiposTab
  credMecId?: string
  nuevoTrabajadorId?: string
}

const TABS = new Set<AnticiposTab>(['nuevo', 'resumen', 'historial', 'credMec', 'pdf'])

export function stashAnticiposNav(target: AnticiposJumpTarget) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(target))
  } catch {
    /* ignore */
  }
}

/**
 * Lee la intención de navegación y la retira tras un breve delay para que un doble montaje
 * (p. ej. React Strict Mode en desarrollo) no pierda el estado.
 */
export function takeAnticiposNav(): AnticiposJumpTarget | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as Partial<AnticiposJumpTarget>
    if (!p.tab || !TABS.has(p.tab as AnticiposTab)) return null
    const out: AnticiposJumpTarget = {
      tab: p.tab as AnticiposTab,
      credMecId: p.credMecId,
      nuevoTrabajadorId: p.nuevoTrabajadorId,
    }
    setTimeout(() => {
      try {
        if (sessionStorage.getItem(KEY) === raw) sessionStorage.removeItem(KEY)
      } catch {
        /* ignore */
      }
    }, 800)
    return out
  } catch {
    try {
      sessionStorage.removeItem(KEY)
    } catch {
      /* ignore */
    }
    return null
  }
}
