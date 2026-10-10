const ms: Record<string, string> = {
  "No liability contracts in this scenario.":
    "Tiada kontrak liabiliti dalam senario ini.",
  "Choose debts in one native currency.":
    "Pilih hutang dalam satu mata wang asal.",
  "Duplicate debt contracts.": "Kontrak hutang berulang.",
  "Fixed APR and minimum payment are required for every debt.":
    "APR tetap dan bayaran minimum diperlukan untuk setiap hutang.",
  "Combined scenarios require the same frequency, first payment date and balance snapshot date.":
    "Senario gabungan memerlukan kekerapan, tarikh bayaran pertama dan tarikh gambaran baki yang sama.",
  "Enter a positive payment budget.": "Masukkan bajet bayaran positif.",
  "Payment budget is below the combined minimum payments.":
    "Bajet bayaran kurang daripada jumlah bayaran minimum.",
  "Invalid debt assumption.": "Andaian hutang tidak sah.",
  "Principal and minimum must be positive.":
    "Prinsipal dan minimum mesti positif.",
  "Repayment requires matching native currencies.":
    "Bayaran balik memerlukan mata wang asal sepadan.",
  "Cash must equal principal + actual interest + fees, without overpayment.":
    "Tunai mesti sama dengan prinsipal + faedah sebenar + fi, tanpa bayaran berlebihan.",
  "APR needs at most two decimal places.":
    "APR memerlukan paling banyak dua tempat perpuluhan.",
  "APR exceeds the supported scenario range.":
    "APR melebihi julat senario yang disokong.",
};
export function planningMessage(
  message: string,
  copy: (en: string, ms: string) => string,
) {
  return copy(message, ms[message] ?? message);
}
