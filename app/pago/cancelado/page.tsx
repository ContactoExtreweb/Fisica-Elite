// Página a la que se puede volver si el pago se cancela.
import Link from 'next/link'

export default function PagoCanceladoPage() {
  return (
    <div className="pago-exito-shell">
      <div className="pago-exito-card">
        <div className="pago-exito-icono" style={{ background: '#FEE2E2', color: '#B91C1C' }}>
          ✕
        </div>
        <h1>Pago cancelado</h1>
        <p className="pago-exito-lead">
          No se ha realizado ningún cargo. Puedes volver a intentarlo cuando
          quieras.
        </p>
        <Link href="/precios" className="cta-primary" style={{ width: 'auto', padding: '14px 28px' }}>
          Volver a los planes
        </Link>
      </div>
    </div>
  )
}
