import type { AppSettings, Db } from './appTypes'
import { flatWorkspacePayloadToDesktop } from './migrateWorkspacePayload'

/**
 * Backup exportado desde el HTML legacy (`version: '3.0'`, objeto `taller`, sin envoltorio `db`).
 */
export function isLegacyHtmlBackupJson(parsed: unknown): boolean {
  if (!parsed || typeof parsed !== 'object') return false
  const o = parsed as Record<string, unknown>
  const ver = o.version
  const vOk = ver === '3.0' || ver === 3 || ver === '3'
  if (!vOk) return false
  const taller = o.taller
  if (!taller || typeof taller !== 'object' || Array.isArray(taller)) return false
  return !('db' in o)
}

export function legacyHtmlBackupToDesktop(parsed: unknown): { db: Db; settings: AppSettings } | null {
  if (!isLegacyHtmlBackupJson(parsed)) return null
  const o = parsed as Record<string, unknown>
  const taller = o.taller as Record<string, unknown>
  return flatWorkspacePayloadToDesktop(o, taller)
}
