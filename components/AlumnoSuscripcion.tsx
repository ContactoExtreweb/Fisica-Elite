'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { renovarSuscripcion } from '@/app/admin/alumnos/actions'

// Suma meses a una fecha ISO y devuelve ISO (para los atajos rápidos)
function sumarMesesISO(fechaISO: string, meses: number): string {
  const [y, m, d] = fechaISO.split('-').map(Number)
  const base = new Date(Date.UTC(y, m - 1 + meses, d))
  return base.toISOString().slice(0, 10)
}

export default function AlumnoSuscripcion({
  alumnoId,
  accesoActivo,
  fechaFin,
}: {
  alumnoId: string
  accesoActivo: boolean
  fechaFin: string | null
}) {
  const hoy = new Date().toISOString().slice(0, 10)
  // Punto de partida para los atajos: su fecha de fin si tiene, si no hoy
  const desde = accesoActivo && fechaFin ? fechaFin : hoy

  const [fecha, setFecha] = useState<string>(fechaFin ?? sumarMesesISO(hoy, 1))
  const [cargando, setCargando] = useState(false)
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const router = useRouter()

  const aplicar = async () => {
    setCargando(true)
    setMsg(null)
    const res = await renovarSuscripcion(alumnoId, fecha)
    setCargando(false)
    if (res.ok) {
      setMsg({ tipo: 'ok', texto: 'Suscripción actualizada' })
      router.refresh()
    } else {
      setMsg({ tipo: 'error', texto: res.error ?? 'Error' })
    }
  }

  const atajo = (meses: number) => setFecha(sumarMesesISO(desde, meses))

  return (
    <div className="admin-section" style={{ padding: 28 }}>
      <h3 className="ficha-seccion-titulo">Suscripción (pago en efectivo)</h3>

      <p className="ficha-accion-desc" style={{ maxWidth: '100%', marginBottom: 16 }}>
        {accesoActivo
          ? 'Ajusta hasta qué día tiene acceso. Los atajos suman desde su fecha actual.'
          : 'Sin acceso activo. Elige hasta qué día le das acceso.'}
      </p>

      {/* Atajos rápidos: rellenan la fecha, no envían */}
      <div className="renovar-meses" style={{ marginBottom: 16 }}>
        {[1, 3, 6, 12].map((n) => (
          <button
            key={n}
            type="button"
            className="renovar-chip"
            onClick={() => atajo(n)}
            disabled={cargando}
          >
            +{n} {n === 1 ? 'mes' : 'meses'}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div className="field" style={{ maxWidth: 220 }}>
          <label>Acceso hasta el día</label>
          <input
            type="date"
            value={fecha}
            min={hoy}
            onChange={(e) => setFecha(e.target.value)}
            disabled={cargando}
          />
        </div>
        <button type="button" className="admin-topbar-cta" onClick={aplicar} disabled={cargando}>
          {cargando ? 'Aplicando…' : accesoActivo ? 'Actualizar fecha' : 'Activar acceso'}
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
