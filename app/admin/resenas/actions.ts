'use server'

// Reseñas de la web pública (solo admin). Se copian a mano de Google u otro
// sitio; aquí se crean, editan, ocultan y borran. La RLS de 'resenas'
// (migración 026) ya solo deja escribir al admin: esto es la segunda barrera.
import { revalidatePath } from 'next/cache'
import { exigirAdmin } from '@/lib/autorizacion'

export type EstadoResena = { ok?: boolean; id?: string; error?: string }

// Las mismas longitudes que los CHECK de la tabla
const MAX_NOMBRE = 80
const MAX_TEXTO = 1200
const MAX_ORIGEN = 40

/** Inicio y Sobre nosotros van cacheados: hay que avisarles de que cambió algo. */
function refrescarWeb() {
  revalidatePath('/admin/resenas')
  revalidatePath('/')
  revalidatePath('/sobre-nosotros')
}

export async function guardarResena(_prev: EstadoResena, formData: FormData): Promise<EstadoResena> {
  const { supabase } = await exigirAdmin()
  const texto = (k: string) => String(formData.get(k) ?? '').trim()

  const id = texto('id') || null
  const nombre = texto('nombre')
  const cuerpo = texto('texto')
  const origen = texto('origen')
  const puntuacion = parseInt(texto('puntuacion'), 10)

  if (!nombre) return { error: 'El nombre es obligatorio' }
  if (nombre.length > MAX_NOMBRE) return { error: `El nombre no puede pasar de ${MAX_NOMBRE} caracteres` }
  if (!cuerpo) return { error: 'Escribe el texto de la reseña' }
  if (cuerpo.length > MAX_TEXTO) return { error: `El texto no puede pasar de ${MAX_TEXTO} caracteres` }
  if (!(puntuacion >= 1 && puntuacion <= 5)) return { error: 'La puntuación va de 1 a 5' }
  if (origen.length > MAX_ORIGEN) return { error: `La procedencia no puede pasar de ${MAX_ORIGEN} caracteres` }

  const datos = {
    nombre,
    texto: cuerpo,
    puntuacion,
    origen: origen || null,
    orden: parseInt(texto('orden') || '0', 10) || 0,
    visible: formData.get('visible') === 'on',
  }

  let resenaId: string | null = id
  if (id) {
    const { error } = await supabase.from('resenas').update(datos).eq('id', id)
    if (error) return { error: 'No se pudo guardar' }
  } else {
    const { data, error } = await supabase.from('resenas').insert(datos).select('id').single()
    if (error) return { error: 'No se pudo crear' }
    resenaId = data.id
  }

  refrescarWeb()
  if (resenaId) revalidatePath(`/admin/resenas/${resenaId}`)
  return { ok: true, id: resenaId ?? undefined }
}

export async function borrarResena(id: string): Promise<{ ok?: boolean; error?: string }> {
  const { supabase } = await exigirAdmin()
  const { error } = await supabase.from('resenas').delete().eq('id', id)
  if (error) return { error: 'No se pudo borrar la reseña' }
  refrescarWeb()
  return { ok: true }
}
