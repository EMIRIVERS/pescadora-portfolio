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
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Top bar */}
      <div className="border-b border-zinc-800 bg-zinc-900/60 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-2xl px-6 h-14 flex items-center">
          <Link
            href={`/admin/projects/${id}`}
            className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to project
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-6 py-10 space-y-8">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
            Edit project
          </h1>
          <p className="text-sm text-zinc-400">{typedProject.title}</p>
        </div>

        <EditProjectForm project={typedProject} clients={safeClients} />
      </div>
    </div>
  )
}
