ALTER TABLE social_user
    ADD COLUMN IF NOT EXISTS oauth_refresh_token text;
