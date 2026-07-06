'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { actualizarAlumno } from '@/app/admin/alumnos/actions'

type Alumno = {
  id: string
  nombre: string | null
  apellidos: string | null
  telefono: string | null
  edad: number | null
  especialidad: string | null
  nivel: string
}

export default function AlumnoEditor({ alumno }: { alumno: Alumno }) {
  const [form, setForm] = useState({
    nombre: alumno.nombre ?? '',
    apellidos: alumno.apellidos ?? '',
    telefono: alumno.telefono ?? '',
    edad: alumno.edad?.toString() ?? '',
    especialidad: alumno.especialidad ?? '',
    nivel: alumno.nivel ?? 'iniciado',
  })
  const [guardando, setGuardando] = useState(false)
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const router = useRouter()

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const guardar = async () => {
    setGuardando(true)
    setMsg(null)
    const res = await actualizarAlumno(alumno.id, form)
    setGuardando(false)
    if (res.ok) {
      setMsg({ tipo: 'ok', texto: 'Cambios guardados' })
      router.refresh()
    } else {
      setMsg({ tipo: 'error', texto: res.error ?? 'Error al guardar' })
    }
  }

  return (
    <div className="admin-section" style={{ padding: 28 }}>
      <h3 className="ficha-seccion-titulo">Datos del alumno</h3>

      <div className="precios-grid">
        <div className="field">
          <label>Nombre</label>
          <input type="text" value={form.nombre} onChange={set('nombre')} disabled={guardando} />
        </div>
        <div className="field">
          <label>Apellidos</label>
          <input type="text" value={form.apellidos} onChange={set('apellidos')} disabled={guardando} />
        </div>
      </div>

      <div className="precios-grid">
        <div className="field">
          <label>Teléfono</label>
          <input type="text" value={form.telefono} onChange={set('telefono')} disabled={guardando} />
        </div>
        <div className="field">
          <label>Edad</label>
          <input type="number" min={14} max={100} value={form.edad} onChange={set('edad')} disabled={guardando} />
        </div>
      </div>

      <div className="precios-grid">
        <div className="field">
          <label>Oposición</label>
          <select value={form.especialidad} onChange={set('especialidad')} disabled={guardando}>
            <option value="">Sin asignar</option>
            <option value="policia_local">Policía Local</option>
            <option value="policia_nacional">Policía Nacional</option>
            <option value="guardia_civil">Guardia Civil</option>
            <option value="fuerzas_armadas">Fuerzas Armadas</option>
          </select>
        </div>
        <div className="field">
          <label>Nivel</label>
          <select value={form.nivel} onChange={set('nivel')} disabled={guardando}>
            <option value="iniciado">Iniciado</option>
            <option value="avanzado">Avanzado</option>
            <option value="profesional">Profesional</option>
          </select>
        </div>
      </div>

      {msg && (
        <p className={msg.tipo === 'ok' ? 'form-ok' : 'form-error'} style={{ marginTop: 4 }}>
          {msg.texto}
        </p>
      )}

      <button
        type="button"
        className="admin-topbar-cta"
        onClick={guardar}
        disabled={guardando}
        style={{ marginTop: 16 }}
      >
        {guardando ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </div>
  )
}
