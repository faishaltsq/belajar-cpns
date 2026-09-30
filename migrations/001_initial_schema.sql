-- Migration: belajar-cpns-saas database schema
-- Run via Neon console or psql against DATABASE_URL

-- Users (phone + PIN auth)
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone         VARCHAR(20) UNIQUE NOT NULL,
  pin_hash      VARCHAR(255) NOT NULL,
  name          VARCHAR(100),
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Packages (tryout metadata)
CREATE TABLE IF NOT EXISTS packages (
  id            VARCHAR(30) PRIMARY KEY,  -- e.g. 'tryout-1', 'tryout-mini'
  title         VARCHAR(200) NOT NULL,
  description   TEXT,
  question_count INT DEFAULT 0,
  duration_sec  INT DEFAULT 6000,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Questions (per-package)
CREATE TABLE IF NOT EXISTS questions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id    VARCHAR(30) NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  number        INT NOT NULL,
  category      VARCHAR(10) NOT NULL CHECK (category IN ('TWK', 'TIU', 'TKP')),
  text          TEXT NOT NULL,
  image         TEXT,            -- URL or path to question image
  options       JSONB NOT NULL,  -- [{id: "A", text: "...", image?: "..."}]
  correct_answer VARCHAR(5),     -- "A", "B", etc. (null for TKP scaled scoring)
  tkp_scores    JSONB,           -- {A: 5, B: 3, C: 1, D: 2, E: 4} for TKP
  explanation   TEXT,
  difficulty    VARCHAR(10) DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(package_id, number)
);

-- Exam results
CREATE TABLE IF NOT EXISTS exam_results (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  package_id    VARCHAR(30) REFERENCES packages(id) ON DELETE SET NULL,
  answers       JSONB NOT NULL,  -- {questionId: "A", ...}
  score_twk     INT DEFAULT 0,
  score_tiu     INT DEFAULT 0,
  score_tkp     INT DEFAULT 0,
  total_score   INT DEFAULT 0,
  is_passed     BOOLEAN DEFAULT false,
  duration_used INT,             -- seconds used
  started_at    TIMESTAMPTZ,
  finished_at   TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_questions_package ON questions(package_id);
CREATE INDEX IF NOT EXISTS idx_results_user ON exam_results(user_id);
CREATE INDEX IF NOT EXISTS idx_results_package ON exam_results(package_id);
