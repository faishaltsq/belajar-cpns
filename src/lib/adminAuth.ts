import { NextRequest } from 'next/server';
import crypto from 'crypto';

/**
 * Validates admin authentication using strict x-admin-pin header with timing-safe comparison.
 * Query string parameters (?pin=...) are intentionally rejected to prevent URL credential leaks.
 */
export function isAuthorizedAdmin(req: NextRequest | Request): boolean {
  const adminPin = process.env.ADMIN_PIN;

  // In production, ADMIN_PIN must be configured and cannot be default weak PIN
  if (process.env.NODE_ENV === 'production') {
    if (!adminPin || adminPin === '123456') {
      console.error('[adminAuth] CRITICAL: ADMIN_PIN is unset or default in production.');
      return false;
    }
  }

  const expectedPin = adminPin || '123456';
  const providedPin = req.headers.get('x-admin-pin');

  if (!providedPin) {
    return false;
  }

  const bufExpected = Buffer.from(expectedPin, 'utf-8');
  const bufProvided = Buffer.from(providedPin, 'utf-8');

  if (bufExpected.length !== bufProvided.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufExpected, bufProvided);
}
