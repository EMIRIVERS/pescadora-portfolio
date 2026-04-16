'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  updateLeadStatus,
  addLeadActivity,
  deleteLead,
  convertLeadToClient,
} from '@/lib/actions/leads'
import { sendLeadEmail } from '../../../../app/actions/send-lead-email'

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
// Design tokens
// ---------------------------------------------------------------------------

const T = {
  bg: '#000000',
  surface1: '#111111',
  surface2: '#1C1C1E',
  surface3: '#2C2C2E',
  surface3Hover: '#3A3A3C',
  border: 'rgba(255,255,255,0.08)',
  textPrimary: '#F5F5F7',
  textSecondary: '#86868B',
  textTertiary: '#48484A',
  accent: '#0071E3',
  accentRed: '#FF453A',
  accentGreen: '#30D158',
  font: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
} as const

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<Lead['status'], string> = {
  new: '#3b82f6',
  contacted: '#a855f7',
  qualified: '#f59e0b',
  proposal: '#f97316',
  won: '#30D158',
  lost: '#86868B',
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

function SectionDivider() {
  return (
    <div
      style={{
        height: 1,
        background: T.border,
        margin: 0,
      }}
    />
  )
}

function InfoGrid({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px 16px',
      }}
    >
      {children}
    </div>
  )
}

function InfoCell({
  label,
  value,
}: {
  label: string
  value: string | null | undefined
}) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span
        style={{
          fontFamily: T.font,
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: T.textSecondary,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: T.font,
          fontSize: 14,
          color: T.textPrimary,
          wordBreak: 'break-all',
          lineHeight: 1.4,
        }}
      >
        {value}
      </span>
    </div>
  )
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontFamily: T.font,
        fontSize: 13,
        fontWeight: 600,
        color: T.textSecondary,
        margin: '0 0 14px 0',
        letterSpacing: '-0.01em',
      }}
    >
      {children}
    </p>
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

  const [emailComposeOpen, setEmailComposeOpen] = useState(false)
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [emailStatus, setEmailStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [emailError, setEmailError] = useState<string | null>(null)

  const [statusPending, startStatusTransition] = useTransition()
  const [activityPending, startActivityTransition] = useTransition()
  const [deletePending, startDeleteTransition] = useTransition()
  const [convertPending, startConvertTransition] = useTransition()
  const [emailPending, startEmailTransition] = useTransition()

  // Next action state — seeded from lead if fields exist
  const leadAny = lead as unknown as Record<string, unknown>
  const [nextAction, setNextAction] = useState<string>(
    typeof leadAny.next_action === 'string' ? leadAny.next_action : ''
  )
  const [nextActionDate, setNextActionDate] = useState<string>(
    typeof leadAny.next_action_date === 'string' ? leadAny.next_action_date : ''
  )
  const [nextActionSaving, setNextActionSaving] = useState(false)
  const [nextActionError, setNextActionError] = useState<string | null>(null)
  const [nextActionSaved, setNextActionSaved] = useState(false)

  // Budget estimate inline edit state
  const [budgetEditing, setBudgetEditing] = useState(false)
  const [budgetValue, setBudgetValue] = useState<string>(
    leadAny.budget_estimate != null ? String(leadAny.budget_estimate) : ''
  )
  const [budgetSaving, setBudgetSaving] = useState(false)

  const panelRef = useRef<HTMLDivElement>(null)

  // Lock body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

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
        setCurrentStatus('won')
        onStatusChange(lead.id, 'won')
        onClose()
      }
    })
  }

  function handleSendEmail() {
    const trimmedSubject = emailSubject.trim()
    const trimmedBody = emailBody.trim()
    if (!trimmedSubject || !trimmedBody) {
      setEmailError('El asunto y el mensaje no pueden estar vacios.')
      return
    }
    setEmailError(null)
    startEmailTransition(async () => {
      const result = await sendLeadEmail(lead.id, trimmedSubject, trimmedBody)
      if (result.error) {
        setEmailStatus('error')
        setEmailError(result.error)
      } else {
        setEmailStatus('success')
        setEmailSubject('')
        setEmailBody('')
        // Refresh activities to show the logged email entry
        const supabase = createClient()
        const { data } = await supabase
          .from('lead_activities')
          .select('*')
          .eq('lead_id', lead.id)
          .order('created_at', { ascending: false })
        if (data) setActivities(data as LeadActivity[])
        // Auto-close compose after a short moment
        setTimeout(() => {
          setEmailComposeOpen(false)
          setEmailStatus('idle')
        }, 2000)
      }
    })
  }

  async function handleSaveNextAction() {
    setNextActionSaving(true)
    setNextActionError(null)
    setNextActionSaved(false)
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('leads') as any)
      .update({
        next_action: nextAction || null,
        next_action_date: nextActionDate || null,
      })
      .eq('id', lead.id)
    setNextActionSaving(false)
    if (error) {
      setNextActionError(error.message)
    } else {
      setNextActionSaved(true)
      setTimeout(() => setNextActionSaved(false), 2000)
    }
  }

  async function handleSaveBudget(raw: string) {
    const num = raw === '' ? null : Number(raw)
    if (raw !== '' && isNaN(num as number)) return
    setBudgetSaving(true)
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('leads') as any)
      .update({ budget_estimate: num })
      .eq('id', lead.id)
    setBudgetSaving(false)
    setBudgetEditing(false)
  }

  function getNextActionDateColor(): string {
    if (!nextActionDate) return T.textPrimary
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const target = new Date(nextActionDate + 'T00:00:00')
    const diffDays = Math.ceil(
      (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    )
    if (diffDays < 0) return '#FF453A'
    if (diffDays <= 2) return '#FF9F0A'
    return '#30D158'
  }

  const statusColor = STATUS_COLORS[currentStatus]

  return (
    <>
      {/* Global style overrides for this modal */}
      <style>{`
        .ldm-close-btn:hover {
          background: ${T.surface3Hover} !important;
        }
        .ldm-textarea:focus {
          outline: none;
          border-color: rgba(255,255,255,0.2) !important;
        }
        .ldm-textarea::placeholder {
          color: ${T.textTertiary};
        }
        .ldm-save-btn:hover:not(:disabled) {
          background: #0077ED !important;
        }
        .ldm-convert-btn:hover:not(:disabled) {
          background: rgba(48,209,88,0.15) !important;
        }
        .ldm-delete-btn:hover:not(:disabled) {
          background: rgba(255,69,58,0.1) !important;
        }
        .ldm-cancel-btn:hover:not(:disabled) {
          background: ${T.surface3} !important;
        }
        .ldm-email-input:focus {
          outline: none;
          border-color: rgba(255,255,255,0.2) !important;
        }
        .ldm-email-input::placeholder {
          color: ${T.textTertiary};
        }
        .ldm-email-send-btn:hover:not(:disabled) {
          background: #0077ED !important;
        }
        .ldm-compose-toggle:hover {
          color: ${T.textPrimary} !important;
        }
        .ldm-next-action-input:focus {
          outline: none;
          border-color: rgba(255,255,255,0.2) !important;
        }
        .ldm-next-action-input::placeholder {
          color: ${T.textTertiary};
        }
        .ldm-budget-input:focus {
          outline: none;
          border-color: rgba(255,255,255,0.2) !important;
        }
        .ldm-pencil-btn:hover {
          color: ${T.textPrimary} !important;
        }
      `}</style>

      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1000,
          display: 'flex',
          justifyContent: 'flex-end',
        }}
      >
        {/* Overlay */}
        <div
          onClick={onClose}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
        />

        {/* Panel */}
        <div
          ref={panelRef}
          style={{
            position: 'fixed',
            right: 0,
            top: 0,
            bottom: 0,
            width: 480,
            background: T.surface1,
            borderLeft: `1px solid ${T.border}`,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            fontFamily: T.font,
          }}
        >
          {/* ---------------------------------------------------------------- */}
          {/* Header                                                           */}
          {/* ---------------------------------------------------------------- */}
          <div
            style={{
              padding: 24,
              borderBottom: `1px solid ${T.border}`,
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
                  fontFamily: T.font,
                  fontWeight: 600,
                  fontSize: 22,
                  color: T.textPrimary,
                  margin: 0,
                  lineHeight: 1.2,
                  flex: 1,
                  letterSpacing: '-0.02em',
                }}
              >
                {lead.name}
              </h2>

              {/* Close button */}
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                className="ldm-close-btn"
                style={{
                  flexShrink: 0,
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: T.surface3,
                  border: 'none',
                  color: T.textSecondary,
                  fontSize: 16,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 1,
                  transition: 'background 0.15s',
                  fontFamily: T.font,
                }}
              >
                &#x2715;
              </button>
            </div>

            {/* Status badge + pending indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                style={{
                  fontFamily: T.font,
                  fontSize: 12,
                  fontWeight: 500,
                  letterSpacing: '-0.01em',
                  color: statusColor,
                  background: `${statusColor}26`,
                  padding: '4px 12px',
                  borderRadius: 20,
                }}
              >
                {STATUS_LABELS[currentStatus]}
              </span>
              {statusPending && (
                <span
                  style={{
                    fontFamily: T.font,
                    fontSize: 12,
                    color: T.textTertiary,
                  }}
                >
                  Guardando...
                </span>
              )}
            </div>

            {/* Global error */}
            {globalError && (
              <div
                style={{
                  marginTop: 12,
                  fontFamily: T.font,
                  fontSize: 13,
                  color: T.accentRed,
                  background: 'rgba(255,69,58,0.1)',
                  border: `1px solid rgba(255,69,58,0.2)`,
                  borderRadius: 8,
                  padding: '8px 12px',
                }}
              >
                {globalError}
              </div>
            )}
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* Section 1 — Info basica                                          */}
          {/* ---------------------------------------------------------------- */}
          <div style={{ padding: '20px 24px' }}>
            <InfoGrid>
              <InfoCell label="Email" value={lead.email} />
              <InfoCell label="Telefono" value={lead.phone} />
              <InfoCell label="Empresa" value={lead.company} />
              <InfoCell label="Fuente" value={lead.source} />
              <InfoCell label="Presupuesto" value={lead.budget_range} />
              <InfoCell label="Tipo de proyecto" value={lead.project_type} />
              <InfoCell
                label="Creado"
                value={formatDateTime(lead.created_at)}
              />
              <InfoCell
                label="Ultimo contacto"
                value={
                  lead.last_contacted_at
                    ? formatDate(lead.last_contacted_at)
                    : null
                }
              />
              <InfoCell
                label="Cierre estimado"
                value={
                  lead.expected_close_date
                    ? formatDate(lead.expected_close_date)
                    : null
                }
              />

              {/* Presupuesto estimado — editable inline */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span
                  style={{
                    fontFamily: T.font,
                    fontSize: 11,
                    fontWeight: 500,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: T.textSecondary,
                  }}
                >
                  Presupuesto estimado
                </span>
                {budgetEditing ? (
                  <input
                    type="number"
                    autoFocus
                    value={budgetValue}
                    onChange={(e) => setBudgetValue(e.target.value)}
                    onBlur={() => handleSaveBudget(budgetValue)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveBudget(budgetValue)
                      if (e.key === 'Escape') setBudgetEditing(false)
                    }}
                    disabled={budgetSaving}
                    className="ldm-budget-input"
                    style={{
                      background: T.surface2,
                      border: `1px solid rgba(255,255,255,0.1)`,
                      borderRadius: 6,
                      color: T.textPrimary,
                      fontFamily: T.font,
                      fontSize: 14,
                      padding: '5px 8px',
                      width: '100%',
                      boxSizing: 'border-box',
                      outline: 'none',
                      opacity: budgetSaving ? 0.5 : 1,
                      transition: 'border-color 0.15s',
                    }}
                  />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span
                      style={{
                        fontFamily: T.font,
                        fontSize: 14,
                        color: T.textPrimary,
                      }}
                    >
                      {budgetValue !== ''
                        ? `$${Number(budgetValue).toLocaleString('es-MX')} MXN`
                        : '—'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setBudgetEditing(true)}
                      className="ldm-pencil-btn"
                      title="Editar presupuesto estimado"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: T.textSecondary,
                        cursor: 'pointer',
                        padding: 0,
                        fontSize: 12,
                        lineHeight: 1,
                        transition: 'color 0.15s',
                      }}
                    >
                      ✎
                    </button>
                  </div>
                )}
              </div>
            </InfoGrid>

            {lead.notes && (
              <div style={{ marginTop: 16 }}>
                <span
                  style={{
                    fontFamily: T.font,
                    fontSize: 11,
                    fontWeight: 500,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: T.textSecondary,
                    display: 'block',
                    marginBottom: 8,
                  }}
                >
                  Notas
                </span>
                <div
                  style={{
                    fontFamily: T.font,
                    fontSize: 14,
                    color: T.textPrimary,
                    background: T.surface2,
                    border: `1px solid ${T.border}`,
                    borderRadius: 8,
                    padding: '10px 14px',
                    whiteSpace: 'pre-wrap',
                    lineHeight: 1.6,
                  }}
                >
                  {lead.notes}
                </div>
              </div>
            )}
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* Section 2 — Cambiar estado                                       */}
          {/* ---------------------------------------------------------------- */}
          <SectionDivider />
          <div style={{ padding: '20px 24px' }}>
            <SectionHeader>Cambiar estado</SectionHeader>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
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
                      fontFamily: T.font,
                      fontSize: 12,
                      fontWeight: 500,
                      letterSpacing: '-0.01em',
                      color: color,
                      background: active
                        ? `${color}4D`
                        : `${color}26`,
                      border: active
                        ? `1px solid ${color}`
                        : '1px solid transparent',
                      borderRadius: 20,
                      padding: '5px 14px',
                      cursor: statusPending ? 'not-allowed' : 'pointer',
                      transition: 'all 0.15s',
                      opacity: statusPending && !active ? 0.5 : 1,
                    }}
                  >
                    {STATUS_LABELS[s]}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* Section 3 — Agregar nota / actividad                             */}
          {/* ---------------------------------------------------------------- */}
          <SectionDivider />
          <div style={{ padding: '20px 24px' }}>
            <SectionHeader>Agregar actividad</SectionHeader>

            {/* Activity type selector */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {ACTIVITY_TYPES.map((t) => {
                const active = activityType === t
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setActivityType(t)}
                    style={{
                      fontFamily: T.font,
                      fontSize: 12,
                      fontWeight: 500,
                      color: active ? T.textPrimary : T.textSecondary,
                      background: active ? T.surface3 : 'transparent',
                      border: `1px solid ${active ? T.surface3Hover : T.border}`,
                      borderRadius: 20,
                      padding: '4px 12px',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {ACTIVITY_TYPE_LABELS[t]}
                  </button>
                )
              })}
            </div>

            {/* Textarea */}
            <textarea
              value={activityContent}
              onChange={(e) => setActivityContent(e.target.value)}
              placeholder="Describe la actividad..."
              rows={3}
              className="ldm-textarea"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                background: T.surface2,
                border: `1px solid rgba(255,255,255,0.1)`,
                borderRadius: 8,
                color: T.textPrimary,
                fontFamily: T.font,
                fontSize: 14,
                padding: '10px 12px',
                resize: 'none',
                outline: 'none',
                marginBottom: 8,
                lineHeight: 1.5,
                transition: 'border-color 0.15s',
              }}
            />

            {activityError && (
              <div
                style={{
                  fontFamily: T.font,
                  fontSize: 13,
                  color: T.accentRed,
                  marginBottom: 10,
                }}
              >
                {activityError}
              </div>
            )}

            <button
              type="button"
              onClick={handleAddActivity}
              disabled={activityPending}
              className="ldm-save-btn"
              style={{
                fontFamily: T.font,
                fontSize: 13,
                fontWeight: 500,
                color: '#ffffff',
                background: T.accent,
                border: 'none',
                borderRadius: 8,
                padding: '8px 18px',
                cursor: activityPending ? 'not-allowed' : 'pointer',
                opacity: activityPending ? 0.6 : 1,
                transition: 'background 0.15s, opacity 0.15s',
              }}
            >
              {activityPending ? 'Guardando...' : 'Guardar nota'}
            </button>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* Section 3b — Redactar email                                      */}
          {/* ---------------------------------------------------------------- */}
          <SectionDivider />
          <div style={{ padding: '20px 24px' }}>
            <SectionHeader>Redactar email</SectionHeader>

            {!lead.email ? (
              <p
                style={{
                  fontFamily: T.font,
                  fontSize: 13,
                  color: T.textTertiary,
                  margin: 0,
                }}
              >
                Sin email registrado
              </p>
            ) : !emailComposeOpen ? (
              <button
                type="button"
                className="ldm-compose-toggle"
                onClick={() => {
                  setEmailComposeOpen(true)
                  setEmailStatus('idle')
                  setEmailError(null)
                }}
                style={{
                  fontFamily: T.font,
                  fontSize: 13,
                  fontWeight: 500,
                  color: T.textSecondary,
                  background: 'transparent',
                  border: `1px solid ${T.border}`,
                  borderRadius: 8,
                  padding: '7px 16px',
                  cursor: 'pointer',
                  transition: 'color 0.15s',
                }}
              >
                Redactar email &rarr;
              </button>
            ) : (
              <div
                style={{
                  background: T.surface3,
                  borderRadius: 12,
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                {/* Subject */}
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Asunto"
                  className="ldm-email-input"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    background: T.surface2,
                    border: `1px solid rgba(255,255,255,0.1)`,
                    borderRadius: 8,
                    color: T.textPrimary,
                    fontFamily: T.font,
                    fontSize: 14,
                    padding: '9px 12px',
                    outline: 'none',
                    transition: 'border-color 0.15s',
                  }}
                />

                {/* Body */}
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  placeholder="Mensaje..."
                  rows={4}
                  className="ldm-email-input ldm-textarea"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    background: T.surface2,
                    border: `1px solid rgba(255,255,255,0.1)`,
                    borderRadius: 8,
                    color: T.textPrimary,
                    fontFamily: T.font,
                    fontSize: 14,
                    padding: '9px 12px',
                    resize: 'none',
                    outline: 'none',
                    lineHeight: 1.5,
                    transition: 'border-color 0.15s',
                  }}
                />

                {/* Feedback */}
                {emailStatus === 'success' && (
                  <p
                    style={{
                      margin: 0,
                      fontFamily: T.font,
                      fontSize: 13,
                      color: T.accentGreen,
                    }}
                  >
                    Email enviado correctamente
                  </p>
                )}
                {emailStatus === 'error' && emailError && (
                  <p
                    style={{
                      margin: 0,
                      fontFamily: T.font,
                      fontSize: 13,
                      color: T.accentRed,
                    }}
                  >
                    {emailError}
                  </p>
                )}
                {emailStatus === 'idle' && emailError && (
                  <p
                    style={{
                      margin: 0,
                      fontFamily: T.font,
                      fontSize: 13,
                      color: T.accentRed,
                    }}
                  >
                    {emailError}
                  </p>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={handleSendEmail}
                    disabled={emailPending || emailStatus === 'success'}
                    className="ldm-email-send-btn"
                    style={{
                      fontFamily: T.font,
                      fontSize: 13,
                      fontWeight: 500,
                      color: '#ffffff',
                      background: T.accent,
                      border: 'none',
                      borderRadius: 8,
                      padding: '8px 18px',
                      cursor: emailPending || emailStatus === 'success' ? 'not-allowed' : 'pointer',
                      opacity: emailPending || emailStatus === 'success' ? 0.6 : 1,
                      transition: 'background 0.15s, opacity 0.15s',
                    }}
                  >
                    {emailPending ? 'Enviando...' : 'Enviar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEmailComposeOpen(false)
                      setEmailSubject('')
                      setEmailBody('')
                      setEmailStatus('idle')
                      setEmailError(null)
                    }}
                    disabled={emailPending}
                    className="ldm-cancel-btn"
                    style={{
                      fontFamily: T.font,
                      fontSize: 13,
                      color: T.textSecondary,
                      background: 'transparent',
                      border: `1px solid ${T.border}`,
                      borderRadius: 8,
                      padding: '8px 14px',
                      cursor: emailPending ? 'not-allowed' : 'pointer',
                      transition: 'background 0.15s',
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* Section 3c — Proxima accion                                      */}
          {/* ---------------------------------------------------------------- */}
          <SectionDivider />
          <div style={{ padding: '20px 24px' }}>
            <SectionHeader>Proxima accion</SectionHeader>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                type="text"
                value={nextAction}
                onChange={(e) => setNextAction(e.target.value)}
                placeholder="Que hay que hacer..."
                className="ldm-next-action-input"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  background: T.surface2,
                  border: `1px solid rgba(255,255,255,0.1)`,
                  borderRadius: 8,
                  color: T.textPrimary,
                  fontFamily: T.font,
                  fontSize: 14,
                  padding: '9px 12px',
                  outline: 'none',
                  transition: 'border-color 0.15s',
                }}
              />
              <input
                type="date"
                value={nextActionDate}
                onChange={(e) => setNextActionDate(e.target.value)}
                className="ldm-next-action-input"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  background: T.surface2,
                  border: `1px solid rgba(255,255,255,0.1)`,
                  borderRadius: 8,
                  color: nextActionDate ? getNextActionDateColor() : T.textSecondary,
                  fontFamily: T.font,
                  fontSize: 14,
                  padding: '9px 12px',
                  outline: 'none',
                  transition: 'border-color 0.15s',
                  colorScheme: 'dark',
                }}
              />
              {nextActionError && (
                <span
                  style={{
                    fontFamily: T.font,
                    fontSize: 13,
                    color: T.accentRed,
                  }}
                >
                  {nextActionError}
                </span>
              )}
              {nextActionSaved && (
                <span
                  style={{
                    fontFamily: T.font,
                    fontSize: 13,
                    color: '#30D158',
                  }}
                >
                  Guardado
                </span>
              )}
              <button
                type="button"
                onClick={handleSaveNextAction}
                disabled={nextActionSaving}
                className="ldm-save-btn"
                style={{
                  alignSelf: 'flex-start',
                  fontFamily: T.font,
                  fontSize: 13,
                  fontWeight: 500,
                  color: '#ffffff',
                  background: T.accent,
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 18px',
                  cursor: nextActionSaving ? 'not-allowed' : 'pointer',
                  opacity: nextActionSaving ? 0.6 : 1,
                  transition: 'background 0.15s, opacity 0.15s',
                }}
              >
                {nextActionSaving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* Section 4 — Feed de actividad                                    */}
          {/* ---------------------------------------------------------------- */}
          <SectionDivider />
          <div style={{ padding: '20px 24px' }}>
            <SectionHeader>Actividad</SectionHeader>

            {activitiesLoading ? (
              <p
                style={{
                  fontFamily: T.font,
                  fontSize: 13,
                  color: T.textTertiary,
                  margin: 0,
                }}
              >
                Cargando...
              </p>
            ) : activities.length === 0 ? (
              <p
                style={{
                  fontFamily: T.font,
                  fontSize: 13,
                  color: T.textTertiary,
                  margin: 0,
                }}
              >
                Sin actividad registrada.
              </p>
            ) : (
              <div
                style={{
                  position: 'relative',
                  paddingLeft: 20,
                }}
              >
                {/* Vertical timeline line */}
                <div
                  style={{
                    position: 'absolute',
                    left: 3,
                    top: 8,
                    bottom: 8,
                    width: 1,
                    background: T.surface3,
                  }}
                />

                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  {activities.map((act) => (
                    <div
                      key={act.id}
                      style={{
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 3,
                      }}
                    >
                      {/* Timeline dot */}
                      <div
                        style={{
                          position: 'absolute',
                          left: -21,
                          top: 4,
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: T.surface3Hover,
                          flexShrink: 0,
                        }}
                      />

                      {/* Date */}
                      <span
                        style={{
                          fontFamily: T.font,
                          fontSize: 11,
                          color: T.textTertiary,
                        }}
                      >
                        {formatDateTime(act.created_at)}
                      </span>

                      {/* Type label */}
                      <span
                        style={{
                          fontFamily: T.font,
                          fontSize: 12,
                          color: T.textSecondary,
                          fontWeight: 500,
                        }}
                      >
                        {ACTIVITY_TYPE_LABELS[act.type]}
                      </span>

                      {/* Content */}
                      <p
                        style={{
                          margin: 0,
                          fontFamily: T.font,
                          fontSize: 13,
                          color: T.textPrimary,
                          lineHeight: 1.5,
                          wordBreak: 'break-word',
                        }}
                      >
                        {act.content}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* Section 5 — Acciones peligrosas                                  */}
          {/* ---------------------------------------------------------------- */}
          <SectionDivider />
          <div style={{ padding: '20px 24px' }}>
            <SectionHeader>Acciones</SectionHeader>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

              {/* Convert to client */}
              {!lead.converted_to_client_id && (
                <div>
                  {convertConfirm ? (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        flexWrap: 'wrap',
                      }}
                    >
                      <span
                        style={{
                          fontFamily: T.font,
                          fontSize: 13,
                          color: T.textPrimary,
                        }}
                      >
                        Confirmar conversion a cliente?
                      </span>
                      <button
                        type="button"
                        onClick={handleConvert}
                        disabled={convertPending}
                        className="ldm-convert-btn"
                        style={{
                          fontFamily: T.font,
                          fontSize: 13,
                          fontWeight: 500,
                          color: T.accentGreen,
                          background: 'rgba(48,209,88,0.1)',
                          border: `1px solid rgba(48,209,88,0.4)`,
                          borderRadius: 8,
                          padding: '6px 14px',
                          cursor: convertPending ? 'not-allowed' : 'pointer',
                          opacity: convertPending ? 0.6 : 1,
                          transition: 'background 0.15s',
                        }}
                      >
                        {convertPending ? 'Procesando...' : 'Confirmar'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConvertConfirm(false)}
                        disabled={convertPending}
                        className="ldm-cancel-btn"
                        style={{
                          fontFamily: T.font,
                          fontSize: 13,
                          color: T.textSecondary,
                          background: 'transparent',
                          border: `1px solid ${T.border}`,
                          borderRadius: 8,
                          padding: '6px 14px',
                          cursor: 'pointer',
                          transition: 'background 0.15s',
                        }}
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleConvert}
                      className="ldm-convert-btn"
                      style={{
                        fontFamily: T.font,
                        fontSize: 13,
                        fontWeight: 500,
                        color: T.accentGreen,
                        background: 'rgba(48,209,88,0.08)',
                        border: `1px solid rgba(48,209,88,0.25)`,
                        borderRadius: 8,
                        padding: '7px 16px',
                        cursor: 'pointer',
                        transition: 'background 0.15s',
                      }}
                    >
                      Convertir a cliente
                    </button>
                  )}
                </div>
              )}

              {lead.converted_to_client_id && (
                <p
                  style={{
                    fontFamily: T.font,
                    fontSize: 13,
                    color: T.accentGreen,
                    margin: 0,
                  }}
                >
                  Lead convertido a cliente.
                </p>
              )}

              {/* Delete lead */}
              <div>
                {deleteConfirm ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      flexWrap: 'wrap',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: T.font,
                        fontSize: 13,
                        color: T.textPrimary,
                      }}
                    >
                      Eliminar este lead definitivamente?
                    </span>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={deletePending}
                      className="ldm-delete-btn"
                      style={{
                        fontFamily: T.font,
                        fontSize: 13,
                        fontWeight: 500,
                        color: T.accentRed,
                        background: 'rgba(255,69,58,0.08)',
                        border: `1px solid ${T.accentRed}`,
                        borderRadius: 8,
                        padding: '6px 14px',
                        cursor: deletePending ? 'not-allowed' : 'pointer',
                        opacity: deletePending ? 0.6 : 1,
                        transition: 'background 0.15s',
                      }}
                    >
                      {deletePending ? 'Eliminando...' : 'Eliminar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirm(false)}
                      disabled={deletePending}
                      className="ldm-cancel-btn"
                      style={{
                        fontFamily: T.font,
                        fontSize: 13,
                        color: T.textSecondary,
                        background: 'transparent',
                        border: `1px solid ${T.border}`,
                        borderRadius: 8,
                        padding: '6px 14px',
                        cursor: 'pointer',
                        transition: 'background 0.15s',
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="ldm-delete-btn"
                    style={{
                      fontFamily: T.font,
                      fontSize: 13,
                      fontWeight: 500,
                      color: T.accentRed,
                      background: 'transparent',
                      border: `1px solid rgba(255,69,58,0.3)`,
                      borderRadius: 8,
                      padding: '7px 16px',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                  >
                    Eliminar lead
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Bottom spacer */}
          <div style={{ height: 32, flexShrink: 0 }} />
        </div>
      </div>
    </>
  )
}
