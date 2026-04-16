import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// ─── Period helpers (mirrors reportes/page.tsx logic) ─────────────────────────

type Period = 'month' | '3months' | 'year' | 'all'

function getPeriodStart(period: Period): string | null {
  const now = new Date()
  if (period === 'month') {
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  }
  if (period === '3months') {
    return new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString()
  }
  if (period === 'year') {
    return new Date(now.getFullYear(), 0, 1).toISOString()
  }
  return null
}

// ─── CSV helpers ──────────────────────────────────────────────────────────────

function escapeCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  // Wrap in quotes if contains comma, newline or double-quote; escape inner quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function buildCsvRow(cells: Array<string | number | null | undefined>): string {
  return cells.map(escapeCell).join(',')
}

// ─── Runtime shape returned by Supabase (budget/currency exist in DB) ─────────

interface ProjectExportRow {
  id: string
  title: string
  status: string
  budget: number | null
  currency: string | null
  client_id: string | null
  created_at: string
  end_date: string | null
  clients: { name: string } | { name: string }[] | null
}

// ─── Route handler ────────────────────────────────────────────────────────────

// GET /api/export/projects?period=month
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url)
  const rawPeriod = searchParams.get('period') ?? 'all'
  const period: Period = (['month', '3months', 'year', 'all'] as const).includes(
    rawPeriod as Period,
  )
    ? (rawPeriod as Period)
    : 'all'

  const db = createServiceClient()
  const periodStart = getPeriodStart(period)

  // Use unknown cast because `budget` and `currency` are real DB columns
  // but not yet reflected in the hand-written types file.
  let query = db
    .from('projects')
    .select('id, title, status, budget, currency, client_id, created_at, end_date, clients(name)')
    .order('created_at', { ascending: false })

  if (periodStart) {
    query = query.gte('created_at', periodStart)
  }

  const { data, error } = await query

  if (error) {
    return new NextResponse(`Error: ${error.message}`, { status: 500 })
  }

  // ── Build CSV ──────────────────────────────────────────────────────────────

  const HEADER = [
    'titulo',
    'cliente',
    'estado',
    'presupuesto',
    'moneda',
    'fecha_inicio',
    'fecha_fin',
  ]

  const rows = (data as unknown as ProjectExportRow[]) ?? []

  const csvLines: string[] = [buildCsvRow(HEADER)]

  for (const row of rows) {
    const clientName =
      row.clients === null
        ? null
        : Array.isArray(row.clients)
          ? (row.clients[0]?.name ?? null)
          : row.clients.name

    csvLines.push(
      buildCsvRow([
        row.title,
        clientName,
        row.status,
        row.budget,
        row.currency,
        row.created_at ? row.created_at.slice(0, 10) : null,
        row.end_date ? row.end_date.slice(0, 10) : null,
      ]),
    )
  }

  const csv = csvLines.join('\r\n')

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="reportes-proyectos.csv"',
    },
  })
}
