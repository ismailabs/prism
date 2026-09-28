export type Frequency = 'daily' | 'weekly' | 'monthly' | 'yearly';
export interface RecurrenceRule { start: string; end?: string | null; frequency: Frequency; interval: number }

/** Calendar dates are explicit YYYY-MM-DD values in the user's financial timezone. */
export function calendarDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Use a YYYY-MM-DD calendar date.');
  const date = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value || date.getUTCFullYear() < 1900) throw new Error('Invalid calendar date.');
  return date;
}

/** Calculate from the original anchor so February clamping does not drift March. */
export function occurrenceDate(rule: RecurrenceRule, index: number): string | null {
  const anchor = calendarDate(rule.start);
  if (!['daily', 'weekly', 'monthly', 'yearly'].includes(rule.frequency)) throw new Error('Invalid frequency.');
  if (!Number.isInteger(rule.interval) || rule.interval < 1 || rule.interval > 366 || !Number.isInteger(index) || index < 0 || index > 100000) throw new Error('Invalid recurring interval or occurrence.');
  if (rule.end && (calendarDate(rule.end), rule.end < rule.start)) throw new Error('End date must not precede start date.');
  const step = index * rule.interval;
  const result = new Date(anchor);
  if (rule.frequency === 'daily' || rule.frequency === 'weekly') result.setUTCDate(anchor.getUTCDate() + step * (rule.frequency === 'weekly' ? 7 : 1));
  else {
    result.setUTCDate(1);
    result.setUTCMonth(anchor.getUTCMonth() + step * (rule.frequency === 'yearly' ? 12 : 1));
    const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
    result.setUTCDate(Math.min(anchor.getUTCDate(), lastDay));
  }
  if (result.getUTCFullYear() > 9999) throw new Error('Occurrence exceeds the supported date range.');
  const date = result.toISOString().slice(0, 10);
  return rule.end && date > rule.end ? null : date;
}

export function dueOccurrences(rule: RecurrenceRule, through: string, limit = 1000): string[] {
  calendarDate(through);
  if (!Number.isInteger(limit) || limit < 1 || limit > 10000) throw new Error('Invalid occurrence limit.');
  const dates: string[] = [];
  for (let index = 0; ; index++) {
    const date = occurrenceDate(rule, index);
    if (!date || date > through) return dates;
    if (dates.length === limit) throw new Error('Too many pending occurrences. Narrow the date range.');
    dates.push(date);
  }
}
