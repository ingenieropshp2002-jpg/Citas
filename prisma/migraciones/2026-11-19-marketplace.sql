SET search_path TO citas;
-- Marketplace: negocios destacados (los marca el superadmin) aparecen primero en el buscador.
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "featured" BOOLEAN NOT NULL DEFAULT false;
