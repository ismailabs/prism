import { describe, expect, it } from 'vitest';
import i18n from '../i18n';
describe('English and Malay resource contract', () => {
  it('has identical keys, nonempty values and matched interpolation parameters', () => {
    const en = i18n.getResourceBundle('en', 'translation') as Record<string, string>;
    const ms = i18n.getResourceBundle('ms', 'translation') as Record<string, string>;
    expect(Object.keys(ms).sort()).toEqual(Object.keys(en).sort());
    for (const [key, value] of Object.entries(en)) {
      expect(ms[key].trim(), key).not.toBe('');
      expect(ms[key].match(/\{\{[^}]+\}\}/g)?.sort() ?? [], key).toEqual(value.match(/\{\{[^}]+\}\}/g)?.sort() ?? []);
    }
  });
});
