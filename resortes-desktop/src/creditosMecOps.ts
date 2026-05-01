import type { AppSettings } from './appTypes'

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

/** Marca cuota como pagada y recalcula saldo / estado del crédito (paridad HTML `pagarCuotaCredito`). */
export function withCuotaCreditoMarcadaPagada(settings: AppSettings, creditoId: string, cuotaIdx: number): AppSettings {
  let changed = false
  const creditosMec = settings.extras.creditosMec.map((c) => {
    if (c.id !== creditoId) return c
    const plan = c.cuotasPlan ?? []
    const cu = plan[cuotaIdx]
    if (!cu || cu.pagado) return c
    changed = true
    const cuotasPlan = plan.map((x, i) =>
      i === cuotaIdx ? { ...x, pagado: true as const, fechaPago: todayIso() } : x,
    )
    const saldo = cuotasPlan.filter((x) => !x.pagado).reduce((s, x) => s + x.monto, 0)
    const estado = saldo <= 0 ? ('Pagado' as const) : ('Activo' as const)
    return { ...c, cuotasPlan, saldo: saldo <= 0 ? 0 : saldo, estado }
  })
  if (!changed) return settings
  return { ...settings, extras: { ...settings.extras, creditosMec } }
}

/** Deshace pago de cuota (paridad HTML `desmarcarCuotaCredito`). */
export function withCuotaCreditoDesmarcada(settings: AppSettings, creditoId: string, cuotaIdx: number): AppSettings {
  let changed = false
  const creditosMec = settings.extras.creditosMec.map((c) => {
    if (c.id !== creditoId) return c
    const plan = c.cuotasPlan ?? []
    const cu = plan[cuotaIdx]
    if (!cu || !cu.pagado) return c
    changed = true
    const cuotasPlan = plan.map((x, i) =>
      i === cuotaIdx ? { ...x, pagado: false as const, fechaPago: null } : x,
    )
    const saldo = cuotasPlan.filter((x) => !x.pagado).reduce((s, x) => s + x.monto, 0)
    return { ...c, cuotasPlan, saldo, estado: 'Activo' as const }
  })
  if (!changed) return settings
  return { ...settings, extras: { ...settings.extras, creditosMec } }
}

