// Cliente Supabase para COMPONENTES DE CLIENTE ('use client').
// Usa la anon key: es pública por diseño, la seguridad la pone la RLS.
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
