-- Persistent rate limiting (survives Vercel serverless instance churn).
-- timestamps: epoch-ms array of hits inside the current window(s), pruned lazily on upsert.
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  timestamps BIGINT[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rate_limits_updated ON rate_limits (updated_at);
