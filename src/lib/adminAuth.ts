import { NextRequest } from 'next/server';
import crypto from 'crypto';

let warnedMissingPin = false;

/**
 * Validates admin authentication using strict x-admin-pin header with timing-safe comparison.
 * Query string parameters (?pin=...) are intentionally rejected to prevent URL credential leaks.
 */
export function isAuthorizedAdmin(req: NextRequest | Request): boolean {
  const adminPin = process.env.ADMIN_PIN;

  // ADMIN_PIN must be configured; there is no default PIN in any environment.
  if (!adminPin) {
    if (!warnedMissingPin) {
      warnedMissingPin = true;
      console.error('[adminAuth] ADMIN_PIN is unset — admin routes are disabled.');
    }
    return false;
  }

  // A literal default PIN is refused in production.
  if (process.env.NODE_ENV === 'production' && adminPin === '123456') {
    console.error('[adminAuth] CRITICAL: ADMIN_PIN is the default weak PIN in production.');
    return false;
  }

  const providedPin = req.headers.get('x-admin-pin');

  if (!providedPin) {
    return false;
  }

  const bufExpected = Buffer.from(adminPin, 'utf-8');
  const bufProvided = Buffer.from(providedPin, 'utf-8');

  if (bufExpected.length !== bufProvided.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufExpected, bufProvided);
}
