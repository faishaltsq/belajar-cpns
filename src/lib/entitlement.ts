import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { FREE_PACKAGE_IDS } from '@/lib/pricing';

/**
 * Server-side entitlement enforcement.
 *
 * Premium access used to be a UI concern: the catalog drew a lock on a card,
 * but `/api/questions/[id]`, `/api/results` and `/api/drill/check` all served
 * any package to anyone, so a paid tryout was one `curl` away. This module is
 * the single place that decides who may read a package, so every route that
 * hands out paid content asks the same question the same way.
 *
 * Rules:
 *  - a package listed in FREE_PACKAGE_IDS is open to everyone, guest included;
 *  - anything else needs a signed-in account that is PRO or holds that
 *    package in `unlocked_packages`;
 *  - an id that is not in the published catalog is treated as paid, so a
 *    custom/admin package is never opened by default;
 *  - a missing or unreachable database fails closed (free packages only).
 */

export interface Entitlements {
  userId: string | null;
  isPro: boolean;
  unlockedPackages: string[];
}

export type AccessDecision =
  | { allowed: true; free: boolean }
  | { allowed: false; reason: 'login_required' | 'payment_required' };

const FREE_SET = new Set<string>(FREE_PACKAGE_IDS);

export function isFreePackage(packageId: string): boolean {
  return FREE_SET.has(packageId);
}

/** Verified caller id, or null for a guest / expired / forged token. */
export async function getSessionUserId(): Promise<string | null> {
  try {
    const token = cookies().get('cpns_token')?.value;
    if (!token) return null;
    const payload = await verifyToken(token);
    return payload?.userId ?? null;
  } catch {
    return null;
  }
}

export async function getEntitlements(userId: string | null): Promise<Entitlements> {
  if (!userId) return { userId: null, isPro: false, unlockedPackages: [] };
  const sql = getDb();
  if (!sql) return { userId, isPro: false, unlockedPackages: [] };
  try {
    const rows = await sql`
      SELECT is_pro, unlocked_packages FROM users WHERE id = ${userId} LIMIT 1
    `;
    if (!rows || rows.length === 0) return { userId, isPro: false, unlockedPackages: [] };
    return {
      userId,
      isPro: Boolean(rows[0].is_pro),
      unlockedPackages: Array.isArray(rows[0].unlocked_packages) ? rows[0].unlocked_packages : [],
    };
  } catch {
    return { userId, isPro: false, unlockedPackages: [] };
  }
}

/**
 * Decide whether the caller of a request may read `packageId`.
 *
 * `login_required` vs `payment_required` is a UX distinction only — both are a
 * hard no — so the client can say "masuk dulu" instead of "paket ini terkunci".
 */
export async function checkPackageAccess(packageId: string): Promise<AccessDecision> {
  if (!packageId || typeof packageId !== 'string') {
    return { allowed: false, reason: 'payment_required' };
  }

  // Free packages short-circuit: no cookie, no database round-trip.
  if (isFreePackage(packageId)) return { allowed: true, free: true };

  const userId = await getSessionUserId();
  if (!userId) return { allowed: false, reason: 'login_required' };

  const ent = await getEntitlements(userId);
  if (ent.isPro || ent.unlockedPackages.includes(packageId)) {
    return { allowed: true, free: false };
  }
  return { allowed: false, reason: 'payment_required' };
}

/**
 * Cache policy for a package payload.
 *
 * A free package is identical for every visitor, so the CDN can absorb repeat
 * loads. A paid payload is per-account, so it must never be shared or stored
 * at the edge — one cached copy served to the next visitor would hand a
 * non-payer the whole paper.
 */
export function packageCacheControl(decision: { allowed: true; free: boolean }): string {
  return decision.free
    ? 'public, max-age=0, s-maxage=300, stale-while-revalidate=600'
    : 'private, no-store';
}
