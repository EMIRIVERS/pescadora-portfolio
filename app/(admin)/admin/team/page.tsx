import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/lib/supabase/types'

// Derive a deterministic HSL color from a string using a simple hash
function nameToHsl(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
    hash |= 0
  }
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 45%, 32%)`
}

export default async function AdminTeamPage() {
  const supabase = await createClient()

  const { data: members } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url, role, is_admin_team, created_at')
    .eq('is_admin_team', true)
    .order('full_name', { ascending: true })

  const team: Profile[] = (members ?? []) as Profile[]

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
      <div style={{ marginBottom: '32px' }}>
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
        </p>
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
          {team.map((member) => {
            const displayName = member.full_name ?? member.email ?? '?'
            const initial = displayName[0]?.toUpperCase() ?? '?'
            const avatarBg = nameToHsl(displayName)

            const roleLabel =
              member.role === 'admin_staff'
                ? 'Staff'
                : (member.role ?? 'Equipo')

            return (
              <MemberCard
                key={member.id}
                member={member}
                displayName={displayName}
                initial={initial}
                avatarBg={avatarBg}
                roleLabel={roleLabel}
              />
            )
          })}
        </div>
      ) : (
        <p
          style={{
            fontSize: '14px',
            color: '#48484A',
          }}
        >
          No hay miembros del equipo registrados.
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-component — keeps the hover state isolated in a client component wrapper
// but since this is a server page, we use a CSS class trick via a style block.
// ---------------------------------------------------------------------------

interface MemberCardProps {
  member: Profile
  displayName: string
  initial: string
  avatarBg: string
  roleLabel: string
}

function MemberCard({
  member,
  displayName,
  initial,
  avatarBg,
  roleLabel,
}: MemberCardProps) {
  const isAdmin = member.is_admin_team

  return (
    <div
      className="team-member-card"
      style={{
        backgroundColor: '#111111',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '16px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        transition: 'background-color 0.15s ease',
        cursor: 'default',
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          overflow: 'hidden',
          flexShrink: 0,
          backgroundColor: avatarBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {member.avatar_url ? (
          <Image
            src={member.avatar_url}
            alt={displayName}
            width={64}
            height={64}
            style={{ objectFit: 'cover', width: '64px', height: '64px' }}
          />
        ) : (
          <span
            style={{
              fontSize: '24px',
              fontWeight: 700,
              color: '#ffffff',
              lineHeight: 1,
              fontFamily:
                "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
            }}
          >
            {initial}
          </span>
        )}
      </div>

      {/* Name */}
      <p
        style={{
          marginTop: '12px',
          fontSize: '16px',
          fontWeight: 600,
          color: '#F5F5F7',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: '100%',
        }}
      >
        {displayName}
      </p>

      {/* Email */}
      {member.email && (
        <p
          style={{
            marginTop: '4px',
            fontSize: '13px',
            color: '#86868B',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '100%',
          }}
        >
          {member.email}
        </p>
      )}

      {/* Role badge */}
      <span
        style={{
          display: 'inline-block',
          marginTop: '10px',
          padding: '3px 10px',
          borderRadius: '20px',
          fontSize: '11px',
          fontWeight: 500,
          letterSpacing: '0.01em',
          backgroundColor: isAdmin
            ? 'rgba(0,113,227,0.15)'
            : '#1C1C1E',
          color: isAdmin ? '#0071E3' : '#86868B',
        }}
      >
        {roleLabel}
      </span>

      {/* Hover style injected once */}
      <style>{`
        .team-member-card:hover {
          background-color: #1C1C1E !important;
        }
      `}</style>
    </div>
  )
}
