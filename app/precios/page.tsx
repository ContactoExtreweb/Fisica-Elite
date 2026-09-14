// Página pública de precios. Los planes salen de la BBDD: el preparador
// los edita desde /admin/planes y aquí se reflejan solos, sin tocar código.
//
// Es una página PÚBLICA: se sirve con el cliente normal (anon). La RLS de
// 'planes' solo deja leer los activos, así que un plan desactivado no se
// puede ni ver ni comprar. No hace falta service_role para nada.
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import FormularioPrecios from '@/components/FormularioPrecios'
import { planesALaVenta } from '@/lib/planes'

export const metadata = {
  // Solo el nombre de la sección: el layout raíz le añade "· Físicas Élite"
  // con su template. Si lo pones aquí, sale duplicado.
  title: 'Precios',
  description:
    'Planes de preparación física para oposiciones y entrenamiento por categorías. Paga los meses que quieras, sin cobros automáticos.',
}

// Los precios cambian desde el panel: que no se queden cacheados.
export const dynamic = 'force-dynamic'

export default async function PreciosPage() {
  const supabase = await createClient()
  const planes = await planesALaVenta(supabase)

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
