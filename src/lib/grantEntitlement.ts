import type { NeonQueryFunction } from '@neondatabase/serverless';

/** Order row fields the entitlement grant needs. */
export interface EntitlementOrder {
  id: number;
  user_id: string | null;
  user_email?: string | null;
  package_id: string | null;
  order_type: string | null;
  package_ids?: unknown;
}

/**
 * Narrow an untyped DB row to what the grant needs. The callers read
 * `SELECT *` rows, so the shape is only known at runtime — this keeps the
 * contract explicit without an inline cast at each call site.
 */
export function toEntitlementOrder(row: Record<string, unknown>): EntitlementOrder | null {
  const id = Number(row.id);
  if (!Number.isInteger(id)) return null;
  return {
    id,
    user_id: typeof row.user_id === 'string' ? row.user_id : null,
    user_email: typeof row.user_email === 'string' ? row.user_email : null,
    package_id: typeof row.package_id === 'string' ? row.package_id : null,
    order_type: typeof row.order_type === 'string' ? row.order_type : null,
    package_ids: row.package_ids,
  };
}

/**
 * Shared entitlement grant for the two payment paths (webhook + manual sync),
 * so they cannot diverge. Resolves the target user (order.user_id first, then
 * the stored email), then applies the order_type-specific upgrade.
 *
 * Unknown order types grant nothing — they must never fall through to PRO.
 */
export async function grantEntitlement(
  sql: NeonQueryFunction<false, false>,
  order: EntitlementOrder
): Promise<void> {
  let userId = order.user_id;
  if (!userId && typeof order.user_email === 'string' && order.user_email.trim() !== '') {
    const rows = await sql`
      SELECT id FROM users WHERE LOWER(email) = ${order.user_email.trim().toLowerCase()} LIMIT 1
    `;
    if (rows.length === 0) return;
    userId = rows[0].id;
  }
  if (!userId) return;

  if (order.order_type === 'pro') {
    await sql`
      UPDATE users
      SET is_pro = true,
          pro_activated_at = NOW()
      WHERE id = ${userId}
    `;
    return;
  }

  if ((order.order_type === 'single' && order.package_id) || order.order_type === 'bundle') {
    const toUnlock: string[] = [];
    if (order.order_type === 'bundle') {
      if (Array.isArray(order.package_ids)) toUnlock.push(...order.package_ids);
    } else if (order.package_id) {
      toUnlock.push(order.package_id);
    }
    if (toUnlock.length === 0) return;

    const userRows = await sql`SELECT unlocked_packages FROM users WHERE id = ${userId} LIMIT 1`;
    if (userRows.length === 0) return;
    const current: string[] = Array.isArray(userRows[0].unlocked_packages)
      ? userRows[0].unlocked_packages : [];
    const merged = [...current];
    for (const id of toUnlock) if (!merged.includes(id)) merged.push(id);
    if (merged.length !== current.length) {
      await sql`
        UPDATE users
        SET unlocked_packages = ${JSON.stringify(merged)}::jsonb
        WHERE id = ${userId}
      `;
    }
    return;
  }

  console.warn(`[grantEntitlement] Unknown order_type "${order.order_type}" for order #${order.id} — access not granted`);
}
