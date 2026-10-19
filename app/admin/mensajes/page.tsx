// Mensajes del formulario de contacto de la web pública.
//
// Hasta ahora se guardaban en la tabla y no se veían en ninguna parte: quien
// escribía pidiendo información se perdía. Además de esta pantalla, cada
// mensaje llega por correo al preparador (lib/avisos.ts → avisoAdminContacto).
import { createClient } from '@/lib/supabase/server'
import { nombreOposicion } from '@/lib/oposiciones'
import { marcarMensaje } from './actions'

export const metadata = { title: 'Mensajes de contacto' }

type Mensaje = {
  id: string
  nombre: string
  email: string
  telefono: string | null
  oposicion: string | null
  mensaje: string
  leido: boolean
  created_at: string
}

function cuando(iso: string): string {
  return new Date(iso).toLocaleString('es-ES', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Madrid',
  })
}

export default async function AdminMensajesPage() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('mensajes_contacto')
    .select('id, nombre, email, telefono, oposicion, mensaje, leido, created_at')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    return <p className="form-error">No se pudieron cargar los mensajes: {error.message}</p>
  }

  const lista = (data ?? []) as Mensaje[]
  const pendientes = lista.filter((m) => !m.leido).length

  return (
    <>
      <div className="topbar">
        <div>
          <div className="greeting">
            {pendientes > 0
              ? `${pendientes} sin atender de ${lista.length}`
              : `${lista.length} en total`}
          </div>
          <h1 className="page-title">
            Mensajes de <em>contacto.</em>
          </h1>
        </div>
      </div>

      <p className="ff-hint" style={{ margin: '0 0 18px' }}>
        Lo que escribe la gente desde el formulario de la web. También te llega por correo en
        cuanto entra. Responde desde tu bandeja y márcalo aquí como atendido.
      </p>

      {lista.length === 0 ? (
        <div className="admin-section">
          <div className="admin-tabla-vacia">Todavía no ha escrito nadie desde la web.</div>
        </div>
      ) : (
        <div className="msg-lista">
          {lista.map((m) => (
            <article key={m.id} className={`msg-card${m.leido ? '' : ' nuevo'}`}>
              <header className="msg-cab">
                <div className="msg-quien">
                  <span className="msg-nombre">{m.nombre}</span>
                  {!m.leido && <span className="msg-badge">Sin atender</span>}
                </div>
                <span className="msg-fecha">{cuando(m.created_at)}</span>
              </header>

              <p className="msg-texto">{m.mensaje}</p>

              <div className="msg-datos">
                <a href={`mailto:${m.email}`} className="msg-dato">
                  {m.email}
                </a>
                {m.telefono && (
                  <a href={`tel:${m.telefono.replace(/[^\d+]/g, '')}`} className="msg-dato">
                    {m.telefono}
                  </a>
                )}
                {m.oposicion && <span className="msg-dato apagado">{nombreOposicion(m.oposicion)}</span>}
              </div>

              <form action={marcarMensaje} className="msg-acciones">
                <input type="hidden" name="id" value={m.id} />
                <input type="hidden" name="leido" value={m.leido ? '0' : '1'} />
                <button type="submit" className="msg-boton">
                  {m.leido ? 'Volver a marcar como pendiente' : 'Marcar como atendido'}
                </button>
              </form>
            </article>
          ))}
        </div>
      )}
    </>
  )
}
