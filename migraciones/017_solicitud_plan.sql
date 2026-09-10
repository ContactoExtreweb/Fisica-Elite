-- ============================================================
--  FÍSICAS ÉLITE — Migración 017 · Qué plan se compró
--
--  EL PROBLEMA QUE ARREGLA:
--  Hasta ahora, cuando alguien pagaba desde la web, la solicitud no
--  guardaba NINGUNA referencia al plan contratado (no existía el campo).
--  Al tramitarla, procesarSolicitud() creaba la suscripción sin plan_id,
--  y una suscripción sin plan significa —por compatibilidad con la v1—
--  ACCESO A TODO. Es decir: quien pagaba 15 € por el plan de Dominadas
--  acababa con la plataforma entera.
--
--  Con esto, la solicitud lleva su plan desde el checkout hasta el alta.
--
--  Es una migración ADITIVA: no cambia RLS, no toca datos existentes y
--  no altera el comportamiento hasta que el código nuevo la use.
--  Las solicitudes antiguas se quedan con plan_id NULL, que sigue
--  significando lo de siempre.
-- ============================================================

-- 1 · El plan que se compró.
--     ON DELETE SET NULL: si el preparador borra un plan, no queremos
--     perder la solicitud ni el histórico del pago.
alter table public.solicitudes_alta
  add column if not exists plan_id uuid references public.planes(id) on delete set null;

-- 2 · Lo que pagó DE VERDAD, en céntimos.
--     Los precios de 'planes' cambian con el tiempo; sin esto, dentro de
--     seis meses no habría forma de saber cuánto cobramos por esta alta.
--     Se guarda el importe total (precio del plan × meses).
alter table public.solicitudes_alta
  add column if not exists importe_centimos int;

-- 3 · Índice para el listado del admin y para cruzar altas por plan.
create index if not exists idx_solicitudes_plan
  on public.solicitudes_alta (plan_id);


-- ------------------------------------------------------------
--  COMPROBACIÓN (opcional, para ver que ha entrado bien)
-- ------------------------------------------------------------
-- select column_name, data_type, is_nullable
-- from information_schema.columns
-- where table_schema = 'public' and table_name = 'solicitudes_alta'
--   and column_name in ('plan_id', 'importe_centimos');

-- ============================================================
--  FIN migración 017
-- ============================================================
