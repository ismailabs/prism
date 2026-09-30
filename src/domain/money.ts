import type { Currency } from '@/types';

/** Money crosses JSON boundaries as decimal strings, never IEEE-754 numbers. */
export const currencyScale: Record<Currency, number> = { MYR: 2, USD: 2, EUR: 2, JPY: 0 };
export type NumberLocale = 'dot-decimal' | 'comma-decimal';

function parseDecimal(value: string, currency: Currency, locale: NumberLocale, bounded: boolean): bigint {
  if (!(currency in currencyScale)) throw new Error('Unsupported currency.');
  const decimal = locale === 'dot-decimal' ? '.' : ',';
  const group = locale === 'dot-decimal' ? ',' : '.';
  const input = value.trim();
  const escapedGroup = group === '.' ? '\\.' : ',';
  const escapedDecimal = decimal === '.' ? '\\.' : ',';
  const pattern = new RegExp(`^([+-]?)(\\d+|\\d{1,3}(?:${escapedGroup}\\d{3})+)(?:${escapedDecimal}(\\d+))?$`);
  const match = pattern.exec(input);
  if (!match) throw new Error('Use a decimal amount with consistent thousands separators.');
  const scale = currencyScale[currency];
  const maxMinor = 10000000000000000n * 10n ** BigInt(scale) - 1n;
  const fraction = match[3] ?? '';
  if (fraction.length > scale) throw new Error(`${currency} allows ${scale} decimal places; amounts are never rounded silently.`);
  const minor = BigInt(match[2].replaceAll(group, '')) * 10n ** BigInt(scale) + BigInt(fraction.padEnd(scale, '0') || '0');
  if (bounded && minor > maxMinor) throw new Error('Amount exceeds the supported range.');
  return match[1] === '-' ? -minor : minor;
}

/** Bounded input for an individual persisted amount. */
export function parseMoney(value:string,currency:Currency,locale:NumberLocale='dot-decimal'){return parseDecimal(value,currency,locale,true);}
/** Exact database/domain aggregates can exceed the individual-entry input cap. */
export function parseMoneyTotal(value:string,currency:Currency){return parseDecimal(value,currency,'dot-decimal',false);}

export function decimalMoney(minor: bigint, currency: Currency): string {
  const scale = currencyScale[currency];
  if (scale === undefined) throw new Error('Unsupported currency.');
  const digits = (minor < 0n ? -minor : minor).toString().padStart(scale + 1, '0');
  return `${minor < 0n ? '-' : ''}${scale ? `${digits.slice(0, -scale)}.${digits.slice(-scale)}` : digits}`;
}
