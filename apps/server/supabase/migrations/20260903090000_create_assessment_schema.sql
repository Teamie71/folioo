-- ============================================================
-- 직무·기업형태 추천 분석(assessment) 스키마
-- 직무/기업형태 배점 벡터는 DB에 두고 룰셋 버전으로 관리한다(운영 중 튜닝 잦음).
-- assessment_results는 입력/중간산출물/최종결과를 전부 값 복사 + 비정규화 저장한다.
-- ============================================================

CREATE TABLE ruleset_versions (
    id BIGSERIAL PRIMARY KEY,
    version VARCHAR(20) NOT NULL UNIQUE,
    note TEXT NULL,
    activated_at TIMESTAMPTZ NULL,

    trait_match_coefficient REAL NOT NULL,
    major_bonus_score REAL NOT NULL,
    roc_weights JSONB NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE jobs (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(50) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,

    score_investigative REAL NOT NULL,
    score_social REAL NOT NULL,
    score_enterprising REAL NOT NULL,
    score_conventional REAL NOT NULL,
    score_realistic REAL NOT NULL,
    score_artistic REAL NOT NULL,

    summary TEXT NOT NULL,
    core_skills JSONB NOT NULL,
    recommended_activities JSONB NOT NULL,

    ruleset_version_id BIGINT NOT NULL REFERENCES ruleset_versions(id),

    CONSTRAINT jobs_code_version_uq UNIQUE (code, ruleset_version_id)
);

CREATE INDEX jobs_version_active_idx ON jobs(ruleset_version_id, is_active);

CREATE TABLE company_types (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(50) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,

    score_work_life_balance REAL NOT NULL,
    score_compensation REAL NOT NULL,
    score_stability REAL NOT NULL,
    score_brand_value REAL NOT NULL,
    score_growth REAL NOT NULL,

    description TEXT NOT NULL,
    tip TEXT NULL,

    ruleset_version_id BIGINT NOT NULL REFERENCES ruleset_versions(id),

    CONSTRAINT company_types_code_version_uq UNIQUE (code, ruleset_version_id)
);

CREATE TABLE major_field_configs (
    id BIGSERIAL PRIMARY KEY,
    major_field VARCHAR(30) NOT NULL,
    type VARCHAR(20) NOT NULL,
    target_job_codes JSONB NOT NULL,

    ruleset_version_id BIGINT NOT NULL REFERENCES ruleset_versions(id),

    CONSTRAINT major_field_configs_field_version_uq UNIQUE (major_field, ruleset_version_id)
);

CREATE TABLE headlines (
    id BIGSERIAL PRIMARY KEY,
    top_value VARCHAR(30) NOT NULL,
    top_trait VARCHAR(30) NOT NULL,
    text TEXT NOT NULL,

    CONSTRAINT headlines_value_trait_uq UNIQUE (top_value, top_trait)
);

CREATE TABLE assessment_results (
    uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INT NULL REFERENCES users(id) ON DELETE SET NULL,
    claimed_at TIMESTAMPTZ NULL,

    ruleset_version VARCHAR(20) NOT NULL,

    input_snapshot JSONB NOT NULL,

    trait_vector JSONB NOT NULL,
    value_ranking JSONB NOT NULL,
    value_weights JSONB NOT NULL,

    headline TEXT NOT NULL,
    top_jobs JSONB NOT NULL,
    company_type JSONB NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX assessment_results_user_idx ON assessment_results(user_id);
CREATE INDEX assessment_results_created_idx ON assessment_results(created_at);
