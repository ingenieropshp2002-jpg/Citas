SET search_path TO citas;
-- App instalable de cada negocio: color y nombre corto bajo el ícono.
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "appColor" TEXT;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "appShortName" TEXT;
