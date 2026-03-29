'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Send } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { DeliverableCommentWithUser } from '@/lib/supabase/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(name: string | null): string {
  if (!name) return '?'
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

// ---------------------------------------------------------------------------
// Avatar
// ---------------------------------------------------------------------------

interface AvatarProps {
  fullName: string | null
  avatarUrl: string | null
}

function Avatar({ fullName, avatarUrl }: AvatarProps) {
  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt={fullName ?? 'Usuario'}
        width={28}
        height={28}
        className="w-7 h-7 rounded-full object-cover shrink-0"
      />
    )
  }
  return (
    <span className="w-7 h-7 rounded-full bg-zinc-700 border border-zinc-600 text-zinc-300 text-[10px] font-semibold flex items-center justify-center shrink-0 select-none">
      {getInitials(fullName)}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function CommentSkeleton() {
  return (
    <div className="flex gap-2.5 animate-pulse">
      <span className="w-7 h-7 rounded-full bg-zinc-800 shrink-0" />
      <div className="flex-1 space-y-1.5">
        <span className="block h-2.5 w-24 rounded bg-zinc-800" />
        <span className="block h-3 w-full rounded bg-zinc-800/70" />
        <span className="block h-3 w-3/4 rounded bg-zinc-800/50" />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface DeliverableCommentsProps {
  deliverableId: string
}

export default function DeliverableComments({ deliverableId }: DeliverableCommentsProps) {
  const supabase = createClient()
  const [comments, setComments] = useState<DeliverableCommentWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const listEndRef = useRef<HTMLDivElement>(null)

  // ── Initial fetch ──────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    async function fetchComments() {
      setLoading(true)
      const { data, error: fetchError } = await supabase
        .from('deliverable_comments')
        .select('*, user:profiles(full_name, avatar_url)')
        .eq('deliverable_id', deliverableId)
        .order('created_at', { ascending: true })

      if (cancelled) return
      if (fetchError) {
        setError('No se pudieron cargar los comentarios.')
      } else {
        setComments((data as DeliverableCommentWithUser[]) ?? [])
      }
      setLoading(false)
    }

    void fetchComments()
    return () => { cancelled = true }
  }, [deliverableId]) // supabase client is stable

  // ── Realtime subscription ──────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel(`deliverable_comments:${deliverableId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'deliverable_comments',
          filter: `deliverable_id=eq.${deliverableId}`,
        },
        async (payload) => {
          // Fetch the new comment with the joined profile to get author info
          const { data } = await supabase
            .from('deliverable_comments')
            .select('*, user:profiles(full_name, avatar_url)')
            .eq('id', (payload.new as { id: string }).id)
            .single()

          if (data) {
            setComments((prev) => {
              // Avoid duplicates if the INSERT was from the current user (already added optimistically)
              if (prev.some((c) => c.id === data.id)) return prev
              return [...prev, data as DeliverableCommentWithUser]
            })
          }
        }
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [deliverableId]) // supabase client is stable

  // ── Auto-scroll to bottom on new comment ──────────────────────────────────
  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments])

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || submitting) return

    setSubmitting(true)
    setError(null)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setError('Debes iniciar sesion para comentar.')
      setSubmitting(false)
      return
    }

    const { error: insertError } = await supabase
      .from('deliverable_comments')
      .insert({ deliverable_id: deliverableId, user_id: user.id, content: trimmed })

    if (insertError) {
      setError('No se pudo enviar el comentario.')
    } else {
      setText('')
    }

    setSubmitting(false)
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-3">
      {/* Comment list */}
      <div className="flex flex-col gap-3 max-h-64 overflow-y-auto pr-0.5">
        {loading ? (
          <>
            <CommentSkeleton />
            <CommentSkeleton />
          </>
        ) : comments.length === 0 ? (
          <p className="text-zinc-600 text-xs text-center py-2">Sin comentarios aun</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-2.5">
              <Avatar
                fullName={comment.user?.full_name ?? null}
                avatarUrl={comment.user?.avatar_url ?? null}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-0.5">
                  <span className="text-zinc-300 text-xs font-medium leading-none">
                    {comment.user?.full_name ?? 'Usuario'}
                  </span>
                  <span className="text-zinc-600 text-[10px] leading-none">
                    {formatDate(comment.created_at)}
                  </span>
                </div>
                <p className="text-zinc-400 text-xs leading-relaxed break-words">
                  {comment.content}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={listEndRef} />
      </div>

      {/* Error */}
      {error && (
        <p className="text-red-400 text-xs">{error}</p>
      )}

      {/* Input form */}
      <form onSubmit={handleSubmit} className="flex gap-2 mt-1">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              e.currentTarget.form?.requestSubmit()
            }
          }}
          placeholder="Escribe un comentario..."
          rows={2}
          className="flex-1 resize-none text-xs bg-zinc-800/60 border border-zinc-700 hover:border-zinc-600 focus:border-zinc-500 rounded-lg px-3 py-2 text-zinc-200 placeholder-zinc-600 outline-none transition-colors duration-150"
        />
        <button
          type="submit"
          disabled={submitting || !text.trim()}
          className="self-end inline-flex items-center justify-center w-8 h-8 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 hover:border-sky-500/30 text-sky-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 shrink-0"
          title="Enviar comentario"
        >
          <Send className="w-3.5 h-3.5" strokeWidth={2} />
        </button>
      </form>
    </div>
  )
}
