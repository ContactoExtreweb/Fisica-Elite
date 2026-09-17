'use client'

// Formulario de ejercicio v2, rediseñado con jerarquía y secciones.
// Usa una clase propia (.ff-form) para no heredar reglas antiguas que
// se cancelaban entre sí. Categoría + tramo dependiente + oposiciones.
import { useActionState, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { guardarEjercicio, type EstadoEjercicio } from '@/app/admin/ejercicios/actions'

type Ejercicio = {
  id: string
  slug: string | null
  titulo: string
  categoria_id: string
  tramo_id: string | null
  descripcion: string | null
  tecnica: string | null
  variantes: string | null
  errores_comunes: string | null
  mejoras: string | null
  orden: number
  publicado: boolean
  explicativo?: boolean
}

type Categoria = { id: string; nombre: string }
type Tramo = { id: string; nombre: string; categoria_id: string }

const ETIQ_ESP: Record<string, string> = {
  policia_local: 'Policía Local',
  policia_nacional: 'Policía Nacional',
  guardia_civil: 'Guardia Civil',
  fuerzas_armadas: 'Fuerzas Armadas',
  aduanas: 'Aduanas',
}

const estadoInicial: EstadoEjercicio = {}

export default function EjercicioForm({ ejercicio }: { ejercicio?: Ejercicio }) {
  const [estado, accion, pendiente] = useActionState(guardarEjercicio, estadoInicial)

  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [tramos, setTramos] = useState<Tramo[]>([])
  const [catSel, setCatSel] = useState(ejercicio?.categoria_id ?? '')
  const [tramoSel, setTramoSel] = useState(ejercicio?.tramo_id ?? '')
  const [explicativo, setExplicativo] = useState(ejercicio?.explicativo ?? false)
  const [opos, setOpos] = useState<string[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const cargar = async () => {
      const sb = createClient()
      const [{ data: cats }, { data: trs }] = await Promise.all([
        sb.from('categorias_ejercicio').select('id, nombre').order('orden').order('nombre'),
        sb.from('tramos').select('id, nombre, categoria_id').order('orden'),
      ])
      setCategorias(cats ?? [])
      setTramos(trs ?? [])
      if (ejercicio) {
        const { data: eo } = await sb
          .from('ejercicio_oposiciones')
          .select('especialidad')
          .eq('ejercicio_id', ejercicio.id)
        setOpos((eo ?? []).map((d) => d.especialidad as string))
      }
      setCargando(false)
    }
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const tramosDeCat = tramos.filter((t) => t.categoria_id === catSel)
  const toggleOpos = (v: string) =>
    setOpos((o) => (o.includes(v) ? o.filter((x) => x !== v) : [...o, v]))

  return (
    <form action={accion} className="ff-form">
      {ejercicio && <input type="hidden" name="id" value={ejercicio.id} />}

      {/* SECCIÓN 1 · Identidad del ejercicio */}
      <section className="ff-sec">
        <div className="ff-sec-side">
          <span className="ff-sec-num">01</span>
          <div>
            <h3>Identidad</h3>
            <p>El nombre con el que el alumno lo verá.</p>
          </div>
        </div>
        <div className="ff-sec-body">
          <div className="ff-field ff-field-hero">
            <label htmlFor="titulo">Nombre del ejercicio</label>
            <input
              type="text"
              id="titulo"
              name="titulo"
              required
              defaultValue={ejercicio?.titulo ?? ''}
              placeholder="Dominadas pronas estrictas"
            />
          </div>
          <div className="ff-field">
            <label htmlFor="slug">Enlace (slug)</label>
            <input
              type="text"
              id="slug"
              name="slug"
              defaultValue={ejercicio?.slug ?? ''}
              placeholder="Se genera solo desde el nombre"
            />
            <span className="ff-hint">La parte final de la URL. Déjalo vacío y se crea solo.</span>
          </div>
        </div>
      </section>

      {/* SECCIÓN 2 · Clasificación */}
      <section className="ff-sec">
        <div className="ff-sec-side">
          <span className="ff-sec-num">02</span>
          <div>
            <h3>Clasificación</h3>
            <p>Dónde encaja y para quién cuenta.</p>
          </div>
        </div>
        <div className="ff-sec-body">
          <div className="ff-row">
            <div className="ff-field">
              <label htmlFor="categoria_id">Categoría</label>
              <select
                id="categoria_id"
                name="categoria_id"
                required
                value={catSel}
                onChange={(e) => {
                  setCatSel(e.target.value)
                  setTramoSel('')
                }}
                disabled={cargando}
              >
                <option value="" disabled>
                  {cargando ? 'Cargando…' : 'Elige categoría'}
                </option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="ff-field">
              <label htmlFor="tramo_id">Tramo</label>
              <select
                id="tramo_id"
                name="tramo_id"
                value={tramoSel}
                onChange={(e) => setTramoSel(e.target.value)}
                disabled={cargando || !catSel || explicativo}
              >
                <option value="">Todos los tramos</option>
                {tramosDeCat.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
              </select>
              <span className="ff-hint">
                {explicativo
                  ? 'Los explicativos se ven en todos los tramos.'
                  : catSel
                    ? 'Vacío = se ve en todos los tramos (técnica general).'
                    : 'Elige antes una categoría.'}
              </span>
            </div>
          </div>

          <div className="ff-field">
            <label>Tipo de contenido</label>
            <label className="ff-switch">
              <input
                type="checkbox"
                name="explicativo"
                checked={explicativo}
                onChange={(e) => {
                  setExplicativo(e.target.checked)
                  if (e.target.checked) setTramoSel('')
                }}
              />
              <span className="ff-switch-track"><span className="ff-switch-thumb" /></span>
              <span className="ff-switch-txt">Ejercicio explicativo</span>
            </label>
            <span className="ff-hint">
              Vídeo de técnica de un movimiento (press banca, sentadilla…). El alumno lo ve en su
              sección «Explicaciones», dentro de esta categoría, y no mezclado con el
              entrenamiento por tramos.
            </span>
          </div>

          <div className="ff-field">
            <label>Oposiciones para las que cuenta</label>
            <div className="ff-pills">
              {Object.entries(ETIQ_ESP).map(([v, t]) => {
                const on = opos.includes(v)
                return (
                  <button
                    type="button"
                    key={v}
                    className={`ff-pill ${on ? 'on' : ''}`}
                    onClick={() => toggleOpos(v)}
                    aria-pressed={on}
                  >
                    <span className="ff-pill-dot" />
                    {t}
                    {v === 'aduanas' && <span className="ff-pill-soon">pronto</span>}
                  </button>
                )
              })}
            </div>
            <span className="ff-hint">Puede ser varias, o ninguna. El alumno solo lo ve en la temática marcada.</span>
            {/* Envío real de los valores marcados */}
            {opos.map((v) => (
              <input key={v} type="hidden" name="oposiciones" value={v} />
            ))}
          </div>
        </div>
      </section>

      {/* SECCIÓN 3 · Contenido */}
      <section className="ff-sec">
        <div className="ff-sec-side">
          <span className="ff-sec-num">03</span>
          <div>
            <h3>Contenido</h3>
            <p>Lo que se muestra en la ficha del ejercicio.</p>
          </div>
        </div>
        <div className="ff-sec-body">
          <div className="ff-field">
            <label htmlFor="descripcion">Descripción corta</label>
            <textarea
              id="descripcion"
              name="descripcion"
              rows={2}
              defaultValue={ejercicio?.descripcion ?? ''}
              placeholder="Una línea que resuma el ejercicio."
            />
          </div>
          <div className="ff-field">
            <label htmlFor="tecnica">Técnica</label>
            <textarea
              id="tecnica"
              name="tecnica"
              rows={4}
              defaultValue={ejercicio?.tecnica ?? ''}
              placeholder="Cómo se ejecuta correctamente."
            />
          </div>
          <div className="ff-row">
            <div className="ff-field">
              <label htmlFor="errores_comunes">Errores comunes</label>
              <textarea
                id="errores_comunes"
                name="errores_comunes"
                rows={3}
                defaultValue={ejercicio?.errores_comunes ?? ''}
              />
            </div>
            <div className="ff-field">
              <label htmlFor="variantes">Variantes</label>
              <textarea id="variantes" name="variantes" rows={3} defaultValue={ejercicio?.variantes ?? ''} />
            </div>
          </div>
          <div className="ff-field">
            <label htmlFor="mejoras">Mejoras / progresiones</label>
            <textarea id="mejoras" name="mejoras" rows={3} defaultValue={ejercicio?.mejoras ?? ''} />
          </div>
        </div>
      </section>

      {/* SECCIÓN 4 · Publicación */}
      <section className="ff-sec">
        <div className="ff-sec-side">
          <span className="ff-sec-num">04</span>
          <div>
            <h3>Publicación</h3>
            <p>Orden y visibilidad.</p>
          </div>
        </div>
        <div className="ff-sec-body">
          <div className="ff-row">
            <div className="ff-field ff-field-mini">
              <label htmlFor="orden">Orden en su tramo</label>
              <input type="number" id="orden" name="orden" defaultValue={ejercicio?.orden ?? 0} />
            </div>
            <div className="ff-field">
              <label>Estado</label>
              <label className="ff-switch">
                <input type="checkbox" name="publicado" defaultChecked={ejercicio?.publicado ?? false} />
                <span className="ff-switch-track"><span className="ff-switch-thumb" /></span>
                <span className="ff-switch-txt">Publicado (visible para alumnos)</span>
              </label>
            </div>
          </div>
        </div>
      </section>

      {estado.error && <p className="form-error">{estado.error}</p>}
      {estado.ok && ejercicio && <p className="form-exito">Guardado ✓</p>}

      <div className="ff-acciones">
        <button type="submit" className="ff-guardar" disabled={pendiente || cargando}>
          {pendiente ? 'Guardando…' : ejercicio ? 'Guardar cambios' : 'Crear ejercicio'}
        </button>
      </div>
    </form>
  )
}
