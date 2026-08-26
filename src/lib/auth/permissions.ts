/**
 * src/lib/auth/permissions.ts
 *
 * Única fuente de verdad de la matriz de permisos RBAC de XICO Films.
 * La UI, los server actions (vía requireRole) y proxy.ts referencian esto.
 * Roles definidos en la migración 20260608060000_rbac_roles.sql (enum staff_role).
 */

import type { StaffRole } from '@/lib/supabase/types'

export type { StaffRole }

export type Resource =
  | 'projects'
  | 'leads'
  | 'invoices'
  | 'proposals'
  | 'portfolio'
  | 'media'
  | 'team'
  | 'calendar'
  | 'tasks'
  | 'clients'
  | 'expenses'
  | 'equipment'
  | 'reports'
  | 'automations'

export type Action = 'view' | 'create' | 'update' | 'delete' | 'special'

export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  owner: 'Dirección',
  producer: 'Productor',
  finance: 'Finanzas',
  editor: 'Editor / Post',
  assistant: 'Asistente',
}

export const STAFF_ROLES: StaffRole[] = ['owner', 'producer', 'finance', 'editor', 'assistant']

// Letras → acción. V=view, C=create, U=update, D=delete, X=special.
const LETTER: Record<string, Action> = {
  V: 'view',
  C: 'create',
  U: 'update',
  D: 'delete',
  X: 'special',
}

function parse(spec: string): Set<Action> {
  const set = new Set<Action>()
  for (const ch of spec) {
    const a = LETTER[ch]
    if (a) set.add(a)
  }
  return set
}

// Matriz (sección 3 de RBAC_PLAN.md). Cadena vacía = sin acceso.
const MATRIX: Record<Resource, Record<StaffRole, string>> = {
  projects:    { owner: 'VCUDX', producer: 'VCUDX', finance: 'V',     editor: 'VU',   assistant: 'V'   },
  leads:       { owner: 'VCUDX', producer: 'VCUDX', finance: 'V',     editor: 'V',    assistant: 'VU'  },
  invoices:    { owner: 'VCUDX', producer: 'V',     finance: 'VCUDX', editor: '',     assistant: ''    },
  proposals:   { owner: 'VCUDX', producer: 'VCUDX', finance: 'VU',    editor: 'V',    assistant: 'V'   },
  portfolio:   { owner: 'VCUDX', producer: 'VCUD',  finance: '',      editor: 'VCUD', assistant: 'V'   },
  media:       { owner: 'VCUDX', producer: 'VCUD',  finance: 'V',     editor: 'VCUD', assistant: 'V'   },
  team:        { owner: 'VCUDX', producer: 'V',     finance: 'V',     editor: '',     assistant: ''    },
  calendar:    { owner: 'VCUDX', producer: 'VCUDX', finance: 'V',     editor: 'VCU',  assistant: 'VCU' },
  tasks:       { owner: 'VCUDX', producer: 'VCUDX', finance: 'V',     editor: 'VCUD', assistant: 'VCU' },
  clients:     { owner: 'VCUDX', producer: 'VCUD',  finance: 'VU',    editor: 'V',    assistant: 'V'   },
  expenses:    { owner: 'VCUDX', producer: 'VCU',   finance: 'VCUDX', editor: '',     assistant: ''    },
  equipment:   { owner: 'VCUDX', producer: 'VCUD',  finance: 'V',     editor: 'VU',   assistant: 'V'   },
  reports:     { owner: 'V',     producer: 'V',     finance: 'V',     editor: 'V',    assistant: ''    },
  automations: { owner: 'VCUDX', producer: 'VU',    finance: '',      editor: '',     assistant: ''    },
}

export const PERMISSIONS: Record<StaffRole, Partial<Record<Resource, Set<Action>>>> = (() => {
  const out = {} as Record<StaffRole, Partial<Record<Resource, Set<Action>>>>
  for (const role of STAFF_ROLES) out[role] = {}
  for (const resource of Object.keys(MATRIX) as Resource[]) {
    for (const role of STAFF_ROLES) {
      const spec = MATRIX[resource][role]
      if (spec) out[role][resource] = parse(spec)
    }
  }
  return out
})()

/** ¿El rol puede ejecutar `action` sobre `resource`? */
export function can(role: StaffRole | null, resource: Resource, action: Action): boolean {
  if (!role) return false
  return PERMISSIONS[role]?.[resource]?.has(action) ?? false
}

/** ¿El rol tiene algún acceso (al menos view) al recurso? Para filtrar navegación. */
export function canAccess(role: StaffRole | null, resource: Resource): boolean {
  return can(role, resource, 'view')
}

// Mapa de ruta del admin → recurso, para filtrar la navegación por rol.
// Las rutas no listadas (Dashboard, Buscar) son visibles para cualquier staff.
export const NAV_RESOURCE: Record<string, Resource> = {
  '/admin/portfolio': 'portfolio',
  '/admin/media': 'media',
  '/admin/projects': 'projects',
  '/admin/kanban': 'tasks',
  '/admin/calendar': 'calendar',
  '/admin/leads': 'leads',
  '/admin/clients': 'clients',
  '/admin/invoices': 'invoices',
  '/admin/gastos': 'expenses',
  '/admin/proposals': 'proposals',
  '/admin/inventario': 'equipment',
  '/admin/team': 'team',
  '/admin/automatizaciones': 'automations',
  '/admin/reportes': 'reports',
  '/admin/actividad': 'reports',
}

// Rutas que solo Dirección (owner) puede ver (no mapean a un recurso de la matriz).
const OWNER_ONLY_NAV = new Set(['/admin/auditoria'])

/** ¿Debe verse este link de navegación para el rol dado? */
export function canSeeNav(role: StaffRole | null, href: string): boolean {
  if (OWNER_ONLY_NAV.has(href)) return role === 'owner'
  const resource = NAV_RESOURCE[href]
  if (!resource) return true // rutas sin recurso (Dashboard, Buscar) siempre visibles
  return canAccess(role, resource)
}
