// Nombres bonitos de las oposiciones, en un solo sitio.
//
// Este mapa estaba copiado en media docena de archivos (dashboard, ficha
// de alumno, tabla, chat del admin, tarjetas de solicitud…) y cada vez que
// se añadía una oposición había que acordarse de todas. Así pasó con
// 'aduanas', que faltaba en tres sitios. Lo nuevo tira de aquí.
//
// La oposición es OPCIONAL: un alumno puede entrenar solo por categorías.

export const OPOSICIONES = [
  'policia_local',
  'policia_nacional',
  'guardia_civil',
  'fuerzas_armadas',
  'aduanas',
] as const

export type Oposicion = (typeof OPOSICIONES)[number]

export const NOMBRE_OPOSICION: Record<string, string> = {
  policia_local: 'Policía Local',
  policia_nacional: 'Policía Nacional',
  guardia_civil: 'Guardia Civil',
  fuerzas_armadas: 'Fuerzas Armadas',
  aduanas: 'Aduanas',
}

/** Nombre legible; si llega algo desconocido, devuelve el valor crudo. */
export function nombreOposicion(clave: string | null | undefined): string {
  if (!clave) return 'Sin oposición'
  return NOMBRE_OPOSICION[clave] ?? clave
}

export function esOposicionValida(v: string): boolean {
  return (OPOSICIONES as readonly string[]).includes(v)
}
