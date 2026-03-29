'use client'

import { useEffect, useRef, useTransition, useCallback, useId, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { taskKeys } from '@/lib/queries/tasks'
import type { KanbanBoardWithTasks, KanbanTaskWithAssignee, Profile, TaskPriority } from '@/lib/supabase/types'
import { X, Trash2, AlertCircle } from 'lucide-react'

// ── Priority config ────────────────────────────────────────────────────────────

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; dot: string }[] = [
  { value: 'low',    label: 'Low',    dot: 'bg-zinc-400' },
  { value: 'medium', label: 'Medium', dot: 'bg-amber-400' },
  { value: 'high',   label: 'High',   dot: 'bg-red-400' },
]

// ── Types ─────────────────────────────────────────────────────────────────────

interface TaskDetailModalProps {
  taskId: string
  projectId?: string
  onClose: () => void
}

interface FormState {
  title: string
  description: string
  priority: TaskPriority
  due_date: string
  assignee_id: string
}

// ── Helper: find task in boards cache ─────────────────────────────────────────

function findTaskInBoards(
  boards: KanbanBoardWithTasks[],
  taskId: string
): { task: KanbanTaskWithAssignee; boardTitle: string } | null {
  for (const board of boards) {
    const task = board.tasks.find((t) => t.id === taskId)
    if (task) return { task, boardTitle: board.title }
  }
  return null
}

// ── Input / Textarea / Select base classes ─────────────────────────────────────

const inputCls =
  'w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 ' +
  'focus:outline-none focus:ring-1 focus:ring-zinc-500 focus:border-zinc-500 transition-colors disabled:opacity-50'

const labelCls = 'block font-mono text-[11px] uppercase tracking-widest text-zinc-500 mb-1.5'

// ── Component ─────────────────────────────────────────────────────────────────

export function TaskDetailModal({ taskId, projectId, onClose }: TaskDetailModalProps) {
  const queryClient = useQueryClient()
  const dialogRef = useRef<HTMLDivElement>(null)
  const firstFocusableRef = useRef<HTMLButtonElement>(null)
  const [isPending, startTransition] = useTransition()

  const titleId = useId()
  const descId = useId()
  const priorityId = useId()
  const dueDateId = useId()
  const assigneeId = useId()

  // ── Derive task from cache ─────────────────────────────────────────────────

  const boards = queryClient.getQueryData<KanbanBoardWithTasks[]>(taskKeys.boards(projectId)) ?? []
  const cached = findTaskInBoards(boards, taskId)

  // ── Profiles list ──────────────────────────────────────────────────────────

  const [profiles, setProfiles] = useState<Profile[]>([])

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('profiles')
      .select('*')
      .eq('is_admin_team', true)
      .order('full_name', { ascending: true })
      .then(({ data }) => {
        if (data) setProfiles(data as Profile[])
      })
  }, [])

  // ── Form state ─────────────────────────────────────────────────────────────

  const [form, setForm] = useState<FormState>(() => ({
    title: cached?.task.title ?? '',
    description: cached?.task.description ?? '',
    priority: cached?.task.priority ?? 'medium',
    due_date: cached?.task.due_date?.slice(0, 10) ?? '',
    assignee_id: cached?.task.assignee_id ?? '',
  }))

  const [saveError, setSaveError] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // ── Keyboard: Escape closes ────────────────────────────────────────────────

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // ── Focus trap ─────────────────────────────────────────────────────────────

  useEffect(() => {
    firstFocusableRef.current?.focus()
  }, [])

  const handleOverlayKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!dialogRef.current) return
    const focusable = Array.from(
      dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => !el.hasAttribute('disabled'))
    if (focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (e.key === 'Tab') {
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
  }, [])

  // ── Save ──────────────────────────────────────────────────────────────────

  function handleSave() {
    if (!form.title.trim()) {
      setSaveError('Title is required.')
      return
    }
    setSaveError(null)

    startTransition(async () => {
      const supabase = createClient()
      const { error } = await supabase
        .from('tasks')
        .update({
          title: form.title.trim(),
          description: form.description.trim() || null,
          priority: form.priority,
          due_date: form.due_date || null,
          assignee_id: form.assignee_id || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId)

      if (error) {
        setSaveError(error.message)
        return
      }

      await queryClient.invalidateQueries({ queryKey: taskKeys.boards(projectId) })
      onClose()
    })
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  function handleDeleteRequest() {
    setDeleteConfirm(true)
    setDeleteError(null)
  }

  function handleDeleteConfirm() {
    startTransition(async () => {
      const supabase = createClient()
      const { error } = await supabase.from('tasks').delete().eq('id', taskId)

      if (error) {
        setDeleteError(error.message)
        setDeleteConfirm(false)
        return
      }

      await queryClient.invalidateQueries({ queryKey: taskKeys.boards(projectId) })
      onClose()
    })
  }

  // ── Overlay click ──────────────────────────────────────────────────────────

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose()
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const boardTitle = cached?.boardTitle

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={handleOverlayClick}
      onKeyDown={handleOverlayKeyDown}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={[
          'relative w-full max-w-lg mx-4 rounded-2xl shadow-2xl',
          'bg-[#080808] border border-zinc-800',
          'flex flex-col max-h-[90vh]',
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-zinc-800 flex-shrink-0">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-600 mb-0.5">
              Task
            </p>
            {boardTitle && (
              <p className="font-mono text-[11px] text-zinc-500">
                {boardTitle}
              </p>
            )}
          </div>
          <button
            ref={firstFocusableRef}
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* Title */}
          <div>
            <label htmlFor={titleId} className={labelCls}>
              Title <span className="text-red-500">*</span>
            </label>
            <input
              id={titleId}
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Task title"
              className={inputCls}
              disabled={isPending}
              autoComplete="off"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor={descId} className={labelCls}>
              Description
            </label>
            <textarea
              id={descId}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Add a description..."
              rows={4}
              className={[inputCls, 'resize-y min-h-[80px]'].join(' ')}
              disabled={isPending}
            />
          </div>

          {/* Priority + Due date side by side */}
          <div className="grid grid-cols-2 gap-4">
            {/* Priority */}
            <div>
              <label htmlFor={priorityId} className={labelCls}>
                Priority
              </label>
              <div className="relative">
                <select
                  id={priorityId}
                  value={form.priority}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, priority: e.target.value as TaskPriority }))
                  }
                  className={[inputCls, 'appearance-none pr-8 cursor-pointer'].join(' ')}
                  disabled={isPending}
                >
                  {PRIORITY_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                {/* Color dot indicator */}
                <span
                  className={[
                    'pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full',
                    PRIORITY_OPTIONS.find((p) => p.value === form.priority)?.dot ?? '',
                  ].join(' ')}
                  aria-hidden="true"
                />
              </div>
            </div>

            {/* Due date */}
            <div>
              <label htmlFor={dueDateId} className={labelCls}>
                Due date
              </label>
              <input
                id={dueDateId}
                type="date"
                value={form.due_date}
                onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                className={[inputCls, 'cursor-pointer [color-scheme:dark]'].join(' ')}
                disabled={isPending}
              />
            </div>
          </div>

          {/* Assignee */}
          <div>
            <label htmlFor={assigneeId} className={labelCls}>
              Assignee
            </label>
            <select
              id={assigneeId}
              value={form.assignee_id}
              onChange={(e) => setForm((f) => ({ ...f, assignee_id: e.target.value }))}
              className={[inputCls, 'appearance-none cursor-pointer'].join(' ')}
              disabled={isPending}
            >
              <option value="">Unassigned</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name ?? p.email ?? p.id}
                </option>
              ))}
            </select>
          </div>

          {/* Save error */}
          {saveError && (
            <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5">
              <AlertCircle size={14} className="mt-0.5 flex-shrink-0 text-red-400" aria-hidden="true" />
              <p className="text-xs text-red-400 font-mono">{saveError}</p>
            </div>
          )}

          {/* Delete error */}
          {deleteError && (
            <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5">
              <AlertCircle size={14} className="mt-0.5 flex-shrink-0 text-red-400" aria-hidden="true" />
              <p className="text-xs text-red-400 font-mono">{deleteError}</p>
            </div>
          )}

          {/* Delete confirmation inline */}
          {deleteConfirm && (
            <div className="rounded-xl border border-red-800/50 bg-red-950/30 px-4 py-3 space-y-3">
              <p className="text-sm text-red-300 font-mono">
                Delete this task permanently?
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  disabled={isPending}
                  className={[
                    'flex-1 rounded-lg px-3 py-2 text-xs font-mono font-medium transition-colors',
                    'bg-red-700 hover:bg-red-600 text-white disabled:opacity-50',
                  ].join(' ')}
                >
                  {isPending ? 'Deleting...' : 'Yes, delete'}
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(false)}
                  disabled={isPending}
                  className={[
                    'flex-1 rounded-lg px-3 py-2 text-xs font-mono font-medium transition-colors',
                    'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 disabled:opacity-50',
                  ].join(' ')}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-zinc-800 flex-shrink-0">
          {/* Delete trigger */}
          {!deleteConfirm && (
            <button
              type="button"
              onClick={handleDeleteRequest}
              disabled={isPending}
              aria-label="Delete task"
              className={[
                'flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-mono transition-colors',
                'text-zinc-500 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-50',
              ].join(' ')}
            >
              <Trash2 size={13} aria-hidden="true" />
              Delete
            </button>
          )}

          {/* Spacer when confirm panel is shown */}
          {deleteConfirm && <span />}

          {/* Primary actions */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className={[
                'rounded-lg px-4 py-2 text-xs font-mono transition-colors',
                'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-50',
              ].join(' ')}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending || !form.title.trim()}
              className={[
                'rounded-lg px-4 py-2 text-xs font-mono font-medium transition-colors',
                'bg-zinc-100 hover:bg-white text-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed',
              ].join(' ')}
            >
              {isPending ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
