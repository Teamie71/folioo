


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "public";






CREATE TYPE "public"."event_feedback_submission_review_status_enum" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'REWARDED'
);


ALTER TYPE "public"."event_feedback_submission_review_status_enum" OWNER TO "postgres";


CREATE TYPE "public"."event_feedback_submission_source_enum" AS ENUM (
    'GOOGLE_FORM',
    'IN_APP'
);


ALTER TYPE "public"."event_feedback_submission_source_enum" OWNER TO "postgres";


CREATE TYPE "public"."event_participation_reward_status_enum" AS ENUM (
    'NOT_GRANTED',
    'UNDER_REVIEW',
    'GRANTED',
    'REJECTED'
);


ALTER TYPE "public"."event_participation_reward_status_enum" OWNER TO "postgres";


CREATE TYPE "public"."experience_hope_job_enum" AS ENUM (
    'NONE',
    'PLANNING',
    'MARKETING',
    'DESIGN',
    'DEV',
    'MEDIA',
    'DATA'
);


ALTER TYPE "public"."experience_hope_job_enum" OWNER TO "postgres";


CREATE TYPE "public"."experience_status_enum" AS ENUM (
    'ON_CHAT',
    'GENERATE',
    'DONE'
);


ALTER TYPE "public"."experience_status_enum" OWNER TO "postgres";


CREATE TYPE "public"."insight_category_enum" AS ENUM (
    '대인관계',
    '문제해결',
    '학습',
    '레퍼런스',
    '기타'
);


ALTER TYPE "public"."insight_category_enum" OWNER TO "postgres";


CREATE TYPE "public"."payment_pay_type_enum" AS ENUM (
    'CARD',
    'PHONE',
    'BANK_TRANSFER',
    'VIRTUAL_ACCOUNT',
    'KAKAO_PAY',
    'NAVER_PAY',
    'TOSS_PAY'
);


ALTER TYPE "public"."payment_pay_type_enum" OWNER TO "postgres";


CREATE TYPE "public"."payment_status_enum" AS ENUM (
    'REQUESTED',
    'WAITING',
    'PAID',
    'CANCELLED',
    'REFUNDED',
    'PARTIAL_REFUNDED'
);


ALTER TYPE "public"."payment_status_enum" OWNER TO "postgres";


CREATE TYPE "public"."portfolio_correction_job_description_type_enum" AS ENUM (
    'TEXT',
    'IMAGE'
);


ALTER TYPE "public"."portfolio_correction_job_description_type_enum" OWNER TO "postgres";


CREATE TYPE "public"."portfolio_correction_status_enum" AS ENUM (
    'DONE',
    'NOT_STARTED',
    'DOING_RAG',
    'COMPANY_INSIGHT',
    'GENERATING'
);


ALTER TYPE "public"."portfolio_correction_status_enum" OWNER TO "postgres";


CREATE TYPE "public"."portfolio_source_type_enum" AS ENUM (
    'INTERNAL',
    'EXTERNAL'
);


ALTER TYPE "public"."portfolio_source_type_enum" OWNER TO "postgres";


CREATE TYPE "public"."social_user_login_type_enum" AS ENUM (
    'KAKAO',
    'NAVER',
    'GOOGLE',
    'APPLE'
);


ALTER TYPE "public"."social_user_login_type_enum" OWNER TO "postgres";


CREATE TYPE "public"."ticket_product_type_enum" AS ENUM (
    'EXPERIENCE',
    'PORTFOLIO_CORRECTION'
);


ALTER TYPE "public"."ticket_product_type_enum" OWNER TO "postgres";


CREATE TYPE "public"."ticket_source_enum" AS ENUM (
    'PURCHASE',
    'EVENT'
);


ALTER TYPE "public"."ticket_source_enum" OWNER TO "postgres";


CREATE TYPE "public"."ticket_status_enum" AS ENUM (
    'AVAILABLE',
    'USED',
    'EXPIRED'
);


ALTER TYPE "public"."ticket_status_enum" OWNER TO "postgres";


CREATE TYPE "public"."ticket_type_enum" AS ENUM (
    'EXPERIENCE',
    'PORTFOLIO_CORRECTION'
);


ALTER TYPE "public"."ticket_type_enum" OWNER TO "postgres";


CREATE TYPE "public"."user_agreement_term_type_enum" AS ENUM (
    'SERVICE',
    'PRIVACY',
    'MARKETING'
);


ALTER TYPE "public"."user_agreement_term_type_enum" OWNER TO "postgres";


CREATE TYPE "public"."users_social_type_enum" AS ENUM (
    'KAKAO',
    'NAVER',
    'GOOGLE',
    'APPLE'
);


ALTER TYPE "public"."users_social_type_enum" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."activity" (
    "id" integer NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "name" character varying(20) NOT NULL,
    "user_id" integer NOT NULL,
    "userId" integer
);


ALTER TABLE "public"."activity" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."activity_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."activity_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."activity_id_seq" OWNED BY "public"."activity"."id";



CREATE TABLE IF NOT EXISTS "public"."correction_item" (
    "id" integer NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "description" "jsonb",
    "responsibilities" "jsonb",
    "problem_solving" "jsonb",
    "learnings" "jsonb",
    "overall_review" "jsonb",
    "portfolio_correction_id" integer,
    "portfolio_id" integer
);


ALTER TABLE "public"."correction_item" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."correction_item_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."correction_item_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."correction_item_id_seq" OWNED BY "public"."correction_item"."id";



CREATE TABLE IF NOT EXISTS "public"."event" (
    "id" integer NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "code" character varying(50) NOT NULL,
    "title" character varying(100) NOT NULL,
    "description" character varying(500) NOT NULL,
    "cta_text" character varying(50) NOT NULL,
    "cta_link" character varying(255),
    "reward_config" "jsonb" NOT NULL,
    "goal_config" "jsonb",
    "ui_config" "jsonb",
    "ops_config" "jsonb",
    "start_date" "date" NOT NULL,
    "end_date" "date",
    "is_active" boolean DEFAULT true NOT NULL,
    "max_participation" integer DEFAULT 1 NOT NULL,
    "display_order" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."event" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_feedback_submission" (
    "id" integer NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "event_id" integer NOT NULL,
    "user_id" integer,
    "phone_num" character varying(20) NOT NULL,
    "source" "public"."event_feedback_submission_source_enum" DEFAULT 'GOOGLE_FORM'::"public"."event_feedback_submission_source_enum" NOT NULL,
    "external_submission_id" character varying(100),
    "review_status" "public"."event_feedback_submission_review_status_enum" DEFAULT 'PENDING'::"public"."event_feedback_submission_review_status_enum" NOT NULL,
    "reviewed_by" character varying(64),
    "reviewed_at" timestamp without time zone,
    "review_note" character varying(500),
    "rewarded_participation_id" integer
);


ALTER TABLE "public"."event_feedback_submission" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."event_feedback_submission_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."event_feedback_submission_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."event_feedback_submission_id_seq" OWNED BY "public"."event_feedback_submission"."id";



CREATE SEQUENCE IF NOT EXISTS "public"."event_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."event_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."event_id_seq" OWNED BY "public"."event"."id";



CREATE TABLE IF NOT EXISTS "public"."event_participation" (
    "id" integer NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "user_id" integer NOT NULL,
    "event_id" integer NOT NULL,
    "progress" integer DEFAULT 0 NOT NULL,
    "is_completed" boolean DEFAULT false NOT NULL,
    "completed_at" timestamp without time zone,
    "reward_granted_at" timestamp without time zone,
    "last_progressed_at" timestamp without time zone,
    "reward_status" "public"."event_participation_reward_status_enum" DEFAULT 'NOT_GRANTED'::"public"."event_participation_reward_status_enum" NOT NULL,
    "granted_by" character varying(64),
    "grant_reason" character varying(500)
);


ALTER TABLE "public"."event_participation" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."event_participation_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."event_participation_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."event_participation_id_seq" OWNED BY "public"."event_participation"."id";



CREATE TABLE IF NOT EXISTS "public"."experience" (
    "id" integer NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "name" character varying(20) NOT NULL,
    "hope_job" "public"."experience_hope_job_enum" DEFAULT 'NONE'::"public"."experience_hope_job_enum" NOT NULL,
    "status" "public"."experience_status_enum" DEFAULT 'ON_CHAT'::"public"."experience_status_enum" NOT NULL,
    "session_id" "uuid",
    "user_id" integer
);


ALTER TABLE "public"."experience" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."experience_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."experience_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."experience_id_seq" OWNED BY "public"."experience"."id";



CREATE TABLE IF NOT EXISTS "public"."insight" (
    "id" integer NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "title" character varying(20) NOT NULL,
    "category" "public"."insight_category_enum" DEFAULT '기타'::"public"."insight_category_enum" NOT NULL,
    "description" character varying(250) NOT NULL,
    "embedding" "public"."vector"(1536),
    "user_id" integer
);


ALTER TABLE "public"."insight" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."insight_activity" (
    "id" integer NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "insight_id" integer,
    "activity_id" integer
);


ALTER TABLE "public"."insight_activity" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."insight_activity_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."insight_activity_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."insight_activity_id_seq" OWNED BY "public"."insight_activity"."id";



CREATE SEQUENCE IF NOT EXISTS "public"."insight_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."insight_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."insight_id_seq" OWNED BY "public"."insight"."id";



CREATE TABLE IF NOT EXISTS "public"."payment" (
    "id" integer NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "user_id" integer NOT NULL,
    "ticket_product_id" integer NOT NULL,
    "mul_no" integer NOT NULL,
    "pay_url" character varying(255),
    "status" "public"."payment_status_enum" DEFAULT 'REQUESTED'::"public"."payment_status_enum" NOT NULL,
    "pay_type" "public"."payment_pay_type_enum",
    "amount" integer NOT NULL,
    "card_name" character varying(63),
    "pay_auth_code" character varying(63),
    "card_quota" character varying(31),
    "paid_at" timestamp without time zone,
    "cancelled_at" timestamp without time zone,
    "var1" character varying(127),
    "var2" character varying(127)
);


ALTER TABLE "public"."payment" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."payment_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."payment_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."payment_id_seq" OWNED BY "public"."payment"."id";



CREATE TABLE IF NOT EXISTS "public"."portfolio" (
    "id" integer NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "name" character varying(20) NOT NULL,
    "description" character varying(400) NOT NULL,
    "responsibilities" character varying(400) NOT NULL,
    "problem_solving" character varying(400) NOT NULL,
    "learnings" character varying(400) NOT NULL,
    "contribution_rate" integer,
    "source_type" "public"."portfolio_source_type_enum" DEFAULT 'INTERNAL'::"public"."portfolio_source_type_enum" NOT NULL,
    "user_id" integer,
    "experience_id" integer
);


ALTER TABLE "public"."portfolio" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."portfolio_correction" (
    "id" integer NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "title" character varying(20) NOT NULL,
    "company_name" character varying(20) NOT NULL,
    "position_name" character varying(20) NOT NULL,
    "job_description" character varying(700) NOT NULL,
    "job_description_type" "public"."portfolio_correction_job_description_type_enum" DEFAULT 'TEXT'::"public"."portfolio_correction_job_description_type_enum" NOT NULL,
    "company_insight" character varying(1500),
    "highlight_point" character varying(200),
    "extracted_text" "text",
    "extracted_at" timestamp with time zone,
    "status" "public"."portfolio_correction_status_enum" DEFAULT 'NOT_STARTED'::"public"."portfolio_correction_status_enum" NOT NULL,
    "user_id" integer
);


ALTER TABLE "public"."portfolio_correction" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."portfolio_correction_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."portfolio_correction_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."portfolio_correction_id_seq" OWNED BY "public"."portfolio_correction"."id";



CREATE SEQUENCE IF NOT EXISTS "public"."portfolio_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."portfolio_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."portfolio_id_seq" OWNED BY "public"."portfolio"."id";



CREATE TABLE IF NOT EXISTS "public"."social_user" (
    "id" integer NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "user_id" integer NOT NULL,
    "login_type" "public"."social_user_login_type_enum" NOT NULL,
    "login_id" character varying(255) NOT NULL,
    "email" character varying(255) NOT NULL
);


ALTER TABLE "public"."social_user" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."social_user_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."social_user_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."social_user_id_seq" OWNED BY "public"."social_user"."id";



CREATE TABLE IF NOT EXISTS "public"."ticket" (
    "id" integer NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "user_id" integer NOT NULL,
    "type" "public"."ticket_type_enum" NOT NULL,
    "status" "public"."ticket_status_enum" DEFAULT 'AVAILABLE'::"public"."ticket_status_enum" NOT NULL,
    "source" "public"."ticket_source_enum" NOT NULL,
    "payment_id" integer,
    "event_participation_id" integer,
    "used_at" timestamp without time zone,
    "expired_at" timestamp without time zone
);


ALTER TABLE "public"."ticket" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."ticket_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."ticket_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."ticket_id_seq" OWNED BY "public"."ticket"."id";



CREATE TABLE IF NOT EXISTS "public"."ticket_product" (
    "id" integer NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "type" "public"."ticket_product_type_enum" NOT NULL,
    "quantity" integer NOT NULL,
    "price" integer NOT NULL,
    "original_price" integer,
    "is_active" boolean DEFAULT true NOT NULL,
    "display_order" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."ticket_product" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."ticket_product_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."ticket_product_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."ticket_product_id_seq" OWNED BY "public"."ticket_product"."id";



CREATE TABLE IF NOT EXISTS "public"."user_agreement" (
    "id" integer NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "user_id" integer NOT NULL,
    "term_type" "public"."user_agreement_term_type_enum" NOT NULL,
    "version" character varying(10) NOT NULL,
    "is_agree" boolean NOT NULL,
    "agree_at" timestamp with time zone
);


ALTER TABLE "public"."user_agreement" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."user_agreement_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."user_agreement_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."user_agreement_id_seq" OWNED BY "public"."user_agreement"."id";



CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" integer NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "name" character varying(10) NOT NULL,
    "email" character varying(255) NOT NULL,
    "phone_num" character varying(11),
    "social_id" bigint NOT NULL,
    "social_type" "public"."users_social_type_enum" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "deactivated_at" timestamp without time zone
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."users_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."users_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."users_id_seq" OWNED BY "public"."users"."id";



ALTER TABLE ONLY "public"."activity" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."activity_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."correction_item" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."correction_item_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."event" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."event_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."event_feedback_submission" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."event_feedback_submission_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."event_participation" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."event_participation_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."experience" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."experience_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."insight" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."insight_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."insight_activity" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."insight_activity_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."payment" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."payment_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."portfolio" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."portfolio_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."portfolio_correction" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."portfolio_correction_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."social_user" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."social_user_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."ticket" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."ticket_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."ticket_product" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."ticket_product_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."user_agreement" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."user_agreement_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."users" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."users_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."portfolio_correction"
    ADD CONSTRAINT "PK_0b9e2f935b77563e79312de34ac" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."correction_item"
    ADD CONSTRAINT "PK_1f711b358d9722af3973ae0ed82" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."activity"
    ADD CONSTRAINT "PK_24625a1d6b1b089c8ae206fe467" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event"
    ADD CONSTRAINT "PK_30c2f3bbaf6d34a55f8ae6e4614" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ticket_product"
    ADD CONSTRAINT "PK_4981ea501c20a5a42c360b8fc90" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_agreement"
    ADD CONSTRAINT "PK_4c1274c70051683b21e41080f86" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."insight"
    ADD CONSTRAINT "PK_5463e33a58a28dc54d8fb7fea65" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."social_user"
    ADD CONSTRAINT "PK_587dc74adeb23357c4983c6374b" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."experience"
    ADD CONSTRAINT "PK_5e8d5a534100e1b17ee2efa429a" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."portfolio"
    ADD CONSTRAINT "PK_6936bb92ca4b7cda0ff28794e48" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_feedback_submission"
    ADD CONSTRAINT "PK_6fad27b3c172631005f5f72f155" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."insight_activity"
    ADD CONSTRAINT "PK_b2e6387003576f400713013d4a3" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ticket"
    ADD CONSTRAINT "PK_d9a0835407701eb86f874474b7c" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_participation"
    ADD CONSTRAINT "PK_dad6ba1ce561d80b835e3556750" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment"
    ADD CONSTRAINT "PK_fcaec7df5adf9cac408c686b2ab" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."portfolio"
    ADD CONSTRAINT "REL_8ff3f953d79d20ecf96df77fd2" UNIQUE ("experience_id");



ALTER TABLE ONLY "public"."payment"
    ADD CONSTRAINT "UQ_063661f0545d58d1149e00aa6fc" UNIQUE ("mul_no");



ALTER TABLE ONLY "public"."experience"
    ADD CONSTRAINT "UQ_36a96ce557281d6f9cad36504ed" UNIQUE ("session_id");



ALTER TABLE ONLY "public"."event"
    ADD CONSTRAINT "UQ_58f788de12432757f10c683bbd6" UNIQUE ("code");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "UQ_64f43e0581824cff0e78a377c1d" UNIQUE ("phone_num");



ALTER TABLE ONLY "public"."activity"
    ADD CONSTRAINT "UQ_77999f8043a52cd4470a4e3666a" UNIQUE ("name", "userId");



ALTER TABLE ONLY "public"."event_feedback_submission"
    ADD CONSTRAINT "UQ_871347efebd58a12aa2b520670b" UNIQUE ("event_id", "external_submission_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email");



ALTER TABLE ONLY "public"."event_participation"
    ADD CONSTRAINT "UQ_9a8145342814a571bf8f28aa980" UNIQUE ("user_id", "event_id");



ALTER TABLE ONLY "public"."experience"
    ADD CONSTRAINT "UQ_e55f41831b7994c40436b074b4e" UNIQUE ("user_id", "name");



CREATE INDEX "IDX_080fdcb740809a21228fccaf67" ON "public"."ticket" USING "btree" ("payment_id");



CREATE INDEX "IDX_17707dd6dacebe56cfc9bcd955" ON "public"."ticket" USING "btree" ("event_participation_id");



CREATE INDEX "IDX_19e82777e5913cacd93d58c227" ON "public"."event_feedback_submission" USING "btree" ("event_id");



CREATE INDEX "IDX_21eae005fe4d32ae239d5eb3b6" ON "public"."payment" USING "btree" ("ticket_product_id");



CREATE INDEX "IDX_368610dc3312f9b91e9ace4035" ON "public"."ticket" USING "btree" ("user_id");



CREATE INDEX "IDX_536ed25e43001198bc2520e76e" ON "public"."event_feedback_submission" USING "btree" ("user_id");



CREATE INDEX "IDX_64955c7dd0b473feb277778cea" ON "public"."event_participation" USING "btree" ("event_id");



CREATE INDEX "IDX_6726d52109b16c008e1f49bf78" ON "public"."event_participation" USING "btree" ("user_id");



CREATE INDEX "IDX_9f6c8c81541ad2897bb0055ad9" ON "public"."social_user" USING "btree" ("user_id");



CREATE INDEX "IDX_ab2f57a1554d80897ed179bf00" ON "public"."user_agreement" USING "btree" ("user_id");



CREATE INDEX "IDX_c66c60a17b56ec882fcd8ec770" ON "public"."payment" USING "btree" ("user_id");



CREATE INDEX "IDX_d41c13d3937a1f0740bf8f36fb" ON "public"."event_feedback_submission" USING "btree" ("phone_num");



ALTER TABLE ONLY "public"."ticket"
    ADD CONSTRAINT "FK_080fdcb740809a21228fccaf674" FOREIGN KEY ("payment_id") REFERENCES "public"."payment"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."ticket"
    ADD CONSTRAINT "FK_17707dd6dacebe56cfc9bcd955a" FOREIGN KEY ("event_participation_id") REFERENCES "public"."event_participation"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."event_feedback_submission"
    ADD CONSTRAINT "FK_19e82777e5913cacd93d58c227b" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."insight"
    ADD CONSTRAINT "FK_20b0c6bcec3def745b44af094d6" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment"
    ADD CONSTRAINT "FK_21eae005fe4d32ae239d5eb3b66" FOREIGN KEY ("ticket_product_id") REFERENCES "public"."ticket_product"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."correction_item"
    ADD CONSTRAINT "FK_2e8574b784189551a1f5b1acd4e" FOREIGN KEY ("portfolio_correction_id") REFERENCES "public"."portfolio_correction"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."activity"
    ADD CONSTRAINT "FK_3571467bcbe021f66e2bdce96ea" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ticket"
    ADD CONSTRAINT "FK_368610dc3312f9b91e9ace40354" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_feedback_submission"
    ADD CONSTRAINT "FK_536ed25e43001198bc2520e76ef" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."experience"
    ADD CONSTRAINT "FK_62c0623650986849f3fc1d148e7" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_participation"
    ADD CONSTRAINT "FK_64955c7dd0b473feb277778cea5" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_participation"
    ADD CONSTRAINT "FK_6726d52109b16c008e1f49bf78d" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."portfolio"
    ADD CONSTRAINT "FK_89055af4a272bb99a3d3ed2f247" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."insight_activity"
    ADD CONSTRAINT "FK_8ce610e80250f09809fdefed6d4" FOREIGN KEY ("activity_id") REFERENCES "public"."activity"("id");



ALTER TABLE ONLY "public"."portfolio"
    ADD CONSTRAINT "FK_8ff3f953d79d20ecf96df77fd27" FOREIGN KEY ("experience_id") REFERENCES "public"."experience"("id");



ALTER TABLE ONLY "public"."correction_item"
    ADD CONSTRAINT "FK_9d73336f13329d0c7932fa24455" FOREIGN KEY ("portfolio_id") REFERENCES "public"."portfolio"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."social_user"
    ADD CONSTRAINT "FK_9f6c8c81541ad2897bb0055ad9f" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_agreement"
    ADD CONSTRAINT "FK_ab2f57a1554d80897ed179bf001" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."portfolio_correction"
    ADD CONSTRAINT "FK_c1f7360770369f02cae36871027" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment"
    ADD CONSTRAINT "FK_c66c60a17b56ec882fcd8ec770b" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."insight_activity"
    ADD CONSTRAINT "FK_d56a715a1f99971dd39d546e1a6" FOREIGN KEY ("insight_id") REFERENCES "public"."insight"("id");



ALTER TABLE "public"."activity" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."correction_item" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_feedback_submission" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."event_participation" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."experience" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."insight" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."insight_activity" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."portfolio" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."portfolio_correction" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."social_user" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ticket" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ticket_product" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_agreement" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "postgres";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "anon";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "authenticated";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "postgres";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "anon";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "authenticated";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "service_role";












GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "service_role";









GRANT ALL ON TABLE "public"."activity" TO "anon";
GRANT ALL ON TABLE "public"."activity" TO "authenticated";
GRANT ALL ON TABLE "public"."activity" TO "service_role";



GRANT ALL ON SEQUENCE "public"."activity_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."activity_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."activity_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."correction_item" TO "anon";
GRANT ALL ON TABLE "public"."correction_item" TO "authenticated";
GRANT ALL ON TABLE "public"."correction_item" TO "service_role";



GRANT ALL ON SEQUENCE "public"."correction_item_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."correction_item_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."correction_item_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."event" TO "anon";
GRANT ALL ON TABLE "public"."event" TO "authenticated";
GRANT ALL ON TABLE "public"."event" TO "service_role";



GRANT ALL ON TABLE "public"."event_feedback_submission" TO "anon";
GRANT ALL ON TABLE "public"."event_feedback_submission" TO "authenticated";
GRANT ALL ON TABLE "public"."event_feedback_submission" TO "service_role";



GRANT ALL ON SEQUENCE "public"."event_feedback_submission_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."event_feedback_submission_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."event_feedback_submission_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."event_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."event_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."event_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."event_participation" TO "anon";
GRANT ALL ON TABLE "public"."event_participation" TO "authenticated";
GRANT ALL ON TABLE "public"."event_participation" TO "service_role";



GRANT ALL ON SEQUENCE "public"."event_participation_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."event_participation_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."event_participation_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."experience" TO "anon";
GRANT ALL ON TABLE "public"."experience" TO "authenticated";
GRANT ALL ON TABLE "public"."experience" TO "service_role";



GRANT ALL ON SEQUENCE "public"."experience_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."experience_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."experience_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."insight" TO "anon";
GRANT ALL ON TABLE "public"."insight" TO "authenticated";
GRANT ALL ON TABLE "public"."insight" TO "service_role";



GRANT ALL ON TABLE "public"."insight_activity" TO "anon";
GRANT ALL ON TABLE "public"."insight_activity" TO "authenticated";
GRANT ALL ON TABLE "public"."insight_activity" TO "service_role";



GRANT ALL ON SEQUENCE "public"."insight_activity_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."insight_activity_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."insight_activity_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."insight_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."insight_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."insight_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."payment" TO "anon";
GRANT ALL ON TABLE "public"."payment" TO "authenticated";
GRANT ALL ON TABLE "public"."payment" TO "service_role";



GRANT ALL ON SEQUENCE "public"."payment_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."payment_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."payment_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."portfolio" TO "anon";
GRANT ALL ON TABLE "public"."portfolio" TO "authenticated";
GRANT ALL ON TABLE "public"."portfolio" TO "service_role";



GRANT ALL ON TABLE "public"."portfolio_correction" TO "anon";
GRANT ALL ON TABLE "public"."portfolio_correction" TO "authenticated";
GRANT ALL ON TABLE "public"."portfolio_correction" TO "service_role";



GRANT ALL ON SEQUENCE "public"."portfolio_correction_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."portfolio_correction_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."portfolio_correction_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."portfolio_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."portfolio_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."portfolio_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."social_user" TO "anon";
GRANT ALL ON TABLE "public"."social_user" TO "authenticated";
GRANT ALL ON TABLE "public"."social_user" TO "service_role";



GRANT ALL ON SEQUENCE "public"."social_user_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."social_user_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."social_user_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."ticket" TO "anon";
GRANT ALL ON TABLE "public"."ticket" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket" TO "service_role";



GRANT ALL ON SEQUENCE "public"."ticket_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."ticket_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."ticket_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."ticket_product" TO "anon";
GRANT ALL ON TABLE "public"."ticket_product" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_product" TO "service_role";



GRANT ALL ON SEQUENCE "public"."ticket_product_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."ticket_product_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."ticket_product_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_agreement" TO "anon";
GRANT ALL ON TABLE "public"."user_agreement" TO "authenticated";
GRANT ALL ON TABLE "public"."user_agreement" TO "service_role";



GRANT ALL ON SEQUENCE "public"."user_agreement_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."user_agreement_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."user_agreement_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON SEQUENCE "public"."users_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."users_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."users_id_seq" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";



































drop extension if exists "pg_net";


