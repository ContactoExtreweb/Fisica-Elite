'use server'

// Gestión de un alumno desde su ficha. Todas exigen admin.
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { exigirAdmin } from '@/lib/autorizacion'
import { createAdminClient } from '@/lib/supabase/admin'
import { generarPasswordSegura } from '@/lib/password'

const ESPECIALIDADES = ['policia_local', 'policia_nacional', 'guardia_civil', 'fuerzas_armadas', 'aduanas']

export type ResultadoEdicion = { ok?: boolean; error?: string }

/**
 * Editar datos del alumno. El admin puede cambiar nombre, apellidos,
 * teléfono, edad y especialidad (viene por service_role, así que el
 * trigger anti-escalada le deja tocar especialidad).
 */
export async function actualizarAlumno(
  alumnoId: string,
  datos: {
    nombre: string
    apellidos: string
    telefono: string
    edad: string
    especialidad: string
  }
): Promise<ResultadoEdicion> {
  const { supabase } = await exigirAdmin()
  if (!alumnoId) return { error: 'Falta el alumno' }

  const especialidad = ESPECIALIDADES.includes(datos.especialidad) ? datos.especialidad : null
  const edadNum = datos.edad ? Number(datos.edad) : null

  const { error } = await supabase
    .from('profiles')
    .update({
      nombre: datos.nombre.trim() || null,
      apellidos: datos.apellidos.trim() || null,
      telefono: datos.telefono.trim() || null,
      edad: edadNum && edadNum >= 14 && edadNum <= 100 ? edadNum : null,
      especialidad,
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
export async function eliminarAlumno(alumnoId: string) {
  await exigirAdmin()
  if (!alumnoId) return

  const adminClient = createAdminClient()
  await adminClient.auth.admin.deleteUser(alumnoId)

  revalidatePath('/admin/alumnos')
  redirect('/admin/alumnos')
}
