SET search_path TO citas;
-- Renovación automática de la suscripción: tarjeta guardada en Wompi (fuente de pago) o suscripción de Mercado Pago.
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "autoRenew" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "billingPeriod" TEXT NOT NULL DEFAULT 'MENSUAL';
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "billingProvider" TEXT;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "billingRef" TEXT;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "billingCard" TEXT;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "billingEmail" TEXT;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "billingFails" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "billingLastTryAt" TIMESTAMP(3);
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "billingError" TEXT;
CREATE INDEX IF NOT EXISTS "Business_autoRenew_idx" ON "Business"("autoRenew") WHERE "autoRenew";
