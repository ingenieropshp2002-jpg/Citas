SET search_path TO citas;
-- "Avísame si se libera": personas esperando un horario apartado por otra.
CREATE TABLE IF NOT EXISTS "SlotWatch" (
  "id" TEXT PRIMARY KEY,
  "businessId" TEXT NOT NULL REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "staffId" TEXT NOT NULL,
  "start" TIMESTAMP(3) NOT NULL,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "serviceIds" TEXT NOT NULL DEFAULT '[]',
  "notifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "SlotWatch_staff_start_user" ON "SlotWatch"("staffId", "start", "userId");
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'citas_app') THEN GRANT SELECT, INSERT, UPDATE, DELETE ON "SlotWatch" TO citas_app; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON "SlotWatch" FROM anon, authenticated; END IF;
END $$;
