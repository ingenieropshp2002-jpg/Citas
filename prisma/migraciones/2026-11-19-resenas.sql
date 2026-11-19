SET search_path TO citas;
-- Pedido automático de reseña después de cada cita (WhatsApp + enlace a Google).
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "reviewEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "googleReviewUrl" TEXT;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "reviewDelayHours" INTEGER NOT NULL DEFAULT 2;
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "reviewRequestedAt" TIMESTAMP(3);
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "googleClickedAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "Appointment_review_pending_idx" ON "Appointment"("businessId", "status", "end") WHERE "reviewRequestedAt" IS NULL;
