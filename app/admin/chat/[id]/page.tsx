// Conversación individual en el panel del preparador.
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { cerrarConversacion } from '@/app/chat/actions'
import VentanaChat, { type Mensaje } from '@/components/VentanaChat'
import BorrarConversacion from '@/components/BorrarConversacion'

const NOMBRE_ESPECIALIDAD: Record<string, string> = {
  policia_local: 'Policía Local',
  policia_nacional: 'Policía Nacional',
  guardia_civil: 'Guardia Civil',
  fuerzas_armadas: 'Fuerzas Armadas',
}

export default async function AdminConversacionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: conv } = await supabase
    .from('conversaciones')
    .select('id, estado, user_id, profiles!inner(nombre, apellidos, especialidad, nivel)')
    .eq('id', id)
    .single()

  if (!conv) notFound()

  const p = Array.isArray(conv.profiles) ? conv.profiles[0] : conv.profiles

  const { data: mensajes } = await supabase
    .from('mensajes')
    .select('id, conversacion_id, autor_id, contenido, created_at')
    .eq('conversacion_id', id)
    .order('created_at', { ascending: true })

  const nombre =
    [p?.nombre, p?.apellidos].filter(Boolean).join(' ') || 'Alumno'
  const sub = p?.especialidad
    ? `${NOMBRE_ESPECIALIDAD[p.especialidad] ?? p.especialidad} · Nivel ${p.nivel}`
    : undefined

  return (
    <>
      <div style={{ fontSize: 13, color: 'var(--ink-muted)', marginBottom: 16 }}>
        <Link href="/admin/chat" style={{ color: 'var(--ink-muted)', fontWeight: 500 }}>
          ← Volver a mensajes
        </Link>
      </div>

      <div className="topbar" style={{ marginBottom: 20 }}>
        <div>
          <div className="greeting">Conversación</div>
          <h1 className="page-title">{nombre}</h1>
        </div>
        <div className="topbar-actions">
          {conv.estado !== 'cerrada' && (
            <form action={cerrarConversacion}>
              <input type="hidden" name="conversacion_id" value={id} />
              <button type="submit" className="btn-ghost-chat">
                Cerrar conversación
              </button>
            </form>
          )}
          <BorrarConversacion id={id} />
        </div>
      </div>

      <VentanaChat
        conversacionId={id}
        miId={user!.id}
        mensajesIniciales={(mensajes ?? []) as Mensaje[]}
        titulo={nombre}
        subtitulo={sub}
      />
    </>
  )
}
