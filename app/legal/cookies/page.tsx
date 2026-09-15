// Política de cookies.
//
// IMPORTANTE, para que nadie añada un banner "por si acaso":
// esta web usa SOLO cookies técnicas necesarias (la sesión de Supabase).
// No hay analítica, ni píxeles, ni publicidad. Según la guía de la AEPD,
// las cookies estrictamente necesarias están exentas de consentimiento:
// hay que INFORMAR, no pedir permiso. Por eso no hay banner.
//
// ⚠️ Si algún día se añade Google Analytics, Meta Pixel, Vercel Analytics
// o cualquier medición, ESTO CAMBIA y sí hará falta banner con rechazo.
import type { Metadata } from 'next'
import Link from 'next/link'
import DatoLegal from '@/components/DatoLegal'
import { DATOS } from '@/lib/legal'

export const metadata: Metadata = {
  title: 'Política de cookies',
  description:
    'Qué cookies usa Físicas Élite: solo las necesarias para mantener tu sesión. Sin analítica ni publicidad.',
  robots: { index: true, follow: true },
}

export default function CookiesPage() {
  return (
    <article className="legal-doc">
      <header className="legal-cab">
        <span className="sec-pub-eyebrow">Legal</span>
        <h1>Política de cookies</h1>
        <p className="legal-fecha">Qué guardamos en tu navegador y por qué</p>
      </header>

      <section>
        <div className="legal-destacado">
          <strong>Resumen:</strong> esta web solo usa las cookies
          imprescindibles para que funcione el inicio de sesión.{' '}
          <strong>No usamos analítica, ni publicidad, ni rastreadores de
          terceros</strong>, y no compartimos tu navegación con nadie. Por eso
          no verás ningún banner pidiéndote permiso: no hay nada que
          consentir.
        </div>
      </section>

      <section>
        <h2>1. Qué es una cookie</h2>
        <p>
          Un archivo pequeño que una web guarda en tu navegador. Sirve, entre
          otras cosas, para que el sitio te reconozca entre una página y otra —
          por ejemplo, para no pedirte la contraseña en cada clic.
        </p>
      </section>

      <section>
        <h2>2. Las que usamos</h2>
        <div className="legal-tabla">
          <div className="legal-tabla-fila">
            <strong>Sesión de usuario</strong>
            <span>
              Cookies con el prefijo <code>sb-</code>, gestionadas por Supabase,
              nuestro proveedor de cuentas. Mantienen tu sesión iniciada y
              permiten que la plataforma sepa qué contenido tienes contratado.
              Sin ellas no podrías entrar. <em>Tipo: técnica necesaria.
              Duración: la de tu sesión, renovable mientras sigas usando la
              plataforma.</em>
            </span>
          </div>
        </div>
        <p>
          Y ya está: no hay más. No instalamos Google Analytics, ni el píxel de
          Meta, ni herramientas de mapas de calor, ni cookies publicitarias.
        </p>
      </section>

      <section>
        <h2>3. Servicios de terceros</h2>
        <p>
          Hay dos momentos en los que interviene un tercero, y conviene que lo
          sepas:
        </p>
        <ul className="legal-lista">
          <li>
            <strong>Pagos (Stripe).</strong> Al pagar te llevamos a la pasarela
            segura de Stripe, que está en su propio dominio. Allí se aplican sus
            cookies y su política, no las nuestras. Nosotros no vemos ni
            guardamos los datos de tu tarjeta.
          </li>
          <li>
            <strong>Vídeos (Bunny.net).</strong> Dentro de la plataforma, los
            vídeos se muestran mediante un reproductor alojado por Bunny.net.
            Puede usar almacenamiento local o cookies propias para funciones del
            reproductor, como recordar el volumen o la calidad. Solo aparece en
            la zona privada, cuando ya eres alumno.
          </li>
        </ul>
      </section>

      <section>
        <h2>4. Cómo borrarlas o bloquearlas</h2>
        <p>
          Puedes borrar las cookies y bloquear las futuras desde los ajustes de
          tu navegador. Ten en cuenta que{' '}
          <strong>si bloqueas las cookies de sesión no podrás iniciar sesión
          en la plataforma</strong>, porque son justamente las que te mantienen
          identificado.
        </p>
        <ul className="legal-lista">
          <li>
            <a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer">
              Chrome
            </a>
          </li>
          <li>
            <a href="https://support.apple.com/es-es/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer">
              Safari
            </a>
          </li>
          <li>
            <a href="https://support.mozilla.org/es/kb/Borrar%20cookies" target="_blank" rel="noopener noreferrer">
              Firefox
            </a>
          </li>
          <li>
            <a href="https://support.microsoft.com/es-es/microsoft-edge" target="_blank" rel="noopener noreferrer">
              Edge
            </a>
          </li>
        </ul>
      </section>

      <section>
        <h2>5. Cambios</h2>
        <p>
          Si en el futuro añadimos alguna cookie que no sea estrictamente
          necesaria, actualizaremos esta página y te pediremos permiso antes de
          instalarla.
        </p>
        <p>
          Para cualquier duda sobre cookies o privacidad, escríbenos a{' '}
          <strong>
            <DatoLegal valor={DATOS.email} />
          </strong>{' '}
          o consulta la{' '}
          <Link href="/legal/privacidad">política de privacidad</Link>.
        </p>
      </section>
    </article>
  )
}
