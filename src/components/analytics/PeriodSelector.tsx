import { defaultPeriodTypes, defaultSelection, validCalendarDate, validMonth, type FinancialPeriodSelection, type Period } from '@/domain/periods';
import { financialDate } from '@/domain/dates';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/button';

export function PeriodSelector({ selection, period, onChange }: { selection: FinancialPeriodSelection; period: Period; onChange: (value: FinancialPeriodSelection) => void }) {
  const { t } = useTranslation();
  const id = useId();
  const [start, setStart] = useState(selection.type === 'custom' ? selection.start : period.from);
  const [end, setEnd] = useState(selection.type === 'custom' ? selection.end : period.to);
  const [error, setError] = useState('');
  const today = financialDate(new Date(), period.timezone ?? 'UTC');
  return <div className="period-selector">
    <label className="form-field">{t('period')}<select className="input" aria-label={t('period')} value={selection.type} onChange={event => {
      const type = event.target.value;
      setError('');
      if (type === 'custom') {
        const from = period.from || today, to = period.to || today;
        setStart(from); setEnd(to); onChange({ type, start: from, end: to });
      } else {
        const choice = defaultPeriodTypes.find(value => value === type);
        if (choice) onChange(defaultSelection(choice, period.timezone ?? 'UTC'));
      }
    }}>{[...defaultPeriodTypes, 'custom'].map(type => <option key={type} value={type}>{t('period_' + type)}</option>)}</select></label>
    {selection.type === 'month' && <label className="form-field">{t('month')}<input className="input" type="month" min="0002-01" max="9998-12" value={selection.month} onChange={event => { if (validMonth(event.target.value)) onChange({ type: 'month', month: event.target.value }); }}/></label>}
    {selection.type === 'year-to-date' && <label className="form-field">{t('year')}<input className="input period-year" type="number" min="2" max={Number(today.slice(0,4))} value={selection.year} onChange={event => { const year = Number(event.target.value); if (Number.isInteger(year) && year >= 2 && year <= Number(today.slice(0,4))) onChange({ type: 'year-to-date', year }); }}/></label>}
    {selection.type === 'custom' && <form className="period-custom" onSubmit={event => {
      event.preventDefault();
      if (!validCalendarDate(start) || !validCalendarDate(end)) { setError(t('invalidPeriodDates')); return; }
      if (start > end) { setError(t('invalidPeriodOrder')); return; }
      setError(''); onChange({ type: 'custom', start, end });
    }}>
      <label className="form-field">{t('startDate')}<input className="input" type="date" min="0002-01-01" max="9998-12-31" required value={start} aria-invalid={!!error} aria-describedby={error ? id : undefined} onChange={event => setStart(event.target.value)}/></label>
      <label className="form-field">{t('endDate')}<input className="input" type="date" min="0002-01-01" max="9998-12-31" required value={end} aria-invalid={!!error} aria-describedby={error ? id : undefined} onChange={event => setEnd(event.target.value)}/></label>
      <Button type="submit" variant="outline">{t('applyPeriod')}</Button>
      {error && <p id={id} className="error-message" role="alert">{error}</p>}
    </form>}
  </div>;
}
export function periodLabel(selection: FinancialPeriodSelection, locale: string, translate: (key: string) => string) {
  if (selection.type === 'month') return new Intl.DateTimeFormat(locale === 'ms' ? 'ms-MY' : 'en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(selection.month + '-01T12:00:00Z'));
  if (selection.type === 'custom') return selection.start + ' — ' + selection.end;
  return translate('period_' + selection.type) + (selection.type === 'year-to-date' ? ' · ' + selection.year : '');
}
