'use client'

import { useState, useCallback } from 'react'
import type { Deliverable, DeliverableType, DeliverableStatus } from '@/lib/supabase/types'
import { AddDeliverableForm } from '@/components/admin/deliverables/add-deliverable-form'
import { ExternalLink, Pencil, Plus, ChevronDown, ChevronUp } from 'lucide-react'

interface Props {
  projectId: string
  initialDeliverables: Deliverable[]
}

const TYPE_STYLES: Record<DeliverableType, string> = {
  wip: 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/25',
  final: 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/25',
}

const TYPE_LABELS: Record<DeliverableType, string> = {
  wip: 'WIP',
  final: 'Final',
}

const STATUS_STYLES: Record<DeliverableStatus, string> = {
  pending: 'bg-zinc-700/50 text-zinc-400 ring-1 ring-zinc-600/50',
  review: 'bg-sky-500/15 text-sky-400 ring-1 ring-sky-500/25',
  approved: 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/25',
}

const STATUS_LABELS: Record<DeliverableStatus, string> = {
  pending: 'Pending',
  review: 'In Review',
  approved: 'Approved',
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

interface DeliverableRowProps {
  deliverable: Deliverable
}

function DeliverableRow({ deliverable }: DeliverableRowProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Expand toggle */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-zinc-600 hover:text-zinc-400 transition-colors flex-shrink-0"
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          {expanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>

        {/* Title */}
        <span className="flex-1 min-w-0 text-sm font-medium text-zinc-100 truncate">
          {deliverable.title}
        </span>

        {/* Badges */}
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_STYLES[deliverable.type]}`}
        >
          {TYPE_LABELS[deliverable.type]}
        </span>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[deliverable.status]}`}
        >
          {STATUS_LABELS[deliverable.status]}
        </span>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {deliverable.url && (
            <a
              href={deliverable.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
              title="Open URL"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          <button
            type="button"
            className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            title="Edit deliverable"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-zinc-800 px-4 py-3 space-y-2">
          {deliverable.description && (
            <p className="text-sm text-zinc-400 leading-relaxed">
              {deliverable.description}
            </p>
          )}
          {deliverable.url && (
            <p className="text-xs text-zinc-500 font-mono truncate">{deliverable.url}</p>
          )}
          <p className="text-xs text-zinc-600">
            Added {formatDate(deliverable.created_at)}
          </p>
        </div>
      )}
    </div>
  )
}

export function DeliverableList({ projectId, initialDeliverables }: Props) {
  const [deliverables, setDeliverables] = useState<Deliverable[]>(initialDeliverables)
  const [showForm, setShowForm] = useState(false)

  const handleAdded = useCallback((newDeliverable: Deliverable) => {
    setDeliverables((prev) => [newDeliverable, ...prev])
    setShowForm(false)
  }, [])

  return (
    <div className="space-y-3">
      {deliverables.length === 0 && !showForm && (
        <div className="rounded-xl border border-dashed border-zinc-800 px-6 py-10 text-center">
          <p className="text-sm text-zinc-500">No deliverables yet.</p>
          <p className="text-xs text-zinc-600 mt-1">
            Add the first file, link, or export for this project.
          </p>
        </div>
      )}

      {deliverables.map((d) => (
        <DeliverableRow key={d.id} deliverable={d} />
      ))}

      {showForm ? (
        <div className="rounded-xl bg-zinc-900 border border-zinc-700 p-5">
          <h3 className="text-sm font-semibold text-zinc-200 mb-4">Add deliverable</h3>
          <AddDeliverableForm
            projectId={projectId}
            onSuccess={handleAdded}
            onCancel={() => setShowForm(false)}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-700 hover:border-zinc-500 px-4 py-3 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add deliverable
        </button>
      )}
    </div>
  )
}
