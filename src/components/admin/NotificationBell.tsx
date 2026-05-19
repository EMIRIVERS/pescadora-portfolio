'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Check } from 'lucide-react'
import { getNotifications, markAsRead, markAllAsRead } from '@/lib/actions/notifications'

interface Notification {
  id: string
  title: string
  body: string | null
  type: 'info' | 'success' | 'warning' | 'error'
  entity_type: string | null
  entity_id: string | null
  is_read: boolean
  created_at: string
}

const TYPE_COLOR: Record<string, string> = {
  info: '#0071E3',
  success: '#30D158',
  warning: '#FF9F0A',
  error: '#FF453A',
}

const ENTITY_HREF: Record<string, (id: string) => string> = {
  project: (id) => `/admin/projects/${id}`,
  client: (id) => `/admin/clients/${id}`,
  lead: (id) => `/admin/leads`,
  invoice: (id) => `/admin/invoices`,
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'ahora'
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.floor(h / 24)
  if (d === 1) return 'ayer'
  return `hace ${d} días`
}

const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif"

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [, startTransition] = useTransition()
  const panelRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const unread = notifications.filter((n) => !n.is_read).length

  async function load() {
    const data = await getNotifications(20)
    setNotifications(data as Notification[])
  }

  useEffect(() => {
    void load()
    const interval = setInterval(() => { void load() }, 30000)
    return () => clearInterval(interval)
  }, [])

  // Outside click
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', handler)
    return () => document.removeEventListener('pointerdown', handler)
  }, [open])

  function handleNotificationClick(n: Notification) {
    if (!n.is_read) {
      startTransition(async () => {
        await markAsRead(n.id)
        setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, is_read: true } : x))
      })
    }
    if (n.entity_type && n.entity_id && ENTITY_HREF[n.entity_type]) {
      router.push(ENTITY_HREF[n.entity_type](n.entity_id))
      setOpen(false)
    }
  }

  function handleMarkAll() {
    startTransition(async () => {
      await markAllAsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    })
  }

  return (
    <div ref={panelRef} style={{ position: 'relative' }}>
      {/* Bell button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 36,
          height: 36,
          borderRadius: 8,
          border: 'none',
          background: open ? 'var(--dash-border)' : 'transparent',
          color: 'var(--dash-text-secondary)',
          cursor: 'pointer',
          transition: 'background 0.15s, color 0.15s',
          fontFamily: FONT,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--dash-border)'; e.currentTarget.style.color = 'var(--dash-text-primary)' }}
        onMouseLeave={(e) => { if (!open) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--dash-text-secondary)' } }}
        title="Notificaciones"
      >
        <Bell size={16} strokeWidth={1.5} />
        {unread > 0 && (
          <span style={{
            position: 'absolute',
            top: 4,
            right: 4,
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: '#FF453A',
            border: '1.5px solid #111111',
          }} />
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 44,
          right: 0,
          width: 320,
          backgroundColor: 'var(--dash-surface-2)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 16,
          boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
          zIndex: 1000,
          overflow: 'hidden',
          fontFamily: FONT,
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px 12px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--dash-text-primary)' }}>Notificaciones</span>
              {unread > 0 && (
                <span style={{
                  backgroundColor: '#FF453A',
                  color: '#fff',
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: 10,
                }}>
                  {unread}
                </span>
              )}
            </div>
            {unread > 0 && (
              <button
                type="button"
                onClick={handleMarkAll}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  border: 'none',
                  background: 'transparent',
                  color: '#0071E3',
                  fontSize: 12,
                  cursor: 'pointer',
                  padding: 0,
                  fontFamily: FONT,
                }}
              >
                <Check size={12} strokeWidth={2} />
                Marcar todas
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--dash-text-tertiary)', fontSize: 13 }}>
                Sin notificaciones
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  style={{
                    display: 'flex',
                    gap: 10,
                    padding: '12px 16px',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    cursor: n.entity_type ? 'pointer' : 'default',
                    backgroundColor: n.is_read ? 'transparent' : 'rgba(0,113,227,0.05)',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.backgroundColor = 'rgba(255,255,255,0.04)' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.backgroundColor = n.is_read ? 'transparent' : 'rgba(0,113,227,0.05)' }}
                >
                  {/* Dot */}
                  <div style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: n.is_read ? '#3A3A3C' : (TYPE_COLOR[n.type] ?? '#0071E3'),
                    flexShrink: 0,
                    marginTop: 5,
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: n.is_read ? 400 : 500, color: n.is_read ? 'var(--dash-text-secondary)' : 'var(--dash-text-primary)', lineHeight: 1.4 }}>
                      {n.title}
                    </p>
                    {n.body && (
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--dash-text-tertiary)', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {n.body}
                      </p>
                    )}
                    <p style={{ margin: '4px 0 0', fontSize: 11, color: '#3A3A3C' }}>
                      {relativeTime(n.created_at)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
