CREATE TYPE "public"."portfolio_status_enum" AS ENUM (
    'not_started',
    'generating',
    'completed',
    'failed'
);

ALTER TYPE "public"."portfolio_status_enum" OWNER TO "postgres";

ALTER TABLE "public"."portfolio"
    ADD COLUMN "status" "public"."portfolio_status_enum"
    NOT NULL DEFAULT 'not_started'::"public"."portfolio_status_enum";
