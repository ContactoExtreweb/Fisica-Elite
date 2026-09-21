-- ============================================================
--  FÍSICAS ÉLITE — Migración 031 · El formulario de contacto, solo por el servidor
--
--  La tabla mensajes_contacto tenía una política que dejaba INSERTAR a
--  cualquiera ("anon"). La clave anónima de Supabase va incluida en el
--  navegador, así que cualquiera podía saltarse el formulario de la web (y con
--  él su freno por IP y sus topes de tamaño) y llenar la tabla directamente
--  con la API, sin límite.
--
--  Ahora el formulario escribe desde el servidor con service_role
--  (app/contacto/actions.ts), que ya valida, limita por IP y acota el
--  tamaño. Esta migración quita la puerta directa.
--
--  ⚠️ ORDEN: primero DESPLIEGA el código y DESPUÉS aplica esta migración. Si se
--  aplica antes, el formulario de la versión antigua (que insertaba con la
--  clave anónima) dejaría de funcionar hasta el despliegue.
--
--  La lectura y la actualización siguen siendo solo de los admin (no cambian).
-- ============================================================

drop policy if exists "contacto: enviar" on public.mensajes_contacto;

-- ============================================================
--  FIN migración 031
-- ============================================================
