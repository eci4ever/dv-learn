CREATE TABLE audit_log (id TEXT PRIMARY KEY, actor_id TEXT NOT NULL REFERENCES user(id), action TEXT NOT NULL, entity_id TEXT NOT NULL, created_at INTEGER NOT NULL);
CREATE INDEX audit_log_time ON audit_log(created_at);
CREATE TABLE payment_events (id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES orders(id), bill_id TEXT NOT NULL, paid INTEGER NOT NULL, created_at INTEGER NOT NULL);
