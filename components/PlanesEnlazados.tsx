// Parrilla de planes como ENLACES a /precios (donde se elige y se paga).
//
// Para las páginas públicas que enseñan los planes sin venderlos ahí mismo
// (hoy, el Inicio). Los datos salen de la BBDD (lib/planes.ts), así que un
// plan nuevo creado desde /admin/planes aparece solo. Mismo aspecto que las
// tarjetas de /oposiciones/<slug>, que llevan su propio marcado. Componente
// de servidor: no hay estado.
import Link from 'next/link'
import { euros, type PlanPublico } from '@/lib/planes'

export default function PlanesEnlazados({
  planes,
  cta = 'Ver plan →',
  maxCategorias,
  centrada = false,
}: {
  planes: PlanPublico[]
  cta?: string
  /** Recorta las pastillas de categorías ("+3 más") para que las tarjetas no se disparen */
  maxCategorias?: number
  /** Tarjetas de ancho contenido y centradas (para pocos planes en el Inicio) */
  centrada?: boolean
}) {
  return (
    <div className={`planes-grid ${centrada ? 'centrada' : ''}`}>
      {planes.map((p) => {
        const cats = maxCategorias ? p.categorias.slice(0, maxCategorias) : p.categorias
        const resto = p.categorias.length - cats.length
        return (
          <Link key={p.id} href="/precios" className="plan-card plan-card-link">
            <div className="plan-card-cab">
              <span className="plan-card-nombre">{p.nombre}</span>
              {p.tipo === 'completo' && <span className="plan-card-etq total">Todo</span>}
              {p.tipo === 'oposicion' && <span className="plan-card-etq opo">Oposición</span>}
            </div>
            <div className="plan-card-precio">
              {euros(p.precioCentimos)}€<span>/mes</span>
            </div>
            <p className="plan-card-cubre">{p.cubre}</p>
            {cats.length > 0 && (
              <div className="plan-card-cats">
                {cats.map((c) => (
                  <span key={c} className="plan-card-cat">
                    {c}
                  </span>
                ))}
                {resto > 0 && <span className="plan-card-cat">+{resto} más</span>}
              </div>
            )}
            {p.descripcion && <p className="plan-card-desc">{p.descripcion}</p>}
            <span className="plan-card-check">{cta}</span>
          </Link>
        )
      })}
    </div>
  )
}
