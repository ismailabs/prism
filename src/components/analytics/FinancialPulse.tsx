import type { Period } from '@/domain/periods';
import { IntelligenceCenter } from './IntelligenceCenter';

/** Keep the existing customizable dashboard slot and its source-query cache. */
export function FinancialPulse({ period }: { period: Period }) {
  return <IntelligenceCenter period={period} compact />;
}
