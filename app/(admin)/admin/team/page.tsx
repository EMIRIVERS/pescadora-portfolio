import { createClient } from '@/lib/supabase/server'
import TeamMemberCard from '@/components/admin/team/TeamMemberCard'
import InviteMemberForm from '@/components/admin/team/InviteMemberForm'

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

  const adminCount = team.filter((m) => m.is_admin_team).length

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
            {adminCount > 0 && (
              <span style={{ marginLeft: '8px', color: '#48484A' }}>
                &middot; {adminCount} admin{adminCount !== 1 ? 's' : ''}
              </span>
            )}
          </p>
        </div>
        <InviteMemberForm />
      </div>

      {/* Member grid */}
      {team.length > 0 ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '16px',
          }}
        >
          {team.map((member) => (
            <TeamMemberCard
              key={member.id}
              member={member}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      ) : (
        <p
          style={{
            fontSize: '14px',
            color: '#48484A',
          }}
        >
          No hay miembros registrados.
        </p>
      )}
    </div>
  )
}
