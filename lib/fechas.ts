// Fechas en horario de España, en un solo sitio.
//
// Antes estas funciones estaban copiadas en seis archivos, y las copias NO
// eran iguales: `sumarMeses` de la ficha del admin cuidaba los finales de mes
// (31 ene + 1 mes = 28 feb) pero las del alta manual, la aprobación de
// solicitudes y el webhook de Stripe no (31 ene + 1 mes = 3 mar), así que el
// mismo plan acababa con fechas distintas según por dónde se contratara, y
// algunas regalaban días. Ahora hay una sola.
//
// Todas trabajan con fechas ISO 'yyyy-mm-dd' como TEXTO, sin horas.

/** Hoy en Madrid (evita el desfase de toISOString, que va en UTC). */
export function hoyMadrid(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(new Date())
}

/** La hora de Madrid ahora mismo, 'HH:MM'. */
export function horaMadrid(): string {
  return new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date())
}

/** Suma días a una fecha ISO (negativo = restar). */
export function sumarDias(fechaISO: string, dias: number): string {
  const [y, m, d] = fechaISO.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + dias)).toISOString().slice(0, 10)
}

/** 'yyyy-mm-dd' → "7 de octubre" (o "7 de octubre de 2027" si es de otro año). */
export function fechaLarga(fechaISO: string, hoy = hoyMadrid()): string {
  const [y, m, d] = fechaISO.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    ...(String(y) === hoy.slice(0, 4) ? {} : { year: 'numeric' }),
    timeZone: 'UTC',
  })
}

/** 'HH:MM:SS' o 'HH:MM' → "10:00" */
export function horaCorta(hora: string): string {
  return hora.slice(0, 5)
}

/**
 * Suma meses a una fecha ISO cuidando los finales de mes: si el mes de
 * destino es más corto, se queda en su último día (31 ene + 1 mes = 28 feb).
 */
export function sumarMeses(fechaISO: string, meses: number): string {
  const [y, m, d] = fechaISO.split('-').map(Number)
  const fecha = new Date(Date.UTC(y, m - 1, d))
  const diaOriginal = fecha.getUTCDate()
  fecha.setUTCMonth(fecha.getUTCMonth() + meses)
  // Si el día cambió, el mes destino era más corto: retrocede al último día
  if (fecha.getUTCDate() !== diaOriginal) fecha.setUTCDate(0)
  return fecha.toISOString().slice(0, 10)
}
