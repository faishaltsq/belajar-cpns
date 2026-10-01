-- migrations/004_question_bank.sql
-- Bank soal terpisah dari paket tryout
-- Soal di-generate sekali, bisa dipakai ulang ke banyak paket

CREATE TABLE IF NOT EXISTS question_bank (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category      VARCHAR(10) NOT NULL CHECK (category IN ('TWK', 'TIU', 'TKP')),
  sub_category  VARCHAR(100),
  text          TEXT NOT NULL,
  options       JSONB NOT NULL,   -- [{id:"a", text:"...", score:5}, ...]
  correct_answer VARCHAR(5),      -- id opsi jawaban benar (TWK/TIU); null untuk TKP
  explanation   TEXT,
  difficulty    VARCHAR(10) DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  source        VARCHAR(50) DEFAULT 'ai_ebook',  -- 'ai_ebook' | 'manual'
  used_count    INT DEFAULT 0,    -- berapa kali sudah dimasukkan ke paket tryout
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qbank_category ON question_bank(category);
CREATE INDEX IF NOT EXISTS idx_qbank_sub_category ON question_bank(sub_category);
CREATE INDEX IF NOT EXISTS idx_qbank_used ON question_bank(used_count);
