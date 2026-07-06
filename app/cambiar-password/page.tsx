'use client'

import { useActionState } from 'react'
import { cambiarPassword } from './actions'
import type { EstadoForm } from '@/app/login/actions'
import { PASSWORD_MIN } from '@/lib/validacion'

const estadoInicial: EstadoForm = {}

export default function CambiarPasswordPage() {
  const [estado, accion, pendiente] = useActionState(
    cambiarPassword,
    estadoInicial
  )

  return (
    <div className="auth-solo-shell">
      <form className="login-form auth-solo-card" action={accion}>
        <div className="label">Primer acceso</div>
        <h2>Crea tu contraseña</h2>
        <p className="lead">
          Puedes mantener la que te dio tu preparador o crear una nueva. Debe
          tener mínimo {PASSWORD_MIN} caracteres y combinar letras, números y
          al menos un carácter especial.
        </p>

        <div className="field">
          <label htmlFor="password">Nueva contraseña</label>
          <input
            type="password"
            id="password"
            name="password"
            autoComplete="new-password"
            required
          />
        </div>

        <div className="field">
          <label htmlFor="confirmar">Repite la contraseña</label>
          <input
            type="password"
            id="confirmar"
            name="confirmar"
            autoComplete="new-password"
            required
          />
        </div>

        {estado.error && <p className="form-error">{estado.error}</p>}

        <button type="submit" className="cta-primary" disabled={pendiente}>
          {pendiente ? 'Guardando…' : 'Guardar y entrar'}
        </button>
      </form>
    </div>
  )
}
