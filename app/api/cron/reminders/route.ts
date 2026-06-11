import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail, ADMIN_EMAIL } from '@/lib/email'
import { deadlineReminderTemplate } from '@/lib/email/templates'
import { notify } from '@/lib/notify'

export async function GET(request: NextRequest) {
  // Verificar que viene de Vercel Cron (bearer token)
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
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

    // Buscar leads sin actividad reciente (>3 dias en status 'new' o 'contacted').
    // Se calcula antes de enviar el email para que un fallo de email no lo bloquee.
    const threeDaysAgo = new Date(today)
    threeDaysAgo.setDate(today.getDate() - 3)

    const { data: staleLeads } = await db
      .from('leads')
      .select('id, name, email, status')
      .in('status', ['new', 'contacted'])
      .lt('updated_at', threeDaysAgo.toISOString())
      .limit(10)

    const todayStr = today.toISOString().split('T')[0]

    // Facturas vencidas: 'sent' con due_date pasado → marcar 'overdue' + avisar.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: overdue } = await (db as any)
      .from('invoices')
      .select('id, invoice_number')
      .eq('status', 'sent')
      .lt('due_date', todayStr)
    let overdueCount = 0
    for (const inv of (overdue ?? []) as { id: string; invoice_number: string }[]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (db as any).from('invoices').update({ status: 'overdue' }).eq('id', inv.id)
      await notify({
        title: 'Factura vencida',
        body: `La factura ${inv.invoice_number} pasó su fecha de vencimiento.`,
        type: 'warning',
        entityType: 'invoice',
        entityId: inv.id,
      })
      overdueCount++
    }

    // Eventos de calendario en los próximos 2 días (pendientes) → avisar.
    const in2Days = new Date(today)
    in2Days.setDate(today.getDate() + 2)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: upcoming } = await (db as any)
      .from('calendar_events')
      .select('id, title, type, event_date')
      .eq('status', 'pendiente')
      .gte('event_date', todayStr)
      .lte('event_date', in2Days.toISOString().split('T')[0])
    for (const ev of (upcoming ?? []) as { id: string; title: string; event_date: string }[]) {
      await notify({
        title: 'Evento próximo',
        body: `${ev.title} — ${ev.event_date}`,
        type: 'info',
        entityType: 'calendar',
        entityId: ev.id,
      })
    }

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

      // sendEmail ya no-opea/atrapa internamente, pero lo aislamos por si acaso.
      try {
        await sendEmail({
          to: ADMIN_EMAIL,
          subject: `${projectList.length} proyecto${projectList.length !== 1 ? 's' : ''} con entrega proxima`,
          html: deadlineReminderTemplate(projectList),
        })
      } catch (emailErr) {
        console.error('[cron/reminders] email failed:', emailErr)
      }
    }

    return NextResponse.json({
      ok: true,
      deadlineProjects: projects?.length ?? 0,
      staleLeads: staleLeads?.length ?? 0,
      overdueInvoices: overdueCount,
      upcomingEvents: upcoming?.length ?? 0,
    })
  } catch (err) {
    console.error('[cron/reminders] failed:', err)
    // Return 200 so the Vercel scheduler doesn't mark the cron as failed on a
    // transient DB/network error; the body signals the failure.
    return NextResponse.json({ ok: false }, { status: 200 })
  }
}
