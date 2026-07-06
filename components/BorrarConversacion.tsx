'use client'

import { borrarConversacion } from '@/app/chat/actions'

export default function BorrarConversacion({ id }: { id: string }) {
  return (
    <form
      action={borrarConversacion}
      onSubmit={(e) => {
        if (
          !confirm(
            '¿Borrar esta conversación y todos sus mensajes? No se puede deshacer.'
          )
        ) {
          e.preventDefault()
        }
      }}
    >
      <input type="hidden" name="conversacion_id" value={id} />
      <button type="submit" className="btn-borrar-chat">
        Borrar
      </button>
    </form>
  )
}
