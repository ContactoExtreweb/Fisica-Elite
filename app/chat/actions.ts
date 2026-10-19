'use server'

// Acciones del chat. Todo con el cliente del usuario (RLS): un alumno
// solo puede escribir en SU conversación; un admin, en cualquiera.
// El envío en tiempo real lo hace Realtime al detectar el INSERT.
import { revalidatePath } from 'next/cache'
import { after } from 'next/server'
import { redirect } from 'next/navigation'
import { exigirUsuario, exigirAdmin } from '@/lib/autorizacion'
import {
  prepararAviso,
  prepararAvisosAdmins,
  entregarAvisos,
  avisoMensaje,
  avisoAdminMensaje,
  type AvisoListo,
} from '@/lib/avisos'

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

/**
 * El ADMIN abre (o recupera) la conversación con un alumno concreto, y
 * entra directamente en ella. Hasta la migración 024 solo el alumno podía
 * crear su propia conversación, así que el preparador no tenía forma de
 * escribir el primero: tenía que esperar a que el alumno le hablara.
 */
export async function abrirConversacionConAlumno(alumnoId: string) {
  const { supabase } = await exigirAdmin()
  if (!alumnoId) throw new Error('Falta el alumno')

  const { data: existente } = await supabase
    .from('conversaciones')
    .select('id')
    .eq('user_id', alumnoId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existente) redirect(`/admin/chat/${existente.id}`)

  const { data: creada, error } = await supabase
    .from('conversaciones')
    .insert({ user_id: alumnoId })
    .select('id')
    .single()

  if (error || !creada) throw new Error('No se pudo abrir la conversación')
  redirect(`/admin/chat/${creada.id}`)
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

  // Aviso a la otra parte (correo y push), en los dos sentidos. Las
  // consultas van AQUÍ, dentro de la petición, porque usan la sesión; lo
  // que se deja para after() es solo hablar con Resend y OneSignal, que es
  // lo lento y no debe hacer esperar al chat.
  const pendientes = await avisosDeMensaje(supabase, conversacionId, user.id)
  if (pendientes.length > 0) after(() => entregarAvisos(pendientes))

  return { ok: true, mensaje: data }
}

/**
 * Prepara el aviso de "mensaje nuevo" para la OTRA parte: si escribe el
 * preparador, para el alumno; si escribe el alumno, para el preparador.
 *
 * Solo avisa con el PRIMER mensaje sin leer de esa parte: así una ráfaga de
 * tres mensajes seguidos es un aviso y no tres.
 */
async function avisosDeMensaje(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  conversacionId: string,
  autorId: string
): Promise<AvisoListo[]> {
  try {
    const { data: conv } = await supabase
      .from('conversaciones')
      .select('user_id')
      .eq('id', conversacionId)
      .single()
    if (!conv) return []
    const alumnoId = conv.user_id as string
    const escribeElAlumno = alumnoId === autorId

    // ¿Había ya mensajes sin leer de esta misma parte? El que se acaba de
    // insertar ya cuenta, así que más de uno = ya se avisó antes.
    const consulta = supabase
      .from('mensajes')
      .select('id', { count: 'exact', head: true })
      .eq('conversacion_id', conversacionId)
      .eq('leido', false)
    const { count } = await (escribeElAlumno
      ? consulta.eq('autor_id', alumnoId)
      : consulta.neq('autor_id', alumnoId))
    if ((count ?? 0) > 1) return []

    if (!escribeElAlumno) {
      const uno = await prepararAviso(supabase, alumnoId, avisoMensaje)
      return uno ? [uno] : []
    }

    // Escribe el alumno: al preparador le llega con su nombre.
    const { data: perfil } = await supabase
      .from('profiles')
      .select('nombre, apellidos')
      .eq('id', alumnoId)
      .single()
    const quien =
      [perfil?.nombre, perfil?.apellidos].filter(Boolean).join(' ').trim() || 'Un alumno'
    return await prepararAvisosAdmins(avisoAdminMensaje(quien))
  } catch (e) {
    console.error('[chat] no se pudo preparar el aviso', e)
    return []
  }
}

/**
 * Marca como leídos los mensajes de la conversación escritos por OTROS.
 * "Otros" se calcula con la SESIÓN, no con un id que mande el navegador (antes
 * llegaba como argumento y cualquiera podía mandar el que quisiera).
 */
export async function marcarLeidos(conversacionId: string) {
  const { supabase, user } = await exigirUsuario()
  await supabase
    .from('mensajes')
    .update({ leido: true })
    .eq('conversacion_id', conversacionId)
    .neq('autor_id', user.id)
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
