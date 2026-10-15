/**
 * Centralized user-scoped localStorage helper.
 * Semua fitur progress (roadmap, flashcard, drill, simulasi) harus pakai ini
 * agar data terisolasi per akun.
 */

export const GUEST_TRIAL_KEYS = [
  'lolos_guest_tried_drill',
  'lolos_guest_tried_flashcard',
  'lolos_guest_tried_journey',
  'lolos_guest_tried_psikotes',
] as const;

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

export function clearGuestTrialFlags(): void {
  if (typeof window === 'undefined') return;
  GUEST_TRIAL_KEYS.forEach((k) => {
    try { localStorage.removeItem(k); } catch {}
  });
}

export function clearAllGuestData(): void {
  if (typeof window === 'undefined') return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('lolos_guest_') || (GUEST_TRIAL_KEYS as readonly string[]).includes(key))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {}
}
