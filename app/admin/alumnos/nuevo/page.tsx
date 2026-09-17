'use client'

import { useState } from 'react'
import { useActionState } from 'react'
import Link from 'next/link'
import { crearAlumno, type EstadoAlta } from './actions'
import SelectorAccesoAlta from '@/components/SelectorAccesoAlta'

const estadoInicial: EstadoAlta = {}

export default function NuevoAlumnoPage() {
  const [estado, accion, pendiente] = useActionState(crearAlumno, estadoInicial)
  const [modoPassword, setModoPassword] = useState<'aleatoria' | 'manual'>('aleatoria')
  const [copiado, setCopiado] = useState(false)

  // --- Pantalla de éxito: credenciales visibles UNA sola vez ---
  if (estado.ok && estado.credenciales) {
    const c = estado.credenciales
    const copiar = async () => {
      await navigator.clipboard.writeText(
        `Físicas Élite — Acceso a la plataforma\nUsuario: ${c.username}\nEmail: ${c.email}\nContraseña temporal: ${c.password}\n\nEntra en la web y te pedirá crear tu propia contraseña.`
      )
      setCopiado(true)
    }

    return (
      <>
        <div className="topbar">
          <div>
            <div className="greeting">Alta completada</div>
            <h1 className="page-title">
              Alumno <em>creado.</em>
            </h1>
          </div>
        </div>

        {estado.error && <p className="form-error">{estado.error}</p>}

        <div className="cred-card">
          <div className="cred-aviso">
            ⚠ Copia estas credenciales AHORA y házselas llegar al alumno. Por
            seguridad, la contraseña no se guarda y no se volverá a mostrar.
          </div>
          <div className="cred-row">
            <span className="cred-key">Usuario</span>
            <span className="cred-valor">{c.username}</span>
          </div>
          <div className="cred-row">
            <span className="cred-key">Email (para entrar)</span>
            <span className="cred-valor">{c.email}</span>
          </div>
          <div className="cred-row">
            <span className="cred-key">Contraseña temporal</span>
            <span className="cred-valor">{c.password}</span>
          </div>

          <div className="cred-acciones">
            <button type="button" className="admin-topbar-cta" onClick={copiar}>
              {copiado ? '✓ Copiado' : 'Copiar credenciales'}
            </button>
            <Link href="/admin/alumnos" className="cred-link">
              Ver alumnos →
            </Link>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- <a> a propósito: recarga completa que reinicia el formulario */}
            <a href="/admin/alumnos/nuevo" className="cred-link">
              Crear otro alumno
            </a>
          </div>
        </div>
      </>
    )
  }

  // --- Formulario de alta ---
  return (
    <>
      <div style={{ fontSize: 13, color: 'var(--ink-muted)', marginBottom: 16 }}>
        <Link href="/admin/alumnos" style={{ color: 'var(--ink-muted)', fontWeight: 500 }}>
          ← Volver a alumnos
        </Link>
      </div>

      <div className="topbar">
        <div>
          <div className="greeting">Alta manual</div>
          <h1 className="page-title">
            Nuevo <em>alumno.</em>
          </h1>
        </div>
      </div>

      <div className="admin-section" style={{ padding: 28, maxWidth: 720 }}>
        <form className="upload-form" action={accion}>
          <div className="field-group">
            <div className="field-grid">
              <div>
                <label htmlFor="nombre">Nombre *</label>
                <input type="text" id="nombre" name="nombre" required />
              </div>
              <div>
                <label htmlFor="apellidos">Apellidos *</label>
                <input type="text" id="apellidos" name="apellidos" required />
              </div>
            </div>
          </div>

          <div className="field-group">
            <div className="field-grid">
              <div>
                <label htmlFor="genero">Género</label>
                <select id="genero" name="genero" defaultValue="">
                  <option value="">Sin especificar</option>
                  <option value="masculino">Masculino</option>
                  <option value="femenino">Femenino</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <div>
                <label htmlFor="edad">Edad</label>
                <input type="number" id="edad" name="edad" min={14} max={100} />
              </div>
            </div>
          </div>

          <div className="field-group">
            <div>
              <label htmlFor="especialidad">Oposición</label>
              <select id="especialidad" name="especialidad" defaultValue="">
                <option value="">Sin oposición · solo entrenamiento</option>
                <option value="policia_local">Policía Local</option>
                <option value="policia_nacional">Policía Nacional</option>
                <option value="guardia_civil">Guardia Civil</option>
                <option value="fuerzas_armadas">Fuerzas Armadas</option>
                <option value="aduanas">Aduanas</option>
              </select>
              <span className="field-ayuda">
                Opcional. Déjalo sin oposición si el alumno solo entrena
                categorías sueltas (dominadas, carrera…).
              </span>
            </div>
          </div>

          <div className="field-group">
            <div className="field-grid">
              <div>
                <label htmlFor="username">Nombre de usuario *</label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  placeholder="ej. maria.lopez"
                  required
                />
              </div>
              <div>
                <label htmlFor="telefono">Teléfono</label>
                <input type="text" id="telefono" name="telefono" placeholder="+34 ..." />
              </div>
            </div>
          </div>

          <div className="field-group">
            <label htmlFor="email">Correo electrónico *</label>
            <input type="email" id="email" name="email" required />
          </div>

          {/* Contraseña */}
          <div className="field-group bloque-opcion">
            <label>Contraseña temporal</label>
            <div className="radio-fila">
              <label className="radio-opcion">
                <input
                  type="radio"
                  name="modo_password"
                  value="aleatoria"
                  checked={modoPassword === 'aleatoria'}
                  onChange={() => setModoPassword('aleatoria')}
                />
                Generar clave segura aleatoria
              </label>
              <label className="radio-opcion">
                <input
                  type="radio"
                  name="modo_password"
                  value="manual"
                  checked={modoPassword === 'manual'}
                  onChange={() => setModoPassword('manual')}
                />
                Escribirla manualmente
              </label>
            </div>
            {modoPassword === 'manual' && (
              <input
                type="text"
                name="password_manual"
                placeholder="Mín. 8 caracteres: letras, números y un símbolo"
                autoComplete="off"
                style={{ marginTop: 10 }}
              />
            )}
            <p className="nota-campo">
              El alumno podrá mantenerla o cambiarla en su primer acceso.
            </p>
          </div>

          {/* Clases en el centro: activa las reservas de turno. Es independiente
              del pago: un presencial puede no tener ningún plan online. */}
          <div className="field-group bloque-opcion">
            <label className="radio-opcion" style={{ fontSize: 14 }}>
              <input type="checkbox" name="presencial" />
              Viene a entrenar al centro (clases presenciales)
            </label>
            <p className="nota-campo">
              Le aparecerá el calendario para reservar turno. No necesita plan online; si además
              paga uno, márcalo abajo.
            </p>
          </div>

          {/* Pago en efectivo + selector de acceso por planes */}
          <SelectorAccesoAlta />

          {estado.error && <p className="form-error">{estado.error}</p>}

          <button type="submit" className="upload-publish" disabled={pendiente}>
            {pendiente ? 'Creando alumno…' : 'Crear alumno'}
          </button>
        </form>
      </div>
    </>
  )
}
