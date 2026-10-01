ALTER TABLE email_outbox ADD COLUMN provider_id TEXT;
ALTER TABLE email_outbox ADD COLUMN delivery_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE email_outbox ADD COLUMN delivery_at INTEGER NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX email_provider_id ON email_outbox(provider_id) WHERE provider_id IS NOT NULL;
CREATE TABLE email_events(id TEXT PRIMARY KEY,provider_id TEXT NOT NULL,event_type TEXT NOT NULL,created_at INTEGER NOT NULL);
