// Los dos avisos que dependen del calendario — SOLO servidor.
//
//   · La clase presencial que el alumno tiene reservada para MAÑANA.
//   · La suscripción que se le acaba dentro de DIAS_PARA_CADUCAR días.
//
// Los lanza la tarea diaria de Vercel (/api/cron/inactividad), con el
// cliente de service_role porque no hay sesión de nadie.
//
// Por qué no hace falta guardar "ya avisado": los dos se disparan en una
// fecha EXACTA (mañana / fecha_fin - 7), así que la tarea diaria los manda
// una sola vez por mucho que se ejecute todos los días. Sin columnas nuevas
// y sin riesgo de avisar dos veces.
import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { hoyMadrid, sumarDias } from '@/lib/fechas'
import { diasEntre } from '@/lib/evaluaciones'
import { categoriasContratadas } from '@/lib/acceso'
import {
  avisar,
  avisoClase,
  avisoCaducidad,
  avisoVentana,
  avisoVentanaCierra,
} from '@/lib/avisos'
import { emailConfigurado } from '@/lib/email'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SB = SupabaseClient<any, 'public', any>

/** Cuántos días antes se avisa de que se acaba el acceso. */
export const DIAS_PARA_CADUCAR = 7

// Mismo motivo que en lib/recordatorios.ts: Resend admite ~2 envíos por
// segundo, y las dos tandas comparten los 60 s de la tarea diaria.
const MAX_POR_EJECUCION = 20
const PAUSA_MS = 550

export type ResumenDiario = {
  simulado: boolean
  clases: { nombre: string; hora: string }[]
  caducan: { nombre: string; fecha: string }[]
  plazos: number
  enviados: number
  quedan: number
}

type Tarea = {
  userId: string
  construir: Parameters<typeof avisar>[2]
  /** Solo los avisos de plazos: su marca en 'avisos_enviados' (migración 035) */
  clave?: string
}

export async function avisosDiarios(
  supabase: SB,
  { simular = false }: { simular?: boolean } = {}
): Promise<ResumenDiario> {
  const hoy = hoyMadrid()
  const manana = sumarDias(hoy, 1)
  const resumen: ResumenDiario = {
    simulado: simular,
    clases: [],
    caducan: [],
    plazos: 0,
    enviados: 0,
    quedan: 0,
  }
  const tareas: Tarea[] = []

  // --- 1 · Clases reservadas para mañana ---
  const { data: reservas } = await supabase
    .from('reservas')
    .select('user_id, hora, profiles(nombre)')
    .eq('fecha', manana)
    .eq('estado', 'activa')
    .order('hora')

  for (const r of reservas ?? []) {
    const nombre = rel<{ nombre: string | null }>(r.profiles)?.nombre ?? 'Alumno'
    resumen.clases.push({ nombre, hora: String(r.hora).slice(0, 5) })
    tareas.push({ userId: r.user_id, construir: avisoClase(String(r.hora), manana) })
  }

  // --- 2 · Suscripciones que se acaban dentro de una semana ---
  // Se leen TODAS las vigentes y se agrupa por alumno: así no se avisa a
  // quien tiene otro plan que le sigue dando acceso más allá de esa fecha.
  const objetivo = sumarDias(hoy, DIAS_PARA_CADUCAR)
  const { data: subs } = await supabase
    .from('suscripciones')
    .select('user_id, fecha_fin, profiles(nombre), planes(nombre)')
    .eq('estado', 'activa')
    .gte('fecha_fin', hoy)

  const porAlumno = new Map<
    string,
    { nombre: string; hasta: string; planes: string[] }
  >()
  for (const s of subs ?? []) {
    const actual = porAlumno.get(s.user_id)
    const plan = rel<{ nombre: string | null }>(s.planes)?.nombre
    if (!actual) {
      porAlumno.set(s.user_id, {
        nombre: rel<{ nombre: string | null }>(s.profiles)?.nombre ?? 'Alumno',
        hasta: s.fecha_fin,
        planes: plan && s.fecha_fin === objetivo ? [plan] : [],
      })
      continue
    }
    if (s.fecha_fin > actual.hasta) actual.hasta = s.fecha_fin
    if (plan && s.fecha_fin === objetivo) actual.planes.push(plan)
  }

  for (const [userId, a] of porAlumno) {
    if (a.hasta !== objetivo) continue // le queda acceso por otro plan
    resumen.caducan.push({ nombre: a.nombre, fecha: a.hasta })
    tareas.push({
      userId,
      construir: avisoCaducidad(a.hasta, a.planes, DIAS_PARA_CADUCAR),
    })
  }

  // --- 3 · Plazos de pruebas reales (van al final: son los que más son) ---
  const plazos = await tareasDePlazos(supabase, hoy)
  resumen.plazos = plazos.length
  tareas.push(...plazos)

  // --- 4 · Enviar ---
  const lote = tareas.slice(0, MAX_POR_EJECUCION)
  resumen.quedan = tareas.length - lote.length
  if (simular) return resumen

  for (const [i, t] of lote.entries()) {
    if (i > 0) await new Promise((r) => setTimeout(r, PAUSA_MS))
    await avisar(supabase, t.userId, t.construir)
    // Se marca JUSTO después de cada envío: si la ejecución se corta a
    // medias, mañana se sigue por el siguiente y nadie lo recibe dos veces.
    if (t.clave) await marcarEnviada(supabase, t.clave)
    resumen.enviados++
  }
  if (!emailConfigurado() && lote.length > 0) {
    console.warn('[avisos diarios] sin Resend configurado: solo se han mandado los push')
  }
  return resumen
}

/** Supabase devuelve la relación como objeto o como array según el caso. */
function rel<T>(x: unknown): T | undefined {
  if (!x) return undefined
  return (Array.isArray(x) ? x[0] : x) as T
}

// ---------------------------------------------------------------------
//  Plazos de pruebas reales
// ---------------------------------------------------------------------
//
// Dos avisos por plazo abierto: cuando empieza («ya puedes subir tu vídeo») y
// cuando quedan pocos días, solo a quien todavía no ha subido nada.
//
// Estos van a mucha gente de golpe, así que NO se puede usar el truco de la
// fecha exacta: no caben todos en una ejecución. Se deja rastro de cada aviso
// entregado en 'avisos_enviados' (migración 035) y al día siguiente se sigue
// por donde se quedó, sin repetirle nada a nadie.

/** Cuántos días antes del cierre se le recuerda al que no ha subido. */
export const DIAS_AVISO_CIERRE = 3

type Ventana = {
  id: string
  nombre: string
  fecha_inicio: string
  fecha_fin: string
  categoria_id: string | null
  categorias_ejercicio: { nombre: string } | { nombre: string }[] | null
}

type Pendiente = { clave: string; userId: string; categoriaId: string | null; construir: Tarea['construir'] }

async function tareasDePlazos(supabase: SB, hoy: string): Promise<Tarea[]> {
  // 1 · Plazos abiertos hoy. Si no hay ninguno, no se consulta nada más.
  const { data: ventanas } = await supabase
    .from('ventanas_evaluacion')
    .select('id, nombre, fecha_inicio, fecha_fin, categoria_id, categorias_ejercicio(nombre)')
    .eq('activa', true)
    .lte('fecha_inicio', hoy)
    .gte('fecha_fin', hoy)
  const abiertas = (ventanas ?? []) as Ventana[]
  if (abiertas.length === 0) return []

  // 2 · Alumnos con acceso vigente (una sola consulta).
  const { data: subs } = await supabase
    .from('suscripciones')
    .select('user_id')
    .eq('estado', 'activa')
    .gte('fecha_fin', hoy)
  const alumnos = [...new Set((subs ?? []).map((s) => s.user_id as string))]
  if (alumnos.length === 0) return []

  const cierre = sumarDias(hoy, DIAS_AVISO_CIERRE)

  // 3 · Todas las combinaciones posibles alumno × plazo, y cuáles ya se
  //     mandaron. Esto se hace ANTES de mirar qué tiene contratado cada uno:
  //     pasado el primer día ya están todas marcadas y no se consulta más.
  const posibles: Pendiente[] = []
  for (const v of abiertas) {
    const cat = Array.isArray(v.categorias_ejercicio)
      ? v.categorias_ejercicio[0]
      : v.categorias_ejercicio
    const nombreCat = cat?.nombre ?? null
    for (const userId of alumnos) {
      posibles.push({
        clave: `ventana:${v.id}:abre:${userId}`,
        userId,
        categoriaId: v.categoria_id,
        construir: avisoVentana(nombreCat, v.nombre, v.fecha_fin),
      })
    }
    if (v.fecha_fin <= cierre) {
      const dias = diasEntre(hoy, v.fecha_fin)
      for (const userId of alumnos) {
        posibles.push({
          clave: `ventana:${v.id}:cierra:${userId}`,
          userId,
          categoriaId: v.categoria_id,
          construir: avisoVentanaCierra(nombreCat, v.fecha_fin, Math.max(1, dias)),
        })
      }
    }
  }

  const enviados = await clavesEnviadas(
    supabase,
    posibles.map((p) => p.clave)
  )
  const pendientes = posibles.filter((p) => !enviados.has(p.clave))
  if (pendientes.length === 0) return []

  // 4 · ¿A quién le toca de verdad? Solo a quien tenga contratada la
  //     categoría del plazo (si el plazo es de una). Se calcula una vez por
  //     alumno y se reutiliza, que cada cálculo son dos consultas.
  const categoriasDe = new Map<string, Set<string>>()
  const puedeVer = async (userId: string, categoriaId: string | null) => {
    if (!categoriaId) return true
    let suyas = categoriasDe.get(userId)
    if (!suyas) {
      const cats = await categoriasContratadas(supabase, userId)
      suyas = new Set(cats.map((c) => c.id))
      categoriasDe.set(userId, suyas)
    }
    return suyas.has(categoriaId)
  }

  // 5 · Y en el aviso de cierre, solo a quien NO haya subido ya su vídeo.
  const yaSubieron = new Map<string, Set<string>>()
  const subioEn = async (v: Ventana): Promise<Set<string>> => {
    const cacheada = yaSubieron.get(v.id)
    if (cacheada) return cacheada
    let consulta = supabase
      .from('evaluaciones')
      .select('user_id')
      .gte('fecha_examen', v.fecha_inicio)
      .lte('fecha_examen', v.fecha_fin)
    if (v.categoria_id) consulta = consulta.eq('categoria_id', v.categoria_id)
    const { data } = await consulta
    const set = new Set((data ?? []).map((e: { user_id: string }) => e.user_id))
    yaSubieron.set(v.id, set)
    return set
  }

  const tareas: Tarea[] = []
  for (const p of pendientes) {
    const [, ventanaId, tipo] = p.clave.split(':')
    if (!(await puedeVer(p.userId, p.categoriaId))) {
      // No le toca: se marca igualmente para no recalcularlo cada día.
      await marcarEnviada(supabase, p.clave)
      continue
    }
    if (tipo === 'cierra') {
      const v = abiertas.find((x) => x.id === ventanaId)
      if (v && (await subioEn(v)).has(p.userId)) {
        await marcarEnviada(supabase, p.clave)
        continue
      }
    }
    tareas.push({ userId: p.userId, construir: p.construir, clave: p.clave })
  }
  return tareas
}

/** Cuáles de estas claves ya se mandaron (migración 035). */
async function clavesEnviadas(supabase: SB, claves: string[]): Promise<Set<string>> {
  const fuera = new Set<string>()
  if (claves.length === 0) return fuera
  // Se pregunta en trozos: una lista enorme en un .in() no pasa por la URL.
  for (let i = 0; i < claves.length; i += 200) {
    const { data, error } = await supabase
      .from('avisos_enviados')
      .select('clave')
      .in('clave', claves.slice(i, i + 200))
    if (error) {
      // Sin la tabla no se puede saber a quién se avisó ya: mejor no mandar
      // nada que mandarle a todo el mundo el mismo aviso cada día.
      console.error('[avisos diarios] falta la migración 035', error.message)
      return new Set(claves)
    }
    for (const f of data ?? []) fuera.add(f.clave as string)
  }
  return fuera
}

async function marcarEnviada(supabase: SB, clave: string): Promise<void> {
  await supabase.from('avisos_enviados').upsert({ clave }, { onConflict: 'clave' })
}
