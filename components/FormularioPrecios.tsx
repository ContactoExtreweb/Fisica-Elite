'use client'

// Formulario público de compra.
//
// v2 — SE ELIGE UN PLAN:
//  · Los planes y sus precios vienen de la BBDD (los pasa la página), no
//    hay ningún precio escrito en el código. El total que se ve aquí es
//    informativo: el importe de verdad lo recalcula /api/checkout leyendo
//    el precio del plan en el servidor.
//  · Un plan cada vez. Para contratar dos, se pasa dos veces por el pago.
//  · Ya NO se pregunta la oposición: si el plan es de oposición, sale del
//    propio plan. Hay alumnos que solo entrenan categorías sueltas.
//  · Fuera la suscripción recurrente: solo pago por N meses.
import { useState } from 'react'

export type PlanPublico = {
  id: string
  nombre: string
  tipo: 'ejercicio' | 'completo' | 'oposicion'
  descripcion: string | null
  precioCentimos: number
  /** Qué incluye, ya resuelto por el servidor */
  cubre: string
  categorias: string[]
}

function euros(centimos: number): string {
  const n = centimos / 100
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace('.', ',')
}

export default function FormularioPrecios({ planes }: { planes: PlanPublico[] }) {
  const [planId, setPlanId] = useState<string>(planes[0]?.id ?? '')
  const [meses, setMeses] = useState(3)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const plan = planes.find((p) => p.id === planId)
  const total = plan ? plan.precioCentimos * meses : 0

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    if (!plan) {
      setError('Elige un plan antes de continuar.')
      return
    }
    setEnviando(true)

    const fd = new FormData(e.currentTarget)
    const payload = {
      nombre: fd.get('nombre'),
      apellidos: fd.get('apellidos'),
      email: fd.get('email'),
      telefono: fd.get('telefono'),
      genero: fd.get('genero'),
      edad: fd.get('edad'),
      username: fd.get('username'),
      mensaje: fd.get('mensaje'),
      website: fd.get('website'), // honeypot anti-bot (debe ir vacío)
      plan_id: plan.id,
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

  if (planes.length === 0) {
    return (
      <div className="precios-shell">
        <div className="precios-sin-planes">
          <h3>Todavía no hay planes publicados</h3>
          <p>
            Estamos preparando las tarifas. Escríbenos y te contamos las
            opciones sin compromiso.
          </p>
          <a href="/contacto" className="cta-primary">
            Hablar con el preparador
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="precios-shell">
      {/* Elección de plan */}
      <div className="planes-grid">
        {planes.map((p) => {
          const activo = p.id === planId
          return (
            <button
              key={p.id}
              type="button"
              className={`plan-card ${activo ? 'activa' : ''}`}
              onClick={() => setPlanId(p.id)}
              aria-pressed={activo}
            >
              <div className="plan-card-cab">
                <span className="plan-card-nombre">{p.nombre}</span>
                {p.tipo === 'completo' && <span className="plan-card-etq total">Todo</span>}
                {p.tipo === 'oposicion' && <span className="plan-card-etq opo">Oposición</span>}
              </div>

              <div className="plan-card-precio">
                {euros(p.precioCentimos)}€<span>/mes</span>
              </div>

              <p className="plan-card-cubre">{p.cubre}</p>

              {p.categorias.length > 0 && (
                <div className="plan-card-cats">
                  {p.categorias.map((c) => (
                    <span key={c} className="plan-card-cat">
                      {c}
                    </span>
                  ))}
                </div>
              )}

              {p.descripcion && <p className="plan-card-desc">{p.descripcion}</p>}

              <span className="plan-card-check">{activo ? 'Seleccionado' : 'Elegir'}</span>
            </button>
          )
        })}
      </div>

      {/* Meses de acceso */}
      <div className="planes-meses">
        <div>
          <label htmlFor="meses">¿Cuántos meses quieres?</label>
          <p className="planes-meses-nota">
            Pagas de una vez y no hay cobros automáticos. Cuando se acaben,
            renuevas desde tu cuenta.
          </p>
        </div>
        <div className="planes-meses-control">
          {[1, 3, 6, 12].map((n) => (
            <button
              key={n}
              type="button"
              className={`planes-mes-pill ${meses === n ? 'activa' : ''}`}
              onClick={() => setMeses(n)}
            >
              {n} {n === 1 ? 'mes' : 'meses'}
            </button>
          ))}
          <input
            id="meses"
            type="number"
            min={1}
            max={24}
            value={meses}
            onChange={(e) => setMeses(Math.min(24, Math.max(1, Number(e.target.value) || 1)))}
            aria-label="Meses de acceso"
          />
        </div>
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
          <label htmlFor="mensaje">Cuéntanos tu situación y tus objetivos (opcional)</label>
          <textarea
            id="mensaje"
            name="mensaje"
            rows={4}
            placeholder="Ej.: vengo de correr por mi cuenta pero nunca he entrenado dominadas. Me presento a Guardia Civil este año."
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
              {plan?.nombre} · {meses} {meses === 1 ? 'mes' : 'meses'}
            </span>
            <span className="precios-total-num">{euros(total)}€</span>
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
