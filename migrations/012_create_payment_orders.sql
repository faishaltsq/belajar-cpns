-- Migration 012: payment_orders had additive ALTERs (007/008/009/011)
-- but no CREATE anywhere in the tracked migrations - a fresh environment ran
-- every migration "successfully" and then /api/payment/create-order failed on
-- its first INSERT with `relation "payment_orders" does not exist`.
-- Column list is the union of every column read or written by
-- src/app/api/payment/* and src/app/api/webhooks/klikqris (verified by grep).

CREATE TABLE IF NOT EXISTS payment_orders (
  id           BIGSERIAL PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_email   TEXT,
  package_id   TEXT,
  order_type   TEXT NOT NULL,
  base_amount  BIGINT NOT NULL,
  unique_code  INTEGER,
  exact_amount BIGINT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending',
  package_ids  JSONB,
  signature    TEXT,
  qris_url     TEXT,
  qris_image   TEXT,
  last_reminded_at TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ,
  paid_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Access pattern 1 (create-order): newest pending order for one user/type/pkg
CREATE INDEX IF NOT EXISTS idx_payment_orders_user_pending
  ON payment_orders (user_id, order_type, status, created_at DESC);

-- Access pattern 2 (webhook): by id (PK covers it)
-- Access pattern 3 (abandoned-reminders cron): pending with an email, 1-24h window
CREATE INDEX IF NOT EXISTS idx_payment_orders_pending_created
  ON payment_orders (status, created_at)
  WHERE status = 'pending';

COMMENT ON TABLE payment_orders IS
  'QRIS orders. exact_amount = base_amount + unique_code when set; webhook transitions pending->paid grant entitlement atomically.';
