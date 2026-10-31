-- portfolio_correction 테이블에 overall_review 컬럼 추가
-- (첨삭 결과의 총평을 item 단위가 아닌 correction 단위로 저장)
ALTER TABLE portfolio_correction
    ADD COLUMN overall_review TEXT;

-- correction_item 테이블에서 overall_review 컬럼 제거
ALTER TABLE correction_item
    DROP COLUMN overall_review;
