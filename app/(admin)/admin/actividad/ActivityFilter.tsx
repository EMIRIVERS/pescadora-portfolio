'use client'

import Link from 'next/link'
import { useState, useMemo } from 'react'
import { LEAD_STATUS_STYLES } from '@/lib/status-colors'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ActivityItem {
  id: string
  type: 'lead_action' | 'project_action' | 'lead_new' | 'deliverable_new' | 'email_sent'
  activitySubType: string | null
  title: string
  subtitle: string
  createdAt: string
  linkHref: string
  userName: string | null
  leadName: string | null
  leadId: string | null
  leadCompany: string | null
  oldStatus: string | null
  newStatus: string | null
}

// ---------------------------------------------------------------------------
// Filter config
// ---------------------------------------------------------------------------

type FilterKey = 'all' | 'leads' | 'tasks' | 'deliverables' | 'emails'

interface FilterOption {
  key: FilterKey
  label: string
}

const FILTERS: FilterOption[] = [
  { key: 'all',         label: 'Todos'      },
  { key: 'leads',       label: 'Leads'      },
  { key: 'tasks',       label: 'Tareas'     },
  { key: 'deliverables', label: 'Entregas'  },
  { key: 'emails',      label: 'Emails'     },
]

function matchesFilter(item: ActivityItem, filter: FilterKey): boolean {
  if (filter === 'all') return true
  if (filter === 'leads') return item.type === 'lead_action' || item.type === 'lead_new'
  if (filter === 'tasks') return item.type === 'project_action'
  if (filter === 'deliverables') return item.type === 'deliverable_new'
  if (filter === 'emails') return item.type === 'email_sent'
  return true
}

// ---------------------------------------------------------------------------
// Pill / dot config
// ---------------------------------------------------------------------------

const PILL_LABEL: Record<ActivityItem['type'], string> = {
  lead_action:     'Lead',
  project_action:  'Tarea',
  lead_new:        'Nuevo lead',
  deliverable_new: 'Entregable',
  email_sent:      'Email',
}

const PILL_COLOR: Record<ActivityItem['type'], string> = {
  lead_action:     '#0071E3',
  project_action:  '#BF5AF2',
  lead_new:        '#30D158',
  deliverable_new: '#FF9F0A',
  email_sent:      '#64D2FF',
}

const PILL_BG: Record<ActivityItem['type'], string> = {
  lead_action:     'rgba(0,113,227,0.13)',
  project_action:  'rgba(191,90,242,0.13)',
  lead_new:        'rgba(48,209,88,0.13)',
  deliverable_new: 'rgba(255,159,10,0.13)',
  email_sent:      'rgba(100,210,255,0.13)',
}

const DOT_COLOR: Record<ActivityItem['type'], string> = {
  lead_action:     '#0071E3',
  project_action:  '#BF5AF2',
  lead_new:        '#30D158',
  deliverable_new: '#FF9F0A',
  email_sent:      '#64D2FF',
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function formatRelativeTime(isoDate: string): string {
  const now = new Date()
  const date = new Date(isoDate)
  const diffMs = now.getTime() - date.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)

  if (diffHours < 24) {
    const hours = Math.floor(diffHours)
    if (hours < 1) {
      const minutes = Math.floor(diffMs / (1000 * 60))
      return `hace ${minutes} min`
    }
    return `hace ${hours}h`
  }

  const toLocal = (d: Date) =>
    new Date(d.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }))

  const localNow = toLocal(now)
  const localDate = toLocal(date)

  const todayStart = new Date(localNow)
  todayStart.setHours(0, 0, 0, 0)
  const itemStart = new Date(localDate)
  itemStart.setHours(0, 0, 0, 0)

  const diffDays = Math.round((todayStart.getTime() - itemStart.getTime()) / 86_400_000)

  if (diffDays === 0) return 'hoy'
  if (diffDays === 1) return 'ayer'

  return localDate.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: localDate.getFullYear() !== localNow.getFullYear() ? 'numeric' : undefined,
  })
}

function dayLabel(isoDate: string): string {
  const ref = new Date(isoDate)
  const now = new Date()

  const toLocal = (d: Date) =>
    new Date(d.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }))

  const item = toLocal(ref)
  const today = toLocal(now)

  const todayStart = new Date(today)
  todayStart.setHours(0, 0, 0, 0)
  const itemStart = new Date(item)
  itemStart.setHours(0, 0, 0, 0)

  const diffDays = Math.round((todayStart.getTime() - itemStart.getTime()) / 86_400_000)

  if (diffDays === 0) return 'Hoy'
  if (diffDays === 1) return 'Ayer'
  if (diffDays < 7) return `Hace ${diffDays} dias`

  return item.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: item.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  })
}

function isToday(isoDate: string): boolean {
  const toLocal = (d: Date) =>
    new Date(d.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }))
  const item = toLocal(new Date(isoDate))
  const now = toLocal(new Date())
  return (
    item.getFullYear() === now.getFullYear() &&
    item.getMonth() === now.getMonth() &&
    item.getDate() === now.getDate()
  )
}

function isThisWeek(isoDate: string): boolean {
  const toLocal = (d: Date) =>
    new Date(d.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }))
  const item = toLocal(new Date(isoDate))
  const now = toLocal(new Date())
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay())
  weekStart.setHours(0, 0, 0, 0)
  return item >= weekStart
}

function parseLocalDate(value: string): Date | null {
  if (!value) return null
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day, 0, 0, 0, 0)
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function IconDot({ color }: { color: string }) {
  return (
    <span
      style={{
        display: 'block',
        width: '10px',
        height: '10px',
        borderRadius: '50%',
        background: color,
        flexShrink: 0,
        boxShadow: `0 0 6px ${color}80`,
      }}
    />
  )
}

function StatusChangeBadges({ oldStatus, newStatus }: { oldStatus: string; newStatus: string }) {
  const oldStyle = LEAD_STATUS_STYLES[oldStatus] ?? { color: 'var(--dash-text-secondary)', bg: 'rgba(134,134,139,0.1)', label: oldStatus }
  const newStyle = LEAD_STATUS_STYLES[newStatus] ?? { color: 'var(--dash-text-secondary)', bg: 'rgba(134,134,139,0.1)', label: newStatus }

  return (
    <span className="act-status-arrow">
      <span
        className="act-status-badge"
        style={{ color: oldStyle.color, background: oldStyle.bg }}
      >
        {oldStyle.label}
      </span>
      <span style={{ color: 'var(--dash-text-tertiary)', fontSize: '12px' }}>
        &rarr;
      </span>
      <span
        className="act-status-badge"
        style={{ color: newStyle.color, background: newStyle.bg }}
      >
        {newStyle.label}
      </span>
    </span>
  )
}

// ---------------------------------------------------------------------------
// Stats row
// ---------------------------------------------------------------------------

interface StatsRowProps {
  items: ActivityItem[]
}

function StatsRow({ items }: StatsRowProps) {
  const todayCount = items.filter((i) => isToday(i.createdAt)).length
  const weekCount = items.filter((i) => isThisWeek(i.createdAt)).length
  const emailCount = items.filter((i) => i.type === 'email_sent').length
  const leadCount = items.filter(
    (i) => i.type === 'lead_action' || i.type === 'lead_new'
  ).length

  const pills: { label: string; value: number }[] = [
    { label: 'hoy', value: todayCount },
    { label: 'esta semana', value: weekCount },
    { label: 'emails enviados', value: emailCount },
    { label: 'actividades de leads', value: leadCount },
  ]

  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        flexWrap: 'wrap',
        marginBottom: '1.25rem',
      }}
    >
      {pills.map((pill) => (
        <div
          key={pill.label}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'var(--dash-surface-1)',
            border: '1px solid var(--dash-border)',
            borderRadius: 8,
            padding: '5px 12px',
          }}
        >
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--dash-text-primary)',
            }}
          >
            {pill.value}
          </span>
          <span style={{ fontSize: 12, color: 'var(--dash-text-secondary)' }}>
            {pill.label}
          </span>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Date range filter
// ---------------------------------------------------------------------------

interface DateRangeProps {
  from: string
  to: string
  onChange: (from: string, to: string) => void
}

function DateRangeFilter({ from, to, onChange }: DateRangeProps) {
  const inputStyle: React.CSSProperties = {
    background: 'var(--dash-surface-1)',
    border: '1px solid var(--dash-border)',
    borderRadius: 8,
    color: 'var(--dash-text-primary)',
    fontSize: 12,
    padding: '5px 10px',
    fontFamily: 'inherit',
    cursor: 'pointer',
    outline: 'none',
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
        marginBottom: '1.25rem',
      }}
    >
      <span style={{ fontSize: 12, color: 'var(--dash-text-tertiary)' }}>Desde</span>
      <input
        type="date"
        value={from}
        onChange={(e) => onChange(e.target.value, to)}
        style={inputStyle}
      />
      <span style={{ fontSize: 12, color: 'var(--dash-text-tertiary)' }}>hasta</span>
      <input
        type="date"
        value={to}
        onChange={(e) => onChange(from, e.target.value)}
        style={inputStyle}
      />
      {(from || to) && (
        <button
          onClick={() => onChange('', '')}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--dash-text-tertiary)',
            fontSize: 12,
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: 6,
            fontFamily: 'inherit',
          }}
        >
          Limpiar
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const PAGE_SIZE = 30

interface ActivityFilterProps {
  initialActivities: ActivityItem[]
}

export default function ActivityFilter({ initialActivities }: ActivityFilterProps) {
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE)

  const handleDateChange = (from: string, to: string) => {
    setDateFrom(from)
    setDateTo(to)
    setVisibleCount(PAGE_SIZE)
  }

  const handleFilterChange = (key: FilterKey) => {
    setActiveFilter(key)
    setVisibleCount(PAGE_SIZE)
  }

  // Apply filter + date range
  const filtered = useMemo(() => {
    let result = initialActivities.filter((item) => matchesFilter(item, activeFilter))

    if (dateFrom) {
      const from = parseLocalDate(dateFrom)
      if (from) result = result.filter((item) => new Date(item.createdAt) >= from)
    }

    if (dateTo) {
      const to = parseLocalDate(dateTo)
      if (to) {
        // Include entire "to" day
        const toEnd = new Date(to)
        toEnd.setHours(23, 59, 59, 999)
        result = result.filter((item) => new Date(item.createdAt) <= toEnd)
      }
    }

    return result
  }, [initialActivities, activeFilter, dateFrom, dateTo])

  // Stats are calculated on the full filtered set (before pagination)
  // Group by day (only visible slice)
  const visible = filtered.slice(0, visibleCount)
  const hasMore = filtered.length > visibleCount

  interface DayGroup {
    label: string
    items: ActivityItem[]
  }

  const groups: DayGroup[] = []
  const seenDays = new Map<string, DayGroup>()

  for (const item of visible) {
    const label = dayLabel(item.createdAt)
    if (!seenDays.has(label)) {
      const group: DayGroup = { label, items: [] }
      groups.push(group)
      seenDays.set(label, group)
    }
    seenDays.get(label)!.items.push(item)
  }

  return (
    <>
      {/* Stats row */}
      <StatsRow items={filtered} />

      {/* Filter pills */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          flexWrap: 'wrap',
          marginBottom: '1rem',
        }}
      >
        {FILTERS.map((filter) => {
          const isActive = activeFilter === filter.key
          return (
            <button
              key={filter.key}
              onClick={() => handleFilterChange(filter.key)}
              style={{
                fontSize: 12,
                fontWeight: isActive ? 600 : 400,
                padding: '5px 14px',
                borderRadius: 20,
                border: isActive ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(255,255,255,0.08)',
                backgroundColor: isActive ? 'var(--dash-surface-3)' : 'transparent',
                color: isActive ? 'var(--dash-text-primary)' : 'var(--dash-text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s',
                letterSpacing: '0.01em',
                fontFamily: 'inherit',
              }}
            >
              {filter.label}
            </button>
          )
        })}
      </div>

      {/* Date range */}
      <DateRangeFilter from={dateFrom} to={dateTo} onChange={handleDateChange} />

      {/* Empty filtered state */}
      {filtered.length === 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            backgroundColor: 'var(--dash-surface-1)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16,
            padding: '48px 32px',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--dash-text-primary)', margin: 0 }}>
            Sin actividad en esta categoria
          </p>
          <p style={{ fontSize: 13, color: 'var(--dash-text-secondary)', margin: 0 }}>
            No hay eventos registrados para el filtro seleccionado.
          </p>
        </div>
      )}

      {/* Timeline */}
      {groups.map((group) => (
        <div key={group.label}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--dash-text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              padding: '24px 0 10px 0',
              margin: 0,
            }}
          >
            {group.label}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
            {/* Vertical line */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: '4px',
                top: '20px',
                bottom: '20px',
                width: '1px',
                background: 'rgba(255,255,255,0.07)',
                pointerEvents: 'none',
              }}
            />

            {group.items.map((item) => {
              const dotColor = DOT_COLOR[item.type]
              const isStatusChange =
                item.type === 'lead_action' &&
                item.activitySubType === 'status_change' &&
                item.oldStatus !== null &&
                item.newStatus !== null

              // Attribution label
              const attribution = item.userName ?? 'Sistema'

              const cardContent = (
                <div className="act-card">
                  <div className="act-meta">
                    <span
                      className="act-pill"
                      style={{
                        color: PILL_COLOR[item.type],
                        background: PILL_BG[item.type],
                      }}
                    >
                      {PILL_LABEL[item.type]}
                    </span>

                    {/* Lead name link */}
                    {item.leadId && item.leadName && (
                      <Link
                        href={`/admin/leads?lead=${item.leadId}`}
                        className="act-lead-link"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {item.leadName}
                        {item.leadCompany ? ` (${item.leadCompany})` : ''}
                      </Link>
                    )}

                    <span className="act-time">{formatRelativeTime(item.createdAt)}</span>
                  </div>

                  {/* Title: for status_change, skip generic title */}
                  {!isStatusChange && (
                    <p className="act-title">{item.title}</p>
                  )}

                  {/* Status change display */}
                  {isStatusChange ? (
                    <div style={{ marginBottom: '4px' }}>
                      <p className="act-title" style={{ marginBottom: 4 }}>
                        Cambio de estado
                      </p>
                      <StatusChangeBadges
                        oldStatus={item.oldStatus!}
                        newStatus={item.newStatus!}
                      />
                    </div>
                  ) : (
                    <p className="act-subtitle">{item.subtitle}</p>
                  )}

                  {/* Attribution */}
                  <p className="act-attribution">
                    Por: {attribution}
                  </p>
                </div>
              )

              // Email items don't link anywhere useful; render as div
              if (item.linkHref === '#') {
                return (
                  <div
                    key={item.id}
                    className="act-item-row"
                  >
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        paddingTop: '16px',
                        width: '10px',
                        flexShrink: 0,
                      }}
                    >
                      <IconDot color={dotColor} />
                    </div>
                    {cardContent}
                  </div>
                )
              }

              return (
                <Link
                  key={item.id}
                  href={item.linkHref}
                  className="act-item-row"
                >
                  {/* Dot column */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      paddingTop: '16px',
                      width: '10px',
                      flexShrink: 0,
                    }}
                  >
                    <IconDot color={dotColor} />
                  </div>
                  {cardContent}
                </Link>
              )
            })}
          </div>
        </div>
      ))}

      {/* Load more */}
      {hasMore && (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '2rem', paddingBottom: '1rem' }}>
          <button
            onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
            style={{
              fontSize: 13,
              fontWeight: 500,
              padding: '9px 24px',
              borderRadius: 10,
              border: '1px solid var(--dash-border)',
              background: 'var(--dash-surface-1)',
              color: 'var(--dash-text-primary)',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'background 0.15s',
            }}
          >
            Cargar mas ({filtered.length - visibleCount} restantes)
          </button>
        </div>
      )}

      {/* Count footer */}
      {filtered.length > 0 && (
        <p
          style={{
            textAlign: 'center',
            fontSize: 11,
            color: 'var(--dash-text-tertiary)',
            paddingTop: '1rem',
            paddingBottom: '2rem',
          }}
        >
          Mostrando {Math.min(visibleCount, filtered.length)} de {filtered.length} actividades
        </p>
      )}
    </>
  )
}
