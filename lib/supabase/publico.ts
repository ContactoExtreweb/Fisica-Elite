// Cliente ANÓNIMO sin cookies, para páginas públicas que se cachean.
//
// El cliente de lib/supabase/server.ts lee las cookies de la petición, y
// eso obliga a que la página se renderice en cada visita. Para el Inicio y
// "Sobre nosotros" (planes y reseñas que cambian poco) es mejor que Next
// las sirva ya hechas y las regenere cada minuto (export const revalidate),
// o al momento cuando el admin guarda algo (revalidatePath en sus acciones).
//
// Usa la clave ANÓNIMA, así que la RLS manda igual que con cualquier
// visitante: solo se ven los planes activos y las reseñas visibles. No es
// el cliente admin y no salta ninguna política.
import { createClient } from '@supabase/supabase-js'

export function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
