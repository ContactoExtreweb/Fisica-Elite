'use client'

// Cuestionario inicial: una pregunta por categoría contratada, más un
// bloque final de datos físicos (peso, altura, con qué cuenta para
// entrenar) — así el preparador los tiene desde el primer día, en vez de
// depender de que el alumno pase luego por /perfil a rellenarlos.
// Ese bloque final se puede OMITIR: no es obligatorio para empezar a
// entrenar, y se puede rellenar más tarde desde /perfil.
//
// El control de cada categoría se adapta a su métrica:
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

export type DatosFisicos = {
  peso_kg: number | null
  altura_cm: number | null
  facilidades: string | null
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
  datosFisicos,
}: {
  categorias: CategoriaCuestionario[]
  /** Ya rellenos si el alumno repite la evaluación */
  datosFisicos: DatosFisicos
}) {
  const [estado, accion, pendiente] = useActionState(guardarCuestionario, inicial)

  // Estado de cada slider (valor actual). Arranca a la mitad del tope.
  const [valores, setValores] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      categorias.map((c) => [c.id, c.metrica === 'tiempo' ? 0 : Math.round(c.topeSlider / 2)])
    )
  )
  const set = (id: string, v: number) => setValores((s) => ({ ...s, [id]: v }))

  // El bloque de datos físicos empieza omitido solo si YA los tenía
  // rellenos de antes (repitiendo evaluación); si no, se enseña abierto.
  const yaTeniaDatos = !!(datosFisicos.peso_kg || datosFisicos.altura_cm || datosFisicos.facilidades)
  const [omitirDatos, setOmitirDatos] = useState(false)

  if (estado.ok) {
    return (
      <div className="cuest-ok">
        <div className="cuest-ok-icono">✓</div>
        <h2>¡Listo!</h2>
        <p>Hemos preparado tu entrenamiento a tu medida. Ya puedes empezar.</p>
        <a href="/inicio" className="cta-primary">
          Ir a mi entrenamiento
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

      {/* Datos físicos: opcionales, con la misma pinta que las preguntas
          de arriba para que se sienta parte del mismo cuestionario. */}
      <div className="cuest-bloque cuest-bloque-fisicos">
        <div className="cuest-num">{String(categorias.length + 1).padStart(2, '0')}</div>
        <div className="cuest-cuerpo">
          <div className="cuest-cat">Tus datos</div>
          <p className="cuest-pregunta" style={{ marginBottom: omitirDatos ? 0 : 22 }}>
            Peso, altura y con qué cuentas para entrenar en casa. Ayudan a tu preparador a
            ajustar tu plan — si no lo sabes ahora, puedes omitirlo y rellenarlo luego desde tu
            perfil.
          </p>

          {omitirDatos ? (
            <button
              type="button"
              className="cuest-omitido"
              onClick={() => setOmitirDatos(false)}
            >
              Omitido — lo rellenarás desde tu perfil. <span>Volver a rellenarlo →</span>
            </button>
          ) : (
            <>
              <div className="cuest-fisicos-fila">
                <div className="cuest-tiempo">
                  <input
                    type="number"
                    name="peso_kg"
                    min={20}
                    max={300}
                    step="0.1"
                    inputMode="decimal"
                    placeholder="Ej. 72"
                    defaultValue={datosFisicos.peso_kg ?? ''}
                  />
                  <span className="cuest-unidad">kg</span>
                </div>
                <div className="cuest-tiempo">
                  <input
                    type="number"
                    name="altura_cm"
                    min={100}
                    max={250}
                    inputMode="decimal"
                    placeholder="Ej. 178"
                    defaultValue={datosFisicos.altura_cm ?? ''}
                  />
                  <span className="cuest-unidad">cm</span>
                </div>
              </div>
              <textarea
                name="facilidades"
                rows={2}
                className="cuest-textarea"
                placeholder="Ej. Barra de dominadas, un par de mancuernas, espacio para correr cerca…"
                defaultValue={datosFisicos.facilidades ?? ''}
              />
              {!yaTeniaDatos && (
                <button type="button" className="cuest-omitir" onClick={() => setOmitirDatos(true)}>
                  Prefiero omitir esto por ahora
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {estado.error && <p className="form-error">{estado.error}</p>}

      <button type="submit" className="cta-primary cuest-enviar" disabled={pendiente}>
        {pendiente ? 'Guardando…' : 'Empezar a entrenar'}
      </button>
    </form>
  )
}
