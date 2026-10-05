import {
  previewImport,
  readCsv,
  type CsvDocument,
  type CsvMapping,
  type ImportOptions,
} from "@/domain/csv";
import { usePlanningData } from "@/hooks/usePlanningData";
import { usePlatformTable } from "@/hooks/usePlatformData";
import { errorMessage } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import type { Category, Currency, PaymentMethod } from "@/types";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Modal } from "../ui/dialog";
import { currencies, money, useFinancialCopy } from "./shared";
export function CsvImport({
  categories,
  payments,
}: {
  categories: Category[];
  payments: PaymentMethod[];
}) {
  const c = useFinancialCopy();
  const timezone = useAppStore((s) => s.financialTimezone);
  const accounts = usePlatformTable("accounts");
  const { importRows } = usePlanningData();
  const [open, setOpen] = useState(false);
  const [doc, setDoc] = useState<CsvDocument | null>(null);
  const [mapping, setMapping] = useState<CsvMapping>({
    date: 0,
    amount: 1,
    description: 2,
  });
  const [options, setOptions] = useState<ImportOptions>({
    currency: useAppStore.getState().currency,
    numberLocale: "dot-decimal",
    dateOrder: "ymd",
    defaultType: "expense",
  });
  const [account, setAccount] = useState("");
  const [category, setCategory] = useState("");
  const [payment, setPayment] = useState("");
  const [skip, setSkip] = useState(true);
  const [preview, setPreview] = useState<ReturnType<
    typeof previewImport
  > | null>(null);
  const [batch, setBatch] = useState("");
  const [error, setError] = useState("");
  function validate() {
    setError("");
    try {
      if (!doc) throw new Error(c("Choose a CSV file.", "Pilih fail CSV."));
      const result = previewImport(doc, mapping, options);
      const assigned = accounts.data?.find((a) => a.id === account),
        cat = categories.find((a) => a.id === category);
      for (const row of result.rows) {
        if (assigned && assigned.currency !== row.currency)
          result.errors.push({
            row: row.row,
            message: c(
              "Account currency does not match.",
              "Mata wang akaun tidak sepadan.",
            ),
          });
        if (cat && cat.type !== row.type)
          result.errors.push({
            row: row.row,
            message: c(
              "Category type does not match.",
              "Jenis kategori tidak sepadan.",
            ),
          });
      }
      setBatch(crypto.randomUUID());
      setPreview(result);
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  async function perform() {
    if (!preview || preview.errors.length) return;
    setError("");
    try {
      const rows = preview.rows
        .filter((r) => !skip || !r.duplicate)
        .map((r) => ({
          date: r.date,
          amount: r.amount,
          currency: r.currency,
          type: r.type,
          description: r.description,
          account_id: account || null,
          category_id: category || null,
          payment_method_id: payment || null,
        }));
      const count = await importRows.mutateAsync({ rows, batch, skip });
      toast.success(
        c(`${count} transactions imported`, `${count} transaksi diimport`),
      );
      setPreview(null);
      setDoc(null);
      setOpen(false);
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  const invalidate = () => setPreview(null);
  return (
    <>
      <div className="flex">
        <Button variant="outline" onClick={() => { if(!doc)setOptions(current=>({...current,currency:useAppStore.getState().currency})); setOpen(true); }}>
          {c("Import CSV", "Import CSV")}
        </Button>
      </div>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title={c("Import transactions", "Import transaksi")}
      >
        <div className="space-y-4">
          <p className="text-sm">
            {c(
              "Calendar dates use your financial timezone. Every row is validated before one atomic import.",
              "Tarikh kalendar menggunakan zon waktu kewangan anda. Setiap baris disahkan sebelum import atomik.",
            )}{" "}
            · {timezone}
          </p>
          <label className="form-field">
            {c("CSV file", "Fail CSV")}
            <input
              className="input"
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                invalidate();
                const file = e.target.files?.[0];
                if (file)
                  void file
                    .text()
                    .then((text) => {
                      setDoc(readCsv(text));
                      setError("");
                    })
                    .catch((e) => setError(errorMessage(e)));
              }}
            />
          </label>
          {doc && (
            <>
              {(
                ["date", "amount", "description", "type", "currency"] as const
              ).map((key, index) => (
                <label key={key} className="form-field">
                  {c(
                    [
                      "Date column",
                      "Amount column",
                      "Description column",
                      "Type column (optional)",
                      "Currency column (optional)",
                    ][index],
                    [
                      "Lajur tarikh",
                      "Lajur amaun",
                      "Lajur penerangan",
                      "Lajur jenis (pilihan)",
                      "Lajur mata wang (pilihan)",
                    ][index],
                  )}
                  <select
                    className="input"
                    value={mapping[key] ?? ""}
                    onChange={(e) => {
                      invalidate();
                      setMapping({
                        ...mapping,
                        [key]:
                          e.target.value === ""
                            ? undefined
                            : Number(e.target.value),
                      });
                    }}
                  >
                    {index > 2 && (
                      <option value="">
                        {c("Use default", "Gunakan lalai")}
                      </option>
                    )}
                    {doc.headers.map((header, i) => (
                      <option key={header} value={i}>
                        {header}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
              <label className="form-field">
                {c("Default currency", "Mata wang lalai")}
                <select
                  className="input"
                  value={options.currency}
                  onChange={(e) => {
                    invalidate();
                    setOptions({
                      ...options,
                      currency: e.target.value as Currency,
                    });
                  }}
                >
                  {currencies.map((cur) => (
                    <option key={cur}>{cur}</option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                {c("Number format", "Format nombor")}
                <select
                  className="input"
                  value={options.numberLocale}
                  onChange={(e) => {
                    invalidate();
                    setOptions({
                      ...options,
                      numberLocale: e.target
                        .value as ImportOptions["numberLocale"],
                    });
                  }}
                >
                  <option value="dot-decimal">1,234.56</option>
                  <option value="comma-decimal">1.234,56</option>
                </select>
              </label>
              <label className="form-field">
                {c("Date order", "Susunan tarikh")}
                <select
                  className="input"
                  value={options.dateOrder}
                  onChange={(e) => {
                    invalidate();
                    setOptions({
                      ...options,
                      dateOrder: e.target.value as ImportOptions["dateOrder"],
                    });
                  }}
                >
                  {["ymd", "dmy", "mdy"].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                {c("Default type", "Jenis lalai")}
                <select
                  className="input"
                  value={options.defaultType}
                  onChange={(e) => {
                    invalidate();
                    setOptions({
                      ...options,
                      defaultType: e.target.value as "income" | "expense",
                    });
                  }}
                >
                  <option value="expense">
                    {c("Expense", "Perbelanjaan")}
                  </option>
                  <option value="income">{c("Income", "Pendapatan")}</option>
                </select>
              </label>
              {(
                [
                  [
                    "Account",
                    "Akaun",
                    account,
                    setAccount,
                    accounts.data ?? [],
                  ],
                  ["Category", "Kategori", category, setCategory, categories],
                  [
                    "Payment method",
                    "Kaedah pembayaran",
                    payment,
                    setPayment,
                    payments,
                  ],
                ] as const
              ).map(([en, ms, value, set, rows]) => (
                <label className="form-field" key={en}>
                  {c(en, ms)}
                  <select
                    className="input"
                    value={value}
                    onChange={(e) => {
                      invalidate();
                      set(e.target.value);
                    }}
                  >
                    <option value="">
                      {c("Unassigned", "Tidak ditetapkan")}
                    </option>
                    {rows.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
              <label className="flex gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={skip}
                  onChange={(e) => setSkip(e.target.checked)}
                />
                {c(
                  "Skip matching duplicate rows",
                  "Langkau baris pendua yang sepadan",
                )}
              </label>
              <Button variant="outline" onClick={validate}>
                {c("Preview and validate", "Pratonton dan sahkan")}
              </Button>
            </>
          )}
          {preview && (
            <section aria-live="polite">
              <p>
                {preview.rows.length} {c("valid rows", "baris sah")} ·{" "}
                {preview.errors.length} {c("errors", "ralat")}
              </p>
              {preview.errors.length > 0 && (
                <ul className="text-sm error-message" role="alert">
                  {preview.errors.map((e, i) => (
                    <li key={i}>
                      {c("Row", "Baris")} {e.row}: {e.message}
                    </li>
                  ))}
                </ul>
              )}
              <ul className="text-xs max-h-48 overflow-auto">
                {preview.rows.slice(0, 30).map((r) => (
                  <li key={r.row}>
                    {r.row} · {r.date} · {r.description} ·{" "}
                    {money(r.amount, r.currency)}
                    {r.duplicate ? c(" · duplicate", " · pendua") : ""}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-subtle">
                {c(
                  "Showing the first 30 rows. Import includes all validated rows.",
                  "Memaparkan 30 baris pertama. Import merangkumi semua baris yang disahkan.",
                )}
              </p>
              <Button
                disabled={
                  !!preview.errors.length ||
                  !preview.rows.length ||
                  importRows.isPending
                }
                onClick={() => void perform()}
              >
                {c("Import validated rows", "Import baris yang disahkan")}
              </Button>
            </section>
          )}
          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}
        </div>
      </Modal>
    </>
  );
}
