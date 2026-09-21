-- ============================================================
--  FÍSICAS ÉLITE — Migración 028 · Las dos reseñas que faltaban
--
--  En la 027 quedaron fuera las de Estrella Leal Suárez y Eva Cid Cabello
--  porque en la primera captura salían cortadas ("… Más"). Aquí van
--  enteras, con los saltos de párrafo que tienen en Google.
--
--  El primer párrafo de Estrella se ha unido de dos capturas: el inicio
--  ("Entrenar en este gym…") sale en la primera y el resto en la segunda;
--  se solapan en "Desde el primer día me sentí cómoda…".
--
--  Van al FINAL del orden (80 y 90), no arriba: son largas, y en la
--  rejilla del Inicio una tarjeta muy alta estira a las de su fila. Así el
--  Inicio (las 6 primeras) sigue con tarjetas parejas y "Sobre nosotros"
--  las enseña todas. Se pueden subir desde /admin/resenas cambiando el orden.
--
--  Idempotente: si ya existe una reseña con ese nombre, no la duplica.
-- ============================================================

insert into public.resenas (nombre, texto, puntuacion, origen, orden)
select v.nombre, v.texto, 5, 'Google', v.orden
from (values
  ('Estrella Leal Suárez',
   E'Entrenar en este gym ha sido una de las mejores decisiones que he tomado. Desde el primer día me sentí cómoda gracias al ambiente motivador y la buena vibra de todo el equipo. Las instalaciones están siempre limpias y el equipo es nuevo y bien cuidado.\n\nLos entrenadores son profesionales, atentos y siempre están dispuestos a ayudarte a mejorar tu técnica y alcanzar tus objetivos. Además, el ambiente es ideal tanto si eres principiante como si ya tienes experiencia.\n\nSin duda, es un lugar perfecto para entrenar, superarte y mantenerte constante. ¡Totalmente recomendado!',
   80),
  ('Eva Cid Cabello',
   E'Academia totalmente recomendable para preparar las pruebas físicas de oposiciones. En mi caso, he preparado las de Policía Nacional y no puedo estar más contenta con la experiencia.\nDestacan por sus excelentes instalaciones, muy bien equipadas y pensadas específicamente para el entrenamiento de las pruebas reales.\nEl equipo tiene muchísimos conocimientos, saben exactamente cómo preparar cada ejercicio y adaptarlo a tu nivel, corrigiendo técnica y ayudándote a mejorar desde el primer día.\nAdemás, el trato es cercano y motivador, te hacen sentir acompañada durante todo el proceso y se implican de verdad en tu progreso. Sin duda, una academia de confianza para quien se tome en serio las oposiciones.',
   90)
) as v(nombre, texto, orden)
where not exists (select 1 from public.resenas r where r.nombre = v.nombre);

-- ============================================================
--  FIN migración 028
-- ============================================================
