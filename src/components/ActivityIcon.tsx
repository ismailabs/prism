import type { Transaction } from "@/types";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  HandCoins,
  Target,
} from "lucide-react";
export function activitySemantic(
  tx: Pick<Transaction, "type" | "activity_kind">,
) {
  return tx.activity_kind === "savings_allocation"
    ? "savings"
    : tx.activity_kind === "debt_principal"
      ? "debt"
      : tx.type;
}
export function ActivityIcon({
  kind,
  size = 17,
}: {
  kind: string;
  size?: number;
}) {
  const Icon =
    kind === "income"
      ? ArrowDownLeft
      : kind === "expense"
        ? ArrowUpRight
        : kind === "savings"
          ? Target
          : kind === "debt"
            ? HandCoins
            : ArrowLeftRight;
  return (
    <span className={"transaction-icon " + kind} aria-hidden="true">
      <Icon size={size} />
    </span>
  );
}
