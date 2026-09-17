'use client'

// Botón de envío de un <form action={serverAction}> que pide confirmación
// antes de enviar. Sin estado: si el usuario cancela, no pasa nada.
export default function BotonConfirmar({
  mensaje,
  className,
  children,
}: {
  mensaje: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!confirm(mensaje)) e.preventDefault()
      }}
    >
      {children}
    </button>
  )
}
