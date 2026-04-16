'use client'

import { useEffect, useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile, ProjectAssignmentWithProfile } from '@/lib/supabase/types'
import { X, UserPlus, Loader } from 'lucide-react'

interface Props {
  projectId: string
}

function getInitials(name: string | null): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

const ROLE_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
  lead: { bg: 'rgba(191,90,242,0.15)', text: '#BF5AF2', ring: 'rgba(191,90,242,0.3)' },
  editor: { bg: 'rgba(0,113,227,0.15)', text: '#409CFF', ring: 'rgba(0,113,227,0.3)' },
  member: { bg: 'rgba(72,72,74,0.4)', text: '#86868B', ring: 'rgba(255,255,255,0.08)' },
}

function getRoleColor(role: string) {
  return ROLE_COLORS[role] ?? ROLE_COLORS['member']
}

const selectBase: React.CSSProperties = {
  backgroundColor: '#1C1C1E',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  padding: '9px 12px',
  color: '#F5F5F7',
  fontSize: '13px',
  outline: 'none',
}

export function ProjectAssignments({ projectId }: Props) {
  const supabase = createClient()
  const [assignments, setAssignments] = useState<ProjectAssignmentWithProfile[]>([])
  const [allStaff, setAllStaff] = useState<Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'email'>[]>([])
  const [showPicker, setShowPicker] = useState(false)
  const [selectedProfileId, setSelectedProfileId] = useState<string>('')
  const [selectedRole, setSelectedRole] = useState<string>('member')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function loadAssignments() {
    const { data, error: fetchErr } = await supabase
      .from('project_assignments')
      .select('*, profile:profiles(id, full_name, avatar_url, email)')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })

    if (fetchErr) {
      setError(fetchErr.message)
      return
    }
    setAssignments((data ?? []) as unknown as ProjectAssignmentWithProfile[])
  }

  async function loadStaff() {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, email')
      .eq('is_admin_team', true)
      .order('full_name', { ascending: true })

    setAllStaff((data ?? []) as Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'email'>[])
  }

  useEffect(() => {
    void loadAssignments()
    void loadStaff()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const assignedIds = new Set(assignments.map((a) => a.profile_id))
  const availableStaff = allStaff.filter((p) => !assignedIds.has(p.id))

  function handleAdd() {
    if (!selectedProfileId) return
    setError(null)
    startTransition(async () => {
      const { error: insertErr } = await supabase.from('project_assignments').insert({
        project_id: projectId,
        profile_id: selectedProfileId,
        role: selectedRole,
      })
      if (insertErr) {
        setError(insertErr.message)
        return
      }
      setShowPicker(false)
      setSelectedProfileId('')
      setSelectedRole('member')
      await loadAssignments()
    })
  }

  function handleRemove(assignmentId: string) {
    setError(null)
    startTransition(async () => {
      const { error: deleteErr } = await supabase
        .from('project_assignments')
        .delete()
        .eq('id', assignmentId)
      if (deleteErr) {
        setError(deleteErr.message)
        return
      }
      await loadAssignments()
    })
  }

  return (
    <div className="space-y-3">
      {error && (
        <p style={{ fontSize: '12px', color: '#FF453A', padding: '0 4px' }}>{error}</p>
      )}

      {assignments.length === 0 && (
        <p style={{ fontSize: '13px', color: '#48484A', padding: '0 4px' }}>
          Sin miembros asignados.
        </p>
      )}

      <ul className="space-y-2">
        {assignments.map((a) => {
          const roleColor = getRoleColor(a.role)
          return (
            <li
              key={a.id}
              className="flex items-center gap-3"
              style={{
                backgroundColor: '#1C1C1E',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px',
                padding: '12px 16px',
              }}
            >
              {/* Avatar */}
              <div
                className="flex-shrink-0 flex items-center justify-center select-none"
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: '#2C2C2E',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#86868B',
                  letterSpacing: '0.02em',
                }}
              >
                {getInitials(a.profile.full_name)}
              </div>

              {/* Name + email */}
              <div className="flex-1 min-w-0">
                <p
                  className="truncate"
                  style={{ fontSize: '14px', fontWeight: 500, color: '#F5F5F7' }}
                >
                  {a.profile.full_name ?? a.profile.email ?? 'Desconocido'}
                </p>
                {a.profile.email && (
                  <p
                    className="truncate"
                    style={{ fontSize: '12px', color: '#86868B', marginTop: '1px' }}
                  >
                    {a.profile.email}
                  </p>
                )}
              </div>

              {/* Role badge */}
              <span
                className="flex-shrink-0 inline-flex items-center"
                style={{
                  fontSize: '11px',
                  fontWeight: 500,
                  letterSpacing: '0.04em',
                  borderRadius: '20px',
                  padding: '3px 9px',
                  backgroundColor: roleColor.bg,
                  color: roleColor.text,
                  boxShadow: `0 0 0 1px ${roleColor.ring}`,
                }}
              >
                {a.role}
              </span>

              {/* Remove */}
              <button
                type="button"
                aria-label={`Remover ${a.profile.full_name ?? 'miembro'}`}
                disabled={isPending}
                onClick={() => handleRemove(a.id)}
                className="flex-shrink-0 flex items-center justify-center transition-colors"
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: '#48484A',
                  cursor: isPending ? 'not-allowed' : 'pointer',
                  opacity: isPending ? 0.4 : 1,
                }}
                onMouseOver={(e) => {
                  if (!isPending) {
                    e.currentTarget.style.color = '#FF453A'
                    e.currentTarget.style.backgroundColor = 'rgba(255,69,58,0.1)'
                  }
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.color = '#48484A'
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </li>
          )
        })}
      </ul>

      {/* Assign picker */}
      {showPicker ? (
        <div
          style={{
            backgroundColor: '#1C1C1E',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
            padding: '18px 20px',
          }}
          className="space-y-4"
        >
          <p
            style={{
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: '#48484A',
            }}
          >
            Asignar miembro
          </p>

          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={selectedProfileId}
              onChange={(e) => setSelectedProfileId(e.target.value)}
              style={{ ...selectBase, flex: 1, minWidth: 0 }}
            >
              <option value="">Seleccionar persona...</option>
              {availableStaff.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name ?? p.email ?? p.id}
                </option>
              ))}
            </select>

            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              style={{ ...selectBase, width: '140px' }}
            >
              <option value="member">member</option>
              <option value="lead">lead</option>
              <option value="editor">editor</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!selectedProfileId || isPending}
              onClick={handleAdd}
              className="flex items-center gap-1.5"
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 500,
                borderRadius: '8px',
                backgroundColor: '#0071E3',
                border: 'none',
                color: '#FFFFFF',
                cursor: !selectedProfileId || isPending ? 'not-allowed' : 'pointer',
                opacity: !selectedProfileId || isPending ? 0.5 : 1,
                transition: 'opacity 0.15s ease',
              }}
            >
              {isPending ? (
                <Loader className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <UserPlus className="w-3.5 h-3.5" />
              )}
              Asignar
            </button>
            <button
              type="button"
              onClick={() => {
                setShowPicker(false)
                setSelectedProfileId('')
                setSelectedRole('member')
              }}
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 500,
                borderRadius: '8px',
                backgroundColor: 'transparent',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#86868B',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Cancelar
            </button>
          </div>

          {availableStaff.length === 0 && (
            <p style={{ fontSize: '12px', color: '#48484A' }}>
              Todo el equipo ya esta asignado a este proyecto.
            </p>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowPicker(true)}
          className="flex items-center gap-2 transition-colors"
          style={{
            fontSize: '13px',
            fontWeight: 500,
            color: '#0071E3',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px 0',
          }}
        >
          <UserPlus className="w-4 h-4" />
          Asignar miembro
        </button>
      )}
    </div>
  )
}
