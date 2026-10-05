import { parseMoney } from "@/domain/money";
import { accountBalance } from "@/domain/progress";
import { useTransactions } from "@/hooks/useFinanceData";
import { usePlatformMutation, usePlatformTable } from "@/hooks/usePlatformData";
import { errorMessage } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import type { Account, Currency, Transaction } from "@/types";
import { Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Modal } from "../ui/dialog";
import { usePlatformText } from "./copy";
import { Failure, currencies, money } from "./shared";
import { Transfers } from "./Transfers";
function hasLinks(account: Account, transactions: Transaction[]) {
  return (
    (account.linked_activity_count ??
      transactions.filter((t) => t.account_id === account.id).length) > 0
  );
}
export function AccountsPage() {
  const L = usePlatformText();
  const accounts = usePlatformTable("accounts");
  const transactions = useTransactions();
  const mutations = usePlatformMutation("accounts");
  const [editing, setEditing] = useState<Account | null>(null);
  const [deleting, setDeleting] = useState<Account | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState<Currency>("MYR");
  const [opening, setOpening] = useState("0");
  const [formError, setFormError] = useState("");
  function begin(account?: Account) {
    setEditing(account ?? null);
    setName(account?.name ?? "");
    setCurrency(account?.currency ?? useAppStore.getState().currency);
    setOpening(account?.opening_balance ?? "0");
    setOpen(true);
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    setFormError("");
    try {
      parseMoney(opening, currency);
      const linked = editing
        ? hasLinks(editing, transactions.data ?? [])
        : false;
      if (editing && linked && currency !== editing.currency)
        throw new Error(
          L(
            "Move or unlink this account’s transactions before changing its currency. Their original amounts and currencies will not be rewritten.",
          ),
        );
      if (editing)
        await mutations.update.mutateAsync({
          id: editing.id,
          values: {
            name: name.trim(),
            currency,
            opening_balance: opening,
            archived: editing.archived,
          },
        });
      else
        await mutations.create.mutateAsync({
          name: name.trim(),
          currency,
          opening_balance: opening,
          archived: false,
        });
      setOpen(false);
      toast.success(L("Account saved"));
    } catch (cause) {
      setFormError(errorMessage(cause));
    }
  }
  async function remove() {
    if (!deleting) return;
    const linked = hasLinks(deleting, transactions.data ?? []);
    if (linked) return;
    try {
      await mutations.remove.mutateAsync(deleting.id);
      setDeleting(null);
      toast.success(L("Account deleted"));
    } catch (cause) {
      toast.error(errorMessage(cause));
    }
  }
  if (accounts.error || transactions.error)
    return (
      <Failure
        error={accounts.error ?? transactions.error}
        retry={() =>
          void Promise.all([accounts.refetch(), transactions.refetch()])
        }
      />
    );
  return (
    <div className="space-y-5">
      <div className="feature-intro">
        <p className="text-sm text-subtle">
          {L(
            "Balances use opening amounts, assigned cash transactions, transfers, and account-funded debt principal. Earmarks do not move cash.",
          )}
        </p>
        <Button onClick={() => begin()}>
          <Plus size={16} />
          {L("Add account")}
        </Button>
      </div>
      {accounts.isPending || transactions.isPending ? (
        <p role="status">{L("Loading accounts…")}</p>
      ) : !accounts.data?.length ? (
        <div className="card empty-state">
          <h2>{L("No accounts yet")}</h2>
          <p>
            {L(
              "Add a bank, cash, or wallet account to see a reliable position from linked transactions.",
            )}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {accounts.data.map((a) => (
            <article key={a.id} className="card account-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{a.name}</h2>
                  <p className="text-xs text-subtle">
                    {a.currency} · {a.archived ? L("Archived") : L("Active")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => begin(a)}>
                    {L("Edit")}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={L(`Delete ${a.name}`)}
                    onClick={() => setDeleting(a)}
                  >
                    <Trash2 size={16} className="text-red-600" />
                  </Button>
                </div>
              </div>
              <p className="mt-6 text-2xl font-semibold">
                {money(accountBalance(a, transactions.data ?? []), a.currency)}
              </p>
              <p className="mt-2 text-xs text-subtle">
                {L("Opening")} {money(a.opening_balance, a.currency)} ·{" "}
                {a.transaction_count ??
                  (transactions.data ?? []).filter((t) => t.account_id === a.id)
                    .length}{" "}
                {L("linked transactions")}
              </p>
              <button
                className="mt-4 text-link"
                onClick={() =>
                  void mutations.update
                    .mutateAsync({
                      id: a.id,
                      values: { archived: !a.archived },
                    })
                    .then(() =>
                      toast.success(
                        a.archived
                          ? L("Account restored")
                          : L("Account archived"),
                      ),
                    )
                    .catch((e) => toast.error(errorMessage(e)))
                }
              >
                {a.archived ? L("Restore") : L("Archive")}
              </button>
            </article>
          ))}
        </div>
      )}
      <Transfers />
      <Modal
        open={open}
        onOpenChange={(value) => {
          setOpen(value);
          if (!value) setFormError("");
        }}
        title={editing ? L("Edit account") : L("New account")}
      >
        <form className="space-y-4" onSubmit={(event) => void submit(event)}>
          <label className="form-field">
            {L("Account name")}
            <input
              className="input"
              required
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="form-field">
            {L("Currency")}
            <select
              className="input"
              value={currency}
              onChange={(e) => setCurrency(e.target.value as Currency)}
            >
              {currencies.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="form-field">
            {L("Opening balance")}
            <input
              className="input"
              required
              inputMode="decimal"
              value={opening}
              onChange={(e) => setOpening(e.target.value)}
            />
          </label>
          {editing && hasLinks(editing, transactions.data ?? []) && (
            <p className="text-xs text-subtle">
              {L(
                "Opening balance can be updated. To change currency, first move or unlink this account’s transactions so their native amounts remain intact.",
              )}
            </p>
          )}
          {formError && (
            <p className="error-message" role="alert">
              {formError}
            </p>
          )}
          <div className="modal-actions">
            <Button
              variant="outline"
              type="button"
              disabled={
                mutations.update.isPending || mutations.create.isPending
              }
              onClick={() => setOpen(false)}
            >
              {L("Cancel")}
            </Button>
            <Button
              disabled={
                mutations.create.isPending ||
                mutations.update.isPending ||
                !name.trim()
              }
            >
              {mutations.create.isPending || mutations.update.isPending
                ? L("Saving…")
                : L("Save account")}
            </Button>
          </div>
        </form>
      </Modal>
      <Modal
        open={!!deleting}
        onOpenChange={(value) => {
          if (!value && !mutations.remove.isPending) setDeleting(null);
        }}
        title={L("Delete financial account")}
        description={L(
          "This permanently removes the account. Transactions are preserved.",
        )}
      >
        {deleting && (
          <>
            <p className="text-sm">
              {L("Delete")} <strong>{deleting.name}</strong>?
            </p>
            {hasLinks(deleting, transactions.data ?? []) ? (
              <p className="warning-message mt-4" role="alert">
                {L("This account has")}{" "}
                {deleting.linked_activity_count ??
                  (transactions.data ?? []).filter(
                    (t) => t.account_id === deleting.id,
                  ).length}{" "}
                {L(
                  "linked financial record(s). Preserve history by archiving this account, or explicitly remove its references before deletion.",
                )}
              </p>
            ) : (
              <p className="mt-3 text-sm text-subtle">
                {L(
                  "No financial records are linked. This action cannot be undone.",
                )}
              </p>
            )}
            <div className="modal-actions mt-6">
              <Button
                variant="outline"
                disabled={mutations.remove.isPending}
                onClick={() => setDeleting(null)}
              >
                {L("Cancel")}
              </Button>
              <Button
                variant="destructive"
                disabled={
                  mutations.remove.isPending ||
                  hasLinks(deleting, transactions.data ?? [])
                }
                onClick={() => void remove()}
              >
                {mutations.remove.isPending
                  ? L("Deleting…")
                  : L("Delete account")}
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}

export function AccountsSection() {
  const L = usePlatformText();
  const accounts = usePlatformTable("accounts");
  const transactions = useTransactions();
  const { setActiveTab } = useAppStore();
  if (accounts.error || transactions.error)
    return (
      <Failure
        error={accounts.error ?? transactions.error}
        retry={() =>
          void Promise.all([accounts.refetch(), transactions.refetch()])
        }
      />
    );
  return (
    <section className="space-y-3" aria-labelledby="transaction-accounts">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="transaction-accounts" className="text-lg font-semibold">
            {L("Accounts")}
          </h2>
          <p className="mt-1 text-sm text-subtle">
            {L("Balances from real accounts and their linked transactions.")}
          </p>
        </div>
        <Button variant="outline" onClick={() => setActiveTab("accounts")}>
          {L("Manage accounts")}
        </Button>
      </div>
      {accounts.isPending || transactions.isPending ? (
        <p role="status">{L("Loading accounts…")}</p>
      ) : !(accounts.data ?? []).filter((a) => !a.archived).length ? (
        <div className="card empty-state">
          <h3>{L("No active accounts")}</h3>
          <p>
            {L(
              "Add an account or restore an archived one to connect transactions.",
            )}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {(accounts.data ?? [])
            .filter((a) => !a.archived)
            .map((a) => (
              <button
                key={a.id}
                className="card p-5 text-left hover:border-primary"
                onClick={() => setActiveTab("accounts")}
              >
                <span className="text-sm font-semibold">{a.name}</span>
                <strong className="mt-3 block text-xl">
                  {money(
                    accountBalance(a, transactions.data ?? []),
                    a.currency,
                  )}
                </strong>
                <span className="mt-2 block text-xs text-subtle">
                  {a.transaction_count ??
                    (transactions.data ?? []).filter(
                      (t) => t.account_id === a.id,
                    ).length}{" "}
                  {L("linked transactions ·")} {a.currency}
                </span>
              </button>
            ))}
        </div>
      )}
    </section>
  );
}
