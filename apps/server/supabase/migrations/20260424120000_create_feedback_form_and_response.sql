CREATE TABLE feedback_form (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    event_id INT NOT NULL REFERENCES event(id) ON DELETE CASCADE,
    schema JSONB NOT NULL
);

CREATE TABLE feedback_response (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    participation_id INT NOT NULL REFERENCES event_participation(id) ON DELETE CASCADE,
    form_id INT NOT NULL REFERENCES feedback_form(id) ON DELETE CASCADE,
    answers JSONB NOT NULL,
    submitted_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_feedback_form_event_id ON feedback_form(event_id);

CREATE INDEX idx_feedback_response_participation_id ON feedback_response(participation_id);
CREATE INDEX idx_feedback_response_form_id ON feedback_response(form_id);
CREATE INDEX idx_feedback_response_participation_submitted_at ON feedback_response(participation_id, submitted_at DESC);

