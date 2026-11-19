SET search_path TO citas;
-- Lista de espera por fecha y franja: cuando se libera un cupo que le sirve, se avisa sola (push y WhatsApp).
CREATE TABLE IF NOT EXISTS "WaitEntry" (
  "id" TEXT PRIMARY KEY,
  "businessId" TEXT NOT NULL REFERENCES "Business"("id") ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "staffId" TEXT,
  "serviceIds" TEXT NOT NULL DEFAULT '[]',
  "dateFrom" TEXT NOT NULL,
  "dateTo" TEXT NOT NULL,
  "window" TEXT NOT NULL DEFAULT 'CUALQUIERA',
  "phone" TEXT,
  "note" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVA',
  "notifyCount" INTEGER NOT NULL DEFAULT 0,
  "notifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "WaitEntry_business_status_idx" ON "WaitEntry"("businessId", "status", "dateFrom");
CREATE INDEX IF NOT EXISTS "WaitEntry_user_idx" ON "WaitEntry"("userId", "status");
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'citas_app') THEN GRANT SELECT, INSERT, UPDATE, DELETE ON "WaitEntry" TO citas_app; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON "WaitEntry" FROM anon, authenticated; END IF;
END $$;
