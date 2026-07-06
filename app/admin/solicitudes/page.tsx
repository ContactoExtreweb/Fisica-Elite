// Solicitudes de alta que llegaron por pago web, pendientes de tramitar.
import { createClient } from '@/lib/supabase/server'
import ListaSolicitudes from '@/components/ListaSolicitudes'

export default async function AdminSolicitudesPage() {
  const supabase = await createClient()

  const { data: solicitudes, error } = await supabase
    .from('solicitudes_alta')
    .select(
      'id, nombre, apellidos, email, telefono, especialidad, username_solicitado, meses_pagados, modalidad, referencia, nivel_solicitado, mensaje_usuario, created_at'
    )
    .eq('estado', 'pendiente')
    .order('created_at', { ascending: false })

  if (error) {
    return <p className="form-error">Error cargando solicitudes: {error.message}</p>
  }

  const lista = solicitudes ?? []

  return (
    <>
      <div className="topbar">
        <div>
          <div className="greeting">Pagos web · {lista.length} pendientes</div>
          <h1 className="page-title">
            Solicitudes de <em>alta.</em>
          </h1>
          <p style={{ color: 'var(--ink-muted)', marginTop: 12, fontSize: 15, maxWidth: 600 }}>
            Personas que han pagado desde la web y esperan que valides su alta.
            Al aprobar, se crea el alumno con su suscripción y obtienes sus
            credenciales.
          </p>
        </div>
      </div>

      {lista.length === 0 ? (
        <div className="admin-section">
          <div className="admin-tabla-vacia">
            No hay solicitudes pendientes. Cuando alguien pague desde la web,
            aparecerá aquí.
          </div>
        </div>
      ) : (
        <ListaSolicitudes solicitudes={lista} />
      )}
    </>
  )
}
