-- Migration: add last_reminded_at to payment_orders.
--
-- Found during read-only production schema verification (docs/audit/
-- MIGRATION_012_VERIFICATION.md): the column existed only in
-- 012_create_payment_orders.sql, which was never applied to production
-- (CREATE TABLE IF NOT EXISTS is a no-op there because the table already
-- exists). src/app/api/payment/abandoned-reminders/route.ts selects and
-- updates it, so every invocation failed with
--   column "last_reminded_at" does not exist
-- and the abandoned-cart reminder feature has never run in production.
--
-- Additive and idempotent: safe on the existing production table and on a
-- fresh database provisioned from 012.

ALTER TABLE payment_orders
  ADD COLUMN IF NOT EXISTS last_reminded_at TIMESTAMPTZ;

-- The reminder job scans pending orders in a 1-24h window that have not been
-- reminded yet. Without this index that read is a sequential scan over the
-- whole table on every cron tick.
CREATE INDEX IF NOT EXISTS idx_payment_orders_pending_reminder
  ON payment_orders (status, created_at)
  WHERE status = 'pending' AND last_reminded_at IS NULL;
