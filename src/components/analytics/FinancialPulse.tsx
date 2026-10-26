import type { Period } from '@/domain/periods';
import { IntelligenceCenter } from './IntelligenceCenter';
import { useFinancialCopy } from '../financial/shared';

/** Keep the existing customizable dashboard slot and its source-query cache. */
export function FinancialPulse({ period }: { period: Period }) {
  const c = useFinancialCopy();
  return <details className="card advanced-review"><summary>{c('Explore position, review prompts, and planning scenarios', 'Terokai kedudukan, semakan dan senario perancangan')}</summary><div className="p-4 sm:p-6"><IntelligenceCenter period={period} compact /></div></details>;
}
