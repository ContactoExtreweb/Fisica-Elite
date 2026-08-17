'use server'

// Gestión de las suscripciones de un alumno desde su ficha:
// añadir planes nuevos, renovar (alargar) y dar de baja una concreta.
//
// Todo pasa por exigirAdmin(): solo el preparador toca esto.
import { revalidatePath } from 'next/cache'
import { exigirAdmin } from '@/lib/autorizacion'

export type ResultadoSusc = { ok?: boolean; error?: string }

/** Fecha de hoy en horario de Madrid (yyyy-mm-dd). */
function hoyMadrid(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' })
}

/** Suma meses a una fecha ISO, cuidando los finales de mes. */
function sumarMeses(iso: string, meses: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const fecha = new Date(Date.UTC(y, m - 1, d))
  const diaOriginal = fecha.getUTCDate()
  fecha.setUTCMonth(fecha.getUTCMonth() + meses)
  // Si el mes destino es más corto (31 ene + 1 mes), retrocede al último día
  if (fecha.getUTCDate() !== diaOriginal) fecha.setUTCDate(0)
  return fecha.toISOString().slice(0, 10)
}

/**
 * Añade una suscripción por cada plan seleccionado.
 * Se usa cuando el alumno contrata algo nuevo o renueva en efectivo.
 */
export async function anadirSuscripciones(
  alumnoId: string,
  planesIds: string[],
  meses: number
): Promise<ResultadoSusc> {
  const { supabase, user: admin } = await exigirAdmin()
  if (!alumnoId) return { error: 'Falta el alumno' }

  const m = Math.min(24, Math.max(1, Math.round(meses) || 1))
  const inicio = hoyMadrid()
  const fin = sumarMeses(inicio, m)

  // Sin planes = acceso completo (compatibilidad con el modelo antiguo)
  const lista = planesIds.filter(Boolean)
  const filas = (lista.length > 0 ? lista : [null]).map((planId) => ({
    user_id: alumnoId,
    plan_id: planId,
    metodo: 'efectivo' as const,
    meses: m,
    fecha_inicio: inicio,
    fecha_fin: fin,
    estado: 'activa' as const,
    marcado_por: admin.id,
  }))

  const { error } = await supabase.from('suscripciones').insert(filas)
  if (error) return { error: 'No se pudo añadir el acceso' }

  revalidatePath(`/admin/alumnos/${alumnoId}`)
  revalidatePath('/admin/alumnos')
  return { ok: true }
}

/**
 * Renueva una suscripción concreta alargando su fecha de fin.
 * Si ya había caducado, cuenta desde hoy; si sigue viva, desde su fin.
 */
export async function renovarSuscripcion(
  subId: string,
  meses: number
): Promise<ResultadoSusc> {
  const { supabase } = await exigirAdmin()
  if (!subId) return { error: 'Falta la suscripción' }

  const m = Math.min(24, Math.max(1, Math.round(meses) || 1))

  const { data: sub } = await supabase
    .from('suscripciones')
    .select('id, user_id, fecha_fin, meses')
    .eq('id', subId)
    .single()

  if (!sub) return { error: 'No se encontró la suscripción' }

  const hoy = hoyMadrid()
  const desde = (sub.fecha_fin ?? '') > hoy ? sub.fecha_fin : hoy

  const { error } = await supabase
    .from('suscripciones')
    .update({
      fecha_fin: sumarMeses(desde, m),
      meses: (sub.meses ?? 0) + m,
      estado: 'activa',
    })
    .eq('id', subId)

  if (error) return { error: 'No se pudo renovar' }

  revalidatePath(`/admin/alumnos/${sub.user_id}`)
  revalidatePath('/admin/alumnos')
  return { ok: true }
}

/** Da de baja UNA suscripción concreta (las demás siguen activas). */
export async function cancelarSuscripcion(subId: string): Promise<ResultadoSusc> {
  const { supabase } = await exigirAdmin()
  if (!subId) return { error: 'Falta la suscripción' }

  const { data: sub } = await supabase
    .from('suscripciones')
    .select('user_id')
    .eq('id', subId)
    .single()

  const { error } = await supabase
    .from('suscripciones')
    .update({ estado: 'cancelada' })
    .eq('id', subId)

  if (error) return { error: 'No se pudo dar de baja' }

  if (sub?.user_id) revalidatePath(`/admin/alumnos/${sub.user_id}`)
  revalidatePath('/admin/alumnos')
  return { ok: true }
}
