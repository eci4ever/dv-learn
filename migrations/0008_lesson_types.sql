ALTER TABLE lessons ADD COLUMN lesson_type TEXT NOT NULL DEFAULT 'reading' CHECK (lesson_type IN ('video','reading','interactive','quiz'));
ALTER TABLE lessons ADD COLUMN activity TEXT CHECK (activity IN ('ipv4','private','subnet','quiz'));
UPDATE lessons SET lesson_type='video' WHERE video_url IS NOT NULL AND video_url != '';
UPDATE lessons SET lesson_type='interactive', activity=CASE id WHEN 'local-ip-ipv4' THEN 'ipv4' WHEN 'local-ip-private' THEN 'private' ELSE 'subnet' END WHERE id IN ('local-ip-ipv4','local-ip-private','local-ip-subnet');
UPDATE lessons SET lesson_type='quiz', activity='quiz' WHERE id='local-ip-quiz';
