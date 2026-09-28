import type { Currency } from '@/types';
import { decimalMoney, parseMoney, type NumberLocale } from './money';
import { calendarDate } from './recurrence';

export interface CsvDocument { headers: string[]; rows: string[][] }
export interface CsvMapping { date: number; amount: number; description: number; type?: number; currency?: number }
export interface ImportOptions { currency: Currency; numberLocale: NumberLocale; dateOrder: 'ymd' | 'dmy' | 'mdy'; defaultType: 'income' | 'expense' }
export interface ImportRow { row: number; date: string; amount: string; currency: Currency; type: 'income' | 'expense'; description: string; key: string; duplicate: boolean }
export interface ImportError { row: number; message: string }

/** Bounded RFC-4180 reader. Malformed quoting is rejected instead of shifting columns. */
export function readCsv(source: string, delimiter: ',' | ';' | '\t' = ','): CsvDocument {
  if (new TextEncoder().encode(source).length > 5 * 1024 * 1024) throw new Error('CSV files must be 5 MB or smaller.');
  const text = source.replace(/^\uFEFF/, '');
  const records: string[][] = [];
  let fields: string[] = [], field = '', quoted = false, closed = false;
  function finishField() { fields.push(field); field = ''; closed = false; }
  function finishRow() { finishField(); if (fields.some(value => value.trim())) records.push(fields); fields = []; if (records.length > 10001) throw new Error('Import at most 10,000 rows at a time.'); }
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else { quoted = false; closed = true; } }
      else field += char;
    } else if (char === delimiter) finishField();
    else if (char === '\r' || char === '\n') { if (char === '\r' && text[i + 1] === '\n') i++; finishRow(); }
    else if (closed) throw new Error('Unexpected text after a closing quote.');
    else if (char === '"') { if (field) throw new Error('Quote must start at the beginning of a field.'); quoted = true; }
    else field += char;
  }
  if (quoted) throw new Error('Unclosed quoted field.');
  if (field || fields.length || closed) finishRow();
  const headers = records.shift()?.map(value => value.trim()) ?? [];
  if (!headers.length || headers.some(value => !value) || new Set(headers).size !== headers.length) throw new Error('CSV needs non-empty, unique column headers.');
  return { headers, rows: records };
}

function importDate(value: string, order: ImportOptions['dateOrder']): string {
  const input = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) { calendarDate(input); return input; }
  const match = /^(\d{1,4})([/.-])(\d{1,2})\2(\d{1,4})$/.exec(input);
  if (!match) throw new Error('Date must match the selected date order.');
  const [a, b, c] = [match[1], match[3], match[4]];
  const [year, month, day] = order === 'ymd' ? [a, b, c] : order === 'dmy' ? [c, b, a] : [c, a, b];
  if (year.length !== 4) throw new Error('Use a four-digit year.');
  const date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  calendarDate(date);
  return date;
}

export function importRowKey(row: Pick<ImportRow, 'date' | 'amount' | 'currency' | 'type' | 'description'>): string {
  return JSON.stringify([row.date, row.amount, row.currency, row.type, row.description.trim()]);
}

export function previewImport(document: CsvDocument, mapping: CsvMapping, options: ImportOptions, existingKeys: ReadonlySet<string> = new Set()): { rows: ImportRow[]; errors: ImportError[] } {
  const columns = Object.values(mapping).filter((index): index is number => index !== undefined);
  if (columns.some(index => !Number.isInteger(index) || index < 0 || index >= document.headers.length) || new Set(columns).size !== columns.length) throw new Error('Map each field to a distinct valid column.');
  if (['date', 'amount', 'description'].some(key => mapping[key as keyof CsvMapping] === undefined)) throw new Error('Map date, amount, and description.');
  const rows: ImportRow[] = [], errors: ImportError[] = [], seen = new Set(existingKeys);
  document.rows.forEach((fields, index) => {
    const row = index + 2;
    try {
      if (fields.length !== document.headers.length) throw new Error('Column count does not match the header.');
      const currency = (mapping.currency === undefined ? options.currency : fields[mapping.currency].trim().toUpperCase()) as Currency;
      if (!['MYR', 'USD', 'EUR', 'JPY'].includes(currency)) throw new Error('Unsupported or missing currency.');
      const minor = parseMoney(fields[mapping.amount], currency, options.numberLocale);
      if (minor === 0n) throw new Error('Amount must be non-zero.');
      const suppliedType = mapping.type === undefined ? null : fields[mapping.type].trim().toLowerCase();
      if (suppliedType !== null && suppliedType !== 'income' && suppliedType !== 'expense') throw new Error('CSV supports income and expense; record transfers explicitly to avoid duplicate movement.');
      const type = suppliedType ?? (minor < 0n ? 'expense' : options.defaultType);
      if (minor < 0n && type === 'income') throw new Error('Negative income conflicts with the selected type.');
      const description = fields[mapping.description].trim();
      if (description.length > 500) throw new Error('Description exceeds 500 characters.');
      const value = { row, date: importDate(fields[mapping.date], options.dateOrder), amount: decimalMoney(minor < 0n ? -minor : minor, currency), currency, type, description };
      const key = importRowKey(value);
      rows.push({ ...value, key, duplicate: seen.has(key) });
      seen.add(key);
    } catch (error) { errors.push({ row, message: error instanceof Error ? error.message : 'Invalid row.' }); }
  });
  return { rows, errors };
}
