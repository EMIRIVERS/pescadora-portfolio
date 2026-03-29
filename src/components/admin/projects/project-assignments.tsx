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

const ROLE_STYLES: Record<string, string> = {
  lead: 'bg-violet-500/15 text-violet-400 ring-1 ring-violet-500/30',
  editor: 'bg-sky-500/15 text-sky-400 ring-1 ring-sky-500/30',
  member: 'bg-zinc-500/15 text-zinc-400 ring-1 ring-zinc-500/30',
}

function roleBadgeClass(role: string): string {
  return ROLE_STYLES[role] ?? ROLE_STYLES['member']
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
        <p className="text-xs font-mono text-red-400/80 px-1">{error}</p>
      )}

      {assignments.length === 0 && (
        <p className="text-xs font-mono text-zinc-600 px-1">
          Sin miembros asignados.
        </p>
      )}

      <ul className="space-y-2">
        {assignments.map((a) => (
          <li
            key={a.id}
            className="flex items-center gap-3 rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-3"
          >
            {/* Avatar */}
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-mono text-zinc-400 select-none">
              {getInitials(a.profile.full_name)}
            </div>

            {/* Name + email */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-mono text-zinc-200 truncate">
                {a.profile.full_name ?? a.profile.email ?? 'Unknown'}
              </p>
              {a.profile.email && (
                <p className="text-[11px] font-mono text-zinc-500 truncate">
                  {a.profile.email}
                </p>
              )}
            </div>

            {/* Role badge */}
            <span
              className={[
                'flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono tracking-wide',
                roleBadgeClass(a.role),
              ].join(' ')}
            >
              {a.role}
            </span>

            {/* Remove */}
            <button
              type="button"
              aria-label={`Remover ${a.profile.full_name ?? 'miembro'}`}
              disabled={isPending}
              onClick={() => handleRemove(a.id)}
              className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded text-zinc-600 hover:text-red-400 hover:bg-red-900/20 transition-colors disabled:opacity-40"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </li>
        ))}
      </ul>

      {/* Assign picker */}
      {showPicker ? (
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-4 space-y-3">
          <p className="text-[10px] font-mono tracking-[0.2em] uppercase text-zinc-500">
            Asignar miembro
          </p>

          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={selectedProfileId}
              onChange={(e) => setSelectedProfileId(e.target.value)}
              className="flex-1 min-w-0 bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-mono rounded-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-500"
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
              className="w-full sm:w-36 bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-mono rounded-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-500"
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
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-white text-zinc-900 text-xs font-mono rounded-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <Loader className="w-3 h-3 animate-spin" />
              ) : (
                <UserPlus className="w-3 h-3" />
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
              className="px-3 py-1.5 text-zinc-500 hover:text-zinc-200 text-xs font-mono rounded-sm transition-colors"
            >
              Cancelar
            </button>
          </div>

          {availableStaff.length === 0 && (
            <p className="text-[11px] font-mono text-zinc-600">
              Todo el equipo ya esta asignado a este proyecto.
            </p>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowPicker(true)}
          className="flex items-center gap-1.5 text-xs font-mono text-zinc-500 hover:text-zinc-200 transition-colors"
        >
          <UserPlus className="w-3.5 h-3.5" />
          Asignar miembro
        </button>
      )}
    </div>
  )
}
