'use client'

import { useEffect, useRef, useTransition, useCallback, useId, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { taskKeys } from '@/lib/queries/tasks'
import type {
  KanbanBoardWithTasks,
  KanbanTaskWithAssignee,
  Profile,
  TaskPriority,
} from '@/lib/supabase/types'
import { X, Trash2, AlertCircle } from 'lucide-react'

// ── Priority config ────────────────────────────────────────────────────────────

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'low',    label: 'Low',    color: '#3A3A3C' },
  { value: 'medium', label: 'Medium', color: '#FF9F0A' },
  { value: 'high',   label: 'High',   color: '#FF453A' },
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

// ── Shared input style ─────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  backgroundColor: 'var(--dash-surface-3)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '10px',
  padding: '9px 12px',
  fontSize: '14px',
  color: 'var(--dash-text-primary)',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  transition: 'border-color 0.15s',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  color: 'var(--dash-text-tertiary)',
  fontSize: '11px',
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  marginBottom: '6px',
  fontFamily: 'inherit',
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TaskDetailModal({ taskId, projectId, onClose }: TaskDetailModalProps) {
  const queryClient = useQueryClient()
  const panelRef = useRef<HTMLDivElement>(null)
  const firstFocusableRef = useRef<HTMLButtonElement>(null)
  const [isPending, startTransition] = useTransition()

  const titleId = useId()
  const descId = useId()
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
  const [panelVisible, setPanelVisible] = useState(false)

  // Slide-in on mount
  useEffect(() => {
    const raf = requestAnimationFrame(() => setPanelVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  // ── Keyboard: Escape closes ────────────────────────────────────────────────

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // ── Focus panel on open ────────────────────────────────────────────────────

  useEffect(() => {
    firstFocusableRef.current?.focus()
  }, [])

  // ── Focus trap ─────────────────────────────────────────────────────────────

  const handlePanelKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!panelRef.current) return
    const focusable = Array.from(
      panelRef.current.querySelectorAll<HTMLElement>(
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

  // ── Derived values ─────────────────────────────────────────────────────────

  const boardTitle = cached?.boardTitle
  const activePriority = PRIORITY_OPTIONS.find((p) => p.value === form.priority)

  return (
    <div
      className="fixed inset-0 z-50"
      style={{
        backgroundColor: panelVisible ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0)',
        backdropFilter: panelVisible ? 'blur(8px)' : 'blur(0px)',
        WebkitBackdropFilter: panelVisible ? 'blur(8px)' : 'blur(0px)',
        transition: 'background-color 0.3s, backdrop-filter 0.3s',
        display: 'flex',
        justifyContent: 'flex-end',
      }}
      onClick={handleOverlayClick}
      onKeyDown={handlePanelKeyDown}
      role="presentation"
    >
      {/* Side panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex flex-col"
        style={{
          width: '460px',
          maxWidth: '100vw',
          height: '100%',
          backgroundColor: 'var(--dash-surface-1)',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
          transform: panelVisible ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: '-24px 0 80px rgba(0,0,0,0.7)',
          fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div
          className="flex items-start justify-between flex-shrink-0"
          style={{
            padding: '24px 24px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            position: 'sticky',
            top: 0,
            backgroundColor: 'rgba(17,17,17,0.95)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            zIndex: 1,
          }}
        >
          <div className="flex-1 min-w-0 pr-4">
            {boardTitle && (
              <p
                style={{
                  color: 'var(--dash-text-tertiary)',
                  fontSize: '11px',
                  fontWeight: 500,
                  letterSpacing: '0.04em',
                  marginBottom: '4px',
                  textTransform: 'uppercase',
                }}
              >
                {boardTitle}
              </p>
            )}
            <h2
              id={titleId}
              style={{
                color: 'var(--dash-text-primary)',
                fontSize: '20px',
                fontWeight: 600,
                letterSpacing: '-0.02em',
                lineHeight: '1.25',
                wordBreak: 'break-word',
              }}
            >
              {cached?.task.title ?? 'Task'}
            </h2>
          </div>

          {/* Close button — 32px circle */}
          <button
            ref={firstFocusableRef}
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="flex-shrink-0 flex items-center justify-center transition-colors"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: 'var(--dash-border)',
              border: 'none',
              color: 'var(--dash-text-secondary)',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)'
              e.currentTarget.style.color = 'var(--dash-text-primary)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--dash-border)'
              e.currentTarget.style.color = 'var(--dash-text-secondary)'
            }}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable body */}
        <div
          className="flex-1 overflow-y-auto"
          style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}
        >
          {/* Title field */}
          <div>
            <label htmlFor={titleId} style={labelStyle}>
              Title <span style={{ color: '#FF453A' }}>*</span>
            </label>
            <input
              id={titleId}
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Task title"
              style={inputStyle}
              disabled={isPending}
              autoComplete="off"
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'rgba(0,113,227,0.6)'
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--dash-border)'
              }}
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor={descId} style={labelStyle}>
              Description
            </label>
            <textarea
              id={descId}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Add a description..."
              rows={4}
              disabled={isPending}
              style={{
                ...inputStyle,
                resize: 'vertical',
                minHeight: '90px',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'rgba(0,113,227,0.6)'
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--dash-border)'
              }}
            />
          </div>

          {/* Priority — pill buttons */}
          <div>
            <p style={labelStyle}>Priority</p>
            <div className="flex gap-2">
              {PRIORITY_OPTIONS.map(({ value, label, color }) => {
                const isActive = form.priority === value
                return (
                  <button
                    key={value}
                    type="button"
                    disabled={isPending}
                    onClick={() => setForm((f) => ({ ...f, priority: value }))}
                    className="flex items-center gap-1.5 transition-colors"
                    style={{
                      flex: 1,
                      padding: '7px 10px',
                      borderRadius: '10px',
                      fontSize: '13px',
                      fontWeight: 500,
                      border: isActive
                        ? `1px solid ${color}60`
                        : '1px solid rgba(255,255,255,0.06)',
                      backgroundColor: isActive ? `${color}18` : 'var(--dash-surface-3)',
                      color: isActive ? color : 'var(--dash-text-tertiary)',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      justifyContent: 'center',
                    }}
                  >
                    <span
                      className="rounded-full flex-shrink-0"
                      style={{
                        width: '6px',
                        height: '6px',
                        backgroundColor: color,
                      }}
                      aria-hidden="true"
                    />
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Status / board indicator (read-only) */}
          {boardTitle && (
            <div>
              <p style={labelStyle}>Status</p>
              <div
                className="flex items-center gap-2"
                style={{
                  backgroundColor: 'var(--dash-surface-3)',
                  borderRadius: '10px',
                  padding: '9px 12px',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <span
                  className="rounded-full flex-shrink-0"
                  style={{
                    width: '6px',
                    height: '6px',
                    backgroundColor: activePriority?.color ?? '#3A3A3C',
                  }}
                  aria-hidden="true"
                />
                <span style={{ color: 'var(--dash-text-secondary)', fontSize: '14px' }}>{boardTitle}</span>
              </div>
            </div>
          )}

          {/* Due date */}
          <div>
            <label htmlFor={dueDateId} style={labelStyle}>
              Due date
            </label>
            <input
              id={dueDateId}
              type="date"
              value={form.due_date}
              onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
              disabled={isPending}
              style={{
                ...inputStyle,
                cursor: 'pointer',
                colorScheme: 'dark',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'rgba(0,113,227,0.6)'
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--dash-border)'
              }}
            />
          </div>

          {/* Assignee */}
          <div>
            <label htmlFor={assigneeId} style={labelStyle}>
              Assignee
            </label>
            <div style={{ position: 'relative' }}>
              <select
                id={assigneeId}
                value={form.assignee_id}
                onChange={(e) => setForm((f) => ({ ...f, assignee_id: e.target.value }))}
                disabled={isPending}
                style={{
                  ...inputStyle,
                  appearance: 'none',
                  cursor: 'pointer',
                  paddingRight: '32px',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(0,113,227,0.6)'
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--dash-border)'
                }}
              >
                <option value="">Unassigned</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name ?? p.email ?? p.id}
                  </option>
                ))}
              </select>
              {/* Chevron indicator */}
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  color: 'var(--dash-text-tertiary)',
                  fontSize: '10px',
                  lineHeight: 1,
                }}
              >
                &#8964;
              </span>
            </div>
          </div>

          {/* Save error */}
          {saveError && (
            <div
              className="flex items-start gap-2"
              style={{
                backgroundColor: 'rgba(255,69,58,0.08)',
                border: '1px solid rgba(255,69,58,0.25)',
                borderRadius: '10px',
                padding: '10px 12px',
              }}
            >
              <AlertCircle size={14} style={{ color: '#FF453A', flexShrink: 0, marginTop: '1px' }} aria-hidden="true" />
              <p style={{ color: '#FF453A', fontSize: '13px' }}>{saveError}</p>
            </div>
          )}

          {/* Delete error */}
          {deleteError && (
            <div
              className="flex items-start gap-2"
              style={{
                backgroundColor: 'rgba(255,69,58,0.08)',
                border: '1px solid rgba(255,69,58,0.25)',
                borderRadius: '10px',
                padding: '10px 12px',
              }}
            >
              <AlertCircle size={14} style={{ color: '#FF453A', flexShrink: 0, marginTop: '1px' }} aria-hidden="true" />
              <p style={{ color: '#FF453A', fontSize: '13px' }}>{deleteError}</p>
            </div>
          )}

          {/* Delete confirmation inline */}
          {deleteConfirm && (
            <div
              style={{
                backgroundColor: 'rgba(255,69,58,0.06)',
                border: '1px solid rgba(255,69,58,0.2)',
                borderRadius: '12px',
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <p style={{ color: '#FF6961', fontSize: '14px', fontWeight: 500 }}>
                Delete this task permanently?
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  disabled={isPending}
                  style={{
                    flex: 1,
                    backgroundColor: '#FF453A',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '9px 12px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    opacity: isPending ? 0.5 : 1,
                  }}
                >
                  {isPending ? 'Deleting...' : 'Yes, delete'}
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(false)}
                  disabled={isPending}
                  style={{
                    flex: 1,
                    backgroundColor: 'var(--dash-surface-3)',
                    color: 'var(--dash-text-primary)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '8px',
                    padding: '9px 12px',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    opacity: isPending ? 0.5 : 1,
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between flex-shrink-0"
          style={{
            padding: '16px 24px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            backgroundColor: 'rgba(17,17,17,0.95)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
        >
          {/* Delete trigger */}
          {!deleteConfirm ? (
            <button
              type="button"
              onClick={handleDeleteRequest}
              disabled={isPending}
              aria-label="Delete task"
              className="flex items-center gap-1.5 transition-colors"
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: 'var(--dash-text-tertiary)',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'inherit',
                padding: '7px 10px',
                borderRadius: '8px',
                opacity: isPending ? 0.4 : 1,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#FF453A'
                e.currentTarget.style.backgroundColor = 'rgba(255,69,58,0.08)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--dash-text-tertiary)'
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              <Trash2 size={13} aria-hidden="true" />
              Delete
            </button>
          ) : (
            <span />
          )}

          {/* Primary actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              style={{
                backgroundColor: 'var(--dash-surface-3)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'var(--dash-text-secondary)',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'inherit',
                opacity: isPending ? 0.4 : 1,
                transition: 'background-color 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#3A3A3C'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--dash-surface-3)'
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending || !form.title.trim()}
              style={{
                backgroundColor: '#0071E3',
                border: 'none',
                color: '#fff',
                borderRadius: '8px',
                padding: '8px 18px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: isPending || !form.title.trim() ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                opacity: isPending || !form.title.trim() ? 0.4 : 1,
                transition: 'opacity 0.15s, background-color 0.15s',
              }}
              onMouseEnter={(e) => {
                if (!isPending && form.title.trim()) {
                  e.currentTarget.style.backgroundColor = '#0077ED'
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#0071E3'
              }}
            >
              {isPending ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
