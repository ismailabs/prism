import { parseMoney } from "@/domain/money";
import { errorMessage } from "@/lib/utils";
import { formatCurrency } from "@/services/currency";
import { useAppStore } from "@/store/useAppStore";
import type { Currency } from "@/types";
import { Button } from "../ui/button";
import { useTranslation } from 'react-i18next';
export const currencies: Currency[] = ["MYR", "USD", "EUR", "JPY"];
export function useFinancialCopy() {
  const locale = useAppStore((s) => s.locale);
  return (en: string, ms: string) => (locale === "ms" ? ms : en);
}
export function money(amount: string, currency: Currency) {
  return formatCurrency(amount, currency, useAppStore.getState().locale);
}
export function positive(amount: string, currency: Currency) {
  try {
    return parseMoney(amount, currency) > 0n;
  } catch {
    return false;
  }
}
export function Failure({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  const c = useFinancialCopy();
  return (
    <div className="card p-6" role="alert">
      <p>
        {c(
          "Unable to load this financial data",
          "Data kewangan tidak dapat dimuatkan",
        )}
      </p>
      <p className="mt-2 text-sm">{errorMessage(error)}</p>
      <Button className="mt-4" onClick={retry}>
        {c("Try again", "Cuba lagi")}
      </Button>
    </div>
  );
}
export function ProgressBar({ value, tone = "savings" }: { value: number; tone?: "savings" | "debt" }) {
  const c = useFinancialCopy();
  const { t }=useTranslation();
  const percent = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  const milestone=[100,75,50,25].find(m=>percent>=m);
  return (
    <div className="progress-with-milestone">
    <div
      className="progress-track"
      role="progressbar"
      aria-label={c("Progress", "Kemajuan")}
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`h-full rounded-full progress-fill progress-${tone}`}
        style={{ width: `${percent}%` }}
      />
    </div>
    {milestone && <small className="milestone-note">{t(milestone===100?'milestoneComplete':'milestone',{percent:milestone})}</small>}
    </div>
  );
}
