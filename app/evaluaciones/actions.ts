'use server'

// Subida de las "pruebas reales" del alumno.
//
// ⚠️ ESTO ES DISTINTO de la subida de vídeos del admin: aquí el que sube
// es un ALUMNO, y una firma TUS le da permiso para escribir en NUESTRA
// librería de Bunny. Antes de dársela hay que comprobar tres cosas, y
// las tres se comprueban AQUÍ, en el servidor:
//
//   1. Que tiene suscripción activa (si no paga, no sube nada).
//   2. Que la categoría es una de las que tiene CONTRATADAS.
//   3. Que no acumula pendientes: si no, alguien podría pedir firmas en
//      bucle y llenarnos la librería de vídeos basura.
//
// La API key de Bunny no sale del servidor en ningún momento: al
// navegador solo le llega una firma temporal para ESE vídeo concreto.
import { revalidatePath } from 'next/cache'
import { exigirUsuario } from '@/lib/autorizacion'
import { createAdminClient } from '@/lib/supabase/admin'
import { categoriasContratadas } from '@/lib/acceso'
import {
  ventanasActivas,
  ventanaAbiertaPara,
  misEvaluaciones,
  hoyMadrid,
} from '@/lib/evaluaciones'
import {
  bunnyConfigurado,
  crearVideoBunny,
  firmaSubidaTus,
  borrarVideoBunny,
  selloSubida,
  selloSubidaValido,
} from '@/lib/bunny'

/** Tope de evaluaciones sin revisar que puede tener a la vez. */
const MAX_PENDIENTES = 3

export type InicioSubida =
  | { error: string }
  | { guid: string; firma: string; expiracion: number; libraryId: string; sello: string }

/**
 * Comprueba acceso y categoría.
 *
 * Devuelve SIEMPRE la misma forma (con error a null si todo va bien) en
 * vez de una unión: con una unión, el `'error' in chequeo` de los
 * llamantes no estrecha el tipo y TypeScript se queja.
 */
async function comprobarPuedeSubir(categoriaId: string) {
  const { supabase, user } = await exigirUsuario()
  const hoy = hoyMadrid()

  const { data: subs } = await supabase
    .from('suscripciones')
    .select('id')
    .eq('user_id', user.id)
    .eq('estado', 'activa')
    .gte('fecha_fin', hoy)
    .limit(1)

  if (!subs || subs.length === 0) {
    return { error: 'Tu acceso no está activo.' as string | null, supabase, user }
  }

  const contratadas = await categoriasContratadas(supabase, user.id)
  if (!contratadas.some((c) => c.id === categoriaId)) {
    return { error: 'Esa categoría no está en tu plan.' as string | null, supabase, user }
  }

  // LA VENTANA SE COMPRUEBA AQUÍ, no solo deshabilitando el botón: el
  // botón es una comodidad para el alumno, esto es lo que de verdad
  // impide subir fuera de plazo.
  const ventanas = await ventanasActivas(supabase)
  const ventana = ventanaAbiertaPara(ventanas, categoriaId, hoy)
  if (!ventana) {
    return {
      error: 'Ahora mismo no hay ninguna prueba abierta. Tu preparador avisará cuando toque.' as
        | string
        | null,
      supabase,
      user,
    }
  }

  // Una prueba por categoría y ventana. Si se equivocó de vídeo, borra la
  // pendiente y vuelve a subir.
  const suyas = await misEvaluaciones(supabase, user.id)
  const yaSubida = suyas.some(
    (e) =>
      e.categoriaId === categoriaId &&
      e.fechaExamen >= ventana.inicio &&
      e.fechaExamen <= ventana.fin
  )
  if (yaSubida) {
    return {
      error: 'Ya has subido tu prueba de esta categoría en este plazo.' as string | null,
      supabase,
      user,
    }
  }

  return { error: null as string | null, supabase, user }
}

export async function iniciarSubidaEvaluacion(
  categoriaId: string,
  nombreArchivo: string
): Promise<InicioSubida> {
  if (!categoriaId) return { error: 'Falta la categoría' }

  const { error: noPuede, supabase, user } = await comprobarPuedeSubir(categoriaId)
  if (noPuede) return { error: noPuede }

  if (!bunnyConfigurado()) {
    return { error: 'La subida de vídeo no está disponible ahora mismo.' }
  }

  // Freno anti-abuso: cada firma crea un vídeo en Bunny, así que no se
  // reparten sin límite.
  const { count } = await supabase
    .from('evaluaciones')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('estado', 'pendiente')

  if ((count ?? 0) >= MAX_PENDIENTES) {
    return {
      error: `Tienes ${count} pruebas esperando corrección. Espera a que tu preparador las revise antes de subir otra.`,
    }
  }

  const guid = await crearVideoBunny(nombreArchivo || `evaluacion-${user.id}`)
  if (!guid) return { error: 'No se pudo preparar la subida. Inténtalo de nuevo.' }

  const { firma, expiracion, libraryId } = firmaSubidaTus(guid)
  // El sello liga ESTE vídeo con ESTE alumno (ver selloSubida en lib/bunny.ts)
  return { guid, firma, expiracion, libraryId, sello: selloSubida(user.id, guid) }
}

export async function confirmarEvaluacion(
  categoriaId: string,
  guid: string,
  notas: string,
  sello: string
): Promise<{ ok?: boolean; error?: string }> {
  if (!categoriaId || !guid) return { error: 'Datos incompletos' }

  const { error: noPuede, supabase, user } = await comprobarPuedeSubir(categoriaId)
  if (noPuede) return { error: noPuede }

  // El guid tiene que ser de un vídeo que ESTE alumno pidió subir. Si no, no
  // se registra NI se toca nada en Bunny: ese vídeo podría ser de otro (de un
  // ejercicio de pago, por ejemplo).
  if (!selloSubidaValido(user.id, guid, sello)) {
    return { error: 'No se pudo verificar la subida. Vuelve a subir el vídeo.' }
  }

  // La RLS ya exige user_id = auth.uid() al insertar; lo mandamos
  // explícito porque la columna no tiene default.
  const { error } = await supabase.from('evaluaciones').insert({
    user_id: user.id,
    categoria_id: categoriaId,
    video_id: guid,
    notas_alumno: notas.trim().slice(0, 1000) || null,
    estado: 'pendiente',
  })

  if (error) {
    // Si no se pudo guardar, el vídeo se queda huérfano en Bunny: fuera.
    await borrarVideoBunny(guid)
    return { error: 'No se pudo registrar la prueba. Inténtalo de nuevo.' }
  }

  revalidatePath('/evaluaciones')
  return { ok: true }
}

/**
 * Borra una prueba SUYA que aún no han corregido (se equivocó de vídeo).
 * La RLS de la 018 solo deja borrar las propias en estado 'pendiente';
 * aquí además se limpia el vídeo de Bunny, que la RLS no puede hacer.
 */
export async function borrarEvaluacionPendiente(
  id: string
): Promise<{ ok?: boolean; error?: string }> {
  const { supabase, user } = await exigirUsuario()
  if (!id) return { error: 'Falta la prueba' }

  const { data: ev } = await supabase
    .from('evaluaciones')
    .select('id, video_id, estado')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!ev) return { error: 'No se encontró esa prueba' }
  if (ev.estado !== 'pendiente') {
    return { error: 'Esta prueba ya está corregida y no se puede borrar.' }
  }

  const { error } = await supabase.from('evaluaciones').delete().eq('id', id)
  if (error) return { error: 'No se pudo borrar' }

  // Cinturón y tirantes: aunque el vídeo esté en una prueba, jamás se borra de
  // Bunny si además es el vídeo de un ejercicio. (Con el sello ya no debería
  // pasar, pero pruebas antiguas o un fallo futuro no deben poder destruir
  // contenido de pago.) Se mira con service_role: el alumno no ve esa tabla entera.
  if (ev.video_id) {
    const { data: esDeEjercicio } = await createAdminClient()
      .from('ejercicios')
      .select('id')
      .eq('video_id', ev.video_id)
      .limit(1)
    if (!esDeEjercicio || esDeEjercicio.length === 0) await borrarVideoBunny(ev.video_id)
  }

  revalidatePath('/evaluaciones')
  return { ok: true }
}
