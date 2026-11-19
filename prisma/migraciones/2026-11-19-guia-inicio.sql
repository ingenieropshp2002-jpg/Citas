SET search_path TO citas;
-- Guía de primeros pasos del negocio: pasos marcados a mano y si la ocultó. JSON: { "done": string[], "hidden": boolean }
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "onboarding" TEXT NOT NULL DEFAULT '{}';
