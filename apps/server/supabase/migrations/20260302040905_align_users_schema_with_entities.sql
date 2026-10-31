DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'users_status_enum'
          AND n.nspname = current_schema()
    ) THEN
        CREATE TYPE users_status_enum AS ENUM ('PENDING', 'ACTIVE');
    END IF;
END;
$$;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS status users_status_enum;

UPDATE users
SET status = CASE
    WHEN phone_num IS NULL THEN 'PENDING'::users_status_enum
    ELSE 'ACTIVE'::users_status_enum
END
WHERE status IS NULL;

ALTER TABLE users
    ALTER COLUMN status SET DEFAULT 'PENDING'::users_status_enum,
    ALTER COLUMN status SET NOT NULL;

ALTER TABLE users
    DROP COLUMN IF EXISTS social_id,
    DROP COLUMN IF EXISTS social_type;

DROP TYPE IF EXISTS users_social_type_enum;

ALTER TABLE users
    DROP COLUMN IF EXISTS email;

CREATE INDEX IF NOT EXISTS idx_social_user_login_type_login_id
    ON social_user (login_type, login_id);
