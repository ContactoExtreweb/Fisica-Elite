'use server'

// v2: fuera 'nivel'. El tramo por categoría se asigna luego con la
// autoevaluación del alumno.
//
// La OPOSICIÓN es OPCIONAL: un alumno puede entrenar solo por categorías
// (dominadas, carrera…) sin presentarse a ninguna oposición. Vacío se
// guarda como NULL. La columna profiles.especialidad ya es nullable.

import { revalidatePath } from 'next/cache'
import { exigirAdmin } from '@/lib/autorizacion'
import { createAdminClient } from '@/lib/supabase/admin'
import { generarPasswordSegura } from '@/lib/password'
import { validarPassword } from '@/lib/validacion'

export type EstadoAlta = {
  error?: string
  ok?: boolean
  credenciales?: { email: string; username: string; password: string }
}

const ESPECIALIDADES = [
  'policia_local',
  'policia_nacional',
  'guardia_civil',
  'fuerzas_armadas',
  'aduanas',
] as const

// Fechas en zona España (evita el desfase de toISOString en UTC)
function hoyMadrid(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(
    new Date()
  ) // yyyy-mm-dd
}

function sumarMeses(fechaISO: string, meses: number): string {
  const [y, m, d] = fechaISO.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1 + meses, d))
  return dt.toISOString().slice(0, 10)
}

export async function crearAlumno(
  _prev: EstadoAlta,
  formData: FormData
): Promise<EstadoAlta> {
  // 1 · AUTORIZACIÓN. La action es un endpoint público: se verifica
  //     aquí dentro, aunque middleware y layout ya filtren.
  const { supabase, user: admin } = await exigirAdmin()

  // 2 · CAMPOS + VALIDACIÓN (siempre en servidor)
  const texto = (k: string) => String(formData.get(k) ?? '').trim()

  const nombre = texto('nombre')
  const apellidos = texto('apellidos')
  const genero = texto('genero')
  const email = texto('email').toLowerCase()
  const username = texto('username')
  const telefono = texto('telefono')
  const especialidad = texto('especialidad')
  const edadRaw = texto('edad')

  if (!nombre || !apellidos || !email || !username) {
    return { error: 'Nombre, apellidos, email y usuario son obligatorios' }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'El email no tiene un formato válido' }
  }
  if (!/^[a-zA-Z0-9._-]{3,24}$/.test(username)) {
    return { error: 'Usuario: 3-24 caracteres, solo letras, números, punto, guion o guion bajo' }
  }
  // Vacía = "sin oposición". Si viene algo, tiene que ser del enum.
  if (especialidad && !(ESPECIALIDADES as readonly string[]).includes(especialidad)) {
    return { error: 'Oposición no válida' }
  }

  let edad: number | null = null
  if (edadRaw) {
    edad = Number(edadRaw)
    if (!Number.isInteger(edad) || edad < 14 || edad > 100) {
      return { error: 'La edad debe estar entre 14 y 100' }
    }
  }

  // 3 · CONTRASEÑA: generada segura (por defecto) o manual validada
  let password: string
  if (formData.get('modo_password') === 'manual') {
    password = String(formData.get('password_manual') ?? '')
    const fallo = validarPassword(password)
    if (fallo) return { error: `Contraseña manual: ${fallo}` }
  } else {
    password = generarPasswordSegura()
  }

  // 4 · CREAR EN AUTH — único punto donde hace falta el service_role.
  //     El trigger handle_new_user crea el perfil base al instante.
  const adminClient = createAdminClient()
  const { data: creado, error: errAuth } =
    await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // sin email de confirmación: el alta es presencial
    })

  if (errAuth || !creado?.user) {
    const yaExiste =
      errAuth?.message?.toLowerCase().includes('already') ||
      errAuth?.code === 'email_exists'
    return {
      error: yaExiste
        ? 'Ya existe un usuario con ese email'
        : 'No se pudo crear el usuario. Inténtalo de nuevo.',
    }
  }

  const nuevoId = creado.user.id

  // 5 · COMPLETAR EL PERFIL con el cliente del admin (RLS lo permite:
  //     mínimo privilegio, el service_role no se usa más de lo justo).
  const { error: errPerfil } = await supabase
    .from('profiles')
    .update({
      nombre,
      apellidos,
      genero: genero || null,
      edad,
      especialidad: especialidad || null,
      username,
      telefono: telefono || null,
      email,
      created_by: admin.id,
      must_change_password: true,
    })
    .eq('id', nuevoId)

  if (errPerfil) {
    // ROLLBACK: no dejamos una cuenta a medias en Auth
    await adminClient.auth.admin.deleteUser(nuevoId)
    if (errPerfil.code === '23505') {
      return { error: 'Ese nombre de usuario ya está en uso' }
    }
    return { error: 'No se pudo guardar el perfil. No se ha creado el alumno.' }
  }

  // 6 · PAGO EN EFECTIVO (opcional): suscripción con acceso por meses
  if (formData.get('pagado') === 'on') {
    const meses = Math.min(24, Math.max(1, Number(formData.get('meses')) || 1))
    const inicio = hoyMadrid()
    const fin = sumarMeses(inicio, meses)

    // Planes seleccionados en el alta (uno o varios). Cada uno -> una
    // suscripción con su plan_id. Si no viene ninguno (compatibilidad),
    // se crea una suscripción de acceso completo (plan_id null).
    const planesIds = formData.getAll('planes_ids').map(String).filter(Boolean)

    const filas = (planesIds.length > 0 ? planesIds : [null]).map((planId) => ({
      user_id: nuevoId,
      plan_id: planId,
      metodo: 'efectivo' as const,
      meses,
      fecha_inicio: inicio,
      fecha_fin: fin,
      estado: 'activa' as const,
      marcado_por: admin.id,
    }))

    const { error: errSusc } = await supabase.from('suscripciones').insert(filas)

    if (errSusc) {
      // El alumno YA existe: no hacemos rollback, avisamos al admin
      revalidatePath('/admin/alumnos')
      return {
        ok: true,
        credenciales: { email, username, password },
        error:
          'Alumno creado, pero el acceso no se pudo registrar. Anótalo y asígnalo desde su ficha.',
      }
    }
  }

  revalidatePath('/admin/alumnos')
  return { ok: true, credenciales: { email, username, password } }
}
