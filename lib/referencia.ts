// Genera una referencia de solicitud legible y fácil de dictar por
// teléfono. Formato: FE-XXXX-XXXX con alfabeto sin caracteres ambiguos
// (nada de I/O/0/1). SOLO servidor (usa el CSPRNG de Node).
import 'server-only'
import { randomInt } from 'crypto'

const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generarReferencia(): string {
  const bloque = () =>
    Array.from({ length: 4 }, () => ALFABETO[randomInt(ALFABETO.length)]).join('')
  return `FE-${bloque()}-${bloque()}`
}
