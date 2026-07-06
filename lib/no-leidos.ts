// Cuenta los mensajes no leídos por el usuario actual.
// - Alumno: mensajes de SUS conversaciones escritos por otros (el admin).
// - Admin: mensajes de CUALQUIER conversación escritos por alumnos.
// En ambos casos la RLS ya limita qué mensajes ve cada uno, así que
// basta con contar los 'leido = false' que no son míos.
import 'server-only'
import { createClient } from '@/lib/supabase/server'

export async function contarNoLeidos(): Promise<number> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return 0

  const { count } = await supabase
    .from('mensajes')
    .select('id', { count: 'exact', head: true })
    .neq('autor_id', user.id)
    .eq('leido', false)

  return count ?? 0
}
