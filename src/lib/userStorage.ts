/**
 * Centralized user-scoped localStorage helper.
 * Semua fitur progress (roadmap, flashcard, drill, simulasi) harus pakai ini
 * agar data terisolasi per akun.
 */

export function scopedKey(featureKey: string, userId?: string | null): string {
  const scope = userId ? `u_${userId}` : 'guest';
  return `lolos_${scope}_${featureKey}`;
}

export function getScopedJSON<T>(featureKey: string, userId: string | null | undefined, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(scopedKey(featureKey, userId));
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

export function setScopedJSON<T>(featureKey: string, userId: string | null | undefined, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(scopedKey(featureKey, userId), JSON.stringify(value));
  } catch {}
}

export function removeScopedKey(featureKey: string, userId: string | null | undefined): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(scopedKey(featureKey, userId));
  } catch {}
}
