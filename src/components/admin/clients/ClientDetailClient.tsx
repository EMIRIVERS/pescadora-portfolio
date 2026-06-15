'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Pencil, Check, X } from 'lucide-react'
import { PROJECT_STATUS_STYLES } from '@/lib/status-colors'
import type { ProjectStatus, InvoiceStatus, LeadSource } from '@/lib/supabase/types'

// ── Design tokens ──────────────────────────────────────────────────────────────

const SF = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ClientDetailData {
  id: string
  name: string
  email: string | null
  company: string | null
  phone: string | null
  notes: string | null
  profile_id: string | null
  created_at: string
}

export interface ProjectDetail {
  id: string
  title: string
  status: ProjectStatus
  start_date: string | null
  end_date: string | null
  budget: number | null
  currency: string | null
}

export interface InvoiceDetail {
  id: string
  invoice_number: string
  amount: number
  currency: string
  status: InvoiceStatus
  issue_date: string
  due_date: string | null
  project_id: string | null
  projects: { title: string } | null
}

export interface LeadDetail {
  id: string
  name: string
  source: LeadSource
  notes: string | null
  created_at: string
  status: string
  project_type: string | null
}

type Tab = 'projects' | 'invoices' | 'leads'

// ── Constants ─────────────────────────────────────────────────────────────────

const AVATAR_PALETTE = [
  '#0071E3',
  '#30D158',
  '#FF9F0A',
  '#BF5AF2',
  '#FF453A',
  '#64D2FF',
  '#FFD60A',
] as const

const ACTIVE_STATUSES: ProjectStatus[] = ['pre_production', 'production', 'post_production']

const INVOICE_STATUS_STYLES: Record<string, { color: string; bg: string; label: string }> = {
  draft:     { color: 'var(--dash-text-secondary)', bg: 'rgba(134,134,139,0.12)', label: 'Borrador' },
  sent:      { color: '#0071E3', bg: 'rgba(0,113,227,0.12)',   label: 'Enviada' },
  paid:      { color: 'var(--dash-success)', bg: 'rgba(48,209,88,0.12)',   label: 'Pagada' },
  overdue:   { color: 'var(--dash-danger)', bg: 'rgba(255,69,58,0.12)',   label: 'Vencida' },
  cancelled: { color: 'var(--dash-text-tertiary)', bg: 'rgba(72,72,74,0.12)', label: 'Cancelada' },
}

const SOURCE_LABELS: Record<LeadSource, string> = {
  manual: 'Manual',
  referral: 'Referido',
  instagram: 'Instagram',
  web: 'Web',
  whatsapp: 'WhatsApp',
  other: 'Otro',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function avatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  }
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length]
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function formatDate(iso: string | null): string {
  if (!iso) return '\u2014'
  return new Date(iso).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatBudget(amount: number, currency: string | null): string {
  const c = currency ?? 'MXN'
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: c,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatLifetimeValue(total: number): string {
  if (total === 0) return '\u2014'
  if (total >= 1_000_000) return `$${(total / 1_000_000).toFixed(1)}M MXN`
  if (total >= 1_000) return `$${Math.round(total / 1_000)}k MXN`
  return `$${total.toLocaleString('es-MX')} MXN`
}

function statusStyle(status: ProjectStatus): { color: string; backgroundColor: string; border: string } {
  const s = PROJECT_STATUS_STYLES[status] ?? {
    color: 'var(--dash-text-secondary)',
    bg: 'rgba(134,134,139,0.1)',
    border: 'rgba(134,134,139,0.2)',
  }
  return { color: s.color, backgroundColor: s.bg, border: `1px solid ${s.border}` }
}

function statusLabel(status: ProjectStatus): string {
  return PROJECT_STATUS_STYLES[status]?.label ?? status
}

// ── Inline editable field ─────────────────────────────────────────────────────

interface EditableFieldProps {
  label: string
  value: string | null
  placeholder: string
  fieldName: 'name' | 'company' | 'email' | 'phone'
  onSave: (field: 'name' | 'company' | 'email' | 'phone', value: string) => void
  hrefPrefix?: string
}

function EditableField({ label, value, placeholder, fieldName, onSave, hrefPrefix }: EditableFieldProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? '')
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  function handleSave() {
    setError(null)
    const trimmed = draft.trim()
    if (fieldName === 'name' && !trimmed) {
      setError('El nombre no puede estar vacio.')
      return
    }
    onSave(fieldName, trimmed)
    setEditing(false)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') {
      setDraft(value ?? '')
      setEditing(false)
      setError(null)
    }
  }

  const displayValue = value ?? null

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
      <span
        style={{
          fontSize: '12px',
          color: 'var(--dash-text-tertiary)',
          fontWeight: 500,
          minWidth: '80px',
          paddingTop: editing ? '9px' : '1px',
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        {editing ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                ref={inputRef}
                type={fieldName === 'email' ? 'email' : 'text'}
                value={draft}
                onChange={(e) => { setDraft(e.target.value); setError(null) }}
                onKeyDown={handleKeyDown}
                style={{
                  flex: 1,
                  fontFamily: SF,
                  fontSize: '14px',
                  color: 'var(--dash-text-primary)',
                  backgroundColor: 'var(--dash-surface-3)',
                  border: error ? '1px solid rgba(255,69,58,0.6)' : '1px solid rgba(0,113,227,0.5)',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  outline: 'none',
                  boxShadow: error ? 'none' : '0 0 0 3px rgba(0,113,227,0.1)',
                }}
              />
              <button
                type="button"
                onClick={handleSave}
                title="Guardar"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '28px', height: '28px',
                  backgroundColor: '#0071E3', border: 'none', borderRadius: '6px',
                  cursor: 'pointer',
                  color: '#fff', flexShrink: 0,
                }}
              >
                <Check size={13} strokeWidth={2.5} />
              </button>
              <button
                type="button"
                onClick={() => { setDraft(value ?? ''); setEditing(false); setError(null) }}
                title="Cancelar"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '28px', height: '28px',
                  backgroundColor: 'var(--dash-border)', border: 'none', borderRadius: '6px',
                  cursor: 'pointer',
                  color: 'var(--dash-text-secondary)', flexShrink: 0,
                }}
              >
                <X size={13} strokeWidth={2.5} />
              </button>
            </div>
            {error && (
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--dash-danger)', fontFamily: SF }}>{error}</p>
            )}
          </div>
        ) : (
          <div
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            className="editable-row"
          >
            {displayValue ? (
              hrefPrefix ? (
                <a
                  href={`${hrefPrefix}${displayValue}`}
                  style={{ fontSize: '14px', color: '#0071E3', textDecoration: 'none' }}
                >
                  {displayValue}
                </a>
              ) : (
                <span style={{ fontSize: '14px', color: 'var(--dash-text-primary)' }}>
                  {displayValue}
                </span>
              )
            ) : (
              <span style={{ fontSize: '14px', color: 'var(--dash-text-tertiary)' }}>
                {placeholder}
              </span>
            )}
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="edit-pencil"
              title={`Editar ${label.toLowerCase()}`}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '22px', height: '22px',
                backgroundColor: 'transparent', border: 'none',
                borderRadius: '4px', cursor: 'pointer',
                color: 'var(--dash-text-tertiary)',
                opacity: 0.5,
                transition: 'opacity 0.1s',
              }}
            >
              <Pencil size={12} strokeWidth={2} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Active / Inactive status badge ────────────────────────────────────────────

interface StatusBadgeProps {
  isActive: boolean
}

function StatusBadge({ isActive }: StatusBadgeProps) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: '20px',
        fontSize: '11px',
        fontWeight: 600,
        letterSpacing: '0.01em',
        color: isActive ? 'var(--dash-success)' : 'var(--dash-text-tertiary)',
        backgroundColor: isActive ? 'rgba(48,209,88,0.1)' : 'rgba(72,72,74,0.12)',
        border: isActive ? '1px solid rgba(48,209,88,0.25)' : '1px solid rgba(72,72,74,0.25)',
      }}
    >
      {isActive ? 'Activo' : 'Inactivo'}
    </span>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

interface Props {
  client: ClientDetailData
  projects: ProjectDetail[]
  invoices: InvoiceDetail[]
  leads: LeadDetail[]
  onSaveField: (clientId: string, field: 'name' | 'company' | 'email' | 'phone', value: string) => Promise<{ error?: string }>
}

export default function ClientDetailClient({ client, projects, invoices, leads, onSaveField }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('projects')
  const [localClient, setLocalClient] = useState(client)

  const color = avatarColor(localClient.name)

  // Compute stats
  const totalProjects = projects.length
  const activeProjects = projects.filter((p) => ACTIVE_STATUSES.includes(p.status)).length
  const totalBudget = projects.reduce((s, p) => s + (p.budget ?? 0), 0)
  const defaultCurrency = projects.find((p) => p.currency)?.currency ?? 'MXN'
  const totalInvoiced = invoices.reduce((s, i) => s + i.amount, 0)
  const invoiceCurrency = invoices.find((i) => i.currency)?.currency ?? 'MXN'
  const isActive = activeProjects > 0

  function handleSave(field: 'name' | 'company' | 'email' | 'phone', value: string) {
    // Optimistic update
    setLocalClient((prev) => ({ ...prev, [field]: value || null }))
    void onSaveField(localClient.id, field, value)
  }

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'projects', label: 'Proyectos', count: projects.length },
    { id: 'invoices', label: 'Facturas', count: invoices.length },
    { id: 'leads', label: 'Leads', count: leads.length },
  ]

  return (
    <>
      <style>{`
        .cd2-back-link { color: var(--dash-text-secondary); transition: color 0.15s; text-decoration: none; }
        .cd2-back-link:hover { color: var(--dash-text-primary) !important; }
        .cd2-project-row { background-color: var(--dash-surface-1); border: 1px solid var(--dash-border); transition: background-color 0.15s, border-color 0.15s; cursor: pointer; }
        .cd2-project-row:hover { background-color: var(--dash-surface-2) !important; }
        .cd2-project-link { color: var(--dash-text-primary); text-decoration: none; }
        .cd2-project-link:hover { color: #0071E3 !important; }
        .editable-row:hover .edit-pencil { opacity: 1 !important; }
        .tab-btn { background: transparent; border: none; cursor: pointer; transition: color 0.15s, border-color 0.15s; }
      `}</style>

      <div
        style={{
          minHeight: '100vh',
          backgroundColor: 'var(--dash-bg)',
          color: 'var(--dash-text-primary)',
          fontFamily: SF,
        }}
      >
        {/* Topbar */}
        <div
          className="sticky top-0 z-10 backdrop-blur-md"
          style={{
            borderBottom: '1px solid var(--dash-border)',
            backgroundColor: 'var(--dash-surface-1)',
          }}
        >
          <div
            style={{
              maxWidth: '960px',
              margin: '0 auto',
              padding: '0 24px',
              height: '56px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <Link href="/admin/clients" className="cd2-back-link" style={{ fontSize: '14px' }}>
              &larr; Clientes
            </Link>
            <span style={{ color: 'var(--dash-border)', fontSize: '14px' }}>/</span>
            <span style={{ fontSize: '14px', color: 'var(--dash-text-primary)', fontWeight: 500, flex: 1 }}>
              {localClient.name}
            </span>
            <Link
              href={`/portal?as_client=${localClient.id}`}
              target="_blank"
              rel="noopener"
              style={{
                fontSize: '12px',
                fontWeight: 600,
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid var(--dash-border-strong)',
                background: 'var(--dash-surface-2)',
                color: 'var(--dash-text-primary)',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
              title="Abrir el portal de este cliente en una pestaña nueva (modo preview, solo lectura)"
            >
              Ver portal del cliente {'↗'}
            </Link>
          </div>
        </div>

        {/* Content */}
        <div
          style={{
            maxWidth: '960px',
            margin: '0 auto',
            padding: '40px 24px 80px',
            display: 'flex',
            flexDirection: 'column',
            gap: '36px',
          }}
        >
          {/* ── Client header ── */}
          <section style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap' }}>
            {/* Avatar */}
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: `${color}22`,
                border: `2px solid ${color}55`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: '20px', fontWeight: 700, color, letterSpacing: '-0.02em' }}>
                {initials(localClient.name)}
              </span>
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
                <h1
                  style={{
                    fontSize: '28px',
                    fontWeight: 700,
                    color: 'var(--dash-text-primary)',
                    letterSpacing: '-0.02em',
                    lineHeight: 1.1,
                    margin: 0,
                  }}
                >
                  {localClient.name}
                </h1>
                <StatusBadge isActive={isActive} />
                {leads.length > 0 && (
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '3px 10px',
                      borderRadius: '20px',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'var(--dash-warning)',
                      backgroundColor: 'rgba(255,159,10,0.1)',
                      border: '1px solid rgba(255,159,10,0.25)',
                      letterSpacing: '0.01em',
                    }}
                  >
                    Lead convertido
                  </span>
                )}
              </div>
              <p style={{ fontSize: '14px', color: 'var(--dash-text-secondary)', margin: '0 0 4px' }}>
                {localClient.company ?? <span style={{ color: 'var(--dash-text-tertiary)' }}>Sin empresa</span>}
                {localClient.company && localClient.email && (
                  <span style={{ margin: '0 6px', color: 'var(--dash-text-tertiary)' }}>·</span>
                )}
                {localClient.email && (
                  <a href={`mailto:${localClient.email}`} style={{ color: '#0071E3', textDecoration: 'none' }}>
                    {localClient.email}
                  </a>
                )}
              </p>
              <p style={{ fontSize: '12px', color: 'var(--dash-text-tertiary)', margin: 0 }}>
                Cliente desde {formatDate(localClient.created_at)}
              </p>
            </div>
          </section>

          {/* ── Stats row ── */}
          <section>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                gap: '12px',
              }}
            >
              {[
                { label: 'Total proyectos', value: String(totalProjects) },
                { label: 'Proyectos activos', value: String(activeProjects) },
                { label: 'Presupuesto total', value: totalBudget > 0 ? formatBudget(totalBudget, defaultCurrency) : '\u2014' },
                { label: 'Total facturado', value: totalInvoiced > 0 ? formatBudget(totalInvoiced, invoiceCurrency) : '\u2014' },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  style={{
                    backgroundColor: 'var(--dash-surface-1)',
                    border: '1px solid var(--dash-border)',
                    borderRadius: '12px',
                    padding: '16px 18px',
                  }}
                >
                  <p
                    style={{
                      fontSize: '11px',
                      fontWeight: 500,
                      color: 'var(--dash-text-tertiary)',
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      marginBottom: '8px',
                    }}
                  >
                    {label}
                  </p>
                  <p
                    style={{
                      fontSize: '22px',
                      fontWeight: 600,
                      color: 'var(--dash-text-primary)',
                      letterSpacing: '-0.02em',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* ── Inline editable contact info ── */}
          <section>
            <h2
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--dash-text-tertiary)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                marginBottom: '16px',
              }}
            >
              Informacion de contacto
            </h2>
            <div
              style={{
                backgroundColor: 'var(--dash-surface-1)',
                border: '1px solid var(--dash-border)',
                borderRadius: '16px',
                padding: '20px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              <EditableField
                label="Nombre"
                value={localClient.name}
                placeholder="Sin nombre"
                fieldName="name"
                onSave={handleSave}
              />
              <EditableField
                label="Empresa"
                value={localClient.company}
                placeholder="Sin empresa"
                fieldName="company"
                onSave={handleSave}
              />
              <EditableField
                label="Email"
                value={localClient.email}
                placeholder="Sin email"
                fieldName="email"
                onSave={handleSave}
                hrefPrefix="mailto:"
              />
              <EditableField
                label="Telefono"
                value={localClient.phone}
                placeholder="Sin telefono"
                fieldName="phone"
                onSave={handleSave}
                hrefPrefix="tel:"
              />
              {localClient.notes && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                  <span
                    style={{
                      fontSize: '12px',
                      color: 'var(--dash-text-tertiary)',
                      fontWeight: 500,
                      minWidth: '80px',
                      paddingTop: '1px',
                    }}
                  >
                    Notas
                  </span>
                  <p style={{ fontSize: '14px', color: 'var(--dash-text-secondary)', margin: 0, lineHeight: 1.5 }}>
                    {localClient.notes}
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* ── Tabs ── */}
          <section>
            {/* Tab bar */}
            <div
              style={{
                display: 'flex',
                gap: '2px',
                borderBottom: '1px solid var(--dash-border)',
                marginBottom: '20px',
              }}
            >
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className="tab-btn"
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    fontFamily: SF,
                    fontSize: '14px',
                    fontWeight: activeTab === tab.id ? 600 : 400,
                    color: activeTab === tab.id ? 'var(--dash-text-primary)' : 'var(--dash-text-secondary)',
                    padding: '8px 16px',
                    borderBottom: activeTab === tab.id ? '2px solid #0071E3' : '2px solid transparent',
                    marginBottom: '-1px',
                  }}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span
                      style={{
                        marginLeft: '6px',
                        fontSize: '11px',
                        fontWeight: 500,
                        color: activeTab === tab.id ? '#0071E3' : 'var(--dash-text-tertiary)',
                        backgroundColor: activeTab === tab.id ? 'rgba(0,113,227,0.1)' : 'rgba(134,134,139,0.12)',
                        borderRadius: '20px',
                        padding: '1px 7px',
                        display: 'inline-block',
                      }}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab: Projects */}
            {activeTab === 'projects' && (
              <div>
                {projects.length === 0 ? (
                  <EmptyState label="Este cliente no tiene proyectos todavia." />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {projects.map((project) => {
                      const sStyle = statusStyle(project.status)
                      return (
                        <Link
                          key={project.id}
                          href={`/admin/projects/${project.id}`}
                          className="cd2-project-row"
                          style={{
                            borderRadius: '12px',
                            padding: '14px 18px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '12px',
                            textDecoration: 'none',
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p
                              className="cd2-project-link"
                              style={{
                                fontSize: '14px',
                                fontWeight: 500,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                margin: 0,
                              }}
                            >
                              {project.title}
                            </p>
                            <p style={{ fontSize: '12px', color: 'var(--dash-text-tertiary)', margin: '3px 0 0' }}>
                              {formatDate(project.start_date)}
                              {project.end_date && <> &rarr; {formatDate(project.end_date)}</>}
                            </p>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                            {project.budget != null && project.budget > 0 && (
                              <span
                                style={{
                                  fontSize: '13px',
                                  fontWeight: 600,
                                  color: 'var(--dash-text-primary)',
                                  fontVariantNumeric: 'tabular-nums',
                                }}
                              >
                                {formatLifetimeValue(project.budget)}
                              </span>
                            )}
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '3px 10px',
                                borderRadius: '20px',
                                fontSize: '11px',
                                fontWeight: 500,
                                letterSpacing: '0.01em',
                                ...sStyle,
                              }}
                            >
                              {statusLabel(project.status)}
                            </span>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Tab: Invoices */}
            {activeTab === 'invoices' && (
              <div>
                {invoices.length === 0 ? (
                  <EmptyState label="Este cliente no tiene facturas todavia." />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {invoices.map((inv) => {
                      const s = INVOICE_STATUS_STYLES[inv.status] ?? INVOICE_STATUS_STYLES.draft
                      return (
                        <Link
                          key={inv.id}
                          href={`/admin/invoices/${inv.id}`}
                          className="cd2-project-row"
                          style={{
                            borderRadius: '12px',
                            padding: '14px 18px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '12px',
                            textDecoration: 'none',
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p
                              className="cd2-project-link"
                              style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}
                            >
                              {inv.invoice_number}
                            </p>
                            <p style={{ fontSize: '12px', color: 'var(--dash-text-tertiary)', margin: '3px 0 0' }}>
                              {inv.projects?.title ?? 'Sin proyecto'}
                              {inv.due_date && <> &middot; vence {formatDate(inv.due_date)}</>}
                            </p>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                            <span
                              style={{
                                fontSize: '14px',
                                fontWeight: 600,
                                color: 'var(--dash-text-primary)',
                                fontVariantNumeric: 'tabular-nums',
                              }}
                            >
                              {formatBudget(inv.amount, inv.currency)}
                            </span>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '3px 10px',
                                borderRadius: '20px',
                                fontSize: '11px',
                                fontWeight: 500,
                                color: s.color,
                                backgroundColor: s.bg,
                                border: `1px solid ${s.color}33`,
                              }}
                            >
                              {s.label}
                            </span>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Tab: Leads */}
            {activeTab === 'leads' && (
              <div>
                {leads.length === 0 ? (
                  <EmptyState label="Ninguna solicitud fue convertida en este cliente." />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {leads.map((lead) => (
                      <div
                        key={lead.id}
                        style={{
                          backgroundColor: 'var(--dash-surface-1)',
                          border: '1px solid var(--dash-border)',
                          borderRadius: '12px',
                          padding: '14px 18px',
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: '12px',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--dash-text-primary)', margin: 0 }}>
                            {lead.name}
                          </p>
                          <p style={{ fontSize: '12px', color: 'var(--dash-text-tertiary)', margin: '3px 0 0' }}>
                            Fuente: {SOURCE_LABELS[lead.source] ?? lead.source}
                            {lead.project_type && <> &middot; {lead.project_type}</>}
                            {' '}&middot; Convertido el {formatDate(lead.created_at)}
                          </p>
                          {lead.notes && (
                            <p
                              style={{
                                fontSize: '12px',
                                color: 'var(--dash-text-secondary)',
                                margin: '6px 0 0',
                                lineHeight: 1.5,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {lead.notes}
                            </p>
                          )}
                        </div>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 10px',
                            borderRadius: '20px',
                            fontSize: '11px',
                            fontWeight: 500,
                            color: 'var(--dash-success)',
                            backgroundColor: 'rgba(48,209,88,0.1)',
                            border: '1px solid rgba(48,209,88,0.2)',
                            flexShrink: 0,
                          }}
                        >
                          {lead.status === 'won' ? 'Ganado' : lead.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  )
}

// ── Empty state ────────────────────────────────────────────────────────────────

function EmptyState({ label }: { label: string }) {
  return (
    <div
      style={{
        padding: '48px 20px',
        textAlign: 'center',
        backgroundColor: 'var(--dash-surface-1)',
        border: '1px solid var(--dash-border)',
        borderRadius: '16px',
      }}
    >
      <p style={{ fontSize: '14px', color: 'var(--dash-text-tertiary)', margin: 0 }}>{label}</p>
    </div>
  )
}
