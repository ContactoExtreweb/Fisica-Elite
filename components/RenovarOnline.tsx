'use client'

// Elegir meses y pagar, para un alumno que YA tiene cuenta. Dos usos:
//  · modo 'renovar' → alarga una suscripción suya (dentro de su tarjeta)
//  · modo 'nuevo'   → contrata un plan que aún no tiene
//
// El total que se ve es informativo: /api/renovar recalcula el importe
// con el precio del plan en el servidor. Nunca se manda un precio.
import { useId, useState } from 'react'
import { euros } from '@/lib/planes'

type Props =
  | { modo: 'renovar'; suscripcionId: string; nombrePlan: string; precioCentimos: number }
  | { modo: 'nuevo'; planId: string; nombrePlan: string; precioCentimos: number }

export default function RenovarOnline(props: Props) {
  const [meses, setMeses] = useState(1)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Puede haber varios en la misma página (uno por tarjeta): id único.
  const idMeses = useId()

  const total = props.precioCentimos * meses
  const verbo = props.modo === 'renovar' ? 'Renovar' : 'Contratar'

  const pagar = async () => {
    setCargando(true)
    setError(null)
    try {
      const res = await fetch('/api/renovar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          props.modo === 'renovar'
            ? { modo: 'renovar', suscripcion_id: props.suscripcionId, meses }
            : { modo: 'nuevo', plan_id: props.planId, meses }
        ),
      })
      const data = await res.json()
      if (!res.ok || !data.url) {
        setError(data.error ?? 'No se pudo iniciar el pago')
        setCargando(false)
        return
      }
      // A la pasarela de Stripe
      window.location.href = data.url
    } catch {
      setError('Error de conexión. Inténtalo de nuevo.')
      setCargando(false)
    }
  }

  return (
    <div className="renovar-caja">
      <div className="renovar-meses">
        {[1, 3, 6, 12].map((n) => (
          <button
            key={n}
            type="button"
            className={`renovar-chip ${meses === n ? 'activo' : ''}`}
            onClick={() => setMeses(n)}
            disabled={cargando}
          >
            {n} {n === 1 ? 'mes' : 'meses'}
          </button>
        ))}
      </div>

      <div className="renovar-exacto">
        <label htmlFor={idMeses}>O elige los meses exactos:</label>
        <input
          id={idMeses}
          type="number"
          min={1}
          max={24}
          value={meses}
          onChange={(e) => {
            const v = Math.min(24, Math.max(1, Math.floor(Number(e.target.value)) || 1))
            setMeses(v)
          }}
          disabled={cargando}
        />
        <span>{meses === 1 ? 'mes' : 'meses'}</span>
      </div>

      <div className="renovar-total">
        <span>
          {props.nombrePlan} · {meses} {meses === 1 ? 'mes' : 'meses'}
        </span>
        <strong>{euros(total)} €</strong>
      </div>

      {error && (
        <p className="form-error" style={{ marginTop: 12 }}>
          {error}
        </p>
      )}

      <button
        type="button"
        className="cta-primary"
        onClick={pagar}
        disabled={cargando}
        style={{ width: '100%', marginTop: 16 }}
      >
        {cargando ? 'Redirigiendo al pago…' : `${verbo} ${meses} ${meses === 1 ? 'mes' : 'meses'}`}
      </button>
      <p className="renovar-nota">
        🔒 Pago seguro con Stripe.{' '}
        {props.modo === 'renovar'
          ? 'Los meses se suman a tu fecha de fin actual.'
          : 'El acceso se activa en cuanto se confirma el pago.'}
      </p>
    </div>
  )
}
