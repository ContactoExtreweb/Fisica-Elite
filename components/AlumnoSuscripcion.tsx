'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { renovarSuscripcion } from '@/app/admin/alumnos/actions'

export default function AlumnoSuscripcion({
  alumnoId,
  accesoActivo,
  fechaFin,
}: {
  alumnoId: string
  accesoActivo: boolean
  fechaFin: string | null
}) {
  const [meses, setMeses] = useState(1)
  const [cargando, setCargando] = useState(false)
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const router = useRouter()

  const renovar = async () => {
    setCargando(true)
    setMsg(null)
    const res = await renovarSuscripcion(alumnoId, meses)
    setCargando(false)
    if (res.ok) {
      setMsg({ tipo: 'ok', texto: 'Suscripción actualizada' })
      router.refresh()
    } else {
      setMsg({ tipo: 'error', texto: res.error ?? 'Error al renovar' })
    }
  }

  return (
    <div className="admin-section" style={{ padding: 28 }}>
      <h3 className="ficha-seccion-titulo">Suscripción (pago en efectivo)</h3>

      <p className="ficha-accion-desc" style={{ maxWidth: '100%', marginBottom: 16 }}>
        {accesoActivo
          ? 'Añade meses y se sumarán a su fecha de fin actual.'
          : 'Sin acceso activo. Activa una suscripción para darle acceso al contenido.'}
      </p>

      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div className="field" style={{ maxWidth: 160 }}>
          <label>Meses a añadir</label>
          <select
            value={meses}
            onChange={(e) => setMeses(Number(e.target.value))}
            disabled={cargando}
          >
            <option value={1}>1 mes</option>
            <option value={3}>3 meses</option>
            <option value={6}>6 meses</option>
            <option value={12}>12 meses</option>
          </select>
        </div>
        <button
          type="button"
          className="admin-topbar-cta"
          onClick={renovar}
          disabled={cargando}
        >
          {cargando ? 'Aplicando…' : accesoActivo ? 'Añadir meses' : 'Activar acceso'}
        </button>
      </div>

      {msg && (
        <p className={msg.tipo === 'ok' ? 'form-ok' : 'form-error'} style={{ marginTop: 12 }}>
          {msg.texto}
        </p>
      )}
    </div>
  )
}
