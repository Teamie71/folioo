-- ============================================================
-- 경험 정리 개편(v3) - 블록 트리 스키마
-- 기존 experience/portfolio 스키마는 유지한 채 신규 스키마를 추가한다.
-- ============================================================

-- ============================================================
-- 1. block_kind_enum + block_kind (블록 종류 정의 테이블)
-- ============================================================
CREATE TYPE block_kind_enum AS ENUM (
    'GROUP_UNCATEGORIZED',
    'GROUP',
    'EXPERIENCE',
    'SECTION_DETAIL',
    'SECTION_ACHIEVEMENT',
    'SECTION_TASK',
    'SECTION_PROBLEM_SOLVING',
    'SECTION_LEARNING',
    'CONTENT'
);

CREATE TABLE block_kind (
    kind block_kind_enum PRIMARY KEY,
    is_text_editable BOOLEAN NOT NULL,
    is_deletable BOOLEAN NOT NULL,
    fixed_level SMALLINT NULL,
    placeholder TEXT NOT NULL
);

-- is_deletable 예외는 '미분류' 뿐이다 (SECTION_*은 편집만 불가하고 삭제는 가능).
INSERT INTO block_kind (kind, is_text_editable, is_deletable, fixed_level, placeholder) VALUES
    ('GROUP_UNCATEGORIZED',     false, false, 1,    '내용을 입력해 주세요'),
    ('GROUP',                   true,  true,  1,    '내용을 입력해 주세요'),
    ('EXPERIENCE',              true,  true,  2,    '내용을 입력해 주세요'),
    ('SECTION_DETAIL',          false, true,  3,    '내용을 입력해 주세요'),
    ('SECTION_ACHIEVEMENT',     false, true,  3,    '내용을 입력해 주세요'),
    ('SECTION_TASK',            false, true,  3,    '내용을 입력해 주세요'),
    ('SECTION_PROBLEM_SOLVING', false, true,  3,    '내용을 입력해 주세요'),
    ('SECTION_LEARNING',        false, true,  3,    '내용을 입력해 주세요'),
    ('CONTENT',                 true,  true,  NULL, '내용을 입력해 주세요');

-- ============================================================
-- 2. block (사용자 소유 블록 트리, 1~5단계)
-- ============================================================
CREATE TABLE block (
    id BIGSERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id BIGINT NULL REFERENCES block(id) ON DELETE CASCADE,
    level SMALLINT NOT NULL CHECK (level BETWEEN 1 AND 5),
    kind block_kind_enum NOT NULL REFERENCES block_kind(kind),
    position INT NOT NULL,
    content VARCHAR(500) NULL,
    placeholder TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (id, kind)
);

CREATE INDEX idx_block_user_id ON block(user_id);
CREATE INDEX idx_block_parent_id ON block(parent_id);

-- level 정합성(루트=1, 그 외는 부모 level+1) 및 parent 소유자 일치 검증 + updated_at 자동 갱신
-- (AI 커밋 엔진이 raw SQL로 트리를 갱신해도 항상 최신화되도록 DB 트리거로 보장)
CREATE OR REPLACE FUNCTION block_before_write() RETURNS TRIGGER AS $$
DECLARE
    parent_level SMALLINT;
    parent_user_id INT;
BEGIN
    IF NEW.parent_id IS NULL THEN
        IF NEW.level <> 1 THEN
            RAISE EXCEPTION 'root block (parent_id IS NULL) must have level = 1, got %', NEW.level;
        END IF;
    ELSE
        SELECT level, user_id INTO parent_level, parent_user_id FROM block WHERE id = NEW.parent_id;
        IF parent_level IS NULL THEN
            RAISE EXCEPTION 'parent block % not found', NEW.parent_id;
        END IF;
        IF NEW.level <> parent_level + 1 THEN
            RAISE EXCEPTION 'block level must be parent level + 1 (parent level=%, given=%)', parent_level, NEW.level;
        END IF;
        IF parent_user_id <> NEW.user_id THEN
            RAISE EXCEPTION 'parent block % belongs to a different user (parent user_id=%, given=%)', NEW.parent_id, parent_user_id, NEW.user_id;
        END IF;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        NEW.updated_at = now();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_block_before_write
    BEFORE INSERT OR UPDATE ON block
    FOR EACH ROW EXECUTE FUNCTION block_before_write();

-- ============================================================
-- 3. experience_meta (level 2 EXPERIENCE 블록 1:1 메타데이터)
--    source_type/status는 portfolio 도메인의 기존 enum을 재사용한다.
-- ============================================================
CREATE TABLE experience_meta (
    block_id BIGINT PRIMARY KEY,
    block_kind block_kind_enum NOT NULL DEFAULT 'EXPERIENCE' CHECK (block_kind = 'EXPERIENCE'),
    contribution_rate INT NULL,
    source_type portfolio_source_type_enum NOT NULL DEFAULT 'INTERNAL',
    status portfolio_status_enum NOT NULL DEFAULT 'not_started',
    experience_id INT NULL UNIQUE REFERENCES experience(id),
    FOREIGN KEY (block_id, block_kind) REFERENCES block(id, kind) ON DELETE CASCADE
);

-- ============================================================
-- 4. review (EXPERIENCE 블록 첨삭 대상 마킹)
-- ============================================================
CREATE TABLE review (
    id BIGSERIAL PRIMARY KEY,
    block_id BIGINT NOT NULL,
    block_kind block_kind_enum NOT NULL DEFAULT 'EXPERIENCE' CHECK (block_kind = 'EXPERIENCE'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    FOREIGN KEY (block_id, block_kind) REFERENCES block(id, kind) ON DELETE CASCADE
);

CREATE INDEX idx_review_block_id ON review(block_id);

-- ============================================================
-- 5. experience_map (사용자별 트리 스냅샷 버전, 낙관적 잠금)
-- ============================================================
CREATE TABLE experience_map (
    user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    map_version BIGINT NOT NULL DEFAULT 1,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 6. ai_experience_session (사용자별 LangGraph 세션, 1:1)
-- ============================================================
CREATE TABLE ai_experience_session (
    user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID NOT NULL UNIQUE,
    active_gap JSONB NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, session_id)
);

-- ============================================================
-- 7. ai_experience_request (세션별 요청 이력, 멱등/재시도/커밋 상태 추적)
-- ============================================================
CREATE TABLE ai_experience_request (
    user_id INT NOT NULL,
    request_id UUID NOT NULL,
    session_id UUID NOT NULL,
    request_hash CHAR(64) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'running',
    failed_node VARCHAR(100) NULL,
    retryable BOOLEAN NOT NULL DEFAULT false,
    retry_expires_at TIMESTAMPTZ NULL,
    lease_expires_at TIMESTAMPTZ NULL,
    base_map_version BIGINT NULL,
    committed_version BIGINT NULL,
    input_meta JSONB NULL,
    result JSONB NULL,
    suggestion JSONB NULL,
    error JSONB NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, request_id),
    FOREIGN KEY (user_id, session_id) REFERENCES ai_experience_session(user_id, session_id)
);

CREATE INDEX idx_ai_experience_request_session ON ai_experience_request(user_id, session_id);
CREATE INDEX idx_ai_experience_request_hash ON ai_experience_request(user_id, request_hash);

-- ============================================================
-- 8. ai_commit_log (사용자별 최신 1건, 커밋 롤백용 스냅샷 / 24시간 TTL은 배치로 정리)
-- ============================================================
CREATE TABLE ai_commit_log (
    user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    request_id UUID NOT NULL,
    previous_version BIGINT NOT NULL,
    committed_version BIGINT NOT NULL,
    created_block_ids BIGINT[] NOT NULL DEFAULT '{}',
    updated_blocks JSONB NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
