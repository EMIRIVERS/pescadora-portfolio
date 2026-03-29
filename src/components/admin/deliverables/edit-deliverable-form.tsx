'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Deliverable, DeliverableType, DeliverableStatus } from '@/lib/supabase/types'
import { Loader2 } from 'lucide-react'

interface Props {
  deliverable: Deliverable
  onSuccess: (updated: Deliverable) => void
  onCancel: () => void
}

interface FormValues {
  title: string
  description: string
  url: string
  type: DeliverableType
  status: DeliverableStatus
}

interface FormErrors {
  title?: string
  url?: string
  general?: string
}

const TYPE_OPTIONS: { value: DeliverableType; label: string }[] = [
  { value: 'wip', label: 'WIP' },
  { value: 'final', label: 'Final' },
]

const STATUS_OPTIONS: { value: DeliverableStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'review', label: 'In Review' },
  { value: 'approved', label: 'Approved' },
]

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {}

  if (!values.title.trim()) {
    errors.title = 'Title is required.'
  }

  if (values.url.trim() && !/^https?:\/\/.+/.test(values.url.trim())) {
    errors.url = 'URL must start with http:// or https://'
  }

  return errors
}

export function EditDeliverableForm({ deliverable, onSuccess, onCancel }: Props) {
  const [isPending, startTransition] = useTransition()
  const [errors, setErrors] = useState<FormErrors>({})
  const [values, setValues] = useState<FormValues>({
    title: deliverable.title,
    description: deliverable.description ?? '',
    url: deliverable.url ?? '',
    type: deliverable.type,
    status: deliverable.status,
  })

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target
    setValues((prev) => ({ ...prev, [name]: value }))
    if (name in errors) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const validationErrors = validate(values)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }
    setErrors({})

    startTransition(async () => {
      const supabase = createClient()

      const { data, error } = await supabase
        .from('project_deliverables')
        .update({
          title: values.title.trim(),
          description: values.description.trim() || null,
          url: values.url.trim() || null,
          type: values.type,
          status: values.status,
        })
        .eq('id', deliverable.id)
        .select('*')
        .single()

      if (error || !data) {
        setErrors({ general: error?.message ?? 'Failed to update deliverable.' })
        return
      }

      onSuccess(data as Deliverable)
    })
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {errors.general && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          {errors.general}
        </div>
      )}

      {/* Title */}
      <div className="space-y-1.5">
        <label htmlFor="ed-title" className="block text-xs font-medium text-zinc-400">
          Title <span className="text-red-400">*</span>
        </label>
        <input
          id="ed-title"
          name="title"
          type="text"
          value={values.title}
          onChange={handleChange}
          disabled={isPending}
          className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-500 disabled:opacity-50"
          placeholder="e.g. Cut #3 — rough edit"
        />
        {errors.title && (
          <p className="text-xs text-red-400">{errors.title}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <label htmlFor="ed-description" className="block text-xs font-medium text-zinc-400">
          Description
        </label>
        <textarea
          id="ed-description"
          name="description"
          rows={3}
          value={values.description}
          onChange={handleChange}
          disabled={isPending}
          className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-500 disabled:opacity-50 resize-none"
          placeholder="Optional notes..."
        />
      </div>

      {/* URL */}
      <div className="space-y-1.5">
        <label htmlFor="ed-url" className="block text-xs font-medium text-zinc-400">
          URL
        </label>
        <input
          id="ed-url"
          name="url"
          type="url"
          value={values.url}
          onChange={handleChange}
          disabled={isPending}
          className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-500 disabled:opacity-50 font-mono"
          placeholder="https://frame.io/..."
        />
        {errors.url && (
          <p className="text-xs text-red-400">{errors.url}</p>
        )}
      </div>

      {/* Type + Status */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="ed-type" className="block text-xs font-medium text-zinc-400">
            Type
          </label>
          <select
            id="ed-type"
            name="type"
            value={values.type}
            onChange={handleChange}
            disabled={isPending}
            className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-500 disabled:opacity-50"
          >
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="ed-status" className="block text-xs font-medium text-zinc-400">
            Status
          </label>
          <select
            id="ed-status"
            name="status"
            value={values.status}
            onChange={handleChange}
            disabled={isPending}
            className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-500 disabled:opacity-50"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="px-3 py-1.5 text-xs rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-zinc-100 hover:bg-white text-zinc-900 font-medium transition-colors disabled:opacity-50"
        >
          {isPending && <Loader2 className="w-3 h-3 animate-spin" />}
          Save changes
        </button>
      </div>
    </form>
  )
}
