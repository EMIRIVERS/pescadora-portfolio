'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function PortalLogoutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleLogout() {
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
    setLoading(false)
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-white text-xs font-medium transition-colors disabled:opacity-50 px-2 py-1.5 rounded-md hover:bg-zinc-800"
      title="Cerrar sesion"
    >
      <LogOut className="w-3.5 h-3.5" strokeWidth={2} />
      <span className="hidden sm:inline">Salir</span>
    </button>
  )
}
