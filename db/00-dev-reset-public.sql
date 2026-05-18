-- LOCAL DEVELOPMENT ONLY — wipes every table, type, and leftover object in `public`.
-- Run via: CONFIRM_DB_RESET=yes npm run db:reset
-- Do NOT run against production or shared databases.

DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
