-- #327: Remove unused columns and tables from admin/event/ticket modules

-- 1. Drop event_feedback_submission table entirely
DROP TABLE IF EXISTS "event_feedback_submission" CASCADE;

-- 2. Drop unused enum type (event_feedback_submission dependencies)
DROP TYPE IF EXISTS "event_feedback_submission_source_enum" CASCADE;
DROP TYPE IF EXISTS "event_feedback_submission_review_status_enum" CASCADE;

-- 3. Remove unused columns from event table
ALTER TABLE "event" DROP COLUMN IF EXISTS "description";
ALTER TABLE "event" DROP COLUMN IF EXISTS "max_participation";
ALTER TABLE "event" DROP COLUMN IF EXISTS "goal_config";

-- 4. Remove unused columns from event_participation table
ALTER TABLE "event_participation" DROP COLUMN IF EXISTS "progress";
ALTER TABLE "event_participation" DROP COLUMN IF EXISTS "is_completed";
ALTER TABLE "event_participation" DROP COLUMN IF EXISTS "completed_at";
ALTER TABLE "event_participation" DROP COLUMN IF EXISTS "last_progressed_at";
ALTER TABLE "event_participation" DROP COLUMN IF EXISTS "granted_by";
ALTER TABLE "event_participation" DROP COLUMN IF EXISTS "grant_reason";

-- 5. Remove unused enum values from event_reward_status (idempotent)
DO $$
BEGIN
    -- Only run if old enum still has UNDER_REVIEW (i.e., not yet migrated)
    IF EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'UNDER_REVIEW'
        AND enumtypid = 'event_participation_reward_status_enum'::regtype
    ) THEN
        ALTER TYPE "event_participation_reward_status_enum"
            RENAME TO "event_participation_reward_status_enum_old";

        CREATE TYPE "event_participation_reward_status_enum" AS ENUM ('NOT_GRANTED', 'GRANTED');

        ALTER TABLE "event_participation"
            ALTER COLUMN "reward_status" DROP DEFAULT,
            ALTER COLUMN "reward_status" TYPE "event_participation_reward_status_enum"
                USING "reward_status"::text::"event_participation_reward_status_enum",
            ALTER COLUMN "reward_status" SET DEFAULT 'NOT_GRANTED';

        DROP TYPE "event_participation_reward_status_enum_old";
    END IF;
END $$;
