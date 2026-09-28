import { describe, expect, it } from 'vitest';
import { decimalMoney, parseMoney } from './money';
import { dueOccurrences, occurrenceDate } from './recurrence';
import { previewImport, readCsv } from './csv';

describe('exact monetary boundaries', () => {
  it('adds decimal money without floating point and preserves large values', () => {
    expect(decimalMoney(parseMoney('0.10', 'MYR') + parseMoney('0.20', 'MYR'), 'MYR')).toBe('0.30');
    expect(decimalMoney(parseMoney('90071992547409.93', 'MYR'), 'MYR')).toBe('90071992547409.93');
    expect(decimalMoney(parseMoney('-0.01', 'MYR'), 'MYR')).toBe('-0.01');
  });
  it('supports explicit decimal conventions and currency precision', () => {
    expect(parseMoney('1,234.56', 'MYR')).toBe(123456n);
    expect(parseMoney('1.234,56', 'EUR', 'comma-decimal')).toBe(123456n);
    expect(parseMoney('1,000', 'JPY')).toBe(1000n);
    for (const value of ['NaN', 'Infinity', '1e3', '12,34.56', '1.234', '', '0x10', '1 000.00']) expect(() => parseMoney(value, 'MYR')).toThrow();
    expect(() => parseMoney('1.01', 'JPY')).toThrow();
    expect(() => parseMoney('10000000000000000', 'MYR')).toThrow();
  });
});

describe('anchored recurrence rules', () => {
  it('clamps short months without drifting the anchor', () => {
    const rule = { start: '2024-01-31', frequency: 'monthly' as const, interval: 1 };
    expect(dueOccurrences(rule, '2024-03-31')).toEqual(['2024-01-31', '2024-02-29', '2024-03-31']);
  });
  it('handles leap years, inclusive end dates and interval rules', () => {
    expect(occurrenceDate({ start: '2024-02-29', frequency: 'yearly', interval: 1 }, 1)).toBe('2025-02-28');
    expect(dueOccurrences({ start: '2026-09-01', end: '2026-09-15', frequency: 'weekly', interval: 2 }, '2026-10-01')).toEqual(['2026-09-01', '2026-09-15']);
    expect(() => occurrenceDate({ start: '2026-02-30', frequency: 'monthly', interval: 1 }, 0)).toThrow();
    expect(() => dueOccurrences({ start: '2020-01-01', frequency: 'daily', interval: 1 }, '2026-01-01', 10)).toThrow();
  });
});

const mapping = { date: 0, amount: 1, description: 2 };
const options = { currency: 'MYR' as const, numberLocale: 'dot-decimal' as const, dateOrder: 'dmy' as const, defaultType: 'expense' as const };
describe('CSV validation and preview', () => {
  it('reads BOM, multiline quoted text, delimiters and escaped quotes', () => {
    const csv = readCsv('\uFEFFDate;Amount;Description\r\n28/09/2026;"1.234,56";"A; B\n""shop"""', ';');
    const result = previewImport(csv, mapping, { ...options, numberLocale: 'comma-decimal' });
    expect(result.errors).toEqual([]);
    expect(result.rows[0]).toMatchObject({ amount: '1234.56', date: '2026-09-28', description: 'A; B\n"shop"' });
  });
  it('marks duplicates within a file and against existing records', () => {
    const csv = readCsv('Date,Amount,Description\n2026-09-28,10,Shop\n2026-09-28,10.00,Shop');
    const first = previewImport(csv, mapping, options);
    expect(first.rows.map(row => row.duplicate)).toEqual([false, true]);
    expect(previewImport(csv, mapping, options, new Set([first.rows[0].key])).rows.every(row => row.duplicate)).toBe(true);
  });
  it('reports bad dates, precision and column counts per row', () => {
    const result = previewImport(readCsv('Date,Amount,Description\n31/02/2026,10,Shop\n28/09/2026,0.001,Shop\n28/09/2026,1,Shop,extra\n28/09/2026,-2,Shop'), mapping, options);
    expect(result.errors.map(error => error.row)).toEqual([2, 3, 4]);
    expect(result.rows[0]).toMatchObject({ row: 5, amount: '2.00', type: 'expense' });
  });
  it('rejects malformed files and ambiguous mapping', () => {
    for (const source of ['Date,Date\n1,2', 'Date,Amount\n"unfinished,2', 'Date,Amount\n"a"x,2', 'Date,Amount\na"b,2']) expect(() => readCsv(source)).toThrow();
    expect(() => previewImport(readCsv('Date,Amount,Description'), { date: 0, amount: 0, description: 2 }, options)).toThrow();
  });
  it('rejects transfers and conflicting signs instead of importing false expenses', () => {
    const result = previewImport(readCsv('Date,Amount,Description,Type\n2026-09-28,10,Move,transfer\n2026-09-28,-2,Salary,income'), { ...mapping, type: 3 }, options);
    expect(result.errors).toHaveLength(2);
  });
});
