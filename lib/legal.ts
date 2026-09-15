// Datos que aparecen en las páginas legales.
//
// ⚠️ TODO ESTO HAY QUE RELLENARLO ANTES DE LANZAR. Está en un solo sitio
// a propósito: se cambia aquí y se actualiza en aviso legal, privacidad y
// cookies a la vez.
//
// Los huecos sin rellenar se pintan resaltados en amarillo (ver la clase
// .legal-pendiente en globals.css), para que sea imposible publicar sin
// darse cuenta de que faltan.

/** Marca un dato que todavía no nos ha dado el cliente. */
export const FALTA = (que: string) => `[${que} — PENDIENTE]`

export const DATOS = {
  // --- Identificación del titular (obligatorio por la LSSI-CE art. 10) ---
  /** Nombre y apellidos si es autónomo, o razón social si es sociedad */
  titular: FALTA('NOMBRE O RAZÓN SOCIAL'),
  nif: FALTA('NIF/CIF'),
  domicilio: FALTA('DOMICILIO FISCAL COMPLETO'),
  email: FALTA('EMAIL DE CONTACTO'),
  telefono: FALTA('TELÉFONO'),
  /** Solo si es sociedad: datos registrales */
  registro: null as string | null,

  // --- Lo que ya sabemos ---
  marca: 'Físicas Élite',
  actividad: 'Preparación física para las pruebas de acceso a oposiciones',
  localidad: 'Cáceres',
  /** Se rellena al comprar el dominio */
  web: FALTA('DOMINIO'),
}

/** ¿Está todo relleno? Sirve para avisar en pantalla. */
export function hayDatosPendientes(): boolean {
  return Object.values(DATOS).some((v) => typeof v === 'string' && v.includes('PENDIENTE'))
}

export function estaPendiente(valor: string | null): boolean {
  return typeof valor === 'string' && valor.includes('PENDIENTE')
}

/**
 * Encargados del tratamiento: las empresas que tocan datos de los
 * alumnos por cuenta nuestra. Hay que listarlos en la política de
 * privacidad, con dónde están alojados.
 */
export const ENCARGADOS = [
  {
    nombre: 'Supabase',
    para: 'Base de datos y cuentas de usuario',
    donde: 'Unión Europea (Frankfurt, Alemania)',
    web: 'https://supabase.com/privacy',
  },
  {
    nombre: 'Vercel',
    para: 'Alojamiento de la web',
    donde: 'Unión Europea (Frankfurt) con sede en EE. UU.',
    web: 'https://vercel.com/legal/privacy-policy',
  },
  {
    nombre: 'Stripe',
    para: 'Cobro de los planes. No almacenamos datos de tarjeta',
    donde: 'Unión Europea e internacional',
    web: 'https://stripe.com/es/privacy',
  },
  {
    nombre: 'Bunny.net',
    para: 'Alojamiento y reproducción de los vídeos',
    donde: 'Unión Europea (Eslovenia)',
    web: 'https://bunny.net/privacy',
  },
]

/**
 * Datos personales que la plataforma recoge de verdad. Sale del esquema
 * real de la base de datos, no de una plantilla: si se añaden campos
 * nuevos, hay que actualizarlo aquí.
 */
export const DATOS_TRATADOS = [
  {
    grupo: 'Identificación y contacto',
    campos: 'Nombre, apellidos, correo electrónico, teléfono, edad y género.',
  },
  {
    grupo: 'Datos de entrenamiento',
    campos:
      'Peso, altura, material del que dispones para entrenar, oposición a la que te presentas y las marcas que vas registrando (repeticiones, tiempos, distancias y pesos).',
  },
  {
    grupo: 'Vídeos de evaluación',
    campos:
      'Los vídeos que subes cada cierto tiempo mostrando tu ejecución, y los comentarios de corrección de tu preparador.',
  },
  {
    grupo: 'Comunicaciones',
    campos: 'Los mensajes que intercambias con tu preparador por el chat de la plataforma.',
  },
  {
    grupo: 'Facturación',
    campos:
      'Los planes contratados y las fechas de acceso. El pago lo procesa Stripe: los datos de tu tarjeta no pasan por nuestros servidores ni los guardamos.',
  },
]
