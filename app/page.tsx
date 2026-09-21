import type { CSSProperties } from 'react'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import NavPublica from '@/components/NavPublica'
import FooterPublico from '@/components/FooterPublico'
import ResenasPublicas from '@/components/ResenasPublicas'
import PlanesEnlazados from '@/components/PlanesEnlazados'
import { FICHAS, EMBLEMA } from '@/lib/oposiciones'
import { createPublicClient } from '@/lib/supabase/publico'
import { planesALaVenta } from '@/lib/planes'
import { resenasVisibles } from '@/lib/resenas'

// Planes y reseñas salen de la BBDD, pero cambian poco: la página se sirve
// cacheada y se regenera cada minuto. Cuando el admin guarda un plan o una
// reseña, sus acciones llaman a revalidatePath('/') y se ve al momento.
export const revalidate = 60

export const metadata: Metadata = {
  title: { absolute: 'Físicas Élite · Preparación física para oposiciones en Cáceres' },
  description:
    'Prepara las pruebas físicas de Policía Local, Policía Nacional, Guardia Civil y Fuerzas Armadas. Entrenamiento presencial en Cáceres y plataforma de vídeos online con seguimiento personalizado.',
  openGraph: {
    title: 'Físicas Élite · Preparación física para oposiciones',
    description:
      'Entrena las pruebas físicas de tu oposición con método. Presencial en Cáceres y online.',
    type: 'website',
    locale: 'es_ES',
  },
}

const OPOSICIONES = [
  { n: 'Policía Local', d: 'Circuito de agilidad, resistencia y fuerza según la convocatoria de tu ayuntamiento.' },
  { n: 'Policía Nacional', d: 'Circuito de agilidad, dominadas o suspensión y carrera de resistencia.' },
  { n: 'Guardia Civil', d: 'Velocidad, fuerza de brazos (flexiones o dominadas) y resistencia aeróbica.' },
  { n: 'Fuerzas Armadas', d: 'Pruebas de tropa, marinería, suboficiales y oficiales de las FAS.' },
  {
    n: 'Vigilancia Aduanera',
    d: 'Estamos preparando el temario físico específico del Servicio de Vigilancia Aduanera.',
    proximamente: true,
  },
]

const PASOS = [
  {
    n: '1',
    t: 'Vemos por dónde andas',
    d: 'Empiezas con una evaluación: cuántas dominadas te salen hoy, cuánto tardas, qué te cuesta. Sin eso, cualquier plan es a ojo.',
  },
  {
    n: '2',
    t: 'Entrenas lo tuyo',
    d: 'Presencial en Cáceres y con los vídeos para los días que vas por tu cuenta. Solo ves los ejercicios de tu tramo.',
  },
  {
    n: '3',
    t: 'Apuntas y ajustamos',
    d: 'Registras lo que haces cada día. Tu preparador lo ve, y si algo no avanza se cambia.',
  },
]

const FOTOS_INICIO = [
  { src: '/instalaciones/instalaciones.jpeg', alt: 'Sala de entrenamiento con el circuito montado' },
  { src: '/instalaciones/instalacionese2.jpeg', alt: 'Barras de dominadas regulables' },
  { src: '/instalaciones/instalaciones1.jpeg', alt: 'Zona de fuerza con máquinas y mancuernas' },
]

export default async function HomePage() {
  const supabase = createPublicClient()
  const [planes, resenas] = await Promise.all([
    planesALaVenta(supabase),
    resenasVisibles(supabase),
  ])

  return (
    <>
      <NavPublica />

      <main className="pub">
        {/* HERO — logo, foto de la nave de fondo */}
        <section className="hero-pub">
          <Image
            src="/instalaciones/instalaciones1.jpeg"
            alt=""
            fill
            priority
            className="hero-pub-foto"
            sizes="100vw"
          />
          <div className="hero-pub-inner">
            <div className="hero-logo">
              <Image src="/logo.png" alt="Físicas Élite" width={304} height={359} priority />
            </div>

            <div className="hero-pub-badge">Cáceres · Presencial y online</div>
            <h1>
              Prepara tu oposición
              <br />
              <em>en tu mejor forma.</em>
            </h1>
            <p>
              Entrenamos las pruebas físicas de Policía Local, Policía Nacional,
              Guardia Civil y Fuerzas Armadas. En nuestra nave de Cáceres, y con
              todo el temario en vídeo para los días que vas por tu cuenta.
            </p>
            <div className="hero-pub-acciones">
              <Link href="/precios" className="cta-primary">
                Ver planes y precios
              </Link>
              <Link href="/contacto" className="cta-secundario">
                Habla con nosotros
              </Link>
            </div>
            <div className="hero-pub-datos">
              <div>
                <strong>+10</strong>
                <span>años preparando opositores</span>
              </div>
              <div>
                <strong>4</strong>
                <span>cuerpos y oposiciones</span>
              </div>
              <div>
                <strong>100%</strong>
                <span>plan personalizado</span>
              </div>
            </div>
          </div>
        </section>

        {/* QUÉ PREPARAMOS — estas tarjetas llevan a precios */}
        <section className="sec-pub">
          <div className="sec-pub-cab">
            <span className="sec-pub-eyebrow">Qué preparamos</span>
            <h2>Tu oposición, tu prueba física</h2>
            <p>
              Cada cuerpo tiene su circuito y sus marcas. Mira los planes y elige
              el que te encaja.
            </p>
          </div>
          <div className="oposiciones-grid">
            {OPOSICIONES.map((o) =>
              o.proximamente ? (
                // Aduanas todavía no se vende: la tarjeta informa pero no
                // lleva a ningún sitio, para no prometer lo que no hay.
                <div key={o.n} className="oposicion-card proximamente">
                  <h3>
                    {o.n}
                    <span className="oposicion-badge">Próximamente</span>
                  </h3>
                  <p>{o.d}</p>
                </div>
              ) : (
                <Link key={o.n} href="/precios" className="oposicion-card enlazada">
                  <h3>{o.n}</h3>
                  <p>{o.d}</p>
                  <span className="oposicion-cta">Ver planes →</span>
                </Link>
              )
            )}
          </div>
        </section>

        {/* AL DETALLE — una fila por cuerpo con SUS PRUEBAS desglosadas.
            A propósito NO se repite la entradilla de las tarjetas de
            arriba: aquella sección vende, esta informa. Si aquí volviera
            a salir el mismo texto, sobraría una de las dos. */}
        <section className="sec-pub sec-pub-alt">
          <div className="sec-pub-cab">
            <span className="sec-pub-eyebrow">Al detalle</span>
            <h2>¿Qué te van a pedir exactamente?</h2>
            <p>
              Estas son las pruebas de cada cuerpo. Entra en la tuya y te
              contamos cómo se entrena cada una y por dónde se empieza.
            </p>
          </div>

          <div className="opo-lista">
            {FICHAS.map((f) => (
              <Link
                key={f.slug}
                href={`/oposiciones/${f.slug}`}
                className="opo-fila"
                style={{ ['--cuerpo' as string]: f.color } as CSSProperties}
              >
                <div className="opo-fila-emblema">
                  <Image src={EMBLEMA[f.clave]} alt="" width={84} height={84} />
                </div>

                <div className="opo-fila-cuerpo">
                  <div className="opo-fila-cab">
                    <h3>{f.nombre}</h3>
                    <span className="opo-fila-cuenta">
                      {f.pruebas.length} pruebas
                    </span>
                  </div>

                  <ul className="opo-fila-pruebas">
                    {f.pruebas.map((p, i) => (
                      <li key={p.nombre}>
                        <span className="opo-fila-num">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <div>
                          <strong>{p.nombre}</strong>
                          <span>{p.detalle}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <span className="opo-fila-cta">Ver preparación →</span>
              </Link>
            ))}
          </div>
        </section>

        {/* INSTALACIONES */}
        <section className="sec-pub">
          <div className="sec-pub-cab">
            <span className="sec-pub-eyebrow">Dónde entrenas</span>
            <h2>Una nave en Cáceres, montada para esto</h2>
            <p>
              Barras regulables, zona de fuerza y espacio libre para montar el
              circuito entero.
            </p>
          </div>
          <div className="inicio-fotos">
            {FOTOS_INICIO.map((f) => (
              <div key={f.src} className="inicio-foto">
                <Image
                  src={f.src}
                  alt={f.alt}
                  fill
                  className="inicio-foto-img"
                  sizes="(max-width: 700px) 100vw, 33vw"
                />
              </div>
            ))}
          </div>
          <div className="inicio-fotos-pie">
            <Link href="/instalaciones" className="cta-secundario">
              Ver las instalaciones
            </Link>
          </div>
        </section>

        {/* CÓMO FUNCIONA */}
        <section className="sec-pub sec-pub-alt">
          <div className="sec-pub-cab">
            <span className="sec-pub-eyebrow">Cómo funciona</span>
            <h2>De tu marca de hoy a la del examen</h2>
          </div>
          <div className="pasos-grid">
            {PASOS.map((p) => (
              <div key={p.n} className="paso-card">
                <div className="paso-num">{p.n}</div>
                <h3>{p.t}</h3>
                <p>{p.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* PRESENCIAL + ONLINE */}
        <section className="sec-pub">
          <div className="doble-col">
            <div className="doble-card">
              <div className="doble-icono">🏋️</div>
              <h3>Presencial en Cáceres</h3>
              <p>
                Entrenas con tu preparador delante, que te corrige la técnica
                sobre la marcha. Es donde más rápido se arreglan los fallos.
              </p>
            </div>
            <div className="doble-card">
              <div className="doble-icono">▶️</div>
              <h3>Plataforma online</h3>
              <p>
                Cada ejercicio en vídeo, con la técnica, los errores que más se
                repiten y las variantes para casa. Y ahí mismo apuntas tus marcas.
              </p>
            </div>
          </div>
        </section>

        {/* OPINIONES — cargadas a mano desde /admin/resenas; se muestran las
            primeras y el resto está en "Sobre nosotros" */}
        <ResenasPublicas resenas={resenas} maximo={6} />

        {/* PLANES — desde la BBDD: uno nuevo en /admin/planes sale aquí solo.
            Cada tarjeta lleva a /precios, donde se elige y se paga. */}
        {planes.length > 0 && (
          <section className="sec-pub" id="planes">
            <div className="sec-pub-cab">
              <span className="sec-pub-eyebrow">Planes y precios</span>
              <h2>Elige cómo quieres entrenar</h2>
              <p>
                Pagas los meses que quieras, sin cobros automáticos. Tu preparador
                valida el alta y te da acceso personalmente.
              </p>
            </div>
            <PlanesEnlazados planes={planes} cta="Ver detalles →" maxCategorias={4} centrada />
            <div className="inicio-fotos-pie">
              <Link href="/precios" className="cta-primary">
                Ver todos los planes y precios
              </Link>
            </div>
          </section>
        )}

        {/* CTA FINAL */}
        <section className="cta-final">
          <div className="cta-final-inner">
            <h2>¿Empezamos a preparar tu prueba?</h2>
            <p>Cuéntanos a qué te presentas y te decimos por dónde empezar.</p>
            <div className="hero-pub-acciones">
              <Link href="/precios" className="cta-primary">
                Ver planes
              </Link>
              <Link href="/contacto" className="cta-secundario claro">
                Contactar
              </Link>
            </div>
          </div>
        </section>
      </main>

      <FooterPublico />
    </>
  )
}
