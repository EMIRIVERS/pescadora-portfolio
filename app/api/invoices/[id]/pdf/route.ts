import { createClient } from '@/lib/supabase/server'
import { invoiceToPdfData, renderBillingPdf, billingFilename, type InvoicePdfRow } from '@/lib/pdf/render'

// @react-pdf/renderer requiere APIs de Node (no Edge).
export const runtime = 'nodejs'

const INVOICE_COLS =
  'invoice_number, amount, currency, status, issue_date, due_date, notes, items, subtotal, tax, fiscal_data, clients(name, email, company), projects(title)'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()

  // RLS decide la visibilidad: staff ve todas; el cliente solo las suyas.
  // 'invoices' no está en los tipos generados de Supabase (igual que en el resto del código).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('invoices')
    .select(INVOICE_COLS)
    .eq('id', id)
    .single()

  if (error || !data) {
    return new Response('Factura no encontrada o sin acceso.', { status: 404 })
  }

  const pdfData = invoiceToPdfData(data as InvoicePdfRow)
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
