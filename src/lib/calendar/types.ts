/**
 * src/lib/calendar/types.ts
 *
 * Tipos y constantes del calendario operativo. Módulo puro (sin 'use server')
 * para que componentes cliente y server actions compartan estas definiciones.
 */

export type CalendarEventType = 'grabacion' | 'entrega' | 'cobro' | 'reunion' | 'otro'
export type CalendarEventStatus = 'pendiente' | 'hecho'

export interface CalendarEvent {
  id: string
  project_id: string | null
  client_id: string | null
  invoice_id: string | null
  title: string
  type: CalendarEventType
  event_date: string
  event_time: string | null
  notes: string | null
  status: CalendarEventStatus
  created_at: string
  updated_at: string
  projects: { title: string } | null
  clients: { name: string } | null
}

export interface CalendarEventInput {
  title: string
  type: CalendarEventType
  event_date: string
  event_time: string | null
  project_id: string | null
  client_id: string | null
  invoice_id: string | null
  notes: string
  status: CalendarEventStatus
}

export const EVENT_TYPE_LABELS: Record<CalendarEventType, string> = {
  grabacion: 'Grabación',
  entrega: 'Entrega / Subida',
  cobro: 'Cobro',
  reunion: 'Reunión',
  otro: 'Otro',
}

export const EVENT_TYPE_COLORS: Record<CalendarEventType, string> = {
  grabacion: '#FF453A', // rojo
  entrega: '#0071E3', // azul
  cobro: '#30D158', // verde
  reunion: '#BF5AF2', // morado
  otro: '#8E8E93', // gris
}

export const EVENT_TYPES: CalendarEventType[] = ['grabacion', 'entrega', 'cobro', 'reunion', 'otro']
