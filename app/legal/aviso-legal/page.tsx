// Aviso legal · obligatorio por la LSSI-CE (art. 10).
//
// Los datos del titular salen de lib/legal.ts. Lo que falte se pinta
// resaltado en amarillo.
import type { Metadata } from 'next'
import Link from 'next/link'
import DatoLegal from '@/components/DatoLegal'
import { DATOS } from '@/lib/legal'

export const metadata: Metadata = {
  title: 'Aviso legal',
  description: 'Aviso legal y condiciones de uso de Físicas Élite.',
  robots: { index: true, follow: true },
}

export default function AvisoLegalPage() {
  return (
    <article className="legal-doc">
      <header className="legal-cab">
        <span className="sec-pub-eyebrow">Legal</span>
        <h1>Aviso legal</h1>
        <p className="legal-fecha">Condiciones de uso de este sitio web</p>
      </header>

      <section>
        <h2>1. Quiénes somos</h2>
        <p>
          En cumplimiento del artículo 10 de la Ley 34/2002 de Servicios de la
          Sociedad de la Información y de Comercio Electrónico (LSSI-CE), estos
          son los datos del titular de este sitio:
        </p>
        <ul className="legal-datos">
          <li>
            <span>Titular</span>
            <strong>
              <DatoLegal valor={DATOS.titular} />
            </strong>
          </li>
          <li>
            <span>NIF / CIF</span>
            <strong>
              <DatoLegal valor={DATOS.nif} />
            </strong>
          </li>
          <li>
            <span>Domicilio</span>
            <strong>
              <DatoLegal valor={DATOS.domicilio} />
            </strong>
          </li>
          <li>
            <span>Correo electrónico</span>
            <strong>
              <DatoLegal valor={DATOS.email} />
            </strong>
          </li>
          <li>
            <span>Teléfono</span>
            <strong>
              <DatoLegal valor={DATOS.telefono} />
            </strong>
          </li>
          <li>
            <span>Actividad</span>
            <strong>{DATOS.actividad}</strong>
          </li>
        </ul>
        {DATOS.registro && <p>{DATOS.registro}</p>}
      </section>

      <section>
        <h2>2. Qué ofrecemos</h2>
        <p>
          {DATOS.marca} presta servicios de preparación física para las pruebas
          de acceso a oposiciones, de forma presencial en {DATOS.localidad} y a
          través de esta plataforma online, que incluye vídeos de los
          ejercicios, planes de entrenamiento, registro de marcas y seguimiento
          por parte de un preparador.
        </p>
        <p>
          El acceso a la plataforma requiere contratar un plan. Las condiciones
          concretas de cada plan (precio, duración y contenido incluido) son las
          que figuran en la{' '}
          <Link href="/precios">página de precios</Link> en el momento de la
          contratación.
        </p>
      </section>

      <section>
        <h2>3. Uso del sitio y de la plataforma</h2>
        <p>
          Al usar este sitio te comprometes a hacerlo conforme a la ley y a no
          emplearlo para fines ilícitos o que perjudiquen a terceros.
        </p>
        <p>
          Las credenciales de acceso a la plataforma son <strong>personales e
          intransferibles</strong>. Eres responsable de mantenerlas en secreto y
          de la actividad que se realice con tu cuenta. Compartirlas con
          terceros, o difundir el contenido de pago por cualquier medio, es
          motivo de cancelación del acceso sin derecho a devolución.
        </p>
      </section>

      <section>
        <h2>4. Propiedad intelectual</h2>
        <p>
          Los vídeos, textos, planes de entrenamiento, imágenes, marcas y
          cualquier otro contenido de este sitio y de la plataforma son
          propiedad del titular o se usan con la autorización correspondiente.
        </p>
        <p>
          Se te concede una licencia de uso <strong>personal, limitada y no
          transferible</strong> mientras dure tu suscripción, y únicamente para
          tu propia preparación. No está permitido descargar, copiar,
          redistribuir, revender ni mostrar públicamente el contenido.
        </p>
        <p>
          Los vídeos que ves dentro de la plataforma llevan superpuestos tu
          nombre y tu correo electrónico. Si un vídeo aparece fuera de la
          plataforma, sabemos de qué cuenta ha salido.
        </p>
        <p>
          Los vídeos que tú subes a la plataforma en tus pruebas de evaluación
          siguen siendo tuyos. Nos autorizas únicamente a almacenarlos y a que
          tu preparador los vea para corregirte, y puedes solicitar su borrado
          cuando quieras.
        </p>
      </section>

      <section>
        <h2>5. Responsabilidad</h2>
        <p>
          El entrenamiento físico conlleva riesgo de lesión.{' '}
          <strong>
            Antes de empezar cualquier programa de entrenamiento debes
            asegurarte de que tu estado de salud te lo permite
          </strong>
          , consultando con un profesional sanitario si tienes cualquier duda,
          patología previa o lesión.
        </p>
        <p>
          Los planes y vídeos son orientativos y de carácter general: no
          sustituyen a un diagnóstico ni a un tratamiento médico. El titular no
          se hace responsable de las lesiones derivadas de una ejecución
          incorrecta, de entrenar en condiciones inadecuadas o de ignorar las
          indicaciones dadas.
        </p>
        <p>
          Tampoco garantizamos que superes la prueba física de tu oposición: el
          resultado depende de tu trabajo, de tu punto de partida y de los
          criterios de cada convocatoria. Las marcas y baremos que se mencionan
          son orientativos y los fija cada convocatoria oficial.
        </p>
        <p>
          Hacemos lo posible por mantener el servicio disponible, pero no
          podemos garantizar que no haya interrupciones por mantenimiento o por
          causas ajenas (proveedores de alojamiento, conexión, etc.).
        </p>
      </section>

      <section>
        <h2>6. Enlaces a otros sitios</h2>
        <p>
          Este sitio puede contener enlaces a páginas de terceros. No
          controlamos su contenido ni sus políticas, y no nos hacemos
          responsables de ellos.
        </p>
      </section>

      <section>
        <h2>7. Protección de datos y cookies</h2>
        <p>
          El tratamiento de tus datos personales se explica en la{' '}
          <Link href="/legal/privacidad">política de privacidad</Link>, y el uso
          de cookies en la{' '}
          <Link href="/legal/cookies">política de cookies</Link>.
        </p>
      </section>

      <section>
        <h2>8. Legislación aplicable</h2>
        <p>
          Estas condiciones se rigen por la legislación española. Para cualquier
          controversia, las partes se someten a los juzgados y tribunales del
          domicilio del consumidor, conforme a la normativa de defensa de
          consumidores y usuarios.
        </p>
      </section>
    </article>
  )
}
