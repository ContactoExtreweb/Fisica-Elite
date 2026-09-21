// Lo que el asistente puede saber de los EJERCICIOS de un alumno.
//
// SOLO SERVIDOR, y siempre con el cliente que trae la SESIÓN DEL ALUMNO
// (lib/supabase/server.ts), NUNCA con el cliente admin. Es la seguridad de
// todo esto: la RLS de 'ejercicios' decide qué ve cada alumno (publicado,
// suscripción activa, plan que cubre la categoría, tramo). Como aquí se lee
// con su propia sesión, el asistente solo conoce lo que ese alumno ya puede
// ver en la web: si no ha pagado un ejercicio, la consulta no devuelve nada
// y el asistente no sabe que existe. Misma regla que la ficha del ejercicio
// (app/ejercicio/[slug]/page.tsx).
//
// No se lee ni se manda el vídeo (video_id): el asistente solo ve texto.
//
// Best-effort: si algo falla, el asistente sigue funcionando sin contexto de
// ejercicios (por eso todo va en try/catch y devuelve vacío).
import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ContextoAlumno, EjercicioContexto } from '@/lib/asistente/conocimiento'

// Los slugs de la web son minúsculas, números y guiones (lib/slug.ts).
// Se valida antes de tocar la BBDD, aunque el cliente ya escapa el valor.
const SLUG_VALIDO = /^[a-z0-9][a-z0-9-]{0,119}$/

function rel<T>(x: T | T[] | null | undefined): T | undefined {
  if (!x) return undefined
  return Array.isArray(x) ? x[0] : x
}

type FilaFicha = {
  id: string
  titulo: string
  descripcion: string | null
  tecnica: string | null
  errores_comunes: string | null
  variantes: string | null
  mejoras: string | null
  categorias_ejercicio: { nombre: string } | { nombre: string }[] | null
}

type FilaLista = {
  titulo: string
  categorias_ejercicio: { nombre: string; orden: number } | { nombre: string; orden: number }[] | null
}

export async function contextoAlumno(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, 'public', any>,
  slug: string | null
): Promise<ContextoAlumno> {
  const vacio: ContextoAlumno = { ejercicio: null, catalogo: [] }
  try {
    const slugOk = slug && SLUG_VALIDO.test(slug) ? slug : null

    const [{ data: ficha }, { data: lista }] = await Promise.all([
      slugOk
        ? supabase
            .from('ejercicios')
            .select(
              'id, titulo, descripcion, tecnica, errores_comunes, variantes, mejoras, categorias_ejercicio(nombre)'
            )
            .eq('slug', slugOk)
            .eq('publicado', true)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      // Los de entrenamiento, como en /ejercicios (los explicativos van en su sección)
      supabase
        .from('ejercicios')
        .select('titulo, categorias_ejercicio(nombre, orden)')
        .eq('publicado', true)
        .eq('explicativo', false)
        .order('orden')
        .limit(120),
    ])

    const catalogo = ((lista ?? []) as unknown as FilaLista[])
      .map((e) => ({
        titulo: e.titulo,
        categoria: rel(e.categorias_ejercicio)?.nombre ?? 'Otros',
        catOrden: rel(e.categorias_ejercicio)?.orden ?? 999,
      }))
      .sort((a, b) => a.catOrden - b.catOrden)
      .map(({ titulo, categoria }) => ({ titulo, categoria }))

    let ejercicio: EjercicioContexto | null = null
    const f = ficha as unknown as FilaFicha | null
    if (f) {
      const { data: faqs } = await supabase
        .from('ejercicio_faqs')
        .select('pregunta, respuesta')
        .eq('ejercicio_id', f.id)
        .order('orden')
        .limit(10)
      ejercicio = {
        titulo: f.titulo,
        categoria: rel(f.categorias_ejercicio)?.nombre ?? null,
        descripcion: f.descripcion,
        tecnica: f.tecnica,
        errores_comunes: f.errores_comunes,
        variantes: f.variantes,
        mejoras: f.mejoras,
        faqs: (faqs ?? []) as { pregunta: string; respuesta: string }[],
      }
    }

    return { ejercicio, catalogo }
  } catch {
    return vacio
  }
}
