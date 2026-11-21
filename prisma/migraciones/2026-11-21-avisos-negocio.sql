-- Avisos de citas al negocio por WhatsApp y resumen del día por profesional
ALTER TABLE citas."Business" ADD COLUMN IF NOT EXISTS "notifyTo" text NOT NULL DEFAULT 'RECEPCION';
ALTER TABLE citas."Business" ADD COLUMN IF NOT EXISTS "receptionWhatsapp" text;
ALTER TABLE citas."Staff" ADD COLUMN IF NOT EXISTS "whatsapp" text;
ALTER TABLE citas."Staff" ADD COLUMN IF NOT EXISTS "summaryDay" text;
