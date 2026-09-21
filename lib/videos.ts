// Borrado seguro de vídeos de Bunny.
//
// SOLO SERVIDOR. Borrar un vídeo en Bunny no tiene vuelta atrás, y el mismo
// vídeo puede estar apuntado desde más de un sitio (dos ejercicios que
// comparten vídeo, o una prueba de un alumno). Antes, borrar un ejercicio o
// cambiarle el vídeo lo borraba de Bunny sin mirar, y el otro ejercicio se
// quedaba con un vídeo que ya no existía.
//
// Uso: haz PRIMERO el cambio en la base de datos (quitar la referencia) y
// llama a esto DESPUÉS: borra de Bunny solo si ya no lo referencia nadie.
import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { borrarVideoBunny } from '@/lib/bunny'

export async function borrarVideoSiNadieLoUsa(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, 'public', any>,
  guid: string | null | undefined
): Promise<void> {
  if (!guid) return

  const [{ data: enEjercicios }, { data: enPruebas }] = await Promise.all([
    supabase.from('ejercicios').select('id').eq('video_id', guid).limit(1),
    supabase.from('evaluaciones').select('id').eq('video_id', guid).limit(1),
  ])

  // Si no se ha podido comprobar (error → data null), NO se borra: un vídeo
  // huérfano en Bunny cuesta céntimos; uno borrado de más, un ejercicio roto.
  if (!enEjercicios || !enPruebas) return
  if (enEjercicios.length > 0 || enPruebas.length > 0) return

  await borrarVideoBunny(guid)
}
