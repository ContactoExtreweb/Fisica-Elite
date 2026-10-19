'use client'

// Notificaciones push del alumno (OneSignal), en /perfil.
//
// Solo se carga aquí, en una página: una vez que el alumno las activa, la
// suscripción vive en OneSignal y las notificaciones le llegan aunque no
// vuelva a abrir esta pantalla. No hace falta cargar el SDK en toda la app.
//
// OneSignal identifica al alumno por su id de la plataforma (login →
// external_id). El servidor manda los avisos a ese id, sin guardar aquí
// ninguna tabla de suscripciones (ver lib/avisos.ts).
//
// Sin NEXT_PUBLIC_ONESIGNAL_APP_ID esto no pinta nada: la web se queda
// exactamente como estaba.
import { useEffect, useState } from 'react'

const SDK = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js'

type OneSignalSDK = {
  init(o: { appId: string; allowLocalhostAsSecureOrigin?: boolean; autoResubscribe?: boolean }): Promise<void>
  login(externalId: string): Promise<void>
  Notifications: { permission: boolean }
  User: { PushSubscription: { optedIn?: boolean; optIn(): Promise<void> } }
}

declare global {
  interface Window {
    OneSignalDeferred?: ((os: OneSignalSDK) => void | Promise<void>)[]
  }
}

type Estado =
  | 'cargando'
  | 'activas'
  | 'inactivas'
  | 'bloqueadas'
  | 'instalar' // iPhone sin añadir a la pantalla de inicio
  | 'nosoportado'
  | 'error'

// El SDK solo se puede inicializar UNA vez por carga de página; al navegar
// dentro de la app el componente se vuelve a montar, así que la promesa se
// guarda fuera y se reutiliza.
let arranque: Promise<OneSignalSDK> | null = null

function arrancar(appId: string): Promise<OneSignalSDK> {
  if (arranque) return arranque
  arranque = new Promise<OneSignalSDK>((resolver, rechazar) => {
    // La cola se declara ANTES de cargar el script: el SDK la vacía nada
    // más arrancar.
    window.OneSignalDeferred = window.OneSignalDeferred || []
    window.OneSignalDeferred.push(async (OneSignal) => {
      try {
        // autoResubscribe: si el permiso del navegador ya está concedido pero no
        // hay suscripción push real, la crea al arrancar. Sin esto (comprobado el
        // 19/10/2026), OneSignal daba al usuario por suscrito con el token vacío
        // y no le llegaba nada. Con «Custom Code» el ajuste del panel no cuenta.
        await OneSignal.init({ appId, allowLocalhostAsSecureOrigin: true, autoResubscribe: true })
        resolver(OneSignal)
      } catch (e) {
        rechazar(e)
      }
    })
    const script = document.createElement('script')
    script.src = SDK
    script.defer = true
    script.onerror = () => rechazar(new Error('No se pudo cargar OneSignal'))
    document.head.appendChild(script)
  })
  return arranque
}

function leerEstado(os: OneSignalSDK): Estado {
  if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
    return 'bloqueadas'
  }
  // Estricto: con el permiso del navegador dado pero sin suscripción creada
  // en OneSignal, antes salía «Activados» y no llegaba nada. Así sale el botón.
  const suscrito = os.Notifications.permission && os.User.PushSubscription.optedIn === true
  return suscrito ? 'activas' : 'inactivas'
}

async function iniciar(appId: string, userId: string): Promise<Estado> {
  // En iPhone y iPad el push web solo existe si la web está añadida a la
  // pantalla de inicio. En una pestaña normal ni siquiera hay API que probar.
  const esApple = /iPad|iPhone|iPod/.test(navigator.userAgent)
  const instalada =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  if (esApple && !instalada) return 'instalar'
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return 'nosoportado'

  try {
    const os = await arrancar(appId)
    await os.login(userId)
    return leerEstado(os)
  } catch {
    return 'error'
  }
}

// Lo único que cambia entre alumno y preparador es de qué se le avisa.
const QUE_AVISA = {
  alumno: 'de los mensajes de tu preparador, de tus clases y de tus correcciones',
  admin: 'de los mensajes de tus alumnos, las pruebas que suben, los pagos y los contactos de la web',
}

const TEXTOS: Record<Exclude<Estado, 'activas'>, string> = {
  cargando: 'Comprobando…',
  inactivas:
    'Actívalas y te avisamos al momento, sin tener que entrar a mirar. Puedes quitarlas cuando quieras.',
  bloqueadas:
    'Las tienes bloqueadas en este navegador. Para recibirlas, permite las notificaciones en los ajustes del sitio (el candado de la barra de direcciones) y vuelve aquí.',
  instalar:
    'En iPhone y iPad, primero añade Físicas Élite a la pantalla de inicio: toca Compartir y luego «Añadir a pantalla de inicio». Ábrela desde ahí y vuelve a esta pantalla para activarlas.',
  nosoportado:
    'Este navegador no admite notificaciones. No pasa nada: los avisos te siguen llegando por correo.',
  error: 'No se han podido cargar las notificaciones. Inténtalo más tarde.',
}

export default function AvisosPush({
  userId,
  para = 'alumno',
}: {
  userId: string
  para?: 'alumno' | 'admin'
}) {
  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID
  const [estado, setEstado] = useState<Estado>('cargando')
  const [trabajando, setTrabajando] = useState(false)

  useEffect(() => {
    if (!appId || !userId) return
    let vivo = true
    iniciar(appId, userId).then((e) => {
      if (vivo) setEstado(e)
    })
    return () => {
      vivo = false
    }
  }, [appId, userId])

  if (!appId) return null

  const activar = async () => {
    setTrabajando(true)
    try {
      const os = await arrancar(appId)
      // optIn() pide el permiso al navegador si hace falta, y vuelve a
      // suscribir al que ya lo había dado y se dio de baja.
      await os.User.PushSubscription.optIn()
      setEstado(leerEstado(os))
    } catch {
      setEstado('error')
    } finally {
      setTrabajando(false)
    }
  }

  return (
    <section className={`push-caja${estado === 'activas' ? ' push-on' : ''}`}>
      <span className="push-icono" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
      </span>
      <div className="push-cuerpo">
        <div className="push-tit">
          Avisos en el móvil
          {estado === 'activas' && <span className="push-ok">Activados</span>}
        </div>
        <p className="push-sub">
          {estado === 'activas'
            ? `Activadas en este dispositivo. Te avisamos al momento ${QUE_AVISA[para]}.`
            : TEXTOS[estado]}
        </p>
        {estado === 'inactivas' && (
          <button type="button" className="push-boton" onClick={activar} disabled={trabajando}>
            {trabajando ? 'Activando…' : 'Activar notificaciones'}
          </button>
        )}
      </div>
    </section>
  )
}
