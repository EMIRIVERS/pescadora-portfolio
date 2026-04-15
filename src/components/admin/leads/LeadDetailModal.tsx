'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  updateLeadStatus,
  addLeadActivity,
  deleteLead,
  convertLeadToClient,
} from '@/lib/actions/leads'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Lead {
  id: string
  created_at: string
  updated_at: string
  name: string
  email: string | null
  phone: string | null
  company: string | null
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost'
  source: 'manual' | 'referral' | 'instagram' | 'web' | 'whatsapp' | 'other'
  notes: string | null
  budget_range: string | null
  project_type: string | null
  assigned_to: string | null
  last_contacted_at: string | null
  expected_close_date: string | null
  converted_to_client_id: string | null
}

interface LeadActivity {
  id: string
  created_at: string
  lead_id: string
  user_id: string | null
  type: 'note' | 'email' | 'call' | 'whatsapp' | 'meeting' | 'status_change'
  content: string
  old_status: string | null
  new_status: string | null
}

interface Props {
  lead: Lead
  onClose: () => void
  onStatusChange: (leadId: string, newStatus: Lead['status']) => void
  onUpdate?: (updated: Lead) => void
  onDelete: (leadId: string) => void
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<Lead['status'], string> = {
  new: '#3b82f6',
  contacted: '#8b5cf6',
  qualified: '#f59e0b',
  proposal: '#e8341a',
  won: '#10b981',
  lost: '#6b7280',
}

const STATUS_LABELS: Record<Lead['status'], string> = {
  new: 'Nuevo',
  contacted: 'Contactado',
  qualified: 'Calificado',
  proposal: 'Propuesta',
  won: 'Ganado',
  lost: 'Perdido',
}

const ALL_STATUSES: Lead['status'][] = [
  'new',
  'contacted',
  'qualified',
  'proposal',
  'won',
  'lost',
]

const ACTIVITY_TYPE_LABELS: Record<LeadActivity['type'], string> = {
  note: 'Nota',
  email: 'Email',
  call: 'Llamada',
  whatsapp: 'WhatsApp',
  meeting: 'Reunion',
  status_change: 'Cambio de estado',
}

const ACTIVITY_TYPE_ICONS: Record<LeadActivity['type'], string> = {
  note: 'N',
  email: 'E',
  call: 'T',
  whatsapp: 'W',
  meeting: 'R',
  status_change: 'C',
}

const ACTIVITY_TYPES: LeadActivity['type'][] = [
  'note',
  'call',
  'whatsapp',
  'email',
  'meeting',
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 9,
        fontFamily: 'monospace',
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
        color: '#444',
        marginBottom: 10,
        paddingBottom: 6,
        borderBottom: '1px solid #1a1a1a',
      }}
    >
      {children}
    </div>
  )
}

function InfoRow({
  label,
  value,
}: {
  label: string
  value: string | null | undefined
}) {
  if (!value) return null
  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        marginBottom: 8,
        alignItems: 'flex-start',
      }}
    >
      <span
        style={{
          fontFamily: 'monospace',
          fontSize: 11,
          color: '#555',
          width: 120,
          flexShrink: 0,
          paddingTop: 1,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: 'monospace',
          fontSize: 12,
          color: '#e8e8e8',
          flex: 1,
          wordBreak: 'break-all',
        }}
      >
        {value}
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function LeadDetailModal({
  lead,
  onClose,
  onStatusChange,
  onDelete,
}: Props) {
  const [currentStatus, setCurrentStatus] = useState<Lead['status']>(
    lead.status
  )
  const [activities, setActivities] = useState<LeadActivity[]>([])
  const [activitiesLoading, setActivitiesLoading] = useState(true)
  const [activityType, setActivityType] = useState<LeadActivity['type']>('note')
  const [activityContent, setActivityContent] = useState('')
  const [activityError, setActivityError] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [convertConfirm, setConvertConfirm] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)

  const [statusPending, startStatusTransition] = useTransition()
  const [activityPending, startActivityTransition] = useTransition()
  const [deletePending, startDeleteTransition] = useTransition()
  const [convertPending, startConvertTransition] = useTransition()

  const panelRef = useRef<HTMLDivElement>(null)

  // Escape key closes modal
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  // Fetch activities on mount
  useEffect(() => {
    let cancelled = false
    async function fetchActivities() {
      setActivitiesLoading(true)
      const supabase = createClient()
      const { data, error } = await supabase
        .from('lead_activities')
        .select('*')
        .eq('lead_id', lead.id)
        .order('created_at', { ascending: false })

      if (!cancelled) {
        if (!error && data) {
          setActivities(data as LeadActivity[])
        }
        setActivitiesLoading(false)
      }
    }
    fetchActivities()
    return () => {
      cancelled = true
    }
  }, [lead.id])

  function handleStatusClick(status: Lead['status']) {
    if (status === currentStatus || statusPending) return
    const prev = currentStatus
    setCurrentStatus(status)
    startStatusTransition(async () => {
      const result = await updateLeadStatus(lead.id, status)
      if (result.error) {
        setCurrentStatus(prev)
        setGlobalError(result.error)
      } else {
        onStatusChange(lead.id, status)
        setGlobalError(null)
        // Refresh activities to include the new status_change entry
        const supabase = createClient()
        const { data } = await supabase
          .from('lead_activities')
          .select('*')
          .eq('lead_id', lead.id)
          .order('created_at', { ascending: false })
        if (data) setActivities(data as LeadActivity[])
      }
    })
  }

  function handleAddActivity() {
    const trimmed = activityContent.trim()
    if (!trimmed) {
      setActivityError('El contenido no puede estar vacio.')
      return
    }
    setActivityError(null)
    startActivityTransition(async () => {
      const result = await addLeadActivity(lead.id, activityType, trimmed)
      if (result.error) {
        setActivityError(result.error)
      } else {
        setActivityContent('')
        // Refresh activities
        const supabase = createClient()
        const { data } = await supabase
          .from('lead_activities')
          .select('*')
          .eq('lead_id', lead.id)
          .order('created_at', { ascending: false })
        if (data) setActivities(data as LeadActivity[])
      }
    })
  }

  function handleDelete() {
    if (!deleteConfirm) {
      setDeleteConfirm(true)
      return
    }
    startDeleteTransition(async () => {
      const result = await deleteLead(lead.id)
      if (result.error) {
        setGlobalError(result.error)
        setDeleteConfirm(false)
      } else {
        onDelete(lead.id)
        onClose()
      }
    })
  }

  function handleConvert() {
    if (!convertConfirm) {
      setConvertConfirm(true)
      return
    }
    startConvertTransition(async () => {
      const result = await convertLeadToClient(lead.id)
      if (result.error) {
        setGlobalError(result.error)
        setConvertConfirm(false)
      } else {
        setGlobalError(null)
        setConvertConfirm(false)
        // Optimistically update status label
        setCurrentStatus('won')
        onStatusChange(lead.id, 'won')
        onClose()
      }
    })
  }

  const statusColor = STATUS_COLORS[currentStatus]

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
        }}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        style={{
          position: 'relative',
          width: 520,
          height: '100%',
          background: '#0a0a0a',
          borderLeft: '1px solid #1a1a1a',
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* ----------------------------------------------------------------- */}
        {/* Header                                                             */}
        {/* ----------------------------------------------------------------- */}
        <div
          style={{
            padding: '20px 24px 16px',
            borderBottom: '1px solid #1a1a1a',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 12,
              marginBottom: 12,
            }}
          >
            <h2
              style={{
                fontFamily: 'monospace',
                fontWeight: 700,
                fontSize: 20,
                color: '#e8e8e8',
                margin: 0,
                lineHeight: 1.2,
                flex: 1,
              }}
            >
              {lead.name}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              style={{
                flexShrink: 0,
                background: 'none',
                border: 'none',
                color: '#555',
                fontSize: 20,
                cursor: 'pointer',
                lineHeight: 1,
                padding: '0 2px',
                fontFamily: 'monospace',
              }}
            >
              x
            </button>
          </div>

          {/* Current status badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                fontFamily: 'monospace',
                fontSize: 10,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: statusColor,
                background: `${statusColor}1a`,
                border: `1px solid ${statusColor}40`,
                padding: '3px 8px',
                borderRadius: 3,
              }}
            >
              {STATUS_LABELS[currentStatus]}
            </span>
            {statusPending && (
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: 10,
                  color: '#555',
                }}
              >
                guardando...
              </span>
            )}
          </div>

          {/* Global error */}
          {globalError && (
            <div
              style={{
                marginTop: 10,
                fontFamily: 'monospace',
                fontSize: 11,
                color: '#e8341a',
              }}
            >
              {globalError}
            </div>
          )}
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* Scrollable body                                                    */}
        {/* ----------------------------------------------------------------- */}
        <div style={{ flex: 1, padding: '20px 24px', overflow: 'auto' }}>

          {/* ------ Contact info ------------------------------------------ */}
          <section style={{ marginBottom: 24 }}>
            <SectionLabel>Contacto</SectionLabel>
            <InfoRow label="Email" value={lead.email} />
            <InfoRow label="Telefono" value={lead.phone} />
            <InfoRow label="Empresa" value={lead.company} />
            <InfoRow label="Fuente" value={lead.source} />
            <InfoRow
              label="Ultimo contacto"
              value={
                lead.last_contacted_at
                  ? formatDate(lead.last_contacted_at)
                  : null
              }
            />
            <InfoRow
              label="Creado"
              value={formatDateTime(lead.created_at)}
            />
          </section>

          {/* ------ Details ----------------------------------------------- */}
          <section style={{ marginBottom: 24 }}>
            <SectionLabel>Proyecto</SectionLabel>
            <InfoRow label="Tipo de proyecto" value={lead.project_type} />
            <InfoRow label="Presupuesto" value={lead.budget_range} />
            <InfoRow
              label="Cierre estimado"
              value={
                lead.expected_close_date
                  ? formatDate(lead.expected_close_date)
                  : null
              }
            />
            {lead.notes && (
              <div style={{ marginTop: 8 }}>
                <div
                  style={{
                    fontFamily: 'monospace',
                    fontSize: 11,
                    color: '#555',
                    marginBottom: 6,
                  }}
                >
                  Notas
                </div>
                <div
                  style={{
                    fontFamily: 'monospace',
                    fontSize: 12,
                    color: '#e8e8e8',
                    background: '#111',
                    border: '1px solid #1a1a1a',
                    borderRadius: 4,
                    padding: '10px 12px',
                    whiteSpace: 'pre-wrap',
                    lineHeight: 1.6,
                  }}
                >
                  {lead.notes}
                </div>
              </div>
            )}
          </section>

          {/* ------ Status pills ------------------------------------------ */}
          <section style={{ marginBottom: 24 }}>
            <SectionLabel>Cambiar estado</SectionLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {ALL_STATUSES.map((s) => {
                const active = s === currentStatus
                const color = STATUS_COLORS[s]
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleStatusClick(s)}
                    disabled={statusPending}
                    style={{
                      fontFamily: 'monospace',
                      fontSize: 10,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: active ? color : '#555',
                      background: active ? `${color}20` : 'transparent',
                      border: `1px solid ${active ? color : '#2a2a2a'}`,
                      borderRadius: 3,
                      padding: '4px 10px',
                      cursor: statusPending ? 'not-allowed' : 'pointer',
                      transition: 'all 0.15s',
                      opacity: statusPending ? 0.5 : 1,
                    }}
                  >
                    {STATUS_LABELS[s]}
                  </button>
                )
              })}
            </div>
          </section>

          {/* ------ Activity log ------------------------------------------ */}
          <section style={{ marginBottom: 24 }}>
            <SectionLabel>Actividad</SectionLabel>
            {activitiesLoading ? (
              <div
                style={{
                  fontFamily: 'monospace',
                  fontSize: 11,
                  color: '#555',
                  paddingTop: 4,
                }}
              >
                Cargando...
              </div>
            ) : activities.length === 0 ? (
              <div
                style={{
                  fontFamily: 'monospace',
                  fontSize: 11,
                  color: '#444',
                  paddingTop: 4,
                }}
              >
                Sin actividad registrada.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {activities.map((act) => (
                  <div
                    key={act.id}
                    style={{
                      display: 'flex',
                      gap: 10,
                      padding: '8px 0',
                      borderBottom: '1px solid #111',
                      alignItems: 'flex-start',
                    }}
                  >
                    {/* Icon */}
                    <div
                      style={{
                        flexShrink: 0,
                        width: 22,
                        height: 22,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#111',
                        border: '1px solid #1a1a1a',
                        borderRadius: 3,
                        fontFamily: 'monospace',
                        fontSize: 10,
                        color: '#555',
                        userSelect: 'none',
                      }}
                    >
                      {ACTIVITY_TYPE_ICONS[act.type]}
                    </div>

                    {/* Body */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          marginBottom: 3,
                        }}
                      >
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontSize: 10,
                            color: '#555',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                          }}
                        >
                          {ACTIVITY_TYPE_LABELS[act.type]}
                        </span>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontSize: 10,
                            color: '#333',
                          }}
                        >
                          {formatDateTime(act.created_at)}
                        </span>
                      </div>
                      <p
                        style={{
                          margin: 0,
                          fontFamily: 'monospace',
                          fontSize: 12,
                          color: '#e8e8e8',
                          lineHeight: 1.5,
                          wordBreak: 'break-word',
                        }}
                      >
                        {act.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ------ Add activity form ------------------------------------- */}
          <section style={{ marginBottom: 28 }}>
            <SectionLabel>Agregar actividad</SectionLabel>

            {/* Type selector */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
              {ACTIVITY_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setActivityType(t)}
                  style={{
                    fontFamily: 'monospace',
                    fontSize: 10,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: activityType === t ? '#e8e8e8' : '#555',
                    background: activityType === t ? '#1a1a1a' : 'transparent',
                    border: `1px solid ${activityType === t ? '#2a2a2a' : '#1a1a1a'}`,
                    borderRadius: 3,
                    padding: '3px 8px',
                    cursor: 'pointer',
                  }}
                >
                  {ACTIVITY_TYPE_LABELS[t]}
                </button>
              ))}
            </div>

            {/* Textarea */}
            <textarea
              value={activityContent}
              onChange={(e) => setActivityContent(e.target.value)}
              placeholder="Describe la actividad..."
              rows={3}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                background: '#0d0d0d',
                border: '1px solid #1a1a1a',
                borderRadius: 4,
                color: '#e8e8e8',
                fontFamily: 'monospace',
                fontSize: 12,
                padding: '8px 10px',
                resize: 'vertical',
                outline: 'none',
                marginBottom: 8,
              }}
            />

            {activityError && (
              <div
                style={{
                  fontFamily: 'monospace',
                  fontSize: 11,
                  color: '#e8341a',
                  marginBottom: 8,
                }}
              >
                {activityError}
              </div>
            )}

            <button
              type="button"
              onClick={handleAddActivity}
              disabled={activityPending}
              style={{
                fontFamily: 'monospace',
                fontSize: 11,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: activityPending ? '#444' : '#e8e8e8',
                background: '#1a1a1a',
                border: '1px solid #2a2a2a',
                borderRadius: 3,
                padding: '6px 14px',
                cursor: activityPending ? 'not-allowed' : 'pointer',
              }}
            >
              {activityPending ? 'Guardando...' : 'Guardar actividad'}
            </button>
          </section>

          {/* ------ Actions ----------------------------------------------- */}
          <section>
            <SectionLabel>Acciones</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

              {/* Convert to client */}
              {!lead.converted_to_client_id && (
                <div>
                  {convertConfirm ? (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        flexWrap: 'wrap',
                      }}
                    >
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontSize: 11,
                          color: '#e8e8e8',
                        }}
                      >
                        Confirmar conversion a cliente?
                      </span>
                      <button
                        type="button"
                        onClick={handleConvert}
                        disabled={convertPending}
                        style={{
                          fontFamily: 'monospace',
                          fontSize: 11,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          color: convertPending ? '#444' : '#10b981',
                          background: 'transparent',
                          border: '1px solid #10b981',
                          borderRadius: 3,
                          padding: '4px 10px',
                          cursor: convertPending ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {convertPending ? 'Procesando...' : 'Confirmar'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConvertConfirm(false)}
                        disabled={convertPending}
                        style={{
                          fontFamily: 'monospace',
                          fontSize: 11,
                          color: '#555',
                          background: 'transparent',
                          border: '1px solid #2a2a2a',
                          borderRadius: 3,
                          padding: '4px 10px',
                          cursor: 'pointer',
                        }}
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleConvert}
                      style={{
                        fontFamily: 'monospace',
                        fontSize: 11,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color: '#10b981',
                        background: 'transparent',
                        border: '1px solid #10b98150',
                        borderRadius: 3,
                        padding: '6px 14px',
                        cursor: 'pointer',
                      }}
                    >
                      Convertir a cliente
                    </button>
                  )}
                </div>
              )}

              {lead.converted_to_client_id && (
                <div
                  style={{
                    fontFamily: 'monospace',
                    fontSize: 11,
                    color: '#10b981',
                    padding: '6px 0',
                  }}
                >
                  Lead convertido a cliente.
                </div>
              )}

              {/* Delete lead */}
              <div>
                {deleteConfirm ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      flexWrap: 'wrap',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'monospace',
                        fontSize: 11,
                        color: '#e8e8e8',
                      }}
                    >
                      Eliminar este lead definitivamente?
                    </span>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={deletePending}
                      style={{
                        fontFamily: 'monospace',
                        fontSize: 11,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color: deletePending ? '#444' : '#e8341a',
                        background: 'transparent',
                        border: '1px solid #e8341a',
                        borderRadius: 3,
                        padding: '4px 10px',
                        cursor: deletePending ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {deletePending ? 'Eliminando...' : 'Eliminar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirm(false)}
                      disabled={deletePending}
                      style={{
                        fontFamily: 'monospace',
                        fontSize: 11,
                        color: '#555',
                        background: 'transparent',
                        border: '1px solid #2a2a2a',
                        borderRadius: 3,
                        padding: '4px 10px',
                        cursor: 'pointer',
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleDelete}
                    style={{
                      fontFamily: 'monospace',
                      fontSize: 11,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: '#e8341a',
                      background: 'transparent',
                      border: '1px solid #e8341a50',
                      borderRadius: 3,
                      padding: '6px 14px',
                      cursor: 'pointer',
                    }}
                  >
                    Eliminar lead
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Bottom spacer */}
          <div style={{ height: 32 }} />
        </div>
      </div>
    </div>
  )
}
