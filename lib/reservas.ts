// Reservas de clases presenciales.
//
// El preparador da clases de 1 h en el centro, de lunes a viernes, con
// aforo. Los alumnos PRESENCIALES (marca del perfil que solo pone el
// admin) reservan turno desde la app. Horario, duración, aforo,
// antelación y plazo de cancelación los cambia el admin desde
// /admin/reservas/horario: aquí no hay nada fijo.
//
// Toda la lógica de "¿puede reservar?" vive en Postgres (reservar_clase y
// cancelar_reserva, migración 022). Lo de aquí solo PINTA el calendario:
// si alguien se salta el botón, la función de BBDD dice que no igual.
import type { SupabaseClient } from '@supabase/supabase-js'
import { hoyMadrid, sumarDias, diasEntre } from '@/lib/evaluaciones'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SB = SupabaseClient<any, 'public', any>

export type ConfigReservas = {
  duracion_min: number
  plazas_por_turno: number
  antelacion_max_dias: number
  cancelacion_min_horas: number
  max_por_dia: number
}
export type Franja = { id?: string; dia_semana: number; hora_inicio: string; hora_fin: string }
export type Bloqueo = {
  id: string
  fecha: string
  hora_inicio: string | null
  hora_fin: string | null
  motivo: string | null
}
export type Reserva = { id: string; fecha: string; hora: string; estado: string }

export type EstadoTurno = 'libre' | 'completo' | 'pasado' | 'bloqueado' | 'mia'
export type Turno = {
  hora: string // 'HH:MM'
  ocupadas: number
  plazas: number
  estado: EstadoTurno
  reservaId?: string
  cancelable?: boolean
  motivo?: string
}
export type DiaTurnos = { fecha: string; turnos: Turno[] }

export const CONFIG_DEFECTO: ConfigReservas = {
  duracion_min: 60,
  plazas_por_turno: 7,
  antelacion_max_dias: 14,
  cancelacion_min_horas: 2,
  max_por_dia: 1,
}

export const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

/** 'HH:MM:SS' o 'HH:MM' → minutos desde medianoche */
export function aMinutos(hora: string): number {
  const [h, m] = hora.split(':').map(Number)
  return h * 60 + (m || 0)
}
export function aHora(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
}
/** Postgres devuelve 'HH:MM:SS'; en la app trabajamos con 'HH:MM' */
export function horaCorta(hora: string): string {
  return hora.slice(0, 5)
}

/** Día ISO de la semana (1 = lunes … 7 = domingo) de una fecha 'YYYY-MM-DD' */
export function diaSemana(fechaISO: string): number {
  const [y, m, d] = fechaISO.split('-').map(Number)
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay() // 0 = domingo
  return dow === 0 ? 7 : dow
}

export type CeldaMes = { fecha: string; dia: number; fuera: boolean }

/**
 * Las celdas de un calendario mensual (y, m 1-12): semanas completas de
 * lunes a domingo, con los días de fuera del mes marcados. Es solo la
 * GEOMETRÍA de la rejilla; cada pantalla (alumno, admin) le añade encima
 * sus propios datos por día (plazas libres, ocupación, bloqueos…).
 */
export function celdasMes(y: number, m: number): CeldaMes[] {
  const mm = String(m).padStart(2, '0')
  const primero = `${y}-${mm}-01`
  const diasMes = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const inicio = sumarDias(primero, -(diaSemana(primero) - 1)) // el lunes de la primera semana
  const total = Math.ceil((diaSemana(primero) - 1 + diasMes) / 7) * 7
  return Array.from({ length: total }, (_, i) => {
    const fecha = sumarDias(inicio, i)
    return { fecha, dia: Number(fecha.slice(8, 10)), fuera: fecha.slice(0, 7) !== `${y}-${mm}` }
  })
}

function fechaUTC(fechaISO: string): Date {
  const [y, m, d] = fechaISO.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

// Solo la primera letra: con text-transform: capitalize salía "17 De Septiembre"
function mayuscula(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** "Lunes, 21 de septiembre" */
export function fmtFechaLarga(fechaISO: string): string {
  return mayuscula(
    fechaUTC(fechaISO).toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone: 'UTC',
    })
  )
}

/** "Septiembre de 2026" (cabecera del calendario mensual) */
export function fmtMesAnio(fechaISO: string): string {
  return mayuscula(
    fechaUTC(fechaISO).toLocaleDateString('es-ES', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  )
}

/** Ahora en Madrid: fecha ISO y minutos desde medianoche */
export function ahoraMadrid(): { fecha: string; minutos: number } {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(new Date())
  const g = (t: string) => partes.find((p) => p.type === t)?.value ?? '00'
  return {
    fecha: `${g('year')}-${g('month')}-${g('day')}`,
    minutos: Number(g('hour')) * 60 + Number(g('minute')),
  }
}

/** Las horas de inicio de los turnos de un día, según horario y duración */
export function horasDelDia(fechaISO: string, horario: Franja[], duracion: number): string[] {
  const dow = diaSemana(fechaISO)
  const horas = new Set<string>()
  for (const f of horario.filter((x) => x.dia_semana === dow)) {
    const fin = aMinutos(f.hora_fin)
    for (let t = aMinutos(f.hora_inicio); t + duracion <= fin; t += duracion) horas.add(aHora(t))
  }
  return [...horas].sort()
}

/** El bloqueo que afecta a ese turno, si lo hay (día entero o franja) */
export function bloqueoDe(fechaISO: string, hora: string, bloqueos: Bloqueo[]): Bloqueo | undefined {
  const t = aMinutos(hora)
  return bloqueos.find(
    (b) =>
      b.fecha === fechaISO &&
      (b.hora_inicio === null || (t >= aMinutos(b.hora_inicio) && t < aMinutos(b.hora_fin!)))
  )
}

/** Todo lo que hace falta para pintar el calendario entre dos fechas */
export async function cargarCalendario(supabase: SB, desde: string, hasta: string) {
  const [{ data: cfg }, { data: horario }, { data: bloqueos }, { data: ocupacion }] =
    await Promise.all([
      supabase
        .from('config_reservas')
        .select('duracion_min, plazas_por_turno, antelacion_max_dias, cancelacion_min_horas, max_por_dia')
        .eq('id', 1)
        .single(),
      supabase
        .from('horario_reservas')
        .select('id, dia_semana, hora_inicio, hora_fin')
        .order('dia_semana')
        .order('hora_inicio'),
      supabase
        .from('bloqueos_reservas')
        .select('id, fecha, hora_inicio, hora_fin, motivo')
        .gte('fecha', desde)
        .lte('fecha', hasta)
        .order('fecha')
        .order('hora_inicio'),
      supabase.rpc('ocupacion_reservas', { p_desde: desde, p_hasta: hasta }),
    ])

  const ocupadas = new Map<string, number>()
  for (const o of (ocupacion ?? []) as { fecha: string; hora: string; ocupadas: number }[]) {
    ocupadas.set(`${o.fecha} ${horaCorta(o.hora)}`, Number(o.ocupadas))
  }
  return {
    config: (cfg ?? CONFIG_DEFECTO) as ConfigReservas,
    horario: (horario ?? []) as Franja[],
    bloqueos: (bloqueos ?? []) as Bloqueo[],
    ocupadas,
  }
}

/** Calendario del ALUMNO: los próximos días con turnos y el estado de cada uno */
export function calendarioAlumno(args: {
  config: ConfigReservas
  horario: Franja[]
  bloqueos: Bloqueo[]
  ocupadas: Map<string, number>
  mias: Reserva[]
  desde: string
  dias: number
}): DiaTurnos[] {
  const { config, horario, bloqueos, ocupadas, mias, desde, dias } = args
  const ahora = ahoraMadrid()
  const miasPorClave = new Map(
    mias.filter((r) => r.estado === 'activa').map((r) => [`${r.fecha} ${horaCorta(r.hora)}`, r.id])
  )
  const out: DiaTurnos[] = []
  for (let i = 0; i < dias; i++) {
    const fecha = sumarDias(desde, i)
    const horas = horasDelDia(fecha, horario, config.duracion_min)
    if (horas.length === 0) continue // cerrado (fin de semana, etc.)
    const turnos: Turno[] = horas.map((hora) => {
      const clave = `${fecha} ${hora}`
      const ocup = ocupadas.get(clave) ?? 0
      const bloqueo = bloqueoDe(fecha, hora, bloqueos)
      const minutosHasta = diasEntre(ahora.fecha, fecha) * 1440 + aMinutos(hora) - ahora.minutos
      const pasado = minutosHasta <= 0
      const mia = miasPorClave.get(clave)
      let estado: EstadoTurno = 'libre'
      if (mia) estado = 'mia'
      else if (pasado) estado = 'pasado'
      else if (bloqueo) estado = 'bloqueado'
      else if (ocup >= config.plazas_por_turno) estado = 'completo'
      return {
        hora,
        ocupadas: ocup,
        plazas: config.plazas_por_turno,
        estado,
        reservaId: mia,
        cancelable: mia ? minutosHasta >= config.cancelacion_min_horas * 60 : undefined,
        motivo: bloqueo?.motivo ?? undefined,
      }
    })
    out.push({ fecha, turnos })
  }
  return out
}

/** Modalidad del alumno: presencial (marca del admin) y/o online (suscripción activa) */
export async function modoAlumno(
  supabase: SB,
  userId: string
): Promise<{ presencial: boolean; online: boolean }> {
  const hoy = hoyMadrid()
  const [{ data: perfil }, { data: subs }] = await Promise.all([
    supabase.from('profiles').select('presencial').eq('id', userId).single(),
    supabase
      .from('suscripciones')
      .select('id')
      .eq('user_id', userId)
      .eq('estado', 'activa')
      .gte('fecha_fin', hoy)
      .limit(1),
  ])
  return { presencial: !!perfil?.presencial, online: (subs ?? []).length > 0 }
}
