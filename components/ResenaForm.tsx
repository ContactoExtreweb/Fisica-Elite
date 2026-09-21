'use client'

import { useActionState, useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { guardarResena, borrarResena, type EstadoResena } from '@/app/admin/resenas/actions'

export type ResenaDatos = {
  id: string
  nombre: string
  texto: string
  puntuacion: number
  origen: string | null
  visible: boolean
  orden: number
}

const inicial: EstadoResena = {}

export default function ResenaForm({ resena }: { resena?: ResenaDatos }) {
  const [estado, accion, pendiente] = useActionState(guardarResena, inicial)
  const [errorBorrar, setErrorBorrar] = useState<string | null>(null)
  const [borrando, startBorrar] = useTransition()
  const router = useRouter()

  useEffect(() => {
    if (estado.ok && !resena) router.push('/admin/resenas')
  }, [estado, resena, router])

  const borrar = () => {
    if (!resena) return
    if (
      !confirm(
        `¿Borrar la reseña de «${resena.nombre}»? Si solo quieres quitarla de la web, ocúltala en vez de borrarla.`
      )
    )
      return
    startBorrar(async () => {
      setErrorBorrar(null)
      const res = await borrarResena(resena.id)
      if (res.error) setErrorBorrar(res.error)
      else router.push('/admin/resenas')
    })
  }

  return (
    <form action={accion} className="ff-form">
      {resena && <input type="hidden" name="id" value={resena.id} />}

      {/* 01 · La reseña */}
      <section className="ff-sec">
        <div className="ff-sec-side">
          <span className="ff-sec-num">01</span>
          <div>
            <h3>La reseña</h3>
            <p>Quién la escribe y qué dice. Cópiala tal cual de Google.</p>
          </div>
        </div>
        <div className="ff-sec-body">
          <div className="ff-field ff-field-hero">
            <label htmlFor="nombre">Nombre</label>
            <input
              type="text"
              id="nombre"
              name="nombre"
              required
              maxLength={80}
              defaultValue={resena?.nombre ?? ''}
              placeholder="Cecilia Blanco"
            />
            <span className="ff-hint">
              Sale tal como lo escribas: si prefieres no enseñarlo entero, pon solo nombre e inicial
              («Cecilia B.»).
            </span>
          </div>

          <div className="ff-field">
            <label htmlFor="texto">Texto</label>
            <textarea
              id="texto"
              name="texto"
              rows={5}
              required
              maxLength={1200}
              defaultValue={resena?.texto ?? ''}
              placeholder="Centro de preparación física muy profesional…"
            />
          </div>

          <div className="ff-row">
            <div className="ff-field ff-field-mini">
              <label htmlFor="puntuacion">Puntuación</label>
              <select id="puntuacion" name="puntuacion" defaultValue={String(resena?.puntuacion ?? 5)}>
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? 'estrella' : 'estrellas'}
                  </option>
                ))}
              </select>
            </div>
            <div className="ff-field">
              <label htmlFor="origen">Procedencia (opcional)</label>
              <input
                type="text"
                id="origen"
                name="origen"
                maxLength={40}
                defaultValue={resena ? (resena.origen ?? '') : 'Google'}
                placeholder="Google"
              />
              <span className="ff-hint">Sale como «Reseña de Google». Vacío = no se muestra.</span>
            </div>
          </div>
        </div>
      </section>

      {/* 02 · Publicación */}
      <section className="ff-sec">
        <div className="ff-sec-side">
          <span className="ff-sec-num">02</span>
          <div>
            <h3>Publicación</h3>
            <p>Orden y si se ve en la web.</p>
          </div>
        </div>
        <div className="ff-sec-body">
          <div className="ff-row">
            <div className="ff-field ff-field-mini">
              <label htmlFor="orden">Orden</label>
              <input type="number" id="orden" name="orden" defaultValue={resena?.orden ?? 0} />
              <span className="ff-hint">Menor sale antes. El Inicio enseña las 6 primeras.</span>
            </div>
            <div className="ff-field">
              <label>Estado</label>
              <label className="ff-switch">
                <input type="checkbox" name="visible" defaultChecked={resena?.visible ?? true} />
                <span className="ff-switch-track"><span className="ff-switch-thumb" /></span>
                <span className="ff-switch-txt">Visible en la web</span>
              </label>
            </div>
          </div>
        </div>
      </section>

      {estado.error && <p className="form-error">{estado.error}</p>}
      {estado.ok && resena && <p className="form-exito">Guardado ✓</p>}

      <div className="ff-acciones">
        <button type="submit" className="ff-guardar" disabled={pendiente}>
          {pendiente ? 'Guardando…' : resena ? 'Guardar cambios' : 'Añadir reseña'}
        </button>
      </div>

      {resena && (
        <div className="ff-peligro">
          <div>
            <div className="ff-peligro-tit">Borrar esta reseña</div>
            <p>Para quitarla de la web sin perderla, desmárcala como «visible en la web».</p>
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
