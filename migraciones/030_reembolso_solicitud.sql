-- ============================================================
--  FÍSICAS ÉLITE — Migración 030 · Reembolso al rechazar una solicitud
--
--  El cliente lo anotó como opcional: al rechazar una solicitud de alta
--  pagada por la web, poder DEVOLVER el dinero desde el propio panel, en vez
--  de tener que ir al panel de Stripe a mano (ver rechazarYReembolsar en
--  app/admin/solicitudes/actions.ts).
--
--  Aquí solo se guarda la TRAZA de la devolución (id de Stripe y cuándo).
--  La solicitud sigue quedando como 'rechazada', así que no cambia ningún
--  estado ni ninguna política.
--
--  Aditiva y sin valores obligatorios. El código funciona aunque esta
--  migración no esté aplicada (la traza simplemente no se guarda).
-- ============================================================

alter table public.solicitudes_alta
  add column if not exists reembolso_id text,           -- re_... de Stripe
  add column if not exists reembolsado_at timestamptz;

-- ============================================================
--  FIN migración 030
-- ============================================================
