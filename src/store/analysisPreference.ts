import { isDefaultPeriod, type DefaultPeriod } from '@/domain/periods';
export function readPeriodPreference(userId: string | undefined): DefaultPeriod {
  if (!userId) return 'month';
  try { const value = localStorage.getItem('prism-analysis-period:' + userId); return isDefaultPeriod(value) ? value : 'month'; } catch { return 'month'; }
}
export function cachePeriodPreference(userId: string, type: DefaultPeriod) {
  try { localStorage.setItem('prism-analysis-period:' + userId, type); } catch { /* Server preference remains authoritative. */ }
}
