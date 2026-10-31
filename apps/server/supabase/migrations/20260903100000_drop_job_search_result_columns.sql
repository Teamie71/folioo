-- ============================================================
-- job_search_sessions.result/result_expires_at 제거
-- 직무 찾기 결과 산출은 별도 분석(assessment) 기능으로 대체되어
-- 이 컬럼들은 실제로 값이 채워진 적 없는 죽은 컬럼이었다.
-- ============================================================

ALTER TABLE job_search_sessions
    DROP COLUMN result,
    DROP COLUMN result_expires_at;
