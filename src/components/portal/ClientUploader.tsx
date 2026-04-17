'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ClientUpload } from '@/lib/supabase/types'

// ---------------------------------------------------------------------------
// Design tokens — portal uses a lighter palette on dark zinc background
// ---------------------------------------------------------------------------
const S = {
  surface:       '#18181b',   // zinc-900
  surfaceHover:  '#27272a',   // zinc-800
  border:        'rgba(255,255,255,0.08)',
  borderActive:  '#0071E3',
  textPrimary:   '#f4f4f5',   // zinc-100
  textSecondary: '#a1a1aa',   // zinc-400
  textTertiary:  '#71717a',   // zinc-500
  accent:        '#0071E3',
  accentHover:   '#0077ED',
  danger:        '#FF453A',
  success:       '#30D158',
  font:          "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
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
  const supabase = createClient()

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

  const loadUploads = useCallback(async () => {
    setLoading(true)
    const { data, error: fetchError } = await supabase
      .from('client_uploads')
      .select('*')
      .eq('project_id', projectId)
      .eq('client_id', clientId)
      .order('uploaded_at', { ascending: false })

    if (!fetchError && data) {
      setUploads(data as ClientUpload[])
    }
    setLoading(false)
  }, [supabase, projectId, clientId])

  useEffect(() => {
    void loadUploads()
  }, [loadUploads])

  // ---------------------------------------------------------------------------
  // Upload handler
  // ---------------------------------------------------------------------------

  const handleFile = useCallback(async (file: File) => {
    if (uploading) return
    setError(null)

    const MAX_SIZE = 200 * 1024 * 1024 // 200 MB
    if (file.size > MAX_SIZE) {
      setError('El archivo excede el limite de 200 MB.')
      return
    }

    setUploading(true)
    setProgress(`Subiendo ${file.name}...`)

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
    <div style={{ fontFamily: S.font }}>

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
          padding:        '32px 24px',
          borderRadius:   12,
          border:         `2px dashed ${dragging ? S.borderActive : S.border}`,
          background:     dragging ? 'rgba(0,113,227,0.06)' : S.surface,
          cursor:         uploading ? 'not-allowed' : 'pointer',
          transition:     'border-color 0.15s ease, background 0.15s ease',
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
                animation:    'spin 0.7s linear infinite',
              }}
            />
            <p style={{ margin: 0, fontSize: 14, color: S.textSecondary }}>{progress}</p>
          </>
        ) : (
          <>
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke={dragging ? S.accent : S.textTertiary}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p style={{ margin: 0, fontSize: 14, color: S.textSecondary, textAlign: 'center' }}>
              Arrastra un archivo aqui o{' '}
              <span style={{ color: S.accent, fontWeight: 600 }}>haz clic para seleccionar</span>
            </p>
            <p style={{ margin: 0, fontSize: 12, color: S.textTertiary }}>
              Cualquier tipo de archivo — maximo 200 MB
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

      {/* Spinner keyframes */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Error message */}
      {error && (
        <div
          style={{
            marginTop:  12,
            padding:    '10px 14px',
            borderRadius: 8,
            background: 'rgba(255,69,58,0.10)',
            border:     `1px solid rgba(255,69,58,0.25)`,
            fontSize:   13,
            color:      S.danger,
          }}
        >
          {error}
        </div>
      )}

      {/* File list */}
      <div style={{ marginTop: 20 }}>
        {loading ? (
          <p style={{ fontSize: 13, color: S.textTertiary, margin: 0 }}>Cargando archivos...</p>
        ) : uploads.length === 0 ? (
          <p style={{ fontSize: 13, color: S.textTertiary, margin: 0 }}>
            Aun no has subido ningun archivo para este proyecto.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
  const [hovered, setHovered] = useState(false)

  return (
    <div
      style={{
        display:      'flex',
        alignItems:   'center',
        gap:          12,
        padding:      '12px 14px',
        borderRadius: 10,
        background:   hovered ? S.surfaceHover : S.surface,
        border:       `1px solid ${S.border}`,
        transition:   'background 0.15s ease',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* File icon */}
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke={S.textTertiary}
        strokeWidth="1.5"
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
            fontSize:     14,
            fontWeight:   500,
            color:        S.textPrimary,
            overflow:     'hidden',
            textOverflow: 'ellipsis',
            whiteSpace:   'nowrap',
            fontFamily:   S.font,
          }}
        >
          {upload.file_name}
        </p>
        <p
          style={{
            margin:    '2px 0 0',
            fontSize:  12,
            color:     S.textTertiary,
            fontFamily: S.font,
          }}
        >
          {upload.file_size != null ? formatBytes(upload.file_size) + ' — ' : ''}
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
        style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          flexShrink:     0,
          width:          32,
          height:         32,
          borderRadius:   8,
          background:     hovered ? 'rgba(0,113,227,0.15)' : 'transparent',
          color:          S.accent,
          textDecoration: 'none',
          transition:     'background 0.15s ease',
        }}
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
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
