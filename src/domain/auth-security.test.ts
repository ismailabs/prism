import { describe, expect, it } from 'vitest';
import { financialAccessStatus } from './auth-security';

describe('financial authorization response boundary', () => {
  const ready = { allowed: true, reason: 'ready', approvedFactorIds: ['primary', 'backup'], currentFactorId: 'primary', mailboxVerified: false, sessionExpiresAt: new Date(Date.now() + 60_000).toISOString() };
  it('accepts an unexpired server-approved pair and an explicit enrollment-only state', () => {
    expect(financialAccessStatus(ready).allowed).toBe(true);
    expect(financialAccessStatus({ allowed: false, reason: 'needs_mfa', approvedFactorIds: [], mailboxVerified: false }).allowed).toBe(false);
  });
  it.each([null, {}, { ...ready, allowed: 'false' }, { ...ready, approvedFactorIds: ['primary', 'primary'] }, { ...ready, currentFactorId: 'unapproved' }, { ...ready, sessionExpiresAt: 'invalid' }, { ...ready, sessionExpiresAt: new Date(0).toISOString() }])('fails closed on an incomplete, inconsistent or expired response: %j', value => {
    expect(() => financialAccessStatus(value)).toThrow();
  });
});
