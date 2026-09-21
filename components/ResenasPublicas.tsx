// Sección de reseñas de la web pública (Inicio y Sobre nosotros).
//
// Componente de SERVIDOR: recibe las reseñas ya cargadas (ver lib/resenas.ts)
// y no toca la BBDD. Si no hay ninguna visible, no pinta nada — ni el título
// ni una sección vacía.
import Link from 'next/link'
import type { ResenaPublica } from '@/lib/resenas'

// Colores del avatar: fijos y con contraste suficiente sobre texto blanco.
// Se elige uno por nombre, así una misma persona siempre sale del mismo color.
const COLORES_AVATAR = ['#7A5F1E', '#1F7A3D', '#B0552B', '#2456B0', '#5B4B8A', '#0F766E', '#9A3412']

function colorAvatar(nombre: string): string {
  let h = 0
  for (const c of nombre) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return COLORES_AVATAR[h % COLORES_AVATAR.length]
}

function Estrellas({ n }: { n: number }) {
  return (
    <span className="res-estrellas" role="img" aria-label={`${n} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          className={i <= n ? 'llena' : 'vacia'}
          aria-hidden="true"
        >
          <path d="M12 2.5l2.94 6.06 6.56.9-4.8 4.62 1.2 6.52L12 17.4l-5.9 3.2 1.2-6.52L2.5 9.46l6.56-.9L12 2.5z" />
        </svg>
      ))}
    </span>
  )
}

export default function ResenasPublicas({
  resenas,
  maximo,
  alt = true,
}: {
  resenas: ResenaPublica[]
  /** Cuántas enseñar (Inicio: las primeras). Sin valor = todas. */
  maximo?: number
  /** Fondo alterno de la web; false si la sección de encima ya lo tiene */
  alt?: boolean
}) {
  if (resenas.length === 0) return null

  // El resumen cuenta TODAS las visibles, aunque solo se enseñen unas pocas.
  const media = resenas.reduce((s, r) => s + r.puntuacion, 0) / resenas.length
  const mostradas = maximo ? resenas.slice(0, maximo) : resenas
  const hayMas = !!maximo && resenas.length > maximo

  return (
    <section id="opiniones" className={`sec-pub res-seccion ${alt ? 'sec-pub-alt' : ''}`}>
      <div className="sec-pub-cab">
        <span className="sec-pub-eyebrow">Opiniones</span>
        <h2>Lo que dicen quienes ya han entrenado con nosotros</h2>
        <div className="res-resumen">
          <span className="res-resumen-num">{media.toFixed(1).replace('.', ',')}</span>
          <Estrellas n={Math.round(media)} />
          <span className="res-resumen-cuenta">
            {resenas.length} {resenas.length === 1 ? 'reseña' : 'reseñas'}
          </span>
        </div>
      </div>

      <div className={`res-grid ${maximo ? 'recortada' : ''}`}>
        {mostradas.map((r) => (
          <article key={r.id} className="res-card">
            <Estrellas n={r.puntuacion} />
            <p className="res-texto">{r.texto}</p>
            <footer className="res-autor">
              <span className="res-avatar" style={{ background: colorAvatar(r.nombre) }} aria-hidden="true">
                {r.nombre.trim().charAt(0).toUpperCase()}
              </span>
              <span className="res-autor-txt">
                <strong>{r.nombre}</strong>
                {r.origen && <span>Reseña de {r.origen}</span>}
              </span>
            </footer>
          </article>
        ))}
      </div>

      {hayMas && (
        <div className="res-pie">
          <Link href="/sobre-nosotros#opiniones" className="cta-secundario">
            Ver todas las opiniones
          </Link>
        </div>
      )}
    </section>
  )
}
