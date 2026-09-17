// Horario y aforo de las clases presenciales (admin).
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { CONFIG_DEFECTO, type ConfigReservas, type Franja } from '@/lib/reservas'
import HorarioReservasForm from '@/components/HorarioReservasForm'

export default async function HorarioReservasPage() {
  const supabase = await createClient()
  const [{ data: cfg }, { data: horario }] = await Promise.all([
    supabase
      .from('config_reservas')
      .select('duracion_min, plazas_por_turno, antelacion_max_dias, cancelacion_min_horas, max_por_dia')
      .eq('id', 1)
      .single(),
    supabase
      .from('horario_reservas')
      .select('id, dia_semana, hora_inicio, hora_fin')
      .order('dia_semana')
      .order('hora_inicio'),
  ])

  return (
    <>
      <div style={{ fontSize: 13, color: 'var(--ink-muted)', marginBottom: 16 }}>
        <Link href="/admin/reservas" style={{ color: 'var(--ink-muted)', fontWeight: 500 }}>
          ← Volver a la agenda
        </Link>
      </div>

      <div className="topbar">
        <div>
          <div className="greeting">Clases presenciales</div>
          <h1 className="page-title">
            Horario y <em>aforo.</em>
          </h1>
          <p style={{ color: 'var(--ink-muted)', marginTop: 12, fontSize: 15, maxWidth: 580 }}>
            Lo que pongas aquí es lo que ven los alumnos presenciales al reservar. Los cambios se
            aplican al momento, pero no tocan las reservas que ya existen.
          </p>
        </div>
      </div>

      <div className="admin-section" style={{ padding: 28, maxWidth: 820 }}>
        <HorarioReservasForm
          config={(cfg ?? CONFIG_DEFECTO) as ConfigReservas}
          horario={(horario ?? []) as Franja[]}
        />
      </div>
    </>
  )
}
