SET search_path TO citas;
-- Paquetes de sesiones, membresías mensuales y tarjetas de regalo.
CREATE TABLE IF NOT EXISTS "PrepaidPlan" (
  "id" TEXT PRIMARY KEY,
  "businessId" TEXT NOT NULL REFERENCES "Business"("id") ON DELETE CASCADE,
  "kind" TEXT NOT NULL DEFAULT 'PAQUETE',
  "name" TEXT NOT NULL,
  "description" TEXT,
  "price" INTEGER NOT NULL,
  "items" TEXT NOT NULL DEFAULT '[]',
  "validityDays" INTEGER NOT NULL DEFAULT 90,
  "discountPct" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "PrepaidPlan_businessId_idx" ON "PrepaidPlan"("businessId");
CREATE TABLE IF NOT EXISTS "Prepaid" (
  "id" TEXT PRIMARY KEY,
  "businessId" TEXT NOT NULL REFERENCES "Business"("id") ON DELETE CASCADE,
  "kind" TEXT NOT NULL,
  "planId" TEXT,
  "customerId" TEXT REFERENCES "Customer"("id") ON DELETE SET NULL,
  "code" TEXT,
  "name" TEXT NOT NULL,
  "price" INTEGER NOT NULL DEFAULT 0,
  "balance" INTEGER NOT NULL DEFAULT 0,
  "credits" TEXT NOT NULL DEFAULT '[]',
  "discountPct" INTEGER NOT NULL DEFAULT 0,
  "buyerName" TEXT,
  "recipientName" TEXT,
  "recipientPhone" TEXT,
  "message" TEXT,
  "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'ACTIVO',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "Prepaid_code_key" ON "Prepaid"("code");
CREATE INDEX IF NOT EXISTS "Prepaid_businessId_status_idx" ON "Prepaid"("businessId", "status");
CREATE INDEX IF NOT EXISTS "Prepaid_customerId_idx" ON "Prepaid"("customerId");
CREATE TABLE IF NOT EXISTS "PrepaidMove" (
  "id" TEXT PRIMARY KEY,
  "businessId" TEXT NOT NULL,
  "prepaidId" TEXT NOT NULL REFERENCES "Prepaid"("id") ON DELETE CASCADE,
  "type" TEXT NOT NULL,
  "amount" INTEGER NOT NULL DEFAULT 0,
  "method" TEXT,
  "cashSessionId" TEXT,
  "saleId" TEXT,
  "serviceId" TEXT,
  "note" TEXT,
  "userName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "PrepaidMove_prepaidId_idx" ON "PrepaidMove"("prepaidId");
CREATE INDEX IF NOT EXISTS "PrepaidMove_saleId_idx" ON "PrepaidMove"("saleId");
CREATE INDEX IF NOT EXISTS "PrepaidMove_cashSessionId_idx" ON "PrepaidMove"("cashSessionId");
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'citas_app') THEN GRANT SELECT, INSERT, UPDATE, DELETE ON "PrepaidPlan", "Prepaid", "PrepaidMove" TO citas_app; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON "PrepaidPlan", "Prepaid", "PrepaidMove" FROM anon, authenticated; END IF;
END $$;
