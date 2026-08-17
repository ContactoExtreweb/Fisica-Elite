'use server'

// Gestión de categorías de ejercicio y sus tramos (solo admin).
// La RLS ya restringe la escritura a admins; exigirAdmin corta antes.
import { revalidatePath } from 'next/cache'
import { exigirAdmin } from '@/lib/autorizacion'
import { slugify } from '@/lib/slug'

export type EstadoCategoria = { ok?: boolean; id?: string; error?: string }

export async function guardarCategoria(
  _prev: EstadoCategoria,
  formData: FormData
): Promise<EstadoCategoria> {
  const { supabase } = await exigirAdmin()
  const texto = (k: string) => String(formData.get(k) ?? '').trim()

  const id = texto('id') || null
  const nombre = texto('nombre')
  if (!nombre) return { error: 'El nombre es obligatorio' }

  const datos = {
    nombre,
    slug: slugify(texto('slug') || nombre) || 'categoria',
    metrica: texto('metrica') || 'repeticiones',
    unidad: texto('unidad') || 'reps',
    descripcion: texto('descripcion') || null,
    orden: parseInt(texto('orden') || '0', 10) || 0,
    activa: formData.get('activa') === 'on',
  }

  if (id) {
    const { error } = await supabase.from('categorias_ejercicio').update(datos).eq('id', id)
    if (error)
      return {
        error: error.code === '23505' ? 'Ya existe una categoría con ese slug' : 'No se pudo guardar',
      }
    revalidatePath('/admin/categorias')
    revalidatePath(`/admin/categorias/${id}`)
    return { ok: true, id }
  }

  const { data, error } = await supabase
    .from('categorias_ejercicio')
    .insert(datos)
    .select('id')
    .single()
  if (error)
    return {
      error: error.code === '23505' ? 'Ya existe una categoría con ese slug' : 'No se pudo crear',
    }
  revalidatePath('/admin/categorias')
  return { ok: true, id: data.id }
}

export async function borrarCategoria(id: string): Promise<{ ok?: boolean; error?: string }> {
  const { supabase } = await exigirAdmin()
  // La FK de ejercicios es RESTRICT: si tiene ejercicios, el borrado falla.
  const { error } = await supabase.from('categorias_ejercicio').delete().eq('id', id)
  if (error)
    return {
      error: 'No se puede borrar: tiene ejercicios asociados. Mueve o borra antes esos ejercicios.',
    }
  revalidatePath('/admin/categorias')
  return { ok: true }
}

// ---------------- Tramos ----------------

export type DatosTramo = {
  categoria_id: string
  nombre: string
  valor_min: number | null
  valor_max: number | null
  orden: number
}

export async function crearTramo(d: DatosTramo): Promise<{ ok?: boolean; error?: string }> {
  const { supabase } = await exigirAdmin()
  if (!d.nombre.trim()) return { error: 'Ponle nombre al tramo (p. ej. «0-9»)' }
  const { error } = await supabase.from('tramos').insert({
    categoria_id: d.categoria_id,
    nombre: d.nombre.trim(),
    valor_min: d.valor_min,
    valor_max: d.valor_max,
    orden: d.orden,
  })
  if (error)
    return {
      error:
        error.code === '23505'
          ? 'Ya hay un tramo con ese orden en esta categoría'
          : 'No se pudo crear el tramo',
    }
  revalidatePath(`/admin/categorias/${d.categoria_id}`)
  return { ok: true }
}

export async function actualizarTramo(
  id: string,
  d: DatosTramo
): Promise<{ ok?: boolean; error?: string }> {
  const { supabase } = await exigirAdmin()
  if (!d.nombre.trim()) return { error: 'El tramo necesita un nombre' }
  const { error } = await supabase
    .from('tramos')
    .update({
      nombre: d.nombre.trim(),
      valor_min: d.valor_min,
      valor_max: d.valor_max,
      orden: d.orden,
    })
    .eq('id', id)
  if (error)
    return {
      error:
        error.code === '23505'
          ? 'Ya hay un tramo con ese orden en esta categoría'
          : 'No se pudo guardar el tramo',
    }
  revalidatePath(`/admin/categorias/${d.categoria_id}`)
  return { ok: true }
}

export async function borrarTramo(
  id: string,
  categoriaId: string
): Promise<{ ok?: boolean; error?: string }> {
  const { supabase } = await exigirAdmin()
  // ejercicios.tramo_id es ON DELETE SET NULL: sus ejercicios pasan a
  // verse en todos los tramos. alumno_tramos se limpia en cascada.
  const { error } = await supabase.from('tramos').delete().eq('id', id)
  if (error) return { error: 'No se pudo borrar el tramo' }
  revalidatePath(`/admin/categorias/${categoriaId}`)
  return { ok: true }
}
