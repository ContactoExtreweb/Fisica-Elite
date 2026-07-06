'use client'

import { useState } from 'react'

type Modalidad = 'pago_unico' | 'suscripcion'

export default function FormularioPrecios() {
  const [modalidad, setModalidad] = useState<Modalidad>('pago_unico')
  const [meses, setMeses] = useState(3)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const precioMes = 39 // debe coincidir con PRECIO_MES_CENTIMOS del servidor
  const total = modalidad === 'pago_unico' ? precioMes * meses : precioMes

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setEnviando(true)

    const fd = new FormData(e.currentTarget)
    const payload = {
      nombre: fd.get('nombre'),
      apellidos: fd.get('apellidos'),
      email: fd.get('email'),
      telefono: fd.get('telefono'),
      genero: fd.get('genero'),
      edad: fd.get('edad'),
      especialidad: fd.get('especialidad'),
      nivel: fd.get('nivel'),
      username: fd.get('username'),
      mensaje: fd.get('mensaje'),
      website: fd.get('website'), // honeypot anti-bot (debe ir vacío)
      modalidad,
      meses,
    }

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok || !data.url) {
        setError(data.error ?? 'No se pudo iniciar el pago')
        setEnviando(false)
        return
      }
      // Redirige a la página de pago segura de Stripe
      window.location.href = data.url
    } catch {
      setError('Error de conexión. Inténtalo de nuevo.')
      setEnviando(false)
    }
  }

  return (
    <div className="precios-shell">
      {/* Selector de modalidad */}
      <div className="precios-modalidades">
        <button
          type="button"
          className={`precios-card ${modalidad === 'pago_unico' ? 'activa' : ''}`}
          onClick={() => setModalidad('pago_unico')}
        >
          <div className="precios-card-tag">Pago por meses</div>
          <div className="precios-card-precio">
            {precioMes}€<span>/mes</span>
          </div>
          <p className="precios-card-desc">
            Pagas los meses que quieras de una vez. Cuando terminan, renuevas.
            Sin cobros automáticos.
          </p>
          {modalidad === 'pago_unico' && (
            <div className="precios-meses">
              <label htmlFor="meses">Meses de acceso</label>
              <input
                id="meses"
                type="number"
                min={1}
                max={24}
                value={meses}
                onChange={(e) => setMeses(Math.min(24, Math.max(1, Number(e.target.value) || 1)))}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}
        </button>

        <button
          type="button"
          className={`precios-card ${modalidad === 'suscripcion' ? 'activa' : ''}`}
          onClick={() => setModalidad('suscripcion')}
        >
          <div className="precios-card-tag">Suscripción mensual</div>
          <div className="precios-card-precio">
            {precioMes}€<span>/mes</span>
          </div>
          <p className="precios-card-desc">
            Se renueva sola cada mes hasta que canceles. Comodidad total, sin
            acordarte de renovar.
          </p>
        </button>
      </div>

      {/* Datos del solicitante */}
      <form className="precios-form" onSubmit={onSubmit}>
        <h3>Tus datos</h3>
        <p className="precios-form-nota">
          Tras el pago, tu preparador validará el alta y te enviará las
          credenciales de acceso. El pago no crea la cuenta automáticamente.
        </p>

        <div className="precios-grid">
          <div className="field">
            <label htmlFor="nombre">Nombre *</label>
            <input type="text" id="nombre" name="nombre" required />
          </div>
          <div className="field">
            <label htmlFor="apellidos">Apellidos *</label>
            <input type="text" id="apellidos" name="apellidos" required />
          </div>
        </div>

        <div className="precios-grid">
          <div className="field">
            <label htmlFor="email">Correo electrónico *</label>
            <input type="email" id="email" name="email" required />
          </div>
          <div className="field">
            <label htmlFor="telefono">Teléfono</label>
            <input type="text" id="telefono" name="telefono" placeholder="+34 ..." />
          </div>
        </div>

        <div className="precios-grid">
          <div className="field">
            <label htmlFor="especialidad">Oposición *</label>
            <select id="especialidad" name="especialidad" required defaultValue="">
              <option value="" disabled>Seleccionar…</option>
              <option value="policia_local">Policía Local</option>
              <option value="policia_nacional">Policía Nacional</option>
              <option value="guardia_civil">Guardia Civil</option>
              <option value="fuerzas_armadas">Fuerzas Armadas</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="nivel">Tu nivel actual *</label>
            <select id="nivel" name="nivel" required defaultValue="iniciado">
              <option value="iniciado">Empiezo de cero / base</option>
              <option value="avanzado">Ya tengo nivel (avanzado)</option>
              <option value="profesional">Vengo casi listo (profesional)</option>
            </select>
          </div>
        </div>

        <div className="precios-grid">
          <div className="field">
            <label htmlFor="username">Usuario deseado</label>
            <input type="text" id="username" name="username" placeholder="ej. maria.lopez" />
          </div>
          <div className="field"></div>
        </div>

        <div className="precios-grid">
          <div className="field">
            <label htmlFor="genero">Género</label>
            <select id="genero" name="genero" defaultValue="">
              <option value="">Sin especificar</option>
              <option value="masculino">Masculino</option>
              <option value="femenino">Femenino</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="edad">Edad</label>
            <input type="number" id="edad" name="edad" min={14} max={100} />
          </div>
        </div>

        <div className="field" style={{ marginTop: 4 }}>
          <label htmlFor="mensaje">Cuéntanos tu nivel y tus dificultades (opcional)</label>
          <textarea
            id="mensaje"
            name="mensaje"
            rows={4}
            placeholder="Ej.: vengo de correr por mi cuenta pero nunca he entrenado dominadas ni natación. Mi objetivo es Guardia Civil este año."
          />
          <span className="field-ayuda">
            Así tu preparador te conoce mejor desde el primer día.
          </span>
        </div>

        {/* Honeypot: campo oculto para bots. Un humano no lo ve ni lo rellena. */}
        <div className="hp-campo" aria-hidden="true">
          <label htmlFor="website">No rellenar</label>
          <input type="text" id="website" name="website" tabIndex={-1} autoComplete="off" />
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="precios-total">
          <div>
            <span className="precios-total-label">
              {modalidad === 'pago_unico'
                ? `${meses} ${meses === 1 ? 'mes' : 'meses'} de acceso`
                : 'Suscripción mensual'}
            </span>
            <span className="precios-total-num">
              {total}€
              {modalidad === 'suscripcion' && <small>/mes</small>}
            </span>
          </div>
          <button type="submit" className="cta-primary precios-cta" disabled={enviando}>
            {enviando ? 'Redirigiendo…' : 'Ir al pago seguro'}
          </button>
        </div>

        <p className="precios-seguro">
          🔒 Pago procesado por Stripe. No guardamos datos de tu tarjeta.
        </p>
      </form>
    </div>
  )
}
