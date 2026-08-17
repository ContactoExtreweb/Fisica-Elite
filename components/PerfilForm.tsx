'use client'

import { useActionState } from 'react'
import { guardarPerfil, type EstadoPerfil } from '@/app/bienvenida/actions'

const inicial: EstadoPerfil = {}

export default function PerfilForm({
  peso,
  altura,
  facilidades,
}: {
  peso: number | null
  altura: number | null
  facilidades: string | null
}) {
  const [estado, accion, pendiente] = useActionState(guardarPerfil, inicial)

  return (
    <form action={accion} className="ff-form" style={{ maxWidth: 640 }}>
      <section className="ff-sec">
        <div className="ff-sec-side">
          <span className="ff-sec-num">01</span>
          <div>
            <h3>Tus datos</h3>
            <p>Ayudan a tu preparador a ajustar tu plan. Puedes cambiarlos cuando quieras.</p>
          </div>
        </div>
        <div className="ff-sec-body">
          <div className="ff-row">
            <div className="ff-field">
              <label htmlFor="peso_kg">Peso (kg)</label>
              <input
                type="number"
                id="peso_kg"
                name="peso_kg"
                min={20}
                max={300}
                step="0.1"
                inputMode="decimal"
                defaultValue={peso ?? ''}
                placeholder="Ej. 72"
              />
            </div>
            <div className="ff-field">
              <label htmlFor="altura_cm">Altura (cm)</label>
              <input
                type="number"
                id="altura_cm"
                name="altura_cm"
                min={100}
                max={250}
                defaultValue={altura ?? ''}
                placeholder="Ej. 178"
              />
            </div>
          </div>
          <div className="ff-field">
            <label htmlFor="facilidades">¿Con qué cuentas para entrenar en casa?</label>
            <textarea
              id="facilidades"
              name="facilidades"
              rows={3}
              defaultValue={facilidades ?? ''}
              placeholder="Ej. Barra de dominadas, un par de mancuernas, espacio para correr cerca…"
            />
          </div>
        </div>
      </section>

      {estado.error && <p className="form-error">{estado.error}</p>}
      {estado.ok && <p className="form-exito">Datos guardados ✓</p>}

      <div className="ff-acciones">
        <button type="submit" className="ff-guardar" disabled={pendiente}>
          {pendiente ? 'Guardando…' : 'Guardar mis datos'}
        </button>
      </div>
    </form>
  )
}
