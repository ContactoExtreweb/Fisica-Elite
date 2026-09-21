'use server'

// Reasignar el tramo de un alumno desde su ficha (solo admin).
//
// El cuestionario inicial asigna un tramo por categoría según lo que el
// propio alumno dice que hace (autoevaluación). El cliente pidió poder
// corregirlo: "reasignable por admin". Aquí se hace.
//
//  · Se guarda con origen = 'admin'. Así, si el alumno repite el cuestionario,
//    su respuesta NO pisa lo que fijó el preparador (ver bienvenida/actions.ts).
//  · "Todos los tramos" = tramo_id NULL (ve todos los de la categoría).
//  · La RLS de alumno_tramos ya deja escribir al admin (migración 014), así que
//    no hace falta el cliente de service_role ni ninguna migración.
import { revalidatePath } from 'next/cache'
import { exigirAdmin } from '@/lib/autorizacion'

export type EstadoTramo = { ok?: boolean; error?: string }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function asignarTramo(_prev: EstadoTramo, formData: FormData): Promise<EstadoTramo> {
  const { supabase } = await exigirAdmin()

  const alumnoId = String(formData.get('alumno_id') ?? '')
  const categoriaId = String(formData.get('categoria_id') ?? '')
  const eleccion = String(formData.get('tramo') ?? '')
  if (!UUID.test(alumnoId) || !UUID.test(categoriaId)) return { error: 'Datos no válidos' }

  let tramoId: string | null = null
  if (eleccion === 'todos') {
    tramoId = null
  } else if (UUID.test(eleccion)) {
    // El tramo tiene que ser de ESA categoría: un id de otra categoría
    // dejaría al alumno sin ejercicios.
    const { data: tramo } = await supabase
      .from('tramos')
      .select('id')
      .eq('id', eleccion)
      .eq('categoria_id', categoriaId)
      .maybeSingle()
    if (!tramo) return { error: 'Ese tramo no es de esta categoría' }
    tramoId = tramo.id
  } else {
    return { error: 'Elige un tramo' }
  }

  const { error } = await supabase.from('alumno_tramos').upsert(
    {
      user_id: alumnoId,
      categoria_id: categoriaId,
      tramo_id: tramoId,
      origen: 'admin',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,categoria_id' }
  )
  if (error) return { error: 'No se pudo guardar' }

  revalidatePath(`/admin/alumnos/${alumnoId}`)
  return { ok: true }
}

/**
 * Devuelve la decisión al alumno: el tramo se queda como está, pero deja de
 * estar "fijado por el preparador" y su próxima autoevaluación podrá cambiarlo.
 */
export async function devolverTramoAlAlumno(
  _prev: EstadoTramo,
  formData: FormData
): Promise<EstadoTramo> {
  const { supabase } = await exigirAdmin()

  const alumnoId = String(formData.get('alumno_id') ?? '')
  const categoriaId = String(formData.get('categoria_id') ?? '')
  if (!UUID.test(alumnoId) || !UUID.test(categoriaId)) return { error: 'Datos no válidos' }

  const { error } = await supabase
    .from('alumno_tramos')
    .update({ origen: 'autoevaluacion', updated_at: new Date().toISOString() })
    .eq('user_id', alumnoId)
    .eq('categoria_id', categoriaId)
  if (error) return { error: 'No se pudo guardar' }

  revalidatePath(`/admin/alumnos/${alumnoId}`)
  return { ok: true }
}
