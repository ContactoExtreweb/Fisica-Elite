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
};

export default nextConfig;
