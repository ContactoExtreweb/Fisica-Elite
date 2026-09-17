'use client'

// Reproductor con marca de agua por alumno.
//
// El vídeo llega en un iframe de Bunny (URL firmada, ver lib/bunny.ts),
// así que no podemos pintar NADA dentro del reproductor. Lo que hacemos
// es poner una capa encima del marco con el nombre y el email del alumno,
// que cambia de sitio cada pocos segundos. Si alguien graba la pantalla y
// lo comparte, el vídeo lleva su identidad.
//
// Es DISUASORIA, no infranqueable: con las herramientas del navegador se
// puede borrar la capa. La protección real sigue siendo la firma de la
// URL con caducidad. Lo que sí cerramos es el escape fácil:
//
//   · El iframe va SIN allowFullScreen, a propósito: el botón de pantalla
//     completa del reproductor de Bunny queda bloqueado por el navegador
//     (escritorio y Android), y así la capa no se queda fuera del vídeo.
//   · La pantalla completa la damos NOSOTROS sobre el marco entero
//     (iframe + capa). En iPhone no existe la API de fullscreen para un
//     <div>, así que ahí se simula con position: fixed a toda la pantalla.
//
// Además, en el panel de Bunny hay que quitar el control "Fullscreen" del
// reproductor, para que el alumno no vea un botón que no hace nada.
import { useCallback, useEffect, useRef, useState } from 'react'

type Props = {
  src: string
  titulo: string
  marca: { nombre: string; email: string }
}

// Posiciones (top %, left %) por las que va rotando la marca. Se evitan la
// franja inferior (controles del reproductor) y la esquina superior derecha
// (nuestro botón de pantalla completa).
const POSICIONES: Array<[number, number]> = [
  [10, 8],
  [12, 32],
  [26, 56],
  [40, 10],
  [48, 38],
  [60, 58],
  [30, 20],
  [56, 26],
]
const CADA_MS = 7000

export default function VideoProtegido({ src, titulo, marca }: Props) {
  const marco = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState(0) // índice fijo en SSR: sin desajuste de hidratación
  const [fsApi, setFsApi] = useState(false) // pantalla completa real (Fullscreen API)
  const [fsCss, setFsCss] = useState(false) // simulada (iPhone)

  // La marca cambia de sitio cada CADA_MS, nunca al mismo sitio dos veces
  useEffect(() => {
    const t = setInterval(() => {
      setPos((p) => {
        let n = Math.floor(Math.random() * POSICIONES.length)
        if (n === p) n = (n + 1) % POSICIONES.length
        return n
      })
    }, CADA_MS)
    return () => clearInterval(t)
  }, [])

  // Sincroniza con la API: Esc, gesto del navegador, etc.
  useEffect(() => {
    const onChange = () => setFsApi(document.fullscreenElement === marco.current)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  // Modo simulado: Esc para salir y bloquear el scroll de la página
  useEffect(() => {
    if (!fsCss) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFsCss(false)
    }
    document.addEventListener('keydown', onKey)
    const previo = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.documentElement.style.overflow = previo
    }
  }, [fsCss])

  const enFs = fsApi || fsCss

  const alternar = useCallback(async () => {
    const el = marco.current
    if (!el) return
    if (enFs) {
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => {})
      setFsCss(false)
      return
    }
    if (typeof el.requestFullscreen === 'function') {
      try {
        await el.requestFullscreen()
        return
      } catch {
        // Algún navegador lo rechaza: caemos al modo simulado
      }
    }
    setFsCss(true)
  }, [enFs])

  const [top, left] = POSICIONES[pos]
  const etiqueta = enFs ? 'Salir de pantalla completa' : 'Pantalla completa'

  return (
    <div ref={marco} className={`video-frame vp ${fsCss ? 'vp-fs-css' : ''}`}>
      {/* Sin allowFullScreen, a propósito: ver la nota de arriba */}
      <iframe src={src} loading="lazy" allow="accelerometer; gyroscope; encrypted-media" title={titulo} />

      <div className="vp-marca" style={{ top: `${top}%`, left: `${left}%` }} aria-hidden="true">
        <span className="vp-marca-nombre">{marca.nombre}</span>
        <span className="vp-marca-email">{marca.email}</span>
      </div>

      <button type="button" className="vp-fs-btn" onClick={alternar} aria-label={etiqueta} title={etiqueta}>
        {enFs ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 3v3a2 2 0 01-2 2H3M21 8h-3a2 2 0 01-2-2V3M3 16h3a2 2 0 012 2v3M16 21v-3a2 2 0 012-2h3" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 3H5a2 2 0 00-2 2v3M21 8V5a2 2 0 00-2-2h-3M3 16v3a2 2 0 002 2h3M16 21h3a2 2 0 002-2v-3" />
          </svg>
        )}
      </button>
    </div>
  )
}
