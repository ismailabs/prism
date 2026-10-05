import { useAppStore } from "@/store/useAppStore";
import type { Personalization } from "@/store/personalization";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { useProfile, useUpdateProfile } from '@/hooks/useFinanceData';
import { defaultPeriodTypes, isDefaultPeriod } from '@/domain/periods';
import { errorMessage } from '@/lib/utils';
import { useState } from 'react';
export function PersonalizationSettings() {
  const { t } = useTranslation();
  const profile = useProfile();
  const update = useUpdateProfile();
  const [periodError, setPeriodError] = useState('');
  const savePeriod = async (value: unknown) => {
    if (!isDefaultPeriod(value)) return;
    setPeriodError('');
    try { await update.mutateAsync({ default_analysis_period: value }); toast.success(t('saved')); }
    catch (cause) { setPeriodError(errorMessage(cause)); }
  };
  const {
    personalization: p,
    setPersonalization: set,
    resetPersonalization: reset,
  } = useAppStore();
  const toggle = (key: keyof Personalization, label: string) => (
    <label className="preference-toggle" key={key}>
      <span>{t(label)}</span>
      <input
        type="checkbox"
        checked={Boolean(p[key])}
        onChange={(e) => set({ [key]: e.target.checked })}
      />
    </label>
  );
  const select = (
    key: "accent" | "density" | "motion" | "landingPage" | "dateFormat",
    label: string,
    choices: string[],
  ) => (
    <label className="form-field" key={key}>
      {t(label)}
      <select
        className="input"
        aria-label={t(label)}
        value={p[key]}
        onChange={(e) =>
          set({ [key]: e.target.value } as Partial<Personalization>)
        }
      >
        {choices.map((value) => (
          <option key={value} value={value}>
            {t(
              value === "locale"
                ? "localeDate"
                : value === "iso"
                  ? "isoDate"
                  : value,
            )}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <section className="card personalization-settings p-6 space-y-5">
      <div>
        <h2 className="text-lg font-semibold">{t("personalize")}</h2>
        <p className="text-xs text-subtle mt-2">{t("devicePreferences")}</p>
      </div>
      <fieldset className="preference-group">
        <legend>{t("theme")}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          {select("accent", "accent", ["prism", "slate", "olive"])}
          {select("density", "density", ["comfortable", "compact"])}
          {select("motion", "motion", ["system", "full", "reduced"])}
          {select("landingPage", "landingPage", [
            "dashboard",
            "transactions",
            "analytics",
            "accounts",
          ])}
        </div>
        <p className="text-xs text-subtle mt-3">{t("motionHint")}</p>
        {toggle("sidebarCompact", "sidebarCompact")}
      </fieldset>
      <fieldset className="preference-group">
        <legend>{t("dashboardSections")}</legend>
        <ol className="dashboard-preferences">
          {p.dashboardOrder.map((module, index) => (
            <li key={module}>
              <label>
                <input
                  type="checkbox"
                  aria-label={t("showSection", { section: t(module) })}
                  checked={!p.hiddenModules.includes(module)}
                  onChange={(e) =>
                    set({
                      hiddenModules: e.target.checked
                        ? p.hiddenModules.filter((m) => m !== module)
                        : [...p.hiddenModules, module],
                    })
                  }
                />
                <span>{t(module)}</span>
              </label>
              <div className="flex gap-1">
                {([-1, 1] as const).map((direction) => (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    key={direction}
                    aria-label={t(direction === -1 ? "moveUp" : "moveDown", {
                      section: t(module),
                    })}
                    disabled={
                      direction === -1
                        ? index === 0
                        : index === p.dashboardOrder.length - 1
                    }
                    onClick={() => {
                      const order = [...p.dashboardOrder];
                      [order[index], order[index + direction]] = [
                        order[index + direction],
                        order[index],
                      ];
                      set({ dashboardOrder: order });
                    }}
                  >
                    {direction === -1 ? (
                      <ArrowUp size={15} />
                    ) : (
                      <ArrowDown size={15} />
                    )}
                  </Button>
                ))}
              </div>
            </li>
          ))}
        </ol>
        {toggle("showAccounts", "showAccounts")}
        {toggle("showGoals", "showGoals")}
        {toggle("showDebts", "showDebts")}
      </fieldset>
      <fieldset className="preference-group">
        <legend>{t("analyticsBar")}</legend>
        {toggle("analyticsBar", "showAnalyticsBar")}
      </fieldset>
      <fieldset className="preference-group">
        <legend>{t("chartPreferences")}</legend>
        <label className="form-field">{t('defaultAnalysisPeriod')}
          <select className="input" aria-label={t('defaultAnalysisPeriod')} value={profile.data?.default_analysis_period ?? 'month'} disabled={update.isPending || !profile.data} onChange={event => void savePeriod(event.target.value)}>
            {defaultPeriodTypes.map(type => <option key={type} value={type}>{t('period_' + type)}</option>)}
          </select>
        </label>
        <p className="text-xs text-subtle">{t('defaultAnalysisPeriodHint')}</p>
        {periodError && <p className="error-message" role="alert">{periodError}</p>}
        <Button type="button" variant="outline" disabled={update.isPending} onClick={() => void savePeriod('month')}>{t('resetAnalysisPeriod')}</Button>
        {toggle("chartAnimation", "chartAnimation")}
        {toggle("compactLegend", "compactLegend")}
        {select("dateFormat", "dateFormat", ["locale", "iso"])}
      </fieldset>
      <fieldset className="preference-group">
        <legend>{t("privacyMode")}</legend>
        {toggle("privacyMode", "privacyMode")}
        <p className="text-xs text-subtle">{t("privacyHint")}</p>
      </fieldset>
      <p className="text-xs text-subtle">{t("keyboardHint")}</p>
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          reset();
          toast.success(t("restored"));
        }}
      >
        {t("restoreDefaults")}
      </Button>
    </section>
  );
}
