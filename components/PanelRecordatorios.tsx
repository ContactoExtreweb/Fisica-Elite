'use client'

// Panel del admin sobre los recordatorios por inactividad: cuántos
// alumnos están pendientes de aviso, si el email está configurado, un
// botón para mandarlos ya (sin esperar a la tarea diaria) y otro para
// recibir un ejemplo y ver cómo queda el correo.
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { enviarRecordatoriosAhora, enviarCorreoEjemplo } from '@/app/admin/alumnos/actions'
import ModalConfirmar from '@/components/ModalConfirmar'

export default function PanelRecordatorios({
  pendientes,
  configurado,
  modoPruebas,
  dias,
}: {
  pendientes: number
  configurado: boolean
  /** Dirección a la que se desvían los correos en pruebas (null = modo real) */
  modoPruebas: string | null
  dias: number
}) {
  const [confirmar, setConfirmar] = useState(false)
  const [enviando, empezarEnvio] = useTransition()
  const [probando, empezarPrueba] = useTransition()
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const router = useRouter()

  const plural = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`

  const enviar = () =>
    empezarEnvio(async () => {
      const r = await enviarRecordatoriosAhora()
      setConfirmar(false)
      if (!r.ok) {
        setAviso({ tipo: 'error', texto: r.error })
        return
      }
      const { enviados, errores, quedan } = r.resumen
      const partes = [`${plural(enviados, 'recordatorio enviado', 'recordatorios enviados')}.`]
      if (errores.length > 0) {
        partes.push(
          `${plural(errores.length, 'ha fallado', 'han fallado')}: ${errores
            .map((e) => `${e.email} (${e.error})`)
            .join(', ')}.`
        )
      }
      if (quedan > 0) partes.push(`Quedan ${quedan}: salen en la próxima tanda.`)
      setAviso({ tipo: errores.length > 0 ? 'error' : 'ok', texto: partes.join(' ') })
      router.refresh()
    })

  const ejemplo = () =>
    empezarPrueba(async () => {
      setAviso(null)
      const r = await enviarCorreoEjemplo()
      setAviso(
        r.ok
          ? { tipo: 'ok', texto: `Ejemplo enviado a ${r.destino}. Mira la bandeja (y el spam).` }
          : { tipo: 'error', texto: `No se pudo enviar el ejemplo: ${r.error}` }
      )
    })

  return (
    <div className="rec-panel">
      <div className="rec-texto">
        <h3>Recordatorios por inactividad</h3>
        <p>
          {pendientes > 0
            ? `${plural(pendientes, 'alumno', 'alumnos')} con plan activo ${
                pendientes === 1 ? 'lleva' : 'llevan'
              } ${dias} días o más sin entrar y aún no ${pendientes === 1 ? 'ha' : 'han'} recibido el aviso.`
            : `Nadie está pendiente de aviso: ningún alumno con plan activo lleva ${dias} días o más sin entrar.`}{' '}
          Se envían solos cada mañana, uno por racha: si el alumno vuelve a entrar y se para otra
          vez, se le avisa de nuevo.
        </p>
        <p className="rec-regla">
          Solo se avisa a quien tiene un plan activo: a los alumnos sin acceso no se les manda nada.
        </p>
        {!configurado && (
          <p className="rec-nota">
            El email aún no está configurado (faltan RESEND_API_KEY y EMAIL_FROM): no se enviará
            nada.
          </p>
        )}
        {configurado && modoPruebas && (
          <p className="rec-nota">
            Modo pruebas: todos los correos se desvían a <strong>{modoPruebas}</strong>.
          </p>
        )}
        {aviso && <p className={`rec-resultado ${aviso.tipo}`}>{aviso.texto}</p>}
      </div>

      <div className="rec-acciones">
        <button
          type="button"
          className="btn-ghost-chat"
          onClick={ejemplo}
          disabled={!configurado || probando}
          title="Te manda el correo con datos de ejemplo para ver cómo queda"
        >
          {probando ? 'Enviando…' : 'Enviarme un ejemplo'}
        </button>
        <button
          type="button"
          className="admin-topbar-cta"
          onClick={() => setConfirmar(true)}
          disabled={!configurado || pendientes === 0 || enviando}
          title={pendientes === 0 ? 'No hay nadie pendiente de aviso' : undefined}
        >
          Enviar ahora
        </button>
      </div>

      {confirmar && (
        <ModalConfirmar
          titulo="¿Enviar los recordatorios ahora?"
          textoConfirmar="Sí, enviar"
          pendiente={enviando}
          onConfirmar={enviar}
          onCerrar={() => setConfirmar(false)}
        >
          <p>
            Se mandará un correo a {plural(pendientes, 'alumno', 'alumnos')} recordándole
            {pendientes === 1 ? '' : 's'} que {pendientes === 1 ? 'tiene' : 'tienen'} el plan
            activo y {pendientes === 1 ? 'lleva' : 'llevan'} {dias} días o más sin entrar.
          </p>
          {modoPruebas && (
            <p>
              Estás en modo pruebas: en realidad llegarán todos a <strong>{modoPruebas}</strong>.
            </p>
          )}
        </ModalConfirmar>
      )}
    </div>
  )
}
