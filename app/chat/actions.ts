'use server'

// Acciones del chat. Todo con el cliente del usuario (RLS): un alumno
// solo puede escribir en SU conversación; un admin, en cualquiera.
// El envío en tiempo real lo hace Realtime al detectar el INSERT.
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { exigirUsuario, exigirAdmin } from '@/lib/autorizacion'

/**
 * Devuelve la conversación abierta del alumno o crea una si no tiene.
 * (Regla del proyecto: una conversación por alumno con la bandeja admin.)
 */
export async function obtenerOCrearConversacion(): Promise<string> {
  const { supabase, user } = await exigirUsuario()

  // ¿Ya tiene una?
  const { data: existente } = await supabase
    .from('conversaciones')
    .select('id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existente) return existente.id

  // Crear (la RLS exige user_id = auth.uid())
  const { data: creada, error } = await supabase
    .from('conversaciones')
    .insert({ user_id: user.id })
    .select('id')
    .single()

  if (error || !creada) throw new Error('No se pudo abrir la conversación')
  return creada.id
}

export type EstadoChat = { error?: string }

/** Envía un mensaje. autor_id = quien escribe (lo valida también la RLS). */
export type ResultadoEnvio =
  | { ok: true; mensaje: MensajeEnviado }
  | { ok: false; error: string }

export type MensajeEnviado = {
  id: string
  conversacion_id: string
  autor_id: string
  contenido: string
  created_at: string
}

/**
 * Envía un mensaje. Recibe argumentos directos (no el formato de
 * useActionState) para poder llamarse en paralelo sin cuello de botella,
 * y devuelve la fila creada para el eco optimista del cliente.
 */
export async function enviarMensaje(
  conversacionId: string,
  contenido: string
): Promise<ResultadoEnvio> {
  const { supabase, user } = await exigirUsuario()

  const texto = (contenido ?? '').trim()
  if (!conversacionId) return { ok: false, error: 'Falta la conversación' }
  if (!texto) return { ok: false, error: 'Mensaje vacío' }
  if (texto.length > 2000) return { ok: false, error: 'Mensaje demasiado largo' }

  const { data, error } = await supabase
    .from('mensajes')
    .insert({
      conversacion_id: conversacionId,
      autor_id: user.id,
      contenido: texto,
    })
    .select('id, conversacion_id, autor_id, contenido, created_at')
    .single()

  if (error || !data) return { ok: false, error: 'No se pudo enviar el mensaje' }
  return { ok: true, mensaje: data }
}

/** Marca como leídos los mensajes de la conversación escritos por OTROS. */
export async function marcarLeidos(conversacionId: string, miId: string) {
  const { supabase } = await exigirUsuario()
  await supabase
    .from('mensajes')
    .update({ leido: true })
    .eq('conversacion_id', conversacionId)
    .neq('autor_id', miId)
    .eq('leido', false)
}

/** El admin cierra una conversación (se reabre sola si el alumno escribe). */
export async function cerrarConversacion(formData: FormData) {
  const { supabase } = await exigirAdmin()
  const id = String(formData.get('conversacion_id') ?? '')
  if (!id) return
  await supabase.from('conversaciones').update({ estado: 'cerrada' }).eq('id', id)
  revalidatePath('/admin/chat')
  revalidatePath(`/admin/chat/${id}`)
}

/**
 * El admin BORRA una conversación entera (con sus mensajes, por la FK
 * on delete cascade). La RLS 'conversaciones: borrar solo admin' lo
 * autoriza. Acción irreversible.
 */
export async function borrarConversacion(formData: FormData) {
  const { supabase } = await exigirAdmin()
  const id = String(formData.get('conversacion_id') ?? '')
  if (!id) return
  await supabase.from('conversaciones').delete().eq('id', id)
  revalidatePath('/admin/chat')
  redirect('/admin/chat')
}
