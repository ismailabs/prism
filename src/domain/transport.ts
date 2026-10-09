import { z } from "zod";
import { parseMoney } from "./money";
const currency = z.enum(["MYR", "USD", "EUR", "JPY"]);
export const transactionTransport = z
  .object({
    id: z.string(),
    user_id: z.string(),
    amount: z.string(),
    currency,
    type: z.enum(["income", "expense"]),
    category_id: z.string().nullable(),
    payment_method_id: z.string().nullable(),
    account_id: z.string().nullable().optional(),
    description: z.string(),
    transaction_date: z.string(),
    created_at: z.string(),
    financial_date: z.string().optional(),
    activity_kind: z
      .enum(["ordinary", "savings_allocation", "debt_principal"])
      .optional(),
  })
  .superRefine((row, ctx) => {
    try {
      if (parseMoney(row.amount, row.currency) <= 0n)
        throw new Error("Transaction amounts must be positive.");
    } catch {
      ctx.addIssue({
        code: "custom",
        message: "Invalid exact monetary value.",
      });
    }
  });
export const transactionPageTransport = z.object({
  rows: z.array(transactionTransport),
  total: z.number().int().nonnegative(),
});
