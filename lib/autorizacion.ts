// Autorización reutilizable. Las Server Actions son endpoints públicos:
// SIEMPRE hay que verificar quién llama DENTRO de la action, aunque el
// middleware ya filtre las rutas. Capas independientes.
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/** Exige sesión iniciada. Devuelve el user. */
export async function exigirUsuario() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return { supabase, user }
}

/** Exige sesión de ADMIN. Devuelve el user y su cliente (con RLS). */
export async function exigirAdmin() {
  const { supabase, user } = await exigirUsuario()

  const { data: perfil } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (perfil?.rol !== 'admin') redirect('/inicio')
  return { supabase, user }
}
