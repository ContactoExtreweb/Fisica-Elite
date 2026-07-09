import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Física Élite · Preparación física para oposiciones en Cáceres',
  description:
    'Preparación física para Policía Local, Policía Nacional, Guardia Civil y Fuerzas Armadas. Entrenamiento presencial en Cáceres y plataforma de vídeos online con tu preparador.',
  openGraph: {
    title: 'Física Élite · Preparación física para oposiciones',
    description:
      'Entrena las pruebas físicas de tu oposición con método: presencial en Cáceres y online.',
    type: 'website',
  },
}

const OPOSICIONES = [
  { nombre: 'Policía Local', desc: 'Circuito de agilidad, resistencia y fuerza.' },
  { nombre: 'Policía Nacional', desc: 'Course-navette, circuito y pruebas de potencia.' },
  { nombre: 'Guardia Civil', desc: 'Velocidad, resistencia, fuerza y natación.' },
  { nombre: 'Fuerzas Armadas', desc: 'Preparación integral para las pruebas físicas.' },
]

const PASOS = [
  {
    n: '01',
    titulo: 'Tu preparador te evalúa',
    texto: 'Analizamos tu punto de partida y la oposición a la que te presentas.',
  },
  {
    n: '02',
    titulo: 'Entrenas con plan',
    texto: 'Sesiones presenciales en Cáceres y ejercicios en vídeo para hacer donde estés.',
  },
  {
    n: '03',
    titulo: 'Progresas por niveles',
    texto: 'Vas subiendo de nivel a medida que dominas cada prueba, con seguimiento real.',
  },
]

export default function InicioPublico() {
  return (
    <>
      {/* HERO */}
      <section className="hero">
        <div className="hero-eyebrow">Preparación física de oposiciones · Cáceres</div>
        <h1 className="hero-titulo">
          Aprueba la física.
          <br />
          <em>Sin dejarte nada.</em>
        </h1>
        <p className="hero-sub">
          Preparación específica para Policía Local, Policía Nacional, Guardia Civil y
          Fuerzas Armadas. Entrena presencial en Cáceres y sigue tu plan en vídeo desde
          casa, con un preparador detrás de cada marca.
        </p>
        <div className="hero-acciones">
          <Link href="/precios" className="pub-btn-primario">
            Ver planes y empezar
          </Link>
          <Link href="/sobre-nosotros" className="pub-btn-secundario">
            Conoce el método
          </Link>
        </div>

        <div className="hero-datos">
          <div className="hero-dato">
            <span className="hero-dato-num">4</span>
            <span className="hero-dato-label">Oposiciones cubiertas</span>
          </div>
          <div className="hero-dato">
            <span className="hero-dato-num">2</span>
            <span className="hero-dato-label">Presencial + online</span>
          </div>
          <div className="hero-dato">
            <span className="hero-dato-num">3</span>
            <span className="hero-dato-label">Niveles de progresión</span>
          </div>
        </div>
      </section>

      {/* OPOSICIONES */}
      <section className="seccion">
        <div className="seccion-cab">
          <div className="seccion-eyebrow">Especialidades</div>
          <h2 className="seccion-titulo">Tu oposición, sus pruebas</h2>
          <p className="seccion-intro">
            Cada convocatoria tiene sus marcas y su circuito. Entrenamos exactamente lo
            que te van a pedir el día del examen.
          </p>
        </div>
        <div className="oposiciones-grid">
          {OPOSICIONES.map((o) => (
            <div key={o.nombre} className="oposicion-card">
              <h3>{o.nombre}</h3>
              <p>{o.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section className="seccion seccion-oscura">
        <div className="seccion-cab">
          <div className="seccion-eyebrow">Cómo funciona</div>
          <h2 className="seccion-titulo">Presencial cuando puedes, online siempre</h2>
          <p className="seccion-intro">
            Lo mejor de los dos mundos: la corrección de un preparador en persona y la
            libertad de entrenar por tu cuenta con vídeos y seguimiento.
          </p>
        </div>
        <div className="pasos">
          {PASOS.map((p) => (
            <div key={p.n} className="paso">
              <div className="paso-num">{p.n}</div>
              <h3>{p.titulo}</h3>
              <p>{p.texto}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="cta-final">
        <h2>¿Listo para empezar a entrenar?</h2>
        <p>Elige tu plan y empieza hoy. Tu preparador te espera.</p>
        <Link href="/precios" className="pub-btn-primario">
          Ver planes
        </Link>
      </section>
    </>
  )
}
