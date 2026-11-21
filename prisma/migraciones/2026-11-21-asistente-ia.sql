-- Asistente con IA por WhatsApp
ALTER TABLE citas."Business" ADD COLUMN IF NOT EXISTS "aiAssistant" boolean NOT NULL DEFAULT false;
ALTER TABLE citas."Business" ADD COLUMN IF NOT EXISTS "aiNotes" text;
CREATE TABLE IF NOT EXISTS citas."WaChat" (
  "id" text PRIMARY KEY,
  "businessId" text NOT NULL REFERENCES citas."Business"("id") ON DELETE CASCADE,
  "phone" text NOT NULL,
  "name" text,
  "messages" text NOT NULL DEFAULT '[]',
  "msgIds" text NOT NULL DEFAULT '[]',
  "day" text NOT NULL DEFAULT '',
  "dayCount" integer NOT NULL DEFAULT 0,
  "turns" integer NOT NULL DEFAULT 0,
  "bookings" integer NOT NULL DEFAULT 0,
  "inTokens" integer NOT NULL DEFAULT 0,
  "outTokens" integer NOT NULL DEFAULT 0,
  "humanUntil" timestamp(3),
  "lastError" text,
  "createdAt" timestamp(3) NOT NULL DEFAULT now(),
  "updatedAt" timestamp(3) NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "WaChat_businessId_phone_key" ON citas."WaChat"("businessId", "phone");
CREATE INDEX IF NOT EXISTS "WaChat_phone_updatedAt_idx" ON citas."WaChat"("phone", "updatedAt");
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'citas_app') THEN GRANT SELECT, INSERT, UPDATE, DELETE ON citas."WaChat" TO citas_app; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON citas."WaChat" FROM anon, authenticated; END IF;
END $$;
