import { describe, it, expect } from 'vitest';
import { isOrderEligibleForReminder, buildAbandonedReminderEmail } from '../src/lib/abandonedReminder';

describe('Abandoned Cart Reminder Helper', () => {
  const now = new Date('2026-10-14T10:00:00Z');

  it('rejects orders that are not pending', () => {
    const twoHoursAgo = new Date('2026-10-14T08:00:00Z');
    expect(isOrderEligibleForReminder(twoHoursAgo, 'paid', null, now)).toBe(false);
    expect(isOrderEligibleForReminder(twoHoursAgo, 'expired', null, now)).toBe(false);
  });

  it('rejects orders younger than 1 hour', () => {
    const thirtyMinsAgo = new Date('2026-10-14T09:30:00Z');
    expect(isOrderEligibleForReminder(thirtyMinsAgo, 'pending', null, now)).toBe(false);
  });

  it('rejects orders older than 24 hours', () => {
    const twoDaysAgo = new Date('2026-10-12T08:00:00Z');
    expect(isOrderEligibleForReminder(twoDaysAgo, 'pending', null, now)).toBe(false);
  });

  it('rejects orders already reminded', () => {
    const twoHoursAgo = new Date('2026-10-14T08:00:00Z');
    const reminded = new Date('2026-10-14T08:30:00Z');
    expect(isOrderEligibleForReminder(twoHoursAgo, 'pending', reminded, now)).toBe(false);
  });

  it('accepts pending orders between 1h and 24h old not yet reminded', () => {
    const twoHoursAgo = new Date('2026-10-14T08:00:00Z');
    expect(isOrderEligibleForReminder(twoHoursAgo, 'pending', null, now)).toBe(true);
  });

  it('builds a polite, non-spammy email template', () => {
    const email = buildAbandonedReminderEmail(1024, 150123, 'PRO All-Access');
    expect(email.subject).toContain('Lolos.in');
    expect(email.subject).toContain('PRO All-Access');
    expect(email.html).toContain('Rp 150.123');
    expect(email.html).toContain('#1024');
    expect(email.html).toContain('https://belajar-cpns-saas.vercel.app/simulasi');
  });
});
