// Limpia el formato "markdown" que los modelos pequeños se cuelan aunque
// se les pida texto normal. El chat pinta el texto TAL CUAL (por seguridad no
// interpreta HTML ni markdown), así que un "**hola**" se vería con los
// asteriscos. Aquí se quitan, y las viñetas pasan a puntos normales.
//
// Función pura, sin dependencias: se puede probar suelta.

export function limpiarFormato(texto: string): string {
  return (
    texto
      // bloques de código y código en línea
      .replace(/```[a-z]*\n?/gi, '')
      .replace(/`([^`\n]+)`/g, '$1')
      // negritas y cursivas: **x**, __x__, *x*, _x_ (solo pegadas al texto, para no
      // comerse asteriscos sueltos como en "5 * 3")
      .replace(/\*\*(\S(?:[^*\n]*\S)?)\*\*/g, '$1')
      .replace(/__(\S(?:[^_\n]*\S)?)__/g, '$1')
      .replace(/(^|[\s(])\*(\S(?:[^*\n]*\S)?)\*(?=[\s).,;:!?]|$)/g, '$1$2')
      // títulos ("## Algo") y viñetas ("* x", "- x") al inicio de línea
      .replace(/^\s{0,3}#{1,6}\s+/gm, '')
      .replace(/^\s*[*-]\s+/gm, '• ')
      // enlaces [texto](url) → "texto (url)"
      .replace(/\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)/g, '$1 ($2)')
      // muchas líneas en blanco seguidas → una
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  )
}
