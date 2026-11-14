SET search_path TO citas;
ALTER TABLE "Product" ADD COLUMN "description" TEXT, ADD COLUMN "image" TEXT, ADD COLUMN "showInShop" BOOLEAN NOT NULL DEFAULT true;
