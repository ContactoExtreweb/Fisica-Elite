// Utilidades para trabajar con las marcas del alumno.
//
// Cada categoría define QUÉ mide (metrica) y en qué UNIDAD, así que
// tanto el formulario como el histórico se construyen a partir de ahí.
// En base de datos guardamos siempre en unidades fijas:
//   · distancia_km  -> kilómetros
//   · tiempo_seg    -> segundos
// y al mostrar convertimos a la unidad de la categoría.

export type Metrica = 'repeticiones' | 'tiempo' | 'distancia' | 'peso'

export type RegistroFila = {
  id: string
  fecha: string
  repeticiones: number | null
  peso_kg: number | null
  distancia_km: number | null
  tiempo_seg: number | null
  series: Parcial[] | null
  notas: string | null
  categoria_id: string
}

export type Parcial = { metros: number; segundos: number }

/** ¿Esta categoría admite parciales por 100 m? Solo carrera/tiempo. */
export function admiteParciales(metrica: string) {
  return metrica === 'tiempo' || metrica === 'distancia'
}

/** Segundos -> "4:32" o "32,4 s" si es menos de un minuto. */
export function formateaTiempo(seg: number | null): string {
  if (seg === null || isNaN(seg)) return '—'
  if (seg < 60) {
    const s = Math.round(seg * 10) / 10
    return `${String(s).replace('.', ',')} s`
  }
  const min = Math.floor(seg / 60)
  const resto = Math.round(seg % 60)
  return `${min}:${String(resto).padStart(2, '0')}`
}

/** Distancia guardada en km -> texto en la unidad de la categoría. */
export function formateaDistancia(km: number | null, unidad: string): string {
  if (km === null || isNaN(km)) return '—'
  if (unidad === 'm') return `${Math.round(km * 1000)} m`
  const v = Math.round(km * 100) / 100
  return `${String(v).replace('.', ',')} ${unidad || 'km'}`
}

/**
 * Texto principal de una marca, según lo que mida su categoría.
 * Es lo que se ve grande en el histórico.
 */
export function textoMarca(
  r: Pick<RegistroFila, 'repeticiones' | 'peso_kg' | 'distancia_km' | 'tiempo_seg'>,
  metrica: string,
  unidad: string
): string {
  switch (metrica) {
    case 'tiempo':
      return formateaTiempo(r.tiempo_seg)
    case 'distancia':
      return formateaDistancia(r.distancia_km, unidad)
    case 'peso': {
      if (r.peso_kg === null) return '—'
      const p = `${String(Math.round(r.peso_kg * 10) / 10).replace('.', ',')} kg`
      return r.repeticiones ? `${p} × ${r.repeticiones}` : p
    }
    default:
      return r.repeticiones !== null ? `${r.repeticiones} ${unidad || 'reps'}` : '—'
  }
}

/** dd/mm/aaaa a partir de una fecha ISO (yyyy-mm-dd). */
export function fechaCorta(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

/** "Hoy", "Ayer" o la fecha corta. */
export function fechaRelativa(iso: string): string {
  const hoy = new Date()
  const ayer = new Date()
  ayer.setDate(hoy.getDate() - 1)
  const f = (d: Date) => d.toISOString().slice(0, 10)
  if (iso === f(hoy)) return 'Hoy'
  if (iso === f(ayer)) return 'Ayer'
  return fechaCorta(iso)
}
