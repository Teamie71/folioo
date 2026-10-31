-- ============================================================
-- 인증 토큰 저장소를 Redis(Upstash)에서 RDB로 이전
-- 리프레시 토큰 화이트리스트 + 액세스 토큰 블랙리스트를 한 테이블로 관리.
-- Redis TTL을 대체할 자동 삭제 배치는 없고, 조회 시 expires_at 필터로 만료를 판정한다.
-- token에는 원문 대신 SHA-256 digest를 저장한다.
-- ============================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'auth_token_type_enum'
          AND n.nspname = current_schema()
    ) THEN
        CREATE TYPE auth_token_type_enum AS ENUM ('REFRESH', 'ACCESS_BLACKLIST');
    END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS auth_token (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    type auth_token_type_enum NOT NULL,
    token TEXT NOT NULL,
    user_id INT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_auth_token_type_token ON auth_token (type, token);

-- Supabase 공개 API 역할이 인증 토큰을 읽거나 조작하지 못하도록 한다.
ALTER TABLE auth_token ENABLE ROW LEVEL SECURITY;
