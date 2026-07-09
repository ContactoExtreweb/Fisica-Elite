import type { Metadata } from 'next'
import NavPublica from '@/components/NavPublica'
import FooterPublico from '@/components/FooterPublico'
import FormularioContacto from '@/components/FormularioContacto'

export const metadata: Metadata = {
  title: 'Contacto',
  description:
    'Ponte en contacto con Física Élite en Cáceres. Cuéntanos a qué oposición te presentas y te ayudamos a preparar tu prueba física.',
}

export default function ContactoPage() {
  return (
    <>
      <NavPublica />

      <main className="pub">
        <section className="cabecera-pub">
          <div className="cabecera-pub-inner">
            <span className="sec-pub-eyebrow">Contacto</span>
            <h1>Hablemos de tu oposición</h1>
            <p>
              Escríbenos y te contamos cómo enfocaríamos tu preparación. Sin
              compromiso: primero entendemos tu caso.
            </p>
          </div>
        </section>

        <section className="sec-pub">
          <div className="contacto-bloque">
            <div className="contacto-form-col">
              <FormularioContacto />
            </div>

            <aside className="contacto-datos">
              <h3>Otras formas de contacto</h3>
              <div className="contacto-dato">
                <span className="contacto-dato-k">Correo</span>
                <a href="mailto:info@fisicaelite.es">info@fisicaelite.es</a>
              </div>
              <div className="contacto-dato">
                <span className="contacto-dato-k">Teléfono</span>
                <a href="tel:+34600000000">600 00 00 00</a>
              </div>
              <div className="contacto-dato">
                <span className="contacto-dato-k">Dónde estamos</span>
                <span>Cáceres, España</span>
              </div>
              <div className="contacto-dato">
                <span className="contacto-dato-k">Horario</span>
                <span>Lunes a viernes · mañanas y tardes</span>
              </div>

              <div className="contacto-nota">
                ¿Ya eres alumno? Entra en la plataforma desde el botón «Acceder».
              </div>
            </aside>
          </div>
        </section>
      </main>

      <FooterPublico />
    </>
  )
}
