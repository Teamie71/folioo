-- ============================================================
-- AI 에이전트 일일 사용 한도 원장
-- 턴(request_id) 단위로 1행. 티켓 발급 시 차감하고, AI 서버가 실패를 알리면
-- failed=true로 바꿔 사용 횟수에서 제외한다. usage_date는 KST 기준 날짜.
-- ============================================================
CREATE TABLE ai_agent_usage (
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    request_id UUID NOT NULL,
    usage_date DATE NOT NULL,
    failed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, request_id)
);

CREATE INDEX idx_ai_agent_usage_user_id_usage_date ON ai_agent_usage(user_id, usage_date);
