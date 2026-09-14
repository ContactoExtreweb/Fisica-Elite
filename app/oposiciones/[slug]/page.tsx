// Página pública de detalle por oposición: /oposiciones/policia-nacional…
//
// El cliente las pidió "con estilos remarcados, que se sepa que está
// viendo" la suya: cada cuerpo trae su color y su emblema. El color se
// aplica con una variable CSS (--cuerpo) al contenedor, así el CSS es uno
// solo para las cuatro.
//
// El CONTENIDO (pruebas, textos) vive en lib/oposiciones.ts. Ahí está
// explicado por qué no se publican marcas ni baremos concretos.
//
// Si hay un plan de esa oposición a la venta, se enseña; si no, se manda a
// la página de precios. Así la página se completa sola cuando el
// preparador cree el plan desde /admin/planes.
import type { CSSProperties } from 'react'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import NavPublica from '@/components/NavPublica'
import FooterPublico from '@/components/FooterPublico'
import { createClient } from '@/lib/supabase/server'
import { planesALaVenta, euros } from '@/lib/planes'
import { FICHAS, fichaPorSlug, AVISO_BAREMO, EMBLEMA } from '@/lib/oposiciones'

// Los planes y sus precios se editan desde el panel: nada cacheado.
export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const ficha = fichaPorSlug(slug)
  if (!ficha) return { title: 'Oposición no encontrada' }

  return {
    title: ficha.nombre,
    description: ficha.entradilla,
    openGraph: {
      title: `${ficha.titular} · Físicas Élite`,
      description: ficha.entradilla,
      type: 'article',
      locale: 'es_ES',
    },
  }
}

export default async function OposicionPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const ficha = fichaPorSlug(slug)
  if (!ficha) notFound()

  const supabase = await createClient()
  const planes = await planesALaVenta(supabase)

  // Los de ESTA oposición, y los de "todo" como alternativa.
  const suyos = planes.filter((p) => p.tipo === 'oposicion' && p.especialidad === ficha.clave)
  const completos = planes.filter((p) => p.tipo === 'completo')
  const aEnsenar = suyos.length > 0 ? suyos : completos

  const otras = FICHAS.filter((f) => f.slug !== ficha.slug)
  const emblema = EMBLEMA[ficha.clave]

  return (
    <>
      <NavPublica />

      <main
        className="pub opo-pagina"
        style={{ '--cuerpo': ficha.color } as CSSProperties}
      >
        <section className="opo-hero">
          <div className="opo-hero-inner">
            {emblema && (
              <div className="opo-emblema">
                <Image src={emblema} alt={`Emblema de ${ficha.nombre}`} width={96} height={96} />
              </div>
            )}
            <span className="opo-eyebrow">Preparación específica</span>
            <h1>{ficha.titular}</h1>
            <p>{ficha.entradilla}</p>
            <div className="opo-hero-acciones">
              <Link href="/precios" className="opo-cta">
                Ver planes
              </Link>
              <Link href="/contacto" className="opo-cta-fantasma">
                Hablar con el preparador
              </Link>
            </div>
          </div>
        </section>

        <section className="sec-pub">
          <div className="sec-pub-cab">
            <span className="sec-pub-eyebrow">Qué te van a pedir</span>
            <h2>Las pruebas de {ficha.nombre}</h2>
          </div>

          <div className="opo-pruebas">
            {ficha.pruebas.map((p, i) => (
              <div key={p.nombre} className="opo-prueba">
                <span className="opo-prueba-num">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <h3>{p.nombre}</h3>
                  <p>{p.detalle}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="opo-aviso">{AVISO_BAREMO}</p>
        </section>

        {aEnsenar.length > 0 && (
          <section className="sec-pub sec-pub-alt">
            <div className="sec-pub-cab">
              <span className="sec-pub-eyebrow">Planes</span>
              <h2>
                {suyos.length > 0
                  ? `Preparación de ${ficha.nombre}`
                  : 'Empieza por aquí'}
              </h2>
            </div>
            <div className="planes-grid">
              {aEnsenar.map((p) => (
                <Link key={p.id} href="/precios" className="plan-card plan-card-link">
                  <div className="plan-card-cab">
                    <span className="plan-card-nombre">{p.nombre}</span>
                    {p.tipo === 'completo' && <span className="plan-card-etq total">Todo</span>}
                    {p.tipo === 'oposicion' && (
                      <span className="plan-card-etq opo">Oposición</span>
                    )}
                  </div>
                  <div className="plan-card-precio">
                    {euros(p.precioCentimos)}€<span>/mes</span>
                  </div>
                  <p className="plan-card-cubre">{p.cubre}</p>
                  {p.categorias.length > 0 && (
                    <div className="plan-card-cats">
                      {p.categorias.map((c) => (
                        <span key={c} className="plan-card-cat">
                          {c}
                        </span>
                      ))}
                    </div>
                  )}
                  <span className="plan-card-check">Contratar →</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="sec-pub">
          <div className="sec-pub-cab">
            <span className="sec-pub-eyebrow">Otras oposiciones</span>
            <h2>¿Te presentas a otra?</h2>
          </div>
          <div className="opo-otras">
            {otras.map((f) => (
              <Link
                key={f.slug}
                href={`/oposiciones/${f.slug}`}
                className="opo-otra"
                style={{ '--cuerpo': f.color } as CSSProperties}
              >
                {EMBLEMA[f.clave] && (
                  <Image
                    src={EMBLEMA[f.clave]}
                    alt=""
                    width={26}
                    height={26}
                    className="opo-otra-emblema"
                  />
                )}
                {f.nombre}
              </Link>
            ))}
          </div>
        </section>
      </main>

      <FooterPublico />
    </>
  )
}
