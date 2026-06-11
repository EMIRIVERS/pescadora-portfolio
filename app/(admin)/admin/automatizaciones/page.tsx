import { createServiceClient } from '@/lib/supabase/server'
import { TestEmailForm } from './TestEmailForm'

// ─── Types ───────────────────────────────────────────────────────────────────
interface EmailLogRow {
  id: string
  to_email: string
  subject: string
  template_name: string | null
  sent_at: string
}

interface TriggerItem {
  event: string
  actions: string[]
  soon?: boolean
}

// ─── Data ────────────────────────────────────────────────────────────────────
const TRIGGERS: TriggerItem[] = [
  {
    event: 'Nuevo lead captado',
    actions: ['Email de bienvenida al lead', 'Notificacion al admin'],
  },
  {
    event: 'Lead calificado',
    actions: ['Notificacion al lead'],
  },
  {
    event: 'Propuesta enviada',
    actions: ['Notificacion al lead'],
  },
  {
    event: 'Lead convertido a cliente',
    actions: ['Email de kickoff al cliente'],
  },
  {
    event: 'Cambio de estado de proyecto',
    actions: ['Notifica al cliente'],
  },
  {
    event: 'Nuevo cliente creado',
    actions: ['Notificacion al admin'],
  },
  {
    event: 'Deadline proximo (< 7 dias)',
    actions: ['Recordatorio diario al equipo (cron 9am)'],
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function AutomatizacionesPage() {
  const supabase = createServiceClient()

  const apiKeyConfigured = Boolean(process.env.RESEND_API_KEY)
  const cronSecretConfigured = Boolean(process.env.CRON_SECRET)
  const publicUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  // Determine overall system status
  const systemStatus: 'active' | 'partial' | 'inactive' =
    apiKeyConfigured && cronSecretConfigured
      ? 'active'
      : apiKeyConfigured
        ? 'partial'
        : 'inactive'

  const statusColor =
    systemStatus === 'active' ? '#30D158' : systemStatus === 'partial' ? '#FF9F0A' : '#FF453A'
  const statusLabel =
    systemStatus === 'active' ? 'Operativo' : systemStatus === 'partial' ? 'Parcial' : 'Inactivo'
  const statusBg =
    systemStatus === 'active'
      ? 'rgba(48,209,88,0.1)'
      : systemStatus === 'partial'
        ? 'rgba(255,159,10,0.1)'
        : 'rgba(255,69,58,0.1)'

  let emailLogs: EmailLogRow[] = []
  try {
    const { data } = await supabase
      .from('email_log')
      .select('id, to_email, subject, template_name, sent_at')
      .order('sent_at', { ascending: false })
      .limit(20)
    emailLogs = (data ?? []) as EmailLogRow[]
  } catch {
    // tabla aun no migrada — se muestra lista vacia
  }

  return (
    <>
      <style>{`
        .auto-trigger-card:hover { border-color: rgba(255,255,255,0.12) !important; }
        .auto-env-chip { font-family: 'SF Mono', SFMono-Regular, ui-monospace, monospace; }
        .auto-form-link:hover { color: #409CFF !important; }
        .auto-table-row:hover td { background: rgba(255,255,255,0.02); }
        .auto-test-input:focus { border-color: rgba(0,113,227,0.5) !important; }
      `}</style>

      <div
        style={{
          minHeight: '100vh',
          backgroundColor: 'var(--dash-bg)',
          color: 'var(--dash-text-primary)',
          fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
          padding: '40px 32px',
          maxWidth: '960px',
          margin: '0 auto',
        }}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div style={{ marginBottom: '36px' }}>
          <h1
            style={{
              fontSize: '28px',
              fontWeight: 700,
              color: 'var(--dash-text-primary)',
              letterSpacing: '-0.01em',
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            Automatizaciones
          </h1>
          <p
            style={{
              fontSize: '15px',
              color: 'var(--dash-text-secondary)',
              margin: '8px 0 0',
            }}
          >
            Pipeline de emails y seguimiento automatico
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* ── Estado del sistema ─────────────────────────────────────────── */}
          <section
            style={{
              backgroundColor: 'var(--dash-surface-1)',
              border: '1px solid var(--dash-border)',
              borderRadius: '12px',
              padding: '20px',
            }}
          >
            <h2
              style={{
                fontSize: '13px',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--dash-text-tertiary)',
                margin: '0 0 16px',
              }}
            >
              Estado del sistema
            </h2>

            {/* Overall status badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: statusColor,
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: '15px', fontWeight: 500, color: 'var(--dash-text-primary)' }}>
                {statusLabel}
              </span>
              <span
                style={{
                  fontSize: '12px',
                  color: statusColor,
                  backgroundColor: statusBg,
                  borderRadius: '6px',
                  padding: '2px 8px',
                }}
              >
                {systemStatus === 'active'
                  ? 'Todos los servicios activos'
                  : systemStatus === 'partial'
                    ? 'Configuracion incompleta'
                    : 'Accion requerida'}
              </span>
            </div>

            {/* Individual service rows */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                backgroundColor: 'var(--dash-surface-2)',
                border: '1px solid var(--dash-border)',
                borderRadius: '8px',
                padding: '14px 16px',
              }}
            >
              {/* Email (Resend) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    backgroundColor: apiKeyConfigured ? '#30D158' : '#FF453A',
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: '13px', color: 'var(--dash-text-primary)', flex: 1 }}>
                  Email (Resend)
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    color: apiKeyConfigured ? '#30D158' : '#FF453A',
                    fontFamily: "'SF Mono', SFMono-Regular, ui-monospace, monospace",
                  }}
                >
                  {apiKeyConfigured ? 'RESEND_API_KEY configurada' : 'RESEND_API_KEY faltante'}
                </span>
              </div>

              {/* Cron jobs */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    backgroundColor: cronSecretConfigured ? '#30D158' : '#FF453A',
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: '13px', color: 'var(--dash-text-primary)', flex: 1 }}>
                  Cron jobs
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    color: cronSecretConfigured ? '#30D158' : '#FF453A',
                    fontFamily: "'SF Mono', SFMono-Regular, ui-monospace, monospace",
                  }}
                >
                  {cronSecretConfigured ? 'CRON_SECRET configurada' : 'CRON_SECRET faltante'}
                </span>
              </div>
            </div>

            {!apiKeyConfigured && (
              <div
                style={{
                  backgroundColor: 'rgba(255,159,10,0.06)',
                  border: '1px solid rgba(255,159,10,0.15)',
                  borderRadius: '8px',
                  padding: '14px 16px',
                  marginTop: '14px',
                }}
              >
                <p style={{ fontSize: '13px', color: 'var(--dash-text-secondary)', margin: '0 0 10px' }}>
                  Agrega las siguientes variables de entorno en Vercel o en tu archivo{' '}
                  <span className="auto-env-chip" style={{ color: 'var(--dash-text-primary)', fontSize: '12px' }}>
                    .env.local
                  </span>
                  :
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {['RESEND_API_KEY', 'CRON_SECRET', 'ADMIN_EMAIL', 'EMAIL_FROM'].map((v) => (
                    <code
                      key={v}
                      className="auto-env-chip"
                      style={{
                        fontSize: '12px',
                        color: '#FF9F0A',
                        backgroundColor: 'rgba(255,159,10,0.08)',
                        borderRadius: '4px',
                        padding: '3px 8px',
                        display: 'inline-block',
                        width: 'fit-content',
                      }}
                    >
                      {v}=...
                    </code>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* ── Email de prueba ────────────────────────────────────────────── */}
          <section
            style={{
              backgroundColor: 'var(--dash-surface-1)',
              border: '1px solid var(--dash-border)',
              borderRadius: '12px',
              padding: '20px',
            }}
          >
            <h2
              style={{
                fontSize: '13px',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--dash-text-tertiary)',
                margin: '0 0 8px',
              }}
            >
              Probar configuracion de email
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--dash-text-secondary)', margin: '0 0 16px' }}>
              Envia un email de prueba para verificar que Resend esta configurado correctamente.
            </p>

            {!apiKeyConfigured ? (
              <div
                style={{
                  backgroundColor: 'rgba(255,159,10,0.06)',
                  border: '1px solid rgba(255,159,10,0.18)',
                  borderRadius: '8px',
                  padding: '12px 16px',
                }}
              >
                <p style={{ fontSize: '13px', color: '#FF9F0A', margin: 0 }}>
                  Configura RESEND_API_KEY en Vercel primero
                </p>
              </div>
            ) : null}

            <div style={{ marginTop: !apiKeyConfigured ? '14px' : '0' }}>
              <TestEmailForm disabled={!apiKeyConfigured} />
            </div>
          </section>

          {/* ── Triggers activos ───────────────────────────────────────────── */}
          <section>
            <h2
              style={{
                fontSize: '13px',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--dash-text-tertiary)',
                margin: '0 0 12px',
              }}
            >
              Triggers activos
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {TRIGGERS.map((t) => (
                <div
                  key={t.event}
                  className="auto-trigger-card"
                  style={{
                    backgroundColor: 'var(--dash-surface-1)',
                    border: '1px solid var(--dash-border)',
                    borderRadius: '12px',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '16px',
                    transition: 'border-color 0.15s ease',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--dash-text-primary)' }}>
                        {t.event}
                      </span>
                      {t.soon && (
                        <span
                          style={{
                            fontSize: '11px',
                            color: 'var(--dash-text-tertiary)',
                            backgroundColor: 'var(--dash-surface-2)',
                            borderRadius: '4px',
                            padding: '2px 6px',
                          }}
                        >
                          Proximamente
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {t.actions.map((a) => (
                        <span
                          key={a}
                          style={{
                            fontSize: '12px',
                            color: t.soon ? 'var(--dash-text-tertiary)' : 'var(--dash-text-secondary)',
                            backgroundColor: 'var(--dash-surface-2)',
                            borderRadius: '6px',
                            padding: '3px 8px',
                          }}
                        >
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: t.soon ? '#636366' : '#30D158',
                      flexShrink: 0,
                      marginTop: '4px',
                    }}
                  />
                </div>
              ))}
            </div>
          </section>

          {/* ── Formulario de cotizacion publica ───────────────────────────── */}
          <section
            style={{
              backgroundColor: 'var(--dash-surface-1)',
              border: '1px solid var(--dash-border)',
              borderRadius: '12px',
              padding: '20px',
            }}
          >
            <h2
              style={{
                fontSize: '13px',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--dash-text-tertiary)',
                margin: '0 0 16px',
              }}
            >
              Formulario de cotizacion publica
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
              <div>
                <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--dash-text-primary)', margin: '0 0 4px' }}>
                  Formulario en /cotiza
                </p>
                <p style={{ fontSize: '12px', color: '#30D158', margin: 0 }}>
                  Activo — Los leads llegan automaticamente al pipeline
                </p>
              </div>
              <a
                href={`${publicUrl}/cotiza`}
                target="_blank"
                rel="noopener noreferrer"
                className="auto-form-link"
                style={{
                  fontSize: '13px',
                  color: '#0071E3',
                  textDecoration: 'none',
                  flexShrink: 0,
                  transition: 'color 0.15s ease',
                }}
              >
                {publicUrl}/cotiza
              </a>
            </div>
          </section>

          {/* ── Ultimos emails enviados ────────────────────────────────────── */}
          <section>
            <h2
              style={{
                fontSize: '13px',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--dash-text-tertiary)',
                margin: '0 0 12px',
              }}
            >
              Ultimos emails enviados
            </h2>

            {emailLogs.length === 0 ? (
              <div
                style={{
                  backgroundColor: 'var(--dash-surface-1)',
                  border: '1px solid var(--dash-border)',
                  borderRadius: '12px',
                  padding: '40px 20px',
                  textAlign: 'center',
                }}
              >
                <p style={{ fontSize: '14px', color: 'var(--dash-text-tertiary)', margin: 0 }}>
                  Los emails enviados apareceran aqui
                </p>
              </div>
            ) : (
              <div
                style={{
                  backgroundColor: 'var(--dash-surface-1)',
                  border: '1px solid var(--dash-border)',
                  borderRadius: '12px',
                  overflow: 'hidden',
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr
                      style={{
                        borderBottom: '1px solid var(--dash-border)',
                        backgroundColor: 'rgba(255,255,255,0.02)',
                      }}
                    >
                      {['Destinatario', 'Asunto', 'Template', 'Enviado'].map((col) => (
                        <th
                          key={col}
                          style={{
                            padding: '10px 16px',
                            textAlign: 'left',
                            fontSize: '11px',
                            fontWeight: 600,
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                            color: 'var(--dash-text-tertiary)',
                          }}
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {emailLogs.map((log, i) => (
                      <tr
                        key={log.id}
                        className="auto-table-row"
                        style={{
                          borderTop: i > 0 ? '1px solid var(--dash-surface-2)' : undefined,
                        }}
                      >
                        <td style={{ padding: '10px 16px', fontSize: '13px', color: 'var(--dash-text-primary)' }}>
                          {log.to_email}
                        </td>
                        <td style={{ padding: '10px 16px', fontSize: '13px', color: 'var(--dash-text-secondary)' }}>
                          {log.subject}
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <code
                            style={{
                              fontFamily: "'SF Mono', SFMono-Regular, ui-monospace, monospace",
                              fontSize: '11px',
                              color: '#0071E3',
                              backgroundColor: 'rgba(0,113,227,0.1)',
                              borderRadius: '4px',
                              padding: '2px 6px',
                            }}
                          >
                            {log.template_name}
                          </code>
                        </td>
                        <td style={{ padding: '10px 16px', fontSize: '12px', color: 'var(--dash-text-tertiary)' }}>
                          {formatDateTime(log.sent_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ── Cron job ───────────────────────────────────────────────────── */}
          <section
            style={{
              backgroundColor: 'var(--dash-surface-1)',
              border: '1px solid var(--dash-border)',
              borderRadius: '12px',
              padding: '20px',
            }}
          >
            <h2
              style={{
                fontSize: '13px',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--dash-text-tertiary)',
                margin: '0 0 16px',
              }}
            >
              Cron job
            </h2>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: cronSecretConfigured ? '#30D158' : '#FF453A',
                  flexShrink: 0,
                  marginTop: '5px',
                }}
              />
              <div>
                <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--dash-text-primary)', margin: '0 0 4px' }}>
                  Recordatorios automaticos: todos los dias a las 9:00 AM
                </p>
                <p style={{ fontSize: '12px', color: 'var(--dash-text-tertiary)', margin: 0 }}>
                  Endpoint:{' '}
                  <code
                    style={{
                      fontFamily: "'SF Mono', SFMono-Regular, ui-monospace, monospace",
                      fontSize: '12px',
                      color: 'var(--dash-text-secondary)',
                    }}
                  >
                    /api/cron/reminders
                  </code>
                </p>
              </div>
            </div>
          </section>

        </div>
      </div>
    </>
  )
}
