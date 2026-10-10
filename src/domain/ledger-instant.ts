/** Ledger transport accepts Gregorian years 0001..9999, explicit offsets and
 * at most six fractional digits (PostgreSQL timestamptz microseconds).
 * Date validates calendars/normalizes whole-second offsets and projects a
 * calendar day for Intl. Fractional precision and authoritative comparisons
 * remain in strings/bigint; no timestamp is transported from that projection. */
export function ledgerInstant(value: string): { canonical: string; microseconds: bigint; calendarDate: Date } {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?(Z|([+-])(\d{2}):(\d{2}))$/.exec(value);
  if (!m) throw new Error('Explicit ISO timestamp with at most six fractional digits required.');
  const [year, month, day, hour, minute, second] = m.slice(1, 7).map(Number);
  const offsetHour = Number(m[10] ?? 0), offsetMinute = Number(m[11] ?? 0);
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59 || second > 59 || offsetHour > 15 || offsetMinute > 59) throw new Error('Unsupported timestamp range.');
  const calendar = new Date(0);
  calendar.setUTCFullYear(year, month - 1, day); calendar.setUTCHours(hour, minute, second, 0);
  if (calendar.getUTCFullYear() !== year || calendar.getUTCMonth() !== month - 1 || calendar.getUTCDate() !== day) throw new Error('Invalid calendar timestamp.');
  const offset = (offsetHour * 60 + offsetMinute) * (m[9] === '-' ? -1 : 1);
  const secondsDate = new Date(calendar.getTime() - offset * 60_000);
  if (secondsDate.getUTCFullYear() < 1 || secondsDate.getUTCFullYear() > 9999) throw new Error('UTC timestamp outside supported range.');
  const fraction = (m[7] ?? '').padEnd(6, '0');
  const microseconds = BigInt(secondsDate.getTime()) * 1000n + BigInt(fraction);
  // Calendar-only projection for Intl: floor correctly even before Unix epoch.
  const calendarDate = new Date(secondsDate.getTime() + Number(BigInt(fraction) / 1000n));
  return { canonical: `${secondsDate.toISOString().slice(0, 19)}.${fraction}Z`, microseconds, calendarDate };
}
export const normalizeLedgerInstant = (value: string) => ledgerInstant(value).canonical;
export function compareLedgerInstants(a: string, b: string): number {
  const left = ledgerInstant(a).microseconds, right = ledgerInstant(b).microseconds;
  return left < right ? -1 : left > right ? 1 : 0;
}
