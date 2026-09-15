// Política de privacidad · RGPD (UE 2016/679) y LOPDGDD (3/2018).
//
// Los datos tratados salen del esquema REAL de la base de datos, no de
// una plantilla. Si se añaden campos nuevos, hay que actualizar
// DATOS_TRATADOS en lib/legal.ts.
import type { Metadata } from 'next'
import Link from 'next/link'
import DatoLegal from '@/components/DatoLegal'
import { DATOS, ENCARGADOS, DATOS_TRATADOS } from '@/lib/legal'

export const metadata: Metadata = {
  title: 'Política de privacidad',
  description:
    'Cómo tratamos tus datos personales en Físicas Élite: qué recogemos, para qué, con quién lo compartimos y cómo ejercer tus derechos.',
  robots: { index: true, follow: true },
}

export default function PrivacidadPage() {
  return (
    <article className="legal-doc">
      <header className="legal-cab">
        <span className="sec-pub-eyebrow">Legal</span>
        <h1>Política de privacidad</h1>
        <p className="legal-fecha">
          Cómo tratamos tus datos, en cumplimiento del RGPD y la LOPDGDD
        </p>
      </header>

      <section>
        <h2>1. Responsable del tratamiento</h2>
        <ul className="legal-datos">
          <li>
            <span>Responsable</span>
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
            <span>Contacto</span>
            <strong>
              <DatoLegal valor={DATOS.email} />
            </strong>
          </li>
        </ul>
      </section>

      <section>
        <h2>2. Qué datos tratamos</h2>
        <p>Estos son los datos que recogemos y para qué los usamos:</p>
        <div className="legal-tabla">
          {DATOS_TRATADOS.map((d) => (
            <div key={d.grupo} className="legal-tabla-fila">
              <strong>{d.grupo}</strong>
              <span>{d.campos}</span>
            </div>
          ))}
        </div>
        <p className="legal-nota">
          <strong>Sobre los datos de salud.</strong> El peso, la altura y las
          marcas de entrenamiento se recogen únicamente para ajustar tu plan al
          nivel que tienes. No pedimos ni queremos historiales médicos,
          diagnósticos ni informes clínicos: no los incluyas en el chat ni en
          las notas de tus pruebas.
        </p>
      </section>

      <section>
        <h2>3. Para qué los usamos y con qué base legal</h2>
        <div className="legal-tabla">
          <div className="legal-tabla-fila">
            <strong>Prestarte el servicio</strong>
            <span>
              Crear tu cuenta, darte acceso al contenido que has contratado,
              ajustar tu plan, corregir tus pruebas y atenderte por el chat.
              <em> Base legal: ejecución del contrato.</em>
            </span>
          </div>
          <div className="legal-tabla-fila">
            <strong>Cobrar y facturar</strong>
            <span>
              Gestionar los pagos de los planes y cumplir con las obligaciones
              fiscales y contables.
              <em> Base legal: ejecución del contrato y obligación legal.</em>
            </span>
          </div>
          <div className="legal-tabla-fila">
            <strong>Responder a tus consultas</strong>
            <span>
              Contestar a los mensajes que nos mandas por el formulario de
              contacto.
              <em> Base legal: tu consentimiento.</em>
            </span>
          </div>
        </div>
        <p>
          No hacemos perfilado ni decisiones automatizadas con efectos
          jurídicos sobre ti, ni te enviamos publicidad de terceros.
        </p>
      </section>

      <section>
        <h2>4. Quién más accede a tus datos</h2>
        <p>
          No vendemos ni cedemos tus datos. Para funcionar, la plataforma se
          apoya en estos proveedores, que actúan como encargados del tratamiento
          y solo acceden a lo imprescindible:
        </p>
        <div className="legal-tabla">
          {ENCARGADOS.map((e) => (
            <div key={e.nombre} className="legal-tabla-fila">
              <strong>{e.nombre}</strong>
              <span>
                {e.para}. Alojamiento: {e.donde}.{' '}
                <a href={e.web} target="_blank" rel="noopener noreferrer">
                  Su política de privacidad
                </a>
                .
              </span>
            </div>
          ))}
        </div>
        <p>
          Hemos elegido a propósito proveedores con alojamiento en la Unión
          Europea. Cuando alguno implique transferencias fuera del Espacio
          Económico Europeo, se realizan con las garantías previstas en el RGPD
          (cláusulas contractuales tipo de la Comisión Europea).
        </p>
        <p>
          También podremos comunicar datos a la Administración cuando exista
          obligación legal.
        </p>
      </section>

      <section>
        <h2>5. Cuánto tiempo los guardamos</h2>
        <ul className="legal-lista">
          <li>
            Mientras tengas la cuenta activa y durante el tiempo en que puedas
            reclamar o nosotros podamos hacerlo.
          </li>
          <li>
            Los datos de facturación, <strong>los años que exige la normativa
            fiscal y contable</strong> (con carácter general, seis años).
          </li>
          <li>
            Los vídeos de tus pruebas, mientras seas alumno. Puedes pedir que se
            borren antes en cualquier momento.
          </li>
          <li>
            Los mensajes del formulario de contacto, el tiempo necesario para
            atender tu consulta.
          </li>
        </ul>
      </section>

      <section>
        <h2>6. Tus derechos</h2>
        <p>
          Puedes ejercer en cualquier momento tus derechos de{' '}
          <strong>acceso, rectificación, supresión, oposición, limitación del
          tratamiento y portabilidad</strong>, así como retirar el
          consentimiento que hayas dado.
        </p>
        <p>
          Para hacerlo, escríbenos a{' '}
          <strong>
            <DatoLegal valor={DATOS.email} />
          </strong>{' '}
          indicando qué derecho quieres ejercer. Puede que te pidamos que
          acredites tu identidad.
        </p>
        <p>
          Si crees que no hemos atendido bien tu solicitud, puedes reclamar ante
          la{' '}
          <a
            href="https://www.aepd.es"
            target="_blank"
            rel="noopener noreferrer"
          >
            Agencia Española de Protección de Datos
          </a>
          .
        </p>
      </section>

      <section>
        <h2>7. Seguridad</h2>
        <p>
          Aplicamos medidas técnicas y organizativas para proteger tus datos:
          cifrado en tránsito, control de acceso por roles, y reglas a nivel de
          base de datos que impiden que un alumno acceda a la información de
          otro. Los vídeos se sirven mediante enlaces firmados con caducidad.
        </p>
      </section>

      <section>
        <h2>8. Menores de edad</h2>
        <p>
          Para usar la plataforma hay que ser mayor de 14 años. Si tienes entre
          14 y 18, necesitas el consentimiento de tus padres o tutores para
          contratar.
        </p>
      </section>

      <section>
        <h2>9. Cookies</h2>
        <p>
          Puedes consultar qué cookies usamos en la{' '}
          <Link href="/legal/cookies">política de cookies</Link>.
        </p>
      </section>
    </article>
  )
}
