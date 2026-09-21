'use server'

// Reservar y cancelar turno (alumno presencial).
//
// Las dos acciones llaman a funciones de Postgres (migración 022) que
// hacen TODAS las comprobaciones: presencial, horario, bloqueos, fecha
// pasada, antelación, tope diario y aforo con candado. Aquí solo se
// valida la forma de los datos y se traduce el error.
import { revalidatePath } from 'next/cache'
import { exigirUsuario } from '@/lib/autorizacion'

type Resultado = { ok: boolean; error?: string }

const FECHA = /^\d{4}-\d{2}-\d{2}$/
const HORA = /^\d{2}:\d{2}$/

// Los 'raise exception' de las funciones ya vienen en castellano (código
// P0001) y se enseñan tal cual. Cualquier otro error de Postgres (nombres de
// tablas, restricciones…) NO se le enseña al alumno: solo un mensaje genérico.
function mensaje(err: { message: string; code?: string }): string {
  if (err.message.includes('reservas_unica_activa')) return 'Ya tienes reservado ese turno'
  if (err.message.includes('function') && err.message.includes('does not exist')) {
    return 'Las reservas no están activadas todavía (falta la migración 022)'
  }
  if (err.code === 'P0001') return err.message
  return 'No se pudo completar la operación. Inténtalo de nuevo.'
}

export async function reservarTurno(fecha: string, hora: string): Promise<Resultado> {
  const { supabase } = await exigirUsuario()
  if (!FECHA.test(fecha) || !HORA.test(hora)) return { ok: false, error: 'Turno no válido' }

  const { error } = await supabase.rpc('reservar_clase', { p_fecha: fecha, p_hora: hora })
  if (error) return { ok: false, error: mensaje(error) }

  revalidatePath('/reservas')
  revalidatePath('/admin/reservas')
  return { ok: true }
}

export async function cancelarTurno(id: string): Promise<Resultado> {
  const { supabase } = await exigirUsuario()
  if (!id) return { ok: false, error: 'Reserva no válida' }

  const { error } = await supabase.rpc('cancelar_reserva', { p_id: id })
  if (error) return { ok: false, error: mensaje(error) }

  revalidatePath('/reservas')
  revalidatePath('/admin/reservas')
  return { ok: true }
}
