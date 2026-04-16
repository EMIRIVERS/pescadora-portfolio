'use client'

import Image from 'next/image'
import { useTransition, useState } from 'react'
import { updateMemberRole, toggleAdminStatus } from '../../../../app/actions/team'

const ROLE_OPTIONS = [
  'Fotógrafo',
  'Videógrafo',
  'Editor',
  'Director',
  'Productor',
  'Asistente',
  'Admin',
] as const

type RoleOption = (typeof ROLE_OPTIONS)[number]

interface Props {
  member: {
    id: string
    full_name: string | null
    email: string | null
    avatar_url: string | null
    is_admin_team: boolean
    role: string | null
    created_at: string
  }
  currentUserId: string
}

function nameToHsl(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
    hash |= 0
  }
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 45%, 32%)`
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('es-ES', { year: 'numeric', month: 'long' })
}

export default function TeamMemberCard({ member, currentUserId }: Props) {
  const isSelf = member.id === currentUserId

  const displayName = member.full_name ?? member.email ?? '?'
  const initial = displayName[0]?.toUpperCase() ?? '?'
  const avatarBg = nameToHsl(displayName)

  const initialRole: RoleOption =
    ROLE_OPTIONS.includes(member.role as RoleOption)
      ? (member.role as RoleOption)
      : 'Asistente'

  const [currentRole, setCurrentRole] = useState<RoleOption>(initialRole)
  const [isAdmin, setIsAdmin] = useState(member.is_admin_team)
  const [roleError, setRoleError] = useState<string | null>(null)
  const [adminError, setAdminError] = useState<string | null>(null)
  const [hovered, setHovered] = useState(false)

  const [rolePending, startRoleTransition] = useTransition()
  const [adminPending, startAdminTransition] = useTransition()

  function handleRoleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as RoleOption
    setCurrentRole(next)
    setRoleError(null)
    startRoleTransition(async () => {
      const result = await updateMemberRole(member.id, next)
      if (result.error) {
        setRoleError(result.error)
        setCurrentRole(currentRole)
      }
    })
  }

  function handleToggleAdmin() {
    const next = !isAdmin
    setAdminError(null)
    startAdminTransition(async () => {
      const result = await toggleAdminStatus(member.id, next)
      if (result.error) {
        setAdminError(result.error)
      } else {
        setIsAdmin(next)
      }
    })
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: hovered ? '#1C1C1E' : '#111111',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '16px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        transition: 'background-color 0.15s ease',
        gap: '0px',
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
          marginBottom: 0,
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
            marginBottom: 0,
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

      {/* Admin badge */}
      {isAdmin && (
        <span
          style={{
            display: 'inline-block',
            marginTop: '10px',
            padding: '3px 10px',
            borderRadius: '20px',
            fontSize: '11px',
            fontWeight: 500,
            letterSpacing: '0.01em',
            backgroundColor: 'rgba(48,209,88,0.15)',
            color: '#30D158',
          }}
        >
          Admin
        </span>
      )}

      {/* Role select */}
      <div style={{ marginTop: '14px', width: '100%', position: 'relative' }}>
        <select
          value={currentRole}
          onChange={handleRoleChange}
          disabled={rolePending}
          style={{
            width: '100%',
            backgroundColor: '#2C2C2E',
            border: 'none',
            borderRadius: '8px',
            color: '#F5F5F7',
            fontSize: '13px',
            fontWeight: 500,
            padding: '7px 10px',
            appearance: 'none',
            cursor: rolePending ? 'not-allowed' : 'pointer',
            opacity: rolePending ? 0.6 : 1,
            fontFamily:
              "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
            outline: 'none',
          }}
        >
          {ROLE_OPTIONS.map((r) => (
            <option key={r} value={r} style={{ backgroundColor: '#2C2C2E', color: '#F5F5F7' }}>
              {r}
            </option>
          ))}
        </select>

        {/* Spinner overlay */}
        {rolePending && (
          <span
            style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '12px',
              height: '12px',
              border: '2px solid rgba(255,255,255,0.15)',
              borderTop: '2px solid #F5F5F7',
              borderRadius: '50%',
              animation: 'spin 0.6s linear infinite',
            }}
          />
        )}
      </div>

      {roleError && (
        <p style={{ marginTop: '4px', fontSize: '11px', color: '#FF453A', marginBottom: 0 }}>
          {roleError}
        </p>
      )}

      {/* Admin toggle */}
      <button
        onClick={handleToggleAdmin}
        disabled={isSelf || adminPending}
        title={isSelf ? 'No puedes modificar tu propio acceso' : undefined}
        style={{
          marginTop: '10px',
          width: '100%',
          padding: '7px 10px',
          borderRadius: '8px',
          border: 'none',
          fontSize: '12px',
          fontWeight: 500,
          cursor: isSelf || adminPending ? 'not-allowed' : 'pointer',
          opacity: isSelf || adminPending ? 0.45 : 1,
          backgroundColor: isAdmin ? 'rgba(255,69,58,0.12)' : 'rgba(48,209,88,0.12)',
          color: isAdmin ? '#FF453A' : '#30D158',
          transition: 'opacity 0.15s ease, background-color 0.15s ease',
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
        }}
      >
        {adminPending ? 'Guardando...' : isAdmin ? 'Quitar admin' : 'Hacer admin'}
      </button>

      {adminError && (
        <p style={{ marginTop: '4px', fontSize: '11px', color: '#FF453A', marginBottom: 0 }}>
          {adminError}
        </p>
      )}

      {/* Join date */}
      <p
        style={{
          marginTop: '12px',
          marginBottom: 0,
          fontSize: '11px',
          color: '#48484A',
        }}
      >
        Desde {formatDate(member.created_at)}
      </p>

      {/* Spinner keyframe */}
      <style>{`
        @keyframes spin {
          to { transform: translateY(-50%) rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
