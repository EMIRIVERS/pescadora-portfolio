import { createClient } from '@/lib/supabase/server'
import TeamMemberCard from '@/components/admin/team/TeamMemberCard'
import InviteMemberForm from '@/components/admin/team/InviteMemberForm'
import MyProfileModal from '@/components/admin/team/MyProfileModal'

const ADMIN_ROLES = new Set(['admin', 'admin_staff'])

export default async function AdminTeamPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const currentUserId = user?.id ?? ''

  const { data: members } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url, role, staff_role, is_admin_team, created_at')
    .order('full_name', { ascending: true })

  const team = (members ?? []) as {
    id: string
    full_name: string | null
    email: string | null
    avatar_url: string | null
    is_admin_team: boolean
    role: string | null
    staff_role: import('@/lib/supabase/types').StaffRole | null
    created_at: string
  }[]

  // El usuario actual: solo un owner puede asignar permisos (staff_role).
  const canManageRoles =
    team.find((m) => m.id === currentUserId)?.staff_role === 'owner'

  // ── Carga de trabajo: proyectos activos + tareas asignadas por miembro ──
  const [{ data: assignmentsRaw }, { data: tasksRaw }] = await Promise.all([
    supabase.from('project_assignments').select('profile_id, projects(status)'),
    supabase.from('tasks').select('assignee_id').not('assignee_id', 'is', null),
  ])

  const ACTIVE_PROJECT = new Set(['pre_production', 'production', 'post_production'])

  const workload = new Map<string, { projects: number; tasks: number }>()
  function bump(profileId: string | null, key: 'projects' | 'tasks') {
    if (!profileId) return
    const cur = workload.get(profileId) ?? { projects: 0, tasks: 0 }
    cur[key] += 1
    workload.set(profileId, cur)
  }
  for (const a of (assignmentsRaw ?? []) as { profile_id: string | null; projects: { status: string } | null }[]) {
    if (a.projects && ACTIVE_PROJECT.has(a.projects.status)) bump(a.profile_id, 'projects')
  }
  for (const t of (tasksRaw ?? []) as { assignee_id: string | null }[]) {
    bump(t.assignee_id, 'tasks')
  }

  const maxLoad = Math.max(1, ...[...workload.values()].map((w) => w.projects + w.tasks))

  // Split into admin group and support group
  const adminTeam = team.filter(
    (m) => m.is_admin_team || ADMIN_ROLES.has(m.role ?? ''),
  )
  const supportTeam = team.filter(
    (m) => !m.is_admin_team && !ADMIN_ROLES.has(m.role ?? ''),
  )

  // Find current user's profile for the modal
  const currentUserProfile = team.find((m) => m.id === currentUserId) ?? null

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '16px',
  }

  const sectionHeadingStyle: React.CSSProperties = {
    fontSize: '12px',
    fontWeight: 600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: 'var(--dash-text-tertiary)',
    marginBottom: '16px',
    marginTop: 0,
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--dash-surface-1)',
        padding: 'clamp(20px, 5vw, 40px) clamp(16px, 4vw, 32px)',
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          marginBottom: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '28px',
              fontWeight: 600,
              color: 'var(--dash-text-primary)',
              margin: 0,
              lineHeight: 1.15,
              letterSpacing: '-0.3px',
            }}
          >
            Equipo
          </h1>
          <p
            style={{
              marginTop: '6px',
              fontSize: '15px',
              fontWeight: 400,
              color: 'var(--dash-text-secondary)',
            }}
          >
            {team.length} miembro{team.length !== 1 ? 's' : ''}
            {adminTeam.length > 0 && (
              <span style={{ marginLeft: '8px', color: 'var(--dash-text-tertiary)' }}>
                &middot; {adminTeam.length} admin{adminTeam.length !== 1 ? 's' : ''}
              </span>
            )}
          </p>
        </div>

        {/* Header actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {currentUserProfile && (
            <MyProfileModal currentUser={currentUserProfile} />
          )}
          <InviteMemberForm />
        </div>
      </div>

      {/* Carga de trabajo del equipo */}
      {team.length > 0 && (
        <section style={{ marginBottom: '40px' }}>
          <p style={sectionHeadingStyle}>Carga de trabajo</p>
          <div
            style={{
              backgroundColor: 'var(--dash-surface-2)',
              border: '1px solid var(--dash-border)',
              borderRadius: '16px',
              padding: '8px 0',
            }}
          >
            {[...team]
              .map((m) => ({ m, w: workload.get(m.id) ?? { projects: 0, tasks: 0 } }))
              .sort((a, b) => b.w.projects + b.w.tasks - (a.w.projects + a.w.tasks))
              .map(({ m, w }) => {
                const total = w.projects + w.tasks
                return (
                  <div
                    key={m.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      padding: '12px 20px',
                    }}
                  >
                    <span style={{ flex: '0 0 180px', fontSize: '14px', color: 'var(--dash-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.full_name ?? m.email ?? 'Sin nombre'}
                    </span>
                    <div style={{ flex: 1, height: '8px', backgroundColor: 'var(--dash-surface-3)', borderRadius: '8px', overflow: 'hidden' }}>
                      <div style={{ width: `${(total / maxLoad) * 100}%`, height: '100%', backgroundColor: total === 0 ? 'transparent' : '#0071E3', borderRadius: '8px' }} />
                    </div>
                    <span style={{ flex: '0 0 auto', fontSize: '12px', color: 'var(--dash-text-tertiary)', whiteSpace: 'nowrap' }}>
                      {w.projects} proyecto{w.projects !== 1 ? 's' : ''} &middot; {w.tasks} tarea{w.tasks !== 1 ? 's' : ''}
                    </span>
                  </div>
                )
              })}
          </div>
        </section>
      )}

      {team.length === 0 && (
        <div
          style={{
            padding: '80px 20px',
            textAlign: 'center',
            backgroundColor: 'var(--dash-surface-2)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '16px',
            marginBottom: '32px',
          }}
        >
          {/* Group of people SVG */}
          <svg
            width="80"
            height="80"
            viewBox="0 0 80 80"
            fill="none"
            aria-hidden="true"
            style={{ display: 'block', margin: '0 auto 20px' }}
          >
            {/* Left person */}
            <circle cx="26" cy="28" r="9" fill="var(--dash-surface-3)" stroke="#3A3A3C" strokeWidth="1.5" />
            <path
              d="M8 60c0-9.94 8.06-18 18-18s18 8.06 18 18"
              stroke="#3A3A3C"
              strokeWidth="1.5"
              strokeLinecap="round"
              fill="none"
            />
            {/* Right person (offset) */}
            <circle cx="54" cy="28" r="9" fill="var(--dash-surface-3)" stroke="#3A3A3C" strokeWidth="1.5" />
            <path
              d="M36 60c0-9.94 8.06-18 18-18s18 8.06 18 18"
              stroke="#3A3A3C"
              strokeWidth="1.5"
              strokeLinecap="round"
              fill="none"
            />
            {/* Plus badge */}
            <circle cx="64" cy="18" r="9" fill="var(--dash-surface-2)" stroke="#3A3A3C" strokeWidth="1.5" />
            <line x1="64" y1="13" x2="64" y2="23" stroke="var(--dash-text-tertiary)" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="59" y1="18" x2="69" y2="18" stroke="var(--dash-text-tertiary)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <h3
            style={{
              fontSize: '17px',
              fontWeight: 600,
              color: 'var(--dash-text-primary)',
              margin: '0 0 8px',
              letterSpacing: '-0.02em',
              fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
            }}
          >
            Sin miembros en el equipo
          </h3>
          <p
            style={{
              fontSize: '13px',
              color: 'var(--dash-text-secondary)',
              margin: '0 0 24px',
              lineHeight: 1.5,
              fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
            }}
          >
            Invita al primer miembro para construir tu equipo de produccion.
          </p>
          <InviteMemberForm />
        </div>
      )}

      {/* Admin group */}
      {adminTeam.length > 0 && (
        <section style={{ marginBottom: '40px' }}>
          <p style={sectionHeadingStyle}>Equipo Admin</p>
          <div style={gridStyle}>
            {adminTeam.map((member) => (
              <TeamMemberCard
                key={member.id}
                member={member}
                currentUserId={currentUserId}
                canManageRoles={canManageRoles}
              />
            ))}
          </div>
        </section>
      )}

      {/* Support group */}
      {supportTeam.length > 0 && (
        <section>
          {adminTeam.length > 0 && (
            <div
              style={{
                height: '1px',
                backgroundColor: 'var(--dash-border)',
                marginBottom: '32px',
              }}
            />
          )}
          <p style={sectionHeadingStyle}>Equipo de Apoyo</p>
          <div style={gridStyle}>
            {supportTeam.map((member) => (
              <TeamMemberCard
                key={member.id}
                member={member}
                currentUserId={currentUserId}
                canManageRoles={canManageRoles}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
