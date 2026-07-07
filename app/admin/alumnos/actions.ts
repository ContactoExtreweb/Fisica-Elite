'use server'

// Gestión de un alumno desde su ficha. Todas exigen admin.
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { exigirAdmin } from '@/lib/autorizacion'
import { createAdminClient } from '@/lib/supabase/admin'
import { generarPasswordSegura } from '@/lib/password'

const ESPECIALIDADES = ['policia_local', 'policia_nacional', 'guardia_civil', 'fuerzas_armadas']
const NIVELES = ['iniciado', 'avanzado', 'profesional']

function hoyMadrid(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(new Date())
}
function sumarMeses(fechaISO: string, meses: number): string {
  const [y, m, d] = fechaISO.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1 + meses, d)).toISOString().slice(0, 10)
}

export type ResultadoEdicion = { ok?: boolean; error?: string }

/**
 * Editar datos del alumno. El admin puede cambiar nombre, apellidos,
 * teléfono, edad, especialidad y nivel (viene por service_role, así que
 * el trigger anti-escalada le deja tocar nivel/especialidad).
 */
export async function actualizarAlumno(
  alumnoId: string,
  datos: {
    nombre: string
    apellidos: string
    telefono: string
    edad: string
    especialidad: string
    nivel: string
  }
): Promise<ResultadoEdicion> {
  const { supabase } = await exigirAdmin()
  if (!alumnoId) return { error: 'Falta el alumno' }

  const especialidad = ESPECIALIDADES.includes(datos.especialidad) ? datos.especialidad : null
  const nivel = NIVELES.includes(datos.nivel) ? datos.nivel : 'iniciado'
  const edadNum = datos.edad ? Number(datos.edad) : null

  const { error } = await supabase
    .from('profiles')
    .update({
      nombre: datos.nombre.trim() || null,
      apellidos: datos.apellidos.trim() || null,
      telefono: datos.telefono.trim() || null,
      edad: edadNum && edadNum >= 14 && edadNum <= 100 ? edadNum : null,
      especialidad,
      nivel,
    })
    .eq('id', alumnoId)

  if (error) {
    if (error.code === '23505') return { error: 'Ese nombre de usuario ya está en uso' }
    return { error: 'No se pudieron guardar los cambios' }
  }

  revalidatePath(`/admin/alumnos/${alumnoId}`)
  revalidatePath('/admin/alumnos')
  return { ok: true }
}

export type ResultadoPassword = { ok: true; password: string } | { ok: false; error: string }

/**
 * Regenerar la contraseña del alumno. Devuelve la nueva para enseñarla
 * una vez. Marca must_change_password para que la cambie al entrar.
 */
export async function regenerarPassword(alumnoId: string): Promise<ResultadoPassword> {
  const { supabase } = await exigirAdmin()
  if (!alumnoId) return { ok: false, error: 'Falta el alumno' }

  const adminClient = createAdminClient()
  const password = generarPasswordSegura()

  const { error } = await adminClient.auth.admin.updateUserById(alumnoId, { password })
  if (error) return { ok: false, error: 'No se pudo regenerar la contraseña' }

  // Forzar cambio en el próximo acceso
  await supabase.from('profiles').update({ must_change_password: true }).eq('id', alumnoId)

  return { ok: true, password }
}

/**
 * Dar de baja: cancela la suscripción activa (corta el acceso al
 * contenido) SIN borrar la cuenta. Reversible dándole una nueva
 * suscripción más adelante.
 */
export async function darDeBaja(alumnoId: string): Promise<ResultadoEdicion> {
  const { supabase } = await exigirAdmin()
  if (!alumnoId) return { error: 'Falta el alumno' }

  const { error } = await supabase
    .from('suscripciones')
    .update({ estado: 'cancelada' })
    .eq('user_id', alumnoId)
    .eq('estado', 'activa')

  if (error) return { error: 'No se pudo dar de baja' }

  revalidatePath(`/admin/alumnos/${alumnoId}`)
  revalidatePath('/admin/alumnos')
  return { ok: true }
}

/**
 * Eliminar por completo: borra el usuario de Auth. Por la FK
 * on delete cascade, se llevan por delante el perfil, progreso,
 * suscripciones, conversaciones y mensajes. Irreversible.
 */
export type ResultadoBorrado = { ok: false; error: string } | void

export async function eliminarAlumno(alumnoId: string): Promise<ResultadoBorrado> {
  await exigirAdmin()
  if (!alumnoId) return { ok: false, error: 'Falta el alumno' }

  const adminClient = createAdminClient()

  // Quitar referencias que bloquean el borrado (claves foráneas sin
  // cascade). Las migraciones 010 y 011 lo arreglan a nivel de BBDD,
  // pero lo hacemos también aquí por si no se han aplicado todavía.
  await adminClient.from('mensajes').delete().eq('autor_id', alumnoId)
  await adminClient
    .from('solicitudes_alta')
    .update({ profile_creado: null })
    .eq('profile_creado', alumnoId)

  const { error } = await adminClient.auth.admin.deleteUser(alumnoId)
  if (error) {
    const detalle = error.message || (error as { code?: string }).code || 'error desconocido'
    return { ok: false, error: 'No se pudo eliminar: ' + detalle }
  }

  revalidatePath('/admin/alumnos')
  redirect('/admin/alumnos') // en éxito no vuelve al cliente
}

/**
 * Renovar / reactivar la suscripción de un alumno (pago en efectivo o
 * fuera de Stripe). Añade N meses: si tiene acceso vigente, extiende
 * desde su fecha de fin; si está sin acceso, arranca desde hoy. Así se
 * puede renovar a quien se le acaba, sin crear otra cuenta.
 */
export async function renovarSuscripcion(
  alumnoId: string,
  fechaFin: string // 'YYYY-MM-DD', el día exacto hasta el que tendrá acceso
): Promise<ResultadoEdicion> {
  const { supabase, user: admin } = await exigirAdmin()
  if (!alumnoId) return { error: 'Falta el alumno' }

  const hoy = hoyMadrid()
  // Validar la fecha
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaFin)) return { error: 'Fecha no válida' }
  if (fechaFin < hoy) return { error: 'La fecha debe ser hoy o posterior' }

  // ¿Tiene ya una suscripción activa y vigente? La extendemos (una sola
  // fila por alumno). Si no, creamos una nueva.
  const { data: actual } = await supabase
    .from('suscripciones')
    .select('id, fecha_fin')
    .eq('user_id', alumnoId)
    .eq('estado', 'activa')
    .gte('fecha_fin', hoy)
    .order('fecha_fin', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (actual) {
    const { error } = await supabase
      .from('suscripciones')
      .update({ fecha_fin: fechaFin, marcado_por: admin.id })
      .eq('id', actual.id)
    if (error) return { error: 'No se pudo actualizar la suscripción' }
  } else {
    const { error } = await supabase.from('suscripciones').insert({
      user_id: alumnoId,
      metodo: 'efectivo',
      meses: 1,
      fecha_inicio: hoy,
      fecha_fin: fechaFin,
      estado: 'activa',
      marcado_por: admin.id,
      notas: 'Activación/ajuste manual desde ficha',
    })
    if (error) return { error: 'No se pudo activar la suscripción' }
  }

  revalidatePath(`/admin/alumnos/${alumnoId}`)
  revalidatePath('/admin/alumnos')
  revalidatePath('/admin')
  return { ok: true }
}
