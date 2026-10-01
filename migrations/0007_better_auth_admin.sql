ALTER TABLE user ADD COLUMN role TEXT NOT NULL DEFAULT 'user';
ALTER TABLE user ADD COLUMN banned INTEGER NOT NULL DEFAULT 0;
ALTER TABLE user ADD COLUMN ban_reason TEXT;
ALTER TABLE user ADD COLUMN ban_expires INTEGER;
ALTER TABLE session ADD COLUMN impersonated_by TEXT;

-- Preserve existing admins; the legacy table remains only for migration history.
UPDATE user SET role='admin' WHERE id IN (SELECT user_id FROM admins);
CREATE TABLE auth_bootstrap (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES user(id),
  completed INTEGER NOT NULL DEFAULT 0
);
INSERT INTO auth_bootstrap(id,user_id,completed)
SELECT 'initial-admin',id,1 FROM user WHERE role='admin' ORDER BY id LIMIT 1;
