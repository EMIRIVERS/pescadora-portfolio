'use client'

import { useCallback, useRef, useState } from 'react'
import { Upload, Download, Trash2, Search, FileText, FileVideo, File as FileIconLucide } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { ClientUpload } from '@/lib/supabase/types'

// ---------------------------------------------------------------------------
// Design tokens — XICO cinematic-editorial brand (--portal-* CSS tokens)
// ---------------------------------------------------------------------------
const S = {
  surface:       'var(--portal-surface)',
  surfaceHover:  'var(--portal-surface-2)',
  thumbBg:       '#0a0a0a',
  border:        'var(--portal-border)',
  borderHover:   'var(--portal-border-hover)',
  borderFocus:   'var(--portal-accent)',
  textPrimary:   'var(--portal-text)',
  textSecondary: 'var(--portal-text-muted)',
  textTertiary:  'var(--portal-text-dim)',
  accent:        'var(--portal-accent)',
  danger:        'var(--portal-accent)',
  success:       'var(--portal-badge-paid-color)',
  font:          'var(--portal-sans)',
  sans:          'var(--portal-sans)',
  serif:         'var(--portal-serif)',
  mono:          'var(--portal-mono)',
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
            fallback.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6b6560" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>'
            parent.appendChild(fallback)
          }
        }}
      />
    )
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {category === 'pdf'   && <FileText size={28} color={S.accent} strokeWidth={1.5} aria-hidden="true" />}
      {category === 'video' && <FileVideo size={28} color={S.textSecondary} strokeWidth={1.5} aria-hidden="true" />}
      {category === 'other' && <FileIconLucide size={28} color={S.textTertiary} strokeWidth={1.5} aria-hidden="true" />}
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
        border:        `1px solid ${hovered ? S.borderHover : S.border}`,
        borderRadius:  6,
        overflow:      'hidden',
        opacity:       deleting ? 0.4 : 1,
        transition:    'background 0.35s ease, border-color 0.35s ease, opacity 0.2s ease',
        display:       'flex',
        flexDirection: 'column',
      }}
    >
      {/* Thumbnail area */}
      <div style={{
        width:           '100%',
        height:          150,
        background:      S.thumbBg,
        overflow:        'hidden',
        flexShrink:      0,
        borderBottom:    `1px solid ${S.border}`,
      }}>
        <FileIcon fileName={upload.file_name} fileUrl={upload.file_url} />
      </div>

      {/* Info */}
      <div style={{ padding: '0.85rem 0.95rem 0.95rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
        <p style={{
          margin:        0,
          fontFamily:    S.mono,
          fontSize:      '0.7rem',
          letterSpacing: '0.02em',
          color:         S.textPrimary,
          overflow:      'hidden',
          textOverflow:  'ellipsis',
          whiteSpace:    'nowrap',
        }}
        title={upload.file_name}
        >
          {upload.file_name}
        </p>

        {upload.project && (
          <p style={{ margin: 0, fontFamily: S.mono, fontSize: '0.56rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: S.accent, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {upload.project.title}
          </p>
        )}

        <p style={{ margin: 0, fontFamily: S.mono, fontSize: '0.58rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: S.textTertiary }}>
          {formatBytes(upload.file_size)}
          {upload.file_size ? ' · ' : ''}
          {formatDate(upload.uploaded_at)}
        </p>

        {/* Actions */}
        <div style={{ marginTop: '0.6rem', display: 'flex', gap: '0.45rem' }}>
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
              gap:            '0.5rem',
              minHeight:      44,
              borderRadius:   4,
              background:     'transparent',
              border:         `1px solid ${S.border}`,
              color:          S.textSecondary,
              fontFamily:     S.mono,
              fontSize:       '0.58rem',
              letterSpacing:  '0.16em',
              textTransform:  'uppercase',
              textDecoration: 'none',
              cursor:         'pointer',
              transition:     'border-color 0.25s ease, color 0.25s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = S.accent; e.currentTarget.style.color = S.accent }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = S.border; e.currentTarget.style.color = S.textSecondary }}
          >
            <Download size={13} strokeWidth={2} aria-hidden="true" />
            Descargar
          </a>

          <button
            onClick={() => onDelete(upload.id, upload.file_url)}
            disabled={deleting}
            title="Eliminar archivo"
            style={{
              width:          44,
              height:         44,
              borderRadius:   4,
              background:     'transparent',
              border:         `1px solid ${S.border}`,
              color:          S.textTertiary,
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              cursor:         deleting ? 'not-allowed' : 'pointer',
              flexShrink:     0,
              transition:     'border-color 0.25s ease, color 0.25s ease',
            }}
            onMouseEnter={(e) => { if (!deleting) { e.currentTarget.style.borderColor = S.danger; e.currentTarget.style.color = S.danger } }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = S.border; e.currentTarget.style.color = S.textTertiary }}
          >
            <Trash2 size={13} strokeWidth={2} aria-hidden="true" />
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
    if (file.size > MAX) { setError('El archivo excede el límite de 200 MB.'); return }

    // Bloquear extensiones ejecutables / XSS desde el bucket público (html/svg/js).
    // Las URLs son servidas desde supabase.co así que un .html con JS quedaría same-origin
    // del dominio de Storage, no del nuestro — pero igual rechazamos por defecto.
    const BLOCKED = /\.(html?|svg|js|mjs|cjs|exe|sh|bat|cmd|php|asp|aspx|jsp)$/i
    if (BLOCKED.test(file.name)) {
      setError('Formato no permitido. Sube imágenes, PDFs o videos.')
      return
    }

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
        <div style={{ marginBottom: '0.85rem' }}>
          <label style={{ display: 'block', fontFamily: S.mono, fontSize: '0.58rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: S.textSecondary, marginBottom: '0.55rem' }}>
            Subir a proyecto
          </label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            style={{
              background: 'transparent', border: `1px solid ${S.border}`, borderRadius: 4,
              color: S.textPrimary, fontFamily: S.mono, fontSize: '0.72rem', letterSpacing: '0.04em',
              padding: '0.6rem 0.8rem', width: '100%', outline: 'none',
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
          gap:            '0.7rem',
          padding:        'clamp(2rem, 5vw, 2.75rem) 1.5rem',
          borderRadius:   6,
          border:         `1px dashed ${dragging ? S.borderFocus : S.border}`,
          background:     dragging ? 'rgba(232,52,26,0.05)' : 'transparent',
          cursor:         uploading ? 'not-allowed' : 'pointer',
          transition:     'border-color 0.25s, background 0.25s',
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
            <p style={{ margin: 0, fontFamily: S.mono, fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: S.textSecondary }}>{progress}</p>
          </>
        ) : (
          <>
            <Upload size={28} color={dragging ? S.accent : S.textTertiary} strokeWidth={1.5} aria-hidden="true" />
            <p style={{ margin: 0, fontFamily: S.sans, fontSize: '0.9rem', color: S.textSecondary, textAlign: 'center' }}>
              Arrastra un archivo o{' '}
              <span style={{ color: S.accent }}>haz clic para seleccionar</span>
            </p>
            <p style={{ margin: 0, fontFamily: S.mono, fontSize: '0.56rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: S.textTertiary }}>Cualquier tipo — máx. 200 MB</p>
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
          marginTop: '0.8rem', padding: '0.7rem 0.9rem', borderRadius: 4,
          background: 'rgba(232,52,26,0.08)', border: '1px solid rgba(232,52,26,0.30)',
          fontFamily: S.sans, fontSize: '0.82rem', color: S.danger,
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
    const confirmed = window.confirm('¿Eliminar este archivo permanentemente?')
    if (!confirmed) return

    setDeletingIds((prev) => new Set([...prev, id]))

    // 1. Borrar primero el row de DB (RLS valida ownership).
    // Si el row se borra pero el archivo queda huérfano es preferible al
    // caso inverso: archivo borrado y URL en DB que apunta a 404.
    const { error: deleteErr } = await supabase
      .from('client_uploads')
      .delete()
      .eq('id', id)

    if (deleteErr) {
      setDeletingIds((prev) => { const next = new Set(prev); next.delete(id); return next })
      alert(`Error al eliminar: ${deleteErr.message}`)
      return
    }

    // 2. Best-effort: borrar el binario de Storage. Si falla queda huérfano
    // (limpiable con cron), pero la UX al usuario ya es correcta.
    const marker = '/object/public/media/'
    const markerIdx = fileUrl.indexOf(marker)
    const storagePath = markerIdx !== -1 ? fileUrl.slice(markerIdx + marker.length) : null
    if (storagePath) {
      await supabase.storage.from('media').remove([storagePath])
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
        borderRadius: 6, padding: 'clamp(1.4rem, 3vw, 1.9rem)', marginBottom: 'clamp(2.5rem, 5vw, 3.5rem)',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.7rem', marginBottom: '1.3rem' }}>
          <span style={{ fontFamily: S.mono, fontSize: '0.62rem', letterSpacing: '0.2em', color: S.accent }}>01</span>
          <span style={{ fontFamily: S.mono, fontSize: '0.62rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: S.textSecondary }}>
            Subir archivo
          </span>
        </div>
        {projects.length === 0 ? (
          <p style={{ margin: 0, fontFamily: S.sans, fontSize: '0.9rem', color: S.textTertiary }}>
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
        <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1.4rem', flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
            <span style={{
              position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
              color: S.textTertiary, display: 'flex', alignItems: 'center', pointerEvents: 'none',
            }}>
              <Search size={15} strokeWidth={2} aria-hidden="true" />
            </span>
            <input
              type="text"
              placeholder="Buscar por nombre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'transparent', border: `1px solid ${S.border}`,
                borderRadius: 4, color: S.textPrimary, fontFamily: S.mono,
                fontSize: '0.72rem', letterSpacing: '0.04em',
                padding: '0.7rem 0.85rem 0.7rem 2.2rem', outline: 'none',
              }}
            />
          </div>

          {/* Project filter */}
          {projects.length > 1 && (
            <select
              value={projectFilter}
              onChange={(e) => setProject(e.target.value)}
              style={{
                background: 'transparent', border: `1px solid ${S.border}`, borderRadius: 4,
                color: S.textPrimary, fontFamily: S.mono, fontSize: '0.72rem', letterSpacing: '0.04em',
                padding: '0.7rem 0.85rem', outline: 'none', minWidth: 170,
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
          border: `1px solid ${S.border}`, borderRadius: 6,
          padding: 'clamp(3rem, 8vw, 5rem) 2rem', textAlign: 'center',
        }}>
          <p style={{ fontFamily: S.serif, fontStyle: 'italic', fontSize: 'clamp(1.3rem, 3vw, 1.8rem)', color: S.textPrimary, margin: 0 }}>
            Aún no has subido archivos.
          </p>
          <p style={{ fontFamily: S.sans, fontSize: '0.9rem', color: S.textSecondary, margin: '0.9rem auto 0', maxWidth: '28rem', lineHeight: 1.6 }}>
            Imágenes, videos, PDFs y cualquier otra referencia para tus proyectos vivirán aquí.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        /* No results after filter */
        <div style={{
          border: `1px solid ${S.border}`, borderRadius: 6,
          padding: 'clamp(2.5rem, 6vw, 3.5rem) 2rem', textAlign: 'center',
        }}>
          <p style={{ fontFamily: S.serif, fontStyle: 'italic', fontSize: 'clamp(1.2rem, 2.6vw, 1.5rem)', color: S.textPrimary, margin: 0 }}>
            Ningún archivo coincide con tu búsqueda.
          </p>
        </div>
      ) : (
        <>
          {/* Responsive grid */}
          <div style={{
            display:               'grid',
            gridTemplateColumns:   'repeat(auto-fill, minmax(160px, 1fr))',
            gap:                   '0.9rem',
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

          <p style={{ marginTop: '1.3rem', fontFamily: S.mono, fontSize: '0.58rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: S.textTertiary, textAlign: 'right' }}>
            {filtered.length} {filtered.length === 1 ? 'archivo' : 'archivos'}
            {filtered.length !== uploads.length && ` de ${uploads.length}`}
          </p>
        </>
      )}
    </div>
  )
}
