'use client'

import { useActionState } from 'react'
import { guardarEjercicio, type EstadoEjercicio } from '@/app/admin/ejercicios/actions'

type Ejercicio = {
  id: string
  titulo: string
  especialidad: string
  nivel: string
  descripcion: string | null
  tecnica: string | null
  variantes: string | null
  errores_comunes: string | null
  mejoras: string | null
  orden: number
  publicado: boolean
}

const estadoInicial: EstadoEjercicio = {}

export default function EjercicioForm({ ejercicio }: { ejercicio?: Ejercicio }) {
  const [estado, accion, pendiente] = useActionState(guardarEjercicio, estadoInicial)

  return (
    <form className="upload-form" action={accion}>
      {ejercicio && <input type="hidden" name="id" value={ejercicio.id} />}

      <div className="field-group">
        <label htmlFor="titulo">Nombre del ejercicio *</label>
        <input
          type="text"
          id="titulo"
          name="titulo"
          placeholder="Ej. Carrera 1000 m — ritmo de prueba"
          defaultValue={ejercicio?.titulo ?? ''}
          required
        />
      </div>

      <div className="field-group">
        <div className="field-grid">
          <div>
            <label htmlFor="especialidad">Especialidad *</label>
            <select
              id="especialidad"
              name="especialidad"
              required
              defaultValue={ejercicio?.especialidad ?? ''}
            >
              <option value="" disabled>Seleccionar…</option>
              <option value="policia_local">Policía Local</option>
              <option value="policia_nacional">Policía Nacional</option>
              <option value="guardia_civil">Guardia Civil</option>
              <option value="fuerzas_armadas">Fuerzas Armadas</option>
            </select>
          </div>
          <div>
            <label htmlFor="nivel">Nivel mínimo *</label>
            <select id="nivel" name="nivel" defaultValue={ejercicio?.nivel ?? 'iniciado'}>
              <option value="iniciado">Iniciado</option>
              <option value="avanzado">Avanzado</option>
              <option value="profesional">Profesional</option>
            </select>
          </div>
        </div>
      </div>

      <div className="field-group">
        <label htmlFor="descripcion">Descripción</label>
        <textarea
          id="descripcion"
          name="descripcion"
          placeholder="Qué trabaja este ejercicio y para qué prueba prepara…"
          defaultValue={ejercicio?.descripcion ?? ''}
        />
      </div>

      <div className="field-group">
        <label htmlFor="tecnica">Técnica</label>
        <textarea
          id="tecnica"
          name="tecnica"
          placeholder="Pasos para realizarlo correctamente…"
          defaultValue={ejercicio?.tecnica ?? ''}
        />
      </div>

      <div className="field-group">
        <div className="field-grid">
          <div>
            <label htmlFor="variantes">Variantes</label>
            <textarea
              id="variantes"
              name="variantes"
              placeholder="Progresiones y regresiones…"
              defaultValue={ejercicio?.variantes ?? ''}
            />
          </div>
          <div>
            <label htmlFor="errores_comunes">Errores comunes</label>
            <textarea
              id="errores_comunes"
              name="errores_comunes"
              placeholder="Qué evitar al hacerlo…"
              defaultValue={ejercicio?.errores_comunes ?? ''}
            />
          </div>
        </div>
      </div>

      <div className="field-group">
        <label htmlFor="mejoras">Mejoras</label>
        <textarea
          id="mejoras"
          name="mejoras"
          placeholder="Cómo progresar: cargas, tiempos, frecuencia…"
          defaultValue={ejercicio?.mejoras ?? ''}
        />
      </div>

      <div className="field-group">
        <div className="field-grid">
          <div>
            <label htmlFor="orden">Orden (posición en la lista)</label>
            <input
              type="number"
              id="orden"
              name="orden"
              defaultValue={ejercicio?.orden ?? 0}
            />
          </div>
          <div className="bloque-opcion" style={{ display: 'flex', alignItems: 'center' }}>
            <label className="radio-opcion" style={{ fontSize: 14 }}>
              <input
                type="checkbox"
                name="publicado"
                defaultChecked={ejercicio?.publicado ?? true}
              />
              Publicado (visible para los alumnos)
            </label>
          </div>
        </div>
      </div>

      {estado.error && <p className="form-error">{estado.error}</p>}

      <button type="submit" className="upload-publish" disabled={pendiente}>
        {pendiente
          ? 'Guardando…'
          : ejercicio
            ? 'Guardar cambios'
            : 'Crear ejercicio'}
      </button>
    </form>
  )
}
