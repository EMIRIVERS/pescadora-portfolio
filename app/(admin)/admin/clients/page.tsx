import { createClient } from '@/lib/supabase/server'
import type { Client } from '@/lib/supabase/types'

// ── Extended shape returned by the join ──────────────────────────────────────

interface ClientRow extends Client {
  project_count: number
}

// ── Invite button (placeholder — triggers modal in future) ───────────────────
// Extracted so we can mark it 'use client' separately when the modal is wired up.

function InviteClientButton() {
  return (
    <button
      type="button"
      disabled
      title="Proximamente: invitar cliente por email"
      className="px-4 py-2 border border-[#2a2a2a] text-[#555] text-[11px] font-mono tracking-[0.15em] uppercase rounded-sm cursor-not-allowed opacity-50"
    >
      Invitar cliente
    </button>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function AdminClientsPage() {
  const supabase = await createClient()

  // Fetch clients with a count of their related projects.
  // Supabase supports embedded counts via `{ count: 'exact' }` on the nested
  // relation — we select the count column and alias it as `project_count`.
  const { data: clients, error } = await supabase
    .from('clients')
    .select(
      `
      id,
      name,
      email,
      company,
      avatar_url,
      profile_id,
      created_at,
      projects(count)
    `
    )
    .order('name', { ascending: true })

  // Normalise the nested count shape Supabase returns into a flat number.
  const rows: ClientRow[] = (clients ?? []).map((c) => {
    const projectsField = c.projects as unknown
    let count = 0
    if (Array.isArray(projectsField) && projectsField.length > 0) {
      const first = projectsField[0] as Record<string, unknown>
      count = typeof first.count === 'number' ? first.count : 0
    }
    const { projects: _projects, ...rest } = c as typeof c & {
      projects: unknown
    }
    void _projects
    return { ...rest, project_count: count }
  })

  function initials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }

  return (
    <div className="px-8 py-10">
      {/* Page header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-lg font-mono tracking-[0.15em] text-[#e8e8e8] uppercase">
            Clientes
          </h1>
          <p className="mt-1 text-xs font-mono text-[#555] tracking-wide">
            {rows.length} cliente{rows.length !== 1 ? 's' : ''} registrado
            {rows.length !== 1 ? 's' : ''}
          </p>
        </div>
        <InviteClientButton />
      </div>

      {error && (
        <div className="mb-6 p-4 border border-red-900/40 bg-red-950/20 rounded-sm">
          <p className="text-xs font-mono text-red-400/80">
            Error al cargar clientes: {error.message}
          </p>
        </div>
      )}

      {rows.length === 0 && !error ? (
        <div className="py-20 text-center border border-[#1a1a1a] rounded-sm bg-[#0d0d0d]">
          <p className="text-xs font-mono text-[#444] tracking-wide">
            No hay clientes todavia.
          </p>
        </div>
      ) : (
        <div className="border border-[#1a1a1a] rounded-sm overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_220px_80px] gap-4 px-5 py-3 border-b border-[#1a1a1a] bg-[#0d0d0d]">
            {['Cliente', 'Email', 'Proyectos'].map((col) => (
              <span
                key={col}
                className="text-[9px] font-mono tracking-[0.25em] uppercase text-[#444]"
              >
                {col}
              </span>
            ))}
          </div>

          {/* Table rows */}
          <div className="divide-y divide-[#111]">
            {rows.map((client) => (
              <div
                key={client.id}
                className="grid grid-cols-[1fr_220px_80px] gap-4 items-center px-5 py-4 hover:bg-[#0d0d0d] transition-colors"
              >
                {/* Avatar + name + company */}
                <div className="flex items-center gap-3 min-w-0">
                  {client.avatar_url ? (
                    <img
                      src={client.avatar_url}
                      alt={client.name}
                      className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#1c1c1c] border border-[#2a2a2a] flex items-center justify-center flex-shrink-0">
                      <span className="text-[9px] font-mono text-[#666]">
                        {initials(client.name)}
                      </span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-mono text-[#ccc] truncate">
                      {client.name}
                    </p>
                    {client.company && (
                      <p className="text-[10px] font-mono text-[#444] truncate mt-0.5">
                        {client.company}
                      </p>
                    )}
                  </div>
                </div>

                {/* Email */}
                <div className="min-w-0">
                  {client.email ? (
                    <a
                      href={`mailto:${client.email}`}
                      className="text-xs font-mono text-[#666] hover:text-[#aaa] truncate block transition-colors"
                    >
                      {client.email}
                    </a>
                  ) : (
                    <span className="text-xs font-mono text-[#333]">—</span>
                  )}
                </div>

                {/* Project count */}
                <div>
                  <span
                    className={[
                      'inline-block px-2 py-0.5 rounded-sm text-[10px] font-mono tabular-nums',
                      client.project_count > 0
                        ? 'bg-[#0d1a2e] text-[#6fa3e0] border border-[#1a3050]'
                        : 'bg-[#111] text-[#444] border border-[#1a1a1a]',
                    ].join(' ')}
                  >
                    {client.project_count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
