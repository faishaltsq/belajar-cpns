CREATE TABLE IF NOT EXISTS issue_reports (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_email VARCHAR(255),
  category VARCHAR(100) NOT NULL DEFAULT 'general',
  description TEXT NOT NULL,
  page_url TEXT,
  device_info TEXT,
  status VARCHAR(50) DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_issue_reports_status ON issue_reports(status);
CREATE INDEX IF NOT EXISTS idx_issue_reports_created_at ON issue_reports(created_at DESC);
