// Pescadora — application constants

import type { ProjectStatus, DeliverableType, DeliverableStatus, TaskPriority } from '@/lib/types'

// ---------------------------------------------------------------------------
// Project statuses
// ---------------------------------------------------------------------------

export interface StatusMeta {
  label: string
  color: string
}

export const PROJECT_STATUSES: Record<ProjectStatus, StatusMeta> = {
  pre_production: {
    label: 'Pre-producción',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
  production: {
    label: 'Producción',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  post_production: {
    label: 'Post-producción',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
  },
  delivered: {
    label: 'Entregado',
    color: 'bg-green-100 text-green-800 border-green-200',
  },
} as const

// ---------------------------------------------------------------------------
// Task priorities
// ---------------------------------------------------------------------------

export interface PriorityMeta {
  label: string
  color: string
}

export const TASK_PRIORITIES: Record<TaskPriority, PriorityMeta> = {
  low: {
    label: 'Baja',
    color: 'bg-sky-100 text-sky-700 border-sky-200',
  },
  medium: {
    label: 'Media',
    color: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  high: {
    label: 'Alta',
    color: 'bg-red-100 text-red-700 border-red-200',
  },
} as const

// ---------------------------------------------------------------------------
// Deliverable types
// ---------------------------------------------------------------------------

export interface DeliverableTypeMeta {
  label: string
}

export const DELIVERABLE_TYPES: Record<DeliverableType, DeliverableTypeMeta> = {
  wip: { label: 'Trabajo en progreso' },
  final: { label: 'Entrega final' },
} as const

// ---------------------------------------------------------------------------
// Deliverable statuses
// ---------------------------------------------------------------------------

export interface DeliverableStatusMeta {
  label: string
  color: string
}

export const DELIVERABLE_STATUSES: Record<DeliverableStatus, DeliverableStatusMeta> = {
  pending: {
    label: 'Pendiente',
    color: 'bg-zinc-100 text-zinc-700 border-zinc-200',
  },
  review: {
    label: 'En revisión',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
  },
  approved: {
    label: 'Aprobado',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
} as const

// ---------------------------------------------------------------------------
// Navigation — Admin sidebar
// ---------------------------------------------------------------------------

export interface NavLink {
  label: string
  href: string
  icon: string // lucide-react icon name
}

export const ADMIN_NAV_LINKS: NavLink[] = [
  { label: 'Dashboard', href: '/admin', icon: 'LayoutDashboard' },
  { label: 'Proyectos', href: '/admin/projects', icon: 'FolderOpen' },
  { label: 'Clientes', href: '/admin/clients', icon: 'Users' },
  { label: 'Tareas', href: '/admin/tasks', icon: 'CheckSquare' },
  { label: 'Entregas', href: '/admin/deliverables', icon: 'PackageCheck' },
  { label: 'Equipo', href: '/admin/team', icon: 'UserCog' },
  { label: 'Ajustes', href: '/admin/settings', icon: 'Settings' },
] as const

// ---------------------------------------------------------------------------
// Navigation — Client portal
// ---------------------------------------------------------------------------

export const PORTAL_NAV_LINKS: NavLink[] = [
  { label: 'Mis proyectos', href: '/portal', icon: 'FolderOpen' },
  { label: 'Entregas', href: '/portal/deliverables', icon: 'PackageCheck' },
  { label: 'Perfil', href: '/portal/profile', icon: 'User' },
] as const
