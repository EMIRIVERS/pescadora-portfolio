'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, X, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import type { ProjectStatus } from '@/lib/supabase/types'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CalendarProject {
  id: string
  title: string
  status: ProjectStatus
  start_date: string | null
  end_date: string | null
}

export interface CalendarDeliverable {
  id: string
  title: string
  status: string
  due_date: string | null
  project_id: string
}

export interface CalendarTask {
  id: string
  title: string
  due_date: string
  priority: string
  project_id: string | null
  project_title: string | null
}

type EventType = 'project' | 'deliverable' | 'task'

interface CalendarEvent {
  id: string
  title: string
  type: EventType
  color: string
  projectId: string | null
  projectTitle: string | null
  status: string
  dueDate: string | null
}

interface Props {
  projects: CalendarProject[]
  deliverables: CalendarDeliverable[]
  tasks: CalendarTask[]
}

// ── Design tokens ─────────────────────────────────────────────────────────────

const T = {
  surface1:      'var(--dash-surface-1)',
  surface2:      'var(--dash-surface-2)',
  surface3:      'var(--dash-surface-3)',
  border:        'var(--dash-border)',
  borderStrong:  'var(--dash-border-strong)',
  textPrimary:   'var(--dash-text-primary)',
  textSecondary: 'var(--dash-text-secondary)',
  textTertiary:  'var(--dash-text-tertiary)',
  accent:        'var(--dash-accent)',
  orange:        'var(--dash-warning)',
  green:         'var(--dash-success)',
  font:          "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
} as const

const DAY_LABELS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do']

const MONTH_NAMES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

// ── Project color palette ─────────────────────────────────────────────────────
// A set of visually distinct colors for per-project hashing.

const PROJECT_PALETTE: readonly string[] = [
  'var(--dash-accent)', // brand accent
  '#30D158', // green
  '#FF9F0A', // amber
  '#FF453A', // red
  '#BF5AF2', // purple
  '#64D2FF', // cyan
  '#FF6B35', // orange
  '#FF2D55', // pink
  '#AC8E68', // brown
  '#5E5CE6', // indigo
  '#34C759', // lime-green
  '#FFD60A', // yellow
]

/**
 * Deterministic color from a project id string.
 * Uses a simple djb2-style hash over the characters.
 */
function projectColor(projectId: string): string {
  let hash = 5381
  for (let i = 0; i < projectId.length; i++) {
    hash = ((hash << 5) + hash) ^ projectId.charCodeAt(i)
    hash = hash >>> 0 // keep as 32-bit unsigned
  }
  return PROJECT_PALETTE[hash % PROJECT_PALETTE.length]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toLocalDateString(iso: string): string {
  return iso.slice(0, 10)
}

function dateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return `${d} ${MONTH_NAMES_ES[(m ?? 1) - 1]} ${y}`
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    pre_production: 'Pre-producción',
    production:     'Producción',
    post_production:'Post-producción',
    delivered:      'Entregado',
    pending:        'Pendiente',
    review:         'En revisión',
    approved:       'Aprobado',
    low:            'Baja',
    medium:         'Media',
    high:           'Alta',
  }
  return map[status] ?? status
}

// Build a map: dateString -> CalendarEvent[]
function buildEventMap(
  projects: CalendarProject[],
  deliverables: CalendarDeliverable[],
  tasks: CalendarTask[],
): Map<string, CalendarEvent[]> {
  const map = new Map<string, CalendarEvent[]>()

  function push(key: string, ev: CalendarEvent) {
    const arr = map.get(key) ?? []
    arr.push(ev)
    map.set(key, arr)
  }

  for (const p of projects) {
    if (p.end_date) {
      const key = toLocalDateString(p.end_date)
      push(key, {
        id:           p.id,
        title:        p.title,
        type:         'project',
        color:        projectColor(p.id),
        projectId:    p.id,
        projectTitle: p.title,
        status:       p.status,
        dueDate:      p.end_date,
      })
    }
  }

  for (const d of deliverables) {
    if (d.due_date) {
      const key = toLocalDateString(d.due_date)
      push(key, {
        id:           d.id,
        title:        d.title,
        type:         'deliverable',
        color:        projectColor(d.project_id),
        projectId:    d.project_id,
        projectTitle: null, // resolved below
        status:       d.status,
        dueDate:      d.due_date,
      })
    }
  }

  // Resolve project titles for deliverables
  const projectTitleMap = new Map<string, string>()
  for (const p of projects) projectTitleMap.set(p.id, p.title)

  for (const [, events] of map) {
    for (const ev of events) {
      if (ev.type === 'deliverable' && ev.projectId && !ev.projectTitle) {
        ev.projectTitle = projectTitleMap.get(ev.projectId) ?? null
      }
    }
  }

  for (const t of tasks) {
    const key = toLocalDateString(t.due_date)
    push(key, {
      id:           t.id,
      title:        t.title,
      type:         'task',
      color:        t.project_id ? projectColor(t.project_id) : T.textSecondary,
      projectId:    t.project_id,
      projectTitle: t.project_title,
      status:       t.priority,
      dueDate:      t.due_date,
    })
  }

  return map
}

// Returns the Monday-anchored grid of days for a given month.
function buildMonthGrid(year: number, month: number): { day: number; inMonth: boolean; year: number; month: number }[] {
  const firstDay = new Date(year, month, 1)
  const startDow = (firstDay.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells: { day: number; inMonth: boolean; year: number; month: number }[] = []

  if (startDow > 0) {
    const prevMonthDays = new Date(year, month, 0).getDate()
    const prevMonth = month === 0 ? 11 : month - 1
    const prevYear = month === 0 ? year - 1 : year
    for (let i = startDow - 1; i >= 0; i--) {
      cells.push({ day: prevMonthDays - i, inMonth: false, year: prevYear, month: prevMonth })
    }
  }

  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, inMonth: true, year, month })
  }

  const remainder = cells.length % 7
  if (remainder !== 0) {
    const nextMonth = month === 11 ? 0 : month + 1
    const nextYear = month === 11 ? year + 1 : year
    for (let d = 1; d <= 7 - remainder; d++) {
      cells.push({ day: d, inMonth: false, year: nextYear, month: nextMonth })
    }
  }

  return cells
}

// ── Event Popover ─────────────────────────────────────────────────────────────

interface PopoverProps {
  events: CalendarEvent[]
  onClose: () => void
  anchorRef: React.RefObject<HTMLDivElement | null>
}

function EventPopover({ events, onClose, anchorRef }: PopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [onClose, anchorRef])

  return (
    <div
      ref={popoverRef}
      style={{
        position: 'absolute',
        top: 'calc(100% + 6px)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100,
        background: T.surface2,
        border: `1px solid ${T.borderStrong}`,
        borderRadius: '12px',
        padding: '12px',
        minWidth: '220px',
        maxWidth: '280px',
        boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
        fontFamily: T.font,
      }}
    >
      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar"
        style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          border: 'none',
          background: 'transparent',
          color: T.textTertiary,
          cursor: 'pointer',
          padding: 0,
        }}
      >
        <X size={12} strokeWidth={2} />
      </button>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {events.map((ev) => (
          <div
            key={ev.id}
            style={{
              borderLeft: `3px solid ${ev.color}`,
              paddingLeft: '10px',
            }}
          >
            {/* Type badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
              <span
                style={{
                  fontSize: '9px',
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: ev.color,
                  opacity: ev.type === 'task' ? 0.75 : 1,
                }}
              >
                {ev.type === 'project' ? 'Proyecto' : ev.type === 'deliverable' ? 'Entregable' : 'Tarea'}
              </span>
              {ev.type === 'task' && (
                <span
                  style={{
                    fontSize: '9px',
                    color: T.textTertiary,
                  }}
                >
                  · prioridad {statusLabel(ev.status)}
                </span>
              )}
            </div>

            {/* Title */}
            <p
              style={{
                fontSize: '13px',
                fontWeight: 500,
                color: T.textPrimary,
                margin: '0 0 3px 0',
                lineHeight: 1.3,
              }}
            >
              {ev.title}
            </p>

            {/* Project name (for deliverables and tasks) */}
            {ev.projectTitle && ev.type !== 'project' && (
              <p
                style={{
                  fontSize: '11px',
                  color: T.textSecondary,
                  margin: '0 0 3px 0',
                }}
              >
                {ev.projectTitle}
              </p>
            )}

            {/* Status + due date */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {ev.type !== 'task' && (
                <span
                  style={{
                    fontSize: '10px',
                    color: T.textSecondary,
                    background: T.surface3,
                    borderRadius: '4px',
                    padding: '1px 5px',
                  }}
                >
                  {statusLabel(ev.status)}
                </span>
              )}
              {ev.dueDate && (
                <span style={{ fontSize: '10px', color: T.textTertiary }}>
                  {formatDate(ev.dueDate)}
                </span>
              )}
            </div>

            {/* Link to project */}
            {ev.projectId && (
              <Link
                href={`/admin/projects/${ev.projectId}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  marginTop: '6px',
                  fontSize: '11px',
                  color: T.accent,
                  textDecoration: 'none',
                }}
              >
                Ver proyecto
                <ExternalLink size={10} strokeWidth={2} />
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Day cell ──────────────────────────────────────────────────────────────────

interface DayCellProps {
  day: number
  inMonth: boolean
  isToday: boolean
  events: CalendarEvent[]
}

function DayCell({ day, inMonth, isToday, events }: DayCellProps) {
  const [open, setOpen] = useState(false)
  const anchorRef = useRef<HTMLDivElement>(null)

  const MAX_DOTS = 3
  const visible = events.slice(0, MAX_DOTS)
  const overflow = events.length - MAX_DOTS

  const handleClick = useCallback(() => {
    if (events.length > 0) setOpen((v) => !v)
  }, [events.length])

  const closePopover = useCallback(() => setOpen(false), [])

  return (
    <div
      ref={anchorRef}
      onClick={handleClick}
      style={{
        position: 'relative',
        minHeight: '80px',
        padding: '6px 8px',
        background: isToday
          ? 'color-mix(in srgb, var(--dash-accent) 8%, var(--dash-surface-1))'
          : T.surface1,
        border: isToday
          ? `1.5px solid var(--dash-accent)`
          : `1px solid ${T.border}`,
        borderRadius: '8px',
        opacity: inMonth ? 1 : 0.35,
        transition: 'background 0.15s ease, border-color 0.15s ease',
        cursor: events.length > 0 ? 'pointer' : 'default',
        outline: open ? `2px solid var(--dash-accent)` : 'none',
        outlineOffset: '-1px',
      }}
    >
      {/* Day number */}
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: isToday ? '22px' : 'auto',
          height: isToday ? '22px' : 'auto',
          borderRadius: '50%',
          background: isToday ? 'var(--dash-accent)' : 'transparent',
          fontSize: '12px',
          fontWeight: isToday ? 700 : 400,
          color: isToday ? '#fff' : T.textSecondary,
          lineHeight: 1,
          marginBottom: '5px',
          flexShrink: 0,
        }}
      >
        {day}
      </span>

      {/* Event indicators */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        {visible.map((ev) => (
          <div
            key={ev.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            {ev.type === 'task' ? (
              /* Diamond shape for tasks */
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  background: ev.color,
                  flexShrink: 0,
                  opacity: 0.7,
                  transform: 'rotate(45deg)',
                  borderRadius: '1px',
                }}
              />
            ) : (
              /* Circle for projects and deliverables */
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: ev.color,
                  flexShrink: 0,
                  opacity: ev.type === 'deliverable' ? 0.85 : 1,
                }}
              />
            )}
            <span
              style={{
                fontSize: '10px',
                color: T.textSecondary,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '100%',
                fontStyle: ev.type === 'task' ? 'italic' : 'normal',
              }}
            >
              {ev.title}
            </span>
          </div>
        ))}
        {overflow > 0 && (
          <span style={{ fontSize: '10px', color: T.textTertiary }}>
            +{overflow} más
          </span>
        )}
      </div>

      {/* Popover on click */}
      {open && events.length > 0 && (
        <EventPopover
          events={events}
          onClose={closePopover}
          anchorRef={anchorRef}
        />
      )}
    </div>
  )
}

// ── Project legend ────────────────────────────────────────────────────────────

interface LegendProps {
  projects: CalendarProject[]
  visibleProjectIds: Set<string>
}

function ProjectLegend({ projects, visibleProjectIds }: LegendProps) {
  const visible = projects.filter((p) => visibleProjectIds.has(p.id))
  if (visible.length === 0) return null

  return (
    <div
      style={{
        marginTop: '12px',
        paddingTop: '14px',
        borderTop: `1px solid ${T.border}`,
      }}
    >
      <p
        style={{
          fontSize: '10px',
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: T.textTertiary,
          margin: '0 0 8px 0',
        }}
      >
        Proyectos en vista
      </p>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px 16px',
        }}
      >
        {visible.map((p) => (
          <div
            key={p.id}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: projectColor(p.id),
                flexShrink: 0,
              }}
            />
            <Link
              href={`/admin/projects/${p.id}`}
              style={{
                fontSize: '12px',
                color: T.textSecondary,
                textDecoration: 'none',
              }}
            >
              {p.title}
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function CalendarView({ projects, deliverables, tasks }: Props) {
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState<Date>(
    new Date(today.getFullYear(), today.getMonth(), 1),
  )

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()

  const eventMap = buildEventMap(projects, deliverables, tasks)
  const cells = buildMonthGrid(year, month)

  const todayKey = dateKey(today.getFullYear(), today.getMonth(), today.getDate())

  // Collect which project ids are visible this month
  const visibleProjectIds = new Set<string>()
  for (const cell of cells) {
    if (!cell.inMonth) continue
    const key = dateKey(cell.year, cell.month, cell.day)
    const events = eventMap.get(key) ?? []
    for (const ev of events) {
      if (ev.projectId) visibleProjectIds.add(ev.projectId)
    }
  }

  function prevMonth() {
    setCurrentMonth(new Date(year, month - 1, 1))
  }
  function nextMonth() {
    setCurrentMonth(new Date(year, month + 1, 1))
  }

  return (
    <div style={{ fontFamily: T.font }}>
      {/* ── Month navigation ───────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
        }}
      >
        <button
          type="button"
          onClick={prevMonth}
          aria-label="Mes anterior"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            border: `1px solid ${T.border}`,
            background: 'transparent',
            color: T.textSecondary,
            cursor: 'pointer',
          }}
        >
          <ChevronLeft size={16} strokeWidth={1.5} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h2
            style={{
              fontSize: '17px',
              fontWeight: 600,
              color: T.textPrimary,
              letterSpacing: '-0.01em',
              margin: 0,
            }}
          >
            {MONTH_NAMES_ES[month]} {year}
          </h2>
          <button
            type="button"
            onClick={() => setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1))}
            style={{
              fontSize: '11px',
              fontWeight: 500,
              color: T.accent,
              background: 'transparent',
              border: `1px solid var(--dash-accent)`,
              borderRadius: '6px',
              padding: '2px 8px',
              cursor: 'pointer',
              opacity: year === today.getFullYear() && month === today.getMonth() ? 0 : 1,
              pointerEvents: year === today.getFullYear() && month === today.getMonth() ? 'none' : 'auto',
              transition: 'opacity 0.15s ease',
            }}
          >
            Hoy
          </button>
        </div>

        <button
          type="button"
          onClick={nextMonth}
          aria-label="Mes siguiente"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            border: `1px solid ${T.border}`,
            background: 'transparent',
            color: T.textSecondary,
            cursor: 'pointer',
          }}
        >
          <ChevronRight size={16} strokeWidth={1.5} />
        </button>
      </div>

      {/* ── Day-of-week headers ────────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '4px',
          marginBottom: '4px',
        }}
      >
        {DAY_LABELS.map((label) => (
          <div
            key={label}
            style={{
              textAlign: 'center',
              fontSize: '11px',
              fontWeight: 500,
              color: T.textTertiary,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              paddingBottom: '6px',
            }}
          >
            {label}
          </div>
        ))}
      </div>

      {/* ── Day grid ──────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '4px',
        }}
      >
        {cells.map((cell, idx) => {
          const key = dateKey(cell.year, cell.month, cell.day)
          const events = eventMap.get(key) ?? []
          const isToday = key === todayKey
          return (
            <DayCell
              key={idx}
              day={cell.day}
              inMonth={cell.inMonth}
              isToday={isToday}
              events={events}
            />
          )
        })}
      </div>

      {/* ── Type legend ───────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          marginTop: '20px',
          paddingTop: '16px',
          borderTop: `1px solid ${T.border}`,
        }}
      >
        {/* Circle — project deadline */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: T.textSecondary,
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: '12px', color: T.textSecondary }}>
            Deadline proyecto
          </span>
        </div>

        {/* Faded circle — deliverable */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: T.textSecondary,
              flexShrink: 0,
              opacity: 0.5,
            }}
          />
          <span style={{ fontSize: '12px', color: T.textSecondary }}>
            Entregable
          </span>
        </div>

        {/* Diamond — task */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              width: '7px',
              height: '7px',
              background: T.textSecondary,
              flexShrink: 0,
              opacity: 0.7,
              transform: 'rotate(45deg)',
              borderRadius: '1px',
            }}
          />
          <span style={{ fontSize: '12px', color: T.textSecondary }}>
            Tarea
          </span>
        </div>
      </div>

      {/* ── Project color legend ───────────────────────────────────────────── */}
      <ProjectLegend projects={projects} visibleProjectIds={visibleProjectIds} />
    </div>
  )
}
