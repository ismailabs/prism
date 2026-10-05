import { useState, type FormEvent } from "react";
import { usePlatformMutation, usePlatformTable } from "@/hooks/usePlatformData";
import {
  useCategories,
  useCategoryMutations,
  useUpdateProfile,
} from "@/hooks/useFinanceData";
import { validTimezone, browserTimezone } from "@/domain/dates";
import { useAppStore } from "@/store/useAppStore";
import { errorMessage } from "@/lib/utils";
import type { Currency, Profile } from "@/types";
import { Button } from "../ui/button";
import { currencies, useFinancialCopy } from "./shared";
export function Onboarding({ profile }: { profile: Profile }) {
  const c = useFinancialCopy();
  const accounts = usePlatformTable("accounts");
  const mutations = usePlatformMutation("accounts");
  const update = useUpdateProfile();
  const categories = useCategoryMutations();
  const [skipped, setSkipped] = useState(
    () =>
      typeof localStorage !== "undefined" &&
      localStorage.getItem(`prism-setup:${profile.id}`) === "done",
  );
  const [currency, setCurrency] = useState<Currency>(profile.currency);
  const [timezone, setTimezone] = useState(
    profile.financial_timezone ?? browserTimezone(),
  );
  const [name, setName] = useState("");
  const [defaults, setDefaults] = useState(false);
  const [error, setError] = useState("");
  function finish() {
    localStorage.setItem(`prism-setup:${profile.id}`, "done");
    setSkipped(true);
  }
  const existingCategories = useCategories();
  async function save(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      if (!validTimezone(timezone))
        throw new Error(
          c("Choose a valid IANA timezone.", "Pilih zon waktu IANA yang sah."),
        );
      await update.mutateAsync({ currency, financial_timezone: timezone });
      if (defaults) {
        for (const category of [
          {
            name: c("Food", "Makanan"),
            type: "expense" as const,
            color: "#ea580c",
          },
          {
            name: c("Transport", "Pengangkutan"),
            type: "expense" as const,
            color: "#4265ee",
          },
          {
            name: c("Salary", "Gaji"),
            type: "income" as const,
            color: "#047857",
          },
        ]) {
          if (
            !existingCategories.data?.some(
              (row) => row.type === category.type && row.name === category.name,
            )
          )
            await categories.create.mutateAsync(category);
        }
      }
      await mutations.create.mutateAsync({
        name: name.trim(),
        currency,
        opening_balance: currency==='JPY'?'0':'0.00',
        archived: false,
      });
      finish();
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  if (skipped || accounts.isPending || accounts.error || accounts.data?.length)
    return null;
  return (
    <section
      className="card onboarding p-5 space-y-4 mb-5"
      aria-label={c("Quick setup", "Persediaan ringkas")}
    >
      <h2 className="font-semibold">
        {c(
          "Start with your financial foundations",
          "Mulakan asas kewangan anda",
        )}
      </h2>
      <p className="text-xs text-subtle">{c("Choose your currency, confirm your timezone, then add an account. You can adjust these later in settings.", "Pilih mata wang, sahkan zon waktu, kemudian tambah akaun. Anda boleh melaraskannya dalam tetapan kemudian.")}</p>
      <form
        className="grid sm:grid-cols-2 gap-3"
        onSubmit={(e) => void save(e)}
      >
        <label className="form-field">
          {c("Primary currency", "Mata wang utama")}
          <select
            className="input"
            value={currency}
            onChange={(e) => setCurrency(e.target.value as Currency)}
          >
            {currencies.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label className="form-field">
          {c("Financial timezone", "Zon waktu kewangan")}
          <input
            className="input"
            required
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
          />
        </label>
        <label className="form-field">
          {c("First account", "Akaun pertama")}
          <input
            className="input"
            required
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="flex gap-2 items-center text-sm">
          <input
            type="checkbox"
            checked={defaults}
            onChange={(e) => setDefaults(e.target.checked)}
          />
          {c("Add starter categories", "Tambah kategori permulaan")}
        </label>
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={
              update.isPending ||
              mutations.create.isPending ||
              categories.create.isPending
            }
          >
            {c("Save setup", "Simpan persediaan")}
          </Button>
          <Button variant="outline" type="button" onClick={finish}>
            {c("Skip setup", "Langkau persediaan")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => useAppStore.getState().setActiveTab("transactions")}
          >
            {c("Optional CSV import", "Import CSV pilihan")}
          </Button>
        </div>
      </form>
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
