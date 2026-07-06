// Página a la que Stripe redirige tras pagar. IMPORTANTE: aquí NO se da
// acceso ni se crea nada — el usuario podría llegar cerrando/reabriendo.
// El alta real la crea el WEBHOOK y la tramita un admin. Esta página solo
// confirma, muestra la referencia y explica los siguientes pasos.
//
// La referencia llega por la URL (?ref=), puesta al crear el pago, así que
// se muestra al instante sin depender de que el webhook ya haya corrido.
import Link from 'next/link'

export default async function PagoExitoPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>
}) {
  const { ref } = await searchParams

  return (
    <div className="pago-exito-shell">
      <div className="pago-exito-card">
        <div className="pago-exito-icono">✓</div>
        <h1>¡Pago recibido!</h1>
        <p className="pago-exito-lead">
          Gracias por confiar en Física Élite. Hemos registrado tu pago
          correctamente.
        </p>

        {ref && (
          <div className="pago-referencia">
            <div className="pago-referencia-label">Tu número de solicitud</div>
            <div className="pago-referencia-codigo">{ref}</div>
            <div className="pago-referencia-nota">
              Guárdalo. Si necesitas contactar con tu preparador, indícalo para
              identificar tu alta.
            </div>
          </div>
        )}

        <div className="pago-exito-pasos">
          <div className="pago-exito-paso">
            <span className="num">1</span>
            <span>Tu preparador revisará tu solicitud y validará el alta.</span>
          </div>
          <div className="pago-exito-paso">
            <span className="num">2</span>
            <span>
              Recibirás tus credenciales de acceso por correo o de la mano de
              tu preparador.
            </span>
          </div>
          <div className="pago-exito-paso">
            <span className="num">3</span>
            <span>
              Entra en la plataforma, crea tu contraseña y empieza a entrenar.
            </span>
          </div>
        </div>

        <p className="pago-exito-nota">
          Si en 24-48 h no tienes noticias, contacta con tu preparador
          {ref ? ' indicando tu número de solicitud' : ''}.
        </p>

        <Link href="/" className="cta-primary" style={{ width: 'auto', padding: '14px 28px' }}>
          Volver al inicio
        </Link>
      </div>
    </div>
  )
}
