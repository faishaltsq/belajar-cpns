-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT UNIQUE NOT NULL,
  pin_hash TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT 'Peserta CPNS',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Exam results table
CREATE TABLE IF NOT EXISTS exam_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  exam_type TEXT NOT NULL DEFAULT 'SKD',
  total_score INTEGER NOT NULL DEFAULT 0,
  is_passed BOOLEAN NOT NULL DEFAULT FALSE,
  details JSONB,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exam_results_user_id ON exam_results(user_id);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
