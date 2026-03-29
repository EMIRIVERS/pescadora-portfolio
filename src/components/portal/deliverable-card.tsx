'use client'

import { ExternalLink, MessageSquare } from 'lucide-react'
import type { Deliverable, DeliverableType, DeliverableStatus } from '@/lib/supabase/types'

// ---------------------------------------------------------------------------
// Badge configs
// ---------------------------------------------------------------------------

const TYPE_BADGE: Record<DeliverableType, { label: string; className: string }> = {
  wip: {
    label: 'WIP',
    className: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  },
  final: {
    label: 'Final',
    className: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  },
}

const STATUS_BADGE: Record<DeliverableStatus, { label: string; className: string }> = {
  pending: {
    label: 'Pendiente',
    className: 'bg-zinc-800 text-zinc-400 border border-zinc-700',
  },
  review: {
    label: 'En revision',
    className: 'bg-sky-500/10 text-sky-400 border border-sky-500/20',
  },
  approved: {
    label: 'Aprobado',
    className: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface DeliverableCardProps {
  deliverable: Deliverable
}

export default function DeliverableCard({ deliverable }: DeliverableCardProps) {
  const typeBadge = TYPE_BADGE[deliverable.type]
  const statusBadge = STATUS_BADGE[deliverable.status]
  const hasUrl = deliverable.url !== null && deliverable.url !== ''

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-colors duration-200">
      <div className="flex flex-wrap items-start gap-3">
        {/* Left — title + description */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <h3 className="text-white text-sm font-medium leading-snug">
              {deliverable.title}
            </h3>
            <span
              className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full ${typeBadge.className}`}
            >
              {typeBadge.label}
            </span>
          </div>

          {deliverable.description && (
            <p className="text-zinc-500 text-xs leading-relaxed">
              {deliverable.description}
            </p>
          )}
        </div>

        {/* Right — status badge + view button */}
        <div className="flex items-center gap-2.5 shrink-0 mt-0.5">
          <span
            className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full ${statusBadge.className}`}
          >
            {statusBadge.label}
          </span>

          {hasUrl ? (
            <a
              href={deliverable.url as string}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-400 hover:text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 hover:border-sky-500/30 px-3 py-1.5 rounded-lg transition-all duration-150"
            >
              <ExternalLink className="w-3 h-3" strokeWidth={2} />
              Ver
            </a>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-600 bg-zinc-800/50 border border-zinc-800 px-3 py-1.5 rounded-lg cursor-not-allowed select-none">
              <ExternalLink className="w-3 h-3" strokeWidth={2} />
              Ver
            </span>
          )}
        </div>
      </div>

      {/* Comments placeholder */}
      <div className="mt-4 pt-4 border-t border-zinc-800/60">
        <button
          type="button"
          disabled
          className="inline-flex items-center gap-1.5 text-xs text-zinc-600 transition-colors cursor-not-allowed"
          title="Comentarios disponibles pronto"
        >
          <MessageSquare className="w-3.5 h-3.5" strokeWidth={1.5} />
          Comentarios — proximo
        </button>
      </div>
    </div>
  )
}
