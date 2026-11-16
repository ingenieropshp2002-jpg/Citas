SET search_path TO citas;
-- Día en que el dueño abrió la fila virtual desde el panel (se cierra sola al día siguiente).
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "queueOpenDate" TEXT;
