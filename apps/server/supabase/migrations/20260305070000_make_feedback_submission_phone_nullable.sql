-- Admin UI에서 userId 기반 보상 지급 시 phoneNum이 불필요하므로 nullable로 변경
ALTER TABLE event_feedback_submission
    ALTER COLUMN phone_num DROP NOT NULL;

-- ADMIN_UI enum 값 추가 (TypeORM enum sync가 안 되는 경우 대비)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'ADMIN_UI'
        AND enumtypid = (
            SELECT oid FROM pg_type WHERE typname = 'event_feedback_submission_source_enum'
        )
    ) THEN
        ALTER TYPE event_feedback_submission_source_enum ADD VALUE 'ADMIN_UI';
    END IF;
END
$$;
