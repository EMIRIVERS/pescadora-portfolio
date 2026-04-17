import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { ClientUpload } from '@/lib/supabase/types'
import ArchivosGallery from './ArchivosGallery'

const S = {
  font:          "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
  textPrimary:   '#f4f4f5',
  textTertiary:  '#71717a',
} as const

type UploadWithProject = ClientUpload & {
  project: { id: string; title: string } | null
}

export default async function ArchivosPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Resolve the client row linked to this authenticated user
  const { data: clientRow } = await supabase
    .from('clients')
    .select('id')
    .eq('profile_id', user.id)
    .single()

  if (!clientRow) {
    return (
      <main style={{ minHeight: '100vh', backgroundColor: '#09090b', padding: '40px 24px', fontFamily: S.font }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: S.textPrimary, marginBottom: 8 }}>
            Mis archivos
          </h1>
          <p style={{ color: S.textTertiary, fontSize: 14 }}>
            No se encontro perfil de cliente asociado a tu cuenta.
          </p>
        </div>
      </main>
    )
  }

  // Fetch this client's projects (for the upload selector + filter dropdown)
  const { data: projectsData } = await supabase
    .from('projects')
    .select('id, title')
    .eq('client_id', clientRow.id)
    .order('created_at', { ascending: false })

  const projects = (projectsData ?? []) as { id: string; title: string }[]

  // Fetch all uploads for this client, joined with project title
  const { data: uploadsData } = await supabase
    .from('client_uploads')
    .select('*, project:projects(id, title)')
    .eq('client_id', clientRow.id)
    .order('uploaded_at', { ascending: false })

  const uploads: UploadWithProject[] = (uploadsData ?? []) as UploadWithProject[]

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#09090b', padding: '40px 24px 80px', fontFamily: S.font }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: S.textPrimary, margin: '0 0 6px' }}>
            Mis archivos
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: S.textTertiary }}>
            Archivos de referencia y recursos que has subido a tus proyectos
          </p>
        </div>

        <ArchivosGallery
          initialUploads={uploads}
          projects={projects}
          clientId={clientRow.id}
        />
      </div>
    </main>
  )
}
