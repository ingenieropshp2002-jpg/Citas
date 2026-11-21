-- Mis citas sin cuenta: enlace personal anulable y límite de intentos por celular
CREATE TABLE IF NOT EXISTS citas."PhoneLink" (
  "phone" text PRIMARY KEY,
  "version" integer NOT NULL DEFAULT 0,
  "fails" integer NOT NULL DEFAULT 0,
  "lockedUntil" timestamp(3),
  "updatedAt" timestamp(3) NOT NULL DEFAULT now()
);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'citas_app') THEN GRANT SELECT, INSERT, UPDATE, DELETE ON citas."PhoneLink" TO citas_app; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON citas."PhoneLink" FROM anon, authenticated; END IF;
END $$;
