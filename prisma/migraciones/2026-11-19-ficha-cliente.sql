SET search_path TO citas;
-- Ficha del cliente: alergias, fichas técnicas por visita (fórmulas de color) y fotos de antes y después.
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "allergies" TEXT;
CREATE TABLE IF NOT EXISTS "ClientRecord" (
  "id" TEXT PRIMARY KEY,
  "businessId" TEXT NOT NULL REFERENCES "Business"("id") ON DELETE CASCADE,
  "customerId" TEXT NOT NULL REFERENCES "Customer"("id") ON DELETE CASCADE,
  "appointmentId" TEXT,
  "staffName" TEXT,
  "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "service" TEXT,
  "formula" TEXT,
  "notes" TEXT,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "ClientRecord_customerId_date_idx" ON "ClientRecord"("customerId", "date");
CREATE TABLE IF NOT EXISTS "CustomerPhoto" (
  "id" TEXT PRIMARY KEY,
  "businessId" TEXT NOT NULL REFERENCES "Business"("id") ON DELETE CASCADE,
  "customerId" TEXT NOT NULL REFERENCES "Customer"("id") ON DELETE CASCADE,
  "recordId" TEXT REFERENCES "ClientRecord"("id") ON DELETE CASCADE,
  "kind" TEXT NOT NULL DEFAULT 'ANTES',
  "mime" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "data" BYTEA NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "CustomerPhoto_customerId_idx" ON "CustomerPhoto"("customerId");
CREATE INDEX IF NOT EXISTS "CustomerPhoto_recordId_idx" ON "CustomerPhoto"("recordId");
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'citas_app') THEN GRANT SELECT, INSERT, UPDATE, DELETE ON "ClientRecord", "CustomerPhoto" TO citas_app; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON "ClientRecord", "CustomerPhoto" FROM anon, authenticated; END IF;
END $$;
