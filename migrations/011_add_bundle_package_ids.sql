-- Migration 011: store the selected package list for bundle orders.
-- Additive only: existing rows keep NULL, order_type gains no constraint
-- because payment_orders.order_type is varchar with no CHECK (verified).
ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS package_ids jsonb;

COMMENT ON COLUMN payment_orders.package_ids IS
  'For order_type = bundle: array of package ids the buyer selected. NULL otherwise.';
