'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus, Check, X } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { KanbanBoardWithTasks, TaskPriority } from '@/lib/supabase/types'
import { TaskCard } from './task-card'
import { NEW_TASK_EVENT } from './new-task-button'
import { useCreateTask, useTaskCategories, useCreateCategory } from '@/lib/queries/tasks'

// ── Shared field style ─────────────────────────────────────────────────────────

const fieldStyle: React.CSSProperties = {
  width: '100%',
  backgroundColor: 'var(--dash-surface-2)',
  border: '1px solid var(--dash-border-strong)',
  borderRadius: '8px',
  padding: '7px 10px',
  fontSize: '12px',
  color: 'var(--dash-text-primary)',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  colorScheme: 'dark',
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface KanbanColumnProps {
  board: KanbanBoardWithTasks
  projectId?: string
  projects?: { id: string; title: string }[]
  /** La primera columna ("Por hacer") responde al botón global "Nueva tarea". */
  isPrimary?: boolean
  onOpenTaskDetail?: (taskId: string) => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export function KanbanColumn({ board, projectId, projects = [], isPrimary = false, onOpenTaskDetail }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: board.id })

  const [isAdding, setIsAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newPriority, setNewPriority] = useState<TaskPriority>('medium')
  const [newDueDate, setNewDueDate] = useState('')
  const [newProjectId, setNewProjectId] = useState(projectId ?? '')
  const [newCategory, setNewCategory] = useState('')
  const [creatingCategory, setCreatingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')

  const titleRef = useRef<HTMLTextAreaElement>(null)

  const createTask = useCreateTask(projectId)
  const { data: categories = [] } = useTaskCategories()
  const createCategory = useCreateCategory()

  const taskIds = board.tasks.map((t) => t.id)

  async function handleAddTask() {
    const title = newTitle.trim()
    if (!title) {
      cancelAdding()
      return
    }
    setIsAdding(false)
    setNewTitle('')
    setNewPriority('medium')
    setNewDueDate('')
    setNewProjectId(projectId ?? '')
    setNewCategory('')
    await createTask.mutateAsync({
      boardId: board.id,
      title,
      priority: newPriority,
      due_date: newDueDate || null,
      project_id: newProjectId || null,
      category: newCategory || null,
      projectId,
    })
  }

  function cancelAdding() {
    setNewTitle('')
    setNewPriority('medium')
    setNewDueDate('')
    setNewProjectId(projectId ?? '')
    setNewCategory('')
    setCreatingCategory(false)
    setNewCategoryName('')
    setIsAdding(false)
  }

  async function handleCreateCategory() {
    const name = newCategoryName.trim()
    if (!name) return
    const cat = await createCategory.mutateAsync(name)
    setNewCategory(cat.name)
    setCreatingCategory(false)
    setNewCategoryName('')
  }

  // Enter (without Shift) saves; Escape cancels
  function handleTitleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleAddTask()
    }
    if (e.key === 'Escape') cancelAdding()
  }

  function openAdding() {
    setIsAdding(true)
    // focus textarea on next frame
    requestAnimationFrame(() => titleRef.current?.focus())
  }

  // El botón global "Nueva tarea" (barra superior) abre el formulario aquí.
  useEffect(() => {
    if (!isPrimary) return
    const handler = () => openAdding()
    window.addEventListener(NEW_TASK_EVENT, handler)
    return () => window.removeEventListener(NEW_TASK_EVENT, handler)
  }, [isPrimary])

  return (
    <div
      className="flex flex-col flex-shrink-0"
      style={{ width: '240px' }}
    >
      {/* Column container */}
      <motion.div
        animate={{
          boxShadow: isOver
            ? '0 0 0 2px var(--dash-accent), 0 0 20px rgba(var(--dash-accent-rgb),0.2), 0 8px 32px rgba(0,0,0,0.5)'
            : '0 2px 12px rgba(0,0,0,0.4)',
        }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        style={{
          backgroundColor: 'var(--dash-surface-1)',
          borderRadius: '16px',
          border: '1px solid var(--dash-border)',
          overflow: 'hidden',
        }}
      >
        {/* Column header — slightly different background */}
        <div
          className="flex items-center justify-between"
          style={{
            padding: '11px 14px',
            borderBottom: '1px solid var(--dash-border)',
            backgroundColor: 'var(--dash-surface-2)',
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            {board.color && (
              <span
                className="flex-shrink-0 rounded-full"
                style={{
                  width: '7px',
                  height: '7px',
                  backgroundColor: board.color,
                  boxShadow: `0 0 5px ${board.color}80`,
                }}
              />
            )}
            <h3
              className="truncate"
              style={{
                color: 'var(--dash-text-secondary)',
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              {board.title}
            </h3>
          </div>

          {/* Task count badge */}
          <span
            className="flex-shrink-0 tabular-nums"
            style={{
              backgroundColor: 'var(--dash-border)',
              color: 'var(--dash-text-tertiary)',
              fontSize: '11px',
              fontWeight: 600,
              borderRadius: '6px',
              padding: '1px 6px',
              minWidth: '20px',
              textAlign: 'center',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <motion.span
              key={board.tasks.length}
              initial={{ scale: 1.3 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            >
              {board.tasks.length}
            </motion.span>
          </span>
        </div>

        {/* Drop zone + sortable list */}
        <motion.div
          ref={setNodeRef}
          className="flex flex-col"
          animate={{
            backgroundColor: isOver ? 'rgba(var(--dash-accent-rgb),0.04)' : 'rgba(0,0,0,0)',
          }}
          transition={{ duration: 0.15 }}
          style={{
            gap: '6px',
            padding: '8px 8px',
            minHeight: '80px',
          }}
        >
          <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
            <AnimatePresence initial={false}>
              {board.tasks.map((task) => (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                >
                  <TaskCard
                    task={task}
                    onOpenDetail={onOpenTaskDetail}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </SortableContext>

          {/* Inline add-task form */}
          <AnimatePresence initial={false}>
            {isAdding ? (
              <motion.div
                key="add-form"
                initial={{ opacity: 0, height: 0, y: -8 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -8 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                style={{ overflow: 'hidden' }}
              >
                <div
                  style={{
                    backgroundColor: 'var(--dash-surface-2)',
                    border: '1px solid var(--dash-border-strong)',
                    borderRadius: '12px',
                    padding: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '7px',
                  }}
                >
                  {/* Title textarea */}
                  <textarea
                    ref={titleRef}
                    autoFocus
                    rows={2}
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    onKeyDown={handleTitleKeyDown}
                    placeholder="Titulo de la tarea..."
                    style={{ ...fieldStyle, resize: 'none', lineHeight: '1.4' }}
                  />

                  {/* Priority select */}
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
                    style={{ ...fieldStyle, appearance: 'none', cursor: 'pointer' }}
                  >
                    <option value="low">Baja</option>
                    <option value="medium">Normal</option>
                    <option value="high">Alta</option>
                  </select>

                  {/* Project */}
                  {projects.length > 0 && (
                    <select
                      value={newProjectId}
                      onChange={(e) => setNewProjectId(e.target.value)}
                      style={{ ...fieldStyle, appearance: 'none', cursor: 'pointer' }}
                    >
                      <option value="">Sin proyecto</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.title}</option>
                      ))}
                    </select>
                  )}

                  {/* Category */}
                  {creatingCategory ? (
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <input
                        autoFocus
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { e.preventDefault(); void handleCreateCategory() }
                          if (e.key === 'Escape') { setCreatingCategory(false); setNewCategoryName('') }
                        }}
                        placeholder="Nueva categoría..."
                        style={{ ...fieldStyle, flex: 1 }}
                      />
                      <button
                        type="button"
                        onClick={() => void handleCreateCategory()}
                        disabled={createCategory.isPending}
                        style={{
                          backgroundColor: 'var(--dash-accent)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '0 10px',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          flexShrink: 0,
                        }}
                      >
                        Crear
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <select
                        value={newCategory}
                        onChange={(e) => {
                          if (e.target.value === '__new__') { setCreatingCategory(true) }
                          else { setNewCategory(e.target.value) }
                        }}
                        style={{ ...fieldStyle, appearance: 'none', cursor: 'pointer', flex: 1 }}
                      >
                        <option value="">Sin categoría</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                        <option value="__new__">+ Nueva categoría...</option>
                      </select>
                    </div>
                  )}

                  {/* Due date */}
                  <input
                    type="date"
                    name="due_date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    style={fieldStyle}
                  />

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleAddTask}
                      className="flex items-center justify-center gap-1 flex-1 transition-opacity hover:opacity-80"
                      style={{
                        backgroundColor: 'var(--dash-accent)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '7px',
                        padding: '6px 10px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      <Check size={12} aria-hidden="true" />
                      Agregar
                    </button>
                    <button
                      type="button"
                      onClick={cancelAdding}
                      className="flex items-center justify-center transition-opacity hover:opacity-80"
                      aria-label="Cancelar"
                      style={{
                        backgroundColor: 'var(--dash-border)',
                        color: 'var(--dash-text-secondary)',
                        border: '1px solid var(--dash-border)',
                        borderRadius: '7px',
                        padding: '6px 10px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      <X size={12} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="add-button"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <button
                  type="button"
                  onClick={openAdding}
                  className="flex items-center gap-1.5 w-full transition-colors"
                  style={{
                    color: 'var(--dash-text-tertiary)',
                    fontSize: '12px',
                    fontWeight: 500,
                    padding: '6px 8px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: 'inherit',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--dash-surface-2)'
                    e.currentTarget.style.color = 'var(--dash-text-secondary)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    e.currentTarget.style.color = 'var(--dash-text-tertiary)'
                  }}
                >
                  <Plus size={12} aria-hidden="true" />
                  Agregar tarea
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </div>
  )
}
