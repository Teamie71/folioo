-- ============================================================
-- AI 커밋 멱등성 원장 (POST /experience-map/commit)
-- ai_commit_log는 되돌리기용으로 사용자당 최신 1건만 남기므로
-- (user_id, request_id) 단위 멱등 판정에는 쓸 수 없다. 별도 append-only 테이블로 둔다.
-- ============================================================
CREATE TABLE ai_commit_request (
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    request_id UUID NOT NULL,
    items_hash CHAR(64) NOT NULL,
    result JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, request_id)
);

-- 만료된 행을 배치로 정리할 때 사용
CREATE INDEX idx_ai_commit_request_created_at ON ai_commit_request(created_at);
