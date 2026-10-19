'use client'

// Gráfica de evolución de las marcas del alumno (Mi progreso).
//
// Sin librerías de gráficas: la línea es un <svg> de 100×100 estirado
// (preserveAspectRatio="none" + vector-effect, para que el trazo no se
// deforme) y los puntos van colocados en % encima, como HTML normal. Así no
// hay que medir el contenedor con JS y las etiquetas son texto de verdad,
// nítido en cualquier pantalla y sin escalar en el móvil.
//
// El eje X reparte las marcas a intervalos iguales (una por sesión), no por
// fecha real: con entrenamientos irregulares la línea se lee mucho mejor así,
// y las fechas se ven abajo y al tocar cada punto.
import { useState } from 'react'
import {
  valorMarca,
  masEsMejor,
  formateaValor,
  fechaCorta,
  type RegistroFila,
} from '@/lib/marcas'
import type { CatInfo } from '@/components/HistorialMarcas'

// Más puntos no caben con holgura en un móvil; se dibujan los más recientes.
const MAX_PUNTOS = 20

export default function EvolucionMarcas({
  registros,
  categorias,
}: {
  registros: RegistroFila[]
  categorias: CatInfo[]
}) {
  // Sin estado inicial: la categoría elegida se resuelve en render con un
  // "?? la primera", así no hace falta sincronizar nada con un efecto.
  const [catId, setCatId] = useState('')
  const [sel, setSel] = useState<number | null>(null)

  const conMarcas = categorias.filter((c) =>
    registros.some((r) => r.categoria_id === c.id && valorMarca(r, c.metrica) !== null)
  )

  if (conMarcas.length === 0) {
    return (
      <section className="ev-caja ev-vacia">
        <p>Apunta tus marcas y aquí verás, de un vistazo, cómo evolucionas.</p>
      </section>
    )
  }

  const cat = conMarcas.find((c) => c.id === catId) ?? conMarcas[0]
  const { metrica, unidad } = cat
  const texto = (v: number) => formateaValor(v, metrica, unidad)

  const puntos = registros
    .filter((r) => r.categoria_id === cat.id)
    .map((r) => ({ fecha: r.fecha, v: valorMarca(r, metrica) }))
    .filter((p): p is { fecha: string; v: number } => p.v !== null)
    .reverse() // llegan de la más nueva a la más vieja
    .slice(-MAX_PUNTOS)

  const vals = puntos.map((p) => p.v)
  const alto = Math.max(...vals)
  const bajo = Math.min(...vals)
  const masMejor = masEsMejor(metrica)
  const mejor = masMejor ? alto : bajo
  // Con una sola marca no se pinta de verde: todavía no hay con qué compararla.
  const destacar = (v: number) => puntos.length > 1 && v === mejor

  // Margen arriba y abajo para que los puntos no toquen los bordes. Si todas
  // las marcas son iguales, un margen fijo para que la línea salga centrada.
  const margen = (alto - bajo) * 0.18 || Math.abs(alto) * 0.1 || 1
  const suelo = bajo - margen
  const techo = alto + margen
  const pct = (v: number) => ((v - suelo) / (techo - suelo)) * 100
  const x = (i: number) => (puntos.length === 1 ? 50 : (i / (puntos.length - 1)) * 100)

  // El punto seleccionado, acotado en render: al cambiar de categoría se
  // queda en la última marca sin tener que tocar el estado.
  const i = sel !== null && sel < puntos.length ? sel : puntos.length - 1
  const actual = puntos[i]

  const linea = puntos.map((p, j) => `${x(j)},${100 - pct(p.v)}`).join(' ')
  const delta = puntos[puntos.length - 1].v - puntos[0].v
  const mejora = masMejor ? delta > 0 : delta < 0

  return (
    <section className="ev-caja">
      {conMarcas.length > 1 && (
        <div className="ev-tabs">
          {conMarcas.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`ev-tab ${c.id === cat.id ? 'on' : ''}`}
              onClick={() => {
                setCatId(c.id)
                setSel(null)
              }}
              aria-pressed={c.id === cat.id}
            >
              {c.nombre}
            </button>
          ))}
        </div>
      )}

      <div className="ev-lectura">
        <strong className="ev-lectura-valor">{texto(actual.v)}</strong>
        <span className="ev-lectura-fecha">{fechaCorta(actual.fecha)}</span>
        {destacar(actual.v) && (
          <span className="ev-lectura-mejor">tu mejor marca</span>
        )}
      </div>

      <div className="ev-grafica">
        <div className="ev-eje">
          <span style={{ bottom: `${pct(alto)}%` }}>{texto(alto)}</span>
          {alto !== bajo && <span style={{ bottom: `${pct(bajo)}%` }}>{texto(bajo)}</span>}
        </div>
        <div className="ev-area">
          {puntos.length > 1 && (
            <svg
              className="ev-svg"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <polygon className="ev-relleno" points={`0,100 ${linea} 100,100`} />
              <polyline className="ev-linea" points={linea} vectorEffect="non-scaling-stroke" />
            </svg>
          )}
          {puntos.map((p, j) => (
            <button
              key={`${p.fecha}-${j}`}
              type="button"
              className={`ev-punto${j === i ? ' on' : ''}${destacar(p.v) ? ' mejor' : ''}`}
              style={{ left: `${x(j)}%`, bottom: `${pct(p.v)}%` }}
              onClick={() => setSel(j)}
              aria-label={`${fechaCorta(p.fecha)}: ${texto(p.v)}`}
            />
          ))}
        </div>
      </div>

      <div className="ev-fechas">
        <span>{fechaCorta(puntos[0].fecha)}</span>
        {puntos.length > 1 && <span>{fechaCorta(puntos[puntos.length - 1].fecha)}</span>}
      </div>

      <div className="ev-chips">
        <div className="ev-chip">
          <span>Mejor marca</span>
          <strong>{texto(mejor)}</strong>
        </div>
        <div className="ev-chip">
          <span>Marcas apuntadas</span>
          <strong>{puntos.length}</strong>
        </div>
        {puntos.length > 1 && (
          <div className={`ev-chip${delta === 0 ? '' : mejora ? ' sube' : ' baja'}`}>
            <span>Desde la primera</span>
            <strong>
              {delta === 0
                ? 'Igual'
                : `${mejora ? '▲' : '▼'} ${texto(Math.abs(delta))}`}
            </strong>
          </div>
        )}
      </div>

      {puntos.length === 1 && (
        <p className="ev-nota">Apunta otra marca y aquí saldrá la línea de tu evolución.</p>
      )}
      {!masMejor && puntos.length > 1 && (
        <p className="ev-nota">En {cat.nombre.toLowerCase()} mejoras cuando tardas menos.</p>
      )}
    </section>
  )
}
