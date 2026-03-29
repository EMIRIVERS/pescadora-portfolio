'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { ProjectWithClient, Client, ProjectStatus } from '@/lib/supabase/types'
import { Loader2 } from 'lucide-react'

interface Props {
  project: ProjectWithClient
  clients: Pick<Client, 'id' | 'name' | 'company'>[]
}

interface FormValues {
  title: string
  description: string
  client_id: string
  status: ProjectStatus
  start_date: string
  end_date: string
}

interface FormErrors {
  title?: string
  end_date?: string
  general?: string
}

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: 'pre_production', label: 'Pre-produccion' },
  { value: 'production', label: 'Produccion' },
  { value: 'post_production', label: 'Post-produccion' },
  { value: 'delivered', label: 'Entregado' },
]

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {}

  if (!values.title.trim()) {
    errors.title = 'Title is required.'
  }

  if (values.start_date && values.end_date) {
    const start = new Date(values.start_date)
    const end = new Date(values.end_date)
    if (end <= start) {
      errors.end_date = 'End date must be after start date.'
    }
  }

  return errors
}

export function EditProjectForm({ project, clients }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [errors, setErrors] = useState<FormErrors>({})
  const [values, setValues] = useState<FormValues>({
    title: project.title,
    description: project.description ?? '',
    client_id: project.client_id ?? '',
    status: project.status,
    start_date: project.start_date ?? '',
    end_date: project.end_date ?? '',
  })

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target
    setValues((prev) => ({ ...prev, [name]: value }))
    // Clear field-level error on change
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

      const { error } = await supabase
        .from('projects')
        .update({
          title: values.title.trim(),
          description: values.description.trim() || null,
          client_id: values.client_id || null,
          status: values.status,
          start_date: values.start_date || null,
          end_date: values.end_date || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', project.id)

      if (error) {
        setErrors({ general: error.message })
        return
      }

      router.refresh()
      router.push(`/admin/projects/${project.id}`)
    })
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {errors.general && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          {errors.general}
        </div>
      )}

      {/* Title */}
      <div className="space-y-1.5">
        <label htmlFor="title" className="block text-sm font-medium text-zinc-300">
          Title <span className="text-red-400">*</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          value={values.title}
          onChange={handleChange}
          disabled={isPending}
          className="w-full rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-500 disabled:opacity-50"
          placeholder="Project title"
        />
        {errors.title && (
          <p className="text-xs text-red-400">{errors.title}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <label htmlFor="description" className="block text-sm font-medium text-zinc-300">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          value={values.description}
          onChange={handleChange}
          disabled={isPending}
          className="w-full rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-500 disabled:opacity-50 resize-none"
          placeholder="Brief description of this project…"
        />
      </div>

      {/* Client */}
      <div className="space-y-1.5">
        <label htmlFor="client_id" className="block text-sm font-medium text-zinc-300">
          Client
        </label>
        <select
          id="client_id"
          name="client_id"
          value={values.client_id}
          onChange={handleChange}
          disabled={isPending}
          className="w-full rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-500 disabled:opacity-50"
        >
          <option value="">— No client —</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.company ? ` · ${c.company}` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Status */}
      <div className="space-y-1.5">
        <label htmlFor="status" className="block text-sm font-medium text-zinc-300">
          Status
        </label>
        <select
          id="status"
          name="status"
          value={values.status}
          onChange={handleChange}
          disabled={isPending}
          className="w-full rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-500 disabled:opacity-50"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="start_date" className="block text-sm font-medium text-zinc-300">
            Start date
          </label>
          <input
            id="start_date"
            name="start_date"
            type="date"
            value={values.start_date}
            onChange={handleChange}
            disabled={isPending}
            className="w-full rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-500 disabled:opacity-50 [color-scheme:dark]"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="end_date" className="block text-sm font-medium text-zinc-300">
            End date
          </label>
          <input
            id="end_date"
            name="end_date"
            type="date"
            value={values.end_date}
            onChange={handleChange}
            disabled={isPending}
            className="w-full rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-500 disabled:opacity-50 [color-scheme:dark]"
          />
          {errors.end_date && (
            <p className="text-xs text-red-400">{errors.end_date}</p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          disabled={isPending}
          className="px-4 py-2 text-sm rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-zinc-100 hover:bg-white text-zinc-900 font-medium transition-colors disabled:opacity-50"
        >
          {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Save changes
        </button>
      </div>
    </form>
  )
}
