// Bandeja de conversaciones del preparador.
import { createClient } from '@/lib/supabase/server'
import BandejaChat, { type ItemBandeja } from '@/components/BandejaChat'

function iniciales(nombre?: string | null, apellidos?: string | null) {
  return ((nombre ?? '').charAt(0) + (apellidos ?? '').charAt(0)).toUpperCase() || '??'
}

export default async function AdminChatPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Conversaciones + datos del alumno (la RLS de admin deja ver todas)
  const { data: convs } = await supabase
    .from('conversaciones')
    .select('id, estado, last_message_at, user_id, profiles!inner(nombre, apellidos, username)')
    .order('last_message_at', { ascending: false, nullsFirst: false })

  // Para cada conversación, último mensaje y nº sin leer por el admin.
  // (Volumen bajo: bastan consultas simples por conversación.)
  const items: ItemBandeja[] = await Promise.all(
    (convs ?? []).map(async (c) => {
      // profiles!inner devuelve objeto (o array según versión); normalizamos
      const p = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles

      const { data: ultimo } = await supabase
        .from('mensajes')
        .select('contenido')
        .eq('conversacion_id', c.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      // Sin leer = mensajes del alumno (no míos) aún no marcados
      const { count } = await supabase
        .from('mensajes')
        .select('id', { count: 'exact', head: true })
        .eq('conversacion_id', c.id)
        .neq('autor_id', user!.id)
        .eq('leido', false)

      return {
        id: c.id,
        estado: c.estado,
        last_message_at: c.last_message_at,
        alumno:
          [p?.nombre, p?.apellidos].filter(Boolean).join(' ') ||
          p?.username ||
          'Alumno',
        iniciales: iniciales(p?.nombre, p?.apellidos),
        ultimoMensaje: ultimo?.contenido
          ? ultimo.contenido.length > 60
            ? ultimo.contenido.slice(0, 60) + '…'
            : ultimo.contenido
          : null,
        sinLeer: count ?? 0,
      }
    })
  )

  return (
    <>
      <div className="topbar">
        <div>
          <div className="greeting">Mensajes · {items.length} conversaciones</div>
          <h1 className="page-title">
            Chat con <em>alumnos.</em>
          </h1>
        </div>
      </div>

      <BandejaChat inicial={items} />
    </>
  )
}
