-- AI 서버가 관리하는 메시지 테이블이 있는 환경에서는 활동 삭제 시 대화 이력도 정리한다.
-- 테이블이 없는 신규 환경에서는 건너뛴다.
ALTER TABLE IF EXISTS ai_experience_message
    DROP CONSTRAINT ai_experience_message_user_id_session_id_fkey,
    ADD CONSTRAINT ai_experience_message_user_id_session_id_fkey
        FOREIGN KEY (user_id, session_id)
        REFERENCES ai_experience_session(user_id, session_id)
        ON DELETE CASCADE;
