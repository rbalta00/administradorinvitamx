-- Creativos administrables desde el panel (brief "Creativos sin tocar código", Fase 1).
-- Agrega dos columnas JSON a la tabla `invitaciones`. La fila global de configuración
-- (id = '00000000-0000-0000-0000-000000000001') las usa para guardar las listas de fotos
-- listas y fondos listos. Ambas columnas son nulas por defecto: mientras estén nulas, la app
-- usa el respaldo de src/fotosListas.ts y src/fondosListos.ts.
-- Idempotente: se puede correr más de una vez sin efectos.

ALTER TABLE invitaciones ADD COLUMN IF NOT EXISTS fotos_listas jsonb;
ALTER TABLE invitaciones ADD COLUMN IF NOT EXISTS fondos_listos jsonb;
