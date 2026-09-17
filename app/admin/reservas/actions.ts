'use server'

// Acciones del admin sobre las reservas: cancelar, bloquear turnos o
// días, y guardar horario/aforo. Todas empiezan con exigirAdmin().
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { exigirAdmin } from '@/lib/autorizacion'
import { aMinutos, aHora, DIAS } from '@/lib/reservas'

const FECHA = /^\d{4}-\d{2}-\d{2}$/
const HORA = /^\d{2}:\d{2}$/

function refrescar(fecha?: string): never | void {
  revalidatePath('/admin/reservas')
  revalidatePath('/reservas')
  if (fecha) redirect(`/admin/reservas?fecha=${fecha}`)
}

/** Cancela cualquier reserva (la función de BBDD ya sabe que somos admin). */
export async function cancelarReservaAdmin(formData: FormData) {
  const { supabase } = await exigirAdmin()
  const id = String(formData.get('id') ?? '')
  const fecha = String(formData.get('fecha') ?? '')
  if (!id) return
  await supabase.rpc('cancelar_reserva', { p_id: id })
  refrescar(FECHA.test(fecha) ? fecha : undefined)
}

/** Bloquea un turno (si viene 'hora') o el día entero (si no). */
export async function bloquear(formData: FormData) {
  const { supabase, user } = await exigirAdmin()
  const fecha = String(formData.get('fecha') ?? '')
  const hora = String(formData.get('hora') ?? '')
  const motivo = String(formData.get('motivo') ?? '').trim().slice(0, 120) || null
  if (!FECHA.test(fecha)) return

  let hora_inicio: string | null = null
  let hora_fin: string | null = null
  if (HORA.test(hora)) {
    const { data: cfg } = await supabase
      .from('config_reservas')
      .select('duracion_min')
      .eq('id', 1)
      .single()
    hora_inicio = hora
    hora_fin = aHora(aMinutos(hora) + (cfg?.duracion_min ?? 60))
  }

  await supabase
    .from('bloqueos_reservas')
    .insert({ fecha, hora_inicio, hora_fin, motivo, created_by: user.id })
  refrescar(fecha)
}

export async function desbloquear(formData: FormData) {
  const { supabase } = await exigirAdmin()
  const id = String(formData.get('id') ?? '')
  const fecha = String(formData.get('fecha') ?? '')
  if (!id) return
  await supabase.from('bloqueos_reservas').delete().eq('id', id)
  refrescar(FECHA.test(fecha) ? fecha : undefined)
}

// ---------------- Horario y aforo ----------------

export type EstadoConfig = { error?: string; ok?: boolean }

export async function guardarConfiguracionReservas(
  _prev: EstadoConfig,
  formData: FormData
): Promise<EstadoConfig> {
  const { supabase } = await exigirAdmin()

  const num = (k: string, min: number, max: number) => {
    const v = parseInt(String(formData.get(k) ?? ''), 10)
    return Number.isFinite(v) && v >= min && v <= max ? v : null
  }
  const duracion_min = num('duracion_min', 15, 240)
  const plazas_por_turno = num('plazas_por_turno', 1, 100)
  const antelacion_max_dias = num('antelacion_max_dias', 1, 90)
  const cancelacion_min_horas = num('cancelacion_min_horas', 0, 168)
  const max_por_dia = num('max_por_dia', 1, 10)
  if (
    duracion_min === null ||
    plazas_por_turno === null ||
    antelacion_max_dias === null ||
    cancelacion_min_horas === null ||
    max_por_dia === null
  ) {
    return { error: 'Revisa los valores: hay alguno vacío o fuera de rango' }
  }

  // Horario semanal: por cada día abierto, una o dos franjas
  const franjas: { dia_semana: number; hora_inicio: string; hora_fin: string }[] = []
  for (let d = 1; d <= 7; d++) {
    if (formData.get(`abierto_${d}`) !== 'on') continue
    const nombre = DIAS[d - 1]
    const delDia: [number, number][] = []
    for (const n of [1, 2]) {
      const ini = String(formData.get(`f${n}_ini_${d}`) ?? '').trim()
      const fin = String(formData.get(`f${n}_fin_${d}`) ?? '').trim()
      if (!ini && !fin) continue
      if (!HORA.test(ini) || !HORA.test(fin)) return { error: `${nombre}: hay una hora sin rellenar` }
      const a = aMinutos(ini)
      const b = aMinutos(fin)
      if (b <= a) return { error: `${nombre}: la hora de fin tiene que ser posterior a la de inicio` }
      if (b - a < duracion_min) return { error: `${nombre}: la franja es más corta que un turno` }
      delDia.push([a, b])
      franjas.push({ dia_semana: d, hora_inicio: ini, hora_fin: fin })
    }
    if (delDia.length === 0) return { error: `${nombre} está abierto pero sin horario` }
    if (delDia.length === 2) {
      const [[a1, b1], [a2, b2]] = delDia
      if (a1 < b2 && a2 < b1) return { error: `${nombre}: las dos franjas se solapan` }
    }
  }

  const { error: e1 } = await supabase.from('config_reservas').upsert({
    id: 1,
    duracion_min,
    plazas_por_turno,
    antelacion_max_dias,
    cancelacion_min_horas,
    max_por_dia,
    updated_at: new Date().toISOString(),
  })
  if (e1) return { error: 'No se pudo guardar la configuración' }

  // El horario se reemplaza entero: es pequeño y así no quedan restos
  const { error: e2 } = await supabase.from('horario_reservas').delete().gte('dia_semana', 1)
  if (e2) return { error: 'No se pudo guardar el horario' }
  if (franjas.length > 0) {
    const { error: e3 } = await supabase.from('horario_reservas').insert(franjas)
    if (e3) return { error: 'No se pudo guardar el horario' }
  }

  revalidatePath('/admin/reservas')
  revalidatePath('/admin/reservas/horario')
  revalidatePath('/reservas')
  return { ok: true }
}
