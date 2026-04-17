'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { Send, Trash2 } from 'lucide-react'
import { createProjectComment, deleteProjectComment } from '@/lib/actions/projects'
import type { ProjectComment } from '@/lib/actions/projects'

const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif"

interface Props {
  projectId: string
  initialComments: ProjectComment[]
  currentUserId: string
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  const days = Math.floor(hrs / 24)
  return `hace ${days}d`
}

function initials(name: string | null | undefined): string {
  if (!name) return '?'
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
}

export function ProjectComments({ projectId, initialComments, currentUserId }: Props) {
  const [comments, setComments] = useState<ProjectComment[]>(initialComments)
  const [draft, setDraft] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments.length])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!draft.trim()) return
    setError(null)
    const content = draft.trim()
    setDraft('')
    startTransition(async () => {
      const result = await createProjectComment(projectId, content)
      if (result.error) {
        setError(result.error)
        setDraft(content)
        return
      }
      // Optimistic add — real data comes via revalidatePath on next load
      setComments((prev) => [
        ...prev,
        {
          id: `tmp-${Date.now()}`,
          project_id: projectId,
          author_id: currentUserId,
          content,
          created_at: new Date().toISOString(),
          author: null,
        },
      ])
    })
  }

  function handleDelete(commentId: string) {
    if (!window.confirm('Eliminar comentario?')) return
    setComments((prev) => prev.filter((c) => c.id !== commentId))
    startTransition(async () => {
      await deleteProjectComment(commentId, projectId)
    })
  }

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--dash-text-primary)', fontFamily: FONT }}>
        Comentarios internos
      </h2>

      {/* Thread */}
      <div
        style={{
          backgroundColor: 'var(--dash-surface-2)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 16,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            maxHeight: 320,
            overflowY: 'auto',
            padding: comments.length > 0 ? '16px 20px' : 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          {comments.length === 0 && (
            <p style={{ margin: 0, padding: '20px 20px', fontSize: 13, color: '#3A3A3C', fontFamily: FONT }}>
              Sin comentarios. Se el primero en escribir.
            </p>
          )}
          {comments.map((c) => (
            <div key={c.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              {/* Avatar */}
              <div
                style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'var(--dash-surface-3)', border: '1px solid rgba(255,255,255,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, fontSize: 10, fontWeight: 600, color: 'var(--dash-text-secondary)', fontFamily: FONT,
                }}
              >
                {c.author?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.author.avatar_url}
                    alt=""
                    style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  initials(c.author?.full_name)
                )}
              </div>

              {/* Bubble */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--dash-text-primary)', fontFamily: FONT }}>
                    {c.author?.full_name ?? 'Tú'}
                  </span>
                  <span style={{ fontSize: 11, color: '#3A3A3C', fontFamily: FONT }}>
                    {timeAgo(c.created_at)}
                  </span>
                </div>
                <p
                  style={{
                    margin: 0, fontSize: 13, color: 'var(--dash-text-secondary)', fontFamily: FONT,
                    lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  }}
                >
                  {c.content}
                </p>
              </div>

              {/* Delete — only for own comments */}
              {c.author_id === currentUserId && (
                <button
                  onClick={() => handleDelete(c.id)}
                  style={{
                    border: 'none', background: 'transparent', color: '#3A3A3C',
                    cursor: 'pointer', padding: 4, borderRadius: 6, flexShrink: 0,
                  }}
                  title="Eliminar"
                >
                  <Trash2 size={12} strokeWidth={1.5} />
                </button>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={handleSubmit}
          style={{
            display: 'flex', gap: 8, alignItems: 'flex-end',
            padding: '10px 16px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(255,255,255,0.02)',
          }}
        >
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e as unknown as React.FormEvent)
              }
            }}
            placeholder="Escribe un comentario... (Enter para enviar)"
            rows={1}
            style={{
              flex: 1, background: 'var(--dash-surface-3)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8, padding: '7px 10px', fontSize: 13, color: 'var(--dash-text-primary)',
              fontFamily: FONT, outline: 'none', resize: 'none', lineHeight: 1.5,
              boxSizing: 'border-box',
            }}
          />
          <button
            type="submit"
            disabled={isPending || !draft.trim()}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 32, height: 32, background: draft.trim() ? '#0071E3' : 'var(--dash-surface-3)',
              border: 'none', borderRadius: 8, cursor: draft.trim() ? 'pointer' : 'not-allowed',
              color: '#fff', flexShrink: 0, transition: 'background 0.15s',
            }}
            title="Enviar (Enter)"
          >
            <Send size={13} strokeWidth={1.8} />
          </button>
        </form>
      </div>
      {error && <p style={{ margin: 0, fontSize: 12, color: '#FF453A', fontFamily: FONT }}>{error}</p>}
    </section>
  )
}
