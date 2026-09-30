import { browserTimezone } from '@/domain/dates';
import type { Currency,ExchangeRates,Locale,Tab,Theme } from '@/types';
import { create } from 'zustand';
import { createJSONStorage,persist } from 'zustand/middleware';

export interface AppStore {
  theme: Theme;
  locale: Locale;
  currency: Currency;
  exchangeRates: ExchangeRates | null;
  activeTab: Tab;
  financialTimezone: string;
  setFinancialTimezone: (financialTimezone: string) => void;
  setTheme: (theme: Theme) => void;
  setLocale: (locale: Locale) => void;
  setCurrency: (currency: Currency) => void;
  setExchangeRates: (exchangeRates: ExchangeRates | null) => void;
  setActiveTab: (activeTab: Tab) => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      theme: 'system',
      locale: 'en',
      currency: 'USD',
      exchangeRates: null,
      activeTab: 'dashboard',
      financialTimezone: browserTimezone(),
      setFinancialTimezone: (financialTimezone) => set({ financialTimezone }),
      setTheme: (theme) => set({ theme }),
      setLocale: (locale) => set({ locale }),
      setCurrency: (currency) => set({ currency }),
      setExchangeRates: (exchangeRates) => set({ exchangeRates }),
      setActiveTab: (activeTab) => set({ activeTab }),
    }),
    {
      name: 'prism-preferences',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ theme, locale, currency, exchangeRates }) => ({ theme, locale, currency, exchangeRates }),
      merge: (persisted, current) => {
        if (!persisted || typeof persisted !== 'object') return current;
        const saved = persisted as Record<string, unknown>;
        return {
          ...current,
          theme: saved.theme === 'light' || saved.theme === 'dark' || saved.theme === 'system' ? saved.theme : current.theme,
          locale: saved.locale === 'en' || saved.locale === 'ms' ? saved.locale : current.locale,
          currency: saved.currency === 'USD' || saved.currency === 'EUR' || saved.currency === 'JPY' || saved.currency === 'MYR' ? saved.currency : current.currency,
          exchangeRates: isStoredExchangeRates(saved.exchangeRates) ? saved.exchangeRates : null,
        };
      },
    },
  ),
);

function isStoredExchangeRates(value: unknown): value is ExchangeRates {
  if (!value || typeof value !== 'object') return false;
  const rates = value as Record<string, unknown>;
  if (!['USD', 'EUR', 'JPY', 'MYR'].includes(String(rates.base)) || typeof rates.updatedAt !== 'number' || !Number.isFinite(rates.updatedAt) || typeof rates.source !== 'string') return false;
  if (!rates.rates || typeof rates.rates !== 'object') return false;
  const amounts = rates.rates as Record<string, unknown>;
  return ['USD', 'EUR', 'JPY', 'MYR'].every((currency) => typeof amounts[currency] === 'number' && Number.isFinite(amounts[currency]) && Number(amounts[currency]) > 0);
}
