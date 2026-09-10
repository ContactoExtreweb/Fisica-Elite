-- ============================================================
--  FÍSICA ÉLITE — Migración 009 · Nivel elegido por el usuario
--
--  Ahora es el USUARIO quien indica su nivel al pagar (él sabe si
--  viene de cero, con base, o casi listo), no el admin a ciegas.
--  Guardamos su elección; el admin la ve al tramitar y puede
--  ajustarla si hace falta.
-- ============================================================

alter table public.solicitudes_alta
  add column if not exists nivel_solicitado text;
