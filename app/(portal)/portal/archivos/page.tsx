import { redirect } from 'next/navigation'
import { resolvePortalClient } from '@/lib/portal/preview'
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

interface ArchivosPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function ArchivosPage({ searchParams }: ArchivosPageProps) {
  const sp = await searchParams
  const ctx = await resolvePortalClient(sp)
  if (!ctx) redirect('/login')
  const { supabase, clientId } = ctx
  const clientRow = { id: clientId }

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
    <main style={{ minHeight: '100vh', backgroundColor: '#09090b', padding: 'clamp(20px, 5vw, 40px) clamp(16px, 4vw, 24px) 80px', fontFamily: S.font }}>
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
