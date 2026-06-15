import { redirect } from 'next/navigation'
import { resolvePortalClient, portalLink } from '@/lib/portal/preview'
import type { ClientUpload } from '@/lib/supabase/types'
import { PortalShell, BackLink, Masthead } from '@/components/portal/ui'
import ArchivosGallery from './ArchivosGallery'

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
    <PortalShell maxWidth={1080}>
      <BackLink href={portalLink('/portal', ctx)} />
      <Masthead
        title="Archivos"
        lead="Tus referencias visuales y recursos de producción. Sube guiones, moodboards, imágenes y cualquier material que dé vida a cada proyecto."
      />
      <ArchivosGallery
        initialUploads={uploads}
        projects={projects}
        clientId={clientRow.id}
      />
    </PortalShell>
  )
}
