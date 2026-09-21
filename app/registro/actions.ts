'use server'

// Registro diario de marcas del alumno.
//
// El formulario manda los valores en la unidad de la categoría (metros,
// minutos+segundos…) y aquí los normalizamos a lo que guarda la tabla:
// distancia en km y tiempo en segundos.
import { revalidatePath } from 'next/cache'
import { exigirUsuario } from '@/lib/autorizacion'
import type { Parcial } from '@/lib/marcas'
import { hoyMadrid } from '@/lib/fechas'

export type EstadoMarca = { ok?: boolean; error?: string }

function num(fd: FormData, k: string): number | null {
  const v = String(fd.get(k) ?? '').replace(',', '.').trim()
  if (v === '') return null
  const n = Number(v)
  return isNaN(n) ? null : n
}

export async function guardarMarca(
  _prev: EstadoMarca,
  formData: FormData
): Promise<EstadoMarca> {
  const { supabase, user } = await exigirUsuario()

  const categoriaId = String(formData.get('categoria_id') ?? '')
  if (!categoriaId) return { error: 'Elige un ejercicio' }

  const ejercicioId = String(formData.get('ejercicio_id') ?? '') || null
  const metrica = String(formData.get('metrica') ?? 'repeticiones')
  const unidad = String(formData.get('unidad') ?? '')

  const fecha = String(formData.get('fecha') ?? '') || hoyMadrid()

  // --- Valores según lo que mida la categoría ---
  let repeticiones: number | null = null
  let peso: number | null = null
  let distanciaKm: number | null = null
  let tiempoSeg: number | null = null

  if (metrica === 'repeticiones') {
    repeticiones = num(formData, 'repeticiones')
  } else if (metrica === 'peso') {
    peso = num(formData, 'peso_kg')
    repeticiones = num(formData, 'repeticiones') // opcional: peso × reps
  } else if (metrica === 'distancia') {
    const d = num(formData, 'distancia')
    // Si la categoría se mide en metros, el alumno escribe metros
    distanciaKm = d === null ? null : unidad === 'm' ? d / 1000 : d
    // En carrera puede apuntar también el tiempo total
    const min = num(formData, 'tiempo_min') ?? 0
    const seg = num(formData, 'tiempo_seg') ?? 0
    if (min > 0 || seg > 0) tiempoSeg = min * 60 + seg
  } else if (metrica === 'tiempo') {
    const min = num(formData, 'tiempo_min') ?? 0
    const seg = num(formData, 'tiempo_seg') ?? 0
    if (min > 0 || seg > 0) tiempoSeg = min * 60 + seg
  }

  // --- Parciales por 100 m (solo carrera/tiempo) ---
  let series: Parcial[] | null = null
  const metrosArr = formData.getAll('parcial_metros').map(String)
  const segsArr = formData.getAll('parcial_segundos').map(String)
  const parciales: Parcial[] = []
  for (let i = 0; i < metrosArr.length; i++) {
    const m = Number(metrosArr[i])
    const s = Number(String(segsArr[i] ?? '').replace(',', '.'))
    if (!isNaN(m) && !isNaN(s) && s > 0) parciales.push({ metros: m, segundos: s })
  }
  if (parciales.length > 0) series = parciales

  // Debe haber apuntado algo
  const vacio =
    repeticiones === null &&
    peso === null &&
    distanciaKm === null &&
    tiempoSeg === null &&
    series === null
  if (vacio) return { error: 'Apunta al menos una marca' }

  const { error } = await supabase.from('registros_entrenamiento').insert({
    user_id: user.id,
    categoria_id: categoriaId,
    ejercicio_id: ejercicioId,
    fecha,
    repeticiones,
    peso_kg: peso,
    distancia_km: distanciaKm,
    tiempo_seg: tiempoSeg,
    series,
    notas: String(formData.get('notas') ?? '').trim() || null,
  })

  if (error) return { error: 'No se pudo guardar la marca. Inténtalo de nuevo.' }

  revalidatePath('/registro')
  revalidatePath('/inicio')
  return { ok: true }
}

export async function borrarMarca(id: string): Promise<{ ok?: boolean; error?: string }> {
  const { supabase } = await exigirUsuario()
  // La RLS garantiza que solo borra los suyos (o el admin)
  const { error } = await supabase.from('registros_entrenamiento').delete().eq('id', id)
  if (error) return { error: 'No se pudo borrar' }
  revalidatePath('/registro')
  return { ok: true }
}
