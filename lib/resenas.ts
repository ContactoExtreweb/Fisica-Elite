// Reseñas visibles en la web pública (Inicio y Sobre nosotros).
//
// Se cargan a mano desde /admin/resenas (migración 026). El filtro
// `visible = true` va explícito además de la RLS: si un admin con sesión
// abre la web pública, la RLS le dejaría ver también las ocultas.
import type { SupabaseClient } from '@supabase/supabase-js'

export type ResenaPublica = {
  id: string
  nombre: string
  texto: string
  puntuacion: number
  /** "Google", "WhatsApp"…; null = no se enseña procedencia */
  origen: string | null
}

export async function resenasVisibles(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, 'public', any>
): Promise<ResenaPublica[]> {
  const { data } = await supabase
    .from('resenas')
    .select('id, nombre, texto, puntuacion, origen')
    .eq('visible', true)
    .order('orden')
    .order('created_at', { ascending: false })

  return (data ?? []) as ResenaPublica[]
}
