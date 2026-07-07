'use server'

// Mutaciones de auth SIEMPRE en servidor (Server Actions).
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type EstadoForm = { error?: string }

export async function login(
  _prev: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  // 'identificador' puede ser correo, usuario o teléfono
  const identificador = String(formData.get('identificador') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (!identificador || !password) {
    return { error: 'Introduce tu acceso y tu contraseña' }
  }

  // Averiguar el email real con el que iniciar sesión.
  // - Si parece un email, se usa directamente.
  // - Si no, buscamos por username o teléfono en profiles (con el cliente
  //   admin, porque un usuario sin sesión no puede leer otros perfiles por
  //   RLS) y sacamos su email.
  let email = ''
  const pareceEmail = identificador.includes('@')

  if (pareceEmail) {
    email = identificador.toLowerCase()
  } else {
    // Buscamos con consultas .eq() separadas (parametrizadas y seguras;
    // además .or() con puntos rompería usuarios tipo 'maria.lopez').
    const admin = createAdminClient()
    const telef = identificador.replace(/\s+/g, '')

    // 1) por username
    let email2: string | null = null
    const porUsuario = await admin
      .from('profiles')
      .select('email')
      .eq('username', identificador)
      .limit(1)
      .maybeSingle()
    email2 = porUsuario.data?.email ?? null

    // 2) por teléfono (tal cual y sin espacios)
    if (!email2) {
      const porTel = await admin
        .from('profiles')
        .select('email')
        .in('telefono', [identificador, telef])
        .limit(1)
        .maybeSingle()
      email2 = porTel.data?.email ?? null
    }

    if (!email2) {
      // No revelamos si existe o no
      return { error: 'Credenciales incorrectas' }
    }
    email = email2
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    // Mensaje genérico a propósito: no revelamos si el email existe
    return { error: 'Credenciales incorrectas' }
  }

  // ¿A dónde va? Depende de su perfil
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: perfil } = await supabase
    .from('profiles')
    .select('rol, must_change_password')
    .eq('id', user!.id)
    .single()

  if (perfil?.must_change_password) redirect('/cambiar-password')
  redirect(perfil?.rol === 'admin' ? '/admin' : '/inicio')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
