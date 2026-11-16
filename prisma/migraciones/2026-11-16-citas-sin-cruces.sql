-- Impide en la base de datos que un profesional tenga dos citas activas que se crucen,
-- aunque varias personas reserven el mismo horario al mismo tiempo.
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;
SET search_path TO citas, extensions, public;
ALTER TABLE "Appointment" DROP CONSTRAINT IF EXISTS "Appointment_sin_cruces";
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_sin_cruces"
  EXCLUDE USING gist ("staffId" WITH =, tsrange("start", "end") WITH &&) WHERE (status <> 'CANCELADA');
