'use server'

// Cuestionario inicial + perfil del alumno.
// El cuestionario pregunta UNA marca por cada categoría que el alumno
// tiene CONTRATADA (según sus planes activos) y le asigna un tramo
// automático. El alumno no ve qué tramo le toca (así se pidió).
import { revalidatePath } from 'next/cache'
import { exigirUsuario } from '@/lib/autorizacion'

export type EstadoCuestionario = { ok?: boolean; error?: string }

/**
 * Devuelve el tramo que corresponde a una marca dentro de una categoría.
 *  · métrica de tiempo  → MENOS es mejor: cae en el tramo cuyo rango
 *    contiene la marca; el tramo "bajo" son tiempos altos.
 *  · resto (reps/kg/m)  → MÁS es mejor.
 * Si la marca no encaja en ningún rango, devuelve null y el llamador
 * desbloquea todos los tramos (decisión del cliente).
 */
function tramoParaMarca(
  marca: number,
  metrica: string,
  tramos: { id: string; valor_min: number | null; valor_max: number | null; orden: number }[]
): string | null {
  // Ordenados por 'orden' (0 = más básico)
  const ord = [...tramos].sort((a, b) => a.orden - b.orden)
  for (const t of ord) {
    const min = t.valor_min
    const max = t.valor_max
    if (min === null && max === null) continue
    const cumpleMin = min === null || marca >= min
    const cumpleMax = max === null || marca <= max
    if (cumpleMin && cumpleMax) return t.id
  }
  return null // no encaja: se desbloqueará todo
}

export async function guardarCuestionario(
  _prev: EstadoCuestionario,
  formData: FormData
): Promise<EstadoCuestionario> {
  const { supabase, user } = await exigirUsuario()

  // Categorías que vienen del formulario (una marca por categoría)
  const categoriaIds = formData.getAll('categoria_id').map(String)
  if (categoriaIds.length === 0) {
    // Sin categorías contratadas: marcamos el cuestionario como hecho igualmente
    await supabase.from('profiles').update({ cuestionario_completado: true }).eq('id', user.id)
    return { ok: true }
  }

  // Cargamos las categorías y sus tramos de una vez
  const { data: cats } = await supabase
    .from('categorias_ejercicio')
    .select('id, metrica, tramos(id, valor_min, valor_max, orden)')
    .in('id', categoriaIds)

  const mapaCat = new Map((cats ?? []).map((c) => [c.id, c]))

  // Para cada categoría, calcular el tramo y preparar el upsert
  const filas: {
    user_id: string
    categoria_id: string
    tramo_id: string | null
    origen: string
  }[] = []

  for (const catId of categoriaIds) {
    const marcaRaw = formData.get(`marca_${catId}`)
    const cat = mapaCat.get(catId)
    if (!cat || marcaRaw === null || marcaRaw === '') continue

    const marca = Number(String(marcaRaw).replace(',', '.'))
    if (isNaN(marca)) continue

    const tramos = (cat.tramos ?? []) as {
      id: string
      valor_min: number | null
      valor_max: number | null
      orden: number
    }[]
    if (tramos.length === 0) continue

    const tramoId = tramoParaMarca(marca, cat.metrica, tramos)

    // Si encaja, ese tramo. Si NO encaja, tramo_id null = "desbloquear
    // todos los tramos de la categoría" y que el alumno elija (migración 015).
    filas.push({
      user_id: user.id,
      categoria_id: catId,
      tramo_id: tramoId, // null cuando no encaja
      origen: 'autoevaluacion',
    })
  }

  if (filas.length > 0) {
    // upsert: si repite el cuestionario, actualiza su tramo por categoría
    const { error } = await supabase
      .from('alumno_tramos')
      .upsert(filas, { onConflict: 'user_id,categoria_id' })
    if (error) return { error: 'No se pudo guardar tu evaluación. Inténtalo de nuevo.' }
  }

  await supabase.from('profiles').update({ cuestionario_completado: true }).eq('id', user.id)

  revalidatePath('/inicio')
  revalidatePath('/bienvenida')
  return { ok: true }
}

// --------- Perfil del alumno (peso, altura, facilidades) ---------

export type EstadoPerfil = { ok?: boolean; error?: string }

export async function guardarPerfil(
  _prev: EstadoPerfil,
  formData: FormData
): Promise<EstadoPerfil> {
  const { supabase, user } = await exigirUsuario()

  const num = (k: string) => {
    const v = String(formData.get(k) ?? '').replace(',', '.').trim()
    if (v === '') return null
    const n = Number(v)
    return isNaN(n) ? null : n
  }

  const peso = num('peso_kg')
  const altura = num('altura_cm')
  const facilidades = String(formData.get('facilidades') ?? '').trim() || null

  if (peso !== null && (peso < 20 || peso > 300)) return { error: 'Revisa el peso' }
  if (altura !== null && (altura < 100 || altura > 250)) return { error: 'Revisa la altura' }

  const { error } = await supabase
    .from('profiles')
    .update({ peso_kg: peso, altura_cm: altura, facilidades })
    .eq('id', user.id)

  if (error) return { error: 'No se pudieron guardar tus datos' }

  revalidatePath('/perfil')
  return { ok: true }
}
