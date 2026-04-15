'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Eye, EyeOff, X } from 'lucide-react'
import {
  createPortfolioVideo,
  updatePortfolioVideo,
  deletePortfolioVideo,
  togglePortfolioVideoVisibility,
} from '@/lib/actions/portfolio'

interface PortfolioVideo {
  id: string
  title: string
  vimeo_id: string
  category: string
  client_name: string
  year: string
  role: string
  description: string
  sort_order: number
  is_visible: boolean
  created_at: string
  updated_at: string
}

interface VideoManagerProps {
  videos: PortfolioVideo[]
}

type FormMode = 'create' | 'edit'

const CATEGORY_BADGES: Record<string, string> = {
  comercial: 'bg-blue-900/40 text-blue-300',
  'video-clip': 'bg-purple-900/40 text-purple-300',
  entrevista: 'bg-amber-900/40 text-amber-300',
  podcast: 'bg-green-900/40 text-green-300',
}

const CATEGORIES = [
  { value: 'comercial', label: 'Comercial' },
  { value: 'video-clip', label: 'Video Clip' },
  { value: 'entrevista', label: 'Entrevista' },
  { value: 'podcast', label: 'Podcast' },
]

const INPUT_CLASS =
  'w-full bg-[#111] border border-[#2a2a2a] rounded-sm px-3 py-2 text-xs font-mono text-[#ccc] placeholder-[#444] focus:outline-none focus:border-[#3a3a3a] transition-colors'

const LABEL_CLASS = 'block text-[10px] font-mono tracking-widest uppercase text-[#555] mb-1'

export default function VideoManager({ videos }: VideoManagerProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [formMode, setFormMode] = useState<FormMode>('create')
  const [editingVideo, setEditingVideo] = useState<PortfolioVideo | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function openCreateForm() {
    setEditingVideo(null)
    setFormMode('create')
    setShowForm(true)
  }

  function openEditForm(video: PortfolioVideo) {
    setEditingVideo(video)
    setFormMode('edit')
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingVideo(null)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      if (formMode === 'create') {
        await createPortfolioVideo(formData)
      } else if (editingVideo) {
        await updatePortfolioVideo(editingVideo.id, formData)
      }
      closeForm()
      router.refresh()
    })
  }

  function handleDelete(video: PortfolioVideo) {
    if (!window.confirm(`Eliminar "${video.title}"? Esta accion no se puede deshacer.`)) return
    setDeletingId(video.id)
    startTransition(async () => {
      await deletePortfolioVideo(video.id)
      setDeletingId(null)
      router.refresh()
    })
  }

  function handleToggleVisibility(video: PortfolioVideo) {
    setTogglingId(video.id)
    startTransition(async () => {
      await togglePortfolioVideoVisibility(video.id, !video.is_visible)
      setTogglingId(null)
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono text-[#444] tracking-wide">
          {videos.length} {videos.length === 1 ? 'video' : 'videos'}
        </span>
        <button
          type="button"
          onClick={openCreateForm}
          className="flex items-center gap-2 px-3 py-1.5 bg-[#111] border border-[#2a2a2a] rounded-sm text-xs font-mono text-[#ccc] hover:text-[#e8e8e8] hover:border-[#3a3a3a] transition-colors"
        >
          <Plus size={13} strokeWidth={1.5} />
          Agregar video
        </button>
      </div>

      {/* Inline form panel */}
      {showForm && (
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-sm p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[10px] font-mono tracking-widest uppercase text-[#888]">
              {formMode === 'create' ? 'Nuevo video' : 'Editar video'}
            </h2>
            <button
              type="button"
              onClick={closeForm}
              className="text-[#444] hover:text-[#888] transition-colors"
            >
              <X size={14} strokeWidth={1.5} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Row 1: Titulo + Vimeo ID */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="title" className={LABEL_CLASS}>
                  Titulo *
                </label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  required
                  defaultValue={editingVideo?.title ?? ''}
                  className={INPUT_CLASS}
                  placeholder="Nombre del video"
                />
              </div>
              <div>
                <label htmlFor="vimeo_id" className={LABEL_CLASS}>
                  ID de Vimeo *
                </label>
                <input
                  id="vimeo_id"
                  name="vimeo_id"
                  type="text"
                  required
                  defaultValue={editingVideo?.vimeo_id ?? ''}
                  className={INPUT_CLASS}
                  placeholder="123456789"
                />
              </div>
            </div>

            {/* Row 2: Categoria + Cliente + Ano */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label htmlFor="category" className={LABEL_CLASS}>
                  Categoria
                </label>
                <select
                  id="category"
                  name="category"
                  defaultValue={editingVideo?.category ?? 'comercial'}
                  className={INPUT_CLASS}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="client_name" className={LABEL_CLASS}>
                  Cliente
                </label>
                <input
                  id="client_name"
                  name="client_name"
                  type="text"
                  defaultValue={editingVideo?.client_name ?? ''}
                  className={INPUT_CLASS}
                  placeholder="Nombre del cliente"
                />
              </div>
              <div>
                <label htmlFor="year" className={LABEL_CLASS}>
                  Ano
                </label>
                <input
                  id="year"
                  name="year"
                  type="text"
                  defaultValue={editingVideo?.year ?? ''}
                  className={INPUT_CLASS}
                  placeholder="2024"
                />
              </div>
            </div>

            {/* Row 3: Rol + Orden */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="role" className={LABEL_CLASS}>
                  Rol
                </label>
                <input
                  id="role"
                  name="role"
                  type="text"
                  defaultValue={editingVideo?.role ?? ''}
                  className={INPUT_CLASS}
                  placeholder="Director, editor..."
                />
              </div>
              <div>
                <label htmlFor="sort_order" className={LABEL_CLASS}>
                  Orden
                </label>
                <input
                  id="sort_order"
                  name="sort_order"
                  type="number"
                  defaultValue={editingVideo?.sort_order ?? 0}
                  className={INPUT_CLASS}
                  placeholder="0"
                />
              </div>
            </div>

            {/* Descripcion */}
            <div>
              <label htmlFor="description" className={LABEL_CLASS}>
                Descripcion
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                defaultValue={editingVideo?.description ?? ''}
                className={INPUT_CLASS}
                placeholder="Descripcion del video..."
              />
            </div>

            {/* Visible checkbox */}
            <div className="flex items-center gap-2">
              <input
                id="is_visible"
                name="is_visible"
                type="checkbox"
                defaultChecked={editingVideo ? editingVideo.is_visible : true}
                className="accent-[#555]"
              />
              <label htmlFor="is_visible" className="text-xs font-mono text-[#888]">
                Visible en el portfolio publico
              </label>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-2 bg-[#1c1c1c] border border-[#2a2a2a] rounded-sm text-xs font-mono text-[#ccc] hover:text-[#e8e8e8] hover:border-[#3a3a3a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {isPending
                  ? 'Guardando...'
                  : formMode === 'create'
                    ? 'Crear video'
                    : 'Guardar cambios'}
              </button>
              <button
                type="button"
                onClick={closeForm}
                disabled={isPending}
                className="px-4 py-2 text-xs font-mono text-[#444] hover:text-[#888] disabled:opacity-40 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Video table */}
      {videos.length === 0 ? (
        <div className="border border-[#1a1a1a] rounded-sm p-12 text-center">
          <p className="text-xs font-mono text-[#444]">No hay videos todavia</p>
          <p className="text-[10px] font-mono text-[#333] mt-1">
            Usa el boton &quot;Agregar video&quot; para empezar
          </p>
        </div>
      ) : (
        <div className="border border-[#1a1a1a] rounded-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1a1a1a]">
                <th className="px-4 py-3 text-left text-[10px] font-mono tracking-widest uppercase text-[#444] w-12">
                  #
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-mono tracking-widest uppercase text-[#444]">
                  Video
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-mono tracking-widest uppercase text-[#444]">
                  Categoria
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-mono tracking-widest uppercase text-[#444]">
                  Cliente
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-mono tracking-widest uppercase text-[#444] w-16">
                  Ano
                </th>
                <th className="px-4 py-3 text-center text-[10px] font-mono tracking-widest uppercase text-[#444] w-20">
                  Visible
                </th>
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#111]">
              {videos.map((video) => (
                <tr
                  key={video.id}
                  className="group hover:bg-[#0d0d0d] transition-colors"
                >
                  {/* Sort order */}
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-mono text-[#333]">
                      {video.sort_order}
                    </span>
                  </td>

                  {/* Thumbnail + title */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/vimeo-thumb?id=${video.vimeo_id}`}
                        alt={video.title}
                        width={56}
                        height={32}
                        className="w-14 h-8 object-cover rounded-sm bg-[#111] flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-mono text-[#ccc] truncate leading-tight">
                          {video.title}
                        </p>
                        <p className="text-[10px] font-mono text-[#444] truncate leading-tight mt-0.5">
                          {video.vimeo_id}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Category badge */}
                  <td className="px-4 py-3">
                    <span
                      className={[
                        'inline-block px-2 py-0.5 rounded-sm text-[10px] font-mono tracking-wide',
                        CATEGORY_BADGES[video.category] ?? 'bg-[#1c1c1c] text-[#555]',
                      ].join(' ')}
                    >
                      {video.category}
                    </span>
                  </td>

                  {/* Client */}
                  <td className="px-4 py-3">
                    <span className="text-xs font-mono text-[#888] truncate">
                      {video.client_name || '—'}
                    </span>
                  </td>

                  {/* Year */}
                  <td className="px-4 py-3">
                    <span className="text-xs font-mono text-[#555]">
                      {video.year || '—'}
                    </span>
                  </td>

                  {/* Visibility toggle */}
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleToggleVisibility(video)}
                      disabled={togglingId === video.id || isPending}
                      title={video.is_visible ? 'Ocultar video' : 'Mostrar video'}
                      className={[
                        'inline-flex items-center justify-center w-7 h-7 rounded-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
                        video.is_visible
                          ? 'text-[#888] hover:text-[#ccc] hover:bg-[#1a1a1a]'
                          : 'text-[#333] hover:text-[#555] hover:bg-[#111]',
                      ].join(' ')}
                    >
                      {video.is_visible ? (
                        <Eye size={13} strokeWidth={1.5} />
                      ) : (
                        <EyeOff size={13} strokeWidth={1.5} />
                      )}
                    </button>
                  </td>

                  {/* Edit / Delete */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => openEditForm(video)}
                        title="Editar video"
                        className="inline-flex items-center justify-center w-7 h-7 rounded-sm text-[#444] hover:text-[#ccc] hover:bg-[#1a1a1a] transition-colors"
                      >
                        <Pencil size={12} strokeWidth={1.5} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(video)}
                        disabled={deletingId === video.id || isPending}
                        title="Eliminar video"
                        className="inline-flex items-center justify-center w-7 h-7 rounded-sm text-[#444] hover:text-red-400 hover:bg-red-900/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <Trash2 size={12} strokeWidth={1.5} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
