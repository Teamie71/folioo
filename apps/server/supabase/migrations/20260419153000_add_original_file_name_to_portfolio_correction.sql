ALTER TABLE "public"."portfolio_correction"
    ADD COLUMN IF NOT EXISTS "original_file_name" text;
