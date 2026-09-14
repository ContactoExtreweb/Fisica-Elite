// Índice de oposiciones: qué hace Físicas Élite por ti y a qué cuerpos
// prepara. Es la página a la que apunta "Oposiciones" en el menú.
//
// El contenido de "Cómo te preparamos" describe lo que la plataforma HACE
// de verdad (cuestionario inicial → tramos, fichas con técnica y vídeo,
// registro de marcas, chat con el preparador). Nada de promesas que el
// producto no cumpla.
import type { CSSProperties } from 'react'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import NavPublica from '@/components/NavPublica'
import FooterPublico from '@/components/FooterPublico'
import { FICHAS, ADUANAS_PROXIMAMENTE } from '@/lib/oposiciones'

export const metadata: Metadata = {
  title: 'Oposiciones',
  description:
    'Preparación física para Policía Local, Policía Nacional, Guardia Civil y Fuerzas Armadas. Evaluación inicial, plan por tramos, vídeos de técnica y seguimiento con tu preparador.',
  openGraph: {
    title: 'Oposiciones · Físicas Élite',
    description:
      'Preparamos la prueba física de tu oposición en Cáceres y online: evaluación inicial, plan por tramos y seguimiento real.',
    type: 'website',
    locale: 'es_ES',
  },
}

const PASOS = [
  {
    t: 'Evaluamos tu punto de partida',
    d: 'Antes de entrenar nada, haces una evaluación inicial: cuántas dominadas te salen hoy, cuánto tardas, cuánto levantas. Con eso te situamos en el tramo real de cada ejercicio.',
  },
  {
    t: 'Entrenas solo tu tramo',
    d: 'No te enseñamos toda la biblioteca de golpe. Ves los ejercicios que te tocan ahora, para no estancarte mirando cosas que todavía no puedes hacer ni aburrirte con las que ya dominas.',
  },
  {
    t: 'Vídeo y técnica de cada ejercicio',
    d: 'Cada ejercicio trae su vídeo, la técnica correcta, los errores que más se repiten, variantes para casa y cómo progresar. Porque en el examen la ejecución cuenta tanto como la marca.',
  },
  {
    t: 'Apuntas tus marcas y te seguimos',
    d: 'Registras lo que haces cada día —repeticiones, tiempos, parciales por cada 100 m— y tu preparador lo ve. Si algo no avanza, se cambia. Y lo tienes en el chat para lo que necesites.',
  },
]

export default function OposicionesPage() {
  return (
    <>
      <NavPublica />

      <main className="pub">
        <section className="opoidx-hero">
          <Image
            src="/instalaciones/instalaciones.jpeg"
            alt=""
            fill
            priority
            className="opoidx-hero-foto"
            sizes="100vw"
          />
          <div className="opoidx-hero-inner">
            <span className="opo-eyebrow">Oposiciones</span>
            <h1>
              La prueba física no se aprueba
              <br />
              <em>entrenando a ciegas.</em>
            </h1>
            <p>
              Cada cuerpo tiene su circuito, sus marcas y su forma de puntuar.
              Preparamos la tuya en concreto, en nuestras instalaciones de
              Cáceres y con la plataforma online para los días que entrenas por
              tu cuenta.
            </p>
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
            <span className="sec-pub-eyebrow">Cómo te preparamos</span>
            <h2>Un plan que sale de tus marcas, no de una plantilla</h2>
            <p>
              Lo mismo da que vengas de cero o que te falten dos décimas: el
              punto de partida lo pones tú y el plan se monta encima.
            </p>
          </div>
          <div className="opoidx-pasos">
            {PASOS.map((p, i) => (
              <div key={p.t} className="opoidx-paso">
                <span className="opoidx-paso-num">{i + 1}</span>
                <h3>{p.t}</h3>
                <p>{p.d}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="sec-pub sec-pub-alt">
          <div className="sec-pub-cab">
            <span className="sec-pub-eyebrow">A qué preparamos</span>
            <h2>Elige tu oposición</h2>
            <p>Entra en la tuya y mira qué pruebas vas a tener que pasar.</p>
          </div>

          <div className="opoidx-grid">
            {FICHAS.map((f) => (
              <Link
                key={f.slug}
                href={`/oposiciones/${f.slug}`}
                className="opoidx-card"
                style={{ ['--cuerpo' as string]: f.color } as CSSProperties}
              >
                <h3>{f.nombre}</h3>
                <p>{f.entradilla}</p>
                <div className="opoidx-card-pruebas">
                  {f.pruebas.map((p) => (
                    <span key={p.nombre} className="opoidx-card-prueba">
                      {p.nombre}
                    </span>
                  ))}
                </div>
                <span className="opoidx-card-cta">Ver preparación →</span>
              </Link>
            ))}

            {/* Aduanas se anuncia, pero no lleva a ningún sitio: todavía no
                hay contenido que vender. */}
            <div
              className="opoidx-card proximamente"
              style={{ ['--cuerpo' as string]: ADUANAS_PROXIMAMENTE.color } as CSSProperties}
            >
              <h3>
                {ADUANAS_PROXIMAMENTE.nombre}
                <span className="oposicion-badge">Próximamente</span>
              </h3>
              <p>{ADUANAS_PROXIMAMENTE.entradilla}</p>
            </div>
          </div>
        </section>
      </main>

      <FooterPublico />
    </>
  )
}
