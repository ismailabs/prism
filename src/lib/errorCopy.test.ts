import { describe, expect, it } from 'vitest';
import { userError } from './errorCopy';
describe('localized customer errors', () => {
  it('localizes exact-money precision and CSV errors while retaining useful validation', () => {
    expect(userError(new Error('JPY allows 0 decimal places; amounts are never rounded silently.'), 'ms')).toBe('JPY membenarkan 0 tempat perpuluhan; amaun tidak dibundarkan secara senyap.');
    expect(userError(new Error('Column count does not match the header.'), 'ms')).toBe('Bilangan lajur tidak sepadan dengan tajuk.');
    expect(userError(new Error('Column count does not match the header.'), 'en')).toBe('Column count does not match the header.');
  });
  it('does not expose unknown error text, details or sensitive identifiers in either language', () => {
    const rejected = { code: '23514', message: 'Failing row contains PRIVATE_ACCOUNT_SENTINEL token=SECRET', details: 'PRIVATE_ACCOUNT_SENTINEL' };
    for (const locale of ['en', 'ms'] as const) expect(userError(rejected, locale)).not.toMatch(/PRIVATE|SECRET|token|23514/);
    expect(userError({ code: '42501', message: 'PRIVATE' }, 'ms')).toContain('tidak dibenarkan');
    expect(userError({ code: 'invalid_credentials' }, 'en')).toBe('Email or password is incorrect.');
  });
  it('treats prototype property names as unknown errors rather than trusted copy', () => {
    for (const name of ['constructor', 'toString', '__proto__']) for (const locale of ['en', 'ms'] as const) {
      const result = userError({ code: name, message: name }, locale);
      expect(typeof result).toBe('string');
      expect(result).toContain(locale === 'en' ? 'check your records first' : 'semak rekod anda dahulu');
    }
  });
  it('preserves history-protection and financial validation guidance in both languages', () => {
    const history = 'Debt has repayment history. Keep this record until reversal support is available.';
    expect(userError(new Error(history), 'en')).toBe(history);
    expect(userError(new Error(history), 'ms')).toContain('sejarah bayaran balik');
    expect(userError(new Error('Choose distinct transfer accounts.'), 'ms')).toBe('Pilih akaun pindahan yang berbeza.');
    expect(userError(new Error('Use up to eight plain tags, each at most 32 characters.'), 'ms')).toContain('lapan tag');
  });
});
