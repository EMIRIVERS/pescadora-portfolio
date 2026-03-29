// Pescadora — shared utility functions

import type { Project, Task } from '@/lib/types'

// ---------------------------------------------------------------------------
// cn — className merger (lightweight, no external dependency)
// Filters falsy values and deduplicates Tailwind conflict groups.
// ---------------------------------------------------------------------------

/**
 * Merge class-name strings, filtering out falsy values.
 * For full Tailwind conflict resolution install clsx + tailwind-merge and
 * replace this implementation with: twMerge(clsx(...classes))
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

// ---------------------------------------------------------------------------
// formatDate
// ---------------------------------------------------------------------------

const SPANISH_MONTHS: readonly string[] = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
]

/**
 * Returns a human-readable date in Spanish short format.
 * @example formatDate('2026-03-29') // => "29 mar 2026"
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const day = d.getUTCDate()
  const month = SPANISH_MONTHS[d.getUTCMonth()]
  const year = d.getUTCFullYear()
  return `${day} ${month} ${year}`
}

// ---------------------------------------------------------------------------
// Project status helpers
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<Project['status'], string> = {
  pre_production: 'Pre-producción',
  production: 'Producción',
  post_production: 'Post-producción',
  delivered: 'Entregado',
}

/**
 * Returns the Spanish display label for a project status value.
 */
export function getStatusLabel(status: Project['status']): string {
  return STATUS_LABELS[status]
}

const STATUS_COLORS: Record<string, string> = {
  pre_production: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  production: 'bg-blue-100 text-blue-800 border-blue-200',
  post_production: 'bg-purple-100 text-purple-800 border-purple-200',
  delivered: 'bg-green-100 text-green-800 border-green-200',
  // Deliverable statuses
  pending: 'bg-zinc-100 text-zinc-700 border-zinc-200',
  review: 'bg-orange-100 text-orange-800 border-orange-200',
  approved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
}

/**
 * Returns Tailwind badge classes for any status string (project or deliverable).
 * Falls back to a neutral style for unknown values.
 */
export function getStatusColor(status: string): string {
  return STATUS_COLORS[status] ?? 'bg-zinc-100 text-zinc-600 border-zinc-200'
}

// ---------------------------------------------------------------------------
// Task priority helpers
// ---------------------------------------------------------------------------

const PRIORITY_COLORS: Record<Task['priority'], string> = {
  low: 'bg-sky-100 text-sky-700 border-sky-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  high: 'bg-red-100 text-red-700 border-red-200',
}

/**
 * Returns Tailwind badge classes for a task priority value.
 */
export function getPriorityColor(priority: Task['priority']): string {
  return PRIORITY_COLORS[priority]
}
