-- ============================================================
--  FÍSICAS ÉLITE — Migración 035 · Rastro de avisos ya enviados
--
--  Los avisos de los plazos de pruebas reales («ya puedes subir tu vídeo»,
--  «te quedan 3 días») van a MUCHA gente a la vez: todos los alumnos con ese
--  plazo abierto. Como Resend admite ~2 correos por segundo y la tarea diaria
--  solo tiene 60 segundos, no caben todos en una ejecución: hay que poder
--  seguir mañana por donde se quedó, sin repetirle el aviso a nadie.
--
--  Esta tabla es solo eso: una clave por aviso ya entregado, del estilo
--  'ventana:<id>:abre:<user_id>'. Si la clave existe, ese aviso ya salió.
--
--  También sirve de red si la tarea diaria se ejecuta dos veces el mismo día
--  (Vercel puede reintentar): el segundo pase no manda nada.
--
--  SEGURIDAD: con RLS activada y SIN políticas, por la API no entra nadie.
--  La escribe y la lee solo la tarea diaria, que va con service_role.
--
--  Se puede aplicar antes o después de desplegar: si falta, los avisos de
--  plazos no salen (fallan cerrado) y el resto sigue funcionando igual.
-- ============================================================

create table if not exists public.avisos_enviados (
  clave      text primary key,
  created_at timestamptz not null default now()
);

alter table public.avisos_enviados enable row level security;

-- Para la limpieza periódica de la tarea diaria.
create index if not exists idx_avisos_enviados_fecha
  on public.avisos_enviados (created_at);

comment on table public.avisos_enviados is
  'Claves de avisos ya entregados, para no repetirlos al retomar un envío en varios días. Solo la toca el servidor con service_role.';

-- COMPROBACIÓN (debe salir la tabla con rowsecurity = true y 0 políticas)
select c.relrowsecurity as rls_activa,
       (select count(*) from pg_policies p
         where p.schemaname = 'public' and p.tablename = 'avisos_enviados') as politicas
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname = 'avisos_enviados';

-- ============================================================
--  FIN migración 035
-- ============================================================
