// Las suscripciones de UN alumno, con qué le cubre cada una.
//
// Distinto de lib/acceso.ts: aquel junta todos los planes y devuelve la
// lista de categorías contratadas (para el cuestionario y "Mi progreso").
// Este devuelve una fila POR SUSCRIPCIÓN, para poder enseñarle al alumno
// qué ha comprado exactamente y hasta cuándo.
//
// Todo sale de UNA consulta: el plan y sus categorías vienen embebidos.
import type { SupabaseClient } from '@supabase/supabase-js'
import { nombreOposicion } from '@/lib/oposiciones'

export type SuscripcionAlumno = {
  id: string
  estado: string
  metodo: string | null
  meses: number | null
  fechaInicio: string | null
  fechaFin: string | null
  /** Activa Y con fecha_fin >= hoy */
  vigente: boolean
  /** Nombre del plan tal cual, o null si la suscripción no tiene plan */
  plan: string | null
  tipo: 'ejercicio' | 'completo' | 'oposicion' | null
  precioCentimos: number | null
  /** Título que se enseña en pantalla */
  titulo: string
  /** Explicación de qué le da acceso */
  cubre: string
  /** Categorías concretas, solo en los planes de tipo 'ejercicio' */
  categorias: string[]
  /** true si el acceso es a TODO (plan completo o suscripción antigua) */
  accesoTotal: boolean
  /** true si tiene plan_id pero no hemos podido leer el plan */
  planIlegible: boolean
}

function hoyMadrid(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(new Date())
}

// PostgREST devuelve las relaciones a-uno como objeto o como array según
// la versión; esto normaliza ambos casos.
function rel<T>(x: T | T[] | null | undefined): T | undefined {
  if (!x) return undefined
  return Array.isArray(x) ? x[0] : x
}

type PlanEmbebido = {
  nombre: string
  tipo: 'ejercicio' | 'completo' | 'oposicion'
  especialidad: string | null
  precio_centimos: number | null
  plan_categorias?: { categorias_ejercicio: { nombre: string } | { nombre: string }[] | null }[]
}

export async function misSuscripciones(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, 'public', any>,
  userId: string
): Promise<SuscripcionAlumno[]> {
  const hoy = hoyMadrid()

  const { data } = await supabase
    .from('suscripciones')
    // OJO: el select va en UNA sola cadena literal. Si se parte con '+',
    // supabase-js no puede inferir el tipo y todo el resultado se degrada
    // a GenericStringError (el build peta con "Property X does not exist").
    .select(
      'id, estado, metodo, meses, fecha_inicio, fecha_fin, plan_id, planes(nombre, tipo, especialidad, precio_centimos, plan_categorias(categorias_ejercicio(nombre)))'
    )
    .eq('user_id', userId)
    .order('fecha_fin', { ascending: false })

  return (data ?? []).map((s) => {
    const plan = rel(s.planes) as PlanEmbebido | undefined

    const vigente = s.estado === 'activa' && !!s.fecha_fin && s.fecha_fin >= hoy

    // OJO: la RLS de 'planes' solo deja leer los ACTIVOS. Si el preparador
    // desactiva un plan, la suscripción sigue teniendo su plan_id pero el
    // embebido llega vacío. No es lo mismo que "sin plan" (acceso total):
    // si lo tratáramos igual, le diríamos al alumno que tiene acceso a
    // todo cuando no es verdad.
    const planIlegible = !!s.plan_id && !plan

    const categorias = (plan?.plan_categorias ?? [])
      .map((pc) => rel(pc.categorias_ejercicio)?.nombre)
      .filter((n): n is string => !!n)
      .sort((a, b) => a.localeCompare(b, 'es'))

    let titulo: string
    let cubre: string
    let accesoTotal = false

    if (planIlegible) {
      titulo = 'Plan no disponible'
      cubre =
        'Este plan ya no está a la venta. Tu acceso sigue activo; ' +
        'pregúntale a tu preparador qué incluye.'
    } else if (!plan) {
      // Compatibilidad v1: suscripción sin plan = acceso a todo.
      titulo = 'Acceso completo'
      cubre = 'Todo el contenido de la plataforma (suscripción antigua, sin plan asignado).'
      accesoTotal = true
    } else if (plan.tipo === 'completo') {
      titulo = plan.nombre
      cubre = 'Todas las categorías de entrenamiento.'
      accesoTotal = true
    } else if (plan.tipo === 'oposicion') {
      titulo = plan.nombre
      cubre = `Todo el contenido de ${nombreOposicion(plan.especialidad)}.`
    } else {
      titulo = plan.nombre
      cubre =
        categorias.length > 0
          ? categorias.join(' · ')
          : 'Este plan aún no tiene categorías asignadas.'
    }

    return {
      id: s.id as string,
      estado: s.estado as string,
      metodo: (s.metodo as string) ?? null,
      meses: (s.meses as number) ?? null,
      fechaInicio: (s.fecha_inicio as string) ?? null,
      fechaFin: (s.fecha_fin as string) ?? null,
      vigente,
      plan: plan?.nombre ?? null,
      tipo: plan?.tipo ?? null,
      precioCentimos: plan?.precio_centimos ?? null,
      titulo,
      cubre,
      categorias,
      accesoTotal,
      planIlegible,
    }
  })
}

/** Fecha de fin más lejana entre las vigentes (hasta cuándo tiene acceso). */
export function accesoHasta(subs: SuscripcionAlumno[]): string | null {
  const fechas = subs.filter((s) => s.vigente && s.fechaFin).map((s) => s.fechaFin as string)
  if (fechas.length === 0) return null
  return fechas.sort().at(-1) as string
}
