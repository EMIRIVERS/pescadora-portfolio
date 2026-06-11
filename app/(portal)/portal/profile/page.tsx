import { redirect } from 'next/navigation'
import Link from 'next/link'
import { resolvePortalClient, portalLink } from '@/lib/portal/preview'
import type { Profile, Client } from '@/lib/supabase/types'
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
    <main className="min-h-screen bg-zinc-950">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-12">
        {/* Back link */}
        <Link
          href={portalLink('/portal', ctx)}
          className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-white text-sm transition-colors mb-8"
        >
          <span>&larr;</span>
          <span>Mis proyectos</span>
        </Link>

        {/* Page header */}
        <div className="mb-10">
          <p className="text-zinc-500 text-xs uppercase tracking-widest mb-1">Portal de cliente</p>
          <h1 className="text-white text-2xl sm:text-3xl font-semibold">Mi perfil</h1>
        </div>

        {/* Edit form (deshabilitado en modo preview admin) */}
        <section className="mb-8">
          <SectionLabel>Informacion personal</SectionLabel>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            {isAdminPreview ? (
              <div>
                <p className="text-zinc-400 text-xs uppercase tracking-wider mb-2">Nombre completo</p>
                <p className="text-zinc-200 text-sm">{profile.full_name ?? '—'}</p>
                <p className="text-amber-500 text-xs mt-3">Edición deshabilitada en modo preview.</p>
              </div>
            ) : (
              <ProfileEditForm profileId={profile.id} initialFullName={profile.full_name} />
            )}
          </div>
        </section>

        {/* Account info */}
        <section className="mb-8">
          <SectionLabel>Cuenta</SectionLabel>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl divide-y divide-zinc-800">
            <InfoRow label="Correo electronico" value={displayEmail ?? '—'} />
            <div className="px-6 py-4">
              <p className="text-zinc-600 text-xs">
                Para cambiar tu email contacta al equipo en{' '}
                <a
                  href="mailto:hola@xicofilms.com"
                  className="text-sky-500 hover:text-sky-400 transition-colors"
                >
                  hola@xicofilms.com
                </a>
              </p>
            </div>
          </div>
        </section>

        {/* Company info (read-only from clients table) */}
        {client && (
          <section className="mb-8">
            <SectionLabel>Empresa</SectionLabel>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl divide-y divide-zinc-800">
              <InfoRow label="Nombre del cliente" value={client.name} />
              {client.company && <InfoRow label="Empresa" value={client.company} />}
            </div>
          </section>
        )}

        {/* Stats */}
        <section>
          <SectionLabel>Estadisticas</SectionLabel>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 text-sm">Proyectos vinculados</span>
              <span className="text-white text-sm font-medium tabular-nums">
                {projectCount ?? 0}
              </span>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

// ---------------------------------------------------------------------------
// Sub-components (server-only, purely presentational)
// ---------------------------------------------------------------------------

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-zinc-500 text-xs font-medium uppercase tracking-widest mb-3">
      {children}
    </h2>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-6 py-4 flex items-center justify-between gap-4">
      <span className="text-zinc-400 text-sm">{label}</span>
      <span className="text-zinc-200 text-sm text-right truncate max-w-xs">{value}</span>
    </div>
  )
}
