import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Probar desde el móvil con `npm run dev` a través de la IP local
  // (http://192.168.1.xxx:3000) es un ORIGEN DISTINTO de localhost. Next 16
  // bloquea por seguridad las peticiones cruzadas a /_next/* en desarrollo,
  // así que el bundle de JavaScript no llega: la página se ve perfecta
  // (HTML y CSS sí cargan) pero NADA es interactivo. El síntoma típico es
  // el botón del menú móvil, que se pinta pero no abre.
  //
  // Esto solo afecta a desarrollo. En producción no pinta nada.
  allowedDevOrigins: [
    "192.168.1.143",
    "192.168.1.*", // por si el router cambia la IP
    "192.168.0.*",
  ],

  // Cabeceras de seguridad en TODAS las respuestas. Son las que no rompen nada:
  //  · nosniff: el navegador no adivina el tipo de un archivo.
  //  · SAMEORIGIN: nadie puede meter esta web en un <iframe> suyo (clickjacking).
  //    Los vídeos de Bunny son un iframe DENTRO de nuestra página, no al revés.
  //  · Referrer-Policy: a otras webs solo se les cuenta el dominio, no la ruta.
  //  · Permissions-Policy: la web no usa cámara, micro, ubicación ni pagos del
  //    navegador (Stripe es una redirección), así que se cierran. El vídeo a
  //    pantalla completa no se toca.
  // Pendiente a propósito: Content-Security-Policy. Bien hecha necesita nonces
  // para los scripts de Next y permitir Bunny, Supabase y Stripe; una a medias
  // rompería el vídeo o los pagos.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
