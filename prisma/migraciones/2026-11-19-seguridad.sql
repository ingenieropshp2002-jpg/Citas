SET search_path TO citas;
-- Verificación en dos pasos (TOTP: Google Authenticator, Microsoft Authenticator, Authy).
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "totpSecret" TEXT;          -- cifrado con AUTH_SECRET
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "totpEnabledAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "totpRecovery" TEXT;        -- JSON: hashes de los códigos de respaldo sin usar
