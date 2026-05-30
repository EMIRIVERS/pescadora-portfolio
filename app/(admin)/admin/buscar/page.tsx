import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import type { ProjectStatus, LeadStatus } from '@/lib/supabase/types'
import SearchInput from './SearchInput'

// ── Design tokens ─────────────────────────────────────────────────────────────

const T = {
  bg:            'var(--dash-bg)',
  surface1:      'var(--dash-surface-1)',
  surface2:      'var(--dash-surface-2)',
  surface3:      'var(--dash-surface-3)',
  border:        'var(--dash-border)',
  borderSubtle:  'var(--dash-surface-2)',
  borderHeader:  'var(--dash-border)',
  textPrimary:   'var(--dash-text-primary)',
  textSecondary: 'var(--dash-text-secondary)',
  textTertiary:  'var(--dash-text-tertiary)',
  accent:        '#0071E3',
  font:          "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
} as const

// ── Status configs ─────────────────────────────────────────────────────────────

const PROJECT_STATUS_CONFIG: Record<ProjectStatus, { label: string; color: string }> = {
  pre_production:  { label: 'Pre-produccion',  color: '#FF9F0A' },
  production:      { label: 'Produccion',       color: '#0071E3' },
  post_production: { label: 'Post-produccion',  color: '#BF5AF2' },
  delivered:       { label: 'Entregado',        color: '#30D158' },
}

const LEAD_STATUS_CONFIG: Record<LeadStatus, { label: string; color: string }> = {
  new:       { label: 'Nuevo',      color: '#0071E3' },
  contacted: { label: 'Contactado', color: '#FF9F0A' },
  qualified: { label: 'Calificado', color: '#BF5AF2' },
  proposal:  { label: 'Propuesta',  color: '#30D158' },
  won:       { label: 'Ganado',     color: '#30D158' },
  lost:      { label: 'Perdido',    color: '#FF453A' },
}

// ── Result row shapes ──────────────────────────────────────────────────────────

interface ProjectResult {
  id: string
  title: string
  status: ProjectStatus
  created_at: string
}

interface ClientResult {
  id: string
  name: string
  email: string | null
  company: string | null
}

interface LeadResult {
  id: string
  name: string
  email: string | null
  company: string | null
  status: LeadStatus
}

// ── Status pill ───────────────────────────────────────────────────────────────

function StatusPill({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: 600,
        background: `${color}26`,
        color,
        fontFamily: T.font,
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      {label}
    </span>
  )
}

// ── Chevron icon ──────────────────────────────────────────────────────────────

function ChevronIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 6h8M6 2l4 4-4 4" />
    </svg>
  )
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function ResultSection({
  title,
  count,
  children,
}: {
  title: string
  count: number
  children: React.ReactNode
}) {
  return (
    <div style={{ marginBottom: '28px' }}>
      <p
        style={{
          fontSize: '11px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
          color: T.textTertiary,
          margin: '0 0 10px 0',
          fontFamily: T.font,
        }}
      >
        {title} ({count})
      </p>
      <div
        style={{
          background: T.surface1,
          borderRadius: '14px',
          overflow: 'hidden',
        }}
      >
        {children}
      </div>
    </div>
  )
}

// ── Date formatting ───────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', {
    day:   '2-digit',
    month: 'short',
    year:  'numeric',
  })
}

// ── Page ──────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{ q?: string }>
}

export default async function AdminBuscarPage({ searchParams }: PageProps) {
  const { q: rawQ } = await searchParams
  const q = rawQ?.trim() ?? ''

  let projects: ProjectResult[] = []
  let clients: ClientResult[] = []
  let leads: LeadResult[] = []
  let searched = false

  if (q.length > 0) {
    searched = true
    const supabase = createServiceClient()
    // Strip PostgREST structural metacharacters so `q` cannot inject extra
    // filters into the `.or()` expressions below.
    const safeQ = q.replace(/[,()]/g, ' ')

    const [projectsRes, clientsRes, leadsRes] = await Promise.all([
      supabase
        .from('projects')
        .select('id, title, status, created_at')
        .ilike('title', `%${safeQ}%`)
        .limit(10),
      supabase
        .from('clients')
        .select('id, name, email, company')
        .or(`name.ilike.%${safeQ}%,email.ilike.%${safeQ}%,company.ilike.%${safeQ}%`)
        .limit(10),
      supabase
        .from('leads')
        .select('id, name, email, company, status')
        .or(`name.ilike.%${safeQ}%,email.ilike.%${safeQ}%`)
        .limit(10),
    ])

    projects = (projectsRes.data ?? []) as ProjectResult[]
    clients  = (clientsRes.data ?? [])  as ClientResult[]
    leads    = (leadsRes.data ?? [])    as LeadResult[]
  }

  const totalResults = projects.length + clients.length + leads.length
  const hasResults   = totalResults > 0

  return (
    <>
      <style>{`
        .result-row { transition: background 0.1s ease; }
        .result-row:hover { background: var(--dash-surface-2) !important; }
        .result-link { color: var(--dash-text-primary); text-decoration: none; display: flex; align-items: center; gap: 12px; padding: 14px 20px; width: 100%; }
        .result-arrow { color: var(--dash-text-tertiary); transition: color 0.15s; flex-shrink: 0; }
        .result-row:hover .result-arrow { color: var(--dash-text-primary) !important; }
      `}</style>

      <div
        style={{
          padding: '60px 32px',
          background: T.bg,
          minHeight: '100vh',
          fontFamily: T.font,
        }}
      >
        {/* ── Centered container ── */}
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>

          {/* Header */}
          <div style={{ marginBottom: '32px', textAlign: 'center' }}>
            <h1
              style={{
                fontSize: '34px',
                fontWeight: 700,
                color: T.textPrimary,
                letterSpacing: '-0.03em',
                margin: '0 0 6px 0',
                lineHeight: 1.1,
              }}
            >
              Buscar
            </h1>
            <p
              style={{
                fontSize: '14px',
                color: T.textSecondary,
                margin: 0,
              }}
            >
              Proyectos, clientes y leads en un solo lugar
            </p>
          </div>

          {/* Search input — client component with 300 ms debounce */}
          <div style={{ marginBottom: '48px' }}>
            <SearchInput defaultValue={q} />
          </div>

          {/* ── States ── */}

          {/* No query yet */}
          {!searched && (
            <div
              style={{
                textAlign: 'center',
                padding: '60px 20px',
              }}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '16px',
                  background: T.surface1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={T.textTertiary}
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
              </div>
              <p style={{ fontSize: '15px', color: T.textSecondary, margin: '0 0 6px 0', fontWeight: 500 }}>
                Escribe algo para comenzar
              </p>
              <p style={{ fontSize: '13px', color: T.textTertiary, margin: 0 }}>
                Busca por nombre, email o empresa
              </p>
            </div>
          )}

          {/* Searched but no results */}
          {searched && !hasResults && (
            <div
              style={{
                textAlign: 'center',
                padding: '64px 24px',
                background: T.surface1,
                borderRadius: '18px',
                border: `1px solid ${T.borderSubtle}`,
              }}
            >
              {/* Icon container */}
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '16px',
                  background: T.surface2,
                  border: `1px solid ${T.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px',
                }}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={T.textTertiary}
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                  <path d="M8.5 8.5l5 5M13.5 8.5l-5 5" />
                </svg>
              </div>

              {/* Headline */}
              <p
                style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: T.textPrimary,
                  margin: '0 0 8px 0',
                  letterSpacing: '-0.01em',
                }}
              >
                Sin resultados para{' '}
                <span style={{ color: T.textSecondary }}>&ldquo;{q}&rdquo;</span>
              </p>

              {/* Suggestions */}
              <p
                style={{
                  fontSize: '13px',
                  color: T.textTertiary,
                  margin: '0 0 20px 0',
                  lineHeight: 1.5,
                }}
              >
                Revisa la ortografia o prueba con un termino mas corto.
              </p>

              {/* Hint pills */}
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  justifyContent: 'center',
                  flexWrap: 'wrap',
                }}
              >
                {['nombre', 'email', 'empresa'].map((hint) => (
                  <span
                    key={hint}
                    style={{
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: 500,
                      background: T.surface2,
                      border: `1px solid ${T.border}`,
                      color: T.textTertiary,
                      fontFamily: T.font,
                    }}
                  >
                    Busca por {hint}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Results */}
          {searched && hasResults && (
            <div>
              {/* Summary */}
              <p
                style={{
                  fontSize: '13px',
                  color: T.textSecondary,
                  margin: '0 0 24px 0',
                }}
              >
                {totalResults} resultado{totalResults !== 1 ? 's' : ''} para &ldquo;{q}&rdquo;
              </p>

              {/* ── Proyectos ── */}
              {projects.length > 0 && (
                <ResultSection title="Proyectos" count={projects.length}>
                  {projects.map((project, idx) => {
                    const { label, color } = PROJECT_STATUS_CONFIG[project.status]
                    return (
                      <div
                        key={project.id}
                        className="result-row"
                        style={{
                          borderBottom:
                            idx < projects.length - 1
                              ? `1px solid ${T.borderSubtle}`
                              : undefined,
                        }}
                      >
                        <Link
                          href={`/admin/projects/${project.id}`}
                          className="result-link"
                        >
                          {/* Icon */}
                          <span
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              background: T.surface2,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke={T.textSecondary}
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <rect x="2" y="3" width="20" height="14" rx="2" />
                              <path d="M8 21h8M12 17v4" />
                            </svg>
                          </span>

                          {/* Text */}
                          <span style={{ flex: 1, minWidth: 0 }}>
                            <span
                              style={{
                                display: 'block',
                                fontSize: '14px',
                                fontWeight: 600,
                                color: T.textPrimary,
                                letterSpacing: '-0.01em',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {project.title}
                            </span>
                            <span
                              style={{
                                display: 'block',
                                fontSize: '12px',
                                color: T.textTertiary,
                                marginTop: '2px',
                              }}
                            >
                              {formatDate(project.created_at)}
                            </span>
                          </span>

                          <StatusPill label={label} color={color} />
                          <span className="result-arrow"><ChevronIcon /></span>
                        </Link>
                      </div>
                    )
                  })}
                </ResultSection>
              )}

              {/* ── Clientes ── */}
              {clients.length > 0 && (
                <ResultSection title="Clientes" count={clients.length}>
                  {clients.map((client, idx) => (
                    <div
                      key={client.id}
                      className="result-row"
                      style={{
                        borderBottom:
                          idx < clients.length - 1
                            ? `1px solid ${T.borderSubtle}`
                            : undefined,
                      }}
                    >
                      <Link
                        href={`/admin/clients/${client.id}`}
                        className="result-link"
                      >
                        {/* Avatar placeholder */}
                        <span
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: T.surface3,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            fontSize: '12px',
                            fontWeight: 700,
                            color: T.textSecondary,
                            letterSpacing: '-0.01em',
                          }}
                        >
                          {client.name.charAt(0).toUpperCase()}
                        </span>

                        {/* Text */}
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span
                            style={{
                              display: 'block',
                              fontSize: '14px',
                              fontWeight: 600,
                              color: T.textPrimary,
                              letterSpacing: '-0.01em',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {client.name}
                          </span>
                          <span
                            style={{
                              display: 'block',
                              fontSize: '12px',
                              color: T.textTertiary,
                              marginTop: '2px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {[client.email, client.company].filter(Boolean).join(' · ')}
                          </span>
                        </span>

                        <span className="result-arrow"><ChevronIcon /></span>
                      </Link>
                    </div>
                  ))}
                </ResultSection>
              )}

              {/* ── Leads ── */}
              {leads.length > 0 && (
                <ResultSection title="Leads" count={leads.length}>
                  {leads.map((lead, idx) => {
                    const { label, color } = LEAD_STATUS_CONFIG[lead.status]
                    return (
                      <div
                        key={lead.id}
                        className="result-row"
                        style={{
                          borderBottom:
                            idx < leads.length - 1
                              ? `1px solid ${T.borderSubtle}`
                              : undefined,
                        }}
                      >
                        <Link
                          href="/admin/leads"
                          className="result-link"
                        >
                          {/* Icon */}
                          <span
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              background: T.surface2,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke={T.textSecondary}
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                              <circle cx="12" cy="7" r="4" />
                            </svg>
                          </span>

                          {/* Text */}
                          <span style={{ flex: 1, minWidth: 0 }}>
                            <span
                              style={{
                                display: 'block',
                                fontSize: '14px',
                                fontWeight: 600,
                                color: T.textPrimary,
                                letterSpacing: '-0.01em',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {lead.name}
                            </span>
                            <span
                              style={{
                                display: 'block',
                                fontSize: '12px',
                                color: T.textTertiary,
                                marginTop: '2px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {[lead.email, lead.company].filter(Boolean).join(' · ')}
                            </span>
                          </span>

                          <StatusPill label={label} color={color} />
                          <span className="result-arrow"><ChevronIcon /></span>
                        </Link>
                      </div>
                    )
                  })}
                </ResultSection>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
