import type { Metadata } from 'next'
import { Syne, Manrope, Instrument_Serif } from 'next/font/google'
import './globals.css'

// Las mismas fuentes del mockup, self-hosted por next/font
// (sin peticiones a Google en producción, sin salto de layout).
const syne = Syne({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-display',
})

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
})

const instrument = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-editorial',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://fisicaelite.vercel.app'),
  title: {
    default: 'Física Élite · Preparación física para oposiciones en Cáceres',
    template: '%s · Física Élite',
  },
  description:
    'Preparación física para oposiciones: Policía Local, Policía Nacional, Guardia Civil y Fuerzas Armadas. Presencial en Cáceres y online.',
  keywords: [
    'preparación física oposiciones',
    'oposiciones Cáceres',
    'pruebas físicas policía',
    'preparador físico guardia civil',
    'oposición policía nacional físicas',
  ],
  openGraph: {
    siteName: 'Física Élite',
    locale: 'es_ES',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es"
      className={`${syne.variable} ${manrope.variable} ${instrument.variable}`}
    >
      <body>{children}</body>
    </html>
  )
}
