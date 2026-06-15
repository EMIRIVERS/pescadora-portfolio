import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { resolvePortalClient, portalLink } from '@/lib/portal/preview'
import type { Profile, Client } from '@/lib/supabase/types'
import { PortalShell, BackLink, Masthead, SectionLabel, PORTAL } from '@/components/portal/ui'
import ProfileEditForm from './profile-edit-form'

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

interface ProfilePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const sp = await searchParams
  const ctx = await resolvePortalClient(sp)
  if (!ctx) redirect('/login')
  const { supabase, clientId, isAdminPreview } = ctx

  // Buscar el client row + el profile asociado. En preview admin, queremos
  // mostrar la info del cliente target (no la del admin).
  const { data: clientRow } = await supabase
    .from('clients')
    .select('id, name, company, profile_id')
    .eq('id', clientId)
    .single()

  const client = clientRow as (Pick<Client, 'id' | 'name' | 'company'> & { profile_id: string | null }) | null

  const profileLookupId = client?.profile_id ?? null
  const { data: profileRow } = profileLookupId
    ? await supabase
        .from('profiles')
        .select('id, full_name, email, is_admin_team, role')
        .eq('id', profileLookupId)
        .single()
    : { data: null }

  if (!profileRow) redirect('/login')

  const profile = profileRow as Pick<Profile, 'id' | 'full_name' | 'email' | 'is_admin_team' | 'role'>

  // Count linked projects
  const { count: projectCount } = client
    ? await supabase
        .from('projects')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', client.id)
    : { count: 0 }

  const displayEmail = profile.email ?? null

  return (
    <PortalShell maxWidth={720}>
      <BackLink href={portalLink('/portal', ctx)} label="Mis proyectos" />

      <Masthead
        title="Mi perfil"
        lead="Tu información personal y los datos de tu cuenta en XICO Films. Mantén tu nombre al día; el resto lo gestionamos por ti."
      />

      {/* ── 01 · Información personal ── */}
      <section style={{ marginBottom: 'clamp(2.5rem, 5vw, 3.5rem)' }}>
        <SectionLabel index="01" style={{ marginBottom: '1.4rem' }}>
          Información personal
        </SectionLabel>
        <div className="portal-card" style={{ borderRadius: '6px', padding: 'clamp(1.6rem, 3.5vw, 2.2rem)' }}>
          {isAdminPreview ? (
            <div>
              <p style={{ fontFamily: PORTAL.mono, fontSize: '0.62rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: PORTAL.muted, margin: '0 0 0.6rem' }}>
                Nombre completo
              </p>
              <p style={{ fontFamily: PORTAL.sans, fontSize: '1rem', color: PORTAL.cream, margin: 0 }}>
                {profile.full_name ?? '—'}
              </p>
              <p style={{ fontFamily: PORTAL.mono, fontSize: '0.62rem', letterSpacing: '0.08em', color: PORTAL.accent, margin: '1.1rem 0 0' }}>
                Edición deshabilitada en modo preview.
              </p>
            </div>
          ) : (
            <ProfileEditForm profileId={profile.id} initialFullName={profile.full_name} />
          )}
        </div>
      </section>

      {/* ── 02 · Cuenta ── */}
      <section style={{ marginBottom: 'clamp(2.5rem, 5vw, 3.5rem)' }}>
        <SectionLabel index="02" style={{ marginBottom: '1.4rem' }}>
          Cuenta
        </SectionLabel>
        <div className="portal-card" style={{ borderRadius: '6px', overflow: 'hidden' }}>
          <InfoRow label="Correo electrónico" value={displayEmail ?? '—'} />
          <div style={{ padding: '1.1rem clamp(1.6rem, 3.5vw, 2.2rem)', borderTop: `1px solid ${PORTAL.border}` }}>
            <p style={{ fontFamily: PORTAL.sans, fontSize: '0.82rem', lineHeight: 1.6, color: PORTAL.dim, margin: 0 }}>
              Para cambiar tu email escríbenos a{' '}
              <a href="mailto:hola@xicofilms.com" className="portal-textlink" style={{ color: PORTAL.accent }}>
                hola@xicofilms.com
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* ── 03 · Empresa ── */}
      {client && (
        <section style={{ marginBottom: 'clamp(2.5rem, 5vw, 3.5rem)' }}>
          <SectionLabel index="03" style={{ marginBottom: '1.4rem' }}>
            Empresa
          </SectionLabel>
          <div className="portal-card" style={{ borderRadius: '6px', overflow: 'hidden' }}>
            <InfoRow label="Nombre del cliente" value={client.name} />
            {client.company && <InfoRow label="Empresa" value={client.company} divided />}
          </div>
        </section>
      )}

      {/* ── 04 · Estadísticas ── */}
      <section>
        <SectionLabel index={client ? '04' : '03'} style={{ marginBottom: '1.4rem' }}>
          Estadísticas
        </SectionLabel>
        <div className="portal-card" style={{ borderRadius: '6px', padding: 'clamp(1.6rem, 3.5vw, 2.2rem)' }}>
          <div className="flex items-baseline justify-between gap-4">
            <span style={{ fontFamily: PORTAL.mono, fontSize: '0.62rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: PORTAL.muted }}>
              Proyectos vinculados
            </span>
            <span style={{ fontFamily: PORTAL.serif, fontWeight: 400, fontSize: 'clamp(1.8rem, 4vw, 2.4rem)', lineHeight: 1, color: PORTAL.cream }} className="tabular-nums">
              {projectCount ?? 0}
            </span>
          </div>
        </div>
      </section>
    </PortalShell>
  )
}

// ---------------------------------------------------------------------------
// Sub-components (server-only, purely presentational)
// ---------------------------------------------------------------------------

function InfoRow({ label, value, divided = false }: { label: string; value: ReactNode; divided?: boolean }) {
  return (
    <div
      className="flex items-center justify-between gap-4"
      style={{ padding: '1.2rem clamp(1.6rem, 3.5vw, 2.2rem)', borderTop: divided ? `1px solid ${PORTAL.border}` : undefined }}
    >
      <span style={{ fontFamily: PORTAL.mono, fontSize: '0.62rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: PORTAL.muted }}>
        {label}
      </span>
      <span className="truncate" style={{ fontFamily: PORTAL.sans, fontSize: '0.95rem', color: PORTAL.cream, textAlign: 'right', maxWidth: '20rem' }}>
        {value}
      </span>
    </div>
  )
}
