import type { Metadata } from 'next'
import Link from 'next/link'
import NavPublica from '@/components/NavPublica'
import FooterPublico from '@/components/FooterPublico'

export const metadata: Metadata = {
  title: 'Sobre nosotros',
  description:
    'Conoce el método y al equipo de Física Élite: más de 10 años preparando las pruebas físicas de oposiciones en Cáceres, de forma presencial y online.',
}

const VALORES = [
  { t: 'Método, no improvisación', d: 'Cada entrenamiento tiene un porqué y responde a la prueba concreta de tu oposición.' },
  { t: 'Seguimiento real', d: 'No te dejamos solo: revisamos tu progreso y ajustamos el plan sobre la marcha.' },
  { t: 'Técnica primero', d: 'Entrenar bien evita lesiones y hace que cada sesión cuente. Corregimos hasta el detalle.' },
  { t: 'Cerca de ti', d: 'Presencial en Cáceres y online para que la distancia no sea una excusa.' },
]

export default function SobreNosotrosPage() {
  return (
    <>
      <NavPublica />

      <main className="pub">
        <section className="cabecera-pub">
          <div className="cabecera-pub-inner">
            <span className="sec-pub-eyebrow">Sobre nosotros</span>
            <h1>Preparadores físicos especializados en oposiciones</h1>
            <p>
              Llevamos más de una década ayudando a opositores de Cáceres y de toda
              España a superar la prueba física de su cuerpo. Sabemos lo que se te
              va a pedir y te llevamos hasta ahí.
            </p>
          </div>
        </section>

        <section className="sec-pub">
          <div className="sobre-bloque">
            <div className="sobre-texto">
              <span className="sec-pub-eyebrow">Nuestra historia</span>
              <h2>De un pequeño grupo a una plataforma completa</h2>
              <p>
                Física Élite nació en Cáceres con una idea sencilla: que nadie
                suspenda la parte física de su oposición por no haber entrenado lo
                correcto. Empezamos con grupos reducidos en el gimnasio y hoy
                combinamos ese trabajo presencial con una plataforma de vídeos que
                te acompaña todos los días.
              </p>
              <p>
                A lo largo de estos años hemos preparado a cientos de aspirantes a
                Policía Local, Policía Nacional, Guardia Civil y Fuerzas Armadas. Cada
                convocatoria es distinta, y por eso adaptamos el entrenamiento a las
                marcas y al circuito exacto al que te enfrentas.
              </p>
            </div>
            <div className="sobre-cita">
              <blockquote>
                «No entrenamos para estar en forma en general. Entrenamos para que
                superes tu prueba, con sus marcas y su circuito.»
              </blockquote>
              <cite>— El equipo de Física Élite</cite>
            </div>
          </div>
        </section>

        <section className="sec-pub sec-pub-alt">
          <div className="sec-pub-cab">
            <span className="sec-pub-eyebrow">Cómo trabajamos</span>
            <h2>Lo que nos importa</h2>
          </div>
          <div className="valores-grid">
            {VALORES.map((v) => (
              <div key={v.t} className="valor-card">
                <h3>{v.t}</h3>
                <p>{v.d}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="cta-final">
          <div className="cta-final-inner">
            <h2>¿Quieres saber si podemos ayudarte?</h2>
            <p>Escríbenos y te contamos cómo enfocaríamos tu preparación.</p>
            <Link href="/contacto" className="cta-primary">
              Hablar con el equipo
            </Link>
          </div>
        </section>
      </main>

      <FooterPublico />
    </>
  )
}
