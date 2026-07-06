'use server'

// Mutaciones de auth SIEMPRE en servidor (Server Actions).
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type EstadoForm = { error?: string }

export async function login(
  _prev: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (!email || !password) {
    return { error: 'Introduce tu correo y tu contraseña' }
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
