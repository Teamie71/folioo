-- 테이블 생성
CREATE TABLE withdrawn_user (
    id SERIAL PRIMARY KEY,
    encrypted_identifier VARCHAR(255) NOT NULL,
    withdrawn_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- 인덱스 생성
-- 1. 빠른 재가입 여부 확인 및 중복 삽입 방지용 유니크 인덱스
CREATE UNIQUE INDEX idx_withdrawn_user_identifier ON withdrawn_user(encrypted_identifier);

-- 2. 배치/스케줄러에서 만료된 데이터를 빠르게 지우기 위한 인덱스
CREATE INDEX idx_withdrawn_user_expires_at ON withdrawn_user(expires_at);

COMMENT ON TABLE withdrawn_user IS '탈퇴한 사용자 정보 보관 (재가입 차단용)';
COMMENT ON COLUMN withdrawn_user.encrypted_identifier IS '해싱된 사용자 식별자 (예: hash.v1:...)';
COMMENT ON COLUMN withdrawn_user.withdrawn_at IS '탈퇴 처리된 일시';
COMMENT ON COLUMN withdrawn_user.expires_at IS '데이터 파기 예정 일시 (탈퇴일 + 1년)';