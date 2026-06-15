import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { ProjectWithClient, Client } from '@/lib/supabase/types'
import { EditProjectForm } from '@/components/admin/projects/edit-project-form'
import { ChevronLeft } from 'lucide-react'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditProjectPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: project, error }, { data: clients }] = await Promise.all([
    supabase
      .from('projects')
      .select('*, client:clients(*)')
      .eq('id', id)
      .single(),
    supabase
      .from('clients')
      .select('id, name, company')
      .order('name', { ascending: true }),
  ])

  if (error || !project) {
    notFound()
  }

  const typedProject = project as unknown as ProjectWithClient
  const safeClients: Pick<Client, 'id' | 'name' | 'company'>[] =
    (clients ?? []) as Pick<Client, 'id' | 'name' | 'company'>[]

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: 'var(--dash-surface-1)',
        color: 'var(--dash-text-primary)',
        fontFamily: "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
      }}
    >
      {/* Top bar */}
      <div
        className="sticky top-0 z-10 backdrop-blur-md"
        style={{
          borderBottom: '1px solid var(--dash-border)',
          backgroundColor: 'var(--dash-surface-1)',
        }}
      >
        <div className="mx-auto max-w-2xl px-6 h-14 flex items-center">
          <Link
            href={`/admin/projects/${id}`}
            className="flex items-center gap-1.5 transition-colors"
            style={{ fontSize: '14px', color: 'var(--dash-text-secondary)' }}
          >
            <ChevronLeft className="w-4 h-4" />
            Volver al proyecto
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-6 py-10 space-y-8">
        {/* Page heading */}
        <div className="space-y-1">
          <h1
            style={{ fontSize: '24px', fontWeight: 600, color: 'var(--dash-text-primary)', letterSpacing: '-0.01em' }}
          >
            Editar proyecto
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--dash-text-secondary)' }}>
            {typedProject.title}
          </p>
        </div>

        {/* Form card */}
        <div
          style={{
            backgroundColor: 'var(--dash-surface-1)',
            border: '1px solid var(--dash-border)',
            borderRadius: '16px',
            padding: '32px',
          }}
        >
          <EditProjectForm project={typedProject} clients={safeClients} />
        </div>
      </div>
    </div>
  )
}
