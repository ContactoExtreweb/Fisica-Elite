'use client'

import { useState } from 'react'

export default function RenovarOnline() {
  const [meses, setMeses] = useState(1)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const renovar = async () => {
    setCargando(true)
    setError(null)
    try {
      const res = await fetch('/api/renovar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meses }),
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
        <label htmlFor="meses-exactos">O elige los meses exactos:</label>
        <input
          id="meses-exactos"
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

      {error && <p className="form-error" style={{ marginTop: 12 }}>{error}</p>}

      <button
        type="button"
        className="cta-primary"
        onClick={renovar}
        disabled={cargando}
        style={{ width: '100%', marginTop: 16 }}
      >
        {cargando ? 'Redirigiendo al pago…' : `Renovar ${meses} ${meses === 1 ? 'mes' : 'meses'}`}
      </button>
      <p className="renovar-nota">🔒 Pago seguro con Stripe. Tu acceso se amplía al instante.</p>
    </div>
  )
}
