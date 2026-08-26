import { createClient } from '@/lib/supabase/server'
import { proposalToPdfData, renderBillingPdf, billingFilename, type ProposalPdfRow } from '@/lib/pdf/render'

// @react-pdf/renderer requiere APIs de Node (no Edge).
export const runtime = 'nodejs'

const PROPOSAL_COLS =
  'id, title, currency, status, created_at, valid_until, notes, items, subtotal, tax, total, fiscal_data, clients(name, email, company)'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()

  // RLS decide la visibilidad (cotizaciones: solo staff).
  // 'proposals' no está en los tipos generados de Supabase (igual que en el resto del código).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('proposals')
    .select(PROPOSAL_COLS)
    .eq('id', id)
    .single()

  if (error || !data) {
    return new Response('Cotización no encontrada o sin acceso.', { status: 404 })
  }

  const pdfData = proposalToPdfData(data as ProposalPdfRow)
  const pdf = await renderBillingPdf(pdfData)
  const disposition = new URL(request.url).searchParams.has('download') ? 'attachment' : 'inline'

  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${disposition}; filename="${billingFilename(pdfData)}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
