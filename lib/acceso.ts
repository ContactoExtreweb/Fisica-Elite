// Qué categorías tiene contratadas un alumno, según sus planes activos.
//
// Reglas del modelo v2:
//   · suscripción sin plan (compat v1) -> acceso completo
//   · plan 'completo'                  -> todas las categorías activas (dentro
//                                         de ellas solo ve lo SUELTO: migr. 033)
//   · plan 'ejercicio'                 -> las categorías de ese plan
//   · plan 'oposicion'                 -> las categorías con ejercicios
//                                         marcados para esa oposición
import type { SupabaseClient } from '@supabase/supabase-js'
import { hoyMadrid } from '@/lib/fechas'

export type CategoriaContratada = {
  id: string
  nombre: string
  metrica: string
  unidad: string
  orden: number
}

export async function categoriasContratadas(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, 'public', any>,
  userId: string
): Promise<CategoriaContratada[]> {
  const hoy = hoyMadrid()

  const [{ data: subs }, { data: todas }] = await Promise.all([
    supabase
      .from('suscripciones')
      .select('plan_id, planes(tipo, especialidad, plan_categorias(categoria_id))')
      .eq('user_id', userId)
      .eq('estado', 'activa')
      .gte('fecha_fin', hoy),
    supabase
      .from('categorias_ejercicio')
      .select('id, nombre, metrica, unidad, orden')
      .eq('activa', true)
      .order('orden'),
  ])

  const catsActivas = (todas ?? []) as CategoriaContratada[]
  if (catsActivas.length === 0) return []

  let completo = false
  const ids = new Set<string>()
  const oposiciones = new Set<string>()

  for (const s of subs ?? []) {
    const plan = Array.isArray(s.planes) ? s.planes[0] : s.planes
    if (!plan) {
      completo = true // suscripción antigua sin plan
      continue
    }
    if (plan.tipo === 'completo') completo = true
    else if (plan.tipo === 'ejercicio') {
      for (const pc of plan.plan_categorias ?? []) ids.add(pc.categoria_id)
    } else if (plan.tipo === 'oposicion' && plan.especialidad) {
      oposiciones.add(plan.especialidad)
    }
  }

  if (completo) return catsActivas

  // Para planes por oposición, añadimos las categorías que tengan
  // ejercicios marcados para esa oposición.
  if (oposiciones.size > 0) {
    const { data: ejs } = await supabase
      .from('ejercicios')
      .select('categoria_id, ejercicio_oposiciones!inner(especialidad)')
      .in('ejercicio_oposiciones.especialidad', [...oposiciones])
    for (const e of ejs ?? []) ids.add(e.categoria_id as string)
  }

  return catsActivas.filter((c) => ids.has(c.id))
}
