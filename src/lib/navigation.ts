import { navigatePath } from './routes';
import type { TransactionFilters } from "@/hooks/useFinancialReports";
export function drillTransactions(filters: TransactionFilters) {
  const query = new URLSearchParams(
    Object.entries(filters).filter(([, v]) => v !== undefined && v !== ""),
  );
  // Publish the complete destination before route state updates mount the page.
  // This avoids an intermediate unfiltered render consuming the deep link.
  navigatePath(`/transactions?${query}`);
}
