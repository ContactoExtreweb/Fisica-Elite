// Las oposiciones que se preparan, en un solo sitio.
//
// El mapa de nombres estaba copiado en media docena de archivos (dashboard,
// ficha de alumno, tabla, chat del admin, tarjetas de solicitud…) y cada vez
// que se añadía una había que acordarse de todas. Así pasó con 'aduanas',
// que faltaba en tres. Lo nuevo tira de aquí.
//
// La oposición es OPCIONAL para un alumno: puede entrenar solo categorías.

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

// ---------------------------------------------------------------------
//  FICHAS PÚBLICAS — las páginas /oposiciones/<slug>
//
//  OJO CON EL CONTENIDO: aquí NO se ponen marcas ni baremos concretos.
//  Cambian con cada convocatoria (y en Policía Local, con cada
//  ayuntamiento), así que publicar un número que luego no cuadre es peor
//  que no publicarlo. Se describen las PRUEBAS, no las marcas, y cada
//  página lo dice claramente.
// ---------------------------------------------------------------------

export type Prueba = { nombre: string; detalle: string }

export type FichaOposicion = {
  slug: string
  clave: Oposicion
  nombre: string
  titular: string
  entradilla: string
  /** Color del cuerpo, para que se note en qué página estás */
  color: string
  pruebas: Prueba[]
}

export const AVISO_BAREMO =
  'Las pruebas y las marcas exactas las fija cada convocatoria, y en Policía ' +
  'Local cambian de un ayuntamiento a otro. En la evaluación inicial miramos ' +
  'la tuya y ajustamos el plan a ese baremo concreto.'

export const FICHAS: FichaOposicion[] = [
  {
    slug: 'policia-local',
    clave: 'policia_local',
    nombre: 'Policía Local',
    titular: 'Preparación física para Policía Local',
    entradilla:
      'Cada ayuntamiento publica su propio circuito y sus propias marcas. Entrenamos el de tu convocatoria, no uno genérico.',
    color: '#1F5C99',
    pruebas: [
      {
        nombre: 'Circuito de agilidad',
        detalle:
          'La prueba que más gente suspende: cambios de dirección, obstáculos y coordinación bajo cronómetro. Se entrena por partes y luego completa.',
      },
      {
        nombre: 'Fuerza',
        detalle:
          'Según la convocatoria: dominadas, flexiones, lanzamiento de balón medicinal o salto. Trabajamos la que te toque.',
      },
      {
        nombre: 'Resistencia',
        detalle:
          'Carrera de fondo o course-navette. Se prepara con series y control de ritmo, no corriendo a ciegas.',
      },
    ],
  },
  {
    slug: 'policia-nacional',
    clave: 'policia_nacional',
    nombre: 'Policía Nacional',
    titular: 'Preparación física para Policía Nacional',
    entradilla:
      'Circuito de agilidad, fuerza de brazos y carrera de resistencia. Tres pruebas que se entrenan de forma muy distinta y hay que llevar a la vez.',
    color: '#123A6B',
    pruebas: [
      {
        nombre: 'Circuito de agilidad',
        detalle:
          'Técnica y velocidad de reacción. Se gana tiempo en los apoyos y los giros, y eso solo se corrige repitiendo con corrección.',
      },
      {
        nombre: 'Dominadas o suspensión en barra',
        detalle:
          'Fuerza de tracción. Es donde más se nota partir de cero, y también donde más rápido se mejora con un plan progresivo.',
      },
      {
        nombre: 'Carrera de resistencia',
        detalle: 'Fondo y control del ritmo, para llegar a la marca sin fundirte en la primera vuelta.',
      },
    ],
  },
  {
    slug: 'guardia-civil',
    clave: 'guardia_civil',
    nombre: 'Guardia Civil',
    titular: 'Preparación física para Guardia Civil',
    entradilla:
      'Velocidad, fuerza de brazos y resistencia aeróbica, más natación en las escalas que la exigen.',
    color: '#1B5236',
    pruebas: [
      {
        nombre: 'Velocidad',
        detalle: 'Salida, aceleración y técnica de carrera. Se entrena aparte del fondo, porque no es lo mismo.',
      },
      {
        nombre: 'Fuerza de brazos',
        detalle: 'Flexiones o dominadas según escala y sexo. Progresión por tramos hasta la marca que necesitas.',
      },
      {
        nombre: 'Resistencia aeróbica',
        detalle: 'Carrera de fondo, trabajada con series y ritmos, no solo acumulando kilómetros.',
      },
      {
        nombre: 'Natación',
        detalle: 'En las escalas que la incluyen. Técnica primero, marca después.',
      },
    ],
  },
  {
    slug: 'fuerzas-armadas',
    clave: 'fuerzas_armadas',
    nombre: 'Fuerzas Armadas',
    titular: 'Preparación física para las Fuerzas Armadas',
    entradilla:
      'Tropa, marinería, suboficiales y oficiales. Cada acceso tiene su tabla, y el plan se monta sobre la tuya.',
    color: '#4C5530',
    pruebas: [
      {
        nombre: 'Resistencia',
        detalle: 'Carrera de fondo o course-navette, según el acceso al que te presentes.',
      },
      {
        nombre: 'Fuerza de brazos',
        detalle: 'Flexiones o extensiones, con la técnica que sí cuenta como repetición válida.',
      },
      {
        nombre: 'Abdominales',
        detalle: 'Resistencia del core a repeticiones, con la ejecución exacta que piden en el examen.',
      },
      {
        nombre: 'Natación',
        detalle: 'Según cuerpo y escala. Si tu acceso la lleva, se entrena desde el principio.',
      },
    ],
  },
]

// Aduanas no tiene página propia todavía: se anuncia, no se vende.
export const ADUANAS_PROXIMAMENTE = {
  clave: 'aduanas' as Oposicion,
  nombre: 'Vigilancia Aduanera',
  color: '#3F4A57',
  entradilla:
    'Estamos preparando el temario físico específico del Servicio de Vigilancia Aduanera. Si te presentas, escríbenos y te avisamos en cuanto esté.',
}

// Emblema de cada cuerpo (public/logos). Fuerzas Armadas viene en SVG y
// es muy alto y estrecho; el resto son PNG casi cuadrados. Por eso se
// pintan con object-fit: contain sobre una placa clara, y así entran
// todos sin deformarse y se leen sobre cualquier color de fondo.
export const EMBLEMA: Record<string, string> = {
  policia_local: '/logos/policia_local.png',
  policia_nacional: '/logos/policia_nacional.png',
  guardia_civil: '/logos/guardia_civil.png',
  fuerzas_armadas: '/logos/fuerzas_armadas.svg',
}

export function fichaPorSlug(slug: string): FichaOposicion | undefined {
  return FICHAS.find((f) => f.slug === slug)
}

/** Slug de la página pública a partir del nombre que se pinta en la home. */
export function slugPorNombre(nombre: string): string | undefined {
  return FICHAS.find((f) => f.nombre === nombre)?.slug
}
