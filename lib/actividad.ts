// Actividad de los alumnos: cuándo entraron por última vez y si toca
// mandarles el recordatorio por inactividad.
//
// Solo funciones puras (sin BBDD ni claves): las usan el proxy, las
// páginas del admin y el envío de correos (lib/recordatorios.ts), para que
// "¿está inactivo?" se decida en UN solo sitio.

/** Días sin entrar a partir de los cuales se manda el recordatorio */
export const DIAS_INACTIVIDAD = 7

/** El proxy no reescribe ultima_actividad más de una vez cada tanto */
const REGISTRO_CADA_MS = 6 * 60 * 60 * 1000

const DIA_MS = 86_400_000

/** Días enteros transcurridos desde una fecha ISO (null si no hay dato) */
export function diasDesde(iso: string | null | undefined, ahora = Date.now()): number | null {
  if (!iso) return null
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return null
  return Math.max(0, Math.floor((ahora - t) / DIA_MS))
}

/**
 * ¿Hay que apuntar la actividad ahora? `undefined` significa que la
 * columna aún no existe (migración 023 sin aplicar): entonces no se
 * escribe nada, para que el proxy nunca falle por esto.
 */
export function actividadCaducada(iso: string | null | undefined, ahora = Date.now()): boolean {
  if (iso === undefined) return false
  if (iso === null) return true
  const t = new Date(iso).getTime()
  return Number.isNaN(t) || ahora - t > REGISTRO_CADA_MS
}

/** "Hoy", "Ayer", "Hace 5 días"… */
export function textoActividad(dias: number | null): string {
  if (dias === null) return 'Sin datos'
  if (dias === 0) return 'Hoy'
  if (dias === 1) return 'Ayer'
  return `Hace ${dias} días`
}

/**
 * ¿Le toca recordatorio? Las cinco condiciones a la vez:
 *  1. tiene email y no se ha dado de baja de los avisos
 *  2. tiene un plan online activo (al presencial puro no se le avisa:
 *     no tiene contenido que usar, viene al centro)
 *  3. lleva DIAS_INACTIVIDAD días o más sin entrar
 *  4. no se le ha avisado ya en esta racha (el último aviso es anterior a
 *     su última entrada, o no hay aviso)
 */
export function pendienteDeAviso(
  p: {
    email: string | null
    recordatorios_email: boolean
    ultima_actividad: string | null
    aviso_inactividad_at: string | null
    tieneAccesoOnline: boolean
  },
  ahora = Date.now()
): boolean {
  if (!p.email || !p.recordatorios_email || !p.tieneAccesoOnline) return false
  const dias = diasDesde(p.ultima_actividad, ahora)
  if (dias === null || dias < DIAS_INACTIVIDAD) return false
  if (p.aviso_inactividad_at && p.ultima_actividad) {
    return new Date(p.aviso_inactividad_at).getTime() < new Date(p.ultima_actividad).getTime()
  }
  return true
}
