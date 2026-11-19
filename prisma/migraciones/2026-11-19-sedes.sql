SET search_path TO citas;
-- Varias sedes en una sola cuenta: cada sede es un negocio con su agenda, equipo, caja e inventario;
-- comparte dueño y suscripción con la sede principal (parentId).
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "parentId" TEXT;
CREATE INDEX IF NOT EXISTS "Business_parentId_idx" ON "Business"("parentId");
CREATE INDEX IF NOT EXISTS "Business_ownerId_idx" ON "Business"("ownerId");
