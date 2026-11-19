SET search_path TO citas;
-- Comisiones: % por venta de productos, % propio por servicio y liquidaciones.
ALTER TABLE "Staff" ADD COLUMN IF NOT EXISTS "productCommissionPct" INTEGER NOT NULL DEFAULT 10;
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "commissionPct" INTEGER;
ALTER TABLE "SaleItem" ADD COLUMN IF NOT EXISTS "payoutId" TEXT;
CREATE TABLE IF NOT EXISTS "CommissionPayout" (
  "id" TEXT PRIMARY KEY,
  "businessId" TEXT NOT NULL REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "staffId" TEXT NOT NULL,
  "staffName" TEXT NOT NULL,
  "fromDate" TEXT NOT NULL,
  "toDate" TEXT NOT NULL,
  "servicesCount" INTEGER NOT NULL DEFAULT 0,
  "servicesBase" INTEGER NOT NULL DEFAULT 0,
  "servicesCommission" INTEGER NOT NULL DEFAULT 0,
  "productsCommission" INTEGER NOT NULL DEFAULT 0,
  "tips" INTEGER NOT NULL DEFAULT 0,
  "adjustment" INTEGER NOT NULL DEFAULT 0,
  "total" INTEGER NOT NULL,
  "method" TEXT NOT NULL DEFAULT 'EFECTIVO',
  "notes" TEXT,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "CommissionPayout_businessId_createdAt_idx" ON "CommissionPayout"("businessId", "createdAt");
CREATE INDEX IF NOT EXISTS "SaleItem_payoutId_idx" ON "SaleItem"("payoutId");
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'citas_app') THEN GRANT SELECT, INSERT, UPDATE, DELETE ON "CommissionPayout" TO citas_app; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON "CommissionPayout" FROM anon, authenticated; END IF;
END $$;
