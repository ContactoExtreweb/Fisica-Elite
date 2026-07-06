'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  procesarSolicitud,
  rechazarSolicitud,
  type Credenciales,
} from '@/app/admin/solicitudes/actions'

const NIVEL_TXT: Record<string, string> = {
  iniciado: 'Empiezo de cero / base',
  avanzado: 'Ya tengo nivel',
  profesional: 'Vengo casi listo',
}

const NOMBRE_ESP: Record<string, string> = {
  policia_local: 'Policía Local',
  policia_nacional: 'Policía Nacional',
  guardia_civil: 'Guardia Civil',
  fuerzas_armadas: 'Fuerzas Armadas',
}

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
  nivel_solicitado: string | null
  mensaje_usuario: string | null
  created_at: string
}

export default function TarjetaSolicitud({
  solicitud,
  onCreada,
}: {
  solicitud: Solicitud
  onCreada: (c: Credenciales) => void
}) {
  const [username, setUsername] = useState(solicitud.username_solicitado ?? '')
  const [nivel, setNivel] = useState(solicitud.nivel_solicitado ?? 'iniciado')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const aprobar = async () => {
    setCargando(true)
    setError(null)
    const res = await procesarSolicitud(solicitud.id, username, nivel)
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
          <span className="plan-tag oposicion">
            {solicitud.especialidad ? NOMBRE_ESP[solicitud.especialidad] : 'Sin especialidad'}
          </span>
          <span className="solicitud-meses">
            {solicitud.meses_pagados} {solicitud.meses_pagados === 1 ? 'mes' : 'meses'} pagados
          </span>
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
          <div className="field">
            <label>Nivel inicial</label>
            <select
              value={nivel}
              onChange={(e) => setNivel(e.target.value)}
              disabled={cargando}
            >
              <option value="iniciado">Iniciado</option>
              <option value="avanzado">Avanzado</option>
              <option value="profesional">Profesional</option>
            </select>
          </div>
        </div>

        <p className="solicitud-nota-nivel">
          El usuario indicó: <strong>{NIVEL_TXT[solicitud.nivel_solicitado ?? 'iniciado'] ?? 'Empiezo de cero'}</strong>.
          Puedes ajustarlo si lo ves necesario.
        </p>

        {solicitud.mensaje_usuario && (
          <div className="solicitud-mensaje">
            <div className="solicitud-mensaje-label">Lo que nos cuenta</div>
            <p>{solicitud.mensaje_usuario}</p>
          </div>
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
