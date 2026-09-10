-- ============================================================
--  FÍSICA ÉLITE — Migración 008 · Referencia de solicitud
--
--  Número/código legible que se genera al pagar y se le muestra al
--  usuario. Sirve para que pueda contactar ("soy tal, referencia
--  FE-XXXX-XXXX") si el admin tarda, y para identificar el proceso
--  desde soporte/desarrollo.
-- ============================================================

alter table public.solicitudes_alta
  add column if not exists referencia text;

create index if not exists idx_solicitud_referencia
  on public.solicitudes_alta (referencia);
