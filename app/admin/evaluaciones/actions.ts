'use server'

// Corrección de las pruebas reales que suben los alumnos.
//
// La RLS de 'evaluaciones' (migración 014) solo deja ACTUALIZAR a los
// admin, así que basta con el cliente normal: no hace falta service_role.
import { revalidatePath } from 'next/cache'
import { exigirAdmin } from '@/lib/autorizacion'

export type ResultadoCorreccion = { ok?: boolean; error?: string }

export async function corregirEvaluacion(
  id: string,
  feedback: string
): Promise<ResultadoCorreccion> {
  const { supabase, user: admin } = await exigirAdmin()
  if (!id) return { error: 'Falta la prueba' }

  const texto = feedback.trim()
  if (texto.length < 3) {
    return { error: 'Escribe la corrección antes de marcarla como revisada.' }
  }

  const { error } = await supabase
    .from('evaluaciones')
    .update({
      feedback: texto.slice(0, 4000),
      estado: 'revisada',
      revisado_por: admin.id,
    })
    .eq('id', id)

  if (error) return { error: 'No se pudo guardar la corrección' }

  revalidatePath('/admin/evaluaciones')
  return { ok: true }
}

/** Reabrir una corregida, por si el preparador quiere rehacerla. */
export async function reabrirEvaluacion(id: string): Promise<ResultadoCorreccion> {
  const { supabase } = await exigirAdmin()
  if (!id) return { error: 'Falta la prueba' }

  const { error } = await supabase
    .from('evaluaciones')
    .update({ estado: 'pendiente' })
    .eq('id', id)

  if (error) return { error: 'No se pudo reabrir' }

  revalidatePath('/admin/evaluaciones')
  return { ok: true }
}

// --- Ventanas: los plazos en los que se puede subir (migración 019) ---

export async function abrirVentana(datos: {
  nombre: string
  inicio: string
  fin: string
  categoriaId: string
}): Promise<ResultadoCorreccion> {
  const { supabase, user: admin } = await exigirAdmin()

  const nombre = datos.nombre.trim()
  if (!nombre) return { error: 'Ponle un nombre al plazo' }
  if (!datos.inicio || !datos.fin) return { error: 'Faltan las fechas' }
  if (datos.fin < datos.inicio) {
    return { error: 'La fecha de fin no puede ser anterior a la de inicio' }
  }

  const { error } = await supabase.from('ventanas_evaluacion').insert({
    nombre: nombre.slice(0, 120),
    fecha_inicio: datos.inicio,
    fecha_fin: datos.fin,
    // Vacío = vale para todas las categorías
    categoria_id: datos.categoriaId || null,
    created_by: admin.id,
  })

  if (error) return { error: 'No se pudo abrir el plazo' }

  revalidatePath('/admin/evaluaciones')
  revalidatePath('/evaluaciones')
  return { ok: true }
}

/**
 * Cierra un plazo. No se borra: las pruebas que se subieron dentro
 * siguen necesitando saber a qué plazo pertenecían.
 */
export async function cerrarVentana(id: string): Promise<ResultadoCorreccion> {
  const { supabase } = await exigirAdmin()
  if (!id) return { error: 'Falta el plazo' }

  const { error } = await supabase
    .from('ventanas_evaluacion')
    .update({ activa: false })
    .eq('id', id)

  if (error) return { error: 'No se pudo cerrar' }

  revalidatePath('/admin/evaluaciones')
  revalidatePath('/evaluaciones')
  return { ok: true }
}
