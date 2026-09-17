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

// Los 'raise exception' de las funciones ya vienen en castellano; solo
// hay que limpiar los errores técnicos que no pasan por ahí.
function mensaje(err: string): string {
  if (err.includes('reservas_unica_activa')) return 'Ya tienes reservado ese turno'
  if (err.includes('function') && err.includes('does not exist')) {
    return 'Las reservas no están activadas todavía (falta la migración 022)'
  }
  return err
}

export async function reservarTurno(fecha: string, hora: string): Promise<Resultado> {
  const { supabase } = await exigirUsuario()
  if (!FECHA.test(fecha) || !HORA.test(hora)) return { ok: false, error: 'Turno no válido' }

  const { error } = await supabase.rpc('reservar_clase', { p_fecha: fecha, p_hora: hora })
  if (error) return { ok: false, error: mensaje(error.message) }

  revalidatePath('/reservas')
  revalidatePath('/admin/reservas')
  return { ok: true }
}

export async function cancelarTurno(id: string): Promise<Resultado> {
  const { supabase } = await exigirUsuario()
  if (!id) return { ok: false, error: 'Reserva no válida' }

  const { error } = await supabase.rpc('cancelar_reserva', { p_id: id })
  if (error) return { ok: false, error: mensaje(error.message) }

  revalidatePath('/reservas')
  revalidatePath('/admin/reservas')
  return { ok: true }
}
