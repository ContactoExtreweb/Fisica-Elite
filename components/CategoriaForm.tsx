'use client'

import { useActionState, useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  guardarCategoria,
  borrarCategoria,
  type EstadoCategoria,
} from '@/app/admin/categorias/actions'

export type CategoriaDatos = {
  id: string
  nombre: string
  slug: string
  metrica: string
  unidad: string
  descripcion: string | null
  orden: number
  activa: boolean
}

const inicial: EstadoCategoria = {}

export default function CategoriaForm({ categoria }: { categoria?: CategoriaDatos }) {
  const [estado, accion, pendiente] = useActionState(guardarCategoria, inicial)
  const [errorBorrar, setErrorBorrar] = useState<string | null>(null)
  const [borrando, startBorrar] = useTransition()
  const router = useRouter()

  useEffect(() => {
    if (estado.ok && estado.id && !categoria) {
      router.push(`/admin/categorias/${estado.id}`)
    }
  }, [estado, categoria, router])

  const borrar = () => {
    if (!categoria) return
    if (!confirm(`¿Borrar la categoría «${categoria.nombre}»? Solo es posible si no tiene ejercicios.`))
      return
    startBorrar(async () => {
      setErrorBorrar(null)
      const res = await borrarCategoria(categoria.id)
      if (res.error) setErrorBorrar(res.error)
      else router.push('/admin/categorias')
    })
  }

  return (
    <form action={accion} className="ff-form">
      {categoria && <input type="hidden" name="id" value={categoria.id} />}

      {/* 01 · Identidad */}
      <section className="ff-sec">
        <div className="ff-sec-side">
          <span className="ff-sec-num">01</span>
          <div>
            <h3>Identidad</h3>
            <p>El nombre de la categoría de ejercicio.</p>
          </div>
        </div>
        <div className="ff-sec-body">
          <div className="ff-field ff-field-hero">
            <label htmlFor="nombre">Nombre</label>
            <input type="text" id="nombre" name="nombre" required defaultValue={categoria?.nombre ?? ''} placeholder="Dominadas" />
          </div>
          <div className="ff-field">
            <label htmlFor="slug">Slug (enlace)</label>
            <input type="text" id="slug" name="slug" defaultValue={categoria?.slug ?? ''} placeholder="Se genera del nombre" />
          </div>
        </div>
      </section>

      {/* 02 · Medición */}
      <section className="ff-sec">
        <div className="ff-sec-side">
          <span className="ff-sec-num">02</span>
          <div>
            <h3>Medición</h3>
            <p>Qué mide esta categoría y en qué unidad.</p>
          </div>
        </div>
        <div className="ff-sec-body">
          <div className="ff-row">
            <div className="ff-field">
              <label htmlFor="metrica">Qué se mide</label>
              <select id="metrica" name="metrica" defaultValue={categoria?.metrica ?? 'repeticiones'}>
                <option value="repeticiones">Repeticiones</option>
                <option value="tiempo">Tiempo</option>
                <option value="distancia">Distancia</option>
                <option value="peso">Peso</option>
              </select>
            </div>
            <div className="ff-field">
              <label htmlFor="unidad">Unidad</label>
              <input type="text" id="unidad" name="unidad" defaultValue={categoria?.unidad ?? 'reps'} placeholder="reps · seg · km · kg" />
            </div>
          </div>
          <div className="ff-field">
            <label htmlFor="descripcion">Descripción</label>
            <textarea id="descripcion" name="descripcion" rows={2} defaultValue={categoria?.descripcion ?? ''} placeholder="Opcional." />
          </div>
        </div>
      </section>

      {/* 03 · Publicación */}
      <section className="ff-sec">
        <div className="ff-sec-side">
          <span className="ff-sec-num">03</span>
          <div>
            <h3>Publicación</h3>
            <p>Orden y visibilidad.</p>
          </div>
        </div>
        <div className="ff-sec-body">
          <div className="ff-row">
            <div className="ff-field ff-field-mini">
              <label htmlFor="orden">Orden</label>
              <input type="number" id="orden" name="orden" defaultValue={categoria?.orden ?? 0} />
            </div>
            <div className="ff-field">
              <label>Estado</label>
              <label className="ff-switch">
                <input type="checkbox" name="activa" defaultChecked={categoria?.activa ?? true} />
                <span className="ff-switch-track"><span className="ff-switch-thumb" /></span>
                <span className="ff-switch-txt">Categoría activa</span>
              </label>
            </div>
          </div>
        </div>
      </section>

      {estado.error && <p className="form-error">{estado.error}</p>}
      {estado.ok && categoria && <p className="form-exito">Guardado ✓</p>}

      <div className="ff-acciones">
        <button type="submit" className="ff-guardar" disabled={pendiente}>
          {pendiente ? 'Guardando…' : categoria ? 'Guardar cambios' : 'Crear categoría'}
        </button>
      </div>

      {categoria && (
        <div className="ff-peligro">
          <div>
            <div className="ff-peligro-tit">Borrar esta categoría</div>
            <p>Solo si no tiene ejercicios. Sus tramos se borran con ella.</p>
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
