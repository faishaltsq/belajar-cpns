-- Tabel untuk menyimpan potongan konteks dari ebook PDF
CREATE TABLE IF NOT EXISTS ebook_contexts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_file TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('TWK', 'TIU', 'TKP')),
  sub_category TEXT,
  content TEXT NOT NULL,
  page_num INTEGER,
  char_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ebook_contexts_category ON ebook_contexts(category);
CREATE INDEX IF NOT EXISTS idx_ebook_contexts_sub_category ON ebook_contexts(sub_category);
