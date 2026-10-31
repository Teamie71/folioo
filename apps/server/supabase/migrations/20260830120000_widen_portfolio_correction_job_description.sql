-- ============================================================
-- 첨삭 생성 시 job_description(직무 설명/공고) 글자수 제한 확대: 700자 → 1000자
-- ============================================================

ALTER TABLE portfolio_correction ALTER COLUMN job_description TYPE VARCHAR(1000);
