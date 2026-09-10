-- ============================================================
--  FÍSICAS ÉLITE — Migración 016 · Borrado de registros
--
--  La 014 dejó a los registros de entrenamiento con políticas de
--  leer / crear / editar, pero sin BORRAR: si el alumno se equivocaba
--  al apuntar una marca, no podía deshacerla.
--
--  Requiere la 014 (y la 015) aplicadas.
-- ============================================================

drop policy if exists "registros: borrar propio o admin" on public.registros_entrenamiento;
create policy "registros: borrar propio o admin" on public.registros_entrenamiento
  for delete using ( user_id = auth.uid() or public.es_admin() );


-- Índice para el histórico del alumno (se consulta por usuario y fecha)
create index if not exists idx_registros_user_fecha
  on public.registros_entrenamiento (user_id, fecha desc);


-- ============================================================
--  FIN migración 016
-- ============================================================
