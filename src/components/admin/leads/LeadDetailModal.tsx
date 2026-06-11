'use client'

import React, { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import {
  updateLeadStatus,
  addLeadActivity,
  deleteLead,
  convertLeadToClient,
} from '@/lib/actions/leads'
import { sendLeadEmail } from '@/lib/actions/send-lead-email'
import {
  FileText,
  Mail,
  Phone,
  MessageCircle,
  Users,
  ArrowLeftRight,
  ChevronDown,
  X,
  Copy,
  Check,
} from 'lucide-react'
import LeadScoreBadge, { LeadScoreBreakdown } from './LeadScoreBadge'
import ClientTypePicker from './ClientTypePicker'
import { getAllClientTypes, getLeadClientTypes, type ClientType } from '@/lib/actions/client-types'

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
  wa_message: string | null
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
// Tokens
// ---------------------------------------------------------------------------

const T = {
  font: "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
  bg:      'var(--dash-bg)',
  surf1:   'var(--dash-surface-1)',
  surf2:   'var(--dash-surface-2)',
  surf3:   'var(--dash-surface-3)',
  border:  'var(--dash-border)',
  borderS: 'var(--dash-border-strong)',
  text1:   'var(--dash-text-primary)',
  text2:   'var(--dash-text-secondary)',
  text3:   'var(--dash-text-tertiary)',
  accent:  'var(--dash-accent)',
  danger:  'var(--dash-danger)',
  success: 'var(--dash-success)',
  warning: 'var(--dash-warning)',
} as const

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<Lead['status'], string> = {
  new:       '#3b82f6',
  contacted: '#a855f7',
  qualified: '#f59e0b',
  proposal:  '#f97316',
  won:       '#30D158',
  lost:      '#6b7280',
}

const STATUS_LABELS: Record<Lead['status'], string> = {
  new:       'Nuevo',
  contacted: 'Contactado',
  qualified: 'Calificado',
  proposal:  'Propuesta',
  won:       'Ganado',
  lost:      'Perdido',
}

const ALL_STATUSES: Lead['status'][] = [
  'new', 'contacted', 'qualified', 'proposal', 'won', 'lost',
]

const ACTIVITY_TYPE_LABELS: Record<LeadActivity['type'], string> = {
  note:          'Nota',
  email:         'Email',
  call:          'Llamada',
  whatsapp:      'WhatsApp',
  meeting:       'Reunión',
  status_change: 'Estado',
}

const ACTIVITY_TYPES: LeadActivity['type'][] = ['note', 'call', 'whatsapp', 'email', 'meeting']

const ACTIVITY_ICONS: Record<LeadActivity['type'], React.ReactElement> = {
  note:          <FileText size={12} />,
  email:         <Mail size={12} />,
  call:          <Phone size={12} />,
  whatsapp:      <MessageCircle size={12} />,
  meeting:       <Users size={12} />,
  status_change: <ArrowLeftRight size={12} />,
}

const ACTIVITY_ICONS_LG: Record<string, React.ReactElement> = {
  note:      <FileText size={18} strokeWidth={1.5} />,
  call:      <Phone size={18} strokeWidth={1.5} />,
  whatsapp:  <MessageCircle size={18} strokeWidth={1.5} />,
  email:     <Mail size={18} strokeWidth={1.5} />,
  meeting:   <Users size={18} strokeWidth={1.5} />,
}

const SOURCE_LABELS: Record<Lead['source'], string> = {
  manual:    'Manual',
  referral:  'Referido',
  instagram: 'Instagram',
  web:       'Web',
  whatsapp:  'WhatsApp',
  other:     'Otro',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('es-MX', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatRelativeTime(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)
  if (diffMin < 1) return 'hace un momento'
  if (diffMin < 60) return `hace ${diffMin} min`
  if (diffHour < 24) return `hace ${diffHour} h`
  if (diffDay === 1) return 'ayer'
  if (diffDay < 7) return `hace ${diffDay} días`
  return formatDateTime(dateStr)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-MX', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Accordion({
  label,
  children,
  danger,
  defaultOpen,
}: {
  label: string
  children: React.ReactNode
  danger?: boolean
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen ?? false)
  return (
    <div style={{ borderTop: `1px solid ${T.border}` }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 24px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontFamily: T.font,
          fontSize: 13,
          fontWeight: 600,
          color: danger ? T.danger : T.text2,
          letterSpacing: '-0.01em',
          transition: 'color 0.15s',
        }}
        onMouseEnter={(e) => {
          ;(e.currentTarget as HTMLButtonElement).style.color = danger ? T.danger : T.text1
        }}
        onMouseLeave={(e) => {
          ;(e.currentTarget as HTMLButtonElement).style.color = danger ? T.danger : T.text2
        }}
      >
        <span>{label}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          style={{ display: 'flex', alignItems: 'center' }}
        >
          <ChevronDown size={14} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '4px 24px 20px' }}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
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
  const [currentStatus, setCurrentStatus] = useState<Lead['status']>(lead.status)
  const [activities, setActivities] = useState<LeadActivity[]>([])
  const [activitiesLoading, setActivitiesLoading] = useState(true)
  const [activityType, setActivityType] = useState<LeadActivity['type']>('note')
  const [activityContent, setActivityContent] = useState('')
  const [activityError, setActivityError] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [convertConfirm, setConvertConfirm] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)

  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [emailStatus, setEmailStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [emailError, setEmailError] = useState<string | null>(null)

  const [statusPending, startStatusTransition] = useTransition()
  const [activityPending, startActivityTransition] = useTransition()
  const [deletePending, startDeleteTransition] = useTransition()
  const [convertPending, startConvertTransition] = useTransition()
  const [emailPending, startEmailTransition] = useTransition()

  const [sourceValue, setSourceValue] = useState<Lead['source']>(lead.source)
  const [sourceSaving, setSourceSaving] = useState(false)
  const [assignedTo, setAssignedTo] = useState<string>(lead.assigned_to ?? '')
  const [assignedSaving, setAssignedSaving] = useState(false)

  const [allClientTypes, setAllClientTypes] = useState<ClientType[]>([])
  const [leadClientTypes, setLeadClientTypes] = useState<ClientType[]>([])

  const [localLastContacted, setLocalLastContacted] = useState<string | null>(lead.last_contacted_at)
  // Freeze "now" at mount so date math stays pure across renders.
  const [now] = useState(() => Date.now())

  const leadAny = lead as unknown as Record<string, unknown>
  const [waCopied, setWaCopied] = useState(false)

  const [nextAction, setNextAction] = useState<string>(
    typeof leadAny.next_action === 'string' ? leadAny.next_action : ''
  )
  const [nextActionDate, setNextActionDate] = useState<string>(
    typeof leadAny.next_action_date === 'string' ? leadAny.next_action_date : ''
  )
  const [nextActionSaving, setNextActionSaving] = useState(false)
  const [nextActionSaved, setNextActionSaved] = useState(false)

  const [budgetEditing, setBudgetEditing] = useState(false)
  const [budgetValue, setBudgetValue] = useState<string>(
    leadAny.budget_estimate != null ? String(leadAny.budget_estimate) : ''
  )
  const [budgetSaving, setBudgetSaving] = useState(false)

  const [waMessage, setWaMessage] = useState<string>(lead.wa_message ?? '')
  const [waMessageSaving, setWaMessageSaving] = useState(false)
  const [waMessageSaved, setWaMessageSaved] = useState(false)

  const panelRef = useRef<HTMLDivElement>(null)

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Escape key
  useEffect(() => {
    function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  // Fetch activities + client types
  useEffect(() => {
    let cancelled = false
    async function fetchAll() {
      setActivitiesLoading(true)
      const supabase = createClient()
      const [{ data }, allT, mineT] = await Promise.all([
        supabase.from('lead_activities').select('*').eq('lead_id', lead.id).order('created_at', { ascending: false }),
        getAllClientTypes(),
        getLeadClientTypes(lead.id),
      ])
      if (!cancelled) {
        if (data) setActivities(data as LeadActivity[])
        setAllClientTypes(allT)
        setLeadClientTypes(mineT)
        setActivitiesLoading(false)
      }
    }
    void fetchAll()
    return () => { cancelled = true }
  }, [lead.id])

  // ── Handlers ───────────────────────────────────────────────────────────────

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
        const { data } = await supabase.from('lead_activities').select('*').eq('lead_id', lead.id).order('created_at', { ascending: false })
        if (data) setActivities(data as LeadActivity[])
      }
    })
  }

  function handleAddActivity() {
    const trimmed = activityContent.trim()
    if (!trimmed) { setActivityError('Escribe algo primero.'); return }
    setActivityError(null)
    startActivityTransition(async () => {
      const result = await addLeadActivity(lead.id, activityType, trimmed)
      if (result.error) {
        setActivityError(result.error)
      } else {
        setActivityContent('')
        if (['whatsapp', 'call', 'email', 'meeting'].includes(activityType)) {
          setLocalLastContacted(new Date().toISOString())
        }
        const supabase = createClient()
        const { data } = await supabase.from('lead_activities').select('*').eq('lead_id', lead.id).order('created_at', { ascending: false })
        if (data) setActivities(data as LeadActivity[])
      }
    })
  }

  function handleDelete() {
    if (!deleteConfirm) { setDeleteConfirm(true); return }
    startDeleteTransition(async () => {
      const result = await deleteLead(lead.id)
      if (result.error) { setGlobalError(result.error); setDeleteConfirm(false) }
      else { onDelete(lead.id); onClose() }
    })
  }

  function handleConvert() {
    if (!convertConfirm) { setConvertConfirm(true); return }
    startConvertTransition(async () => {
      const result = await convertLeadToClient(lead.id)
      if (result.error) { setGlobalError(result.error); setConvertConfirm(false) }
      else { setCurrentStatus('won'); onStatusChange(lead.id, 'won'); onClose() }
    })
  }

  function handleSendEmail() {
    const trimmedSubject = emailSubject.trim()
    const trimmedBody = emailBody.trim()
    if (!trimmedSubject || !trimmedBody) { setEmailError('Completa asunto y mensaje.'); return }
    setEmailError(null)
    startEmailTransition(async () => {
      const result = await sendLeadEmail(lead.id, trimmedSubject, trimmedBody)
      if (result.error) { setEmailStatus('error'); setEmailError(result.error) }
      else {
        setEmailStatus('success')
        setEmailSubject('')
        setEmailBody('')
        setLocalLastContacted(new Date().toISOString())
        const supabase = createClient()
        const { data } = await supabase.from('lead_activities').select('*').eq('lead_id', lead.id).order('created_at', { ascending: false })
        if (data) setActivities(data as LeadActivity[])
        setTimeout(() => { setEmailStatus('idle') }, 3000)
      }
    })
  }

  async function handleSaveNextAction() {
    if (nextActionSaving) return
    setNextActionSaving(true)
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('leads') as any).update({
      next_action: nextAction || null,
      next_action_date: nextActionDate || null,
    }).eq('id', lead.id)
    setNextActionSaving(false)
    setNextActionSaved(true)
    setTimeout(() => setNextActionSaved(false), 2000)
  }

  async function handleSaveBudget(raw: string) {
    if (budgetSaving) return
    const num = raw === '' ? null : Number(raw)
    if (raw !== '' && isNaN(num as number)) return
    setBudgetSaving(true)
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('leads') as any).update({ budget_estimate: num }).eq('id', lead.id)
    setBudgetSaving(false)
    setBudgetEditing(false)
  }

  async function handleSaveWaMessage() {
    if (waMessageSaving) return
    setWaMessageSaving(true)
    const supabase = createClient()
    await supabase.from('leads').update({ wa_message: waMessage || null }).eq('id', lead.id)
    setWaMessageSaving(false)
    setWaMessageSaved(true)
    setTimeout(() => setWaMessageSaved(false), 2000)
  }

  async function handleSourceChange(newSource: Lead['source']) {
    if (sourceSaving) return
    setSourceValue(newSource)
    setSourceSaving(true)
    const supabase = createClient()
    await supabase.from('leads').update({ source: newSource }).eq('id', lead.id)
    setSourceSaving(false)
  }

  async function handleAssignedChange(value: string) {
    if (assignedSaving) return
    setAssignedSaving(true)
    const supabase = createClient()
    await supabase.from('leads').update({ assigned_to: value.trim() || null }).eq('id', lead.id)
    setAssignedSaving(false)
  }

  // ── WA template ────────────────────────────────────────────────────────────

  function getPortfolioLink(_category: string): string {
    return 'xicofilms.com'
  }

  function getWaTemplate(): string {
    const biz = lead.company ?? lead.name
    const category = (lead.project_type ?? '').toLowerCase()
    const portfolio = getPortfolioLink(category)
    const variant = parseInt(lead.id.replace(/-/g, '').charAt(0), 16) % 3

    let hook = ''
    if (category.includes('hotel') || category.includes('hospedaje') || category.includes('cabana') || category.includes('resort')) {
      hook = `Boutique properties like ${biz} deserve visuals that actually do them justice — great photos and video can make a real difference in bookings.`
    } else if (category.includes('restaurante') || category.includes('café') || category.includes('bar') || category.includes('cocina') || category.includes('kitchen') || category.includes('pizza') || category.includes('cafe')) {
      hook = `The food and atmosphere at ${biz} are exactly the kind of thing that drives traffic when captured right.`
    } else if (category.includes('tour') || category.includes('buceo') || category.includes('snorkel') || category.includes('sailing') || category.includes('diving') || category.includes('fishing') || category.includes('pesca')) {
      hook = `The experiences you offer at ${biz} are exactly the kind of thing that performs incredibly well with strong visuals — action content like this goes a long way on social.`
    } else if (category.includes('spa') || category.includes('yoga') || category.includes('wellness') || category.includes('bienestar') || category.includes('massage')) {
      hook = `${biz} has the kind of calm, beautiful energy that makes for incredible content — the sort of thing that converts browsers into bookings.`
    } else if (category.includes('real estate') || category.includes('realty')) {
      hook = `High-quality visuals are everything in real estate — we'd love to help ${biz} stand out with content that actually sells.`
    } else {
      hook = `We came across ${biz} and honestly see a lot of potential for strong visual content that could really move the needle for you.`
    }

    const delivers = `What we can deliver:\n• A revamped, high-converting website (demo ready to show you!)\n• Professional photo & video — fully edited, ready to post\n• Social media content package\n• Fast turnaround`

    if (variant === 0) {
      return `Hi! My name is Emi — I'm part of XICO Films, a production company focused on high-impact visual content.\n\n${hook}\n\nWe loved it so much that we actually took the initiative to build a custom web demo for ${biz}, showing how a refreshed site paired with professional content could look.\n\nWe'll be on the island May 16–21, which makes it the perfect window to capture fresh footage on-site. We're completely flexible — open to a collaboration or a standard package, whatever fits best.\n\n${delivers}\n\nWould you be open to a quick chat? I'd love to send you the demo link before the trip.\n\n— Emi | XICO Films\n${portfolio}`
    }
    if (variant === 1) {
      return `Hi! I'm Emi from XICO Films — we specialize in high-impact content for businesses like yours.\n\n${hook}\n\nWe're heading to Caye Caulker May 16–21 and we went ahead and built a web demo specifically for ${biz} — a real look at what a refreshed website and fresh content could do for you.\n\nWe're flexible on how we structure it — a collaboration, a package, whatever works on your end.\n\n${delivers}\n\nMind if I shoot you the demo link? It takes about 2 minutes to look at and gives you a real feel for what we're talking about.\n\n— Emi | XICO Films\n${portfolio}`
    }
    return `Hi! Emi here, from XICO Films.\n\n${hook}\n\nWe'll be in Caye Caulker May 16–21 and we took the time to build a demo for ${biz} — a preview of what a fresh website and professional content could look like for you specifically.\n\nHappy to make it work however is easiest — collaboration, package, open to ideas.\n\n${delivers}\n\nCan I send you the link?\n\n— Emi | XICO Films\n${portfolio}`
  }

  function handleCopyWa() {
    navigator.clipboard.writeText(waMessage || getWaTemplate()).then(() => {
      setWaCopied(true)
      setTimeout(() => setWaCopied(false), 2000)
    })
  }

  function handleOpenWa() {
    const text = waMessage || getWaTemplate()
    const phone = lead.phone?.replace(/\D/g, '') ?? ''
    const encoded = encodeURIComponent(text)
    const url = phone
      ? `https://web.whatsapp.com/send?phone=${phone}&text=${encoded}`
      : `https://web.whatsapp.com/send?text=${encoded}`
    window.location.href = url
  }

  // ── Computed ───────────────────────────────────────────────────────────────

  const diasSinContacto = useMemo((): { days: number; color: string } => {
    const ref = localLastContacted ?? lead.created_at
    const days = Math.floor((now - new Date(ref).getTime()) / 86400000)
    const color = days > 14 ? 'var(--dash-danger)' : days > 7 ? 'var(--dash-warning)' : T.text3
    return { days, color }
  }, [localLastContacted, lead.created_at, now])

  function getNextActionDateColor(): string {
    if (!nextActionDate) return T.text1
    const diffDays = Math.ceil((new Date(nextActionDate + 'T00:00:00').getTime() - new Date(now).setHours(0,0,0,0)) / 86400000)
    if (diffDays < 0) return 'var(--dash-danger)'
    if (diffDays <= 2) return 'var(--dash-warning)'
    return 'var(--dash-success)'
  }

  // ── Styles helper ──────────────────────────────────────────────────────────

  const inputStyle: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    background: T.surf2,
    border: `1px solid ${T.border}`,
    borderRadius: 10,
    color: T.text1,
    fontFamily: T.font,
    fontSize: 14,
    padding: '11px 14px',
    outline: 'none',
    transition: 'border-color 0.15s',
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        .ldm-input:focus { border-color: var(--dash-accent) !important; }
        .ldm-input::placeholder { color: var(--dash-text-tertiary); }
        .ldm-textarea:focus { border-color: var(--dash-accent) !important; outline: none; }
        .ldm-textarea::placeholder { color: var(--dash-text-tertiary); }
        .ldm-select:focus { outline: none; border-color: var(--dash-accent) !important; }
        .ldm-act-tab:hover { background: var(--dash-surface-3) !important; }
        .ldm-status-btn:hover { opacity: 0.85 !important; }
        .ldm-ghost:hover { background: var(--dash-surface-2) !important; color: var(--dash-text-primary) !important; }
        .ldm-copy-wa:hover { opacity: 0.8 !important; }
      `}</style>

      <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}>

        {/* Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
        />

        {/* Panel */}
        <motion.div
          ref={panelRef}
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 32, stiffness: 320 }}
          style={{
            position: 'fixed', right: 0, top: 0, bottom: 0,
            width: 'min(540px, 100vw)',
            background: T.surf1,
            borderLeft: `1px solid ${T.border}`,
            display: 'flex',
            flexDirection: 'column',
            fontFamily: T.font,
            boxShadow: 'var(--dash-shadow-xl)',
          }}
        >

          {/* ================================================================ */}
          {/* HEADER — fixed, non-scrolling                                    */}
          {/* ================================================================ */}
          <div style={{ flexShrink: 0, borderBottom: `1px solid ${T.border}` }}>

            {/* Row 1: Name + close */}
            <div style={{
              padding: '20px 20px 0 24px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 style={{
                  margin: 0,
                  fontFamily: T.font,
                  fontSize: 22,
                  fontWeight: 700,
                  color: T.text1,
                  letterSpacing: '-0.03em',
                  lineHeight: 1.15,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {lead.name}
                </h2>
                {(lead.company || lead.project_type) && (
                  <p style={{
                    margin: '3px 0 0',
                    fontFamily: T.font,
                    fontSize: 13,
                    color: T.text2,
                    letterSpacing: '-0.01em',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {[lead.company, lead.project_type].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                style={{
                  flexShrink: 0,
                  marginTop: 2,
                  width: 32, height: 32,
                  borderRadius: 8,
                  background: T.surf2,
                  border: `1px solid ${T.border}`,
                  color: T.text2,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.15s, color 0.15s',
                }}
                onMouseEnter={(e) => {
                  const b = e.currentTarget as HTMLButtonElement
                  b.style.background = T.surf3
                  b.style.color = T.text1
                }}
                onMouseLeave={(e) => {
                  const b = e.currentTarget as HTMLButtonElement
                  b.style.background = T.surf2
                  b.style.color = T.text2
                }}
              >
                <X size={14} strokeWidth={2} />
              </button>
            </div>

            {/* Row 2: Meta tags */}
            <div style={{ padding: '10px 24px 0', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <LeadScoreBadge lead={lead} />
              {diasSinContacto.days > 7 && (
                <span style={{
                  fontFamily: T.font,
                  fontSize: 11,
                  fontWeight: 600,
                  color: diasSinContacto.color,
                  background: `${diasSinContacto.color}22`,
                  borderRadius: 10,
                  padding: '3px 9px',
                }}>
                  {diasSinContacto.days}d sin contacto
                </span>
              )}
              {statusPending && (
                <span style={{ fontFamily: T.font, fontSize: 11, color: T.text3 }}>Guardando...</span>
              )}
              {globalError && (
                <span style={{ fontFamily: T.font, fontSize: 11, color: T.danger }}>{globalError}</span>
              )}
            </div>

            {/* Row 3: Status stepper */}
            <div style={{ padding: '14px 24px 0' }}>
              <div style={{ display: 'flex', gap: 3 }}>
                {ALL_STATUSES.map((s) => {
                  const active = s === currentStatus
                  const color = STATUS_COLORS[s]
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleStatusClick(s)}
                      disabled={statusPending}
                      className="ldm-status-btn"
                      style={{
                        flex: 1,
                        padding: '7px 4px',
                        borderRadius: 8,
                        border: active ? `1px solid ${color}` : `1px solid transparent`,
                        background: active ? `${color}28` : T.surf2,
                        color: active ? color : T.text3,
                        fontFamily: T.font,
                        fontSize: 11,
                        fontWeight: active ? 700 : 500,
                        cursor: statusPending ? 'not-allowed' : 'pointer',
                        transition: 'all 0.15s',
                        letterSpacing: '-0.01em',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {STATUS_LABELS[s]}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Row 4: Contact action buttons */}
            <div style={{ padding: '12px 24px 16px', display: 'flex', gap: 8 }}>
              {/* WhatsApp */}
              {lead.phone && (
                <button
                  type="button"
                  onClick={handleOpenWa}
                  style={{
                    flex: 1,
                    height: 44,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 7,
                    background: '#25D366',
                    color: '#fff',
                    borderRadius: 11,
                    fontFamily: T.font,
                    fontSize: 13,
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'opacity 0.15s',
                    boxShadow: '0 2px 8px rgba(37,211,102,0.30)',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.85' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
                >
                  <MessageCircle size={15} strokeWidth={2} />
                  WhatsApp
                </button>
              )}

              {/* Email */}
              {lead.email && (
                <a
                  href={`mailto:${lead.email}`}
                  style={{
                    flex: 1,
                    height: 44,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 7,
                    background: T.surf2,
                    border: `1px solid ${T.border}`,
                    color: T.text1,
                    borderRadius: 11,
                    fontFamily: T.font,
                    fontSize: 13,
                    fontWeight: 600,
                    textDecoration: 'none',
                    transition: 'background 0.15s',
                    boxShadow: 'var(--dash-highlight)',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = T.surf3 }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = T.surf2 }}
                >
                  <Mail size={15} strokeWidth={1.8} />
                  Email
                </a>
              )}

              {/* Llamar */}
              {lead.phone && (
                <a
                  href={`tel:${lead.phone}`}
                  style={{
                    height: 44,
                    paddingInline: 16,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 7,
                    background: T.surf2,
                    border: `1px solid ${T.border}`,
                    color: T.text2,
                    borderRadius: 11,
                    fontFamily: T.font,
                    fontSize: 13,
                    fontWeight: 500,
                    textDecoration: 'none',
                    transition: 'background 0.15s, color 0.15s',
                    boxShadow: 'var(--dash-highlight)',
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = T.surf3; (e.currentTarget as HTMLAnchorElement).style.color = T.text1 }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = T.surf2; (e.currentTarget as HTMLAnchorElement).style.color = T.text2 }}
                >
                  <Phone size={14} strokeWidth={1.8} />
                </a>
              )}
            </div>

            {/* Client type picker */}
            <div style={{ padding: '0 24px 16px' }}>
              <ClientTypePicker
                leadId={lead.id}
                initialSelected={leadClientTypes}
                allTypes={allClientTypes}
                onTypesChange={(types) => {
                  setLeadClientTypes(types)
                  setAllClientTypes((prev) => {
                    const ids = new Set(prev.map((t) => t.id))
                    const newOnes = types.filter((t) => !ids.has(t.id))
                    return newOnes.length ? [...prev, ...newOnes] : prev
                  })
                }}
              />
            </div>
          </div>

          {/* ================================================================ */}
          {/* SCROLLABLE BODY                                                  */}
          {/* ================================================================ */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

            {/* ── MENSAJE WHATSAPP ─────────────────────────────────────────── */}
            <div style={{ padding: '20px 24px 0' }}>
              <div style={{
                background: T.surf2,
                border: `1px solid ${T.border}`,
                borderRadius: 14,
                overflow: 'hidden',
                boxShadow: 'var(--dash-highlight)',
              }}>
                <div style={{
                  padding: '12px 16px',
                  borderBottom: `1px solid ${T.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <MessageCircle size={13} strokeWidth={2} color="#25D366" />
                    <span style={{
                      fontFamily: T.font,
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: '0.07em',
                      textTransform: 'uppercase',
                      color: T.text3,
                    }}>
                      Mensaje WhatsApp
                    </span>
                  </div>
                  {!waMessage && (
                    <button
                      type="button"
                      onClick={() => setWaMessage(getWaTemplate())}
                      style={{
                        fontFamily: T.font, fontSize: 11, fontWeight: 600,
                        color: 'var(--dash-accent)', background: 'transparent',
                        border: 'none', cursor: 'pointer', padding: '2px 6px',
                        borderRadius: 6,
                      }}
                    >
                      Generar automático
                    </button>
                  )}
                </div>
                <textarea
                  value={waMessage}
                  onChange={(e) => setWaMessage(e.target.value)}
                  placeholder="Escribe o genera el mensaje para este lead..."
                  rows={8}
                  className="ldm-textarea"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: 0,
                    color: T.text1,
                    fontFamily: T.font,
                    fontSize: 12,
                    padding: '14px 16px',
                    outline: 'none',
                    resize: 'none',
                    lineHeight: 1.65,
                    display: 'block',
                  }}
                />
                <div style={{
                  display: 'flex',
                  gap: 8,
                  padding: '10px 14px',
                  borderTop: `1px solid ${T.border}`,
                  background: T.surf3,
                }}>
                  <button
                    type="button"
                    onClick={handleCopyWa}
                    className="ldm-copy-wa"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '7px 14px',
                      borderRadius: 8,
                      border: `1px solid ${T.border}`,
                      background: waCopied ? 'rgba(48,209,88,0.12)' : 'transparent',
                      color: waCopied ? '#30D158' : T.text2,
                      fontFamily: T.font, fontSize: 12, fontWeight: 600,
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    {waCopied ? <Check size={12} /> : <Copy size={12} />}
                    {waCopied ? 'Copiado' : 'Copiar'}
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveWaMessage}
                    disabled={waMessageSaving}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '7px 14px',
                      borderRadius: 8,
                      border: `1px solid ${T.border}`,
                      background: waMessageSaved ? 'rgba(48,209,88,0.12)' : 'transparent',
                      color: waMessageSaved ? '#30D158' : T.text2,
                      fontFamily: T.font, fontSize: 12, fontWeight: 600,
                      cursor: waMessageSaving ? 'not-allowed' : 'pointer',
                      opacity: waMessageSaving ? 0.6 : 1,
                      transition: 'all 0.15s',
                    }}
                  >
                    {waMessageSaved ? <Check size={12} /> : null}
                    {waMessageSaving ? 'Guardando...' : waMessageSaved ? 'Guardado' : 'Guardar'}
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenWa}
                    style={{
                      flex: 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                      padding: '7px 16px',
                      borderRadius: 8,
                      border: 'none',
                      background: '#25D366',
                      color: '#fff',
                      fontFamily: T.font, fontSize: 12, fontWeight: 700,
                      cursor: 'pointer', transition: 'opacity 0.15s',
                      boxShadow: '0 2px 6px rgba(37,211,102,0.30)',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.85' }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
                  >
                    <MessageCircle size={13} strokeWidth={2} />
                    {lead.phone ? 'Abrir WhatsApp Web' : 'Sin teléfono'}
                  </button>
                </div>
              </div>
            </div>

            {/* ── REGISTRAR ACTIVIDAD ─────────────────────────────────────── */}
            <div style={{ padding: '20px 24px 0' }}>
              <p style={{
                margin: '0 0 12px',
                fontFamily: T.font,
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
                color: T.text3,
              }}>
                Registrar
              </p>

              {/* Activity type tabs — big icon + label */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                {ACTIVITY_TYPES.map((t) => {
                  const active = activityType === t
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setActivityType(t)}
                      className="ldm-act-tab"
                      style={{
                        flex: 1,
                        height: 58,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 5,
                        borderRadius: 11,
                        border: active ? `1px solid var(--dash-accent)` : `1px solid ${T.border}`,
                        background: active ? 'color-mix(in srgb, var(--dash-accent) 12%, transparent)' : T.surf2,
                        color: active ? 'var(--dash-accent)' : T.text2,
                        fontFamily: T.font,
                        fontSize: 10,
                        fontWeight: active ? 700 : 500,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        boxShadow: active ? `0 0 0 3px color-mix(in srgb, var(--dash-accent) 12%, transparent)` : 'var(--dash-highlight)',
                      }}
                    >
                      {ACTIVITY_ICONS_LG[t]}
                      {ACTIVITY_TYPE_LABELS[t]}
                    </button>
                  )
                })}
              </div>

              {/* WA tab content */}
              {activityType === 'whatsapp' && (
                <div style={{ marginBottom: 14 }}>
                  <p style={{ margin: '0 0 8px', fontFamily: T.font, fontSize: 12, color: T.text3 }}>
                    El mensaje de arriba se enviará al abrir WhatsApp.
                  </p>
                  <p style={{ margin: '0 0 8px', fontFamily: T.font, fontSize: 12, color: T.text3 }}>
                    Agregar nota sobre este contacto (opcional):
                  </p>
                </div>
              )}

              {/* Email compose */}
              {activityType === 'email' && !lead.email && (
                <div style={{
                  padding: '14px 16px',
                  borderRadius: 12,
                  background: T.surf2,
                  border: `1px solid ${T.border}`,
                  marginBottom: 14,
                }}>
                  <p style={{ margin: 0, fontFamily: T.font, fontSize: 13, color: T.text3 }}>
                    Este lead no tiene email registrado.
                  </p>
                </div>
              )}

              {activityType === 'email' && lead.email && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                  <p style={{ margin: 0, fontFamily: T.font, fontSize: 12, color: T.text3 }}>
                    Enviando a: <strong style={{ color: T.text2 }}>{lead.email}</strong>
                  </p>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder="Asunto del email"
                    className="ldm-input"
                    style={inputStyle}
                  />
                  <textarea
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    placeholder="Escribe tu mensaje..."
                    rows={4}
                    className="ldm-textarea"
                    style={{ ...inputStyle, resize: 'none', lineHeight: 1.5 }}
                  />
                  {emailStatus === 'success' && (
                    <p style={{ margin: 0, fontFamily: T.font, fontSize: 13, color: 'var(--dash-success)', fontWeight: 600 }}>
                      Email enviado correctamente
                    </p>
                  )}
                  {(emailStatus === 'error' || (emailStatus === 'idle' && emailError)) && emailError && (
                    <p style={{ margin: 0, fontFamily: T.font, fontSize: 13, color: T.danger }}>{emailError}</p>
                  )}
                </div>
              )}

              {/* Textarea for note/call/meeting (also WA optional note) */}
              {(activityType !== 'email' || !lead.email) && (
                <textarea
                  value={activityContent}
                  onChange={(e) => setActivityContent(e.target.value)}
                  placeholder={
                    activityType === 'whatsapp' ? 'Ej: Envié el mensaje inicial, quedamos de hablar el jueves...'
                    : activityType === 'call' ? 'Ej: Llamé, contestó. Interesado en el paquete de fotos...'
                    : activityType === 'meeting' ? 'Ej: Reunión en la cafetería, presenté el portafolio...'
                    : 'Escribe una nota sobre este lead...'
                  }
                  rows={3}
                  className="ldm-textarea"
                  style={{ ...inputStyle, resize: 'none', lineHeight: 1.5, marginBottom: 10 }}
                />
              )}

              {activityError && (
                <p style={{ margin: '0 0 10px', fontFamily: T.font, fontSize: 13, color: T.danger }}>
                  {activityError}
                </p>
              )}

              {/* Save button */}
              {activityType === 'email' && lead.email ? (
                <button
                  type="button"
                  onClick={handleSendEmail}
                  disabled={emailPending || emailStatus === 'success'}
                  style={{
                    width: '100%', height: 44,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    background: 'var(--dash-accent)',
                    backgroundImage: 'linear-gradient(180deg, color-mix(in srgb, var(--dash-accent) 80%, white) 0%, var(--dash-accent) 100%)',
                    color: '#fff',
                    border: 'none', borderRadius: 11,
                    fontFamily: T.font, fontSize: 14, fontWeight: 700,
                    cursor: emailPending || emailStatus === 'success' ? 'not-allowed' : 'pointer',
                    opacity: emailPending || emailStatus === 'success' ? 0.6 : 1,
                    transition: 'opacity 0.15s',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.18)',
                  }}
                >
                  <Mail size={15} strokeWidth={2} />
                  {emailPending ? 'Enviando...' : 'Enviar email'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleAddActivity}
                  disabled={activityPending}
                  style={{
                    width: '100%', height: 44,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    background: 'var(--dash-accent)',
                    backgroundImage: 'linear-gradient(180deg, color-mix(in srgb, var(--dash-accent) 80%, white) 0%, var(--dash-accent) 100%)',
                    color: '#fff',
                    border: 'none', borderRadius: 11,
                    fontFamily: T.font, fontSize: 14, fontWeight: 700,
                    cursor: activityPending ? 'not-allowed' : 'pointer',
                    opacity: activityPending ? 0.6 : 1,
                    transition: 'opacity 0.15s',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.18)',
                  }}
                >
                  {activityPending ? 'Guardando...' : 'Guardar'}
                </button>
              )}
            </div>

            {/* ── PRÓXIMA ACCIÓN ──────────────────────────────────────────── */}
            <div style={{ padding: '20px 24px 0' }}>
              <div style={{
                background: T.surf2,
                border: `1px solid ${T.border}`,
                borderRadius: 14,
                padding: 16,
                boxShadow: 'var(--dash-highlight)',
              }}>
                <p style={{
                  margin: '0 0 12px',
                  fontFamily: T.font,
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.07em',
                  textTransform: 'uppercase',
                  color: T.text3,
                }}>
                  Próxima acción
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input
                    type="text"
                    value={nextAction}
                    onChange={(e) => setNextAction(e.target.value)}
                    placeholder="¿Qué hay que hacer?"
                    className="ldm-input"
                    style={{ ...inputStyle, background: T.surf1 }}
                  />
                  <input
                    type="date"
                    value={nextActionDate}
                    onChange={(e) => setNextActionDate(e.target.value)}
                    className="ldm-input"
                    style={{
                      ...inputStyle,
                      background: T.surf1,
                      color: nextActionDate ? getNextActionDateColor() : T.text2,
                      colorScheme: 'dark',
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleSaveNextAction}
                    disabled={nextActionSaving}
                    style={{
                      height: 40,
                      borderRadius: 10,
                      border: `1px solid ${T.border}`,
                      background: nextActionSaved ? 'rgba(48,209,88,0.12)' : T.surf1,
                      color: nextActionSaved ? 'var(--dash-success)' : T.text1,
                      fontFamily: T.font, fontSize: 13, fontWeight: 600,
                      cursor: nextActionSaving ? 'not-allowed' : 'pointer',
                      opacity: nextActionSaving ? 0.6 : 1,
                      transition: 'all 0.2s',
                      boxShadow: 'var(--dash-highlight)',
                    }}
                  >
                    {nextActionSaving ? 'Guardando...' : nextActionSaved ? 'Guardado' : 'Guardar acción'}
                  </button>
                </div>
              </div>
            </div>

            {/* ── ACTIVIDAD FEED ──────────────────────────────────────────── */}
            <div style={{ padding: '20px 24px 0' }}>
              <p style={{
                margin: '0 0 14px',
                fontFamily: T.font,
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
                color: T.text3,
              }}>
                Actividad
              </p>

              {activitiesLoading ? (
                <p style={{ fontFamily: T.font, fontSize: 13, color: T.text3, margin: 0 }}>Cargando...</p>
              ) : activities.length === 0 ? (
                <p style={{ fontFamily: T.font, fontSize: 13, color: T.text3, margin: 0 }}>Sin actividad registrada.</p>
              ) : (
                <div style={{ position: 'relative', paddingLeft: 20 }}>
                  <div style={{
                    position: 'absolute', left: 3, top: 8, bottom: 8, width: 1,
                    background: T.border,
                  }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {activities.map((act, idx) => (
                      <motion.div
                        key={act.id}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.03, duration: 0.18 }}
                        style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 3 }}
                      >
                        <div style={{
                          position: 'absolute', left: -21, top: 5,
                          width: 7, height: 7, borderRadius: '50%',
                          background: T.text3,
                        }} />
                        <span title={formatDateTime(act.created_at)} style={{ fontFamily: T.font, fontSize: 11, color: T.text3, cursor: 'default' }}>
                          {formatRelativeTime(act.created_at)}
                        </span>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          fontFamily: T.font, fontSize: 12, color: T.text2, fontWeight: 500,
                        }}>
                          {ACTIVITY_ICONS[act.type]}
                          {ACTIVITY_TYPE_LABELS[act.type]}
                        </span>
                        <p style={{ margin: 0, fontFamily: T.font, fontSize: 13, color: T.text1, lineHeight: 1.5, wordBreak: 'break-word' }}>
                          {act.content}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── ACCORDIONS ─────────────────────────────────────────────── */}
            <div style={{ marginTop: 20 }}>

              {/* Detalles del lead */}
              <Accordion label="Detalles del lead">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                  {/* 2-col grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px' }}>
                    {lead.email && (
                      <div>
                        <p style={{ margin: '0 0 4px', fontFamily: T.font, fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: T.text3 }}>Email</p>
                        <a href={`mailto:${lead.email}`} style={{ fontFamily: T.font, fontSize: 13, color: T.accent, textDecoration: 'none', wordBreak: 'break-all' }}>{lead.email}</a>
                      </div>
                    )}
                    {lead.phone && (
                      <div>
                        <p style={{ margin: '0 0 4px', fontFamily: T.font, fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: T.text3 }}>Teléfono</p>
                        <a href={`tel:${lead.phone}`} style={{ fontFamily: T.font, fontSize: 13, color: T.text1, textDecoration: 'none' }}>{lead.phone}</a>
                      </div>
                    )}
                    {lead.budget_range && (
                      <div>
                        <p style={{ margin: '0 0 4px', fontFamily: T.font, fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: T.text3 }}>Presupuesto</p>
                        <span style={{ fontFamily: T.font, fontSize: 13, color: T.text1 }}>{lead.budget_range}</span>
                      </div>
                    )}
                    <div>
                      <p style={{ margin: '0 0 4px', fontFamily: T.font, fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: T.text3 }}>Fuente</p>
                      <select
                        value={sourceValue}
                        disabled={sourceSaving}
                        onChange={(e) => handleSourceChange(e.target.value as Lead['source'])}
                        className="ldm-select"
                        style={{
                          fontFamily: T.font, fontSize: 13, color: T.text1,
                          background: T.surf2, border: `1px solid ${T.border}`,
                          borderRadius: 8, padding: '5px 8px',
                          cursor: sourceSaving ? 'not-allowed' : 'pointer',
                          opacity: sourceSaving ? 0.6 : 1,
                          outline: 'none', width: '100%', colorScheme: 'dark',
                        }}
                      >
                        {(Object.keys(SOURCE_LABELS) as Lead['source'][]).map((k) => (
                          <option key={k} value={k}>{SOURCE_LABELS[k]}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <p style={{ margin: '0 0 4px', fontFamily: T.font, fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: T.text3 }}>Asignado a</p>
                      <input
                        type="text"
                        value={assignedTo}
                        disabled={assignedSaving}
                        onChange={(e) => setAssignedTo(e.target.value)}
                        onBlur={() => handleAssignedChange(assignedTo)}
                        onKeyDown={(e) => { if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur() }}
                        placeholder="Sin asignar"
                        className="ldm-input"
                        style={{ ...inputStyle, padding: '5px 8px', fontSize: 13, borderRadius: 8, opacity: assignedSaving ? 0.6 : 1 }}
                      />
                    </div>
                    <div>
                      <p style={{ margin: '0 0 4px', fontFamily: T.font, fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: T.text3 }}>Presupuesto estimado</p>
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
                          className="ldm-input"
                          style={{ ...inputStyle, padding: '5px 8px', fontSize: 13, borderRadius: 8 }}
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setBudgetEditing(true)}
                          style={{
                            background: 'transparent', border: 'none', padding: 0,
                            fontFamily: T.font, fontSize: 13, color: T.text1,
                            cursor: 'pointer', textAlign: 'left',
                          }}
                        >
                          {budgetValue !== '' ? `$${Number(budgetValue).toLocaleString('es-MX')} MXN` : '— Agregar'}
                        </button>
                      )}
                    </div>
                    <div>
                      <p style={{ margin: '0 0 4px', fontFamily: T.font, fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: T.text3 }}>Último contacto</p>
                      <span style={{ fontFamily: T.font, fontSize: 13, color: T.text1 }}>
                        {localLastContacted ? formatDate(localLastContacted) : 'Sin contacto'}
                      </span>
                    </div>
                    {lead.expected_close_date && (
                      <div>
                        <p style={{ margin: '0 0 4px', fontFamily: T.font, fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: T.text3 }}>Cierre estimado</p>
                        <span style={{ fontFamily: T.font, fontSize: 13, color: T.text1 }}>{formatDate(lead.expected_close_date)}</span>
                      </div>
                    )}
                    <div>
                      <p style={{ margin: '0 0 4px', fontFamily: T.font, fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: T.text3 }}>Creado</p>
                      <span style={{ fontFamily: T.font, fontSize: 13, color: T.text2 }}>{formatDate(lead.created_at)}</span>
                    </div>
                  </div>

                  {/* Notes */}
                  {lead.notes && (
                    <div>
                      <p style={{ margin: '0 0 6px', fontFamily: T.font, fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: T.text3 }}>Notas</p>
                      <div style={{
                        fontFamily: T.font, fontSize: 13, color: T.text1,
                        background: T.surf2, border: `1px solid ${T.border}`,
                        borderRadius: 10, padding: '10px 14px',
                        whiteSpace: 'pre-wrap', lineHeight: 1.6,
                        boxShadow: 'var(--dash-highlight)',
                      }}>
                        {lead.notes}
                      </div>
                    </div>
                  )}
                </div>
              </Accordion>

              {/* Lead Score */}
              <Accordion label="Lead Score">
                <LeadScoreBreakdown lead={lead} />
              </Accordion>

              {/* Acciones */}
              <Accordion label="Acciones" danger>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

                  {/* Convert to client */}
                  {!lead.converted_to_client_id && (
                    convertConfirm ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <p style={{ margin: 0, fontFamily: T.font, fontSize: 13, color: T.text1, fontWeight: 500 }}>
                          ¿Convertir este lead a cliente?
                        </p>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            type="button"
                            onClick={handleConvert}
                            disabled={convertPending}
                            style={{
                              flex: 1, height: 38, borderRadius: 9, border: `1px solid rgba(48,209,88,0.4)`,
                              background: 'rgba(48,209,88,0.1)', color: 'var(--dash-success)',
                              fontFamily: T.font, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                              opacity: convertPending ? 0.6 : 1, transition: 'all 0.15s',
                            }}
                          >
                            {convertPending ? 'Procesando...' : 'Confirmar'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConvertConfirm(false)}
                            className="ldm-ghost"
                            style={{
                              height: 38, paddingInline: 14, borderRadius: 9, border: `1px solid ${T.border}`,
                              background: 'transparent', color: T.text2,
                              fontFamily: T.font, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s',
                            }}
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleConvert}
                        style={{
                          height: 40, borderRadius: 10, border: `1px solid rgba(48,209,88,0.3)`,
                          background: 'rgba(48,209,88,0.06)', color: 'var(--dash-success)',
                          fontFamily: T.font, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(48,209,88,0.14)' }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(48,209,88,0.06)' }}
                      >
                        Convertir a cliente
                      </button>
                    )
                  )}

                  {lead.converted_to_client_id && (
                    <p style={{ margin: 0, fontFamily: T.font, fontSize: 13, color: 'var(--dash-success)', fontWeight: 500 }}>
                      Ya convertido a cliente.
                    </p>
                  )}

                  {/* Delete */}
                  {deleteConfirm ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <p style={{ margin: 0, fontFamily: T.font, fontSize: 13, color: T.text1, fontWeight: 500 }}>
                        Esto no se puede deshacer. ¿Eliminar lead?
                      </p>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          onClick={handleDelete}
                          disabled={deletePending}
                          style={{
                            flex: 1, height: 38, borderRadius: 9, border: `1px solid ${T.danger}`,
                            background: 'rgba(255,69,58,0.1)', color: T.danger,
                            fontFamily: T.font, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                            opacity: deletePending ? 0.6 : 1, transition: 'all 0.15s',
                          }}
                        >
                          {deletePending ? 'Eliminando...' : 'Sí, eliminar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirm(false)}
                          className="ldm-ghost"
                          style={{
                            height: 38, paddingInline: 14, borderRadius: 9, border: `1px solid ${T.border}`,
                            background: 'transparent', color: T.text2,
                            fontFamily: T.font, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s',
                          }}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleDelete}
                      style={{
                        height: 40, borderRadius: 10, border: `1px solid rgba(255,69,58,0.25)`,
                        background: 'transparent', color: T.danger,
                        fontFamily: T.font, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,69,58,0.08)' }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                    >
                      Eliminar lead
                    </button>
                  )}
                </div>
              </Accordion>
            </div>

            {/* Bottom spacer */}
            <div style={{ height: 40, flexShrink: 0 }} />
          </div>
        </motion.div>
      </div>
    </>
  )
}
