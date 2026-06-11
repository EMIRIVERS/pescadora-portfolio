'use client'

import Image from 'next/image'
import { useTransition, useState, useRef } from 'react'
import { changeTeamMemberRole } from '@/lib/actions/invite-team-member'
import { toggleAdminStatus, setStaffRole } from '@/lib/actions/team'
import { STAFF_ROLES, STAFF_ROLE_LABELS } from '@/lib/auth/permissions'
import type { StaffRole } from '@/lib/supabase/types'
import DeleteMemberButton from './DeleteMemberButton'

const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif"

const ROLE_OPTIONS = [
  'admin_staff',
  'Fotógrafo',
  'Videógrafo',
  'Editor',
  'Director',
  'Productor',
  'Asistente',
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
    staff_role: StaffRole | null
    created_at: string
  }
  currentUserId: string
  /** El usuario actual es owner → puede asignar permisos (staff_role). */
  canManageRoles: boolean
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

export default function TeamMemberCard({ member, currentUserId, canManageRoles }: Props) {
  const isSelf = member.id === currentUserId

  const [staffRole, setStaffRoleState] = useState<StaffRole | null>(member.staff_role)
  const [staffRoleError, setStaffRoleError] = useState<string | null>(null)
  const [staffPending, startStaffTransition] = useTransition()

  function handleStaffRoleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as StaffRole
    const prev = staffRole
    setStaffRole_(next, prev)
  }
  function setStaffRole_(next: StaffRole, prev: StaffRole | null) {
    setStaffRoleState(next)
    setStaffRoleError(null)
    startStaffTransition(async () => {
      const result = await setStaffRole(member.id, next)
      if (result.error) {
        setStaffRoleError(result.error)
        setStaffRoleState(prev)
      }
    })
  }

  const displayName = member.full_name ?? member.email ?? '?'
  const initial = displayName[0]?.toUpperCase() ?? '?'
  const avatarBg = nameToHsl(displayName)

  const normaliseRole = (r: string | null): RoleOption =>
    ROLE_OPTIONS.includes(r as RoleOption) ? (r as RoleOption) : 'Asistente'

  const [currentRole, setCurrentRole] = useState<RoleOption>(normaliseRole(member.role))
  const [isAdmin, setIsAdmin] = useState(member.is_admin_team)
  const [roleEditing, setRoleEditing] = useState(false)
  const [roleError, setRoleError] = useState<string | null>(null)
  const [adminError, setAdminError] = useState<string | null>(null)
  const [hovered, setHovered] = useState(false)

  const [rolePending, startRoleTransition] = useTransition()
  const [adminPending, startAdminTransition] = useTransition()

  const selectRef = useRef<HTMLSelectElement>(null)

  function openRoleEditor() {
    if (rolePending) return
    setRoleEditing(true)
    // Focus the select after React renders it
    setTimeout(() => selectRef.current?.focus(), 0)
  }

  function commitRole(value: string) {
    const next = normaliseRole(value)
    setRoleEditing(false)
    if (next === currentRole) return
    const prev = currentRole
    setCurrentRole(next)
    setRoleError(null)
    startRoleTransition(async () => {
      const result = await changeTeamMemberRole(member.id, next)
      if (result.error) {
        setRoleError(result.error)
        setCurrentRole(prev)
      }
    })
  }

  function handleSelectChange(e: React.ChangeEvent<HTMLSelectElement>) {
    commitRole(e.target.value)
  }

  function handleSelectBlur(e: React.FocusEvent<HTMLSelectElement>) {
    commitRole(e.target.value)
  }

  function handleSelectKeyDown(e: React.KeyboardEvent<HTMLSelectElement>) {
    if (e.key === 'Enter') {
      commitRole((e.target as HTMLSelectElement).value)
    } else if (e.key === 'Escape') {
      setRoleEditing(false)
    }
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

  // Role badge color
  const roleBadgeColor = currentRole === 'admin_staff' ? 'var(--dash-purple, #BF5AF2)' : 'var(--dash-accent)'

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: hovered ? 'var(--dash-surface-2)' : 'var(--dash-surface-1)',
        border: '1px solid var(--dash-border)',
        borderRadius: '16px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        transition: 'background-color 0.15s ease, box-shadow 0.15s ease',
        gap: '0px',
        boxShadow: hovered
          ? '0 4px 16px rgba(0,0,0,0.60), 0 2px 6px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.07)'
          : '0 2px 8px rgba(0,0,0,0.55), 0 1px 2px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.07)',
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
              fontFamily: FONT,
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
          color: 'var(--dash-text-primary)',
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
            color: 'var(--dash-text-secondary)',
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

      {/* Role — badge that becomes an inline select on click */}
      <div style={{ marginTop: '12px', width: '100%', position: 'relative' }}>
        {roleEditing ? (
          <select
            ref={selectRef}
            defaultValue={currentRole}
            onChange={handleSelectChange}
            onBlur={handleSelectBlur}
            onKeyDown={handleSelectKeyDown}
            disabled={rolePending}
            style={{
              width: '100%',
              backgroundColor: 'var(--dash-surface-3)',
              border: `1px solid ${roleBadgeColor}`,
              borderRadius: '8px',
              color: 'var(--dash-text-primary)',
              fontSize: '13px',
              fontWeight: 500,
              padding: '6px 10px',
              appearance: 'none',
              cursor: 'pointer',
              fontFamily: FONT,
              outline: 'none',
            }}
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r} style={{ backgroundColor: 'var(--dash-surface-3)', color: 'var(--dash-text-primary)' }}>
                {r}
              </option>
            ))}
          </select>
        ) : (
          <button
            onClick={openRoleEditor}
            disabled={rolePending}
            title="Cambiar rol"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '20px',
              border: 'none',
              backgroundColor: `${roleBadgeColor}26`,
              color: roleBadgeColor,
              fontSize: '12px',
              fontWeight: 600,
              cursor: rolePending ? 'not-allowed' : 'pointer',
              opacity: rolePending ? 0.6 : 1,
              fontFamily: FONT,
              transition: 'opacity 0.15s ease',
              lineHeight: 1.4,
            }}
          >
            {rolePending ? 'Guardando...' : currentRole}
            {/* Pencil icon */}
            <svg
              width="11"
              height="11"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              style={{ flexShrink: 0 }}
            >
              <path d="M8.5 1.5 10.5 3.5 4 10 1.5 10.5 2 8Z" />
            </svg>
          </button>
        )}

        {/* Spinner overlay while pending in badge mode */}
        {rolePending && !roleEditing && (
          <span
            style={{
              position: 'absolute',
              right: '-18px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '11px',
              height: '11px',
              border: '2px solid var(--dash-border-strong)',
              borderTop: '2px solid #F5F5F7',
              borderRadius: '50%',
              animation: 'spin 0.6s linear infinite',
            }}
          />
        )}
      </div>

      {roleError && (
        <p style={{ marginTop: '4px', fontSize: '11px', color: 'var(--dash-danger)', marginBottom: 0 }}>
          {roleError}
        </p>
      )}

      {/* Permisos (RBAC staff_role) */}
      {isAdmin && (
        <div style={{ marginTop: '10px', width: '100%' }}>
          <p style={{ margin: '0 0 4px', fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--dash-text-tertiary)', fontFamily: FONT }}>
            Permisos
          </p>
          {canManageRoles ? (
            <select
              value={staffRole ?? ''}
              onChange={handleStaffRoleChange}
              disabled={staffPending}
              style={{
                width: '100%',
                backgroundColor: 'var(--dash-surface-3)',
                border: '1px solid var(--dash-border)',
                borderRadius: '8px',
                color: 'var(--dash-text-primary)',
                fontSize: '13px',
                fontWeight: 500,
                padding: '6px 10px',
                appearance: 'none',
                cursor: staffPending ? 'not-allowed' : 'pointer',
                fontFamily: FONT,
                outline: 'none',
                opacity: staffPending ? 0.6 : 1,
              }}
            >
              {staffRole === null && <option value="">Sin rol</option>}
              {STAFF_ROLES.map((r) => (
                <option key={r} value={r} style={{ backgroundColor: 'var(--dash-surface-3)', color: 'var(--dash-text-primary)' }}>
                  {STAFF_ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          ) : (
            <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, backgroundColor: 'rgba(0,113,227,0.15)', color: '#0071E3', fontFamily: FONT }}>
              {staffRole ? STAFF_ROLE_LABELS[staffRole] : 'Sin rol'}
            </span>
          )}
        </div>
      )}

      {staffRoleError && (
        <p style={{ marginTop: '4px', fontSize: '11px', color: 'var(--dash-danger)', marginBottom: 0 }}>
          {staffRoleError}
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
          color: isAdmin ? 'var(--dash-danger)' : 'var(--dash-success)',
          transition: 'opacity 0.15s ease, background-color 0.15s ease',
          fontFamily: FONT,
        }}
      >
        {adminPending ? 'Guardando...' : isAdmin ? 'Quitar admin' : 'Hacer admin'}
      </button>

      {adminError && (
        <p style={{ marginTop: '4px', fontSize: '11px', color: 'var(--dash-danger)', marginBottom: 0 }}>
          {adminError}
        </p>
      )}

      {/* Join date */}
      <p
        style={{
          marginTop: '12px',
          marginBottom: 0,
          fontSize: '11px',
          color: 'var(--dash-text-tertiary)',
        }}
      >
        Desde {formatDate(member.created_at)}
      </p>

      {/* Delete button — hidden for self */}
      {!isSelf && (
        <DeleteMemberButton
          memberId={member.id}
          memberName={displayName}
        />
      )}

      {/* Spinner keyframe */}
      <style>{`
        @keyframes spin {
          to { transform: translateY(-50%) rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
