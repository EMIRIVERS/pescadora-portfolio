'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
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

interface CalendarEvent {
  id: string
  title: string
  type: 'project' | 'deliverable'
  color: string
}

interface Props {
  projects: CalendarProject[]
  deliverables: CalendarDeliverable[]
}

// ── Design tokens ─────────────────────────────────────────────────────────────

const T = {
  surface1:      '#111111',
  surface2:      '#1C1C1E',
  border:        'rgba(255,255,255,0.08)',
  textPrimary:   '#F5F5F7',
  textSecondary: '#86868B',
  textTertiary:  '#48484A',
  accent:        '#0071E3',
  orange:        '#FF9F0A',
  green:         '#30D158',
  font:          "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
} as const

const DAY_LABELS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do']

const MONTH_NAMES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function toLocalDateString(iso: string): string {
  // Parse YYYY-MM-DD avoiding timezone shifts
  return iso.slice(0, 10)
}

function dateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function eventColor(project: CalendarProject): string {
  return project.status === 'delivered' ? T.green : T.accent
}

// Build a map: dateString -> CalendarEvent[]
function buildEventMap(
  projects: CalendarProject[],
  deliverables: CalendarDeliverable[],
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
        id: p.id,
        title: p.title,
        type: 'project',
        color: eventColor(p),
      })
    }
  }

  for (const d of deliverables) {
    if (d.due_date) {
      const key = toLocalDateString(d.due_date)
      push(key, {
        id: d.id,
        title: d.title,
        type: 'deliverable',
        color: T.orange,
      })
    }
  }

  return map
}

// Returns the Monday-anchored grid of days for a given month.
// Each cell is { day, inMonth } where inMonth=false means padding day.
function buildMonthGrid(year: number, month: number): { day: number; inMonth: boolean; year: number; month: number }[] {
  const firstDay = new Date(year, month, 1)
  // getDay(): 0=Sun,1=Mon,...,6=Sat → remap to Mon=0..Sun=6
  const startDow = (firstDay.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells: { day: number; inMonth: boolean; year: number; month: number }[] = []

  // Leading days from previous month
  if (startDow > 0) {
    const prevMonthDays = new Date(year, month, 0).getDate()
    const prevMonth = month === 0 ? 11 : month - 1
    const prevYear = month === 0 ? year - 1 : year
    for (let i = startDow - 1; i >= 0; i--) {
      cells.push({ day: prevMonthDays - i, inMonth: false, year: prevYear, month: prevMonth })
    }
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, inMonth: true, year, month })
  }

  // Trailing days to fill complete rows
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

// ── Tooltip ───────────────────────────────────────────────────────────────────

interface TooltipProps {
  events: CalendarEvent[]
}

function EventTooltip({ events }: TooltipProps) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 'calc(100% + 4px)',
        left: 0,
        zIndex: 50,
        background: T.surface2,
        border: `1px solid ${T.border}`,
        borderRadius: '10px',
        padding: '10px 12px',
        minWidth: '180px',
        maxWidth: '260px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        fontFamily: T.font,
        pointerEvents: 'none',
      }}
    >
      {events.map((ev) => (
        <div
          key={ev.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '3px 0',
          }}
        >
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: ev.color,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: '12px',
              color: T.textPrimary,
              lineHeight: 1.4,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {ev.title}
          </span>
        </div>
      ))}
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
  const [hovered, setHovered] = useState(false)
  const MAX_DOTS = 3
  const visible = events.slice(0, MAX_DOTS)
  const overflow = events.length - MAX_DOTS

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        minHeight: '72px',
        padding: '6px 8px',
        background: hovered && events.length > 0 ? T.surface2 : T.surface1,
        border: isToday
          ? `1.5px solid ${T.accent}`
          : `1px solid ${T.border}`,
        borderRadius: '8px',
        opacity: inMonth ? 1 : 0.3,
        transition: 'background 0.15s ease',
        cursor: events.length > 0 ? 'default' : 'default',
      }}
    >
      {/* Day number */}
      <span
        style={{
          display: 'block',
          fontSize: '12px',
          fontWeight: isToday ? 600 : 400,
          color: isToday ? T.accent : T.textSecondary,
          lineHeight: 1,
          marginBottom: '6px',
        }}
      >
        {day}
      </span>

      {/* Event dots / chips */}
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
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: ev.color,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: '10px',
                color: T.textSecondary,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '100%',
              }}
            >
              {ev.title}
            </span>
          </div>
        ))}
        {overflow > 0 && (
          <span style={{ fontSize: '10px', color: T.textTertiary }}>
            +{overflow} mas
          </span>
        )}
      </div>

      {/* Tooltip on hover */}
      {hovered && events.length > 0 && (
        <EventTooltip events={events} />
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function CalendarView({ projects, deliverables }: Props) {
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState<Date>(
    new Date(today.getFullYear(), today.getMonth(), 1),
  )

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()

  const eventMap = buildEventMap(projects, deliverables)
  const cells = buildMonthGrid(year, month)

  const todayKey = dateKey(today.getFullYear(), today.getMonth(), today.getDate())

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

      {/* ── Legend ────────────────────────────────────────────────────────── */}
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
        {[
          { color: T.accent, label: 'Proyecto deadline' },
          { color: T.orange, label: 'Entregable' },
          { color: T.green, label: 'Completado' },
        ].map(({ color, label }) => (
          <div
            key={label}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: color,
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: '12px', color: T.textSecondary }}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
