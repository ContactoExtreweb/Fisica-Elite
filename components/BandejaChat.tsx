'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export type ItemBandeja = {
  id: string
  estado: string
  last_message_at: string | null
  alumno: string
  iniciales: string
  ultimoMensaje: string | null
  sinLeer: number
}

function cuando(iso: string | null) {
  if (!iso) return 'Sin mensajes'
  const d = new Date(iso)
  const hoy = new Date()
  const mismoDia = d.toDateString() === hoy.toDateString()
  return mismoDia
    ? d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })
}

export default function BandejaChat({ inicial }: { inicial: ItemBandeja[] }) {
  // OJO: usamos 'inicial' directamente, NO useState. Si lo metiéramos en
  // estado, se congelaría en el primer valor y router.refresh() traería
  // datos nuevos del servidor pero la lista pintada no cambiaría nunca.
  const items = inicial
  const router = useRouter()

  // Cuando entra CUALQUIER mensaje nuevo, refrescamos la bandeja del
  // servidor (recalcula orden, no leídos y último texto). La RLS de admin
  // permite escuchar todos los mensajes, pero Realtime necesita el TOKEN
  // del usuario para evaluarla: hay que fijarlo ANTES de crear el canal.
  useEffect(() => {
    const supabase = createClient()
    let cancelado = false
    let canal: ReturnType<typeof supabase.channel> | null = null

    ;(async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session?.access_token) {
        await supabase.realtime.setAuth(session.access_token)
      }

      if (cancelado) return

      canal = supabase
        .channel('bandeja-admin')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'mensajes' },
          () => router.refresh()
        )
        .subscribe()
    })()

    return () => {
      cancelado = true
      if (canal) supabase.removeChannel(canal)
    }
  }, [router])

  if (items.length === 0) {
    return (
      <div className="admin-section">
        <div className="admin-tabla-vacia">
          Todavía no hay conversaciones. Aparecerán aquí cuando un alumno
          escriba desde su chat.
        </div>
      </div>
    )
  }

  return (
    <div className="chat-lista">
      {items.map((c) => (
        <Link key={c.id} href={`/admin/chat/${c.id}`} className="chat-lista-item">
          <div className="chat-lista-avatar">{c.iniciales}</div>
          <div className="chat-lista-cuerpo">
            <div className="chat-lista-fila1">
              <span className="chat-lista-nombre">{c.alumno}</span>
              <span className="chat-lista-hora">{cuando(c.last_message_at)}</span>
            </div>
            <div className="chat-lista-fila2">
              <span className="chat-lista-preview">
                {c.ultimoMensaje ?? 'Conversación abierta'}
              </span>
              {c.sinLeer > 0 && <span className="chat-badge">{c.sinLeer}</span>}
            </div>
          </div>
          {c.estado === 'cerrada' && <span className="chat-estado-cerrada">Cerrada</span>}
        </Link>
      ))}
    </div>
  )
}