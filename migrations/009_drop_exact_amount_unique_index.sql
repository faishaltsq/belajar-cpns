-- Migration: Drop idx_payment_orders_pending_exact to prevent duplicate key errors on expired or concurrent transactions
DROP INDEX IF EXISTS idx_payment_orders_pending_exact;
