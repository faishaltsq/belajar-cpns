-- Migration 002: Add randomize settings to packages
ALTER TABLE packages ADD COLUMN IF NOT EXISTS randomize_questions BOOLEAN DEFAULT false;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS randomize_options BOOLEAN DEFAULT false;
