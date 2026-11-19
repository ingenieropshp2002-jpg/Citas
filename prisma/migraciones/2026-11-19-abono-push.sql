SET search_path TO citas;
-- Abono por transferencia: plazo para pagar y datos de la cuenta del negocio.
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "depositDeadlineMin" INTEGER NOT NULL DEFAULT 60;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "transferInfo" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "depositDueAt" TIMESTAMP(3);
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "depositProofAt" TIMESTAMP(3);
-- Comprobantes guardados en privado (solo los ve el negocio y el cliente de la cita).
CREATE TABLE IF NOT EXISTS "DepositProof" (
  "id" TEXT PRIMARY KEY,
  "appointmentId" TEXT NOT NULL UNIQUE REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "businessId" TEXT NOT NULL REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "mime" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "data" BYTEA NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- Suscripciones Web Push (avisos con sonido al dueño y a los profesionales).
CREATE TABLE IF NOT EXISTS "PushSubscription" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "endpoint" TEXT NOT NULL UNIQUE,
  "p256dh" TEXT NOT NULL,
  "auth" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "PushSubscription_userId_idx" ON "PushSubscription"("userId");
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'citas_app') THEN GRANT SELECT, INSERT, UPDATE, DELETE ON "DepositProof", "PushSubscription" TO citas_app; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON "DepositProof", "PushSubscription" FROM anon, authenticated; END IF;
END $$;
