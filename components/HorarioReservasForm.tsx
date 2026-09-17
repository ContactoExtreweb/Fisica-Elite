'use client'

// Formulario del horario semanal y el aforo de las clases presenciales
// (patrón ff-form del admin). Por día: abierto/cerrado y hasta dos
// franjas (mañana y tarde). Los turnos salen solos: franja ÷ duración.
import { useActionState } from 'react'
import {
  guardarConfiguracionReservas,
  type EstadoConfig,
} from '@/app/admin/reservas/actions'
import { DIAS, horaCorta, type ConfigReservas, type Franja } from '@/lib/reservas'

const estadoInicial: EstadoConfig = {}

export default function HorarioReservasForm({
  config,
  horario,
}: {
  config: ConfigReservas
  horario: Franja[]
}) {
  const [estado, accion, pendiente] = useActionState(guardarConfiguracionReservas, estadoInicial)

  const franjasDe = (d: number) =>
    horario
      .filter((f) => f.dia_semana === d)
      .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
      .slice(0, 2)

  return (
    <form action={accion} className="ff-form">
      {/* 01 · Turnos */}
      <section className="ff-sec">
        <div className="ff-sec-side">
          <span className="ff-sec-num">01</span>
          <div>
            <h3>Turnos</h3>
            <p>Cuánto dura cada clase y cuánta gente entra.</p>
          </div>
        </div>
        <div className="ff-sec-body">
          <div className="ff-row">
            <div className="ff-field">
              <label htmlFor="duracion_min">Duración de la clase</label>
              <select id="duracion_min" name="duracion_min" defaultValue={String(config.duracion_min)}>
                {[30, 45, 60, 90, 120].map((m) => (
                  <option key={m} value={m}>
                    {m} minutos
                  </option>
                ))}
              </select>
            </div>
            <div className="ff-field ff-field-mini">
              <label htmlFor="plazas_por_turno">Plazas por turno</label>
              <input
                type="number"
                id="plazas_por_turno"
                name="plazas_por_turno"
                min={1}
                max={100}
                defaultValue={config.plazas_por_turno}
                required
              />
            </div>
            <div className="ff-field ff-field-mini">
              <label htmlFor="max_por_dia">Clases por alumno y día</label>
              <input
                type="number"
                id="max_por_dia"
                name="max_por_dia"
                min={1}
                max={10}
                defaultValue={config.max_por_dia}
                required
              />
            </div>
          </div>
        </div>
      </section>

      {/* 02 · Plazos */}
      <section className="ff-sec">
        <div className="ff-sec-side">
          <span className="ff-sec-num">02</span>
          <div>
            <h3>Plazos</h3>
            <p>Con cuánta antelación se reserva y hasta cuándo se cancela.</p>
          </div>
        </div>
        <div className="ff-sec-body">
          <div className="ff-row">
            <div className="ff-field ff-field-mini">
              <label htmlFor="antelacion_max_dias">Antelación máxima (días)</label>
              <input
                type="number"
                id="antelacion_max_dias"
                name="antelacion_max_dias"
                min={1}
                max={90}
                defaultValue={config.antelacion_max_dias}
                required
              />
              <span className="ff-hint">El alumno ve los turnos de los próximos N días.</span>
            </div>
            <div className="ff-field ff-field-mini">
              <label htmlFor="cancelacion_min_horas">Cancelar hasta (horas antes)</label>
              <input
                type="number"
                id="cancelacion_min_horas"
                name="cancelacion_min_horas"
                min={0}
                max={168}
                defaultValue={config.cancelacion_min_horas}
                required
              />
              <span className="ff-hint">Pasado ese plazo, solo tú puedes cancelar.</span>
            </div>
          </div>
        </div>
      </section>

      {/* 03 · Horario semanal */}
      <section className="ff-sec">
        <div className="ff-sec-side">
          <span className="ff-sec-num">03</span>
          <div>
            <h3>Horario semanal</h3>
            <p>
              Hasta dos franjas por día (mañana y tarde). Lo que quede entre medias, como la parada
              de mediodía, no se puede reservar.
            </p>
          </div>
        </div>
        <div className="ff-sec-body">
          {DIAS.map((nombre, i) => {
            const d = i + 1
            const [f1, f2] = franjasDe(d)
            return (
              <div key={d} className="hor-dia">
                <div className="hor-dia-nombre">{nombre}</div>
                <label className="ff-switch">
                  <input type="checkbox" name={`abierto_${d}`} defaultChecked={!!f1} />
                  <span className="ff-switch-track">
                    <span className="ff-switch-thumb" />
                  </span>
                  <span className="ff-switch-txt">Abierto</span>
                </label>
                <div className="hor-franjas">
                  <div className="hor-franja">
                    <span>de</span>
                    <input type="time" name={`f1_ini_${d}`} step={900} defaultValue={f1 ? horaCorta(f1.hora_inicio) : ''} />
                    <span>a</span>
                    <input type="time" name={`f1_fin_${d}`} step={900} defaultValue={f1 ? horaCorta(f1.hora_fin) : ''} />
                  </div>
                  <div className="hor-franja">
                    <span>y de</span>
                    <input type="time" name={`f2_ini_${d}`} step={900} defaultValue={f2 ? horaCorta(f2.hora_inicio) : ''} />
                    <span>a</span>
                    <input type="time" name={`f2_fin_${d}`} step={900} defaultValue={f2 ? horaCorta(f2.hora_fin) : ''} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {estado.error && <p className="form-error">{estado.error}</p>}
      {estado.ok && <p className="form-exito">Guardado ✓ Los alumnos ya ven el horario nuevo.</p>}

      <div className="ff-acciones">
        <button type="submit" className="ff-guardar" disabled={pendiente}>
          {pendiente ? 'Guardando…' : 'Guardar horario y aforo'}
        </button>
      </div>
    </form>
  )
}
