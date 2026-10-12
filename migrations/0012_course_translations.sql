-- Translation rows inherit access/publication from their existing parent records.
-- IDs and progress remain unchanged; source snapshots prevent stale copy serving.
CREATE TABLE course_translations (
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  locale TEXT NOT NULL CHECK(locale IN ('en','ms')),
  source TEXT NOT NULL CHECK(json_valid(source)),
  payload TEXT NOT NULL CHECK(json_valid(payload)),
  PRIMARY KEY(course_id,locale)
);
CREATE TABLE section_translations (
  section_id TEXT NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  locale TEXT NOT NULL CHECK(locale IN ('en','ms')),
  source TEXT NOT NULL CHECK(json_valid(source)),
  payload TEXT NOT NULL CHECK(json_valid(payload)),
  PRIMARY KEY(section_id,locale)
);
CREATE TABLE lesson_translations (
  lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  locale TEXT NOT NULL CHECK(locale IN ('en','ms')),
  source TEXT NOT NULL CHECK(json_valid(source)),
  payload TEXT NOT NULL CHECK(json_valid(payload)),
  PRIMARY KEY(lesson_id,locale)
);
