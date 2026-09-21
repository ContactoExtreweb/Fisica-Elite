// Planes a la venta, listos para pintar.
//
// Lo usan las pantallas que tienen que describir cada plan EXACTAMENTE
// igual: /precios (web pública), /oposiciones/<slug> y /suscripcion
// (contratar otro plan desde la cuenta del alumno).
//
// Cliente normal, con RLS: 'planes' solo deja leer los activos, así que un
// plan desactivado no aparece en ninguna de ellas.
import type { SupabaseClient } from '@supabase/supabase-js'
import { nombreOposicion } from '@/lib/oposiciones'

export type PlanPublico = {
  id: string
  nombre: string
  tipo: 'ejercicio' | 'completo' | 'oposicion'
  /** Solo en los planes de tipo 'oposicion' */
  especialidad: string | null
  /** Texto extra; null si ya se ha usado como "cubre" */
  descripcion: string | null
  precioCentimos: number
  /** Qué incluye, ya resuelto */
  cubre: string
  /** Categorías concretas, solo en los planes por categorías */
  categorias: string[]
}

/** 3900 → "39"; 1550 → "15,50" */
export function euros(centimos: number): string {
  const n = centimos / 100
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace('.', ',')
}

function rel<T>(x: T | T[] | null | undefined): T | undefined {
  if (!x) return undefined
  return Array.isArray(x) ? x[0] : x
}

type FilaPlan = {
  id: string
  nombre: string
  tipo: PlanPublico['tipo']
  especialidad: string | null
  descripcion: string | null
  precio_centimos: number | null
  plan_categorias:
    | { categorias_ejercicio: { nombre: string } | { nombre: string }[] | null }[]
    | null
}

export async function planesALaVenta(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, 'public', any>
): Promise<PlanPublico[]> {
  // OJO: el select en UNA sola cadena literal (si se parte con '+',
  // supabase-js pierde los tipos). Ver lib/suscripciones.ts.
  const { data } = await supabase
    .from('planes')
    .select(
      'id, nombre, tipo, especialidad, descripcion, precio_centimos, orden, plan_categorias(categorias_ejercicio(nombre))'
    )
    .eq('activo', true)
    .order('orden')

  return (
    ((data ?? []) as unknown as FilaPlan[])
      // Sin precio cobrable (Stripe no acepta < 0,50 €): fuera de la parrilla.
      .filter((p) => typeof p.precio_centimos === 'number' && p.precio_centimos >= 50)
      .map((p) => {
        const categorias = (p.plan_categorias ?? [])
          .map((pc) => rel(pc.categorias_ejercicio)?.nombre)
          .filter((n): n is string => !!n)
          .sort((a, b) => a.localeCompare(b, 'es'))

        const descripcion = (p.descripcion ?? '').trim() || null

        // En "todo" y oposición, la descripción del preparador dice lo mismo
        // que el texto genérico: si la ha escrito, manda la suya. En los de
        // categorías no choca: ahí el texto solo etiqueta las pastillas.
        let cubre: string
        let descripcionExtra: string | null = descripcion

        if (p.tipo === 'completo') {
          cubre = descripcion ?? 'Todos los ejercicios de todas las categorías de entrenamiento.'
          descripcionExtra = null
        } else if (p.tipo === 'oposicion') {
          cubre =
            descripcion ?? `Todo el contenido específico de ${nombreOposicion(p.especialidad)}.`
          descripcionExtra = null
        } else {
          cubre = categorias.length > 0 ? 'Acceso a estas categorías:' : 'Plan por categorías.'
        }

        return {
          id: p.id,
          nombre: p.nombre,
          tipo: p.tipo,
          especialidad: p.especialidad ?? null,
          descripcion: descripcionExtra,
          precioCentimos: p.precio_centimos as number,
          cubre,
          categorias,
        }
      })
  )
}
