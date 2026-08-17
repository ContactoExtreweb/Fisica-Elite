'use client'

// Cuestionario inicial: una pregunta por categoría contratada.
// El control se adapta a la métrica de la categoría:
//  · repeticiones / distancia / peso → SLIDER (más = mejor)
//  · tiempo → campo numérico (menos = mejor; un slider no encaja bien)
// El alumno NO ve qué tramo se le asigna (así se pidió): solo su marca.
import { useActionState, useState } from 'react'
import { guardarCuestionario, type EstadoCuestionario } from '@/app/bienvenida/actions'

export type CategoriaCuestionario = {
  id: string
  nombre: string
  metrica: string // repeticiones | distancia | peso | tiempo
  unidad: string
  topeSlider: number // valor_max del tramo más alto + 50% (calculado en servidor)
}

// Pregunta según la métrica
const PREGUNTA: Record<string, string> = {
  repeticiones: '¿Cuántas repeticiones seguidas haces, siendo realista y sin forzar al máximo?',
  distancia: '¿Qué distancia alcanzas siendo realista?',
  peso: '¿Cuánto peso mueves siendo realista?',
  tiempo: '¿Qué marca de tiempo haces?',
}

const inicial: EstadoCuestionario = {}

export default function CuestionarioInicial({
  categorias,
}: {
  categorias: CategoriaCuestionario[]
}) {
  const [estado, accion, pendiente] = useActionState(guardarCuestionario, inicial)

  // Estado de cada slider (valor actual). Arranca a la mitad del tope.
  const [valores, setValores] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      categorias.map((c) => [c.id, c.metrica === 'tiempo' ? 0 : Math.round(c.topeSlider / 2)])
    )
  )

  const set = (id: string, v: number) => setValores((s) => ({ ...s, [id]: v }))

  if (estado.ok) {
    return (
      <div className="cuest-ok">
        <div className="cuest-ok-icono">✓</div>
        <h2>¡Listo!</h2>
        <p>Hemos preparado tu entrenamiento a tu medida. Ya puedes empezar.</p>
        <a href="/inicio" className="cta-primary">
          Ir a mis ejercicios
        </a>
      </div>
    )
  }

  return (
    <form action={accion} className="cuest">
      <div className="cuest-intro">
        <span className="cuest-eyebrow">Antes de empezar</span>
        <h1>Cuéntanos tu punto de partida</h1>
        <p>
          Responde con sinceridad: con esto ajustamos los ejercicios a tu nivel real. Podrás
          repetir esta evaluación cuando quieras desde tu perfil.
        </p>
      </div>

      {categorias.map((c, i) => {
        const esTiempo = c.metrica === 'tiempo'
        return (
          <div key={c.id} className="cuest-bloque">
            <input type="hidden" name="categoria_id" value={c.id} />

            <div className="cuest-num">{String(i + 1).padStart(2, '0')}</div>
            <div className="cuest-cuerpo">
              <div className="cuest-cat">{c.nombre}</div>
              <label className="cuest-pregunta" htmlFor={`marca_${c.id}`}>
                {PREGUNTA[c.metrica] ?? `¿Cuál es tu marca en ${c.nombre}?`}
              </label>

              {esTiempo ? (
                <div className="cuest-tiempo">
                  <input
                    type="number"
                    id={`marca_${c.id}`}
                    name={`marca_${c.id}`}
                    min={0}
                    step="0.01"
                    inputMode="decimal"
                    placeholder="0"
                    value={valores[c.id] || ''}
                    onChange={(e) => set(c.id, Number(e.target.value))}
                  />
                  <span className="cuest-unidad">{c.unidad}</span>
                </div>
              ) : (
                <div className="cuest-slider">
                  <div className="cuest-valor">
                    <span className="cuest-valor-num">{valores[c.id]}</span>
                    <span className="cuest-valor-uni">{c.unidad}</span>
                  </div>
                  <input
                    type="range"
                    id={`marca_${c.id}`}
                    name={`marca_${c.id}`}
                    min={0}
                    max={c.topeSlider}
                    step={c.metrica === 'peso' ? 1 : c.metrica === 'distancia' ? 10 : 1}
                    value={valores[c.id]}
                    onChange={(e) => set(c.id, Number(e.target.value))}
                  />
                  <div className="cuest-slider-limites">
                    <span>0</span>
                    <span>{c.topeSlider} {c.unidad}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })}

      {categorias.length === 0 && (
        <div className="cuest-bloque" style={{ display: 'block' }}>
          <p style={{ margin: 0 }}>
            Aún no tienes ejercicios contratados. En cuanto tu preparador active tu acceso,
            podrás hacer la evaluación.
          </p>
        </div>
      )}

      {estado.error && <p className="form-error">{estado.error}</p>}

      <button type="submit" className="cta-primary cuest-enviar" disabled={pendiente}>
        {pendiente ? 'Guardando…' : 'Empezar a entrenar'}
      </button>
    </form>
  )
}
