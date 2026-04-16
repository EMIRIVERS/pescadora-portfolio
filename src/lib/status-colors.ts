// Paleta semantica centralizada para badges de estado.
// Importar desde aqui en lugar de hardcodear colores localmente.

export const PROJECT_STATUS_STYLES: Record<
  string,
  { color: string; bg: string; border: string; label: string }
> = {
  pre_production:  { color: '#FF9F0A', bg: 'rgba(255,159,10,0.1)',  border: 'rgba(255,159,10,0.2)',  label: 'Pre-produccion'  },
  production:      { color: '#0071E3', bg: 'rgba(0,113,227,0.1)',   border: 'rgba(0,113,227,0.2)',   label: 'Produccion'      },
  post_production: { color: '#BF5AF2', bg: 'rgba(191,90,242,0.1)',  border: 'rgba(191,90,242,0.2)',  label: 'Post-produccion' },
  delivered:       { color: '#30D158', bg: 'rgba(48,209,88,0.1)',   border: 'rgba(48,209,88,0.2)',   label: 'Entregado'       },
}

export const LEAD_STATUS_STYLES: Record<
  string,
  { color: string; bg: string; border: string; label: string }
> = {
  new:       { color: '#64D2FF', bg: 'rgba(100,210,255,0.1)', border: 'rgba(100,210,255,0.2)', label: 'Nuevo'      },
  contacted: { color: '#FF9F0A', bg: 'rgba(255,159,10,0.1)', border: 'rgba(255,159,10,0.2)', label: 'Contactado'  },
  qualified: { color: '#0071E3', bg: 'rgba(0,113,227,0.1)',  border: 'rgba(0,113,227,0.2)',  label: 'Calificado'  },
  proposal:  { color: '#BF5AF2', bg: 'rgba(191,90,242,0.1)', border: 'rgba(191,90,242,0.2)', label: 'Propuesta'   },
  won:       { color: '#30D158', bg: 'rgba(48,209,88,0.1)',  border: 'rgba(48,209,88,0.2)',  label: 'Ganado'      },
  lost:      { color: '#FF453A', bg: 'rgba(255,69,58,0.1)',  border: 'rgba(255,69,58,0.2)',  label: 'Perdido'     },
}

export const DELIVERABLE_STATUS_STYLES: Record<
  string,
  { color: string; bg: string; label: string }
> = {
  pending:  { color: '#FF9F0A', bg: 'rgba(255,159,10,0.1)', label: 'Pendiente'   },
  review:   { color: '#0071E3', bg: 'rgba(0,113,227,0.1)',  label: 'En revision' },
  approved: { color: '#30D158', bg: 'rgba(48,209,88,0.1)',  label: 'Aprobado'    },
}

// Fallback neutral para estados desconocidos
const NEUTRAL = {
  color:  '#86868B',
  bg:     'rgba(134,134,139,0.1)',
  border: 'rgba(134,134,139,0.2)',
}

export function getStatusStyle(
  status: string,
  type: 'project' | 'lead' | 'deliverable',
) {
  if (type === 'project') {
    return PROJECT_STATUS_STYLES[status] ?? { ...NEUTRAL, label: status }
  }
  if (type === 'lead') {
    return LEAD_STATUS_STYLES[status] ?? { ...NEUTRAL, label: status }
  }
  // deliverable
  const s = DELIVERABLE_STATUS_STYLES[status]
  return s ?? { color: NEUTRAL.color, bg: NEUTRAL.bg, label: status }
}
