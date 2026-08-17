// Convierte un texto en slug: sin tildes, minúsculas, guiones.
// (Para categorías y planes; los ejercicios ya tienen su trigger en BBDD.)
export function slugify(txt: string): string {
  return txt
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
