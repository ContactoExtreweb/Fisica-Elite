'use server'

// Acciones del CRUD de ejercicios v2 (solo admin).
// Cambio de modelo: categoría + tramo en lugar de especialidad + nivel,
// y un ejercicio puede contar para varias oposiciones a la vez.
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { exigirAdmin } from '@/lib/autorizacion'
import { borrarVideoSiNadieLoUsa } from '@/lib/videos'

export type EstadoEjercicio = { error?: string; ok?: boolean }

const ESPECIALIDADES = [
  'policia_local',
  'policia_nacional',
  'guardia_civil',
  'fuerzas_armadas',
  'aduanas',
]

export async function guardarEjercicio(
  _prev: EstadoEjercicio,
  formData: FormData
): Promise<EstadoEjercicio> {
  const { supabase, user } = await exigirAdmin()
  const texto = (k: string) => String(formData.get(k) ?? '').trim()

  const id = texto('id') || null
  const titulo = texto('titulo')
  const categoria_id = texto('categoria_id')
  if (!titulo) return { error: 'El título es obligatorio' }
  if (!categoria_id) return { error: 'Elige la categoría del ejercicio' }

  const oposiciones = formData
    .getAll('oposiciones')
    .map(String)
    .filter((o) => ESPECIALIDADES.includes(o))

  // Explicativo = vídeo de técnica de un movimiento (press banca,
  // sentadilla…). Va en su categoría, pero el alumno lo ve en la sección
  // "Explicaciones" y no en su entrenamiento por tramos. Por eso se
  // guarda SIEMPRE sin tramo: una explicación vale para todos.
  const explicativo = formData.get('explicativo') === 'on'

  const datos = {
    titulo,
    slug: texto('slug') || null, // el trigger de BBDD lo genera/normaliza
    categoria_id,
    explicativo,
    tramo_id: explicativo ? null : texto('tramo_id') || null, // vacío = visible en todos los tramos
    descripcion: texto('descripcion') || null,
    tecnica: texto('tecnica') || null,
    errores_comunes: texto('errores_comunes') || null,
    variantes: texto('variantes') || null,
    mejoras: texto('mejoras') || null,
    orden: parseInt(texto('orden') || '0', 10) || 0,
    publicado: formData.get('publicado') === 'on',
  }

  // Sincroniza la tabla de oposiciones del ejercicio (borra y re-inserta)
  // Devuelve false si falla: la oposición marcada decide quién ve el ejercicio,
  // y perderla en silencio lo dejaría visible o invisible para quien no debe.
  const sincronizarOpos = async (ejercicioId: string): Promise<boolean> => {
    const { error: errBorrar } = await supabase
      .from('ejercicio_oposiciones')
      .delete()
      .eq('ejercicio_id', ejercicioId)
    if (errBorrar) return false
    if (oposiciones.length > 0) {
      const { error: errInsertar } = await supabase
        .from('ejercicio_oposiciones')
        .insert(oposiciones.map((esp) => ({ ejercicio_id: ejercicioId, especialidad: esp })))
      if (errInsertar) return false
    }
    return true
  }

  if (id) {
    const { error } = await supabase.from('ejercicios').update(datos).eq('id', id)
    if (error) return { error: 'No se pudo guardar el ejercicio' }
    if (!(await sincronizarOpos(id))) {
      return { error: 'El ejercicio se guardó, pero no se pudieron guardar sus oposiciones. Vuelve a guardar.' }
    }
    revalidatePath('/admin/ejercicios')
    revalidatePath(`/admin/ejercicios/${id}`)
    return { ok: true }
  }

  const { data, error } = await supabase
    .from('ejercicios')
    .insert({ ...datos, created_by: user.id })
    .select('id')
    .single()
  if (error) return { error: 'No se pudo crear el ejercicio' }
  if (!(await sincronizarOpos(data.id))) {
    // Ya existe: se abre para que las oposiciones se puedan volver a marcar
    revalidatePath('/admin/ejercicios')
    redirect(`/admin/ejercicios/${data.id}`)
  }
  revalidatePath('/admin/ejercicios')
  redirect(`/admin/ejercicios/${data.id}`)
}

export async function borrarEjercicio(formData: FormData) {
  const { supabase } = await exigirAdmin()
  const id = String(formData.get('id') ?? '')
  if (!id) return

  const { data: ej } = await supabase.from('ejercicios').select('video_id').eq('id', id).single()

  // FAQs, oposiciones y progreso se limpian en cascada. Primero la fila...
  const { error } = await supabase.from('ejercicios').delete().eq('id', id)
  if (error) return

  // ...y después su vídeo de Bunny, para no dejar huérfanos, pero solo si
  // ningún otro ejercicio (o prueba) lo comparte.
  await borrarVideoSiNadieLoUsa(supabase, ej?.video_id)
  revalidatePath('/admin/ejercicios')
  redirect('/admin/ejercicios')
}

// ---------------- FAQs del ejercicio ----------------

export type EstadoFaq = { error?: string; ok?: boolean }

export async function crearFaq(_prev: EstadoFaq, formData: FormData): Promise<EstadoFaq> {
  const { supabase } = await exigirAdmin()
  const ejercicio_id = String(formData.get('ejercicio_id') ?? '')
  const pregunta = String(formData.get('pregunta') ?? '').trim()
  const respuesta = String(formData.get('respuesta') ?? '').trim()
  if (!ejercicio_id || !pregunta || !respuesta) {
    return { error: 'Escribe la pregunta y la respuesta' }
  }
  const { error } = await supabase.from('ejercicio_faqs').insert({
    ejercicio_id,
    pregunta,
    respuesta,
  })
  if (error) return { error: 'No se pudo crear la pregunta' }
  revalidatePath(`/admin/ejercicios/${ejercicio_id}`)
  return { ok: true }
}

export async function actualizarFaq(formData: FormData) {
  const { supabase } = await exigirAdmin()
  const id = String(formData.get('id') ?? '')
  const ejercicio_id = String(formData.get('ejercicio_id') ?? '')
  const pregunta = String(formData.get('pregunta') ?? '').trim()
  const respuesta = String(formData.get('respuesta') ?? '').trim()
  if (!id || !pregunta || !respuesta) return
  await supabase.from('ejercicio_faqs').update({ pregunta, respuesta }).eq('id', id)
  if (ejercicio_id) revalidatePath(`/admin/ejercicios/${ejercicio_id}`)
}

export async function borrarFaq(formData: FormData) {
  const { supabase } = await exigirAdmin()
  const id = String(formData.get('id') ?? '')
  const ejercicio_id = String(formData.get('ejercicio_id') ?? '')
  if (!id) return
  await supabase.from('ejercicio_faqs').delete().eq('id', id)
  if (ejercicio_id) revalidatePath(`/admin/ejercicios/${ejercicio_id}`)
}
