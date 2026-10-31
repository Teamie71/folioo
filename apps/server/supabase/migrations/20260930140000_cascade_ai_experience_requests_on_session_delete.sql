-- 활동 블록 삭제 시 세션과 요청 이력이 함께 삭제되도록 한다.
-- 기존 외래키는 요청 이력이 있는 세션의 삭제를 막아 블록 삭제도 실패하게 한다.
ALTER TABLE ai_experience_request
    DROP CONSTRAINT ai_experience_request_user_id_session_id_fkey,
    ADD CONSTRAINT ai_experience_request_user_id_session_id_fkey
        FOREIGN KEY (user_id, session_id)
        REFERENCES ai_experience_session(user_id, session_id)
        ON DELETE CASCADE;
