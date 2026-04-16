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
    .select('id, full_name, email, avatar_url, role, is_admin_team, created_at')
    .order('full_name', { ascending: true })

  const team = (members ?? []) as {
    id: string
    full_name: string | null
    email: string | null
    avatar_url: string | null
    is_admin_team: boolean
    role: string | null
    created_at: string
  }[]

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
    color: '#48484A',
    marginBottom: '16px',
    marginTop: 0,
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#111111',
        padding: '40px 32px',
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
              color: '#F5F5F7',
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
              color: '#86868B',
            }}
          >
            {team.length} miembro{team.length !== 1 ? 's' : ''}
            {adminTeam.length > 0 && (
              <span style={{ marginLeft: '8px', color: '#48484A' }}>
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

      {team.length === 0 && (
        <p style={{ fontSize: '14px', color: '#48484A' }}>
          No hay miembros registrados.
        </p>
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
                backgroundColor: 'rgba(255,255,255,0.06)',
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
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
