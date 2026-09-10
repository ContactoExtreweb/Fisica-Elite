// Página pública de precios. Los planes salen de la BBDD: el preparador
// los edita desde /admin/planes y aquí se reflejan solos, sin tocar código.
//
// Es una página PÚBLICA: se sirve con el cliente normal (anon). La RLS de
// 'planes' solo deja leer los activos, así que un plan desactivado no se
// puede ni ver ni comprar. No hace falta service_role para nada.
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import FormularioPrecios, { type PlanPublico } from '@/components/FormularioPrecios'
import { nombreOposicion } from '@/lib/oposiciones'

export const metadata = {
  // Solo el nombre de la sección: el layout raíz le añade "· Físicas Élite"
  // con su template. Si lo pones aquí, sale duplicado.
  title: 'Precios',
  description:
    'Planes de preparación física para oposiciones y entrenamiento por categorías. Paga los meses que quieras, sin cobros automáticos.',
}

// Los precios cambian desde el panel: que no se queden cacheados.
export const dynamic = 'force-dynamic'

function rel<T>(x: T | T[] | null | undefined): T | undefined {
  if (!x) return undefined
  return Array.isArray(x) ? x[0] : x
}

export default async function PreciosPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('planes')
    .select(
      'id, nombre, tipo, especialidad, descripcion, precio_centimos, orden, plan_categorias(categorias_ejercicio(nombre))'
    )
    .eq('activo', true)
    .order('orden')

  const planes: PlanPublico[] = (data ?? [])
    // Sin precio válido no se puede cobrar: fuera de la parrilla.
    .filter((p) => typeof p.precio_centimos === 'number' && p.precio_centimos >= 50)
    .map((p) => {
      const categorias = (p.plan_categorias ?? [])
        .map((pc) => rel(pc.categorias_ejercicio)?.nombre)
        .filter((n): n is string => !!n)
        .sort((a, b) => a.localeCompare(b, 'es'))

      const descripcion = ((p.descripcion as string) ?? '').trim() || null

      // En los planes de "todo" y de oposición, la descripción que escribe
      // el preparador dice lo mismo que el texto genérico. Si la ha
      // escrito, manda la suya y no repetimos. En los de categorías no
      // choca: ahí el texto solo hace de etiqueta de las pastillas.
      let cubre: string
      let descripcionExtra: string | null = descripcion

      if (p.tipo === 'completo') {
        cubre = descripcion ?? 'Todas las categorías de entrenamiento de la plataforma.'
        descripcionExtra = null
      } else if (p.tipo === 'oposicion') {
        cubre = descripcion ?? `Todo el contenido específico de ${nombreOposicion(p.especialidad)}.`
        descripcionExtra = null
      } else {
        cubre = categorias.length > 0 ? 'Acceso a estas categorías:' : 'Plan por categorías.'
      }

      return {
        id: p.id as string,
        nombre: p.nombre as string,
        tipo: p.tipo as PlanPublico['tipo'],
        descripcion: descripcionExtra,
        precioCentimos: p.precio_centimos as number,
        cubre,
        categorias,
      }
    })

  return (
    <div className="precios-pagina">
      <header className="precios-header">
        <Link href="/" className="brand">
          FÍSICAS<span className="accent">.</span>ELITE
        </Link>
        <Link href="/login" className="precios-login-link">
          Ya soy alumno →
        </Link>
      </header>

      <div className="precios-hero">
        <h1>
          Empieza tu <em>preparación.</em>
        </h1>
        <p>
          Elige el plan que necesitas y cuántos meses quieres. Tu preparador
          validará el alta y te dará acceso personalmente.
        </p>
      </div>

      <FormularioPrecios planes={planes} />
    </div>
  )
}
