SET search_path TO citas;
-- Google Calendar: cada profesional conecta su cuenta y sus citas se copian solas a su calendario.
ALTER TABLE "Staff" ADD COLUMN IF NOT EXISTS "gcalToken" TEXT;      -- refresh token cifrado (AES-GCM con AUTH_SECRET)
ALTER TABLE "Staff" ADD COLUMN IF NOT EXISTS "gcalEmail" TEXT;
ALTER TABLE "Staff" ADD COLUMN IF NOT EXISTS "gcalError" TEXT;
ALTER TABLE "Staff" ADD COLUMN IF NOT EXISTS "gcalSyncedAt" TIMESTAMP(3);
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "gcalEventId" TEXT;
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "gcalHash" TEXT;
