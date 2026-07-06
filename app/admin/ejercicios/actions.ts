'use server'

// CRUD de ejercicios y FAQs. Todo con el cliente del admin logueado:
// la RLS ("gestionar solo admin") es la que autoriza. El service_role
// no se usa aquí. Bunny se limpia al borrar ejercicios con vídeo.
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { exigirAdmin } from '@/lib/autorizacion'
import { borrarVideoBunny } from '@/lib/bunny'

export type EstadoEjercicio = { error?: string }

const ESPECIALIDADES = [
  'policia_local',
  'policia_nacional',
  'guardia_civil',
  'fuerzas_armadas',
] as const

const NIVELES = ['iniciado', 'avanzado', 'profesional'] as const

// ---------------------------------------------------------------
// EJERCICIOS
// ---------------------------------------------------------------

export async function guardarEjercicio(
  _prev: EstadoEjercicio,
  formData: FormData
): Promise<EstadoEjercicio> {
  const { supabase, user } = await exigirAdmin()

  const texto = (k: string) => String(formData.get(k) ?? '').trim()

  const id = texto('id') // vacío → crear; con valor → editar
  const titulo = texto('titulo')
  const especialidad = texto('especialidad')
  const nivel = texto('nivel')

  if (!titulo) return { error: 'El título es obligatorio' }
  if (!(ESPECIALIDADES as readonly string[]).includes(especialidad)) {
    return { error: 'Especialidad no válida' }
  }
  if (!(NIVELES as readonly string[]).includes(nivel)) {
    return { error: 'Nivel no válido' }
  }

  const datos = {
    titulo,
    especialidad,
    nivel,
    descripcion: texto('descripcion') || null,
    tecnica: texto('tecnica') || null,
    variantes: texto('variantes') || null,
    errores_comunes: texto('errores_comunes') || null,
    mejoras: texto('mejoras') || null,
    orden: Number.isFinite(Number(texto('orden'))) ? Number(texto('orden')) : 0,
    publicado: formData.get('publicado') === 'on',
  }

  if (id) {
    const { error } = await supabase.from('ejercicios').update(datos).eq('id', id)
    if (error) return { error: 'No se pudo guardar el ejercicio' }
    revalidatePath('/admin/ejercicios')
    revalidatePath(`/admin/ejercicios/${id}`)
    redirect('/admin/ejercicios')
  }

  const { data: creado, error } = await supabase
    .from('ejercicios')
    .insert({ ...datos, created_by: user.id })
    .select('id')
    .single()

  if (error || !creado) return { error: 'No se pudo crear el ejercicio' }

  revalidatePath('/admin/ejercicios')
  // A la ficha recién creada, para añadir vídeo y FAQs del tirón
  redirect(`/admin/ejercicios/${creado.id}`)
}

export async function borrarEjercicio(formData: FormData) {
  const { supabase } = await exigirAdmin()
  const id = String(formData.get('id') ?? '')
  if (!id) return

  // Limpieza en Bunny si tenía vídeo (best-effort)
  const { data: ejercicio } = await supabase
    .from('ejercicios')
    .select('video_id')
    .eq('id', id)
    .single()

  if (ejercicio?.video_id) {
    await borrarVideoBunny(ejercicio.video_id)
  }

  // Las FAQs y el progreso caen en cascada (FK on delete cascade)
  await supabase.from('ejercicios').delete().eq('id', id)

  revalidatePath('/admin/ejercicios')
  redirect('/admin/ejercicios')
}

// ---------------------------------------------------------------
// FAQs
// ---------------------------------------------------------------

export async function crearFaq(
  _prev: EstadoEjercicio,
  formData: FormData
): Promise<EstadoEjercicio> {
  const { supabase } = await exigirAdmin()

  const ejercicioId = String(formData.get('ejercicio_id') ?? '')
  const pregunta = String(formData.get('pregunta') ?? '').trim()
  const respuesta = String(formData.get('respuesta') ?? '').trim()

  if (!ejercicioId) return { error: 'Falta el ejercicio' }
  if (!pregunta || !respuesta) {
    return { error: 'La pregunta y la respuesta son obligatorias' }
  }

  const { error } = await supabase.from('ejercicio_faqs').insert({
    ejercicio_id: ejercicioId,
    pregunta,
    respuesta,
    orden: Number(formData.get('orden')) || 0,
  })

  if (error) return { error: 'No se pudo añadir la pregunta' }

  revalidatePath(`/admin/ejercicios/${ejercicioId}`)
  return {}
}

export async function actualizarFaq(formData: FormData) {
  const { supabase } = await exigirAdmin()

  const faqId = String(formData.get('faq_id') ?? '')
  const ejercicioId = String(formData.get('ejercicio_id') ?? '')
  const pregunta = String(formData.get('pregunta') ?? '').trim()
  const respuesta = String(formData.get('respuesta') ?? '').trim()

  if (!faqId || !pregunta || !respuesta) return

  await supabase
    .from('ejercicio_faqs')
    .update({ pregunta, respuesta })
    .eq('id', faqId)

  revalidatePath(`/admin/ejercicios/${ejercicioId}`)
}

export async function borrarFaq(formData: FormData) {
  const { supabase } = await exigirAdmin()

  const faqId = String(formData.get('faq_id') ?? '')
  const ejercicioId = String(formData.get('ejercicio_id') ?? '')
  if (!faqId) return

  await supabase.from('ejercicio_faqs').delete().eq('id', faqId)

  revalidatePath(`/admin/ejercicios/${ejercicioId}`)
}
