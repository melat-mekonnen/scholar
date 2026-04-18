-- Allow partial student profiles (optional GPA, degree, field of study).
-- Run once against an existing DB created with the older NOT NULL schema:
--   psql "$DATABASE_URL" -f db/migrate-student-profiles-nullable.sql

ALTER TABLE student_profiles DROP CONSTRAINT IF EXISTS student_profiles_gpa_check;
ALTER TABLE student_profiles DROP CONSTRAINT IF EXISTS student_profiles_degree_level_check;

ALTER TABLE student_profiles ALTER COLUMN field_of_study DROP NOT NULL;
ALTER TABLE student_profiles ALTER COLUMN gpa DROP NOT NULL;
ALTER TABLE student_profiles ALTER COLUMN degree_level DROP NOT NULL;

ALTER TABLE student_profiles ADD CONSTRAINT student_profiles_gpa_check
  CHECK (gpa IS NULL OR (gpa >= 0.0 AND gpa <= 4.0));

ALTER TABLE student_profiles ADD CONSTRAINT student_profiles_degree_level_check
  CHECK (degree_level IS NULL OR degree_level IN ('high_school', 'bachelor', 'master', 'phd'));
