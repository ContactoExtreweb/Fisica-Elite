'use server'

// Progreso del alumno y subida de nivel.
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
  revalidatePath('/subir-nivel')
  return { ok: true }
}

/**
 * Sube de nivel al alumno. Llama a la función de BBDD subir_de_nivel(),
 * que valida en el servidor que ha completado el 100% de su nivel actual
 * y sube UN escalón. Si no cumple, la función lanza error y lo mostramos.
 */
export async function subirDeNivel(): Promise<{ ok: boolean; nivel?: string; error?: string }> {
  const { supabase } = await exigirUsuario()

  const { data, error } = await supabase.rpc('subir_de_nivel')

  if (error) {
    // El mensaje de la función es explicativo, pero damos uno limpio
    return { ok: false, error: 'Todavía no puedes subir: completa todos los ejercicios de tu nivel.' }
  }

  revalidatePath('/inicio')
  revalidatePath('/subir-nivel')
  return { ok: true, nivel: data as string }
}
