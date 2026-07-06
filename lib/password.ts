// Generador de contraseñas seguras — SOLO servidor.
// crypto.randomInt es un CSPRNG (criptográficamente seguro).
// Jamás Math.random() para credenciales.
import 'server-only'
import { randomInt } from 'crypto'

// Sin caracteres ambiguos (I/l, O/0, 1) para poder dictarla por teléfono
const MAYUS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const MINUS = 'abcdefghijkmnpqrstuvwxyz'
const NUMS = '23456789'
const ESPECIALES = '!@#$%&*+-?'

export function generarPasswordSegura(longitud = 12): string {
  const todos = MAYUS + MINUS + NUMS + ESPECIALES

  // Garantiza al menos uno de cada grupo (cumple nuestra propia regla)
  const chars = [
    MAYUS[randomInt(MAYUS.length)],
    MINUS[randomInt(MINUS.length)],
    NUMS[randomInt(NUMS.length)],
    ESPECIALES[randomInt(ESPECIALES.length)],
  ]

  while (chars.length < longitud) {
    chars.push(todos[randomInt(todos.length)])
  }

  // Mezcla Fisher–Yates para no dejar los obligatorios al principio
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }

  return chars.join('')
}
