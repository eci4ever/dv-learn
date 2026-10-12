ALTER TABLE courses ADD COLUMN free_enrollment INTEGER NOT NULL DEFAULT 0 CHECK(free_enrollment IN (0,1));
ALTER TABLE courses ADD COLUMN content_language TEXT NOT NULL DEFAULT 'en' CHECK(content_language IN ('en','ms'));
CREATE TABLE free_enrollments (
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  revoked_at INTEGER,
  PRIMARY KEY(user_id,course_id)
);
-- Eligibility is rechecked on every access, not just at enrollment time.
CREATE VIEW free_course_eligibility AS
SELECT c.id AS course_id FROM courses c
WHERE c.free_enrollment=1 AND c.published=1 AND c.archived=0
AND EXISTS(SELECT 1 FROM lessons l JOIN sections s ON s.id=l.section_id WHERE s.course_id=c.id AND l.published=1)
AND NOT EXISTS(SELECT 1 FROM lessons l JOIN sections s ON s.id=l.section_id WHERE s.course_id=c.id AND l.published=1 AND l.preview=0)
AND NOT EXISTS(SELECT 1 FROM product_courses pc JOIN products p ON p.id=pc.product_id WHERE pc.course_id=c.id AND p.active=1);
-- Owner requested free enrollment for the existing DNS course only.
UPDATE courses SET free_enrollment=1 WHERE id='dns-fundamentals' AND slug='dns-fundamentals';
