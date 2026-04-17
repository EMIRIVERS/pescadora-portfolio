import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Client } from '@/lib/supabase/types'
import { NewProjectForm } from '@/components/admin/projects/new-project-form'
import { ChevronLeft } from 'lucide-react'

export default async function NewProjectPage() {
  const supabase = await createClient()

  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, company')
    .order('name', { ascending: true })

  const safeClients: Pick<Client, 'id' | 'name' | 'company'>[] =
    (clients ?? []) as Pick<Client, 'id' | 'name' | 'company'>[]

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: 'var(--dash-surface-1)',
        color: 'var(--dash-text-primary)',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
      }}
    >
      {/* Top bar */}
      <div
        className="sticky top-0 z-10 backdrop-blur-md"
        style={{
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          backgroundColor: 'rgba(17,17,17,0.85)',
        }}
      >
        <div className="mx-auto max-w-2xl px-6 h-14 flex items-center">
          <Link
            href="/admin/projects"
            className="flex items-center gap-1.5 transition-colors"
            style={{ fontSize: '14px', color: 'var(--dash-text-secondary)' }}
          >
            <ChevronLeft className="w-4 h-4" />
            Proyectos
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-6 py-10 space-y-8">
        {/* Page heading */}
        <div className="space-y-1">
          <h1
            style={{ fontSize: '24px', fontWeight: 600, color: 'var(--dash-text-primary)', letterSpacing: '-0.01em' }}
          >
            Nuevo proyecto
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--dash-text-secondary)' }}>
            Crea un proyecto para gestionar entregables y tareas.
          </p>
        </div>

        {/* Form card */}
        <div
          style={{
            backgroundColor: 'var(--dash-surface-1)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px',
            padding: '32px',
          }}
        >
          <NewProjectForm clients={safeClients} />
        </div>
      </div>
    </div>
  )
}
