SET search_path TO citas;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "reminderHourBefore" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "releaseUnconfirmed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "releaseBeforeMin" INTEGER NOT NULL DEFAULT 30;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "lateToleranceMin" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "depositInPeak" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "depositForNoShows" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "noShowLimit" INTEGER NOT NULL DEFAULT 2;
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "reminder1hSent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "arrivedLateMin" INTEGER;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "requireDeposit" BOOLEAN NOT NULL DEFAULT false;
-- Una cita marcada "no llegó" libera el horario para otra persona.
SET search_path TO citas, extensions, public;
ALTER TABLE "Appointment" DROP CONSTRAINT IF EXISTS "Appointment_sin_cruces";
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_sin_cruces"
  EXCLUDE USING gist ("staffId" WITH =, tsrange("start", "end") WITH &&) WHERE (status NOT IN ('CANCELADA', 'NO_ASISTIO'));
