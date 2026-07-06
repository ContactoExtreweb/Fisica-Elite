'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { enviarMensaje, marcarLeidos } from '@/app/chat/actions'

export type Mensaje = {
  id: string
  conversacion_id: string
  autor_id: string
  contenido: string
  created_at: string
}

type Props = {
  conversacionId: string
  miId: string
  mensajesIniciales: Mensaje[]
  // Para la cabecera opcional (nombre del interlocutor en el panel admin)
  titulo?: string
  subtitulo?: string
}

function hora(iso: string) {
  return new Date(iso).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function VentanaChat({
  conversacionId,
  miId,
  mensajesIniciales,
  titulo,
  subtitulo,
}: Props) {
  const [mensajes, setMensajes] = useState<Mensaje[]>(mensajesIniciales)
  const [error, setError] = useState<string | null>(null)
  const finRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const bajarDelTodo = useCallback(() => {
    finRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Suscripción en tiempo real a los mensajes de ESTA conversación.
  // La RLS de 'mensajes' garantiza que solo llegan los permitidos, pero
  // Realtime necesita el TOKEN del usuario para evaluarla: hay que fijarlo
  // ANTES de crear el canal, si no lo evalúa como anónimo y no envía nada.
  // La guarda 'cancelado' evita el doble montaje de React en desarrollo,
  // que era lo que provocaba el error 'callbacks after subscribe()'.
  useEffect(() => {
    const supabase = createClient()
    let cancelado = false
    let canal: ReturnType<typeof supabase.channel> | null = null

    ;(async () => {
      // 1 · Token PRIMERO (con await): el canal nace ya autenticado
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session?.access_token) {
        await supabase.realtime.setAuth(session.access_token)
      }

      // Si el efecto se limpió mientras esperábamos, no montamos el canal
      if (cancelado) return

      // 2 · Ahora sí, canal + suscripción
      canal = supabase
        .channel(`conversacion:${conversacionId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'mensajes',
            filter: `conversacion_id=eq.${conversacionId}`,
          },
          (payload) => {
            const nuevo = payload.new as Mensaje
            setMensajes((prev) => {
              if (prev.some((m) => m.id === nuevo.id)) return prev
              return [...prev, nuevo]
            })
          }
        )
        .subscribe()
    })()

    return () => {
      cancelado = true
      if (canal) supabase.removeChannel(canal)
    }
  }, [conversacionId])

  // Autoscroll y marcar leídos cuando cambian los mensajes
  useEffect(() => {
    bajarDelTodo()
    marcarLeidos(conversacionId, miId)
  }, [mensajes, conversacionId, miId, bajarDelTodo])

  // ENVÍO de disparo directo: cada mensaje se manda por su cuenta, sin
  // bloquear al siguiente (así dos mensajes seguidos NO se pierden).
  // Mostramos un eco optimista al instante y lo reconciliamos cuando
  // llega la fila real (por Realtime o por la respuesta del servidor).
  const enviar = useCallback(
    async (texto: string) => {
      const limpio = texto.trim()
      if (!limpio) return

      // 1 · Eco optimista con id temporal
      const tempId = `temp-${crypto.randomUUID()}`
      const optimista: Mensaje = {
        id: tempId,
        conversacion_id: conversacionId,
        autor_id: miId,
        contenido: limpio,
        created_at: new Date().toISOString(),
      }
      setMensajes((prev) => [...prev, optimista])

      // 2 · Enviar (no bloquea otros envíos)
      const res = await enviarMensaje(conversacionId, limpio)

      // 3 · Reconciliar: sustituir el temporal por el real, o quitarlo si falló
      setMensajes((prev) => {
        if (!res.ok) {
          setError(res.error)
          return prev.filter((m) => m.id !== tempId)
        }
        // Si Realtime ya insertó el real, quitamos solo el temporal;
        // si no, cambiamos el temporal por el real (evita duplicados).
        const yaEstaReal = prev.some((m) => m.id === res.mensaje.id)
        if (yaEstaReal) return prev.filter((m) => m.id !== tempId)
        return prev.map((m) => (m.id === tempId ? (res.mensaje as Mensaje) : m))
      })
    },
    [conversacionId, miId]
  )

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const input = inputRef.current
    if (!input) return
    const texto = input.value
    input.value = '' // limpiar YA, sin esperar al servidor
    input.focus()
    void enviar(texto) // fire-and-forget: no esperamos para permitir el siguiente
  }

  return (
    <div className="chat-ventana">
      {(titulo || subtitulo) && (
        <div className="chat-cabecera">
          {titulo && <div className="chat-cabecera-titulo">{titulo}</div>}
          {subtitulo && <div className="chat-cabecera-sub">{subtitulo}</div>}
        </div>
      )}

      <div className="chat-mensajes">
        {mensajes.length === 0 ? (
          <div className="chat-vacio">
            Aún no hay mensajes. Escribe el primero.
          </div>
        ) : (
          mensajes.map((m) => {
            const mio = m.autor_id === miId
            const enviando = m.id.startsWith('temp-')
            return (
              <div key={m.id} className={`chat-burbuja-fila ${mio ? 'mia' : ''}`}>
                <div
                  className={`chat-burbuja ${mio ? 'mia' : 'otro'}`}
                  style={enviando ? { opacity: 0.6 } : undefined}
                >
                  <div className="chat-texto">{m.contenido}</div>
                  <div className="chat-hora">{hora(m.created_at)}</div>
                </div>
              </div>
            )
          })
        )}
        <div ref={finRef} />
      </div>

      {error && <p className="form-error" style={{ margin: '0 16px' }}>{error}</p>}

      <form ref={formRef} className="chat-form" onSubmit={onSubmit}>
        <input
          ref={inputRef}
          type="text"
          name="contenido"
          placeholder="Escribe un mensaje…"
          autoComplete="off"
          maxLength={2000}
          className="chat-input"
        />
        <button type="submit" className="chat-enviar">
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </form>
    </div>
  )
}
