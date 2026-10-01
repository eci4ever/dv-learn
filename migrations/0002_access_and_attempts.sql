CREATE TABLE IF NOT EXISTS rate_limit (id TEXT PRIMARY KEY, key TEXT NOT NULL UNIQUE, count INTEGER NOT NULL, last_request INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS payment_attempts (id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES orders(id), bill_id TEXT UNIQUE, payment_url TEXT, status TEXT NOT NULL CHECK(status IN ('creating','pending','paid','failed')), created_at INTEGER NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS attempt_active ON payment_attempts(order_id) WHERE status IN ('creating','pending');
CREATE TABLE course_access (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE, course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE, source TEXT NOT NULL CHECK(source IN ('manual','order')), source_id TEXT NOT NULL, created_at INTEGER NOT NULL, revoked_at INTEGER, UNIQUE(user_id,course_id,source,source_id));
CREATE INDEX course_access_lookup ON course_access(user_id,course_id,revoked_at);
INSERT OR IGNORE INTO course_access(id,user_id,course_id,source,source_id,created_at) SELECT user_id || ':' || course_id || ':legacy',user_id,course_id,CASE WHEN order_id IS NULL THEN 'manual' ELSE 'order' END,COALESCE(order_id,'manual'),created_at FROM enrollments;
ALTER TABLE email_outbox ADD COLUMN attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE email_outbox ADD COLUMN last_error TEXT;
