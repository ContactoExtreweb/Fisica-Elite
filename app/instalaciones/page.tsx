// Instalaciones: la galería real, con las fotos de la nave de Cáceres.
//
// Antes esto eran seis recuadros con un emoji de cámara y una nota de
// "próximamente". Ahora son las cuatro fotos que hay, con pies que
// describen lo que de verdad se ve en cada una.
//
// Las fotos son VERTICALES (3:4). La cuadrícula está montada para eso:
// si algún día llegan horizontales, hay que revisar el aspect-ratio.
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import NavPublica from '@/components/NavPublica'
import FooterPublico from '@/components/FooterPublico'

export const metadata: Metadata = {
  title: 'Instalaciones',
  description:
    'Las instalaciones de Físicas Élite en Cáceres: barras de dominadas regulables, zona de fuerza y espacio para montar el circuito de tu convocatoria.',
}

const GALERIA = [
  {
    src: '/instalaciones/instalaciones.jpeg',
    t: 'La sala',
    d: 'Espacio diáfano para montar el circuito completo, con el material de agilidad siempre a mano.',
    destacada: true,
  },
  {
    src: '/instalaciones/instalaciones1.jpeg',
    t: 'Zona de fuerza',
    d: 'Máquina multiestación, mancuernas, bancos regulables y remo para el trabajo de tren superior.',
  },
  {
    src: '/instalaciones/instalacionese2.jpeg',
    t: 'Barras de dominadas',
    d: 'Varias barras en fila, para entrenar en grupo sin esperar turno.',
  },
  {
    src: '/instalaciones/instalaciones3.jpeg',
    t: 'Altura regulable',
    d: 'Cada barra se ajusta a tu altura y al tipo de suspensión que pide tu prueba.',
  },
]

const EQUIPAMIENTO = [
  'Barras de dominadas regulables',
  'Máquina multiestación y mancuernas',
  'Bancos regulables y remo',
  'Postes y vallas para el circuito',
  'Espacio diáfano para agilidad y velocidad',
  'Cronómetro y control de marcas',
]

export default function InstalacionesPage() {
  return (
    <>
      <NavPublica />

      <main className="pub">
        <section className="cabecera-pub">
          <div className="cabecera-pub-inner">
            <span className="sec-pub-eyebrow">Instalaciones</span>
            <h1>Aquí es donde entrenas</h1>
            <p>
              Una nave en Cáceres montada para lo que necesitas: barras,
              material de circuito y sitio de sobra para correr y montar las
              pruebas de tu convocatoria.
            </p>
          </div>
        </section>

        <section className="sec-pub">
          <div className="inst-galeria">
            {GALERIA.map((g) => (
              <figure
                key={g.src}
                className={`inst-foto ${g.destacada ? 'destacada' : ''}`}
              >
                <div className="inst-foto-marco">
                  <Image
                    src={g.src}
                    alt={g.t}
                    fill
                    className="inst-foto-img"
                    sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw"
                  />
                </div>
                <figcaption>
                  <h3>{g.t}</h3>
                  <p>{g.d}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section className="sec-pub sec-pub-alt">
          <div className="equip-bloque">
            <div className="equip-texto">
              <span className="sec-pub-eyebrow">Equipamiento</span>
              <h2>Lo que hay, sin humo</h2>
              <p>
                No hace falta un macrogimnasio. Hace falta el material correcto
                y alguien que sepa para qué sirve cada cosa.
              </p>
            </div>
            <ul className="equip-lista">
              {EQUIPAMIENTO.map((e) => (
                <li key={e}>
                  <span className="equip-check">✓</span>
                  {e}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="cta-final">
          <div className="cta-final-inner">
            <h2>Ven a verlo</h2>
            <p>Pásate cuando quieras y te enseñamos dónde entrenarías.</p>
            <Link href="/contacto" className="cta-primary">
              Concertar una visita
            </Link>
          </div>
        </section>
      </main>

      <FooterPublico />
    </>
  )
}
