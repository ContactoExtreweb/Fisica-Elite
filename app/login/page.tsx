'use client'

import Link from 'next/link'
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
          {/* La marca vuelve a la home (solo se ve en escritorio: en móvil
              .login-art está oculto, por eso el enlace de abajo). */}
          <Link href="/" className="brand login-marca-link">
            FÍSICAS<span className="accent">.</span>ELITE
          </Link>
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

        <div className="login-foot">© Físicas Élite Cáceres · 2026</div>
      </div>

      {/* Lado derecho: formulario */}
      <form className="login-form" action={accion}>
        {/* Salida a la web pública. Imprescindible en móvil: ahí el panel
            de la izquierda no se pinta y sin esto no hay forma de volver. */}
        <Link href="/" className="login-volver">
          ← Volver a la web
        </Link>

        <div className="label">Acceder</div>
        <h2>Bienvenido de vuelta</h2>
        <p className="lead">
          Introduce tus datos para continuar con tu entrenamiento.
        </p>

        <div className="field">
          <label htmlFor="identificador">Correo, usuario o teléfono</label>
          <input
            type="text"
            id="identificador"
            name="identificador"
            placeholder="tu@correo.com · tu_usuario · 600 000 000"
            autoComplete="username"
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
          ¿Aún no eres alumno?{' '}
          <Link href="/precios" className="login-volver-inline">
            Mira los planes
          </Link>{' '}
          o contacta con tu preparador para darte de alta.
        </p>
      </form>
    </div>
  )
}
