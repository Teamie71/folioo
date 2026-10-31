-- ============================================================
-- 직무 찾기(job-search) 세션 테이블
-- 로그인 여부와 무관하게 UUID 토큰으로 진행상태를 추적하고,
-- 결과 조회는 이 토큰만으로 가능해 공유 링크로도 쓰인다(3일간 유효).
-- ============================================================

CREATE TABLE job_search_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INT NULL REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'VALUES_IN_PROGRESS',
    values_insertion_order JSONB NOT NULL,
    values_answer_log JSONB NOT NULL DEFAULT '[]',
    values_ranking JSONB NULL,
    values_weights JSONB NULL,
    values_completed_at TIMESTAMPTZ NULL,
    result JSONB NULL,
    result_expires_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_job_search_sessions_user_id ON job_search_sessions(user_id);
