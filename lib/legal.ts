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
  return (
    Object.values(DATOS).some((v) => typeof v === 'string' && v.includes('PENDIENTE')) ||
    asistentePendiente()
  )
}

export function estaPendiente(valor: string | null): boolean {
  return typeof valor === 'string' && valor.includes('PENDIENTE')
}

/**
 * Correo y teléfono para enseñar en la web pública (contacto, pie y menú).
 *
 * Salen de DATOS, el mismo sitio que las páginas legales: se rellenan UNA vez
 * y aparecen en todas partes. Mientras el cliente no los haya dado, devuelven
 * null y la web NO los enseña: antes había un teléfono y un correo inventados
 * (600 00 00 00), y eso en una web en producción es peor que no poner nada.
 */
export function contactoPublico(): {
  email: string | null
  telefono: string | null
  /** Para href="tel:…": solo dígitos y el + inicial */
  telefonoHref: string | null
} {
  const email = estaPendiente(DATOS.email) ? null : DATOS.email
  const telefono = estaPendiente(DATOS.telefono) ? null : DATOS.telefono
  return {
    email,
    telefono,
    telefonoHref: telefono ? 'tel:' + telefono.replace(/[^d+]/g, '') : null,
  }
}

/**
 * Asistente virtual (chatbot). Solo entra en las páginas legales cuando
 * está activado (NEXT_PUBLIC_ASISTENTE=on, el mismo interruptor que pinta el
 * botón en la web): si no se ve, no se cuenta en la política de privacidad.
 *
 * ⚠️ Al activarlo hay que rellenar QUÉ PROVEEDOR de IA se usa y DÓNDE trata
 * los datos (mira sus condiciones: que no use las conversaciones para
 * entrenar sus modelos). Hasta entonces se ve resaltado como pendiente.
 */
export const ASISTENTE = {
  activo: process.env.NEXT_PUBLIC_ASISTENTE === 'on',
  proveedor: 'Mistral AI (Francia)',
  donde: 'Unión Europea (Francia)',
  /** Su política de privacidad; null = sin enlace hasta rellenarla */
  web: 'https://legal.mistral.ai/terms/privacy-policy' as string | null,
}

/** ¿Falta rellenar algo del asistente? (solo importa si está activado) */
export function asistentePendiente(): boolean {
  return ASISTENTE.activo && (estaPendiente(ASISTENTE.proveedor) || estaPendiente(ASISTENTE.donde))
}

type Encargado = { nombre: string; para: string; donde: string; web: string | null }

/**
 * Encargados del tratamiento: las empresas que tocan datos de los
 * alumnos por cuenta nuestra. Hay que listarlos en la política de
 * privacidad, con dónde están alojados.
 */
export const ENCARGADOS: Encargado[] = [
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
  {
    nombre: 'Resend',
    para: 'Envío de los correos de la plataforma, como los recordatorios de entrenamiento',
    donde: 'Unión Europea (Irlanda)',
    web: 'https://resend.com/legal/privacy-policy',
  },
  ...(ASISTENTE.activo
    ? [
        {
          nombre: ASISTENTE.proveedor,
          para: 'Generar las respuestas del asistente virtual. Recibe lo que escribes en el asistente y, si tienes abierta la ficha de un ejercicio, el texto de esa ficha (contenido de tu preparador), pero ningún dato de tu cuenta',
          donde: ASISTENTE.donde,
          web: ASISTENTE.web,
        },
      ]
    : []),
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
    grupo: 'Uso de la plataforma',
    campos:
      'La fecha de tu última visita, solo para avisarte si llevas tiempo sin entrenar. No registramos qué páginas visitas ni cuánto tiempo pasas en ellas.',
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
  ...(ASISTENTE.activo
    ? [
        {
          grupo: 'Asistente virtual',
          campos:
            'Lo que escribes en el asistente. No lo guardamos: se envía al proveedor de IA solo para generar la respuesta, sin ningún dato de tu cuenta (si tienes abierta la ficha de un ejercicio, se envía también el texto de esa ficha, que es contenido de tu preparador), y desaparece al cerrar o recargar la página. Para evitar abusos guardamos contadores de uso durante un máximo de dos días; en los visitantes sin cuenta, asociados a una huella cifrada de la dirección IP, no a la dirección en sí. Te pedimos que no escribas datos personales en el asistente.',
        },
      ]
    : []),
]
