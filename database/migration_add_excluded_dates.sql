-- Add excluded_dates for single-occurrence deletion of recurring items (run in Supabase SQL editor if tables already exist)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS excluded_dates TEXT[] DEFAULT '{}';
ALTER TABLE events ADD COLUMN IF NOT EXISTS excluded_dates TEXT[] DEFAULT '{}';
