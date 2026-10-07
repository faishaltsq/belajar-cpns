-- Migration: Add qris_url and qris_image columns to payment_orders for caching QRIS data
ALTER TABLE payment_orders
  ADD COLUMN IF NOT EXISTS qris_url TEXT,
  ADD COLUMN IF NOT EXISTS qris_image TEXT;
