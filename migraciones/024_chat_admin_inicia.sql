-- ============================================================
--  FÍSICAS ÉLITE — Migración 024 · El admin puede iniciar el chat
--
--  EL PROBLEMA: hasta ahora la única política de INSERT en
--  'conversaciones' exige user_id = auth.uid() (el alumno crea SU
--  propia conversación al entrar en /chat por primera vez). Eso deja al
--  preparador sin forma de escribir el primero: hasta que el alumno no
--  manda un mensaje, no existe conversación que abrir.
--
--  LA SOLUCIÓN: una política de INSERT adicional, solo para admins, sin
--  restricción de user_id (puede abrir la conversación de cualquier
--  alumno). Las políticas PERMISSIVE de un mismo comando se combinan con
--  OR, así que esto se SUMA a la política existente del alumno sin
--  tocarla ni necesitar saber su nombre exacto.
--
--  La política de SELECT ya deja ver todas las conversaciones a
--  public.es_admin() (así funciona ya /admin/chat), así que no hace
--  falta tocarla.
--
--  Aditiva: una política nueva, nada se borra.
-- ============================================================

drop policy if exists "conversaciones: admin abre para cualquier alumno" on public.conversaciones;

create policy "conversaciones: admin abre para cualquier alumno"
  on public.conversaciones for insert
  with check (public.es_admin());

-- ============================================================
--  FIN migración 024
-- ============================================================
