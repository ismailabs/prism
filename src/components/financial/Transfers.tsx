import { financialDateTime, financialInstant } from "@/domain/dates";
import { decimalMoney, parseMoney } from "@/domain/money";
import { usePlatformMutation, usePlatformTable } from "@/hooks/usePlatformData";
import { errorMessage } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import type { Transfer } from "@/types";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Modal } from "../ui/dialog";
import { ActivityIcon } from '../ActivityIcon';
import { Failure, money, useFinancialCopy } from "./shared";

export function Transfers() {
  const c = useFinancialCopy();
  const timezone = useAppStore((s) => s.financialTimezone);
  const accounts = usePlatformTable("accounts");
  const transfers = usePlatformTable("transfers");
  const mutations = usePlatformMutation("transfers");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Transfer | null>(null);
  const [deleting, setDeleting] = useState<Transfer | null>(null);
  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("");
  const [received, setReceived] = useState("");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const a = accounts.data?.find((a) => a.id === source),
    b = accounts.data?.find((a) => a.id === destination);
  const same = !!a && !!b && a.currency === b.currency;
  function begin(t?: Transfer) {
    setEditing(t ?? null);
    setSource(t?.source_account_id ?? "");
    setDestination(t?.destination_account_id ?? "");
    setAmount(t?.source_amount ?? "");
    setReceived(t?.destination_amount ?? "");
    setDate(financialDateTime(t?.occurred_at ?? new Date(), timezone));
    setNote(t?.note ?? "");
    setError("");
    setOpen(true);
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      if (!a || !b || a.id === b.id)
        throw new Error(
          c("Choose two different accounts.", "Pilih dua akaun yang berbeza."),
        );
      const native = decimalMoney(parseMoney(amount, a.currency), a.currency);
      const target = same
        ? native
        : decimalMoney(parseMoney(received, b.currency), b.currency);
      if (
        parseMoney(native, a.currency) <= 0n ||
        parseMoney(target, b.currency) <= 0n
      )
        throw new Error(c("Amounts must be positive.", "Amaun mesti positif."));
      const values = {
        source_account_id: a.id,
        destination_account_id: b.id,
        source_amount: native,
        destination_amount: target,
        source_currency: a.currency,
        destination_currency: b.currency,
        occurred_at: financialInstant(date, timezone),
        note,
      };
      if (editing)
        await mutations.update.mutateAsync({ id: editing.id, values });
      else await mutations.create.mutateAsync(values);
      setOpen(false);
      toast.success(c("Transfer saved", "Pindahan disimpan"));
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  if (accounts.error || transfers.error)
    return (
      <Failure
        error={accounts.error ?? transfers.error}
        retry={() =>
          void Promise.all([accounts.refetch(), transfers.refetch()])
        }
      />
    );
  const name = (id: string) =>
    accounts.data?.find((a) => a.id === id)?.name ?? id;
  return (
    <section className="card p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold flex items-center gap-2"><ActivityIcon kind="transfer"/>{c("Transfers", "Pindahan")}</h2>
          <p className="text-sm text-subtle">
            {c(
              "Move money between accounts. Transfers do not change income or expenses.",
              "Pindahkan wang antara akaun. Pindahan tidak mengubah pendapatan atau perbelanjaan.",
            )}
          </p>
        </div>
        <Button className="shrink-0 whitespace-nowrap" onClick={() => begin()} disabled={accounts.isPending}>
          {c("New transfer", "Pindahan baharu")}
        </Button>
      </div>
      <ul className="divide-y divide-border">
        {transfers.data?.map((t) => (
          <li key={t.id} className="py-3 flex flex-wrap justify-between gap-3">
            <div>
              <strong>
                {name(t.source_account_id)} → {name(t.destination_account_id)}
              </strong>
              <p className="text-sm">
                {money(t.source_amount, t.source_currency)} →{" "}
                {money(t.destination_amount, t.destination_currency)}
              </p>
              <p className="text-xs text-subtle">
                {financialDateTime(t.occurred_at, timezone).replace("T", " ")} ·{" "}
                {t.note}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => begin(t)}>
                {c("Edit", "Sunting")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleting(t)}
              >
                {c("Delete", "Padam")}
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {!transfers.isPending && !transfers.data?.length && (
        <p className="text-sm text-subtle">
          {c("No transfers yet.", "Belum ada pindahan.")}
        </p>
      )}
      <Modal
        open={open}
        onOpenChange={setOpen}
        title={
          editing
            ? c("Edit transfer", "Sunting pindahan")
            : c("New transfer", "Pindahan baharu")
        }
      >
        <form onSubmit={(e) => void save(e)} className="space-y-4">
          {(
            [
              ["Source account", "Akaun sumber", source, setSource],
              [
                "Destination account",
                "Akaun destinasi",
                destination,
                setDestination,
              ],
            ] as const
          ).map(([en, ms, value, set]) => (
            <label key={en} className="form-field">
              {c(en, ms)}
              <select
                className="input"
                required
                value={value}
                onChange={(e) => set(e.target.value)}
              >
                <option value="">{c("Choose account", "Pilih akaun")}</option>
                {accounts.data
                  ?.filter((a) => !a.archived || a.id === value)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} · {a.currency}
                    </option>
                  ))}
              </select>
            </label>
          ))}
          <label className="form-field">
            {c("Source amount", "Amaun sumber")} ({a?.currency})
            <input
              className="input"
              inputMode="decimal"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
          {!same && (
            <label className="form-field">
              {c("Destination amount", "Amaun destinasi")} ({b?.currency})
              <input
                className="input"
                inputMode="decimal"
                required
                value={received}
                onChange={(e) => setReceived(e.target.value)}
              />
            </label>
          )}
          <p className="text-xs text-subtle">
            {c(
              "Enter actual native amounts. Current exchange rates are not used.",
              "Masukkan amaun sebenar setiap mata wang. Kadar pertukaran semasa tidak digunakan.",
            )}
          </p>
          <label className="form-field">
            {c("Date", "Tarikh")} · {timezone}
            <input
              className="input"
              type="datetime-local"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <label className="form-field">
            {c("Note", "Nota")}
            <input
              className="input"
              maxLength={500}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          {error && (
            <p role="alert" className="error-message">
              {error}
            </p>
          )}
          <div className="modal-actions">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              {c("Cancel", "Batal")}
            </Button>
            <Button
              disabled={
                mutations.create.isPending || mutations.update.isPending
              }
            >
              {c("Save transfer", "Simpan pindahan")}
            </Button>
          </div>
        </form>
      </Modal>
      <Modal
        open={!!deleting}
        onOpenChange={(v) => {
          if (!v) setDeleting(null);
        }}
        title={c("Delete transfer", "Padam pindahan")}
      >
        <p>
          {c(
            "Removing this transfer reverses both account movements.",
            "Memadam pindahan membalikkan pergerakan kedua-dua akaun.",
          )}
        </p>
        <div className="modal-actions mt-5">
          <Button variant="outline" onClick={() => setDeleting(null)}>
            {c("Cancel", "Batal")}
          </Button>
          <Button
            variant="destructive"
            disabled={mutations.remove.isPending}
            onClick={() => {
              if (deleting)
                void mutations.remove
                  .mutateAsync(deleting.id)
                  .then(() => setDeleting(null))
                  .catch((e) => toast.error(errorMessage(e)));
            }}
          >
            {c("Delete transfer", "Padam pindahan")}
          </Button>
        </div>
      </Modal>
    </section>
  );
}
