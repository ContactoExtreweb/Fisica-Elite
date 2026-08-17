'use server'

// Gestión de planes de venta (solo admin). El PRECIO vive en la BBDD:
// el admin lo edita aquí, y la web pública y el checkout lo leerán de
// la base de datos (Fase 5), no de código.
import { revalidatePath } from 'next/cache'
import { exigirAdmin } from '@/lib/autorizacion'
import { slugify } from '@/lib/slug'

export type EstadoPlan = { ok?: boolean; id?: string; error?: string }

const TIPOS = ['ejercicio', 'completo', 'oposicion']
const ESPECIALIDADES = [
  'policia_local',
  'policia_nacional',
  'guardia_civil',
  'fuerzas_armadas',
  'aduanas',
]

export async function guardarPlan(_prev: EstadoPlan, formData: FormData): Promise<EstadoPlan> {
  const { supabase } = await exigirAdmin()
  const texto = (k: string) => String(formData.get(k) ?? '').trim()

  const id = texto('id') || null
  const nombre = texto('nombre')
  const tipo = texto('tipo')
  if (!nombre) return { error: 'El nombre es obligatorio' }
  if (!TIPOS.includes(tipo)) return { error: 'Tipo de plan no válido' }

  const precioEuros = parseFloat(texto('precio').replace(',', '.'))
  if (isNaN(precioEuros) || precioEuros < 0) return { error: 'Revisa el precio' }

  const especialidad = tipo === 'oposicion' ? texto('especialidad') : ''
  if (tipo === 'oposicion' && !ESPECIALIDADES.includes(especialidad))
    return { error: 'Elige la oposición del plan' }

  const categorias = formData.getAll('categorias').map(String)
  if (tipo === 'ejercicio' && categorias.length === 0)
    return { error: 'Elige al menos una categoría de ejercicio para este plan' }

  const datos = {
    nombre,
    slug: slugify(texto('slug') || nombre) || 'plan',
    tipo,
    precio_centimos: Math.round(precioEuros * 100),
    especialidad: tipo === 'oposicion' ? especialidad : null,
    descripcion: texto('descripcion') || null,
    orden: parseInt(texto('orden') || '0', 10) || 0,
    activo: formData.get('activo') === 'on',
  }

  let planId: string | null = id
  if (id) {
    const { error } = await supabase.from('planes').update(datos).eq('id', id)
    if (error)
      return { error: error.code === '23505' ? 'Ya existe un plan con ese slug' : 'No se pudo guardar' }
  } else {
    const { data, error } = await supabase.from('planes').insert(datos).select('id').single()
    if (error)
      return { error: error.code === '23505' ? 'Ya existe un plan con ese slug' : 'No se pudo crear' }
    planId = data.id
  }

  // Sincronizar las categorías incluidas (solo aplican al tipo 'ejercicio')
  if (planId) {
    await supabase.from('plan_categorias').delete().eq('plan_id', planId)
    if (tipo === 'ejercicio' && categorias.length > 0) {
      const { error } = await supabase
        .from('plan_categorias')
        .insert(categorias.map((c) => ({ plan_id: planId, categoria_id: c })))
      if (error) return { error: 'El plan se guardó pero falló al asignar las categorías' }
    }
  }

  revalidatePath('/admin/planes')
  if (planId) revalidatePath(`/admin/planes/${planId}`)
  revalidatePath('/precios')
  return { ok: true, id: planId ?? undefined }
}

export async function borrarPlan(id: string): Promise<{ ok?: boolean; error?: string }> {
  const { supabase } = await exigirAdmin()
  // suscripciones.plan_id es ON DELETE SET NULL: las suscripciones vivas
  // no se rompen (pasan a tratarse como acceso completo).
  const { error } = await supabase.from('planes').delete().eq('id', id)
  if (error) return { error: 'No se pudo borrar el plan' }
  revalidatePath('/admin/planes')
  revalidatePath('/precios')
  return { ok: true }
}
