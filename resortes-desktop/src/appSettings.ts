import type { AppSettings } from './appTypes'

export const LS_SETTINGS = 'rpm_app_settings_v1'

export function defaultAppSettings(): AppSettings {
  return {
    empresa: {
      nombre: 'Resortes Puerto Montt',
      rut: '',
      tel: '',
      email: '',
      dir: '',
      ciudad: 'Puerto Montt',
      region: 'Los Lagos',
      web: '',
      slogan: '',
    },
    banco: {
      banco: '',
      tipoCuenta: '',
      nCuenta: '',
      rutTitular: '',
      nombreTitular: '',
      emailConfirmacion: '',
    },
    pdf: {
      validezCotDias: 30,
      pieOT: '',
      pieCot: '',
      notaLegal: '',
    },
    logoDataUrl: null,
    extras: {
      agendaNotas: [],
      agendaRecordatorios: [],
      agendaReservas: [],
      vacaciones: [],
      proveedores: [],
      compras: [],
    },
  }
}

export function loadAppSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(LS_SETTINGS)
    if (raw) {
      const p = JSON.parse(raw) as Partial<AppSettings>
      const d = defaultAppSettings()
      return {
        empresa: { ...d.empresa, ...p.empresa },
        banco: { ...d.banco, ...p.banco },
        pdf: { ...d.pdf, ...p.pdf },
        logoDataUrl: p.logoDataUrl ?? null,
        extras: {
          ...d.extras,
          ...(p.extras ?? {}),
          agendaNotas: p.extras?.agendaNotas ?? d.extras.agendaNotas,
          agendaRecordatorios: p.extras?.agendaRecordatorios ?? d.extras.agendaRecordatorios,
          agendaReservas: p.extras?.agendaReservas ?? d.extras.agendaReservas,
          vacaciones: p.extras?.vacaciones ?? d.extras.vacaciones,
          proveedores: p.extras?.proveedores ?? d.extras.proveedores,
          compras: p.extras?.compras ?? d.extras.compras,
        },
      }
    }
    const legacy = localStorage.getItem('rpm_cfg_empresa')
    if (legacy) {
      const d = defaultAppSettings()
      d.empresa.nombre = legacy
      return d
    }
  } catch {
    /* ignore */
  }
  return defaultAppSettings()
}
