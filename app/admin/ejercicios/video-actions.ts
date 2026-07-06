'use server'

// Actions de vídeo. La API key de Bunny nunca sale del servidor: al
// navegador solo le damos una firma TUS con caducidad para ESE vídeo.
import { revalidatePath } from 'next/cache'
import { exigirAdmin } from '@/lib/autorizacion'
import {
  bunnyConfigurado,
  crearVideoBunny,
  firmaSubidaTus,
  obtenerVideoBunny,
  borrarVideoBunny,
} from '@/lib/bunny'

export type InicioSubida =
  | { error: string }
  | { guid: string; firma: string; expiracion: number; libraryId: string }

export async function iniciarSubidaVideo(
  ejercicioId: string,
  nombreArchivo: string
): Promise<InicioSubida> {
  await exigirAdmin()

  if (!bunnyConfigurado()) {
    return { error: 'Bunny Stream no está configurado (revisa .env.local)' }
  }
  if (!ejercicioId) return { error: 'Falta el ejercicio' }

  const guid = await crearVideoBunny(nombreArchivo || `ejercicio-${ejercicioId}`)
  if (!guid) return { error: 'No se pudo crear el vídeo en Bunny' }

  const { firma, expiracion, libraryId } = firmaSubidaTus(guid)
  return { guid, firma, expiracion, libraryId }
}

export async function confirmarVideo(
  ejercicioId: string,
  guid: string
): Promise<{ ok?: boolean; error?: string }> {
  const { supabase } = await exigirAdmin()
  if (!ejercicioId || !guid) return { error: 'Datos incompletos' }

  // Si el ejercicio ya tenía un vídeo, lo borramos de Bunny (reemplazo)
  const { data: previo } = await supabase
    .from('ejercicios')
    .select('video_id')
    .eq('id', ejercicioId)
    .single()

  if (previo?.video_id && previo.video_id !== guid) {
    await borrarVideoBunny(previo.video_id)
  }

  // Duración si Bunny ya la conoce (puede tardar mientras procesa)
  const info = await obtenerVideoBunny(guid)

  const { error } = await supabase
    .from('ejercicios')
    .update({
      video_id: guid,
      video_duracion: info?.length ? info.length : null,
    })
    .eq('id', ejercicioId)

  if (error) return { error: 'No se pudo asociar el vídeo al ejercicio' }

  revalidatePath(`/admin/ejercicios/${ejercicioId}`)
  revalidatePath('/admin/ejercicios')
  return { ok: true }
}

export async function quitarVideo(
  ejercicioId: string
): Promise<{ ok?: boolean; error?: string }> {
  const { supabase } = await exigirAdmin()
  if (!ejercicioId) return { error: 'Falta el ejercicio' }

  const { data } = await supabase
    .from('ejercicios')
    .select('video_id')
    .eq('id', ejercicioId)
    .single()

  if (data?.video_id) {
    await borrarVideoBunny(data.video_id)
  }

  const { error } = await supabase
    .from('ejercicios')
    .update({ video_id: null, video_duracion: null })
    .eq('id', ejercicioId)

  if (error) return { error: 'No se pudo quitar el vídeo' }

  revalidatePath(`/admin/ejercicios/${ejercicioId}`)
  revalidatePath('/admin/ejercicios')
  return { ok: true }
}
