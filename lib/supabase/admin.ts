// Cliente ADMIN (service_role): BYPASSA la RLS.
//
// Reglas de uso:
//  · SOLO en servidor. El import de 'server-only' hace que el build
//    REVIENTE si alguien intenta importar esto desde un componente
//    de cliente. Es el guardarraíl, no lo quites.
//  · Úsalo únicamente para lo que la RLS no permite hacer a un admin
//    logueado: crear/borrar usuarios en Auth, webhooks de Stripe...
//    Para todo lo demás, el cliente normal (mínimo privilegio).
import 'server-only'
import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // sin NEXT_PUBLIC_: nunca llega al navegador
    {
      auth: { autoRefreshToken: false, persistSession: false },
    }
  )
}
