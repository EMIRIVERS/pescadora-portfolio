import type { SupabaseClient } from '@supabase/supabase-js'

import { createServiceClient } from '@/lib/supabase/server'
import type { Json } from '@/lib/supabase/types'

/**
 * Parameters for {@link logAudit}.
 *
 * - `action` is required and identifies the operation (e.g. `'invoice.create'`).
 * - `actorId` is the `profiles.id` of the staff member who performed it.
 * - `entityType` / `entityId` point at the affected row.
 * - `summary` is a short human-readable description for the audit feed.
 * - `metadata` is an arbitrary JSON blob with before/after values, etc.
 */
export interface LogAuditParams {
  action: string
  actorId?: string | null
  entityType?: string | null
  entityId?: string | null
  summary?: string | null
  metadata?: Record<string, Json> | null
}

interface AuditLogInsert {
  action: string
  actor_id: string | null
  entity_type: string | null
  entity_id: string | null
  summary: string | null
  metadata: Record<string, Json>
}

/**
 * Records an entry in `public.audit_log` for traceability (P1).
 *
 * Server-side only. Uses the service-role client so it works regardless of the
 * caller's RLS context. Failures are swallowed: auditing must never break the
 * primary flow (the action it accompanies has already succeeded).
 *
 * @returns `true` if the row was inserted, `false` on any failure.
 */
export async function logAudit(params: LogAuditParams): Promise<boolean> {
  try {
    const row: AuditLogInsert = {
      action: params.action,
      actor_id: params.actorId ?? null,
      entity_type: params.entityType ?? null,
      entity_id: params.entityId ?? null,
      summary: params.summary ?? null,
      metadata: params.metadata ?? {},
    }

    // `audit_log` is not yet in the generated Database types, so use an
    // untyped client view for this insert. The shape is enforced by
    // `AuditLogInsert` above.
    const supabase = createServiceClient() as unknown as SupabaseClient
    const { error } = await supabase.from('audit_log').insert(row)

    if (error) {
      console.error('[audit] failed to write audit_log entry:', error.message)
      return false
    }
    return true
  } catch (err) {
    console.error('[audit] unexpected error writing audit_log entry:', err)
    return false
  }
}
