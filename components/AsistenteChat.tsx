'use client'

// Asistente virtual: botón flotante + panel de chat.
//
// Se monta UNA vez en el layout raíz y decide por la ruta si se pinta:
// en la web pública y en el área del alumno sí; en el admin, el login, el
// chat con el preparador, el pago y demás, no.
//
// Solo se muestra con NEXT_PUBLIC_ASISTENTE=on. Es el interruptor de
// lanzamiento: mientras no esté (o falten las claves del proveedor en el
// servidor), la web se ve exactamente igual que sin asistente.
//
// PRIVACIDAD: la conversación vive SOLO en esta pestaña (estado de React).
// No se guarda en localStorage ni en cookies, ni se manda a ningún sitio
// más que al endpoint /api/asistente para obtener la respuesta.
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

type Rol = 'user' | 'assistant'
type Mensaje = { role: Rol; content: string; error?: boolean }
type Modo = 'publico' | 'alumno'
type Config = { disponible: boolean; modo: Modo }

const MAX_HISTORIAL = 12
const MAX_CHARS = 500

// Dónde se pinta. Por prefijo: '/ejercicio' cubre '/ejercicio/<slug>'.
const RUTAS_PUBLICAS = ['/', '/precios', '/sobre-nosotros', '/instalaciones', '/contacto', '/oposiciones', '/legal']
const RUTAS_ALUMNO = ['/inicio', '/ejercicios', '/ejercicio', '/explicaciones', '/registro', '/reservas', '/perfil', '/suscripcion', '/evaluaciones']

const coincide = (ruta: string, lista: string[]) =>
  lista.some((p) => (p === '/' ? ruta === '/' : ruta === p || ruta.startsWith(p + '/')))

const SALUDO: Record<Modo, string> = {
  publico:
    'Hola, soy el asistente virtual de Físicas Élite (una IA, no una persona). Te puedo resolver dudas sobre las oposiciones que preparamos, los planes y precios o cómo empezar. ¿Qué necesitas?',
  alumno:
    'Hola, soy el asistente virtual de Físicas Élite (una IA, no una persona). Te ayudo a moverte por la plataforma: ejercicios, marcas, reservas, suscripción… Para lo personal de tu entrenamiento, tu preparador te responde por el chat.',
}

const ATAJOS: Record<Modo, string[]> = {
  publico: [
    '¿Qué planes tenéis?',
    '¿Cómo se paga y cómo empiezo?',
    '¿Preparáis Policía Local?',
    '¿Hay clases presenciales?',
  ],
  alumno: [
    '¿Cómo apunto mis marcas?',
    '¿Cómo reservo una clase?',
    '¿Cómo subo mi prueba en vídeo?',
    '¿Cómo hablo con mi preparador?',
  ],
}

// Con la ficha de un ejercicio abierta (solo alumnos con sesión): el servidor
// le pasa al asistente el texto de esa ficha, así que se puede preguntar por ella.
const SALUDO_EJERCICIO =
  'Hola, soy el asistente virtual de Físicas Élite (una IA, no una persona). Estás viendo un ejercicio: puedo explicarte su técnica, sus errores más comunes o sus variantes con lo que ha escrito tu preparador. Para lo personal de tu entrenamiento, pregúntale a él por el chat.'

const ATAJOS_EJERCICIO = [
  '¿Cómo hago bien este ejercicio?',
  '¿Qué errores son los más comunes?',
  '¿Qué variantes tiene?',
  '¿Cómo puedo mejorarlo?',
]

const DERIVAR: Record<Modo, { href: string; txt: string }> = {
  publico: { href: '/contacto', txt: 'Prefiero hablar con una persona' },
  alumno: { href: '/chat', txt: 'Preguntar a mi preparador' },
}

export default function AsistenteChat() {
  const pathname = usePathname()
  const [abierto, setAbierto] = useState(false)
  const [config, setConfig] = useState<Config | null>(null)
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const finRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // MÓVIL (mismo comportamiento que el chat de GuadiCar): el panel es una
  // tarjeta flotante de tamaño FIJO, no una pantalla completa. Dos cosas lo
  // hacen fiable en un móvil de verdad:
  //  1) El fondo no se desplaza mientras el chat está abierto (se congela el
  //     body en su posición y se restaura al cerrar).
  //  2) Con el teclado abierto NO se redimensiona el panel (en iOS eso da
  //     saltos): se DESLIZA hacia arriba lo que mide el teclado, una sola vez
  //     al enfocar un campo, y baja al desenfocar. Sin listeners continuos
  //     de resize/scroll.
  useEffect(() => {
    if (!abierto) return
    const esMovil = () => window.matchMedia('(max-width: 640px)').matches
    if (!esMovil()) return

    const y = window.scrollY
    const b = document.body.style
    b.position = 'fixed'
    b.top = `-${y}px`
    b.left = '0'
    b.right = '0'

    const panel = panelRef.current
    const vv = window.visualViewport
    const subir = () => {
      if (!panel || !vv) return
      const teclado = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
      panel.style.transform = teclado > 80 ? `translateY(-${teclado}px)` : ''
      finRef.current?.scrollIntoView({ block: 'end' })
    }
    const bajar = () => {
      if (panel) panel.style.transform = ''
    }
    let t1: number | undefined
    let t2: number | undefined
    const alEnfocar = () => {
      t1 = window.setTimeout(subir, 350) // deja que el teclado termine de salir
    }
    const alDesenfocar = () => {
      t2 = window.setTimeout(() => {
        if (panel && !panel.contains(document.activeElement)) bajar()
      }, 120)
    }
    panel?.addEventListener('focusin', alEnfocar)
    panel?.addEventListener('focusout', alDesenfocar)
    window.addEventListener('orientationchange', bajar)

    return () => {
      panel?.removeEventListener('focusin', alEnfocar)
      panel?.removeEventListener('focusout', alDesenfocar)
      window.removeEventListener('orientationchange', bajar)
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      bajar()
      b.position = ''
      b.top = ''
      b.left = ''
      b.right = ''
      window.scrollTo(0, y)
    }
  }, [abierto])

  // Siempre al último mensaje
  useEffect(() => {
    if (abierto) finRef.current?.scrollIntoView({ block: 'end' })
  }, [mensajes, enviando, abierto, config])

  // Escape cierra
  useEffect(() => {
    if (!abierto) return
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAbierto(false)
    }
    window.addEventListener('keydown', alPulsar)
    return () => window.removeEventListener('keydown', alPulsar)
  }, [abierto])

  // Con ratón, el cursor va directo al campo. En el móvil NO: enfocarlo
  // abriría el teclado encima de la conversación nada más entrar.
  useEffect(() => {
    if (abierto && config?.disponible && !window.matchMedia('(pointer: coarse)').matches) {
      inputRef.current?.focus()
    }
  }, [abierto, config])

  // Interruptor de lanzamiento y rutas donde no se pinta
  if (process.env.NEXT_PUBLIC_ASISTENTE !== 'on') return null
  const zonaAlumno = coincide(pathname, RUTAS_ALUMNO)
  if (!zonaAlumno && !coincide(pathname, RUTAS_PUBLICAS)) return null

  const modo: Modo = config?.modo ?? 'publico'

  // ¿Está en la ficha de un ejercicio? (/ejercicio/<slug>). Solo cuenta para
  // alumnos con sesión: al visitante el servidor no le da nunca contenido.
  const slugEjercicio = modo === 'alumno' ? (pathname.match(/^\/ejercicio\/([^/]+)\/?$/)?.[1] ?? null) : null

  // El modo lo decide el servidor por la sesión. Se pregunta cada vez que se
  // abre el panel: si el usuario ha iniciado o cerrado sesión desde la última
  // vez, se empieza una conversación nueva en el modo correcto.
  const abrir = async () => {
    setAbierto(true)
    try {
      const res = await fetch('/api/asistente', { cache: 'no-store' })
      const nueva = (await res.json()) as Config
      if (config && config.modo !== nueva.modo) setMensajes([])
      setConfig({ disponible: !!nueva.disponible, modo: nueva.modo === 'alumno' ? 'alumno' : 'publico' })
    } catch {
      setConfig({ disponible: false, modo: 'publico' })
    }
  }

  const enviar = async (contenido: string) => {
    const limpio = contenido.trim()
    if (!limpio || enviando) return

    const conNuevo: Mensaje[] = [...mensajes, { role: 'user', content: limpio }]
    setMensajes(conNuevo)
    setTexto('')
    setEnviando(true)

    try {
      const res = await fetch('/api/asistente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Los mensajes de error locales no forman parte de la conversación
        body: JSON.stringify({
          mensajes: conNuevo
            .filter((m) => !m.error)
            .slice(-MAX_HISTORIAL)
            .map(({ role, content }) => ({ role, content })),
          ejercicio: slugEjercicio,
        }),
      })
      const datos = (await res.json()) as { respuesta?: string; error?: string }
      if (!res.ok || !datos.respuesta) {
        setMensajes([
          ...conNuevo,
          { role: 'assistant', content: datos.error ?? 'No he podido responder. Inténtalo de nuevo.', error: true },
        ])
      } else {
        setMensajes([...conNuevo, { role: 'assistant', content: datos.respuesta }])
      }
    } catch {
      setMensajes([
        ...conNuevo,
        { role: 'assistant', content: 'Parece que no hay conexión. Inténtalo de nuevo.', error: true },
      ])
    } finally {
      setEnviando(false)
    }
  }

  const hayPreguntas = mensajes.some((m) => m.role === 'user')

  return (
    <>
      {/* El botón se esconde mientras el chat está abierto (el panel ocupa su sitio) */}
      {!abierto && (
        <button
          type="button"
          className="asi-fab"
          data-zona={zonaAlumno ? 'alumno' : 'publico'}
          onClick={abrir}
          aria-label="Abrir el asistente virtual"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M21 12a8 8 0 01-11.5 7.2L4 21l1.8-5.2A8 8 0 1121 12z" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M9 11h.01M12 11h.01M15 11h.01" strokeLinecap="round" strokeWidth="2.4" />
          </svg>
          <span>Asistente</span>
        </button>
      )}

      {abierto && (
        <div ref={panelRef} className="asi-panel" role="dialog" aria-label="Asistente virtual de Físicas Élite">
          <header className="asi-cab">
            <div className="asi-cab-txt">
              <strong>Asistente virtual</strong>
              <span>IA de Físicas Élite</span>
            </div>
            <button type="button" className="asi-cerrar" onClick={() => setAbierto(false)} aria-label="Cerrar el asistente">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            </button>
          </header>

          <div className="asi-mensajes" aria-live="polite">
            {config === null ? (
              <div className="asi-burbuja asi-bot">Un momento…</div>
            ) : !config.disponible ? (
              <div className="asi-burbuja asi-bot">
                Ahora mismo el asistente no está disponible. Puedes escribirnos y te respondemos
                personalmente.
              </div>
            ) : (
              <>
                <div className="asi-burbuja asi-bot">{slugEjercicio ? SALUDO_EJERCICIO : SALUDO[modo]}</div>

                {mensajes.map((m, i) => (
                  <div
                    key={i}
                    className={`asi-burbuja ${m.role === 'user' ? 'asi-yo' : 'asi-bot'} ${m.error ? 'asi-error' : ''}`}
                  >
                    {m.content}
                  </div>
                ))}

                {enviando && (
                  <div className="asi-burbuja asi-bot asi-escribiendo" aria-label="Escribiendo">
                    <span />
                    <span />
                    <span />
                  </div>
                )}

                {!hayPreguntas && !enviando && (
                  <div className="asi-atajos">
                    {(slugEjercicio ? ATAJOS_EJERCICIO : ATAJOS[modo]).map((a) => (
                      <button key={a} type="button" onClick={() => enviar(a)}>
                        {a}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
            <div ref={finRef} />
          </div>

          <Link
            href={DERIVAR[modo].href}
            className="asi-derivar"
            onClick={() => setAbierto(false)}
          >
            {DERIVAR[modo].txt} →
          </Link>

          {config?.disponible && (
            <form
              className="asi-form"
              onSubmit={(e) => {
                e.preventDefault()
                enviar(texto)
              }}
            >
              <input
                ref={inputRef}
                type="text"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                maxLength={MAX_CHARS}
                placeholder="Escribe tu pregunta…"
                aria-label="Tu pregunta"
                autoComplete="off"
                enterKeyHint="send"
              />
              <button type="submit" disabled={enviando || !texto.trim()} aria-label="Enviar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </form>
          )}

          <p className="asi-aviso">
            Asistente automático (IA): puede equivocarse. No escribas datos personales.
          </p>
        </div>
      )}
    </>
  )
}
