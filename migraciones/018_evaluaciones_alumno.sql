-- ============================================================
--  FÍSICAS ÉLITE — Migración 018 · Evaluaciones del alumno
--
--  La tabla 'evaluaciones' se creó en la 014 y lleva desde entonces
--  vacía y sin usar. Ahora se pone en marcha: cada 6 semanas el alumno
--  sube un vídeo haciendo la prueba de verdad y el preparador lo corrige.
--
--  La 014 le dio políticas de LEER (propio o admin), CREAR (propio) y
--  ACTUALIZAR (solo admin). Falta una: BORRAR.
--
--  ¿Por qué hace falta? Porque el alumno sube un vídeo desde el móvil y
--  se equivoca: sube el que no era, o sale cortado. Sin política de
--  borrado se queda ahí para siempre y el preparador corrige un vídeo
--  que no vale. Solo puede borrar los SUYOS y solo si están PENDIENTES:
--  una vez el preparador la ha revisado, el feedback no se borra.
--
--  Aditiva: no toca datos ni columnas.
-- ============================================================

drop policy if exists "evaluaciones: borrar propia pendiente" on public.evaluaciones;

create policy "evaluaciones: borrar propia pendiente" on public.evaluaciones
  for delete using (
    (user_id = auth.uid() and estado = 'pendiente')
    or public.es_admin()
  );


-- Índice para la bandeja del preparador: las pendientes, las más
-- antiguas primero. La 014 ya indexó (user_id, fecha_examen) y (estado),
-- pero no el par que se consulta de verdad en el panel.
create index if not exists idx_eval_estado_fecha
  on public.evaluaciones (estado, fecha_examen desc);


-- ------------------------------------------------------------
--  COMPROBACIÓN (opcional)
-- ------------------------------------------------------------
-- select policyname, cmd from pg_policies
-- where schemaname = 'public' and tablename = 'evaluaciones'
-- order by policyname;

-- ============================================================
--  FIN migración 018
-- ============================================================
