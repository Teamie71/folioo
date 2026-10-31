-- ============================================================
-- 카카오톡 채널(챗봇) ↔ Folioo 계정 연결
-- 로그인 수단이 아니라 챗봇에서 사용자를 식별하는 용도. 카카오 계정 1개 ↔ Folioo 계정 1개.
-- 카카오 가입자는 첫 메시지 때 social_user(KAKAO)로 찾아 자동 생성된다.
-- current_block_id: 카톡에서 정리 중인 활동. 활동이 삭제되면 NULL.
-- activity_selected_at: 선택 이력. 활동 삭제 후에도 남겨 최초 미선택과 구별한다.
-- turn_request_id / turn_locked_until: 진행 중인 AI 턴 잠금. 만료 시각이 지나면 풀린 것으로 본다.
-- ============================================================
CREATE TABLE kakao_channel_link (
    user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    kakao_app_user_id VARCHAR(64) NOT NULL UNIQUE,
    current_block_id BIGINT NULL REFERENCES block(id) ON DELETE SET NULL,
    activity_selected_at TIMESTAMPTZ NULL,
    turn_request_id UUID NULL,
    turn_locked_until TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
