'use server'

// Acciones del CRUD de ejercicios v2 (solo admin).
// Cambio de modelo: categoría + tramo en lugar de especialidad + nivel,
// y un ejercicio puede contar para varias oposiciones a la vez.
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { exigirAdmin } from '@/lib/autorizacion'
import { borrarVideoBunny } from '@/lib/bunny'

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

  const datos = {
    titulo,
    slug: texto('slug') || null, // el trigger de BBDD lo genera/normaliza
    categoria_id,
    tramo_id: texto('tramo_id') || null, // vacío = visible en todos los tramos
    descripcion: texto('descripcion') || null,
    tecnica: texto('tecnica') || null,
    errores_comunes: texto('errores_comunes') || null,
    variantes: texto('variantes') || null,
    mejoras: texto('mejoras') || null,
    orden: parseInt(texto('orden') || '0', 10) || 0,
    publicado: formData.get('publicado') === 'on',
  }

  // Sincroniza la tabla de oposiciones del ejercicio (borra y re-inserta)
  const sincronizarOpos = async (ejercicioId: string) => {
    await supabase.from('ejercicio_oposiciones').delete().eq('ejercicio_id', ejercicioId)
    if (oposiciones.length > 0) {
      await supabase
        .from('ejercicio_oposiciones')
        .insert(oposiciones.map((esp) => ({ ejercicio_id: ejercicioId, especialidad: esp })))
    }
  }

  if (id) {
    const { error } = await supabase.from('ejercicios').update(datos).eq('id', id)
    if (error) return { error: 'No se pudo guardar el ejercicio' }
    await sincronizarOpos(id)
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
  await sincronizarOpos(data.id)
  revalidatePath('/admin/ejercicios')
  redirect(`/admin/ejercicios/${data.id}`)
}

export async function borrarEjercicio(formData: FormData) {
  const { supabase } = await exigirAdmin()
  const id = String(formData.get('id') ?? '')
  if (!id) return

  // Si tiene vídeo en Bunny, lo borramos también para no dejar huérfanos
  const { data: ej } = await supabase.from('ejercicios').select('video_id').eq('id', id).single()
  if (ej?.video_id) {
    await borrarVideoBunny(ej.video_id)
  }

  // FAQs, oposiciones y progreso se limpian en cascada
  await supabase.from('ejercicios').delete().eq('id', id)
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
