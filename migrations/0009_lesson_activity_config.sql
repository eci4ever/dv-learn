-- Keep legacy activity IDs and rows unchanged. New practice uses versioned JSON.
ALTER TABLE lessons ADD COLUMN activity_config TEXT
  CHECK (activity_config IS NULL OR (length(activity_config) <= 64000 AND json_valid(activity_config)));
