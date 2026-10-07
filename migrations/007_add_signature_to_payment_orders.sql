-- Migration: Add signature column to payment_orders for KlikQRIS webhook verification
-- Run via Neon console or psql against DATABASE_URL

ALTER TABLE payment_orders
  ADD COLUMN IF NOT EXISTS signature TEXT;
