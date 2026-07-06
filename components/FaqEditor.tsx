'use client'

import { useState } from 'react'
import { useActionState } from 'react'
import {
  crearFaq,
  actualizarFaq,
  borrarFaq,
  type EstadoEjercicio,
} from '@/app/admin/ejercicios/actions'

type Faq = {
  id: string
  pregunta: string
  respuesta: string
}

const estadoInicial: EstadoEjercicio = {}

function FaqItem({ faq, ejercicioId }: { faq: Faq; ejercicioId: string }) {
  const [editando, setEditando] = useState(false)

  if (editando) {
    return (
      <div className="faq-item">
        <form
          className="upload-form"
          action={async (fd) => {
            await actualizarFaq(fd)
            setEditando(false)
          }}
        >
          <input type="hidden" name="faq_id" value={faq.id} />
          <input type="hidden" name="ejercicio_id" value={ejercicioId} />
          <div className="field-group">
            <label>Pregunta</label>
            <input type="text" name="pregunta" defaultValue={faq.pregunta} required />
          </div>
          <div className="field-group">
            <label>Respuesta</label>
            <textarea name="respuesta" defaultValue={faq.respuesta} required />
          </div>
          <div className="faq-acciones">
            <button type="submit" className="faq-btn-mini">Guardar</button>
            <button
              type="button"
              className="faq-btn-mini gris"
              onClick={() => setEditando(false)}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className="faq-item">
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
        {faq.pregunta}
      </div>
      <div style={{ fontSize: 14, color: 'var(--ink-2)', whiteSpace: 'pre-line' }}>
        {faq.respuesta}
      </div>
      <div className="faq-acciones">
        <button type="button" className="faq-btn-mini" onClick={() => setEditando(true)}>
          Editar
        </button>
        <form
          action={borrarFaq}
          onSubmit={(e) => {
            if (!confirm('¿Borrar esta pregunta frecuente?')) e.preventDefault()
          }}
        >
          <input type="hidden" name="faq_id" value={faq.id} />
          <input type="hidden" name="ejercicio_id" value={ejercicioId} />
          <button type="submit" className="faq-btn-mini gris">Borrar</button>
        </form>
      </div>
    </div>
  )
}

export default function FaqEditor({
  ejercicioId,
  faqs,
}: {
  ejercicioId: string
  faqs: Faq[]
}) {
  const [estado, accion, pendiente] = useActionState(crearFaq, estadoInicial)

  return (
    <div className="admin-section">
      <div className="admin-section-head">
        <h3>Preguntas frecuentes</h3>
        <div className="meta">
          {faqs.length === 0
            ? 'Aún no hay preguntas'
            : `${faqs.length} pregunta${faqs.length === 1 ? '' : 's'}`}
        </div>
      </div>

      {faqs.map((f) => (
        <FaqItem key={f.id} faq={f} ejercicioId={ejercicioId} />
      ))}

      {/* Añadir nueva */}
      <div className="faq-item" style={{ background: 'var(--bg-alt)' }}>
        <form className="upload-form" action={accion}>
          <input type="hidden" name="ejercicio_id" value={ejercicioId} />
          <div className="field-group">
            <label htmlFor="pregunta">Nueva pregunta</label>
            <input
              type="text"
              id="pregunta"
              name="pregunta"
              placeholder="Ej. ¿Cuántas veces a la semana debo entrenarlo?"
              required
            />
          </div>
          <div className="field-group">
            <label htmlFor="respuesta">Respuesta</label>
            <textarea
              id="respuesta"
              name="respuesta"
              placeholder="Respuesta que verá el alumno…"
              required
            />
          </div>

          {estado.error && <p className="form-error">{estado.error}</p>}

          <button type="submit" className="admin-topbar-cta" disabled={pendiente}>
            {pendiente ? 'Añadiendo…' : 'Añadir pregunta'}
          </button>
        </form>
      </div>
    </div>
  )
}
