import type { AppSettings, Db } from './appTypes'
import { flatWorkspacePayloadToDesktop } from './migrateWorkspacePayload'

/**
 * Documento Firestore que guarda el HTML en `taller/datos`:
 * - Una clave por cada entrada de `DB` (arrays u objeto `comisionesAjustadas`).
 * - `_cfg`: mismo objeto que `rpm_config` / `CFG` en el HTML (nombre, fono, logo, pies PDF…).
 * - `_updated`: ISO string (se ignora al importar).
 *
 * Para obtener JSON sin código: Firebase Console → Firestore → `taller` → `datos` → exportar / copiar campos,
 * o usar “Download document” si tu flujo lo permite; debe quedar un objeto JSON con las mismas claves.
 */
export function isFirestoreTallerDatosDoc(parsed: unknown): boolean {
  if (!parsed || typeof parsed !== 'object') return false
  const o = parsed as Record<string, unknown>
  if ('db' in o) return false
  const cfg = o._cfg
  if (!cfg || typeof cfg !== 'object' || Array.isArray(cfg)) return false
  // El HTML siempre serializa todas las claves de DB; `clientes` existe aunque sea [].
  return Array.isArray(o.clientes)
}

export function firestoreDatosToDesktop(parsed: unknown): { db: Db; settings: AppSettings } | null {
  if (!isFirestoreTallerDatosDoc(parsed)) return null
  const o = parsed as Record<string, unknown>
  return flatWorkspacePayloadToDesktop(o, o._cfg as Record<string, unknown>)
}
