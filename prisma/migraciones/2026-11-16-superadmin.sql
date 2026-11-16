SET search_path TO citas;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "superAdmin" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "blocked" BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE IF NOT EXISTS "PlatformSetting" ("key" TEXT PRIMARY KEY, "value" TEXT NOT NULL, "updatedAt" TIMESTAMP(3) NOT NULL);
GRANT SELECT, INSERT, UPDATE, DELETE ON "PlatformSetting" TO citas_app;
REVOKE ALL ON "PlatformSetting" FROM anon, authenticated;
