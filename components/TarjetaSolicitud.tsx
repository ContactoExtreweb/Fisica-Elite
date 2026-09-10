'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  procesarSolicitud,
  rechazarSolicitud,
  type Credenciales,
} from '@/app/admin/solicitudes/actions'

const NOMBRE_ESP: Record<string, string> = {
  policia_local: 'Policía Local',
  policia_nacional: 'Policía Nacional',
  guardia_civil: 'Guardia Civil',
  fuerzas_armadas: 'Fuerzas Armadas',
  aduanas: 'Aduanas',
}

type PlanRel = { nombre: string; tipo: string } | { nombre: string; tipo: string }[] | null

export type Solicitud = {
  id: string
  nombre: string | null
  apellidos: string | null
  email: string | null
  telefono: string | null
  especialidad: string | null
  username_solicitado: string | null
  meses_pagados: number
  modalidad: string | null
  referencia: string | null
  mensaje_usuario: string | null
  created_at: string
  importe_centimos: number | null
  planes: PlanRel
}

// PostgREST devuelve las relaciones a-uno como objeto o como array.
function rel<T>(x: T | T[] | null | undefined): T | undefined {
  if (!x) return undefined
  return Array.isArray(x) ? x[0] : x
}

function euros(centimos: number | null): string | null {
  if (centimos === null || centimos === undefined) return null
  return (centimos / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })
}

export default function TarjetaSolicitud({
  solicitud,
  onCreada,
}: {
  solicitud: Solicitud
  onCreada: (c: Credenciales) => void
}) {
  const [username, setUsername] = useState(solicitud.username_solicitado ?? '')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const aprobar = async () => {
    setCargando(true)
    setError(null)
    const res = await procesarSolicitud(solicitud.id, username)
    // No tocamos estado local si fue bien: el padre abre el modal y luego
    // refresca la lista (esta tarjeta desaparecerá).
    if (res.ok) {
      onCreada(res.credenciales)
    } else {
      setCargando(false)
      setError(res.error)
    }
  }

  const rechazar = async () => {
    if (!confirm('¿Rechazar esta solicitud? No se creará ningún alumno.')) return
    setCargando(true)
    await rechazarSolicitud(solicitud.id)
    router.refresh()
  }

  const nombre = [solicitud.nombre, solicitud.apellidos].filter(Boolean).join(' ') || 'Sin nombre'
  const plan = rel(solicitud.planes)
  const importe = euros(solicitud.importe_centimos)

  return (
    <div className="solicitud-card">
      <div className="solicitud-cabecera">
        <div>
          <div className="solicitud-nombre">{nombre}</div>
          <div className="solicitud-meta">
            {solicitud.email} · {solicitud.telefono || 'sin teléfono'}
          </div>
          {solicitud.referencia && (
            <div className="solicitud-ref">Nº {solicitud.referencia}</div>
          )}
        </div>
        <div className="solicitud-pago">
          {/* Qué ha comprado. Las solicitudes anteriores a la 017 no
              tienen plan: se avisa en vez de dejar el hueco en blanco. */}
          <span className="plan-tag oposicion">
            {plan ? plan.nombre : 'Sin plan (solicitud antigua)'}
          </span>
          <span className="solicitud-meses">
            {solicitud.meses_pagados} {solicitud.meses_pagados === 1 ? 'mes' : 'meses'}
            {importe ? ` · ${importe}` : ''}
          </span>
          {solicitud.especialidad && (
            <span className="solicitud-meses">
              {NOMBRE_ESP[solicitud.especialidad] ?? solicitud.especialidad}
            </span>
          )}
        </div>
      </div>

      <div className="solicitud-form">
        <div className="solicitud-campos">
          <div className="field">
            <label>Usuario</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ej. maria.lopez"
              disabled={cargando}
            />
          </div>
        </div>

        {solicitud.mensaje_usuario && (
          <div className="solicitud-mensaje">
            <div className="solicitud-mensaje-label">Lo que nos cuenta</div>
            <p>{solicitud.mensaje_usuario}</p>
          </div>
        )}

        {!plan && (
          <p className="form-error">
            Esta solicitud no tiene plan asociado. Si la apruebas, el alumno
            entrará con <strong>acceso a todo el contenido</strong>. Revísalo y
            ajústale la suscripción desde su ficha después de crearlo.
          </p>
        )}

        {error && <p className="form-error">{error}</p>}

        <div className="solicitud-acciones">
          <button
            type="button"
            className="admin-topbar-cta"
            onClick={aprobar}
            disabled={cargando}
          >
            {cargando ? 'Creando…' : 'Aprobar y crear alumno'}
          </button>
          <button
            type="button"
            className="btn-borrar-chat"
            onClick={rechazar}
            disabled={cargando}
          >
            Rechazar
          </button>
        </div>
      </div>
    </div>
  )
}
