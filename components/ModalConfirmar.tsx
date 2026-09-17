'use client'

// Ventana de confirmación propia (no el confirm() del navegador): título,
// contenido libre y dos botones. Esc o clic fuera la cierran, salvo
// mientras se está ejecutando la acción.
import { useEffect, useRef } from 'react'

export default function ModalConfirmar({
  titulo,
  children,
  textoConfirmar,
  textoCancelar = 'Volver',
  peligro = false,
  pendiente = false,
  onConfirmar,
  onCerrar,
}: {
  titulo: string
  children: React.ReactNode
  textoConfirmar: string
  textoCancelar?: string
  /** Acción destructiva: el botón principal va en rojo */
  peligro?: boolean
  /** Mientras se ejecuta: bloquea los botones y no deja cerrar */
  pendiente?: boolean
  onConfirmar: () => void
  onCerrar: () => void
}) {
  const principal = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    principal.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !pendiente) onCerrar()
    }
    document.addEventListener('keydown', onKey)
    const previo = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.documentElement.style.overflow = previo
    }
  }, [pendiente, onCerrar])

  return (
    <div className="cf-fondo" onClick={pendiente ? undefined : onCerrar} role="presentation">
      <div
        className="cf-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cf-titulo"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="cf-titulo" className="cf-titulo">
          {titulo}
        </h2>
        <div className="cf-cuerpo">{children}</div>
        <div className="cf-acciones">
          <button type="button" className="cf-btn secundario" onClick={onCerrar} disabled={pendiente}>
            {textoCancelar}
          </button>
          <button
            ref={principal}
            type="button"
            className={`cf-btn primario ${peligro ? 'peligro' : ''}`}
            onClick={onConfirmar}
            disabled={pendiente}
          >
            {pendiente ? 'Un momento…' : textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  )
}
