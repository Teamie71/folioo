-- Final schema:
-- - portfolio_correction.pdf_extraction_status
--   enum: NONE, GENERATING, GENERATED, FAILED
--   default: 'NONE'

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'portfolio_correction_pdf_extraction_status_enum'
    ) THEN
        CREATE TYPE portfolio_correction_pdf_extraction_status_enum AS ENUM (
            'NONE',
            'GENERATING',
            'GENERATED',
            'FAILED'
        );
    END IF;
END $$;

ALTER TABLE portfolio_correction
    ADD COLUMN IF NOT EXISTS pdf_extraction_status portfolio_correction_pdf_extraction_status_enum NOT NULL DEFAULT 'NONE';

