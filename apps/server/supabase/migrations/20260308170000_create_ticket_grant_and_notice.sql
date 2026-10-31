CREATE TYPE ticket_grant_source_type_enum AS ENUM (
    'EVENT',
    'SIGNUP',
    'ADMIN',
    'COMPENSATION',
    'PURCHASE'
);

CREATE TYPE ticket_grant_actor_type_enum AS ENUM ('SYSTEM', 'ADMIN', 'INTERNAL_API');

CREATE TYPE ticket_grant_notice_status_enum AS ENUM ('PENDING', 'SHOWN', 'DISMISSED');

ALTER TYPE ticket_source_enum ADD VALUE IF NOT EXISTS 'ADMIN';

CREATE TABLE ticket_grant (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source_type ticket_grant_source_type_enum NOT NULL,
    source_ref_id INT NULL,
    actor_type ticket_grant_actor_type_enum NOT NULL,
    actor_id VARCHAR(64) NULL,
    reason_code VARCHAR(64) NULL,
    reason_text VARCHAR(500) NULL,
    reward_snapshot JSONB NOT NULL,
    granted_at TIMESTAMP NOT NULL
);

CREATE TABLE ticket_grant_notice (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    ticket_grant_id INT NOT NULL REFERENCES ticket_grant(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status ticket_grant_notice_status_enum NOT NULL DEFAULT 'PENDING',
    title VARCHAR(100) NOT NULL,
    body TEXT NOT NULL,
    cta_text VARCHAR(50) NULL,
    cta_link VARCHAR(255) NULL,
    payload JSONB NULL,
    shown_at TIMESTAMP NULL,
    dismissed_at TIMESTAMP NULL,
    expires_at TIMESTAMP NULL
);

ALTER TABLE ticket ADD COLUMN ticket_grant_id INT NULL REFERENCES ticket_grant(id) ON DELETE SET NULL;

CREATE INDEX idx_ticket_grant_user_id ON ticket_grant(user_id);
CREATE INDEX idx_ticket_grant_source_type_ref_id ON ticket_grant(source_type, source_ref_id);
CREATE INDEX idx_ticket_grant_actor_type_id ON ticket_grant(actor_type, actor_id);

CREATE INDEX idx_ticket_grant_notice_ticket_grant_id ON ticket_grant_notice(ticket_grant_id);
CREATE INDEX idx_ticket_grant_notice_user_id_status ON ticket_grant_notice(user_id, status);
CREATE INDEX idx_ticket_grant_notice_pending ON ticket_grant_notice(user_id, created_at DESC)
WHERE status = 'PENDING';

CREATE INDEX idx_ticket_ticket_grant_id ON ticket(ticket_grant_id);
