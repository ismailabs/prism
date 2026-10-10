import { financialDate } from "@/domain/dates";
import { parseMoney, parseMoneyTotal } from "@/domain/money";
import { goalFunding } from "@/domain/goal-actions";
import { useGoalActions } from '@/hooks/useGoalActions';
import { GoalActionPlan } from './GoalActionPlan';
import { useTransactions } from "@/hooks/useFinanceData";
import { usePlatformMutation, usePlatformTable } from "@/hooks/usePlatformData";
import { errorMessage } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import type { Currency, Objective, ObjectiveKind } from "@/types";
import { Check, Plus, Trash2 } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Modal } from "../ui/dialog";
import { usePlatformText } from "./copy";
import { Failure, ProgressBar, currencies, money, positive, useFinancialCopy } from "./shared";
export function ObjectivesPage({ kind }: { kind: ObjectiveKind }) {
  const L = usePlatformText();
  const c = useFinancialCopy();
  const goalActions = useGoalActions();
  const [requestIdentity,setRequestIdentity]=useState({id:crypto.randomUUID(),at:new Date().toISOString()});
  const timezone = useAppStore((s) => s.financialTimezone);
  const transfers = usePlatformTable("transfers");
  const accounts = usePlatformTable("accounts");
  const [funding, setFunding] = useState("");
  const objectives = usePlatformTable("objectives");
  const contributions = usePlatformTable("objective_contributions");
  const milestones = usePlatformTable("objective_milestones");
  const repayments = usePlatformTable("debt_repayments");
  const transactions = useTransactions();
  const objectiveMutations = usePlatformMutation("objectives");
  const contributionMutations = usePlatformMutation("objective_contributions");
  const milestoneMutations = usePlatformMutation("objective_milestones");
  const [selected, setSelected] = useState<string | null>(()=>typeof window==='undefined'?null:new URLSearchParams(window.location.search).get('item'));
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Objective | null>(null);
  const [deleting, setDeleting] = useState<Objective | null>(null);
  const [contributeOpen, setContributeOpen] = useState(false);
  const [milestoneOpen, setMilestoneOpen] = useState(false);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [category, setCategory] = useState(L("General"));
  const [priority, setPriority] = useState<Objective["priority"]>("normal");
  const [target, setTarget] = useState("");
  const [currency, setCurrency] = useState<Currency>("MYR");
  const [targetDate, setTargetDate] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [link, setLink] = useState("");
  const [milestoneName, setMilestoneName] = useState("");
  const rows = useMemo(
    () =>
      (objectives.data ?? [])
        .filter((o) => o.kind === kind)
        .sort(
          (a, b) =>
            (a.status === "archived" ? 1 : 0) -
              (b.status === "archived" ? 1 : 0) ||
            (a.target_date ?? "9999").localeCompare(b.target_date ?? "9999"),
        ),
    [objectives.data, kind],
  );
  const current = rows.find((o) => o.id === selected) ?? null;
  const objectiveProgress = (goal:Objective, rows:typeof contributions.data, txs:typeof transactions.data) => goalFunding(goal, rows??[], txs??[], transfers.data??[]);
  function begin(o?: Objective) {
    setEditing(o ?? null);
    setName(o?.name ?? "");
    setNotes(o?.notes ?? "");
    setCategory(o?.category ?? L("General"));
    setPriority(o?.priority ?? "normal");
    setTarget(o?.target_amount ?? "");
    setCurrency(o?.currency ?? useAppStore.getState().currency);
    setTargetDate(o?.target_date ?? "");
    setFormOpen(true);
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!positive(target, currency))
      return toast.error(L("Enter a positive target amount."));
    try {
      const values = {
        kind,
        name: name.trim(),
        notes,
        category: category.trim(),
        priority,
        target_amount: target,
        currency,
        target_date: targetDate || null,
        status: editing?.status ?? "active",
      } as const;
      if (editing)
        await objectiveMutations.update.mutateAsync({ id: editing.id, values });
      else await objectiveMutations.create.mutateAsync(values);
      setFormOpen(false);
      toast.success(
        `${kind === "goal" ? L("Goal") : L("Savings target")} saved`,
      );
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }
  async function contribute(event: FormEvent) {
    event.preventDefault();
    if (!current) return;
    if (!link && !positive(amount, current.currency))
      return toast.error(L("Enter a positive contribution."));
    try {
      const movement=(transfers.data??[]).find(t=>t.id===link);
      await goalActions.contribute.mutateAsync({
        id:requestIdentity.id,
        objective: current.id,
        currency: current.currency,
        amount: link
          ? ((transfers.data ?? []).find((t) => t.id === link)
              ?.destination_amount ?? amount)
          : amount,
        transfer: link || null,
        account: link ? movement?.destination_account_id??null : funding || null,
        note,
        at: requestIdentity.at,
      });
      setContributeOpen(false);
      setAmount("");
      setLink("");
      setNote("");
      toast.success(L("Progress updated"));
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }
  async function addMilestone(event: FormEvent) {
    event.preventDefault();
    if (!current || !positive(amount, current.currency))
      return toast.error(L("Enter a positive milestone amount."));
    try {
      await milestoneMutations.create.mutateAsync({
        objective_id: current.id,
        name: milestoneName.trim(),
        amount,
      });
      setMilestoneOpen(false);
      setAmount("");
      setMilestoneName("");
      toast.success(L("Milestone added"));
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }
  async function removeObjective() {
    if (!deleting) return;
    try {
      await objectiveMutations.remove.mutateAsync(deleting.id);
      if (selected === deleting.id) setSelected(null);
      setDeleting(null);
      toast.success(
        `${deleting.kind === "goal" ? L("Goal") : L("Savings target")} deleted`,
      );
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }
  const error =
    objectives.error ||
    transfers.error || accounts.error ||
    contributions.error ||
    milestones.error ||
    repayments.error ||
    transactions.error;
  if (error)
    return (
      <Failure
        error={error}
        retry={() =>
          void Promise.all([
            objectives.refetch(),
            transfers.refetch(), accounts.refetch(),
            contributions.refetch(),
            milestones.refetch(),
            repayments.refetch(),
            transactions.refetch(),
          ])
        }
      />
    );
  const busy =
    objectives.isPending ||
    transfers.isPending || accounts.isPending ||
    contributions.isPending ||
    milestones.isPending ||
    repayments.isPending ||
    transactions.isPending;
  const availableTx = (transfers.data ?? []).filter(
    (t) =>
      current &&
      t.destination_currency === current.currency &&
      !(contributions.data ?? []).some((c) => c.transfer_id === t.id),
  );
  return (
    <div className="space-y-5">
      <div className="feature-intro">
        <p className="text-sm text-subtle">
          {kind === "goal"
            ? L("Build toward meaningful financial objectives.")
            : L(
                "Set money aside for a named purpose; contributions are earmarks, not extra account cash.",
              )}
        </p>
        <Button onClick={() => begin()}>
          <Plus size={16} />
          {kind === "goal" ? L("New goal") : L("New savings target")}
        </Button>
      </div>
      <p className="text-xs text-subtle">{c('Progress may include overlapping notional earmarks. It is not additive funded cash across goals; linked transfers are counted once.', 'Kemajuan mungkin termasuk peruntukan andaian bertindih. Ia bukan tunai dibiayai yang boleh dijumlahkan antara matlamat; pindahan berpaut dikira sekali.')}</p>
      {busy ? (
        <p role="status">{L("Loading progress…")}</p>
      ) : !rows.length ? (
        <div className="card empty-state">
          <h2>
            {kind === "goal" ? L("No goals yet") : L("No savings targets yet")}
          </h2>
          <p>{L("Set a target amount and record progress as it happens.")}</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="space-y-3">
            {rows.map((o) => {
              const p = objectiveProgress(
                o,
                contributions.data ?? [],
                transactions.data ?? [],
              );
              return (
                <button
                  key={o.id}
                  aria-pressed={selected === o.id}
                  className={`card selection-card block w-full p-5 text-left hover:border-primary ${selected === o.id ? "border-primary" : ""}`}
                  onClick={() => setSelected(o.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="font-semibold">{o.name}</h2>
                      <p className="mt-1 text-xs text-subtle">
                        {o.category} ·{" "}
                        {o.status === "archived"
                          ? L("Archived")
                          : p.completed
                            ? L("Completed")
                            : o.status === "paused"
                              ? L("Paused")
                              : o.priority === "high"
                                ? L("High priority")
                                : L("Active")}
                      </p>
                    </div>
                    <strong>{p.percent.toFixed(0)}%</strong>
                  </div>
                  <div className="mt-4">
                    <ProgressBar value={p.percent} />
                  </div>
                  <p className="mt-3 text-sm">
                    {money(p.funded, o.currency)}{" "}
                    <span className="text-subtle">
                      {L("of")} {money(o.target_amount, o.currency)}
                    </span>
                  </p>
                  {o.target_date && (
                    <p className="mt-2 text-xs text-subtle">
                      {L("Target date")} {o.target_date}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
          {current ? (
            <section className="card p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="eyebrow">
                    {kind === "goal" ? L("GOAL DETAIL") : L("SAVINGS DETAIL")}
                  </p>
                  <h2 className="mt-1 text-xl font-semibold">{current.name}</h2>
                  <p className="mt-2 text-sm text-subtle">
                    {current.notes || L("No notes added.")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => begin(current)}>
                    {L("Edit")}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={L(`Delete ${current.name}`)}
                    onClick={() => setDeleting(current)}
                  >
                    <Trash2 size={16} className="text-red-600" />
                  </Button>
                </div>
              </div>
              {(() => {
                const p = objectiveProgress(
                  current,
                  contributions.data ?? [],
                  transactions.data ?? [],
                );
                return (
                  <>
                    <div className="mt-7 flex items-baseline justify-between">
                      <strong className="text-2xl">
                        {money(p.funded, current.currency)}
                      </strong>
                      <span className="text-sm text-subtle">
                        {p.percent.toFixed(1)}%
                      </span>
                    </div>
                    <div className="mt-3">
                      <ProgressBar value={p.percent} />
                    </div>
                    <p className="mt-2 text-xs text-subtle">
                      {p.completed
                        ? L("Target reached")
                        : L(
                            `${money(p.remaining, current.currency)} remaining`,
                          )}
                    </p>
                  </>
                );
              })()}
              <div className="mt-5 flex flex-wrap gap-2">
                <Button
                  disabled={current.status === "archived"}
                  onClick={() => {
                    setAmount("");
                    setLink("");
                    setFunding('');setNote('');
                    setRequestIdentity({id:crypto.randomUUID(),at:new Date().toISOString()});
                    setContributeOpen(true);
                  }}
                >
                  <Plus size={16} />
                  {L("Add contribution")}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setAmount("");
                    setMilestoneOpen(true);
                  }}
                >
                  {L("Add milestone")}
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    void objectiveMutations.update
                      .mutateAsync({
                        id: current.id,
                        values: {
                          status:
                            current.status === "active" ? "paused" : "active",
                        },
                      })
                      .catch((e) => toast.error(errorMessage(e)))
                  }
                >
                  {current.status === "paused" ? L("Resume") : L("Pause")}
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    void objectiveMutations.update
                      .mutateAsync({
                        id: current.id,
                        values: {
                          status:
                            current.status === "archived"
                              ? "active"
                              : "archived",
                        },
                      })
                      .catch((e) => toast.error(errorMessage(e)))
                  }
                >
                  {current.status === "archived" ? L("Restore") : L("Archive")}
                </Button>
              </div>
              {(()=>{const funding=goalFunding(current,contributions.data??[],transactions.data??[],transfers.data??[]);return <section className="mt-6 text-sm space-y-2" aria-label={c('Funding evidence','Bukti pembiayaan')}><p>{c('Linked transfers','Pindahan berpaut')}: {money(funding.transferred,current.currency)}</p><p>{c('Notional earmarks','Peruntukan andaian')}: {money(funding.earmarked,current.currency)}</p><p>{c('Legacy transaction links','Pautan transaksi lama')}: {money(funding.legacy,current.currency)}</p><GoalActionPlan key={current.id} goal={current} remaining={funding.remaining} accounts={accounts.data??[]}/></section>;})()}
              <div className="mt-8">
                <h3 className="font-semibold">{L("Milestones")}</h3>
                <ul className="mt-3 space-y-2">
                  {(milestones.data ?? [])
                    .filter((m) => m.objective_id === current.id)
                    .sort((a, b) =>
                      parseMoney(a.amount, current.currency) <
                      parseMoney(b.amount, current.currency)
                        ? -1
                        : parseMoney(a.amount, current.currency) >
                            parseMoney(b.amount, current.currency)
                          ? 1
                          : 0,
                    )
                    .map((m) => (
                      <li
                        key={m.id}
                        className="flex items-center justify-between rounded-lg bg-muted p-3 text-sm"
                      >
                        <span className="flex items-center gap-2">
                          {parseMoneyTotal(
                            objectiveProgress(
                              current,
                              contributions.data ?? [],
                              transactions.data ?? [],
                            ).funded,
                            current.currency,
                          ) >= parseMoney(m.amount, current.currency) ? (
                            <Check size={16} className="text-emerald-600" />
                          ) : (
                            <span className="h-4 w-4 rounded-full border border-border" />
                          )}
                          {m.name}
                        </span>
                        <span>{money(m.amount, current.currency)}</span>
                      </li>
                    ))}
                  {!(milestones.data ?? []).some(
                    (m) => m.objective_id === current.id,
                  ) && (
                    <li className="text-sm text-subtle">
                      {L("No milestones yet.")}
                    </li>
                  )}
                </ul>
              </div>
              <div className="mt-8">
                <h3 className="font-semibold">{L("Contribution history")}</h3>
                <ul className="mt-3 divide-y divide-border">
                  {(contributions.data ?? [])
                    .filter((c) => c.objective_id === current.id)
                    .sort((a, b) =>
                      b.contributed_at.localeCompare(a.contributed_at),
                    )
                    .map((c) => (
                      <li
                        key={c.id}
                        className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
                      >
                        <div>
                          <strong>
                            {money(
                              c.effective_amount ?? c.amount ?? "0",
                              current.currency,
                            )}
                          </strong>
                          <p className="text-xs text-subtle">
                            {financialDate(c.contributed_at, timezone)} ·{" "}
                            {c.transfer_id ? L('Linked transfer') : c.transaction_id
                              ? L("Linked transaction")
                              : L("Notional earmark")}
                            {c.note ? ` · ${c.note}` : ""}
                          </p>
                        </div>
                        <button
                          className="text-link"
                          onClick={() =>
                            void contributionMutations.remove
                              .mutateAsync(c.id)
                              .catch((e) => toast.error(errorMessage(e)))
                          }
                        >
                          {L("Remove")}
                        </button>
                      </li>
                    ))}
                  {!(contributions.data ?? []).some(
                    (c) => c.objective_id === current.id,
                  ) && (
                    <li className="py-3 text-sm text-subtle">
                      {L("Progress starts with a contribution.")}
                    </li>
                  )}
                </ul>
              </div>
            </section>
          ) : (
            <div className="card empty-state">
              <h2>{L("Select a target")}</h2>
              <p>{L("View milestones and contribution history.")}</p>
            </div>
          )}
        </div>
      )}
      <Modal
        open={formOpen}
        onOpenChange={setFormOpen}
        title={
          editing
            ? L("Edit target")
            : kind === "goal"
              ? L("New goal")
              : L("New savings target")
        }
      >
        <form className="space-y-4" onSubmit={(event) => void save(event)}>
          <label className="form-field">
            {L("Name")}
            <input
              className="input"
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="form-field">
              {L("Target amount")}
              <input
                className="input"
                required
                inputMode="decimal"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              />
            </label>
            <label className="form-field">
              {L("Currency")}
              <select
                className="input"
                disabled={!!editing}
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
              >
                {currencies.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="form-field">
            {L("Target date (optional)")}
            <input
              className="input"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="form-field">
              {L("Category")}
              <input
                className="input"
                required
                maxLength={60}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </label>
            <label className="form-field">
              {L("Priority")}
              <select
                className="input"
                value={priority}
                onChange={(e) =>
                  setPriority(e.target.value as Objective["priority"])
                }
              >
                <option value="normal">{L("Normal")}</option>
                <option value="high">{L("High")}</option>
                <option value="low">{L("Low")}</option>
              </select>
            </label>
          </div>
          <label className="form-field">
            {L("Notes")}
            <textarea
              className="input"
              maxLength={2000}
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          <div className="modal-actions">
            <Button
              variant="outline"
              type="button"
              onClick={() => setFormOpen(false)}
            >
              {L("Cancel")}
            </Button>
            <Button
              disabled={
                !name.trim() ||
                !positive(target, currency) ||
                objectiveMutations.create.isPending ||
                objectiveMutations.update.isPending
              }
            >
              {L("Save target")}
            </Button>
          </div>
        </form>
      </Modal>
      <Modal
        open={contributeOpen}
        onOpenChange={setContributeOpen}
        title={L(`Contribute to ${current?.name ?? ""}`)}
      >
        <form
          className="space-y-4"
          onSubmit={(event) => void contribute(event)}
        >
          <label className="form-field">
            {L("Earmark account (optional)")}
            <select
              className="input"
              value={funding}
              onChange={(e) => setFunding(e.target.value)}
            >
              <option value="">{L("Unassigned allocation")}</option>
              {accounts.data
                ?.filter((a) => current && a.currency === current.currency)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
            </select>
          </label>
          <p className="text-xs text-subtle">
            {L(
              "An allocation reserves money already in your accounts; it does not reduce cash or increase expenses.",
            )}
          </p>
          <label className="form-field">
            {L("Link a transfer (optional)")}
            <select
              className="input"
              value={link}
              onChange={(e) => setLink(e.target.value)}
            >
              <option value="">{L("Savings allocation")}</option>
              {availableTx.map((t) => (
                <option key={t.id} value={t.id}>
                  {financialDate(t.occurred_at, timezone)} ·{" "}
                  {t.note || L("Transfer")} ·{" "}
                  {money(t.destination_amount, t.destination_currency)}
                </option>
              ))}
            </select>
          </label>
          {link ? (
            <p className="text-xs text-subtle">
              {L(
                "The allocation uses the exact transfer destination amount. Unlink the contribution before correcting or removing the transfer; posted journal corrections preserve history.",
              )}
            </p>
          ) : (
            <label className="form-field">
              {L("Amount (")}
              {current?.currency})
              <input
                className="input"
                required
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </label>
          )}
          <label className="form-field">
            {L("Note (optional)")}
            <input
              className="input"
              maxLength={500}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <div className="modal-actions">
            <Button
              variant="outline"
              type="button"
              onClick={() => setContributeOpen(false)}
            >
              {L("Cancel")}
            </Button>
            <Button
              disabled={
                goalActions.contribute.isPending ||
                (!link && (!current || !positive(amount, current.currency)))
              }
            >
              {L("Record contribution")}
            </Button>
          </div>
        </form>
      </Modal>
      <Modal
        open={milestoneOpen}
        onOpenChange={setMilestoneOpen}
        title={L("New milestone")}
      >
        <form
          className="space-y-4"
          onSubmit={(event) => void addMilestone(event)}
        >
          <label className="form-field">
            {L("Milestone name")}
            <input
              className="input"
              required
              maxLength={100}
              value={milestoneName}
              onChange={(e) => setMilestoneName(e.target.value)}
            />
          </label>
          <label className="form-field">
            {L("Amount reached (")}
            {current?.currency})
            <input
              className="input"
              required
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
          <div className="modal-actions">
            <Button
              variant="outline"
              type="button"
              onClick={() => setMilestoneOpen(false)}
            >
              {L("Cancel")}
            </Button>
            <Button disabled={milestoneMutations.create.isPending}>
              {L("Save milestone")}
            </Button>
          </div>
        </form>
      </Modal>
      <Modal
        open={!!deleting}
        onOpenChange={(value) => {
          if (!value && !objectiveMutations.remove.isPending) setDeleting(null);
        }}
        title={L(`Delete ${kind === "goal" ? "goal" : "savings target"}`)}
        description={L(
          "This permanently removes this target and its progress history.",
        )}
      >
        {deleting && (
          <>
            <p>
              {L("Delete")} <strong>{deleting.name}</strong>?
            </p>
            <p className="mt-3 text-sm text-subtle">
              {L(
                "Its contributions and milestones will be removed. Any linked transactions remain in your transaction history.",
              )}
            </p>
            <div className="modal-actions mt-6">
              <Button
                variant="outline"
                disabled={objectiveMutations.remove.isPending}
                onClick={() => setDeleting(null)}
              >
                {L("Cancel")}
              </Button>
              <Button
                variant="destructive"
                disabled={objectiveMutations.remove.isPending}
                onClick={() => void removeObjective()}
              >
                {objectiveMutations.remove.isPending
                  ? L("Deleting…")
                  : L("Delete permanently")}
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
