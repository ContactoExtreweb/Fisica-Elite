'use client'

// Filtro de la lista de ejercicios del admin: un desplegable de
// categoría (antes era un chip por categoría, y con muchas categorías
// se convertía en una sopa de pastillas que se rompía en varias líneas)
// más un interruptor para "solo explicativos".
import { useRouter } from 'next/navigation'

export default function FiltroEjercicios({
  categorias,
  catActual,
  soloExplActual,
}: {
  categorias: { id: string; nombre: string }[]
  catActual?: string
  soloExplActual: boolean
}) {
  const router = useRouter()

  const ir = (cat: string, expl: boolean) => {
    const p = new URLSearchParams()
    if (cat) p.set('cat', cat)
    if (expl) p.set('tipo', 'explicativos')
    const q = p.toString()
    router.push(`/admin/ejercicios${q ? `?${q}` : ''}`)
  }

  return (
    <div className="ej-filtros">
      <select
        className="alumnos-select"
        value={catActual ?? ''}
        onChange={(e) => ir(e.target.value, soloExplActual)}
        aria-label="Filtrar por categoría"
      >
        <option value="">Todas las categorías</option>
        {categorias.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nombre}
          </option>
        ))}
      </select>

      <button
        type="button"
        className={`ej-toggle-expl ${soloExplActual ? 'activo' : ''}`}
        onClick={() => ir(catActual ?? '', !soloExplActual)}
        aria-pressed={soloExplActual}
        title="Solo los vídeos de técnica marcados como explicativos"
      >
        <span className="ej-toggle-expl-check" aria-hidden="true">
          {soloExplActual && (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
        Solo explicativos
      </button>
    </div>
  )
}
