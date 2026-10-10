import { MfaSetup } from "../auth/MfaSetup";
import { Button } from "../ui/button";
import { Modal } from "../ui/dialog";
import { browserTimezone, validTimezone } from "@/domain/dates";
import { useAuth } from "@/hooks/useAuth";
import { useUpdateProfile } from "@/hooks/useFinanceData";
import { clearPrivateQueries } from "@/lib/privateCache";
import { supabase } from "@/lib/supabase";
import { errorMessage } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import type { Currency, Locale, Profile, Theme } from "@/types";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useFinancialCopy } from "./shared";
import { PersonalizationSettings } from '../PersonalizationSettings';
import { PwaStatus } from '../PwaStatus';
export function SettingsView({ profile }: { profile: Profile }) {
  const c = useFinancialCopy();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { user } = useAuth();
  const update = useUpdateProfile();
  const [username, setUsername] = useState(profile.username);
  const [currency, setCurrency] = useState<Currency>(profile.currency);
  const [language, setLanguage] = useState<Locale>(profile.language);
  const [timezone, setTimezone] = useState(
    profile.financial_timezone ?? browserTimezone(),
  );
  const [theme, setTheme] = useState<Theme>(profile.theme);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const requiredConfirmation = `DELETE ${user?.email ?? ""}`;
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      if (!validTimezone(timezone)) throw new Error(t("invalidTimezone"));
      await update.mutateAsync({
        username: username.trim(),
        currency,
        language,
        theme,
        financial_timezone: timezone,
      });
      toast.success(t("saved"));
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }
  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await supabase.auth.updateUser({ password });
      if (result.error) throw result.error;
      setPassword("");
      toast.success(t("passwordUpdated"));
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  async function deletePrismAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDeleteError("");
    if (deleteConfirmation !== requiredConfirmation) {
      setDeleteError(
        c(
          `Type ${requiredConfirmation} exactly.`,
          `Taip ${requiredConfirmation} dengan tepat.`,
        ),
      );
      return;
    }
    setDeletingAccount(true);
    try {
      const { error: rpcError } = await supabase.rpc("delete_own_account", {
        confirmation: "DELETE",
      });
      if (rpcError) throw rpcError;
      await clearPrivateQueries(queryClient);
      await supabase.auth.signOut({ scope: "local" });
      window.location.replace("/");
    } catch (cause) {
      setDeleteError(errorMessage(cause));
      setDeletingAccount(false);
    }
  }
  return (
    <div className="settings-layout">
      <form
        className="card settings-form space-y-5 p-6"
        onSubmit={(event) => void save(event)}
      >
        <h2 className="text-lg font-semibold">{t("profile")}</h2>
        <label className="form-field">
          {t("email")}
          <input
            className="input"
            type="email"
            value={user?.email ?? ""}
            readOnly
          />
        </label>
        <label className="form-field">
          {t("financialTimezone")}
          <input
            className="input"
            required
            list="financial-timezones"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
          />
          <datalist id="financial-timezones">
            {Intl.supportedValuesOf("timeZone").map((zone) => (
              <option key={zone} value={zone} />
            ))}
          </datalist>
        </label>
        <label className="form-field">
          {t("username")}
          <input
            className="input"
            required
            maxLength={60}
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
        </label>
        <h3 className="font-semibold">{t("preferences")}</h3>
        <label className="form-field">
          {t("currency")}
          <select
            className="input"
            value={currency}
            onChange={(event) => setCurrency(event.target.value as Currency)}
          >
            {["USD", "EUR", "JPY", "MYR"].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label className="form-field">
          {t("language")}
          <select
            className="input"
            value={language}
            onChange={(event) => setLanguage(event.target.value as Locale)}
          >
            <option value="en">English</option>
            <option value="ms">Bahasa Melayu</option>
          </select>
        </label>
        <div className="space-y-2">
          <h3 className="font-semibold">{t("theme")}</h3>
          <div className="appearance-selector">
            <span className="text-sm font-medium">{t("mode")}</span>
            <div
              className="appearance-options"
              role="group"
              aria-label={t("theme")}
            >
              {(["system", "light", "dark"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  className={
                    "appearance-option " + (theme === value ? "selected" : "")
                  }
                  aria-label={t(value)}
                  title={t(value)}
                  aria-pressed={theme === value}
                  onClick={() => setTheme(value)}
                >
                  <span
                    className={"appearance-preview " + value}
                    aria-hidden="true"
                  >
                    <i />
                    <i />
                    <i />
                  </span>
                  <span>{t(value)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <Button disabled={update.isPending || !username.trim()}>
          {update.isPending ? t("saving") : t("save")}
        </Button>
      </form>
      <div className="space-y-6">
        <PersonalizationSettings />
        <section className="card p-6 space-y-3">
          <h2 className="text-lg font-semibold">{c("Organize your activity", "Susun aktiviti anda")}</h2><p className="text-sm text-subtle">{c("Keep categories and payment methods easy to recognize.", "Pastikan kategori dan kaedah pembayaran mudah dikenal pasti.")}</p>
          <Button
            variant="outline"
            onClick={() => useAppStore.getState().setActiveTab("categories")}
          >
            {t("categories")}
          </Button>
          <Button
            variant="outline"
            onClick={() => useAppStore.getState().setActiveTab("payments")}
          >
            {t("payments")}
          </Button>
        </section>
        <PwaStatus settings />
        <section className="card space-y-6 p-6">
          <h2 className="text-lg font-semibold">{t("security")}</h2>
          <p className="text-sm text-subtle">{t("securityDescription")}</p>
          <MfaSetup />
          <p className="text-sm text-subtle">{t("mfaRecoveryHint")}</p>
          <form
            className="space-y-4 border-t border-border pt-6"
            onSubmit={(event) => void changePassword(event)}
          >
            <label className="form-field">
              {t("newPassword")}
              <input
                className="input"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <Button disabled={busy}>{t("updatePassword")}</Button>
          </form>
          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}
        </section>
        <section className="card border-red-500/40 p-6">
          <p className="eyebrow text-red-600 dark:text-red-300">
            {c("Account & data", "Akaun dan data")}
          </p>
          <h2 className="mt-2 text-lg font-semibold">
            {c("Danger zone", "Zon bahaya")}
          </h2>
          <p className="mt-3 text-sm text-subtle">
            {c(
              "Permanently delete your Prism account, authentication identity, and all owned financial data. This cannot be undone.",
              "Padam akaun Prism, identiti log masuk dan semua data kewangan anda secara kekal. Tindakan ini tidak boleh dibatalkan.",
            )}
          </p>
          <Button
            className="mt-5"
            variant="destructive"
            onClick={() => {
              setDeleteConfirmation("");
              setDeleteError("");
              setDeleteOpen(true);
            }}
          >
            {c("Delete Prism account", "Padam akaun Prism")}
          </Button>
        </section>
        <section className="card p-6">
          <h2 className="text-lg font-semibold">{t("credits")}</h2>
          <img
            src="/built-by-ismail.png"
            alt="Built by Ismail"
            className="mx-auto mt-4 block h-auto w-full max-w-xs object-contain"
          />
        </section>
      </div>
      <Modal
        open={deleteOpen}
        onOpenChange={(value) => {
          if (!deletingAccount) setDeleteOpen(value);
        }}
        title={c(
          "Permanently delete your Prism account",
          "Padam akaun Prism secara kekal",
        )}
        description={c(
          "This deletes your sign-in and every financial record owned by your account.",
          "Identiti log masuk dan setiap rekod kewangan anda akan dipadam.",
        )}
      >
        <form
          className="space-y-5"
          onSubmit={(event) => void deletePrismAccount(event)}
        >
          <div className="error-message">
            <strong>
              {c("This action is permanent.", "Tindakan ini kekal.")}
            </strong>
            <p className="mt-1">
              {c(
                "Accounts, transactions, goals, savings targets, debts, categories, payment methods, transfers, budgets, recurring rules, and progress history will be deleted.",
                "Akaun, transaksi, matlamat, sasaran simpanan, hutang, kategori, kaedah pembayaran, pindahan, bajet, peraturan berulang dan sejarah kemajuan akan dipadam.",
              )}
            </p>
          </div>
          <label className="form-field">
            {c("Type", "Taip")}{" "}
            <span className="font-mono">{requiredConfirmation}</span>{" "}
            {c("to confirm", "untuk mengesahkan")}
            <input
              className="input"
              autoComplete="off"
              value={deleteConfirmation}
              onChange={(event) => setDeleteConfirmation(event.target.value)}
            />
          </label>
          {deleteError && (
            <p className="error-message" role="alert">
              {deleteError}
            </p>
          )}
          <div className="modal-actions">
            <Button
              type="button"
              variant="outline"
              disabled={deletingAccount}
              onClick={() => setDeleteOpen(false)}
            >
              {t("cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={
                deletingAccount || deleteConfirmation !== requiredConfirmation
              }
            >
              {deletingAccount
                ? c("Deleting account…", "Memadam akaun…")
                : c("Delete forever", "Padam selama-lamanya")}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
