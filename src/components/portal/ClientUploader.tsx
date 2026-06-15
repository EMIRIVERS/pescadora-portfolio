'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ClientUpload } from '@/lib/supabase/types'

// ---------------------------------------------------------------------------
// Cinematic brand tokens — black #050505 / cream #ede8e0 / red #e8341a
// ---------------------------------------------------------------------------
const S = {
  surface:    'var(--portal-surface)',
  surface2:   'var(--portal-surface-2)',
  border:     'var(--portal-border)',
  accent:     'var(--portal-accent)',
  cream:      'var(--portal-text)',
  strong:     'var(--portal-text-strong)',
  muted:      'var(--portal-text-muted)',
  dim:        'var(--portal-text-dim)',
  danger:     'var(--portal-danger)',
  serif:      'var(--portal-serif)',
  mono:       'var(--portal-mono)',
  sans:       'var(--portal-sans)',
} as const

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(isoStr: string): string {
  return new Date(isoStr).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Props {
  projectId: string
  clientId: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ClientUploader({ projectId, clientId }: Props) {
  // Memoize so the client identity is stable across renders — otherwise the
  // load effect below re-runs on every render and re-fetches in a loop.
  const supabase = useMemo(() => createClient(), [])

  const [uploads, setUploads]         = useState<ClientUpload[]>([])
  const [loading, setLoading]         = useState(true)
  const [dragging, setDragging]       = useState(false)
  const [uploading, setUploading]     = useState(false)
  const [progress, setProgress]       = useState<string | null>(null)
  const [error, setError]             = useState<string | null>(null)
  const inputRef                      = useRef<HTMLInputElement>(null)

  // ---------------------------------------------------------------------------
  // Load existing uploads
  // ---------------------------------------------------------------------------

  useEffect(() => {
    let active = true
    const run = async () => {
      const { data, error: fetchError } = await supabase
        .from('client_uploads')
        .select('*')
        .eq('project_id', projectId)
        .eq('client_id', clientId)
        .order('uploaded_at', { ascending: false })

      if (!active) return
      if (!fetchError && data) {
        setUploads(data as ClientUpload[])
      }
      setLoading(false)
    }
    void run()
    return () => { active = false }
  }, [supabase, projectId, clientId])

  // ---------------------------------------------------------------------------
  // Upload handler
  // ---------------------------------------------------------------------------

  const handleFile = useCallback(async (file: File) => {
    if (uploading) return
    setError(null)

    const MAX_SIZE = 200 * 1024 * 1024 // 200 MB
    if (file.size > MAX_SIZE) {
      setError('El archivo excede el límite de 200 MB.')
      return
    }

    const BLOCKED = /\.(html?|svg|js|mjs|cjs|exe|sh|bat|cmd|php|asp|aspx|jsp)$/i
    if (BLOCKED.test(file.name)) {
      setError('Formato no permitido. Sube imágenes, PDFs o videos.')
      return
    }

    setUploading(true)
    setProgress(`Subiendo ${file.name}…`)

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = `client-uploads/${projectId}/${Date.now()}_${safeName}`

    const { error: storageError } = await supabase.storage
      .from('media')
      .upload(storagePath, file, { upsert: false })

    if (storageError) {
      setError(`Error al subir: ${storageError.message}`)
      setUploading(false)
      setProgress(null)
      return
    }

    const { data: publicData } = supabase.storage
      .from('media')
      .getPublicUrl(storagePath)

    const fileUrl = publicData.publicUrl

    const { data: row, error: insertError } = await supabase
      .from('client_uploads')
      .insert({
        project_id: projectId,
        client_id:  clientId,
        file_name:  file.name,
        file_url:   fileUrl,
        file_size:  file.size,
      })
      .select('*')
      .single()

    if (insertError || !row) {
      // Roll back the orphaned storage object so it doesn't linger invisibly.
      await supabase.storage.from('media').remove([storagePath])
      setError(`Error al registrar el archivo: ${insertError?.message ?? 'desconocido'}`)
    } else {
      setUploads((prev) => [row as ClientUpload, ...prev])
    }

    setUploading(false)
    setProgress(null)
  }, [supabase, projectId, clientId, uploading])

  // ---------------------------------------------------------------------------
  // Drag & Drop
  // ---------------------------------------------------------------------------

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(true)
  }, [])

  const onDragLeave = useCallback(() => {
    setDragging(false)
  }, [])

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) void handleFile(file)
  }, [handleFile])

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) void handleFile(file)
    // Reset input so the same file can be re-uploaded if needed
    e.target.value = ''
  }, [handleFile])

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div style={{ fontFamily: S.sans }}>

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
        className="cu-dropzone"
        data-dragging={dragging ? 'true' : 'false'}
        style={{
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          justifyContent: 'center',
          gap:            '0.9rem',
          padding:        'clamp(2.4rem, 6vw, 3.4rem) 1.5rem',
          borderRadius:   '6px',
          border:         `1px dashed ${dragging ? S.accent : S.border}`,
          background:     dragging ? 'rgba(232,52,26,0.05)' : S.surface,
          cursor:         uploading ? 'not-allowed' : 'pointer',
          transition:     'border-color 0.3s ease, background 0.3s ease',
          userSelect:     'none',
          outline:        'none',
        }}
      >
        {uploading ? (
          <>
            <div
              style={{
                width:        28,
                height:       28,
                border:       `2px solid ${S.accent}`,
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation:    'cu-spin 0.7s linear infinite',
              }}
            />
            <p
              style={{
                margin: 0,
                fontFamily: S.mono,
                fontSize: '0.64rem',
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: S.muted,
              }}
            >
              {progress}
            </p>
            {/* Indeterminate progress bar — red accent */}
            <div style={{ width: '100%', maxWidth: 260, height: 2, background: S.surface2, overflow: 'hidden' }}>
              <div className="cu-progress" style={{ height: '100%', background: S.accent }} />
            </div>
          </>
        ) : (
          <>
            <svg
              width="30"
              height="30"
              viewBox="0 0 24 24"
              fill="none"
              stroke={dragging ? S.accent : S.dim}
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              style={{ transition: 'stroke 0.3s ease' }}
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p
              style={{
                margin: 0,
                fontFamily: S.sans,
                fontSize: '0.92rem',
                color: S.cream,
                textAlign: 'center',
                lineHeight: 1.5,
              }}
            >
              Arrastra un archivo aquí o{' '}
              <span style={{ color: S.accent, fontWeight: 500 }}>haz clic para seleccionar</span>
            </p>
            <p
              style={{
                margin: 0,
                fontFamily: S.mono,
                fontSize: '0.58rem',
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: S.dim,
              }}
            >
              Cualquier formato · máximo 200 MB
            </p>
          </>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="*"
        style={{ display: 'none' }}
        onChange={onFileChange}
        disabled={uploading}
      />

      {/* Keyframes + hover styles */}
      <style>{`
        @keyframes cu-spin { to { transform: rotate(360deg); } }
        @keyframes cu-indeterminate {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
        .cu-progress { width: 30%; animation: cu-indeterminate 1.1s ease-in-out infinite; }
        .cu-dropzone[data-dragging="false"]:hover { border-color: ${S.accent}; background: var(--portal-surface-2); }
        .cu-row { transition: border-color 0.25s ease, background 0.25s ease; }
        .cu-row:hover { border-color: rgba(237,232,224,0.28); background: var(--portal-surface-2); }
        .cu-download:hover { color: ${S.accent}; }
      `}</style>

      {/* Error message */}
      {error && (
        <div
          style={{
            marginTop:    '0.9rem',
            padding:      '0.7rem 1rem',
            borderRadius: '4px',
            background:   'rgba(232,52,26,0.08)',
            border:       `1px solid rgba(232,52,26,0.30)`,
            fontFamily:   S.sans,
            fontSize:     '0.85rem',
            color:        S.danger,
          }}
        >
          {error}
        </div>
      )}

      {/* File list */}
      <div style={{ marginTop: '1.6rem' }}>
        {loading ? (
          <p
            style={{
              fontFamily: S.mono,
              fontSize: '0.6rem',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: S.dim,
              margin: 0,
            }}
          >
            Cargando archivos…
          </p>
        ) : uploads.length === 0 ? (
          <p
            style={{
              fontFamily: S.serif,
              fontStyle: 'italic',
              fontSize: '1.05rem',
              color: S.muted,
              margin: 0,
            }}
          >
            Aún no has subido ningún archivo para este proyecto.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {uploads.map((upload) => (
              <FileRow key={upload.id} upload={upload} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// FileRow sub-component
// ---------------------------------------------------------------------------

function FileRow({ upload }: { upload: ClientUpload }) {
  return (
    <div
      className="cu-row"
      style={{
        display:      'flex',
        alignItems:   'center',
        gap:          '0.9rem',
        padding:      '0.85rem 1rem',
        borderRadius: '4px',
        background:   S.surface,
        border:       `1px solid ${S.border}`,
      }}
    >
      {/* File icon */}
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke={S.dim}
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        style={{ flexShrink: 0 }}
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin:       0,
            fontFamily:   S.sans,
            fontSize:     '0.92rem',
            fontWeight:   500,
            color:        S.cream,
            overflow:     'hidden',
            textOverflow: 'ellipsis',
            whiteSpace:   'nowrap',
          }}
        >
          {upload.file_name}
        </p>
        <p
          style={{
            margin:        '0.3rem 0 0',
            fontFamily:    S.mono,
            fontSize:      '0.58rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color:         S.dim,
          }}
        >
          {upload.file_size != null ? formatBytes(upload.file_size) + ' · ' : ''}
          {formatDate(upload.uploaded_at)}
        </p>
      </div>

      {/* Download link */}
      <a
        href={upload.file_url}
        download={upload.file_name}
        target="_blank"
        rel="noopener noreferrer"
        title="Descargar"
        aria-label={`Descargar ${upload.file_name}`}
        className="cu-download"
        style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          flexShrink:     0,
          width:          34,
          height:         34,
          borderRadius:   '4px',
          color:          S.muted,
          textDecoration: 'none',
          transition:     'color 0.25s ease',
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      </a>
    </div>
  )
}
