SET search_path TO citas;
CREATE TABLE IF NOT EXISTS "WaLog" (
  "id" TEXT PRIMARY KEY,
  "businessId" TEXT,
  "to" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "WaLog_createdAt_idx" ON "WaLog"("createdAt");
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'citas_app') THEN GRANT SELECT, INSERT, UPDATE, DELETE ON "WaLog" TO citas_app; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON "WaLog" FROM anon, authenticated; END IF;
END $$;
