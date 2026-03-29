import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/lib/supabase/types'

export default async function AdminTeamPage() {
  const supabase = await createClient()

  const { data: members } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url, role, is_admin_team, created_at')
    .eq('is_admin_team', true)
    .order('full_name', { ascending: true })

  const team: Profile[] = (members ?? []) as Profile[]

  return (
    <div className="px-8 py-10">
      <div className="mb-10">
        <h1 className="text-lg font-mono tracking-[0.15em] text-[#e8e8e8] uppercase">
          Equipo
        </h1>
        <p className="mt-1 text-xs font-mono text-[#555] tracking-wide">
          {team.length} miembro{team.length !== 1 ? 's' : ''} del staff
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {team.map((member) => {
          const initials = (member.full_name ?? member.email ?? '?')
            .split(' ')
            .map((w) => w[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)

          return (
            <div
              key={member.id}
              className="bg-[#111] border border-[#222] rounded-sm p-5 flex items-start gap-4"
            >
              <div className="w-10 h-10 rounded-full bg-[#1a1a1a] border border-[#333] flex items-center justify-center flex-shrink-0">
                {member.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={member.avatar_url}
                    alt={member.full_name ?? ''}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-mono text-[#888]">{initials}</span>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-mono text-[#e8e8e8] truncate">
                  {member.full_name ?? '—'}
                </p>
                <p className="text-xs font-mono text-[#555] truncate mt-0.5">
                  {member.email}
                </p>
                <span className="inline-block mt-2 px-2 py-0.5 text-[10px] font-mono tracking-widest uppercase bg-[#1a1a1a] border border-[#333] text-[#888] rounded-sm">
                  {member.role === 'admin_staff' ? 'Staff' : member.role ?? 'Team'}
                </span>
              </div>
            </div>
          )
        })}

        {team.length === 0 && (
          <p className="col-span-3 text-sm font-mono text-[#555]">
            No hay miembros del equipo registrados.
          </p>
        )}
      </div>
    </div>
  )
}
