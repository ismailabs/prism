import { useAppStore } from "@/store/useAppStore";
import type { TransactionFilters } from "@/hooks/useFinancialReports";
export function drillTransactions(filters: TransactionFilters) {
  const query = new URLSearchParams(
    Object.entries(filters).filter(([, v]) => v !== undefined && v !== ""),
  );
  useAppStore.getState().setActiveTab("transactions");
  window.history.replaceState(null, "", `/transactions?${query}`);
  window.dispatchEvent(new PopStateEvent("popstate"));
}
