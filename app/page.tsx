import type { Metadata } from 'next'
import Link from 'next/link'
import NavPublica from '@/components/NavPublica'
import FooterPublico from '@/components/FooterPublico'

export const metadata: Metadata = {
  title: { absolute: 'Física Élite · Preparación física para oposiciones en Cáceres' },
  description:
    'Prepara las pruebas físicas de Policía Local, Policía Nacional, Guardia Civil y Fuerzas Armadas. Entrenamiento presencial en Cáceres y plataforma de vídeos online con seguimiento personalizado.',
  openGraph: {
    title: 'Física Élite · Preparación física para oposiciones',
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
]

const PASOS = [
  { n: '1', t: 'Evaluamos tu punto de partida', d: 'Analizamos tu nivel actual y la prueba concreta a la que te presentas.' },
  { n: '2', t: 'Entrenas con un plan a medida', d: 'Presencial en nuestras instalaciones y con vídeos guiados en la plataforma, a tu ritmo.' },
  { n: '3', t: 'Progresas y llegas listo', d: 'Seguimiento continuo de tu evolución hasta que superas las marcas de tu oposición.' },
]

export default function HomePage() {
  return (
    <>
      <NavPublica />

      <main className="pub">
        {/* HERO */}
        <section className="hero-pub">
          <div className="hero-pub-inner">
            <div className="hero-pub-badge">Cáceres · Presencial y online</div>
            <h1>
              Prepara tu oposición
              <br />
              <em>en tu mejor forma.</em>
            </h1>
            <p>
              Entrenamiento específico para las pruebas físicas de Policía Local,
              Policía Nacional, Guardia Civil y Fuerzas Armadas. Con método,
              seguimiento y todo el temario en vídeo.
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

        {/* OPOSICIONES */}
        <section className="sec-pub">
          <div className="sec-pub-cab">
            <span className="sec-pub-eyebrow">Qué preparamos</span>
            <h2>Tu oposición, tu prueba física</h2>
            <p>
              Cada cuerpo tiene sus marcas y su circuito. Entrenamos exactamente
              lo que te van a pedir el día del examen.
            </p>
          </div>
          <div className="oposiciones-grid">
            {OPOSICIONES.map((o) => (
              <div key={o.n} className="oposicion-card">
                <h3>{o.n}</h3>
                <p>{o.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CÓMO FUNCIONA */}
        <section className="sec-pub sec-pub-alt">
          <div className="sec-pub-cab">
            <span className="sec-pub-eyebrow">Cómo funciona</span>
            <h2>De tu nivel de hoy a superar la prueba</h2>
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
                Entrena en nuestras instalaciones con la corrección técnica de tu
                preparador. Sesiones específicas para tu circuito y tus marcas.
              </p>
            </div>
            <div className="doble-card">
              <div className="doble-icono">▶️</div>
              <h3>Plataforma online</h3>
              <p>
                Todos los ejercicios en vídeo, con la técnica, los errores comunes
                y las variantes. Entrena donde quieras y sigue tu progreso desde tu
                cuenta.
              </p>
            </div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="cta-final">
          <div className="cta-final-inner">
            <h2>¿Empezamos a preparar tu prueba?</h2>
            <p>Cuéntanos a qué oposición te presentas y diseñamos tu plan.</p>
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
