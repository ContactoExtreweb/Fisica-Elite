'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'

const NOMBRE_ESPECIALIDAD: Record<string, string> = {
  policia_local: 'Policía Local',
  policia_nacional: 'Policía Nacional',
  guardia_civil: 'Guardia Civil',
  fuerzas_armadas: 'Fuerzas Armadas',
}

function iniciales(nombre?: string | null, apellidos?: string | null) {
  const n = (nombre ?? '').trim().charAt(0)
  const a = (apellidos ?? '').trim().charAt(0)
  return (n + a).toUpperCase() || '??'
}

function formatoFecha(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export type AlumnoFila = {
  id: string
  nombre: string | null
  apellidos: string | null
  email: string | null
  username: string | null
  telefono: string | null
  especialidad: string | null
  nivel: string
  fechaFinVigente: string | null // null = sin acceso
}

export default function TablaAlumnos({ alumnos }: { alumnos: AlumnoFila[] }) {
  const [busqueda, setBusqueda] = useState('')
  const [especialidad, setEspecialidad] = useState('todas')
  const [estado, setEstado] = useState('todos') // todos | activo | sin

  const filtrados = useMemo(() => {
    const t = busqueda.trim().toLowerCase()
    return alumnos.filter((a) => {
      // Texto: nombre, apellidos, email, usuario o teléfono
      if (t) {
        const campos = [a.nombre, a.apellidos, a.email, a.username, a.telefono]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!campos.includes(t)) return false
      }
      // Especialidad
      if (especialidad !== 'todas' && a.especialidad !== especialidad) return false
      // Estado de acceso
      if (estado === 'activo' && !a.fechaFinVigente) return false
      if (estado === 'sin' && a.fechaFinVigente) return false
      return true
    })
  }, [alumnos, busqueda, especialidad, estado])

  const hayFiltros = busqueda.trim() || especialidad !== 'todas' || estado !== 'todos'

  return (
    <>
      {/* Barra de filtros */}
      <div className="alumnos-filtros">
        <div className="alumnos-buscador">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, email, usuario o teléfono…"
          />
          {busqueda && (
            <button type="button" className="alumnos-buscador-limpiar" onClick={() => setBusqueda('')} aria-label="Limpiar">
              ✕
            </button>
          )}
        </div>

        <select value={especialidad} onChange={(e) => setEspecialidad(e.target.value)} className="alumnos-select">
          <option value="todas">Todas las oposiciones</option>
          <option value="policia_local">Policía Local</option>
          <option value="policia_nacional">Policía Nacional</option>
          <option value="guardia_civil">Guardia Civil</option>
          <option value="fuerzas_armadas">Fuerzas Armadas</option>
        </select>

        <select value={estado} onChange={(e) => setEstado(e.target.value)} className="alumnos-select">
          <option value="todos">Cualquier estado</option>
          <option value="activo">Con acceso</option>
          <option value="sin">Sin acceso</option>
        </select>
      </div>

      <div className="alumnos-contador">
        {filtrados.length} {filtrados.length === 1 ? 'alumno' : 'alumnos'}
        {hayFiltros ? ' (filtrado)' : ''}
      </div>

      <div className="admin-section">
        {filtrados.length === 0 ? (
          <div className="admin-tabla-vacia">
            {hayFiltros
              ? 'Ningún alumno coincide con los filtros.'
              : 'Aún no hay alumnos. Crea el primero con «Añadir alumno».'}
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Alumno</th>
                <th>Especialidad</th>
                <th>Nivel</th>
                <th>Suscripción</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((a) => (
                <tr key={a.id}>
                  <td>
                    <div className="alumno-cell">
                      <div className="avatar-small">{iniciales(a.nombre, a.apellidos)}</div>
                      <div>
                        <Link href={`/admin/alumnos/${a.id}`} className="name name-link">
                          {[a.nombre, a.apellidos].filter(Boolean).join(' ') || a.username || 'Sin nombre'}
                        </Link>
                        <div className="sub">{a.email ?? '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    {a.especialidad ? (
                      <span className="plan-tag oposicion">
                        {NOMBRE_ESPECIALIDAD[a.especialidad] ?? a.especialidad}
                      </span>
                    ) : (
                      <span className="plan-tag">Sin asignar</span>
                    )}
                  </td>
                  <td style={{ textTransform: 'capitalize' }}>{a.nivel}</td>
                  <td>
                    {a.fechaFinVigente ? (
                      <span className="status-pill">
                        <span className="dot"></span> Al día · hasta {formatoFecha(a.fechaFinVigente)}
                      </span>
                    ) : (
                      <span className="status-pill bad">
                        <span className="dot"></span> Sin acceso
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
