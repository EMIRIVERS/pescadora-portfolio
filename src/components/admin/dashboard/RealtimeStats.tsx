'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  initialLeadsCount: number
  initialProjectsCount: number
}

export default function RealtimeStats({ initialLeadsCount, initialProjectsCount }: Props) {
  const [leadsCount, setLeadsCount] = useState(initialLeadsCount)
  const [projectsCount, setProjectsCount] = useState(initialProjectsCount)

  useEffect(() => {
    const supabase = createClient()

    const leadsChannel = supabase
      .channel('dashboard-leads')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        supabase.from('leads').select('*', { count: 'exact', head: true })
          .then(({ count }) => { if (count !== null) setLeadsCount(count) })
      })
      .subscribe()

    const projectsChannel = supabase
      .channel('dashboard-projects')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {
        supabase.from('projects').select('*', { count: 'exact', head: true })
          .then(({ count }) => { if (count !== null) setProjectsCount(count) })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(leadsChannel)
      supabase.removeChannel(projectsChannel)
    }
  }, [])

  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <span style={{
        fontFamily: 'var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
        fontSize: '12px', color: 'var(--dash-text-secondary)'
      }}>
        {leadsCount} leads · {projectsCount} proyectos
      </span>
      <span style={{
        width: '6px', height: '6px', borderRadius: '50%',
        background: 'var(--dash-success)', display: 'inline-block',
        boxShadow: '0 0 6px var(--dash-success)'
      }} title="Actualización en tiempo real activa" />
    </div>
  )
}
