import { describe, expect, it } from 'vitest';
import { loginPath, safeDestination } from './routes';
describe('Auth return destinations', () => {
  it('preserves implemented private routes and finance filters', () => {
    expect(safeDestination('/transactions?type=expense&category=uncategorized')).toBe('/transactions?type=expense&category=uncategorized');
    expect(loginPath('/goals')).toBe('/login?next=%2Fgoals');
    expect(safeDestination('/accounting')).toBe('/accounting');
    for(const route of ['/notes?entity=goal&item=g','/reminders?item=r','/notifications','/calendar?month=2026-10'])expect(safeDestination(route)).toBe(route);
  });
  it('rejects external, disguised, unknown and public return destinations', () => {
    for (const value of ['https://evil.invalid', '//evil.invalid/transactions', '/\\evil.invalid', '/login', '/demo', '/unknown', '/transactions\n']) expect(safeDestination(value)).toBe('/dashboard');
  });
  it('drops callback secrets and fragments', () => {
    expect(safeDestination('/accounts?code=private&access_token=secret&type=expense#token')).toBe('/accounts?type=expense');
  });
});
