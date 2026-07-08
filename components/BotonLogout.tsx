'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { logout } from '@/app/login/actions'

// Botón de cerrar sesión que abre un modal de confirmación con estilo.
// Variantes:
// - 'texto'  : el "Cerrar sesión" de abajo del sidebar (escritorio)
// - 'icono'  : un botón-icono para la cabecera (móvil)
export default function BotonLogout({
  variante = 'texto',
}: {
  variante?: 'texto' | 'icono'
}) {
  const [abierto, setAbierto] = useState(false)
  const [saliendo, setSaliendo] = useState(false)
  const [montado, setMontado] = useState(false)

  useEffect(() => setMontado(true), [])

  const confirmar = async () => {
    setSaliendo(true)
    await logout()
    setSaliendo(false)
  }

  return (
    <>
      {variante === 'icono' ? (
        <button
          type="button"
          className="logout-icono-btn"
          onClick={() => setAbierto(true)}
          aria-label="Cerrar sesión"
        >
          <svg fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="20" height="20">
            <path d="M16 17l5-5-5-5M21 12H9M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      ) : (
        <button type="button" className="sidebar-logout" onClick={() => setAbierto(true)}>
          Cerrar sesión
        </button>
      )}

      {abierto && montado && createPortal(
        <div className="logout-overlay" onClick={() => !saliendo && setAbierto(false)}>
          <div className="logout-modal" onClick={(e) => e.stopPropagation()}>
            <div className="logout-modal-marca">
              FÍSICA<span className="accent">.</span>ÉLITE
            </div>
            <h3 className="logout-modal-titulo">¿Cerrar sesión?</h3>
            <p className="logout-modal-texto">
              Se cerrará tu sesión y volverás a la pantalla de acceso.
            </p>
            <div className="logout-modal-acciones">
              <button
                type="button"
                className="logout-btn-cancelar"
                onClick={() => setAbierto(false)}
                disabled={saliendo}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="logout-btn-confirmar"
                onClick={confirmar}
                disabled={saliendo}
              >
                {saliendo ? 'Saliendo…' : 'Cerrar sesión'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
