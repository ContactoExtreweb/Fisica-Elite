'use client'

import { useActionState } from 'react'
import { login, type EstadoForm } from './actions'

const estadoInicial: EstadoForm = {}

export default function LoginPage() {
  const [estado, accion, pendiente] = useActionState(login, estadoInicial)

  return (
    <div className="login-shell">
      {/* Lado izquierdo: branding */}
      <div className="login-art">
        <div>
          <div className="brand">
            FÍSICA<span className="accent">.</span>ELITE
          </div>
          <div className="brand-sub">Cáceres · Online</div>
        </div>

        <div className="login-tagline">
          <h1>
            Tu gimnasio.
            <br />
            <em>Donde quieras.</em>
          </h1>
          <p>
            Planes adaptados a tu oposición, biblioteca completa de ejercicios
            y el seguimiento personal de tu preparador. Todo en un mismo sitio.
          </p>
        </div>

        <div className="login-foot">© Física Elite Cáceres · 2026</div>
      </div>

      {/* Lado derecho: formulario */}
      <form className="login-form" action={accion}>
        <div className="label">Acceder</div>
        <h2>Bienvenido de vuelta</h2>
        <p className="lead">
          Introduce tus datos para continuar con tu entrenamiento.
        </p>

        <div className="field">
          <label htmlFor="email">Correo electrónico</label>
          <input
            type="email"
            id="email"
            name="email"
            placeholder="tu@correo.com"
            autoComplete="email"
            required
          />
        </div>

        <div className="field">
          <label htmlFor="password">Contraseña</label>
          <input
            type="password"
            id="password"
            name="password"
            autoComplete="current-password"
            required
          />
        </div>

        {estado.error && <p className="form-error">{estado.error}</p>}

        <button type="submit" className="cta-primary" disabled={pendiente}>
          {pendiente ? 'Entrando…' : 'Acceder a mi cuenta'}
        </button>

        <p className="login-alt">
          ¿Aún no eres alumno? Contacta con tu preparador para darte de alta.
        </p>
      </form>
    </div>
  )
}
