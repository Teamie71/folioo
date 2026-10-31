-- GET /experience-map/commit/{request_id}는 경로에 user_id가 없어 request_id 단독으로 조회한다.
-- request_id는 메인 서버가 생성하는 UUID라 사실상 전역 유일하다.
CREATE INDEX idx_ai_commit_request_request_id ON ai_commit_request(request_id);
