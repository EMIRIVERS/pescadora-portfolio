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
        <div
          style={{
            padding: '80px 20px',
            textAlign: 'center',
            backgroundColor: '#1C1C1E',
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
            <circle cx="26" cy="28" r="9" fill="#2C2C2E" stroke="#3A3A3C" strokeWidth="1.5" />
            <path
              d="M8 60c0-9.94 8.06-18 18-18s18 8.06 18 18"
              stroke="#3A3A3C"
              strokeWidth="1.5"
              strokeLinecap="round"
              fill="none"
            />
            {/* Right person (offset) */}
            <circle cx="54" cy="28" r="9" fill="#2C2C2E" stroke="#3A3A3C" strokeWidth="1.5" />
            <path
              d="M36 60c0-9.94 8.06-18 18-18s18 8.06 18 18"
              stroke="#3A3A3C"
              strokeWidth="1.5"
              strokeLinecap="round"
              fill="none"
            />
            {/* Plus badge */}
            <circle cx="64" cy="18" r="9" fill="#1C1C1E" stroke="#3A3A3C" strokeWidth="1.5" />
            <line x1="64" y1="13" x2="64" y2="23" stroke="#48484A" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="59" y1="18" x2="69" y2="18" stroke="#48484A" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <h3
            style={{
              fontSize: '17px',
              fontWeight: 600,
              color: '#F5F5F7',
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
              color: '#86868B',
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
