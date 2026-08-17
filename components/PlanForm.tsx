'use client'

import { useActionState, useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { guardarPlan, borrarPlan, type EstadoPlan } from '@/app/admin/planes/actions'

export type PlanDatos = {
  id: string
  nombre: string
  slug: string
  tipo: string
  precio_centimos: number
  especialidad: string | null
  descripcion: string | null
  orden: number
  activo: boolean
}

const ETIQ_ESP: Record<string, string> = {
  policia_local: 'Policía Local',
  policia_nacional: 'Policía Nacional',
  guardia_civil: 'Guardia Civil',
  fuerzas_armadas: 'Fuerzas Armadas',
  aduanas: 'Aduanas',
}

const inicial: EstadoPlan = {}

export default function PlanForm({
  plan,
  categorias,
  categoriasDelPlan = [],
}: {
  plan?: PlanDatos
  categorias: { id: string; nombre: string }[]
  categoriasDelPlan?: string[]
}) {
  const [estado, accion, pendiente] = useActionState(guardarPlan, inicial)
  const [tipo, setTipo] = useState(plan?.tipo ?? 'ejercicio')
  const [cats, setCats] = useState<string[]>(categoriasDelPlan)
  const [errorBorrar, setErrorBorrar] = useState<string | null>(null)
  const [borrando, startBorrar] = useTransition()
  const router = useRouter()

  useEffect(() => {
    if (estado.ok && !plan) router.push('/admin/planes')
  }, [estado, plan, router])

  const toggleCat = (id: string) =>
    setCats((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]))

  const borrar = () => {
    if (!plan) return
    if (
      !confirm(
        `¿Borrar el plan «${plan.nombre}»? Las suscripciones existentes no se rompen. Si solo quieres dejar de venderlo, desmárcalo como activo.`
      )
    )
      return
    startBorrar(async () => {
      setErrorBorrar(null)
      const res = await borrarPlan(plan.id)
      if (res.error) setErrorBorrar(res.error)
      else router.push('/admin/planes')
    })
  }

  return (
    <form action={accion} className="ff-form">
      {plan && <input type="hidden" name="id" value={plan.id} />}

      {/* 01 · Identidad y precio */}
      <section className="ff-sec">
        <div className="ff-sec-side">
          <span className="ff-sec-num">01</span>
          <div>
            <h3>El plan</h3>
            <p>Cómo se llama y cuánto cuesta al mes.</p>
          </div>
        </div>
        <div className="ff-sec-body">
          <div className="ff-field ff-field-hero">
            <label htmlFor="nombre">Nombre del plan</label>
            <input type="text" id="nombre" name="nombre" required defaultValue={plan?.nombre ?? ''} placeholder="Solo dominadas" />
          </div>
          <div className="ff-row">
            <div className="ff-field ff-field-precio">
              <label htmlFor="precio">Precio al mes (€)</label>
              <input
                type="text"
                id="precio"
                name="precio"
                required
                inputMode="decimal"
                defaultValue={plan ? (plan.precio_centimos / 100).toFixed(2) : ''}
                placeholder="39.00"
              />
            </div>
            <div className="ff-field">
              <label htmlFor="slug">Slug (enlace)</label>
              <input type="text" id="slug" name="slug" defaultValue={plan?.slug ?? ''} placeholder="Se genera del nombre" />
            </div>
          </div>
        </div>
      </section>

      {/* 02 · Qué incluye */}
      <section className="ff-sec">
        <div className="ff-sec-side">
          <span className="ff-sec-num">02</span>
          <div>
            <h3>Qué incluye</h3>
            <p>El tipo de plan decide a qué da acceso.</p>
          </div>
        </div>
        <div className="ff-sec-body">
          <div className="ff-field">
            <label htmlFor="tipo">Tipo de plan</label>
            <select id="tipo" name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="ejercicio">Por ejercicio (eliges categorías)</option>
              <option value="completo">Completo (todos los ejercicios)</option>
              <option value="oposicion">Por oposición</option>
            </select>
          </div>

          {tipo === 'oposicion' && (
            <div className="ff-field">
              <label htmlFor="especialidad">Oposición</label>
              <select id="especialidad" name="especialidad" defaultValue={plan?.especialidad ?? ''}>
                <option value="" disabled>
                  Elige…
                </option>
                {Object.entries(ETIQ_ESP).map(([v, t]) => (
                  <option key={v} value={v}>
                    {t}
                    {v === 'aduanas' ? ' (próximamente)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {tipo === 'ejercicio' && (
            <div className="ff-field">
              <label>Categorías incluidas</label>
              {categorias.length === 0 ? (
                <p className="form-error">No hay categorías todavía: crea alguna en «Categorías y tramos».</p>
              ) : (
                <div className="ff-pills">
                  {categorias.map((c) => {
                    const on = cats.includes(c.id)
                    return (
                      <button
                        type="button"
                        key={c.id}
                        className={`ff-pill ${on ? 'on' : ''}`}
                        onClick={() => toggleCat(c.id)}
                        aria-pressed={on}
                      >
                        <span className="ff-pill-dot" />
                        {c.nombre}
                      </button>
                    )
                  })}
                </div>
              )}
              {cats.map((c) => (
                <input key={c} type="hidden" name="categorias" value={c} />
              ))}
            </div>
          )}

          {tipo === 'completo' && (
            <p className="ff-hint" style={{ marginTop: 0 }}>
              Este plan da acceso a <strong>todos</strong> los ejercicios de la plataforma.
            </p>
          )}

          <div className="ff-field">
            <label htmlFor="descripcion">Descripción (se verá en la web pública)</label>
            <textarea id="descripcion" name="descripcion" rows={2} defaultValue={plan?.descripcion ?? ''} />
          </div>
        </div>
      </section>

      {/* 03 · Publicación */}
      <section className="ff-sec">
        <div className="ff-sec-side">
          <span className="ff-sec-num">03</span>
          <div>
            <h3>Publicación</h3>
            <p>Orden y si está a la venta.</p>
          </div>
        </div>
        <div className="ff-sec-body">
          <div className="ff-row">
            <div className="ff-field ff-field-mini">
              <label htmlFor="orden">Orden</label>
              <input type="number" id="orden" name="orden" defaultValue={plan?.orden ?? 0} />
            </div>
            <div className="ff-field">
              <label>Estado</label>
              <label className="ff-switch">
                <input type="checkbox" name="activo" defaultChecked={plan?.activo ?? true} />
                <span className="ff-switch-track"><span className="ff-switch-thumb" /></span>
                <span className="ff-switch-txt">A la venta</span>
              </label>
            </div>
          </div>
        </div>
      </section>

      {estado.error && <p className="form-error">{estado.error}</p>}
      {estado.ok && plan && <p className="form-exito">Guardado ✓</p>}

      <div className="ff-acciones">
        <button type="submit" className="ff-guardar" disabled={pendiente}>
          {pendiente ? 'Guardando…' : plan ? 'Guardar cambios' : 'Crear plan'}
        </button>
      </div>

      {plan && (
        <div className="ff-peligro">
          <div>
            <div className="ff-peligro-tit">Borrar este plan</div>
            <p>Para dejar de venderlo sin borrarlo, desmárcalo como «a la venta».</p>
            {errorBorrar && <p className="form-error">{errorBorrar}</p>}
          </div>
          <button type="button" className="ff-btn-peligro" onClick={borrar} disabled={borrando}>
            {borrando ? 'Borrando…' : 'Borrar'}
          </button>
        </div>
      )}
    </form>
  )
}
