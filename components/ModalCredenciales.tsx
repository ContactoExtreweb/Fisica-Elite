'use client'

import { useState } from 'react'
import type { Credenciales } from '@/app/admin/solicitudes/actions'

export default function ModalCredenciales({
  cred,
  onCerrar,
}: {
  cred: Credenciales
  onCerrar: () => void
}) {
  const [copiado, setCopiado] = useState(false)

  const copiar = async () => {
    const texto = `Física Élite — acceso\nUsuario: ${cred.username}\nEmail: ${cred.email}\nContraseña: ${cred.password}`
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      // si el navegador no deja copiar, no pasa nada
    }
  }

  return (
    <div className="modal-overlay" onClick={onCerrar}>
      <div className="modal-cred" onClick={(e) => e.stopPropagation()}>
        <div className="modal-cred-check">✓</div>
        <h3>Alumno creado</h3>
        <p className="modal-cred-aviso">
          Copia estas credenciales y házselas llegar. <strong>No se volverán a
          mostrar.</strong>
        </p>

        <div className="modal-cred-datos">
          <div className="cred-row">
            <span className="cred-key">Usuario</span>
            <span className="cred-valor">{cred.username}</span>
          </div>
          <div className="cred-row">
            <span className="cred-key">Email</span>
            <span className="cred-valor">{cred.email}</span>
          </div>
          <div className="cred-row">
            <span className="cred-key">Contraseña</span>
            <span className="cred-valor">{cred.password}</span>
          </div>
        </div>

        <div className="modal-cred-acciones">
          <button type="button" className="btn-ghost-chat" onClick={copiar}>
            {copiado ? '✓ Copiado' : 'Copiar credenciales'}
          </button>
          <button type="button" className="admin-topbar-cta" onClick={onCerrar}>
            Hecho
          </button>
        </div>
      </div>
    </div>
  )
}
