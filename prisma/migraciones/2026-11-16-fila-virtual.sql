SET search_path TO citas;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "queueEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "queueNotifyAhead" INTEGER NOT NULL DEFAULT 2;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "peakRules" TEXT NOT NULL DEFAULT '[]';
CREATE TABLE IF NOT EXISTS "WalkIn" (
  "id" TEXT PRIMARY KEY,
  "businessId" TEXT NOT NULL REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "number" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "phone" TEXT,
  "serviceId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ESPERANDO',
  "appointmentId" TEXT,
  "notifiedAt" TIMESTAMP(3),
  "calledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "WalkIn_businessId_createdAt_idx" ON "WalkIn"("businessId", "createdAt");
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'citas_app') THEN GRANT SELECT, INSERT, UPDATE, DELETE ON "WalkIn" TO citas_app; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON "WalkIn" FROM anon, authenticated; END IF;
END $$;
