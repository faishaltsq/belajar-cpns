import { describe, it, expect } from 'vitest';
import { TRYOUT_LIST } from '../src/lib/loadPackage';

describe('Tryout Package Badges', () => {
  it('tryout-mini tidak memiliki badge duplikat Coba Gratis', () => {
    const mini = TRYOUT_LIST.find((p) => p.id === 'tryout-mini');
    expect(mini).toBeDefined();
    expect(mini?.badge).toBeNull();
  });

  it('tryout-1 dan tryout-2 tidak memiliki badge (sudah gratis via FREE_IDS)', () => {
    const t1 = TRYOUT_LIST.find((p) => p.id === 'tryout-1');
    const t2 = TRYOUT_LIST.find((p) => p.id === 'tryout-2');
    expect(t1?.badge).toBeNull();
    expect(t2?.badge).toBeNull();
  });
});
