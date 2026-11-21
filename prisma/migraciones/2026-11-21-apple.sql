-- Ingreso con Apple
ALTER TABLE citas."User" ADD COLUMN IF NOT EXISTS "appleId" text;
CREATE UNIQUE INDEX IF NOT EXISTS "User_appleId_key" ON citas."User"("appleId");
