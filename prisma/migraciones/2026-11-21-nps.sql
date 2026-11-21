-- Encuesta de satisfacción: pregunta NPS (0 a 10) junto con la reseña
ALTER TABLE citas."Review" ADD COLUMN IF NOT EXISTS "nps" integer;
CREATE INDEX IF NOT EXISTS "Review_businessId_createdAt_idx" ON citas."Review"("businessId", "createdAt");
