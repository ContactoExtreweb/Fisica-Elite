-- ============================================================
--  FÍSICAS ÉLITE — Migración 027 · Reseñas iniciales (OPCIONAL)
--
--  Carga las siete reseñas de Google que el cliente pasó completas
--  (capturas del 21/09/2026). Requiere haber aplicado la 026.
--
--  Faltan DOS que en la captura salían cortadas con "… Más" (Estrella
--  Leal Suárez y Eva Cid Cabello): hay que abrirlas en Google, copiar el
--  texto entero y añadirlas desde /admin/resenas.
--
--  Los nombres ya son públicos en Google; si el cliente prefiere no
--  enseñarlos enteros, se pueden acortar ("Cecilia B.") desde el admin.
--
--  Solo inserta si la tabla está vacía: si se ejecuta dos veces, no
--  duplica nada.
-- ============================================================

insert into public.resenas (nombre, texto, puntuacion, origen, orden)
select v.nombre, v.texto, 5, 'Google', v.orden
from (values
  ('Cecilia Blanco Muñoz',
   'Centro de preparación física muy profesional. Se nota que saben exactamente lo que exigen las pruebas de policía. Entrenamientos exigentes, bien explicados y adaptados a cada nivel. Ideal para ir seguro y bien preparado a las oposiciones.',
   10),
  ('V.M',
   'Gente comprometida en lo que hace, buenos profesionales pendientes en todo momento que se cumplan los objetivos por los cuales vamos y se hagan bien los ejercicios. Más que recomendable.',
   20),
  ('Beatriz Lázaro Valhondo',
   'Servicio profesional y cercano, entrenamientos personalizados y seguimiento continuo. Muy buena experiencia y resultados visibles. Totalmente recomendable.',
   30),
  ('Roberto Blanco',
   'Preparación física de oposiciones de policía de 10. Entrenamientos bien planificados, seguimiento personalizado y un ambiente muy motivador. He mejorado mis marcas rápidamente y voy al examen con mucha más confianza. Totalmente recomendable.',
   40),
  ('Lucia Blanco',
   'Empecé a entrenar con ellos ya que los gimnasios de la ciudad siempre estaban llenos de gente, a las dos semanas ya el cambio era visible, súper recomendable 😊😊',
   50),
  ('Alejandro Pando',
   E'El mejor centro de entrenamiento, absoluta profesionalidad.\nMi lugar de confianza para la preparación de mi oposición',
   60),
  ('Aaron Alonso Paredes',
   'Es un máquina como persona y como profesional',
   70)
) as v(nombre, texto, orden)
where not exists (select 1 from public.resenas);

-- ============================================================
--  FIN migración 027
-- ============================================================
