import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail, ADMIN_EMAIL } from '@/lib/email'
import { deadlineReminderTemplate } from '@/lib/email/templates'

export async function GET(request: NextRequest) {
  // Verificar que viene de Vercel Cron (bearer token)
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createServiceClient()
  const today = new Date()
  const in7Days = new Date(today)
  in7Days.setDate(today.getDate() + 7)

  // Buscar proyectos con deadline en los proximos 7 dias
  const { data: projects } = await db
    .from('projects')
    .select('id, title, end_date, client:clients(name)')
    .not('end_date', 'is', null)
    .gte('end_date', today.toISOString().split('T')[0])
    .lte('end_date', in7Days.toISOString().split('T')[0])
    .neq('status', 'delivered')

  if (projects && projects.length > 0) {
    const projectList = projects.map((p) => {
      const end = new Date(p.end_date as string)
      const daysLeft = Math.round((end.getTime() - today.getTime()) / 86400000)
      const clientRaw = p.client as { name: string } | { name: string }[] | null
      const clientName = Array.isArray(clientRaw)
        ? (clientRaw[0]?.name ?? 'Sin cliente')
        : (clientRaw?.name ?? 'Sin cliente')
      return {
        title: p.title,
        clientName,
        daysLeft,
        endDate: p.end_date as string,
      }
    })

    await sendEmail({
      to: ADMIN_EMAIL,
      subject: `${projectList.length} proyecto${projectList.length !== 1 ? 's' : ''} con entrega proxima`,
      html: deadlineReminderTemplate(projectList),
    })
  }

  // Buscar leads sin actividad reciente (>3 dias en status 'new' o 'contacted')
  const threeDaysAgo = new Date(today)
  threeDaysAgo.setDate(today.getDate() - 3)

  const { data: staleLeads } = await db
    .from('leads')
    .select('id, name, email, status')
    .in('status', ['new', 'contacted'])
    .lt('updated_at', threeDaysAgo.toISOString())
    .limit(10)

  return NextResponse.json({
    ok: true,
    deadlineProjects: projects?.length ?? 0,
    staleLeads: staleLeads?.length ?? 0,
  })
}
