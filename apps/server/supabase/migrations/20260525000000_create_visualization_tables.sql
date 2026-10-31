CREATE TABLE visualization_jobs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id        INT NOT NULL REFERENCES portfolio(id),
    user_id             INT NOT NULL REFERENCES users(id),
    template_id         VARCHAR(50) NOT NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'pending',
    pipeline_stage      VARCHAR(30) NOT NULL DEFAULT 'contentGenerating',
    total_slides        INT NOT NULL DEFAULT 0,
    gcs_pptx_key        VARCHAR(500),
    slide_plan          JSONB,
    regeneration_count  INT NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_viz_jobs_user ON visualization_jobs(user_id);
CREATE INDEX idx_viz_jobs_portfolio ON visualization_jobs(portfolio_id);

CREATE TABLE visualization_slides (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id              UUID NOT NULL REFERENCES visualization_jobs(id) ON DELETE CASCADE,
    slide_order         INT NOT NULL,
    source_slide_id     VARCHAR(50) NOT NULL,
    slide_filename      VARCHAR(50) NOT NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'pending',
    current_fills       JSONB,
    gcs_preview_key     VARCHAR(500),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(job_id, slide_order)
);

CREATE INDEX idx_viz_slides_job ON visualization_slides(job_id);
