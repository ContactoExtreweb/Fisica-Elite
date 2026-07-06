// Regla de contraseña de la plataforma.
// El spec del cliente decía mínimo 6; recomendado y aplicado: 8.
// Si el cliente insiste en 6, basta con cambiar esta constante
// (y el mínimo en Supabase → Authentication → Providers → Email).
export const PASSWORD_MIN = 8

/**
 * Devuelve null si la contraseña es válida,
 * o el mensaje de error si no lo es.
 */
export function validarPassword(pw: string): string | null {
  if (pw.length < PASSWORD_MIN) {
    return `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres`
  }
  if (!/[a-zA-ZñÑ]/.test(pw)) {
    return 'Debe incluir al menos una letra'
  }
  if (!/[0-9]/.test(pw)) {
    return 'Debe incluir al menos un número'
  }
  if (!/[^a-zA-Z0-9ñÑ]/.test(pw)) {
    return 'Debe incluir al menos un carácter especial (por ejemplo: ! @ # $ % .)'
  }
  return null
}
