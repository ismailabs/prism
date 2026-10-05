import { defaultSelection, resolveFinancialPeriod, type DefaultPeriod, type FinancialPeriodSelection } from '@/domain/periods';
import { cachePeriodPreference, readPeriodPreference } from '@/store/analysisPreference';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from './useAuth';
import { useProfile } from './useFinanceData';

export function useFinancialPeriod() {
  const { user } = useAuth();
  const profile = useProfile();
  const timezone = profile.data?.financial_timezone ?? 'UTC';
  const defaultType = profile.data?.default_analysis_period ?? readPeriodPreference(user?.id);
  const [temporary, setTemporary] = useState<{ userId: string; defaultType: DefaultPeriod; value: FinancialPeriodSelection } | null>(null);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 60_000); return () => clearInterval(timer); }, []);
  useEffect(() => { if (user && profile.data) cachePeriodPreference(user.id, defaultType); }, [user, profile.data, defaultType]);
  // Derive initial/default selections before rendering: no month-to-preference
  // effect flicker, and an ownership/default change cannot reuse stale selection.
  const selection = useMemo(() => temporary?.userId === user?.id && temporary?.defaultType === defaultType
    ? temporary.value : defaultSelection(defaultType, timezone, now), [temporary, user?.id, defaultType, timezone, now]);
  const period = useMemo(() => resolveFinancialPeriod(selection, timezone, now), [selection, timezone, now]);
  return {
    selection,
    period,
    setSelection: (value: FinancialPeriodSelection) => { if (user) setTemporary({ userId: user.id, defaultType, value }); },
  };
}
