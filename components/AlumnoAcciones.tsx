'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  regenerarPassword,
  darDeBaja,
  eliminarAlumno,
} from '@/app/admin/alumnos/actions'

export default function AlumnoAcciones({
  alumnoId,
  nombre,
  tieneAccesoActivo,
}: {
  alumnoId: string
  nombre: string
  tieneAccesoActivo: boolean
}) {
  const [password, setPassword] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)
  const [cargando, setCargando] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const regenerar = async () => {
    setCargando('pwd')
    setError(null)
    setPassword(null)
    const res = await regenerarPassword(alumnoId)
    setCargando(null)
    if (res.ok) setPassword(res.password)
    else setError(res.error)
  }

  const copiar = async () => {
    if (!password) return
    try {
      await navigator.clipboard.writeText(password)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {}
  }

  const baja = async () => {
    if (!confirm(`¿Dar de baja a ${nombre}? Perderá el acceso al contenido, pero la cuenta se conserva.`))
      return
    setCargando('baja')
    setError(null)
    const res = await darDeBaja(alumnoId)
    setCargando(null)
    if (res.ok) router.refresh()
    else setError(res.error ?? 'No se pudo dar de baja')
  }

  const eliminar = async () => {
    if (
      !confirm(
        `¿ELIMINAR por completo a ${nombre}? Se borrarán su cuenta, progreso, suscripciones y chat. Esto NO se puede deshacer.`
      )
    )
      return
    setCargando('del')
    setError(null)
    // En éxito redirige (no vuelve). Si vuelve con {ok:false}, hubo error.
    const res = await eliminarAlumno(alumnoId)
    setCargando(null)
    if (res && res.ok === false) setError(res.error)
  }

  return (
    <div className="admin-section" style={{ padding: 28 }}>
      <h3 className="ficha-seccion-titulo">Gestión de la cuenta</h3>

      {/* Regenerar contraseña */}
      <div className="ficha-accion">
        <div>
          <div className="ficha-accion-titulo">Contraseña de acceso</div>
          <div className="ficha-accion-desc">
            Genera una nueva contraseña para dársela al alumno. La actual dejará
            de funcionar.
          </div>
        </div>
        <button type="button" className="btn-ghost-chat" onClick={regenerar} disabled={cargando === 'pwd'}>
          {cargando === 'pwd' ? 'Generando…' : 'Regenerar'}
        </button>
      </div>

      {password && (
        <div className="ficha-password-nueva">
          <span className="cred-key">Nueva contraseña</span>
          <span className="cred-valor">{password}</span>
          <button type="button" className="faq-btn-mini" onClick={copiar}>
            {copiado ? '✓' : 'Copiar'}
          </button>
        </div>
      )}

      {/* Dar de baja */}
      <div className="ficha-accion">
        <div>
          <div className="ficha-accion-titulo">Dar de baja</div>
          <div className="ficha-accion-desc">
            Cancela su suscripción y le corta el acceso. La cuenta se conserva;
            puedes reactivarla dándole una suscripción nueva.
          </div>
        </div>
        <button
          type="button"
          className="btn-ghost-chat"
          onClick={baja}
          disabled={cargando === 'baja' || !tieneAccesoActivo}
        >
          {!tieneAccesoActivo ? 'Sin acceso activo' : cargando === 'baja' ? 'Procesando…' : 'Dar de baja'}
        </button>
      </div>

      {/* Eliminar */}
      <div className="ficha-accion peligro">
        <div>
          <div className="ficha-accion-titulo">Eliminar perfil</div>
          <div className="ficha-accion-desc">
            Borra la cuenta y todos sus datos (progreso, suscripciones, chat).
            Irreversible.
          </div>
        </div>
        <button type="button" className="btn-borrar-chat" onClick={eliminar} disabled={cargando === 'del'}>
          {cargando === 'del' ? 'Eliminando…' : 'Eliminar'}
        </button>
      </div>

      {error && <p className="form-error" style={{ marginTop: 8 }}>{error}</p>}
    </div>
  )
}
