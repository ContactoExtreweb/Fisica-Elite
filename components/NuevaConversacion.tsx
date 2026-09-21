'use client'

// Botón "Nueva conversación" en la bandeja del admin: hasta ahora solo
// se podía hablar con un alumno que hubiera escrito primero. Con esto el
// preparador busca al alumno y abre (o recupera) su chat.
import { useEffect, useMemo, useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { abrirConversacionConAlumno } from '@/app/chat/actions'

type Alumno = { id: string; nombre: string | null; apellidos: string | null; username: string | null }

function iniciales(nombre?: string | null, apellidos?: string | null) {
  return ((nombre ?? '').charAt(0) + (apellidos ?? '').charAt(0)).toUpperCase() || '??'
}

export default function NuevaConversacion() {
  const [abierto, setAbierto] = useState(false)
  // Empieza en 'cargando': se apaga sola en cuanto llega la primera
  // respuesta (nunca antes, así el eslint de efectos no se queja de un
  // setState síncrono al abrir).
  const [cargando, setCargando] = useState(true)
  const [alumnos, setAlumnos] = useState<Alumno[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [pendiente, empezar] = useTransition()
  const [enCurso, setEnCurso] = useState<string | null>(null)

  useEffect(() => {
    if (!abierto || alumnos.length > 0) return
    let cancelado = false
    const sb = createClient()
    sb.from('profiles')
      .select('id, nombre, apellidos, username')
      .eq('rol', 'alumno')
      .order('nombre')
      .then(({ data }) => {
        if (cancelado) return
        setAlumnos((data ?? []) as Alumno[])
        setCargando(false)
      })
    return () => {
      cancelado = true
    }
  }, [abierto, alumnos.length])

  // Cerrar con Esc
  useEffect(() => {
    if (!abierto) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setAbierto(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [abierto])

  const filtrados = useMemo(() => {
    const t = busqueda.trim().toLowerCase()
    if (!t) return alumnos
    return alumnos.filter((a) =>
      [a.nombre, a.apellidos, a.username].filter(Boolean).join(' ').toLowerCase().includes(t)
    )
  }, [alumnos, busqueda])

  const elegir = (id: string) => {
    setEnCurso(id)
    empezar(async () => {
      await abrirConversacionConAlumno(id) // redirige a /admin/chat/[id]
    })
  }

  return (
    <>
      <button type="button" className="admin-topbar-cta" onClick={() => setAbierto(true)}>
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M12 5v14M5 12h14" strokeLinecap="round" />
        </svg>
        Nueva conversación
      </button>

      {abierto && (
        <>
          <div className="nc-fondo" onClick={() => setAbierto(false)} role="presentation" />
          <div className="nc-modal" role="dialog" aria-modal="true" aria-label="Nueva conversación">
            <div className="nc-cab">
              <span>Escribir a un alumno</span>
              <button type="button" onClick={() => setAbierto(false)} aria-label="Cerrar">
                ✕
              </button>
            </div>
            <input
              type="text"
              className="nc-buscador"
              placeholder="Buscar por nombre o usuario…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              autoFocus
            />
            <div className="nc-lista">
              {cargando ? (
                <p className="nc-vacio">Cargando alumnos…</p>
              ) : filtrados.length === 0 ? (
                <p className="nc-vacio">Ningún alumno coincide.</p>
              ) : (
                filtrados.map((a) => {
                  const nombre = [a.nombre, a.apellidos].filter(Boolean).join(' ') || a.username || 'Alumno'
                  return (
                    <button
                      key={a.id}
                      type="button"
                      className="nc-item"
                      onClick={() => elegir(a.id)}
                      disabled={pendiente}
                    >
                      <span className="nc-avatar">{iniciales(a.nombre, a.apellidos)}</span>
                      <span className="nc-nombre">{nombre}</span>
                      {pendiente && enCurso === a.id && <span className="nc-cargando">Abriendo…</span>}
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}
