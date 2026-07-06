// Cliente Supabase para SERVIDOR (Server Components, Server Actions,
// Route Handlers). Lee/escribe la sesión en cookies (patrón @supabase/ssr).
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies() // Next 15: cookies() es async

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Llamado desde un Server Component: se puede ignorar,
            // el middleware se encarga de refrescar la sesión.
          }
        },
      },
    }
  )
}
