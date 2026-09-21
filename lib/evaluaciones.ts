// Evaluaciones: las "pruebas reales" que el alumno graba y sube en vídeo.
//
// La idea del cliente: que el alumno demuestre en vídeo que hace de
// verdad las marcas que dice tener. El preparador lo ve, corrige la
// técnica y decide si ese tramo es el suyo.
//
// MANDA EL PREPARADOR, NO EL CALENDARIO DE CADA UNO (migración 019).
// Él abre una VENTANA de fechas y solo dentro de ella se puede subir.
// Antes se calculaba "6 semanas desde tu última subida", lo que daba un
// goteo continuo y unas semanas distintas para cada alumno.
import type { SupabaseClient } from '@supabase/supabase-js'
import { hoyMadrid, sumarDias } from '@/lib/fechas'

/** Cadencia que pidió el cliente. Se usa para proponerle al preparador
 *  la fecha de la siguiente ventana, no para decidir quién puede subir. */
export const SEMANAS_ENTRE_EVALUACIONES = 6

export type EvaluacionAlumno = {
  id: string
  categoriaId: string | null
  categoria: string
  fechaExamen: string
  videoId: string | null
  notasAlumno: string | null
  estado: 'pendiente' | 'revisada'
  feedback: string | null
  creadaEl: string
}

export type Ventana = {
  id: string
  nombre: string
  inicio: string
  fin: string
  /** null = vale para todas las categorías */
  categoriaId: string | null
  activa: boolean
}

function rel<T>(x: T | T[] | null | undefined): T | undefined {
  if (!x) return undefined
  return Array.isArray(x) ? x[0] : x
}

// Antes se definían aquí; ahora viven en lib/fechas.ts (una sola copia).
export { hoyMadrid, sumarDias }

/** Días entre dos fechas ISO (b - a). Negativo si b es anterior. */
export function diasEntre(a: string, b: string): number {
  const fa = new Date(a + 'T00:00:00Z').getTime()
  const fb = new Date(b + 'T00:00:00Z').getTime()
  return Math.round((fb - fa) / 86_400_000)
}

export async function misEvaluaciones(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, 'public', any>,
  userId: string
): Promise<EvaluacionAlumno[]> {
  // OJO: el select en UNA sola cadena literal (si se parte, supabase-js
  // pierde los tipos). Ver lib/suscripciones.ts.
  const { data } = await supabase
    .from('evaluaciones')
    .select(
      'id, categoria_id, fecha_examen, video_id, notas_alumno, estado, feedback, created_at, categorias_ejercicio(nombre)'
    )
    .eq('user_id', userId)
    .order('fecha_examen', { ascending: false })

  return (data ?? []).map((e) => ({
    id: e.id as string,
    categoriaId: (e.categoria_id as string) ?? null,
    categoria: rel(e.categorias_ejercicio)?.nombre ?? 'General',
    fechaExamen: e.fecha_examen as string,
    videoId: (e.video_id as string) ?? null,
    notasAlumno: (e.notas_alumno as string) ?? null,
    estado: (e.estado as 'pendiente' | 'revisada') ?? 'pendiente',
    feedback: (e.feedback as string) ?? null,
    creadaEl: e.created_at as string,
  }))
}

/** Ventanas activas, de la más reciente a la más antigua. */
export async function ventanasActivas(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, 'public', any>
): Promise<Ventana[]> {
  const { data } = await supabase
    .from('ventanas_evaluacion')
    .select('id, nombre, fecha_inicio, fecha_fin, categoria_id, activa')
    .eq('activa', true)
    .order('fecha_inicio', { ascending: false })

  return (data ?? []).map((v) => ({
    id: v.id as string,
    nombre: v.nombre as string,
    inicio: v.fecha_inicio as string,
    fin: v.fecha_fin as string,
    categoriaId: (v.categoria_id as string) ?? null,
    activa: v.activa as boolean,
  }))
}

/**
 * La ventana ABIERTA hoy que cubre esta categoría, si la hay.
 * Una ventana concreta de la categoría manda sobre una general.
 */
export function ventanaAbiertaPara(
  ventanas: Ventana[],
  categoriaId: string,
  hoy = hoyMadrid()
): Ventana | null {
  const abiertas = ventanas.filter((v) => v.inicio <= hoy && hoy <= v.fin)
  return (
    abiertas.find((v) => v.categoriaId === categoriaId) ??
    abiertas.find((v) => v.categoriaId === null) ??
    null
  )
}

/** La siguiente ventana que abrirá para esta categoría. */
export function proximaVentanaPara(
  ventanas: Ventana[],
  categoriaId: string,
  hoy = hoyMadrid()
): Ventana | null {
  const futuras = ventanas
    .filter((v) => v.inicio > hoy)
    .filter((v) => v.categoriaId === categoriaId || v.categoriaId === null)
    .sort((a, b) => a.inicio.localeCompare(b.inicio))
  return futuras[0] ?? null
}

export type EstadoCategoria = {
  categoriaId: string
  categoria: string
  /** Ventana abierta ahora mismo para esta categoría */
  ventana: Ventana | null
  /** Siguiente ventana, si no hay ninguna abierta */
  proxima: Ventana | null
  /** Ya subió su prueba dentro de la ventana abierta */
  yaSubida: boolean
  /** Fecha de su última prueba de esta categoría */
  ultima: string | null
  /** Puede subir AHORA: hay ventana abierta y no ha subido aún */
  puedeSubir: boolean
}

export function calendarioPorCategoria(
  categorias: { id: string; nombre: string }[],
  evaluaciones: EvaluacionAlumno[],
  ventanas: Ventana[],
  hoy = hoyMadrid()
): EstadoCategoria[] {
  return categorias.map((c) => {
    const suyas = evaluaciones.filter((e) => e.categoriaId === c.id)
    const ultima = suyas.length > 0 ? suyas[0].fechaExamen : null

    const ventana = ventanaAbiertaPara(ventanas, c.id, hoy)
    const proxima = ventana ? null : proximaVentanaPara(ventanas, c.id, hoy)

    // ¿Ya subió dentro de esta ventana? Una prueba por categoría y
    // ventana: si se equivocó, borra la pendiente y vuelve a subir.
    const yaSubida = ventana
      ? suyas.some((e) => e.fechaExamen >= ventana.inicio && e.fechaExamen <= ventana.fin)
      : false

    return {
      categoriaId: c.id,
      categoria: c.nombre,
      ventana,
      proxima,
      yaSubida,
      ultima,
      puedeSubir: !!ventana && !yaSubida,
    }
  })
}

/** Cuántas categorías puede grabar ahora mismo. */
export function cuantasPuedeSubir(calendario: EstadoCategoria[]): number {
  return calendario.filter((c) => c.puedeSubir).length
}
