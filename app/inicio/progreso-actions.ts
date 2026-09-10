'use server'

// Progreso del alumno.
//
// v2: fuera subirDeNivel(). Llamaba a rpc('subir_de_nivel'), función que
// la 014 eliminó junto con el sistema de niveles. Ahora el escalón del
// alumno lo marca su TRAMO por categoría (alumno_tramos).
import { revalidatePath } from 'next/cache'
import { exigirUsuario } from '@/lib/autorizacion'

/**
 * Marca o desmarca un ejercicio como completado por el alumno.
 * La RLS de 'progreso' garantiza que solo escribe el suyo (user_id = auth.uid()).
 */
export async function marcarCompletado(
  ejercicioId: string,
  completado: boolean
): Promise<{ ok: boolean; error?: string }> {
  const { supabase, user } = await exigirUsuario()
  if (!ejercicioId) return { ok: false, error: 'Falta el ejercicio' }

  if (completado) {
    // upsert: si ya existe la fila (user+ejercicio), la deja completada
    const { error } = await supabase
      .from('progreso')
      .upsert(
        { user_id: user.id, ejercicio_id: ejercicioId, completado: true, completado_at: new Date().toISOString() },
        { onConflict: 'user_id,ejercicio_id' }
      )
    if (error) return { ok: false, error: 'No se pudo guardar' }
  } else {
    // desmarcar = borrar la fila de progreso
    const { error } = await supabase
      .from('progreso')
      .delete()
      .eq('user_id', user.id)
      .eq('ejercicio_id', ejercicioId)
    if (error) return { ok: false, error: 'No se pudo guardar' }
  }

  revalidatePath('/inicio')
  revalidatePath(`/ejercicio/${ejercicioId}`)
  return { ok: true }
}
