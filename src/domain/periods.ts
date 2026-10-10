import { financialDate, validTimezone } from './dates.ts';

export const defaultPeriodTypes = ['month', 'last-3-months', 'last-6-months', 'last-12-months', 'year-to-date', 'all-time'] as const;
export type DefaultPeriod = typeof defaultPeriodTypes[number];
export type FinancialPeriodSelection =
  | { type: 'month'; month: string }
  | { type: 'last-3-months' | 'last-6-months' | 'last-12-months' | 'all-time' }
  | { type: 'year-to-date'; year: number }
  | { type: 'custom'; start: string; end: string };
export interface Period {
  /** Inclusive financial calendar dates; empty boundaries mean unbounded. */
  from: string;
  to: string;
  previousFrom: string;
  previousTo: string;
  months: number;
  type?: FinancialPeriodSelection['type'];
  timezone?: string;
  comparison?: boolean;
  partial?: boolean;
}
export function isDefaultPeriod(value: unknown): value is DefaultPeriod {
  return defaultPeriodTypes.some(type => type === value);
}
export function validCalendarDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && value.slice(0, 4) !== '0000' &&
    Number.isFinite(Date.parse(value + 'T12:00:00Z')) && new Date(value + 'T12:00:00Z').toISOString().slice(0, 10) === value;
}
export function validMonth(value: string) { return /^\d{4}-(0[1-9]|1[0-2])$/.test(value) && value.slice(0, 4) !== '0000'; }
export function shiftMonth(month: string, offset: number) {
  if (!validMonth(month) || !Number.isInteger(offset)) throw new Error('Invalid month.');
  const date = new Date(month + '-01T12:00:00Z');
  date.setUTCMonth(date.getUTCMonth() + offset);
  return date.toISOString().slice(0, 7);
}
export function monthEnd(month: string) {
  const next = new Date(shiftMonth(month, 1) + '-01T12:00:00Z');
  next.setUTCDate(0);
  return next.toISOString().slice(0, 10);
}
export function shiftDay(date: string, offset: number) {
  if (!validCalendarDate(date)) throw new Error('Invalid calendar date.');
  const value = new Date(date + 'T12:00:00Z');
  value.setUTCDate(value.getUTCDate() + offset);
  return value.toISOString().slice(0, 10);
}
export function calendarDays(from: string, to: string) {
  return Math.round((Date.parse(to + 'T12:00:00Z') - Date.parse(from + 'T12:00:00Z')) / 86400000) + 1;
}
/** Calendar arithmetic uses UTC as a neutral calendar, never as the financial zone. */
export function analyticsPeriod(month: string, count: number): Period {
  if (!Number.isInteger(count) || count < 1 || count > 12) throw new Error('Invalid period length.');
  return { from: shiftMonth(month, 1 - count) + '-01', to: monthEnd(month), previousFrom: shiftMonth(month, 1 - 2 * count) + '-01', previousTo: monthEnd(shiftMonth(month, -count)), months: count };
}
export function defaultSelection(type: DefaultPeriod, timezone: string, now = new Date()): FinancialPeriodSelection {
  const today = financialDate(now, timezone);
  if (type === 'month') return { type, month: today.slice(0, 7) };
  if (type === 'year-to-date') return { type, year: Number(today.slice(0, 4)) };
  return { type };
}
export function resolveFinancialPeriod(selection: FinancialPeriodSelection, timezone: string, now = new Date()): Period {
  if (!validTimezone(timezone)) throw new Error('Invalid financial timezone.');
  const today = financialDate(now, timezone);
  const context = { type: selection.type, timezone, comparison: true, partial: false };
  if (selection.type === 'all-time') return { ...context, from: '', to: '', previousFrom: '', previousTo: '', months: 0, comparison: false };
  if (selection.type === 'custom') {
    if (!validCalendarDate(selection.start) || !validCalendarDate(selection.end) || selection.start > selection.end) throw new Error('Invalid date range.');
    const days = calendarDays(selection.start, selection.end);
    return { ...context, from: selection.start, to: selection.end, previousFrom: shiftDay(selection.start, -days), previousTo: shiftDay(selection.start, -1), months: 0, partial: selection.start <= today && selection.end > today };
  }
  if (selection.type === 'year-to-date') {
    if (!Number.isInteger(selection.year) || selection.year < 2 || selection.year > 9999) throw new Error('Invalid year.');
    const year = String(selection.year).padStart(4, '0'), previousYear = String(selection.year - 1).padStart(4, '0');
    const current = selection.year === Number(today.slice(0, 4));
    const to = current ? today : year + '-12-31';
    const previousMonth = previousYear + to.slice(4, 7);
    const previousTo = previousMonth + '-' + String(Math.min(Number(to.slice(8)), Number(monthEnd(previousMonth).slice(8)))).padStart(2, '0');
    return { ...context, from: year + '-01-01', to, previousFrom: previousYear + '-01-01', previousTo, months: current ? Number(today.slice(5, 7)) : 12, partial: current && today !== year + '-12-31' };
  }
  const month = selection.type === 'month' ? selection.month : today.slice(0, 7);
  const count = selection.type === 'month' ? 1 : Number(selection.type.split('-')[1]);
  const period = analyticsPeriod(month, count);
  // Current calendar windows compare the same elapsed portion of the final
  // month. Historical windows compare complete calendar blocks.
  if (month === today.slice(0, 7) && today < period.to) {
    const previousMonth = period.previousTo.slice(0, 7);
    period.to = today;
    period.previousTo = previousMonth + '-' + String(Math.min(Number(today.slice(8)), Number(period.previousTo.slice(8)))).padStart(2, '0');
    context.partial = true;
  }
  return { ...period, ...context };
}
export function periodIncludes(date: string, period: Period, previous = false) {
  if (previous && period.comparison === false) return false;
  const from = previous ? period.previousFrom : period.from, to = previous ? period.previousTo : period.to;
  return (!from || date >= from) && (!to || date <= to);
}
export function periodMonths(period: Period, dates: string[] = []) {
  const ordered = dates.filter(date => periodIncludes(date, period)).sort();
  const from = period.from || ordered[0], to = period.to || ordered.at(-1);
  if (!from || !to) return [];
  const result: string[] = [];
  for (let month = from.slice(0, 7); month <= to.slice(0, 7); month = shiftMonth(month, 1)) result.push(month);
  return result;
}
