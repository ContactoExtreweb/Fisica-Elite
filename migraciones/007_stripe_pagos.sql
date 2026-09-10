-- ============================================================
--  FÍSICA ÉLITE — Migración 007 · Soporte de pagos Stripe
--
--  1. Tabla de eventos procesados (idempotencia): Stripe puede
--     entregar el mismo webhook varias veces. Guardamos el id del
--     evento y así no procesamos dos veces el mismo pago.
--  2. Campo para la sesión de Checkout en las solicitudes de alta.
-- ============================================================

-- 1 · Eventos de Stripe ya procesados (idempotencia)
create table if not exists public.stripe_eventos (
  id           text primary key,          -- el event.id de Stripe (evt_...)
  tipo         text,
  procesado_at timestamptz not null default now()
);

-- Solo el servidor (service_role) escribe aquí; nadie más lo necesita.
alter table public.stripe_eventos enable row level security;
-- Sin políticas => denegado para anon/authenticated. El webhook usa
-- service_role, que bypassa RLS.

-- 2 · Enlazar la solicitud con su sesión de Checkout
alter table public.solicitudes_alta
  add column if not exists stripe_session_id text,
  add column if not exists modalidad text;   -- 'pago_unico' | 'suscripcion'

-- Índice para buscar solicitudes por sesión (al volver de Stripe)
create index if not exists idx_solicitudes_session
  on public.solicitudes_alta (stripe_session_id);
