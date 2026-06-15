import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const FONT = "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif"

interface AuditRow {
  id: string
  created_at: string
  action: string
  entity_type: string | null
  entity_id: string | null
  summary: string | null
  actor: { full_name: string | null; email: string | null } | null
}

// Color por familia de acción (prefijo antes del punto).
function actionColor(action: string): string {
  const family = action.split('.')[0]
  const map: Record<string, string> = {
    invoice: 'var(--dash-success)',
    proposal: 'var(--dash-accent)',
    project: '#BF5AF2',
    client: 'var(--dash-warning)',
    calendar: 'var(--dash-accent)',
    expense: 'var(--dash-danger)',
    lead: '#FF6B35',
    team: '#FF2D55',
    deliverable: '#5E5CE6',
    portfolio: '#AC8E68',
  }
  return map[family] ?? 'var(--dash-text-tertiary)'
}

function fmtWhen(iso: string): string {
  return new Date(iso).toLocaleString('es-MX', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function AuditoriaPage() {
  // Guard de aplicación: solo Dirección (owner) ve el registro completo.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const service = createServiceClient()
  const { data: me } = await service
    .from('profiles')
    .select('staff_role')
    .eq('id', user.id)
    .single()
  if (me?.staff_role !== 'owner') redirect('/admin')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (service as any)
    .from('audit_log')
    .select('id, created_at, action, entity_type, entity_id, summary, actor:profiles(full_name, email)')
    .order('created_at', { ascending: false })
    .limit(150)

  const rows = (data ?? []) as AuditRow[]

  return (
    <div style={{ fontFamily: FONT, padding: 'clamp(20px, 5vw, 40px) clamp(16px, 4vw, 32px)', minHeight: '100vh' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 600, color: 'var(--dash-text-primary)', letterSpacing: '-0.02em' }}>
          Auditoría
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--dash-text-secondary)' }}>
          Registro de quién hizo qué en el panel. {rows.length} evento{rows.length !== 1 ? 's' : ''} recientes.
        </p>
      </div>

      {rows.length === 0 ? (
        <div style={{ border: '1px solid var(--dash-border)', borderRadius: 16, padding: '48px 24px', textAlign: 'center', color: 'var(--dash-text-tertiary)', fontSize: 14 }}>
          Sin actividad registrada todavía.
        </div>
      ) : (
        <div style={{ backgroundColor: 'var(--dash-surface-1)', border: '1px solid var(--dash-border)', borderRadius: 16, overflow: 'hidden' }}>
          {rows.map((r, i) => {
            const actor = r.actor?.full_name ?? r.actor?.email ?? 'Sistema'
            return (
              <div
                key={r.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '12px 18px',
                  borderTop: i === 0 ? 'none' : '1px solid var(--dash-border)',
                }}
              >
                <span style={{ width: 9, height: 9, borderRadius: 9, background: actionColor(r.action), flexShrink: 0 }} />
                <code style={{ flex: '0 0 150px', fontSize: 12, color: 'var(--dash-text-tertiary)', fontFamily: 'var(--font-geist-mono), ui-monospace, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.action}
                </code>
                <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: 'var(--dash-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.summary ?? '—'}
                </span>
                <span style={{ flex: '0 0 auto', fontSize: 12, color: 'var(--dash-text-secondary)', whiteSpace: 'nowrap' }}>
                  {actor}
                </span>
                <span style={{ flex: '0 0 auto', fontSize: 12, color: 'var(--dash-text-tertiary)', whiteSpace: 'nowrap' }}>
                  {fmtWhen(r.created_at)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
