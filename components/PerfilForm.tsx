'use client'

// Formulario de "Tus datos" y "Avisos" en /perfil, con la misma pinta de
// bloques numerados que el cuestionario inicial (components/
// CuestionarioInicial.tsx): así se siente parte de la misma pregunta,
// solo que editable en cualquier momento, en vez del patrón de
// formulario denso del admin (ff-form), que aquí quedaba fuera de lugar.
import { useActionState } from 'react'
import { guardarPerfil, type EstadoPerfil } from '@/app/bienvenida/actions'
import { DIAS_INACTIVIDAD } from '@/lib/actividad'

const inicial: EstadoPerfil = {}

export default function PerfilForm({
  peso,
  altura,
  facilidades,
  recordatorios,
}: {
  peso: number | null
  altura: number | null
  facilidades: string | null
  /** Recibir el correo si lleva días sin entrar */
  recordatorios: boolean
}) {
  const [estado, accion, pendiente] = useActionState(guardarPerfil, inicial)

  return (
    <form action={accion} className="cuest cuest-perfil">
      <div className="cuest-bloque">
        <div className="cuest-num">01</div>
        <div className="cuest-cuerpo">
          <div className="cuest-cat">Tus datos</div>
          <p className="cuest-pregunta">
            Peso, altura y con qué cuentas para entrenar en casa. Ayudan a tu preparador a
            ajustar tu plan; cámbialos cuando quieras.
          </p>

          <div className="cuest-fisicos-fila">
            <div>
              <label className="cuest-mini-label" htmlFor="peso_kg">
                Peso
              </label>
              <div className="cuest-tiempo">
                <input
                  type="number"
                  id="peso_kg"
                  name="peso_kg"
                  min={20}
                  max={300}
                  step="0.1"
                  inputMode="decimal"
                  defaultValue={peso ?? ''}
                  placeholder="Ej. 72"
                />
                <span className="cuest-unidad">kg</span>
              </div>
            </div>
            <div>
              <label className="cuest-mini-label" htmlFor="altura_cm">
                Altura
              </label>
              <div className="cuest-tiempo">
                <input
                  type="number"
                  id="altura_cm"
                  name="altura_cm"
                  min={100}
                  max={250}
                  defaultValue={altura ?? ''}
                  placeholder="Ej. 178"
                />
                <span className="cuest-unidad">cm</span>
              </div>
            </div>
          </div>

          <label className="cuest-mini-label" htmlFor="facilidades">
            ¿Con qué cuentas para entrenar en casa?
          </label>
          <textarea
            id="facilidades"
            name="facilidades"
            rows={3}
            className="cuest-textarea"
            defaultValue={facilidades ?? ''}
            placeholder="Ej. Barra de dominadas, un par de mancuernas, espacio para correr cerca…"
          />
        </div>
      </div>

      <div className="cuest-bloque">
        <div className="cuest-num">02</div>
        <div className="cuest-cuerpo">
          <div className="cuest-cat">Avisos</div>
          <p className="cuest-pregunta">Un empujón cuando más falta hace. Solo si tienes un plan activo.</p>

          <input type="hidden" name="avisos_en_form" value="1" />
          <label className="ff-switch">
            <input type="checkbox" name="recordatorios_email" defaultChecked={recordatorios} />
            <span className="ff-switch-track">
              <span className="ff-switch-thumb" />
            </span>
            <span className="ff-switch-txt">
              Avisarme por email si llevo {DIAS_INACTIVIDAD} días sin entrar
            </span>
          </label>
        </div>
      </div>

      {estado.error && <p className="form-error">{estado.error}</p>}
      {estado.ok && <p className="form-exito">Datos guardados ✓</p>}

      <button type="submit" className="cta-primary cuest-enviar" disabled={pendiente}>
        {pendiente ? 'Guardando…' : 'Guardar mis datos'}
      </button>
    </form>
  )
}
