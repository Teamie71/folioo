-- ============================================================
-- ai_experience_session: 사용자당 1개 → 활동(EXPERIENCE 블록)당 1개
--
-- 기존 세션은 사용자 단위라 어느 활동에 속하는지 알 수 없으므로 폐기한다.
-- (ai_experience_request는 아직 애플리케이션에서 쓰지 않으며, FK 때문에 함께 비운다.)
-- 활동 블록이 삭제되면 세션 행도 함께 삭제된다.
-- ============================================================
DELETE FROM ai_experience_request;
DELETE FROM ai_experience_session;

ALTER TABLE ai_experience_session DROP CONSTRAINT ai_experience_session_pkey;

ALTER TABLE ai_experience_session
    ADD COLUMN block_id BIGINT NOT NULL,
    ADD COLUMN block_kind block_kind_enum NOT NULL DEFAULT 'EXPERIENCE' CHECK (block_kind = 'EXPERIENCE'),
    ADD PRIMARY KEY (user_id, block_id),
    ADD FOREIGN KEY (block_id, block_kind) REFERENCES block(id, kind) ON DELETE CASCADE;
