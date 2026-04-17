'use client'

import { useCallback, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ClientUpload } from '@/lib/supabase/types'

// ---------------------------------------------------------------------------
// Design tokens
// ---------------------------------------------------------------------------
const S = {
  surface:       '#18181b',
  surfaceHover:  '#27272a',
  border:        'rgba(255,255,255,0.08)',
  borderFocus:   '#0071E3',
  textPrimary:   '#f4f4f5',
  textSecondary: '#a1a1aa',
  textTertiary:  '#71717a',
  accent:        '#0071E3',
  danger:        '#FF453A',
  success:       '#30D158',
  font:          "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
} as const

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatBytes(bytes: number | null): string {
  if (bytes === null || bytes === undefined) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

/** Infer a broad mime category from the file extension (no mime_type column in DB). */
function inferMimeCategory(fileName: string): 'image' | 'video' | 'pdf' | 'other' {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'svg', 'bmp', 'tiff', 'heic'].includes(ext)) return 'image'
  if (['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v', 'mxf'].includes(ext)) return 'video'
  if (ext === 'pdf') return 'pdf'
  return 'other'
}

// ---------------------------------------------------------------------------
// SVG icons (inline — no icon library)
// ---------------------------------------------------------------------------

function IconUpload({ size = 32, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}

function IconDownload({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

function IconTrash({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  )
}

function IconSearch({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function IconFilePdf({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="#FF6B6B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="12" y2="17" />
    </svg>
  )
}

function IconFileVideo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="#A78BFA" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <polygon points="10 11 16 14 10 17 10 11" />
    </svg>
  )
}

function IconFileGeneric({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="#71717a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type UploadWithProject = ClientUpload & {
  project: { id: string; title: string } | null
}

interface Project {
  id: string
  title: string
}

interface Props {
  initialUploads: UploadWithProject[]
  projects: Project[]
  clientId: string
}

// ---------------------------------------------------------------------------
// File thumbnail / icon card
// ---------------------------------------------------------------------------

function FileIcon({ fileName, fileUrl }: { fileName: string; fileUrl: string }) {
  const category = inferMimeCategory(fileName)

  if (category === 'image') {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={fileUrl}
        alt={fileName}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
        }}
        loading="lazy"
        onError={(e) => {
          const target = e.currentTarget
          target.style.display = 'none'
          const parent = target.parentElement
          if (parent) {
            const fallback = document.createElement('div')
            fallback.style.cssText = 'width:100%;height:100%;display:flex;align-items:center;justify-content:center;'
            fallback.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#71717a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>'
            parent.appendChild(fallback)
          }
        }}
      />
    )
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {category === 'pdf'   && <IconFilePdf size={28} />}
      {category === 'video' && <IconFileVideo size={28} />}
      {category === 'other' && <IconFileGeneric size={28} />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// File card
// ---------------------------------------------------------------------------

function FileCard({
  upload,
  onDelete,
  deleting,
}: {
  upload: UploadWithProject
  onDelete: (id: string, fileUrl: string) => void
  deleting: boolean
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background:    hovered ? S.surfaceHover : S.surface,
        border:        `1px solid ${S.border}`,
        borderRadius:  12,
        overflow:      'hidden',
        opacity:       deleting ? 0.4 : 1,
        transition:    'background 0.15s ease, opacity 0.2s ease',
        display:       'flex',
        flexDirection: 'column',
      }}
    >
      {/* Thumbnail area */}
      <div style={{
        width:           '100%',
        height:          140,
        background:      '#09090b',
        overflow:        'hidden',
        flexShrink:      0,
        borderBottom:    `1px solid ${S.border}`,
      }}>
        <FileIcon fileName={upload.file_name} fileUrl={upload.file_url} />
      </div>

      {/* Info */}
      <div style={{ padding: '10px 12px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <p style={{
          margin:       0,
          fontSize:     13,
          fontWeight:   600,
          color:        S.textPrimary,
          overflow:     'hidden',
          textOverflow: 'ellipsis',
          whiteSpace:   'nowrap',
          fontFamily:   S.font,
        }}>
          {upload.file_name}
        </p>

        {upload.project && (
          <p style={{ margin: 0, fontSize: 11, color: S.accent, fontFamily: S.font, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {upload.project.title}
          </p>
        )}

        <p style={{ margin: 0, fontSize: 11, color: S.textTertiary, fontFamily: S.font }}>
          {formatBytes(upload.file_size)}
          {upload.file_size ? ' · ' : ''}
          {formatDate(upload.uploaded_at)}
        </p>

        {/* Actions */}
        <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
          <a
            href={upload.file_url}
            download={upload.file_name}
            target="_blank"
            rel="noopener noreferrer"
            title="Descargar"
            style={{
              flex:           1,
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              gap:            6,
              height:         30,
              borderRadius:   6,
              background:     'rgba(0,113,227,0.12)',
              border:         '1px solid rgba(0,113,227,0.25)',
              color:          S.accent,
              fontSize:       12,
              fontWeight:     500,
              textDecoration: 'none',
              fontFamily:     S.font,
              cursor:         'pointer',
            }}
          >
            <IconDownload size={13} />
            Descargar
          </a>

          <button
            onClick={() => onDelete(upload.id, upload.file_url)}
            disabled={deleting}
            title="Eliminar archivo"
            style={{
              width:          30,
              height:         30,
              borderRadius:   6,
              background:     'rgba(255,69,58,0.10)',
              border:         '1px solid rgba(255,69,58,0.20)',
              color:          S.danger,
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              cursor:         deleting ? 'not-allowed' : 'pointer',
              flexShrink:     0,
            }}
          >
            <IconTrash size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Drop-zone uploader (standalone — project chosen from select)
// ---------------------------------------------------------------------------

function GalleryUploader({
  clientId,
  projects,
  onUploaded,
}: {
  clientId: string
  projects: Project[]
  onUploaded: (upload: UploadWithProject) => void
}) {
  const supabase    = createClient()
  const inputRef    = useRef<HTMLInputElement>(null)
  const [dragging, setDragging]   = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress]   = useState<string | null>(null)
  const [error, setError]         = useState<string | null>(null)
  const [projectId, setProjectId] = useState<string>(projects[0]?.id ?? '')

  const handleFile = useCallback(async (file: File) => {
    if (uploading) return
    if (!projectId) { setError('Selecciona un proyecto antes de subir.'); return }
    setError(null)

    const MAX = 200 * 1024 * 1024
    if (file.size > MAX) { setError('El archivo excede el limite de 200 MB.'); return }

    setUploading(true)
    setProgress(`Subiendo ${file.name}...`)

    const safeName    = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = `client-uploads/${projectId}/${Date.now()}_${safeName}`

    const { error: storageErr } = await supabase.storage
      .from('media')
      .upload(storagePath, file, { upsert: false })

    if (storageErr) {
      setError(`Error al subir: ${storageErr.message}`)
      setUploading(false)
      setProgress(null)
      return
    }

    const { data: publicData } = supabase.storage.from('media').getPublicUrl(storagePath)

    const { data: row, error: insertErr } = await supabase
      .from('client_uploads')
      .insert({
        project_id: projectId,
        client_id:  clientId,
        file_name:  file.name,
        file_url:   publicData.publicUrl,
        file_size:  file.size,
      })
      .select('*, project:projects(id, title)')
      .single()

    if (insertErr || !row) {
      setError(`Error al registrar: ${insertErr?.message ?? 'desconocido'}`)
    } else {
      onUploaded(row as UploadWithProject)
    }

    setUploading(false)
    setProgress(null)
  }, [supabase, projectId, clientId, uploading, onUploaded])

  const onDragOver  = useCallback((e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); setDragging(true) }, [])
  const onDragLeave = useCallback(() => setDragging(false), [])
  const onDrop      = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) void handleFile(file)
  }, [handleFile])
  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) void handleFile(file)
    e.target.value = ''
  }, [handleFile])

  return (
    <div style={{ fontFamily: S.font }}>
      {/* Project selector */}
      {projects.length > 1 && (
        <div style={{ marginBottom: 10 }}>
          <label style={{ display: 'block', fontSize: 12, color: S.textSecondary, marginBottom: 6 }}>
            Subir a proyecto:
          </label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            style={{
              background: S.surface, border: `1px solid ${S.border}`, borderRadius: 8,
              color: S.textPrimary, fontSize: 13, padding: '7px 12px', width: '100%',
              fontFamily: S.font, outline: 'none',
            }}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </div>
      )}

      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click() }}
        aria-label="Subir archivo"
        style={{
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          justifyContent: 'center',
          gap:            8,
          padding:        '28px 24px',
          borderRadius:   12,
          border:         `2px dashed ${dragging ? S.borderFocus : S.border}`,
          background:     dragging ? 'rgba(0,113,227,0.06)' : S.surface,
          cursor:         uploading ? 'not-allowed' : 'pointer',
          transition:     'border-color 0.15s, background 0.15s',
          userSelect:     'none',
          outline:        'none',
        }}
      >
        {uploading ? (
          <>
            <div style={{
              width: 26, height: 26,
              border: `2px solid ${S.accent}`, borderTopColor: 'transparent',
              borderRadius: '50%', animation: 'archivos-spin 0.7s linear infinite',
            }} />
            <p style={{ margin: 0, fontSize: 13, color: S.textSecondary }}>{progress}</p>
          </>
        ) : (
          <>
            <IconUpload size={26} color={dragging ? S.accent : S.textTertiary} />
            <p style={{ margin: 0, fontSize: 13, color: S.textSecondary, textAlign: 'center' }}>
              Arrastra un archivo o{' '}
              <span style={{ color: S.accent, fontWeight: 600 }}>haz clic para seleccionar</span>
            </p>
            <p style={{ margin: 0, fontSize: 12, color: S.textTertiary }}>Cualquier tipo — max 200 MB</p>
          </>
        )}
      </div>

      <input ref={inputRef} type="file" accept="*" style={{ display: 'none' }}
        onChange={onFileChange} disabled={uploading} />

      <style>{`
        @keyframes archivos-spin { to { transform: rotate(360deg); } }
      `}</style>

      {error && (
        <div style={{
          marginTop: 10, padding: '9px 12px', borderRadius: 8,
          background: 'rgba(255,69,58,0.10)', border: '1px solid rgba(255,69,58,0.25)',
          fontSize: 13, color: S.danger,
        }}>
          {error}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main gallery component
// ---------------------------------------------------------------------------

export default function ArchivosGallery({ initialUploads, projects, clientId }: Props) {
  const supabase = createClient()

  const [uploads, setUploads]         = useState<UploadWithProject[]>(initialUploads)
  const [search, setSearch]           = useState('')
  const [projectFilter, setProject]   = useState<string>('all')
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())

  // Client-side filtering
  const filtered = uploads.filter((u) => {
    const matchSearch  = u.file_name.toLowerCase().includes(search.toLowerCase())
    const matchProject = projectFilter === 'all' || u.project_id === projectFilter
    return matchSearch && matchProject
  })

  const handleUploaded = useCallback((upload: UploadWithProject) => {
    setUploads((prev) => [upload, ...prev])
  }, [])

  const handleDelete = useCallback(async (id: string, fileUrl: string) => {
    const confirmed = window.confirm('Eliminar este archivo permanentemente?')
    if (!confirmed) return

    // Optimistic remove
    setDeletingIds((prev) => new Set([...prev, id]))

    // Derive the storage path from the public URL
    // URL format: ...supabase.co/storage/v1/object/public/media/<path>
    const marker = '/object/public/media/'
    const markerIdx = fileUrl.indexOf(marker)
    const storagePath = markerIdx !== -1 ? fileUrl.slice(markerIdx + marker.length) : null

    if (storagePath) {
      await supabase.storage.from('media').remove([storagePath])
    }

    const { error: deleteErr } = await supabase
      .from('client_uploads')
      .delete()
      .eq('id', id)

    if (deleteErr) {
      // Rollback optimistic removal
      setDeletingIds((prev) => { const next = new Set(prev); next.delete(id); return next })
      alert(`Error al eliminar: ${deleteErr.message}`)
      return
    }

    setUploads((prev) => prev.filter((u) => u.id !== id))
    setDeletingIds((prev) => { const next = new Set(prev); next.delete(id); return next })
  }, [supabase])

  const isEmpty = uploads.length === 0

  return (
    <div style={{ fontFamily: S.font }}>
      {/* Upload section */}
      <section style={{
        background: S.surface, border: `1px solid ${S.border}`,
        borderRadius: 16, padding: '20px 24px', marginBottom: 32,
      }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600, color: S.textPrimary }}>
          Subir archivo
        </h2>
        {projects.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: S.textTertiary }}>
            No tienes proyectos activos para subir archivos.
          </p>
        ) : (
          <GalleryUploader
            clientId={clientId}
            projects={projects}
            onUploaded={handleUploaded}
          />
        )}
      </section>

      {/* Search + filter bar */}
      {!isEmpty && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
            <span style={{
              position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
              color: S.textTertiary, display: 'flex', alignItems: 'center', pointerEvents: 'none',
            }}>
              <IconSearch size={15} />
            </span>
            <input
              type="text"
              placeholder="Buscar por nombre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%', boxSizing: 'border-box',
                background: S.surface, border: `1px solid ${S.border}`,
                borderRadius: 8, color: S.textPrimary, fontSize: 13,
                padding: '8px 12px 8px 32px', fontFamily: S.font, outline: 'none',
              }}
            />
          </div>

          {/* Project filter */}
          {projects.length > 1 && (
            <select
              value={projectFilter}
              onChange={(e) => setProject(e.target.value)}
              style={{
                background: S.surface, border: `1px solid ${S.border}`, borderRadius: 8,
                color: S.textPrimary, fontSize: 13, padding: '8px 12px',
                fontFamily: S.font, outline: 'none', minWidth: 160,
              }}
            >
              <option value="all">Todos los proyectos</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Gallery */}
      {isEmpty ? (
        /* Empty state */
        <div style={{
          background: S.surface, border: `1px solid ${S.border}`,
          borderRadius: 16, padding: '56px 24px', textAlign: 'center',
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16, color: S.textTertiary }}>
            <IconUpload size={40} color={S.textTertiary} />
          </div>
          <p style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 500, color: S.textSecondary }}>
            Sube tus archivos de referencia aqui
          </p>
          <p style={{ margin: 0, fontSize: 13, color: S.textTertiary }}>
            Imagenes, videos, PDFs y cualquier otro archivo para tus proyectos
          </p>
        </div>
      ) : filtered.length === 0 ? (
        /* No results after filter */
        <div style={{
          background: S.surface, border: `1px solid ${S.border}`,
          borderRadius: 16, padding: '40px 24px', textAlign: 'center',
        }}>
          <p style={{ margin: 0, fontSize: 14, color: S.textSecondary }}>
            Ningun archivo coincide con tu busqueda.
          </p>
        </div>
      ) : (
        <>
          {/* Responsive grid */}
          <div style={{
            display:               'grid',
            gridTemplateColumns:   'repeat(auto-fill, minmax(200px, 1fr))',
            gap:                   14,
          }}>
            {filtered.map((upload) => (
              <FileCard
                key={upload.id}
                upload={upload}
                onDelete={handleDelete}
                deleting={deletingIds.has(upload.id)}
              />
            ))}
          </div>

          <p style={{ marginTop: 16, fontSize: 12, color: S.textTertiary, textAlign: 'right', fontFamily: S.font }}>
            {filtered.length} {filtered.length === 1 ? 'archivo' : 'archivos'}
            {filtered.length !== uploads.length && ` de ${uploads.length}`}
          </p>
        </>
      )}
    </div>
  )
}
