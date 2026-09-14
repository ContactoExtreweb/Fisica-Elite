'use client'

// "Contratar otro plan", dentro de /suscripcion: el alumno elige uno de los
// planes que aún no tiene y paga. Acceso al instante, sin aprobación.
//
// Reutiliza las tarjetas de /precios (.plan-card) para que un plan se vea
// igual en la web pública y dentro de la cuenta.
import { useState } from 'react'
import RenovarOnline from '@/components/RenovarOnline'
import { euros, type PlanPublico } from '@/lib/planes'

export default function ContratarPlan({ planes }: { planes: PlanPublico[] }) {
  const [planId, setPlanId] = useState<string | null>(null)
  const plan = planes.find((p) => p.id === planId)

  if (planes.length === 0) {
    return (
      <p className="susc-plan-vacio">Ya tienes todos los planes que hay disponibles.</p>
    )
  }

  return (
    <div className="contratar">
      <div className="planes-grid contratar-grid">
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

      {plan ? (
        <div className="contratar-pago">
          {/* key: al cambiar de plan, el selector de meses vuelve a empezar */}
          <RenovarOnline
            key={plan.id}
            modo="nuevo"
            planId={plan.id}
            nombrePlan={plan.nombre}
            precioCentimos={plan.precioCentimos}
          />
        </div>
      ) : (
        <p className="contratar-ayuda">Elige un plan para ver el total y pagar.</p>
      )}
    </div>
  )
}
