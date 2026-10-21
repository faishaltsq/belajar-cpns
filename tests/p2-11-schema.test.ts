import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * P2-11: migration chain had ALTERs for payment_orders (007/008/009/011) but
 * no CREATE TABLE — a fresh environment could never even apply 007
 * (`relation "payment_orders" does not exist`). The column list here is the
 * union of everything src/app/api/payment/* and webhooks/klikqris read or
 * write (verified by grep), so schema drift gets caught at test time.
 */

const ROOT = process.cwd();

const findMigration = (rx: RegExp) =>
  fs
    .readdirSync(path.join(ROOT, 'migrations'))
    .filter((f) => /^\d{3}_.*\.sql$/.test(f))
    .map((f) => ({ name: f, sql: fs.readFileSync(path.join(ROOT, 'migrations', f), 'utf8') }))
    .find((m) => rx.test(m.sql));

describe('P2-11 - payment_orders exists without depending on runtime DDL', () => {
  it('has a tracked CREATE TABLE IF NOT EXISTS payment_orders migration', () => {
    const m = findMigration(/CREATE TABLE IF NOT EXISTS payment_orders/);
    expect(m, 'no CREATE TABLE for payment_orders in migrations/').toBeTruthy();
  });

  it('creates every column the payment code reads or writes', () => {
    const m = findMigration(/CREATE TABLE IF NOT EXISTS payment_orders/) as { name: string; sql: string };
    for (const col of [
      'user_id', 'user_email', 'package_id', 'order_type', 'base_amount',
      'unique_code', 'exact_amount', 'status', 'package_ids', 'signature',
      'qris_url', 'qris_image', 'last_reminded_at', 'expires_at', 'paid_at',
      'created_at',
    ]) {
      expect(m.sql, `column ${col} missing from the CREATE`).toMatch(new RegExp(`\\b${col}\\b`));
    }
  });

  it('keeps the guarded-transition access patterns indexed', () => {
    const m = findMigration(/CREATE TABLE IF NOT EXISTS payment_orders/) as { name: string; sql: string };
    expect(m.sql).toMatch(/idx_payment_orders_user_pending/);
    expect(m.sql).toMatch(/idx_payment_orders_pending_created/);
  });

  it('leaves expires_at nullable: the KlikQRIS EXPIRED delivery owns that transition', () => {
    // history/route.ts:61 treats a NULL expires_at as still pending on
    // purpose. A DEFAULT would invent an expiry the webhook has not announced.
    const m = findMigration(/CREATE TABLE IF NOT EXISTS payment_orders/) as { name: string; sql: string };
    expect(m.sql).toMatch(/expires_at\s+TIMESTAMPTZ(?! .*DEFAULT)/);
  });
});
