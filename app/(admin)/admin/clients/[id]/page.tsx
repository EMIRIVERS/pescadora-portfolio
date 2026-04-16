import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import type { Client, ProjectStatus, LeadStatus } from '@/lib/supabase/types'
import { LinkClientButton } from '@/components/admin/clients/link-client-button'

// ── Design tokens ──────────────────────────────────────────────────────────────

const SF = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif"

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

// ── Types ─────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ id: string }>
}

interface ProjectRow {
  id: string
  title: string
  status: ProjectStatus
  start_date: string | null
  end_date: string | null
  budget: number | null
  currency: string | null
}

interface LeadRow {
  id: string
  name: string
  project_type: string | null
  created_at: string
  status: LeadStatus
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function avatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  }
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length]
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

interface StatusStyleResult {
  color: string
  backgroundColor: string
  border: string
}

function statusStyle(status: ProjectStatus): StatusStyleResult {
  if (status === 'delivered') {
    return { color: '#30D158', backgroundColor: 'rgba(48,209,88,0.1)', border: '1px solid rgba(48,209,88,0.2)' }
  }
  if (status === 'post_production') {
    return { color: '#BF5AF2', backgroundColor: 'rgba(191,90,242,0.1)', border: '1px solid rgba(191,90,242,0.2)' }
  }
  if (status === 'production') {
    return { color: '#0071E3', backgroundColor: 'rgba(0,113,227,0.1)', border: '1px solid rgba(0,113,227,0.2)' }
  }
  return { color: '#FF9F0A', backgroundColor: 'rgba(255,159,10,0.1)', border: '1px solid rgba(255,159,10,0.2)' }
}

const STATUS_LABELS: Record<ProjectStatus, string> = {
  pre_production: 'Pre-produccion',
  production: 'Produccion',
  post_production: 'Post-produccion',
  delivered: 'Entregado',
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ClientDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = createServiceClient()

  const [
    { data: clientData },
    { data: projectsData },
    { data: leadsData },
  ] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from('clients').select('*').eq('id', id).single(),
    supabase
      .from('projects')
      .select('id, title, status, start_date, end_date, budget, currency')
      .eq('client_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('leads')
      .select('id, name, project_type, created_at, status')
      .eq('converted_to_client_id', id),
  ])

  if (!clientData) {
    notFound()
  }

  const client = clientData as Client & { phone?: string | null; notes?: string | null }
  const projects: ProjectRow[] = (projectsData ?? []) as unknown as ProjectRow[]
  const leads: LeadRow[] = (leadsData ?? []) as LeadRow[]

  const color = avatarColor(client.name)

  // Compute stats
  const totalProjects = projects.length
  const activeProjects = projects.filter((p) => p.status !== 'delivered').length
  const deliveredProjects = projects.filter((p) => p.status === 'delivered').length
  const totalBudget = projects.reduce((sum, p) => sum + (p.budget ?? 0), 0)

  // Determine default currency from first project that has one
  const defaultCurrency = projects.find((p) => p.currency)?.currency ?? 'MXN'

  const hasConvertedLead = leads.length > 0

  return (
    <>
      <style>{`
        .cd-back-link { color: #86868B; transition: color 0.15s; text-decoration: none; }
        .cd-back-link:hover { color: #F5F5F7 !important; }
        .cd-edit-btn { background-color: #0071E3; transition: background-color 0.15s; }
        .cd-edit-btn:hover { background-color: #0077ED !important; }
        .cd-project-row { background-color: #111111; border: 1px solid rgba(255,255,255,0.06); transition: background-color 0.15s, border-color 0.15s; }
        .cd-project-row:hover { background-color: #1C1C1E !important; border-color: rgba(255,255,255,0.1) !important; }
        .cd-project-link { color: #F5F5F7; text-decoration: none; }
        .cd-project-link:hover { color: #0071E3 !important; }
        .cd-email-link { color: #0071E3; text-decoration: none; }
        .cd-email-link:hover { text-decoration: underline; }
        .cd-lead-row { background-color: #111111; border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 14px 16px; }
      `}</style>

      <div
        className="min-h-screen"
        style={{
          backgroundColor: '#000000',
          color: '#F5F5F7',
          fontFamily: SF,
        }}
      >
        {/* Sticky topbar */}
        <div
          className="sticky top-0 z-10 backdrop-blur-md"
          style={{
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            backgroundColor: 'rgba(0,0,0,0.85)',
          }}
        >
          <div
            style={{
              maxWidth: '900px',
              margin: '0 auto',
              padding: '0 24px',
              height: '56px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Link href="/admin/clients" className="cd-back-link" style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              &larr; Clientes
            </Link>
            <Link
              href={`/admin/clients/${id}/edit`}
              className="cd-edit-btn"
              style={{
                fontSize: '14px',
                fontWeight: 500,
                color: '#FFFFFF',
                borderRadius: '8px',
                padding: '7px 14px',
                textDecoration: 'none',
              }}
            >
              Editar cliente
            </Link>
          </div>
        </div>

        {/* Main content */}
        <div
          style={{
            maxWidth: '900px',
            margin: '0 auto',
            padding: '40px 24px 80px',
            display: 'flex',
            flexDirection: 'column',
            gap: '40px',
          }}
        >
          {/* Client header */}
          <section>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap' }}>
              {/* Avatar */}
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: `${color}22`,
                  border: `2px solid ${color}44`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    fontSize: '18px',
                    fontWeight: 700,
                    color,
                    letterSpacing: '-0.02em',
                  }}
                >
                  {initials(client.name)}
                </span>
              </div>

              {/* Name + meta */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <h1
                    style={{
                      fontSize: '28px',
                      fontWeight: 700,
                      color: '#F5F5F7',
                      letterSpacing: '-0.02em',
                      lineHeight: 1.1,
                      margin: 0,
                    }}
                  >
                    {client.name}
                  </h1>
                  {hasConvertedLead && (
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '3px 10px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#FF9F0A',
                        backgroundColor: 'rgba(255,159,10,0.1)',
                        border: '1px solid rgba(255,159,10,0.25)',
                        letterSpacing: '0.01em',
                      }}
                    >
                      Lead convertido
                    </span>
                  )}
                </div>

                <p
                  style={{
                    marginTop: '6px',
                    fontSize: '14px',
                    color: '#86868B',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {client.email && <>{client.email}</>}
                  {client.email && client.company && <span style={{ margin: '0 6px', color: '#3A3A3C' }}>·</span>}
                  {client.company && <>{client.company}</>}
                </p>

                <p
                  style={{
                    marginTop: '8px',
                    fontSize: '12px',
                    color: '#48484A',
                  }}
                >
                  Cliente desde: {formatDate(client.created_at)}
                </p>
              </div>
            </div>
          </section>

          {/* Stats cards */}
          <section>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '12px',
              }}
            >
              {[
                { label: 'Total proyectos', value: String(totalProjects) },
                { label: 'Proyectos activos', value: String(activeProjects) },
                { label: 'Entregados', value: String(deliveredProjects) },
                { label: 'Presupuesto total', value: totalBudget > 0 ? formatBudget(totalBudget, defaultCurrency) : '—' },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  style={{
                    backgroundColor: '#111111',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '12px',
                    padding: '16px 18px',
                  }}
                >
                  <p
                    style={{
                      fontSize: '11px',
                      fontWeight: 500,
                      color: '#48484A',
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
                      color: '#F5F5F7',
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

          {/* Projects section */}
          <section>
            <h2
              style={{
                fontSize: '18px',
                fontWeight: 600,
                color: '#F5F5F7',
                letterSpacing: '-0.01em',
                marginBottom: '16px',
              }}
            >
              Proyectos
            </h2>

            {projects.length === 0 ? (
              <div
                style={{
                  padding: '48px 20px',
                  textAlign: 'center',
                  backgroundColor: '#111111',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '16px',
                }}
              >
                <p style={{ fontSize: '14px', color: '#48484A' }}>
                  Este cliente no tiene proyectos todavia.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {projects.map((project) => {
                  const sStyle = statusStyle(project.status)
                  return (
                    <Link
                      key={project.id}
                      href={`/admin/projects/${project.id}`}
                      className="cd-project-row"
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
                          className="cd-project-link"
                          style={{
                            fontSize: '14px',
                            fontWeight: 500,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {project.title}
                        </p>
                        <p style={{ fontSize: '12px', color: '#48484A', marginTop: '3px' }}>
                          {formatDate(project.start_date)}
                          {project.end_date && (
                            <> &rarr; {formatDate(project.end_date)}</>
                          )}
                        </p>
                      </div>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '3px 10px',
                          borderRadius: '20px',
                          fontSize: '11px',
                          fontWeight: 500,
                          letterSpacing: '0.01em',
                          flexShrink: 0,
                          ...sStyle,
                        }}
                      >
                        {STATUS_LABELS[project.status]}
                      </span>
                    </Link>
                  )
                })}
              </div>
            )}
          </section>

          {/* Contact info */}
          <section>
            <h2
              style={{
                fontSize: '18px',
                fontWeight: 600,
                color: '#F5F5F7',
                letterSpacing: '-0.01em',
                marginBottom: '16px',
              }}
            >
              Informacion de contacto
            </h2>

            <div
              style={{
                backgroundColor: '#111111',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '16px',
                padding: '20px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              {/* Email */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                <span style={{ fontSize: '12px', color: '#48484A', fontWeight: 500, minWidth: '80px', paddingTop: '1px' }}>
                  Email
                </span>
                {client.email ? (
                  <a
                    href={`mailto:${client.email}`}
                    className="cd-email-link"
                    style={{ fontSize: '14px' }}
                  >
                    {client.email}
                  </a>
                ) : (
                  <span style={{ fontSize: '14px', color: '#3A3A3C' }}>Sin email</span>
                )}
              </div>

              {/* Company */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                <span style={{ fontSize: '12px', color: '#48484A', fontWeight: 500, minWidth: '80px', paddingTop: '1px' }}>
                  Empresa
                </span>
                <span style={{ fontSize: '14px', color: client.company ? '#F5F5F7' : '#3A3A3C' }}>
                  {client.company ?? 'Sin empresa'}
                </span>
              </div>

              {/* Phone */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                <span style={{ fontSize: '12px', color: '#48484A', fontWeight: 500, minWidth: '80px', paddingTop: '1px' }}>
                  Telefono
                </span>
                {client.phone ? (
                  <a href={`tel:${client.phone}`} className="cd-email-link" style={{ fontSize: '14px' }}>
                    {client.phone}
                  </a>
                ) : (
                  <span style={{ fontSize: '14px', color: '#3A3A3C' }}>Sin telefono</span>
                )}
              </div>

              {/* Notes */}
              {client.notes && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                  <span style={{ fontSize: '12px', color: '#48484A', fontWeight: 500, minWidth: '80px', paddingTop: '1px' }}>
                    Notas
                  </span>
                  <p style={{ fontSize: '14px', color: '#86868B', margin: 0, lineHeight: 1.5 }}>
                    {client.notes}
                  </p>
                </div>
              )}

              {/* Profile ID / Portal access */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                <span style={{ fontSize: '12px', color: '#48484A', fontWeight: 500, minWidth: '80px', paddingTop: '8px' }}>
                  Portal
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                  {client.profile_id ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '3px 10px',
                          borderRadius: '20px',
                          fontSize: '11px',
                          fontWeight: 600,
                          color: '#30D158',
                          backgroundColor: 'rgba(48,209,88,0.1)',
                          border: '1px solid rgba(48,209,88,0.25)',
                        }}
                      >
                        Tiene acceso
                      </span>
                      <span
                        style={{
                          fontSize: '12px',
                          color: '#48484A',
                          fontFamily: 'monospace',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '260px',
                        }}
                      >
                        {client.profile_id}
                      </span>
                    </div>
                  ) : (
                    <span style={{ fontSize: '14px', color: '#3A3A3C', paddingTop: '4px' }}>Sin acceso al portal</span>
                  )}
                  <LinkClientButton
                    clientId={client.id}
                    clientName={client.name}
                    currentProfileId={client.profile_id}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Related leads */}
          {leads.length > 0 && (
            <section>
              <h2
                style={{
                  fontSize: '18px',
                  fontWeight: 600,
                  color: '#F5F5F7',
                  letterSpacing: '-0.01em',
                  marginBottom: '16px',
                }}
              >
                Leads relacionados
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {leads.map((lead) => (
                  <div key={lead.id} className="cd-lead-row">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                      <div>
                        <p style={{ fontSize: '14px', fontWeight: 500, color: '#F5F5F7' }}>
                          {lead.name}
                        </p>
                        <p style={{ fontSize: '12px', color: '#48484A', marginTop: '3px' }}>
                          Convertido el {formatDate(lead.created_at)}
                          {lead.project_type && (
                            <> &middot; {lead.project_type}</>
                          )}
                        </p>
                      </div>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '3px 10px',
                          borderRadius: '20px',
                          fontSize: '11px',
                          fontWeight: 500,
                          color: '#30D158',
                          backgroundColor: 'rgba(48,209,88,0.1)',
                          border: '1px solid rgba(48,209,88,0.2)',
                          flexShrink: 0,
                        }}
                      >
                        {lead.status === 'won' ? 'Ganado' : lead.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  )
}
