-- ============================================================
-- SECTION_* 카테고리 블록의 동시 생성 경쟁 조건 방지
-- 애플리케이션 레벨의 사전 조회(존재 여부 확인 후 생성)만으로는
-- 같은 EXPERIENCE에 동시에 두 개의 생성/이동 요청이 들어올 경우
-- 둘 다 "없음"을 보고 중복 SECTION을 저장할 수 있다.
-- 같은 parent_id(EXPERIENCE) 아래 같은 SECTION_* kind는 하나만
-- 존재하도록 partial unique index로 원자성을 보장한다.
-- ============================================================

-- Preflight: 기존 데이터에 이미 중복이 있으면 아래 CREATE UNIQUE INDEX가
-- 모호한 "could not create unique index" 에러로 실패하므로, 원인을 바로
-- 알 수 있도록 먼저 명확한 에러 메시지로 검증한다.
DO $$
DECLARE
    duplicate_count INT;
BEGIN
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT parent_id, kind
        FROM block
        WHERE kind IN (
            'SECTION_DETAIL',
            'SECTION_ACHIEVEMENT',
            'SECTION_TASK',
            'SECTION_PROBLEM_SOLVING',
            'SECTION_LEARNING'
        )
        GROUP BY parent_id, kind
        HAVING COUNT(*) > 1
    ) duplicates;

    IF duplicate_count > 0 THEN
        RAISE EXCEPTION
            'idx_block_unique_section_per_parent 생성 불가: 같은 parent_id에 동일 SECTION_* kind가 중복된 (parent_id, kind) 조합이 %건 있습니다. '
            '먼저 중복을 정리한 뒤(정리 대상 확인: SELECT parent_id, kind, array_agg(id) FROM block WHERE kind IN (''SECTION_DETAIL'',''SECTION_ACHIEVEMENT'',''SECTION_TASK'',''SECTION_PROBLEM_SOLVING'',''SECTION_LEARNING'') GROUP BY parent_id, kind HAVING COUNT(*) > 1;) 이 마이그레이션을 다시 실행하세요.',
            duplicate_count;
    END IF;
END $$;

CREATE UNIQUE INDEX idx_block_unique_section_per_parent
    ON block (parent_id, kind)
    WHERE kind IN (
        'SECTION_DETAIL',
        'SECTION_ACHIEVEMENT',
        'SECTION_TASK',
        'SECTION_PROBLEM_SOLVING',
        'SECTION_LEARNING'
    );
