// Manifiesto de aplicación web.
//
// No es un capricho: en iPhone las notificaciones push SOLO funcionan si el
// alumno añade la web a la pantalla de inicio, y para que se abra como
// aplicación (y Apple deje mandarle push) hace falta este archivo con
// display: 'standalone'. En Android y escritorio el push funciona igual sin
// instalar nada; esto solo añade que se pueda instalar.
//
// Next lo sirve en /manifest.webmanifest y lo enlaza solo.
import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Físicas Élite',
    short_name: 'Físicas Élite',
    description: 'Tu entrenamiento para las pruebas físicas de oposición.',
    // Al instalarla, el alumno quiere su área, no la web de captación.
    start_url: '/inicio',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#030E0A',
    theme_color: '#030E0A',
    lang: 'es',
    icons: [
      { src: '/icono-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icono-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icono-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
