import type { Metadata } from 'next'
import Link from 'next/link'
import NavPublica from '@/components/NavPublica'
import FooterPublico from '@/components/FooterPublico'

export const metadata: Metadata = {
  title: 'Instalaciones',
  description:
    'Descubre las instalaciones de Física Élite en Cáceres: espacio de entrenamiento equipado para preparar las pruebas físicas de tu oposición.',
}

// Placeholders de galería (sustituir por fotos reales cuando las tengáis).
const GALERIA = [
  { t: 'Zona de fuerza', d: 'Material para trabajar dominadas, flexiones y tren superior.' },
  { t: 'Pista de agilidad', d: 'Espacio para montar el circuito de tu convocatoria.' },
  { t: 'Zona de carrera', d: 'Preparación de resistencia y velocidad.' },
  { t: 'Sala de core y movilidad', d: 'Trabajo preventivo y de técnica.' },
  { t: 'Vestuarios', d: 'Comodidad antes y después de entrenar.' },
  { t: 'Grabación de vídeos', d: 'Donde grabamos el contenido de la plataforma.' },
]

const EQUIPAMIENTO = [
  'Barras de dominadas regulables',
  'Zona de carrera cronometrada',
  'Material de circuito (vallas, conos, testigos)',
  'Colchonetas y zona de core',
  'Espacio de movilidad y calentamiento',
  'Cronómetros y medición de marcas',
]

export default function InstalacionesPage() {
  return (
    <>
      <NavPublica />

      <main className="pub">
        <section className="cabecera-pub">
          <div className="cabecera-pub-inner">
            <span className="sec-pub-eyebrow">Instalaciones</span>
            <h1>Un espacio pensado para tu prueba</h1>
            <p>
              Entrenamos en Cáceres en un espacio equipado para reproducir las
              condiciones de tu examen: el circuito, las marcas y el material que te
              vas a encontrar.
            </p>
          </div>
        </section>

        <section className="sec-pub">
          <div className="galeria-grid">
            {GALERIA.map((g, i) => (
              <div key={i} className="galeria-item">
                {/* Placeholder visual; sustituir por <img> real */}
                <div className="galeria-foto">
                  <span>📷</span>
                </div>
                <div className="galeria-cap">
                  <h3>{g.t}</h3>
                  <p>{g.d}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="galeria-nota">
            Las imágenes definitivas de nuestras instalaciones se añadirán próximamente.
          </p>
        </section>

        <section className="sec-pub sec-pub-alt">
          <div className="equip-bloque">
            <div className="equip-texto">
              <span className="sec-pub-eyebrow">Equipamiento</span>
              <h2>Todo lo necesario para entrenar tu circuito</h2>
              <p>
                No hace falta un macrogimnasio: hace falta el material correcto y
                saber usarlo. Esto es lo que encontrarás.
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
            <h2>Ven a conocernos</h2>
            <p>Concierta una visita y te enseñamos dónde entrenarías.</p>
            <Link href="/contacto" className="cta-primary">
              Reservar una visita
            </Link>
          </div>
        </section>
      </main>

      <FooterPublico />
    </>
  )
}
