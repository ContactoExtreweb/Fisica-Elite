'use client'

import { useActionState } from 'react'
import { enviarContacto, type EstadoContacto } from '@/app/contacto/actions'

const inicial: EstadoContacto = {}

export default function FormularioContacto() {
  const [estado, accion, pendiente] = useActionState(enviarContacto, inicial)

  if (estado.ok) {
    return (
      <div className="contacto-ok">
        <div className="contacto-ok-icono">✓</div>
        <h3>¡Mensaje enviado!</h3>
        <p>
          Gracias por escribirnos. Te responderemos lo antes posible al correo o
          teléfono que nos has dejado.
        </p>
      </div>
    )
  }

  return (
    <form action={accion} className="contacto-form">
      <div className="precios-grid">
        <div className="field">
          <label htmlFor="nombre">Nombre *</label>
          <input type="text" id="nombre" name="nombre" required disabled={pendiente} />
        </div>
        <div className="field">
          <label htmlFor="telefono">Teléfono</label>
          <input type="tel" id="telefono" name="telefono" placeholder="+34 …" disabled={pendiente} />
        </div>
      </div>

      <div className="precios-grid">
        <div className="field">
          <label htmlFor="email">Correo electrónico *</label>
          <input type="email" id="email" name="email" required disabled={pendiente} />
        </div>
        <div className="field">
          <label htmlFor="oposicion">¿A qué te presentas?</label>
          <select id="oposicion" name="oposicion" defaultValue="" disabled={pendiente}>
            <option value="">Selecciona…</option>
            <option value="policia_local">Policía Local</option>
            <option value="policia_nacional">Policía Nacional</option>
            <option value="guardia_civil">Guardia Civil</option>
            <option value="fuerzas_armadas">Fuerzas Armadas</option>
            <option value="otra">Otra / aún no lo sé</option>
          </select>
        </div>
      </div>

      <div className="field">
        <label htmlFor="mensaje">Tu mensaje *</label>
        <textarea
          id="mensaje"
          name="mensaje"
          rows={5}
          required
          placeholder="Cuéntanos tu situación: a qué oposición te presentas, tu nivel actual, cuándo es la prueba…"
          disabled={pendiente}
        />
      </div>

      {/* Honeypot anti-bot: oculto para humanos */}
      <div className="hp-campo" aria-hidden="true">
        <label htmlFor="web">No rellenar</label>
        <input type="text" id="web" name="web" tabIndex={-1} autoComplete="off" />
      </div>

      {estado.error && <p className="form-error">{estado.error}</p>}

      <button type="submit" className="cta-primary" disabled={pendiente} style={{ width: '100%' }}>
        {pendiente ? 'Enviando…' : 'Enviar mensaje'}
      </button>
    </form>
  )
}
